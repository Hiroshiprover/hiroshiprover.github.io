/**
 * 三维局部鸟群模拟，与渲染分离。参考算法：
 * https://github.com/mrdoob/three.js/blob/dev/examples/webgl_gpgpu_birds.html
 * https://github.com/ssickels/boids-playgrounds/blob/master/murmuration.js
 * 数组预分配并复用；每一步全部鸟读取同一份位置/速度快照。
 */
export const CAMERA_DISTANCE = 3.2; // 相机到场景中心的距离；越大透视纵深越弱。
const PERCEPTION = 0.3; // 感知半径/网格边长（模拟单位），增大可看到更远的邻居。
const SEPARATION = 0.085; // 近距离避碰半径；增大后鸟之间的间隔更大。
const NEIGHBORS = 7; // 从候选中选取最多几个最近邻来对齐、凝聚。
const CELL_SAMPLES = 12; // 每格最多检查几只鸟；限制拥挤时的计算量。
const MIN_SPEED = 0.22; // 最低飞行速度（模拟单位/模拟秒），避免停在原地。
const CRUISE_SPEED = 0.34; // 初始化的巡航速度；页面还有独立的模拟时间倍率。
const MAX_SPEED = 0.4; // 没有掠食者干扰时的最高速度。
const PANIC_SPEED_BOOST = 0.24; // 受到鼠标追逐时额外允许的最高速度。
const ALIGNMENT = 1.8; // 跟随最近邻的速度/方向，越大越容易形成共同流动。
const COHESION = 0.9; // 向最近邻靠拢，越大越容易聚团。
const SEPARATION_FORCE = 0.85; // 避碰转向力度。
const WANDER = 0.018; // 每只鸟独立的小幅转向，避免长时间锁定相同方向。
const BOUNDARY_LOOKAHEAD = 0.7; // 提前多少模拟秒预判边界，增大后转弯更早。
const BOUNDARY_START = 0.65; // 椭球归一化半径的平方，超过后逐渐转回场内。
const BOUNDARY_FORCE = 0.65; // 边界转向力度，过大会压缩鸟群的活动范围。
const PREDATOR_FORCE = 1.8; // 鼠标相机视线的避让力度。
const MAX_ACCELERATION = 1.8; // 加速度上限，限制突然转向/追逐的冲击。

// 密度反馈按整个三维场景的平均密度定标，不按某个团体的固定鸟数触发。
const DENSITY_TARGET_RATIO = 2.7; // 局部超过平均密度的多少倍才开始疏散；越小越均匀。
const DENSITY_PRESSURE = 0.22; // 朝密度下降方向转向的力度；过大可能冲散小群。
const DENSITY_COHESION_REDUCTION = 0.6; // 最拥挤时削弱凝聚的比例，0保留原凝聚，1完全取消。
const DENSITY_SEPARATION_BOOST = 1.2; // 拥挤时额外增强避碰的比例，保留最低间隔。

export type Predator = {
  active: boolean;
  // 屏幕偏移/焦距，定义从相机穿过鼠标的射线；radius 是角半径。
  x: number;
  y: number;
  radius: number;
};

export type FlyingPredators = {
  readonly count: number;
  readonly positions: Float32Array;
  readonly radius: number;
  readonly force: number;
  readonly speedBoost: number;
};

export class FlockSimulation {
  readonly positions: Float32Array;
  velocities: Float32Array;
  count: number;
  // 三维空间的半宽/半高/半深；x 由画布比例更新，z 越大纵深越明显。
  readonly bounds = {x: 1.6, y: 1.05, z: 0.9};
  private nextVelocities: Float32Array;
  private readonly phases: Float32Array;
  private readonly occupants: Int32Array;
  private readonly cellOf: Int32Array;
  private readonly nearest = new Int32Array(NEIGHBORS);
  private readonly distances = new Float32Array(NEIGHBORS);
  private cellCounts = new Int32Array(0);
  private cellStarts = new Int32Array(0);
  private cellCursors = new Int32Array(0);
  private densityMass = new Float32Array(0);
  private densityField = new Float32Array(0); // 每格四项：平滑密度及 x/y/z 梯度。
  private readonly localDensity = new Float32Array(4); // 逐鸟复用插值结果，不创建对象。
  private cols = 0;
  private rows = 0;
  private layers = 0;
  private time = 0;
  private tick = 0;

