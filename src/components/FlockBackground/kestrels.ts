import type {FlyingPredators, FlockSimulation} from './simulation';

export const KESTREL_COUNT = 3; // 自主红隼数量；不占用普通鸟的数量上限。
const CRUISE_SPEED = 0.5; // 追逐时的目标速度（模拟单位/模拟秒），高于普通鸟的巡航速度。
const MIN_SPEED = 0.43; // 最低速度；靠近目标后仍会掠过，不悬停在鸟群中心。
const MAX_SPEED = 0.58; // 最高速度；同样受页面的 SIMULATION_SPEED 时间倍率影响。
const TURN_RESPONSE = 1.2; // 朝目标方向调整速度的力度；越小追逐越柔和。
const MAX_ACCELERATION = 0.55; // 转向加速度上限，避免瞬间折返。
const TARGET_INTERVAL = 0.8; // 每隔多少模拟秒重新选择附近目标，避免逐帧换目标。
const GROUP_RADIUS = 0.38; // 目标鸟周围的小群半径，用小群平均位置/速度引导追逐。
const GROUP_SAMPLES = 96; // 每次最多抽样多少只鸟来估计小群，限制每步开销。
const TARGET_LEAD = 0.35; // 提前多少模拟秒预判小群位置，减少追着旧位置转圈。
const TARGET_SPREAD = 0.65; // 不同红隼的目标间隔倾向，减少三只同时追同一处。
const SEPARATION_RADIUS = 0.55; // 红隼彼此避碰的距离。
const SEPARATION_FORCE = 0.5; // 红隼彼此分开的转向力度。
const WANDER = 0.04; // 弱游走，让追逐保留自然的方向变化。
const BOUNDARY_LOOKAHEAD = 0.75; // 提前预判边界的模拟秒数。
const BOUNDARY_START = 0.6; // 椭球归一化半径平方，超过后开始转回场内。
const BOUNDARY_FORCE = 1.2; // 边界转向力度，适应红隼更快的速度。

const FLEE_RADIUS = 0.26; // 鸟群避让红隼的三维半径，通常小于鼠标视线的避让范围。
const FLEE_FORCE = 0.8; // 鸟群避让红隼的力度，低于鼠标的 1.8。
const FLEE_SPEED_BOOST = 0.1; // 避让时额外允许的速度，低于鼠标的 0.24。

/** 三只红隼独立飞行；追逐局部小群，不参加普通鸟的对齐/凝聚。 */
export class KestrelSimulation implements FlyingPredators {
  readonly count = KESTREL_COUNT;
  readonly positions = new Float32Array(KESTREL_COUNT * 3);
  velocities = new Float32Array(KESTREL_COUNT * 3);
  private nextVelocities = new Float32Array(KESTREL_COUNT * 3);
  readonly radius = FLEE_RADIUS;
  readonly force = FLEE_FORCE;
  readonly speedBoost = FLEE_SPEED_BOOST;
  private readonly targets = new Int32Array(KESTREL_COUNT).fill(-1);
  private readonly retargetIn = new Float32Array(KESTREL_COUNT);
  private halfWidth = 1.6;
  private time = 0;
  private tick = 0;

  constructor() {
    for (let i = 0; i < this.count; i++) {
      const o = i * 3, angle = i * Math.PI * 2 / this.count;
      this.positions[o] = this.halfWidth * Math.cos(angle) * 0.58;
      this.positions[o + 1] = 1.05 * Math.sin(angle) * 0.58;
      this.positions[o + 2] = Math.cos(angle + 0.7) * 0.28;
      this.velocities[o] = -Math.sin(angle) * CRUISE_SPEED;
      this.velocities[o + 1] = Math.cos(angle) * CRUISE_SPEED;
    }
  }

  resize(halfWidth: number) {
    const ratio = halfWidth / this.halfWidth;
    for (let i = 0; i < this.count; i++) {
      const o = i * 3;
      this.positions[o] *= ratio;
      this.velocities[o] *= ratio;
      const scale = CRUISE_SPEED / Math.hypot(this.velocities[o], this.velocities[o + 1], this.velocities[o + 2]);
      this.velocities[o] *= scale;
      this.velocities[o + 1] *= scale;
      this.velocities[o + 2] *= scale;
    }
    this.halfWidth = halfWidth;
  }

  private selectTarget(i: number, flock: FlockSimulation) {
    const o = i * 3, p = flock.positions;
    const x = this.positions[o] + this.velocities[o] * TARGET_LEAD;
    const y = this.positions[o + 1] + this.velocities[o + 1] * TARGET_LEAD;
    const z = this.positions[o + 2] + this.velocities[o + 2] * TARGET_LEAD;
    let target = -1, best = Infinity;
    // 低频扫描全部活跃鸟，保证不会漏掉附近的小群；只有三只红隼。
    for (let j = 0; j < flock.count; j++) {
      const jo = j * 3;
      const dx = p[jo] - x, dy = p[jo + 1] - y, dz = p[jo + 2] - z;
      let score = dx * dx + dy * dy + dz * dz;
      for (let k = 0; k < this.count; k++) {
        const other = this.targets[k];
        if (k === i || other < 0 || other >= flock.count) continue;
        const ko = other * 3;
        const ox = p[jo] - p[ko], oy = p[jo + 1] - p[ko + 1], oz = p[jo + 2] - p[ko + 2];
        score += Math.max(0, TARGET_SPREAD ** 2 - ox * ox - oy * oy - oz * oz) * 2;
      }
      if (score < best) { best = score; target = j; }
    }
    this.targets[i] = target;
    this.retargetIn[i] = TARGET_INTERVAL * (this.tick === 1 ? (i + 1) / this.count : 1);
  }