  constructor(readonly capacity: number) {
    this.count = capacity;
    this.positions = new Float32Array(capacity * 3);
    this.velocities = new Float32Array(capacity * 3);
    this.nextVelocities = new Float32Array(capacity * 3);
    this.phases = new Float32Array(capacity);
    this.occupants = new Int32Array(capacity);
    this.cellOf = new Int32Array(capacity);

    for (let i = 0; i < capacity; i++) {
      const offset = i * 3;
      const school = (i % 3) * Math.PI * 2 / 3;
      const angle = Math.random() * Math.PI * 2;
      const vertical = Math.random() * 2 - 1;
      const radial = Math.cbrt(Math.random()) * 0.45;
      const planar = Math.sqrt(1 - vertical * vertical);
      this.positions[offset] = this.bounds.x * (Math.cos(school) * 0.3 + Math.cos(angle) * planar * radial);
      this.positions[offset + 1] = this.bounds.y * (Math.sin(school) * 0.25 + Math.sin(angle) * planar * radial);
      this.positions[offset + 2] = this.bounds.z * vertical * radial;
      const heading = school + (Math.random() - 0.5);
      this.velocities[offset] = Math.cos(heading) * CRUISE_SPEED;
      this.velocities[offset + 1] = Math.sin(heading) * CRUISE_SPEED * 0.65;
      this.velocities[offset + 2] = (Math.random() - 0.5) * CRUISE_SPEED;
      this.phases[i] = Math.random() * Math.PI * 2;
    }
    this.resize(1.6);
  }

  resize(halfWidth: number) {
    const width = Math.max(0.35, Math.min(4, halfWidth));
    const ratio = width / this.bounds.x;
    for (let i = 0; i < this.capacity; i++) {
      this.positions[i * 3] *= ratio;
      this.velocities[i * 3] *= ratio;
    }
    this.bounds.x = width;
    const cols = Math.ceil(width * 2 / PERCEPTION);
    const rows = Math.ceil(this.bounds.y * 2 / PERCEPTION);
    const layers = Math.ceil(this.bounds.z * 2 / PERCEPTION);
    if (cols !== this.cols || rows !== this.rows || layers !== this.layers) {
      this.cols = cols;
      this.rows = rows;
      this.layers = layers;
      const cells = cols * rows * layers;
      this.cellCounts = new Int32Array(cells);
      this.cellStarts = new Int32Array(cells + 1);
      this.cellCursors = new Int32Array(cells);
      this.densityMass = new Float32Array(cells);
      this.densityField = new Float32Array(cells * 4);
    }
  }

  private rebuildDensity() {
    const {positions: p, bounds: b, cols, rows, layers, densityMass: mass, densityField: field} = this;
    const plane = cols * rows;
    mass.fill(0);
    // 将每只鸟分摊到附近八个格心，位置跨格时密度连续变化。
    for (let i = 0; i < this.count; i++) {
      const o = i * 3;
      const gx = (p[o] + b.x) / PERCEPTION - 0.5;
      const gy = (p[o + 1] + b.y) / PERCEPTION - 0.5;
      const gz = (p[o + 2] + b.z) / PERCEPTION - 0.5;
      const ix = Math.floor(gx), iy = Math.floor(gy), iz = Math.floor(gz);
      const tx = gx - ix, ty = gy - iy, tz = gz - iz;
      for (let dz = 0; dz < 2; dz++) {
        const z = Math.max(0, Math.min(layers - 1, iz + dz));
        const wz = dz ? tz : 1 - tz;
        for (let dy = 0; dy < 2; dy++) {
          const y = Math.max(0, Math.min(rows - 1, iy + dy));
          const wyz = (dy ? ty : 1 - ty) * wz;
          for (let dx = 0; dx < 2; dx++) {
            const x = Math.max(0, Math.min(cols - 1, ix + dx));
            mass[x + y * cols + z * plane] += (dx ? tx : 1 - tx) * wyz;
          }
        }
      }
    }
    // 小网格上的 [1,2,1] 平滑核：过滤单格噪声，感知较大团体的拥挤程度。
    for (let z = 0; z < layers; z++) for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let sum = 0;
      for (let dz = -1; dz <= 1; dz++) {
        const nz = Math.max(0, Math.min(layers - 1, z + dz));
        const wz = dz === 0 ? 2 : 1;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = Math.max(0, Math.min(rows - 1, y + dy));
          const wyz = (dy === 0 ? 2 : 1) * wz;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = Math.max(0, Math.min(cols - 1, x + dx));
            sum += mass[nx + ny * cols + nz * plane] * (dx === 0 ? 2 : 1) * wyz;
          }
        }
      }
      field[(x + y * cols + z * plane) * 4] = sum / 64;
    }
    // 密度用中心差分求梯度，再逐鸟插值；力不会在网格边界突然换方向。
    const inverseSpacing = 1 / (2 * PERCEPTION);
    for (let z = 0; z < layers; z++) for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const cell = x + y * cols + z * plane;
      const offset = cell * 4;
      const left = cell - (x > 0 ? 1 : 0), right = cell + (x < cols - 1 ? 1 : 0);
      const down = cell - (y > 0 ? cols : 0), up = cell + (y < rows - 1 ? cols : 0);
      const back = cell - (z > 0 ? plane : 0), front = cell + (z < layers - 1 ? plane : 0);
      field[offset + 1] = (field[right * 4] - field[left * 4]) * inverseSpacing;
      field[offset + 2] = (field[up * 4] - field[down * 4]) * inverseSpacing;
      field[offset + 3] = (field[front * 4] - field[back * 4]) * inverseSpacing;
    }
  }

  private sampleDensity(x: number, y: number, z: number) {
    const {bounds: b, cols, rows, layers, densityField: field, localDensity: result} = this;
    const plane = cols * rows;
    const gx = (x + b.x) / PERCEPTION - 0.5;
    const gy = (y + b.y) / PERCEPTION - 0.5;
    const gz = (z + b.z) / PERCEPTION - 0.5;
    const ix = Math.floor(gx), iy = Math.floor(gy), iz = Math.floor(gz);
    const tx = gx - ix, ty = gy - iy, tz = gz - iz;
    result.fill(0);
    for (let dz = 0; dz < 2; dz++) {
      const nz = Math.max(0, Math.min(layers - 1, iz + dz));
      const wz = dz ? tz : 1 - tz;
      for (let dy = 0; dy < 2; dy++) {
        const ny = Math.max(0, Math.min(rows - 1, iy + dy));
        const wyz = (dy ? ty : 1 - ty) * wz;
        for (let dx = 0; dx < 2; dx++) {
          const nx = Math.max(0, Math.min(cols - 1, ix + dx));
          const weight = (dx ? tx : 1 - tx) * wyz;
          const offset = (nx + ny * cols + nz * plane) * 4;
          result[0] += field[offset] * weight;
          result[1] += field[offset + 1] * weight;
          result[2] += field[offset + 2] * weight;
          result[3] += field[offset + 3] * weight;
        }
      }
    }
  }

  step(dt: number, predator: Predator, kestrels?: FlyingPredators) {
    const {positions: p, velocities: v, nextVelocities: next, bounds: b} = this;
    const {cols, rows, layers, cellCounts: counts, cellStarts: starts, cellCursors: cursors} = this;
    const plane = cols * rows;
    const perceptionSq = PERCEPTION * PERCEPTION;
    const separationSq = SEPARATION * SEPARATION;
    this.time += dt;
    this.tick++;
    counts.fill(0);

    // 计数排序网格：每格的鸟在 occupants 中连续存放，不逐格创建数组。
    for (let i = 0; i < this.count; i++) {
      const o = i * 3;
      const cx = Math.max(0, Math.min(cols - 1, Math.floor((p[o] + b.x) / PERCEPTION)));
      const cy = Math.max(0, Math.min(rows - 1, Math.floor((p[o + 1] + b.y) / PERCEPTION)));
      const cz = Math.max(0, Math.min(layers - 1, Math.floor((p[o + 2] + b.z) / PERCEPTION)));
      const cell = cx + cy * cols + cz * plane;
      this.cellOf[i] = cell;
      counts[cell]++;
    }
    starts[0] = 0;
    for (let cell = 0; cell < counts.length; cell++) {
      starts[cell + 1] = starts[cell] + counts[cell];
      cursors[cell] = starts[cell];
    }
    for (let i = 0; i < this.count; i++) {
      this.occupants[cursors[this.cellOf[i]]++] = i;
    }
    this.rebuildDensity();
    const meanCellDensity = this.count * PERCEPTION ** 3 / (4 / 3 * Math.PI * b.x * b.y * b.z);
    const targetDensity = Math.max(1, meanCellDensity * DENSITY_TARGET_RATIO);

    for (let i = 0; i < this.count; i++) {
      const o = i * 3;
      const x = p[o], y = p[o + 1], z = p[o + 2];
      const vx = v[o], vy = v[o + 1], vz = v[o + 2];
      const cell = this.cellOf[i];
      const cx = cell % cols;
      const cy = Math.floor(cell / cols) % rows;
      const cz = Math.floor(cell / plane);
      let found = 0;
      let sx = 0, sy = 0, sz = 0, close = 0;
      this.distances.fill(Infinity);

      for (let gz = Math.max(0, cz - 1); gz <= Math.min(layers - 1, cz + 1); gz++) {
        for (let gy = Math.max(0, cy - 1); gy <= Math.min(rows - 1, cy + 1); gy++) {
          for (let gx = Math.max(0, cx - 1); gx <= Math.min(cols - 1, cx + 1); gx++) {
            const neighborCell = gx + gy * cols + gz * plane;
            const population = counts[neighborCell];
            const samples = Math.min(population, CELL_SAMPLES);
            // 拥挤格均匀抽样并轮换偏移，即使全部鸟挤在一格也限制计算量。
            const shift = population > CELL_SAMPLES ? (i * 17 + this.tick * 13) % population : 0;
            for (let sample = 0; sample < samples; sample++) {
              const slot = (Math.floor(sample * population / samples) + shift) % population;
              const j = this.occupants[starts[neighborCell] + slot];
              if (j === i) continue;
              const jo = j * 3;
              const dx = p[jo] - x, dy = p[jo + 1] - y, dz = p[jo + 2] - z;
              const d2 = dx * dx + dy * dy + dz * dz;
              if (d2 > perceptionSq) continue;
              if (d2 < separationSq) {
                const distance = Math.sqrt(Math.max(d2, 0.000001));
                const weight = (1 - distance / SEPARATION) / distance;
                sx -= dx * weight;
                sy -= dy * weight;
                sz -= dz * weight;
                close++;
              }
              if (d2 >= this.distances[NEIGHBORS - 1]) continue;
              let rank = Math.min(found, NEIGHBORS - 1);
              while (rank > 0 && d2 < this.distances[rank - 1]) {
                this.distances[rank] = this.distances[rank - 1];
                this.nearest[rank] = this.nearest[rank - 1];
                rank--;
              }
              this.distances[rank] = d2;
              this.nearest[rank] = j;
              found = Math.min(found + 1, NEIGHBORS);
            }
          }
        }
      }

      let ax = 0, ay = 0, az = 0;
      this.sampleDensity(x, y, z);
      const density = this.localDensity[0];
      const excess = Math.max(0, density / targetDensity - 1);
      const crowding = excess / (1 + excess); // 从不拥挤到最拥挤，平滑地落在0–1。
      const cohesion = COHESION * (1 - crowding * DENSITY_COHESION_REDUCTION);
      if (found) {
        let avx = 0, avy = 0, avz = 0, px = 0, py = 0, pz = 0;
        for (let n = 0; n < found; n++) {
          const jo = this.nearest[n] * 3;
          avx += v[jo]; avy += v[jo + 1]; avz += v[jo + 2];
          px += p[jo] - x; py += p[jo + 1] - y; pz += p[jo + 2] - z;
        }
        ax = (avx / found - vx) * ALIGNMENT + px / found * cohesion;
        ay = (avy / found - vy) * ALIGNMENT + py / found * cohesion;
        az = (avz / found - vz) * ALIGNMENT + pz / found * cohesion;
      }
      if (close) {
        const separation = SEPARATION_FORCE * (1 + crowding * DENSITY_SEPARATION_BOOST);
        ax += sx / close * separation;
        ay += sy / close * separation;
        az += sz / close * separation;
      }
      // 拥挤时向密度下降处转向，弱化吸附大团的倾向；不预设团数或运动轨迹。
      const pressure = DENSITY_PRESSURE * crowding / Math.max(targetDensity, density);
      ax -= this.localDensity[1] * pressure;
      ay -= this.localDensity[2] * pressure;
      az -= this.localDensity[3] * pressure;

      // 各鸟不同相位的弱游走，只扰动局部方向，不规定全局流场。
      const phase = this.phases[i];
      ax += Math.sin(this.time * 0.71 + phase) * WANDER;
      ay += Math.cos(this.time * 0.53 + phase * 1.7) * WANDER;
      az += Math.sin(this.time * 0.61 + phase * 2.3) * WANDER;

      // 预判椭球边界，逐渐转弯回场内。
      const ex = (x + vx * BOUNDARY_LOOKAHEAD) / b.x;
      const ey = (y + vy * BOUNDARY_LOOKAHEAD) / b.y;
      const ez = (z + vz * BOUNDARY_LOOKAHEAD) / b.z;
      const edge = ex * ex + ey * ey + ez * ez;
      if (edge > BOUNDARY_START) {
        const turn = (edge - BOUNDARY_START) * BOUNDARY_FORCE;
        ax -= ex / b.x * turn;
        ay -= ey / b.y * turn;
        az -= ez / b.z * turn;
      }

      let panic = 0;
      if (predator.active) {
        // 各深度都避让鼠标相机视线，不只推开同一平面上的鸟。
        const depth = z + CAMERA_DISTANCE;
        const rayLengthSq = 1 + predator.x * predator.x + predator.y * predator.y;
        const along = (x * predator.x + y * predator.y + depth) / rayLengthSq;
        let dx = x - predator.x * along;
        let dy = y - predator.y * along;
        let dz = depth - along;
        let distance = Math.hypot(dx, dy, dz);
        const radius = predator.radius * depth;
        if (distance < radius) {
          if (distance < 0.0001) {
            dx = Math.cos(i * 2.399963);
            dy = Math.sin(i * 2.399963);
            dz = 0;
            distance = 1;
            panic = 1;
          } else {
            panic = (1 - distance / radius) ** 2;
          }
          const flee = panic * PREDATOR_FORCE / distance;
          ax += dx * flee; ay += dy * flee; az += dz * flee;
        }
      }

      let speedBoost = panic * PANIC_SPEED_BOOST;
      if (kestrels) {
        // 红隼只影响三维位置附近的鸟；沿用鼠标的平滑衰减，但半径/力度更小。
        for (let k = 0; k < kestrels.count; k++) {
          const ko = k * 3;
          let dx = x - kestrels.positions[ko];
          let dy = y - kestrels.positions[ko + 1];
          let dz = z - kestrels.positions[ko + 2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 >= kestrels.radius * kestrels.radius) continue;
          let distance = Math.sqrt(d2);
          const alarm = (1 - distance / kestrels.radius) ** 2;
          if (distance < 0.0001) {
            dx = Math.cos(i * 2.399963 + k);
            dy = Math.sin(i * 2.399963 + k);
            dz = 0;
            distance = 1;
          }
          const flee = alarm * kestrels.force / distance;
          ax += dx * flee; ay += dy * flee; az += dz * flee;
          // 多只红隼和鼠标同时出现时不叠加速度上限，避免极端加速。
          speedBoost = Math.max(speedBoost, alarm * kestrels.speedBoost);
        }
      }

      const acceleration = Math.hypot(ax, ay, az);
      const accelerationScale = acceleration > MAX_ACCELERATION ? MAX_ACCELERATION / acceleration : 1;
      let nx = vx + ax * accelerationScale * dt;
      let ny = vy + ay * accelerationScale * dt;
      let nz = vz + az * accelerationScale * dt;
      const speed = Math.hypot(nx, ny, nz);
      const maxSpeed = MAX_SPEED + speedBoost;
      if (speed < 0.000001) {
        nx = Math.cos(phase) * MIN_SPEED; ny = Math.sin(phase) * MIN_SPEED; nz = 0;
      } else {
        const scale = Math.max(MIN_SPEED, Math.min(maxSpeed, speed)) / speed;
        nx *= scale; ny *= scale; nz *= scale;
      }
      next[o] = nx; next[o + 1] = ny; next[o + 2] = nz;
    }

    // 全部邻居读取结束后才一起积分，避免鸟的更新先后顺序影响结果。
    this.velocities = next;
    this.nextVelocities = v;
    for (let i = 0; i < this.count; i++) {
      const o = i * 3;
      for (let axis = 0; axis < 3; axis++) {
        const bound = axis === 0 ? b.x : axis === 1 ? b.y : b.z;
        const coordinate = p[o + axis] + next[o + axis] * dt;
        p[o + axis] = Math.max(-bound, Math.min(bound, coordinate));
        if (Math.abs(coordinate) > bound) {
          next[o + axis] = -Math.sign(coordinate) * Math.abs(next[o + axis]);
        }
      }
    }
  }
}