  step(dt: number, flock: FlockSimulation) {
    this.time += dt;
    this.tick++;
    const p = this.positions, v = this.velocities, next = this.nextVelocities;
    const fp = flock.positions, fv = flock.velocities, b = flock.bounds;
    for (let i = 0; i < this.count; i++) {
      const o = i * 3, x = p[o], y = p[o + 1], z = p[o + 2];
      const vx = v[o], vy = v[o + 1], vz = v[o + 2];
      this.retargetIn[i] -= dt;
      if (this.retargetIn[i] <= 0 || this.targets[i] < 0 || this.targets[i] >= flock.count) {
        this.selectTarget(i, flock);
      }
      let ax = 0, ay = 0, az = 0;
      const target = this.targets[i];
      if (target >= 0) {
        const to = target * 3;
        let tx = fp[to], ty = fp[to + 1], tz = fp[to + 2];
        let tvx = fv[to], tvy = fv[to + 1], tvz = fv[to + 2], weight = 1;
        const samples = Math.min(flock.count, GROUP_SAMPLES);
        const shift = (this.tick * 17 + i * 31) % Math.max(1, flock.count);
        for (let sample = 0; sample < samples; sample++) {
          const j = (Math.floor(sample * flock.count / samples) + shift) % flock.count;
          if (j === target) continue;
          const jo = j * 3;
          const dx = fp[jo] - fp[to], dy = fp[jo + 1] - fp[to + 1], dz = fp[jo + 2] - fp[to + 2];
          const w = Math.max(0, 1 - (dx * dx + dy * dy + dz * dz) / (GROUP_RADIUS * GROUP_RADIUS));
          tx += fp[jo] * w; ty += fp[jo + 1] * w; tz += fp[jo + 2] * w;
          tvx += fv[jo] * w; tvy += fv[jo + 1] * w; tvz += fv[jo + 2] * w;
          weight += w;
        }
        const dx = (tx + tvx * TARGET_LEAD) / weight - x;
        const dy = (ty + tvy * TARGET_LEAD) / weight - y;
        const dz = (tz + tvz * TARGET_LEAD) / weight - z;
        const distance = Math.hypot(dx, dy, dz);
        if (distance > 0.0001) {
          const speed = CRUISE_SPEED / distance;
          ax = (dx * speed - vx) * TURN_RESPONSE;
          ay = (dy * speed - vy) * TURN_RESPONSE;
          az = (dz * speed - vz) * TURN_RESPONSE;
        }
      }
      for (let j = 0; j < this.count; j++) {
        if (i === j) continue;
        const jo = j * 3;
        const dx = x - p[jo], dy = y - p[jo + 1], dz = z - p[jo + 2];
        const distance = Math.hypot(dx, dy, dz);
        if (distance > 0.0001 && distance < SEPARATION_RADIUS) {
          const force = (1 - distance / SEPARATION_RADIUS) ** 2 * SEPARATION_FORCE / distance;
          ax += dx * force; ay += dy * force; az += dz * force;
        }
      }
      const phase = i * 2.399963;
      ax += Math.sin(this.time * 0.71 + phase) * WANDER;
      ay += Math.cos(this.time * 0.53 + phase) * WANDER;
      az += Math.sin(this.time * 0.61 + phase) * WANDER;
      const ex = (x + vx * BOUNDARY_LOOKAHEAD) / b.x;
      const ey = (y + vy * BOUNDARY_LOOKAHEAD) / b.y;
      const ez = (z + vz * BOUNDARY_LOOKAHEAD) / b.z;
      const edge = ex * ex + ey * ey + ez * ez;
      if (edge > BOUNDARY_START) {
        const turn = (edge - BOUNDARY_START) * BOUNDARY_FORCE;
        ax -= ex / b.x * turn; ay -= ey / b.y * turn; az -= ez / b.z * turn;
      }
      const acceleration = Math.hypot(ax, ay, az);
      const limit = acceleration > MAX_ACCELERATION ? MAX_ACCELERATION / acceleration : 1;
      let nx = vx + ax * limit * dt, ny = vy + ay * limit * dt, nz = vz + az * limit * dt;
      const speed = Math.hypot(nx, ny, nz);
      if (speed < 0.000001) {
        nx = Math.cos(phase) * MIN_SPEED; ny = Math.sin(phase) * MIN_SPEED; nz = 0;
      } else {
        const scale = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed)) / speed;
        nx *= scale; ny *= scale; nz *= scale;
      }
      next[o] = nx; next[o + 1] = ny; next[o + 2] = nz;
    }
    this.velocities = next;
    this.nextVelocities = v;
    for (let i = 0; i < this.count; i++) {
      for (let axis = 0; axis < 3; axis++) {
        const o = i * 3 + axis, bound = axis === 0 ? b.x : axis === 1 ? b.y : b.z;
        const coordinate = p[o] + next[o] * dt;
        p[o] = Math.max(-bound, Math.min(bound, coordinate));
        if (Math.abs(coordinate) > bound) next[o] = -Math.sign(coordinate) * Math.abs(next[o]);
      }
    }
  }
}
