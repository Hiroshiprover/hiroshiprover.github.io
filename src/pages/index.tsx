import Layout from '@theme/Layout';
import {useEffect, useRef} from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/* ================================================================== */
/*  Types & constants                                                  */
/* ================================================================== */

type Particle = {
  el: HTMLDivElement;
  cx: number;          // centre x
  cy: number;          // centre y
  vx: number;          // linear velocity
  vy: number;
  theta: number;       // orientation (radians)
  omega: number;       // angular velocity (rad / s)
  hw: number;          // half‑width  (measured from element)
  hh: number;          // half‑height
  mass: number;
  inertia: number;     // moment of inertia about centre
};

/** Corners of an OBB, wound CCW starting from (+hw, -hh) in local frame. */
type Corners = [number, number][];   // length‑4

/* ---------- tunable constants ------------------------------------- */

const TEMPERATURE        = 114.514;
const MOUSE_RADIUS       = 300;
const MOUSE_FORCE        = 150.0;  // rigid‑ball repulsion
const CELL_SIZE          = 200;
const DAMPING_PER_FRAME         = 0.003;  // linear velocity friction
const DAMPING_ANGULAR_PER_FRAME = 0.08;  // angular velocity friction (独立于平动)
const THERMAL_K_LINEAR   = 10.0;
const THERMAL_K_ANGULAR  = 0.45;
const ORIENTATION_K      = 700;   // restoring torque → horizontal
const RESTITUTION        = 1;
const WALL_RESTITUTION   = 0.3;
const WALL_FRICTION      = 0.4;
const RADIUS_PAD         = 6;

/* ================================================================== */
/*  Formula catalogue                                                  */
/* ================================================================== */

const FORMULAS: string[] = [
  /* Quantum mechanics */
  'i\\hbar \\partial_t \\psi = H\\psi',
  'i\\gamma^\\mu \\partial_\\mu \\psi - m\\psi = 0',
  '\\Delta x\\,\\Delta p \\geq \\hbar/2',
  '\\lambda = h/p',
  '\\frac{d}{dt}\\langle\\hat{O}\\rangle = \\frac{i}{\\hbar}\\langle[\\hat{H},\\hat{O}]\\rangle + \\langle\\partial_t\\hat{O}\\rangle',
  '[x_i, p_j] = i\\hbar\\delta_{ij}',
  'i\\hbar\\,\\partial_t\\rho = [H, \\rho]',

  /* Classical mechanics */
  '\\delta S = 0',
  '\\frac{d}{dt}\\frac{\\partial L}{\\partial\\dot{q}} - \\frac{\\partial L}{\\partial q} = 0',
  '\\frac{\\partial S}{\\partial t} + H\\!\\left(q,\\frac{\\partial S}{\\partial q},t\\right) = 0',
  '\\omega = d\\theta',
  '\\{\\rho, H\\} + \\partial_t\\rho = 0',
  'j^\\mu = \\frac{\\partial\\mathcal{L}}{\\partial(\\partial_\\mu\\phi)}\\Delta\\phi - J^\\mu',

  /* Electrodynamics */
  'dF = 0',
  'd\\star F = J',

  /* Statistical physics */
  'S = k_B \\ln \\Omega',
  'Z = \\sum_n e^{-\\beta E_n}',
  'n_F = \\frac{1}{e^{\\beta(\\varepsilon-\\mu)} + 1}',
  'n_B = \\frac{1}{e^{\\beta(\\varepsilon-\\mu)} - 1}',
  'm\\ddot{x} = -\\gamma\\dot{x} + \\eta(t)',
  '\\partial_t P = -\\partial_x(\\mu P) + D\\,\\partial_x^2 P',
  '\\langle e^{-\\beta W}\\rangle = e^{-\\beta\\Delta F}',
  'D = \\mu k_B T',

  /* Thermodynamics */
  'G = H - TS',
  'F = U - TS',
  'pV = N k_B T',
  'j = \\sigma T^{4}',

  /* General relativity */
  'R_{\\mu\\nu} - \\frac{1}{2}R g_{\\mu\\nu} = 8\\pi G T_{\\mu\\nu}',
  '\\ddot{x}^\\mu + \\Gamma^\\mu_{\\alpha\\beta}\\dot{x}^\\alpha\\dot{x}^\\beta = 0',
  'S[g] = \\frac{1}{2\\kappa}\\int R\\sqrt{-g}\\,d^4x',
  '\\left(\\frac{\\dot{a}}{a}\\right)^2 = \\frac{8\\pi G}{3}\\rho - \\frac{k}{a^2} + \\frac{\\Lambda}{3}',
  'ds^2 = -\\left(1-\\frac{2GM}{r}\\right)dt^2 + \\left(1-\\frac{2GM}{r}\\right)^{-1}\\!dr^2 + r^2 d\\Omega^2',

  /* Quantum field theory */
  '\\mathcal{Z} = \\int\\mathcal{D}\\phi\\,e^{-S[\\phi]}',
  '\\mathcal{L} = -\\frac{1}{4}F_{\\mu\\nu}^a F^{a\\mu\\nu}',
  '(\\Box + m^2)\\phi = 0',

  /* Differential geometry / fibre bundles */
  'd\\omega + \\omega\\wedge\\omega = \\Omega',
  'F = dA + A\\wedge A',
  'D = d + A',
  'C = \\frac{i}{2\\pi}\\int_\\mathrm{BZ}\\mathcal{F}_{12}\\,dk^2',
  'R^\\rho_{\\sigma\\mu\\nu} = \\partial_\\mu\\Gamma^\\rho_{\\nu\\sigma} - \\partial_\\nu\\Gamma^\\rho_{\\mu\\sigma} + \\Gamma^\\rho_{\\mu\\lambda}\\Gamma^\\lambda_{\\nu\\sigma} - \\Gamma^\\rho_{\\nu\\lambda}\\Gamma^\\lambda_{\\mu\\sigma}',
  '\\Gamma^\\mu_{\\nu\\rho} = \\frac{1}{2}g^{\\mu\\sigma}(\\partial_\\nu g_{\\rho\\sigma} + \\partial_\\rho g_{\\nu\\sigma} - \\partial_\\sigma g_{\\nu\\rho})',
  '\\nabla_\\mu V^\\nu = \\partial_\\mu V^\\nu + \\Gamma^\\nu_{\\mu\\lambda} V^\\lambda',
  '[\\nabla_\\mu, \\nabla_\\nu] V^\\rho = R^\\rho_{\\sigma\\mu\\nu} V^\\sigma',

  /* Topological / geometric phases */
  '\\mathcal{A}_n = i\\langle n|\\nabla|n\\rangle',
  '\\mathcal{F}_{ij} = \\partial_i\\mathcal{A}_j - \\partial_j\\mathcal{A}_i',
  '\\sigma_{xy} = \\frac{e^2}{h}\\sum_n C_n',

  /* Special functions (math‑phys) */
  '\\zeta(s) = \\sum_{n=1}^\\infty\\frac{1}{n^s}',
  'P_n(x) = \\frac{1}{2^n n!}\\frac{d^n}{dx^n}(x^2-1)^n',
  'x^2 y\'\' + x y\' + (x^2-\\nu^2)y = 0',
  'H_n(x) = (-1)^n e^{x^2}\\frac{d^n}{dx^n}e^{-x^2}',
  'Y_\\ell^m = N_{\\ell m}\\,e^{im\\phi}\\,P_\\ell^m(\\cos\\theta)',
  'e^{i\\pi} + 1 = 0',
  '\\Gamma(z) = \\int_0^\\infty t^{z-1} e^{-t}\\,dt',

  /* Solid‑state / condensed matter */
  '\\psi_{\\mathbf{k}}(\\mathbf{r}) = e^{i\\mathbf{k}\\cdot\\mathbf{r}}u_{\\mathbf{k}}(\\mathbf{r})',
  'F = a|\\psi|^2 + \\frac{b}{2}|\\psi|^4',

  /* Fluid dynamics / transport */
  '\\rho(\\partial_t\\mathbf{v} + \\mathbf{v}\\cdot\\nabla\\mathbf{v}) = -\\nabla p + \\eta\\nabla^2\\mathbf{v} + \\mathbf{f}',
  '\\partial_t\\rho + \\nabla\\cdot\\mathbf{j} = 0',
  '\\partial_t f + \\mathbf{v}\\cdot\\nabla f + \\mathbf{F}\\cdot\\nabla_\\mathbf{p} f = (\\partial_t f)_\\mathrm{coll}',

  /* Special relativity */
  'E = mc^2',

  /* Probability */
  'f(x) = \\frac{1}{\\sqrt{2\\pi\\sigma^2}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}',
];

/* ================================================================== */
/*  Geometry helpers  (OBB = oriented bounding box)                    */
/* ================================================================== */

/** 4 corners of the OBB in world space, CCW order. */
function corners(p: Particle): Corners {
  const c = Math.cos(p.theta);
  const s = Math.sin(p.theta);
  const hw = p.hw;
  const hh = p.hh;
  // local coords then rotate:  (x,y) → (x·c - y·s,  x·s + y·c)
  return [
    [p.cx + hw * c + hh * s,  p.cy + hw * s - hh * c],  // (+hw, -hh)
    [p.cx - hw * c + hh * s,  p.cy - hw * s - hh * c],  // (-hw, -hh)
    [p.cx - hw * c - hh * s,  p.cy - hw * s + hh * c],  // (-hw, +hh)
    [p.cx + hw * c - hh * s,  p.cy + hw * s + hh * c],  // (+hw, +hh)
  ];
}

/** The two separating axes of a rectangle (local x and local y directions). */
function axesOf(p: Particle): [number, number][] {
  const c = Math.cos(p.theta);
  const s = Math.sin(p.theta);
  return [
    [c, s],
    [-s, c],
  ];
}

/** Project four corners onto an axis; return [min, max]. */
function project(cs: Corners, ax: number, ay: number): [number, number] {
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < 4; i++) {
    const d = cs[i][0] * ax + cs[i][1] * ay;
    if (d < mn) mn = d;
    if (d > mx) mx = d;
  }
  return [mn, mx];
}

/** Closest point on an OBB to a query point (world coords). */
function closestPointOnOBB(
  p: Particle, qx: number, qy: number
): { cx: number; cy: number; dist: number } {
  const c = Math.cos(p.theta);
  const s = Math.sin(p.theta);
  const dx = qx - p.cx;
  const dy = qy - p.cy;
  // rotate query into local frame
  const lx =  dx * c + dy * s;
  const ly = -dx * s + dy * c;
  // clamp to rectangle extents
  const clx = Math.max(-p.hw, Math.min(p.hw, lx));
  const cly = Math.max(-p.hh, Math.min(p.hh, ly));
  // rotate back
  const wx = p.cx + clx * c - cly * s;
  const wy = p.cy + clx * s + cly * c;
  const ddx = qx - wx;
  const ddy = qy - wy;
  return {cx: wx, cy: wy, dist: Math.sqrt(ddx * ddx + ddy * ddy)};
}

/* ================================================================== */
/*  SAT collision detection + impulse response                         */
/* ================================================================== */

interface Contact {
  nx: number;       // collision normal (unit, points from B → A)
  ny: number;
  penetration: number;
}

/**
 * Oriented‑bounding‑box SAT.
 * Returns null if no overlap; otherwise returns minimum‑translation
 * normal (B→A) and penetration depth.
 */
function obbContact(a: Particle, b: Particle): Contact | null {
  const axes = [...axesOf(a), ...axesOf(b)];
  const ca = corners(a);
  const cb = corners(b);

  let bestPen = Infinity;
  let bestNx = 0, bestNy = 0;

  for (const [ax, ay] of axes) {
    // Normalise axis (needed for correct penetration depth)
    const len = Math.sqrt(ax * ax + ay * ay);
    const nx = ax / len, ny = ay / len;

    const [minA, maxA] = project(ca, nx, ny);
    const [minB, maxB] = project(cb, nx, ny);

    const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
    if (overlap <= 0) return null;          // separating axis → no collision

    if (overlap < bestPen) {
      bestPen = overlap;
      // Direction: from B centre towards A centre
      const dotA = a.cx * nx + a.cy * ny;
      const dotB = b.cx * nx + b.cy * ny;
      if (dotA > dotB) { bestNx = nx;  bestNy = ny; }
      else             { bestNx = -nx; bestNy = -ny; }
    }
  }

  return {nx: bestNx, ny: bestNy, penetration: bestPen};
}

/**
 * Apply position correction and velocity‑level impulse to two
 * colliding rigid rectangles.
 */
function resolveCollision(a: Particle, b: Particle, c: Contact) {
  const {nx, ny, penetration} = c;

  // ---- positional separation (mass‑weighted) ----
  const invTotal = 1 / (a.mass + b.mass);
  const shiftA = penetration * b.mass * invTotal;
  const shiftB = penetration * a.mass * invTotal;
  a.cx += nx * shiftA;
  a.cy += ny * shiftA;
  b.cx -= nx * shiftB;
  b.cy -= ny * shiftB;

  // ---- contact point (approximate: midpoint of centres) ----
  const px = (a.cx + b.cx) * 0.5;
  const py = (a.cy + b.cy) * 0.5;

  const rax = px - a.cx, ray = py - a.cy;
  const rbx = px - b.cx, rby = py - b.cy;

  // velocity of contact point on each body (2D: ω × r = ω·(-r_y, r_x))
  const vax = a.vx - a.omega * ray;
  const vay = a.vy + a.omega * rax;
  const vbx = b.vx - b.omega * rby;
  const vby = b.vy + b.omega * rbx;

  const vrx = vax - vbx;
  const vry = vay - vby;
  const vn  = vrx * nx + vry * ny;          // normal relative speed

  if (vn > 0) return;                       // separating – no impulse

  // cross(ra, n) = ra_x·n_y - ra_y·n_x
  const raCn = rax * ny - ray * nx;
  const rbCn = rbx * ny - rby * nx;

  const invDenom =
    1 / a.mass + 1 / b.mass +
    raCn * raCn / a.inertia +
    rbCn * rbCn / b.inertia;

  const j = -(1 + RESTITUTION) * vn / invDenom;

  // apply impulse  +j·n on A,  -j·n on B
  a.vx += j * nx / a.mass;
  a.vy += j * ny / a.mass;
  a.omega += j * raCn / a.inertia;

  b.vx -= j * nx / b.mass;
  b.vy -= j * ny / b.mass;
  b.omega -= j * rbCn / b.inertia;
}

/* ================================================================== */
/*  Rigid‑wall collision  (reflect + friction)                         */
/* ================================================================== */

function resolveWalls(p: Particle, w: number, h: number) {
  const cs = corners(p);
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const [cx, cy] of cs) {
    if (cx < minX) minX = cx;
    if (cx > maxX) maxX = cx;
    if (cy < minY) minY = cy;
    if (cy > maxY) maxY = cy;
  }

  const r = WALL_RESTITUTION;
  const f = WALL_FRICTION;

  if (minX < 0) {
    p.cx += -minX;
    p.vx  =  Math.abs(p.vx) * r;
    p.vy *= (1 - f);
    p.omega *= (1 - f);
  }
  if (maxX > w) {
    p.cx -= maxX - w;
    p.vx  = -Math.abs(p.vx) * r;
    p.vy *= (1 - f);
    p.omega *= (1 - f);
  }
  if (minY < 0) {
    p.cy += -minY;
    p.vy  =  Math.abs(p.vy) * r;
    p.vx *= (1 - f);
    p.omega *= (1 - f);
  }
  if (maxY > h) {
    p.cy -= maxY - h;
    p.vy  = -Math.abs(p.vy) * r;
    p.vx *= (1 - f);
    p.omega *= (1 - f);
  }
}

/* ================================================================== */
/*  Misc helpers                                                       */
/* ================================================================== */

function gauss(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export default function Home() {
  const bgRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const mouseRef = useRef<{x: number; y: number} | null>(null);
  const dimsRef = useRef({
    w: typeof window !== 'undefined' ? window.innerWidth : 1200,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  });
  const gridRef = useRef<{cols: number; cells: number[][]}>({cols: 0, cells: []});

  /* ----------  bootstrap  ---------------------------------------- */
  useEffect(() => {
    const container = bgRef.current;
    if (!container) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    dimsRef.current = {w: W, h: H};

    const buildGrid = (ww: number, hh: number) => {
      const cols = Math.ceil(ww / CELL_SIZE) + 1;
      const rows = Math.ceil(hh / CELL_SIZE) + 1;
      gridRef.current = {
        cols,
        cells: Array.from({length: cols * rows}, () => []),
      };
    };
    buildGrid(W, H);

    /* ---- render formulas ---- */
    const fragment = document.createDocumentFragment();
    const particles: Particle[] = [];

    for (const f of FORMULAS) {
      const el = document.createElement('div');
      el.innerHTML = katex.renderToString(f, {throwOnError: false, displayMode: true});
      el.style.position = 'absolute';
      el.style.opacity = '0.12';
      el.style.pointerEvents = 'none';
      el.style.whiteSpace = 'nowrap';
      el.style.fontSize = '12px';
      el.style.transformOrigin = 'center center';
      el.style.willChange = 'transform';
      fragment.appendChild(el);

      particles.push({
        el,
        cx: 0, cy: 0, vx: 0, vy: 0,
        theta: 0, omega: 0,
        hw: 50, hh: 15,          // placeholder
        mass: 1, inertia: 1,
      });
    }

    container.appendChild(fragment);

    /* ---- measure & init dynamics ---- */
    let maxDim = 0;
    for (const p of particles) {
      const rect = p.el.getBoundingClientRect();
      p.hw = rect.width / 2 + RADIUS_PAD;
      p.hh = rect.height / 2 + RADIUS_PAD;
      p.mass = 1;
      p.inertia = (p.hw * p.hw + p.hh * p.hh) / 3;   // rectangular plate
      const d = Math.sqrt(p.hw * p.hw + p.hh * p.hh); // bounding‑circle radius
      if (d > maxDim) maxDim = d;
    }

    /* ---- grid‑based initial placement ---- */
    const n = particles.length;
    const gCols = Math.ceil(Math.sqrt(n * (W / H)));
    const gRows = Math.ceil(n / gCols);
    const cellW = (W - 2 * maxDim) / gCols;
    const cellH = (H - 2 * maxDim) / gRows;

    const indices: [number, number][] = [];
    for (let r = 0; r < gRows; r++)
      for (let c = 0; c < gCols; c++)
        if (indices.length < n) indices.push([r, c]);
    shuffle(indices);

    for (let i = 0; i < n; i++) {
      const p = particles[i];
      const [row, col] = indices[i];
      const margin = Math.sqrt(p.hw * p.hw + p.hh * p.hh); // use own bounding circle
      const xMin = maxDim + col * cellW + margin;
      const xMax = maxDim + (col + 1) * cellW - margin;
      const yMin = maxDim + row * cellH + margin;
      const yMax = maxDim + (row + 1) * cellH - margin;
      p.cx = xMin + Math.random() * Math.max(0, xMax - xMin);
      p.cy = yMin + Math.random() * Math.max(0, yMax - yMin);
      p.theta = (Math.random() - 0.5) * Math.PI;        // random orientation
      p.vx = (Math.random() - 0.5) * 20;
      p.vy = (Math.random() - 0.5) * 20;
      p.omega = (Math.random() - 0.5) * 0.3;
    }

    particlesRef.current = particles;

    /* ==========  animation loop  ================================== */
    let cancelled = false;

    function step(_ts: number) {
      if (cancelled) return;

      const {w, h} = dimsRef.current;
      const T = TEMPERATURE;
      const mouse = mouseRef.current;
      const parts = particlesRef.current;
      const num = parts.length;

      // rebuild grid on resize
      const {cols: oldCols, cells: oldCells} = gridRef.current;
      if (oldCells.length === 0 || Math.ceil(w / CELL_SIZE) + 1 !== oldCols) {
        buildGrid(w, h);
      }

      const {cells: grid, cols: cCols} = gridRef.current;
      const totalCells = grid.length;
      for (let i = 0; i < totalCells; i++) grid[i].length = 0;

      // spatial‑hash assign
      for (let i = 0; i < num; i++) {
        const col = Math.floor(parts[i].cx / CELL_SIZE);
        const row = Math.floor(parts[i].cy / CELL_SIZE);
        if (col < 0 || row < 0 || col >= cCols) continue;
        const idx = row * cCols + col;
        if (idx < totalCells) grid[idx].push(i);
      }

      const dt = 1 / 60;
      const sqrtT = Math.sqrt(T);

      /* ---- forces & collisions ---- */
      for (let i = 0; i < num; i++) {
        const a = parts[i];
        let ax = 0, ay = 0;

        /* inter‑body (SAT) */
        const col = Math.floor(a.cx / CELL_SIZE);
        const row = Math.floor(a.cy / CELL_SIZE);
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = row + dr, nc = col + dc;
            if (nr < 0 || nc < 0 || nc >= cCols) continue;
            const nidx = nr * cCols + nc;
            if (nidx >= totalCells) continue;
            const nb = grid[nidx];
            for (let k = 0; k < nb.length; k++) {
              const j = nb[k];
              if (j <= i) continue;
              const b = parts[j];
              const contact = obbContact(a, b);
              if (contact) resolveCollision(a, b, contact);
            }
          }
        }

        /* mouse – rigid‑ball vs OBB */
        if (mouse) {
          const closest = closestPointOnOBB(a, mouse.x, mouse.y);
          if (closest.dist < MOUSE_RADIUS && closest.dist > 0.001) {
            const overlap = MOUSE_RADIUS - closest.dist;
            // push OBB away from mouse
            const nx = (closest.cx - mouse.x) / closest.dist;
            const ny = (closest.cy - mouse.y) / closest.dist;
            const fMag = MOUSE_FORCE * overlap / closest.dist;
            ax += nx * fMag;
            ay += ny * fMag;
            // torque from off‑centre force
            const rx = closest.cx - a.cx;
            const ry = closest.cy - a.cy;
            a.omega += (rx * ny - ry * nx) * fMag * dt / a.inertia;
          }
        }

        /* thermal agitation + orientation bias */
        a.vx    += THERMAL_K_LINEAR * sqrtT * dt * gauss();
        a.vy    += THERMAL_K_LINEAR * sqrtT * dt * gauss();
        a.omega += THERMAL_K_ANGULAR * Math.sqrt(T / a.inertia) * dt * gauss();
        a.omega -= ORIENTATION_K * Math.sin(a.theta) * dt;   // restores horizontal

        /* integrate + damping */
        a.vx = (a.vx + ax * dt) * (1 - DAMPING_PER_FRAME);
        a.vy = (a.vy + ay * dt) * (1 - DAMPING_PER_FRAME);
        a.omega *= (1 - DAMPING_ANGULAR_PER_FRAME);

        a.cx += a.vx * dt;
        a.cy += a.vy * dt;
        a.theta += a.omega * dt;

        /* rigid walls */
        resolveWalls(a, w, h);
      }

      /* ---- render ---- */
      for (let i = 0; i < num; i++) {
        const p = parts[i];
        p.el.style.transform =
          `translate(${p.cx}px, ${p.cy}px) rotate(${p.theta}rad)`;
      }

      animRef.current = requestAnimationFrame(step);
    }

    animRef.current = requestAnimationFrame(step);

    /* ----------  listeners  -------------------------------------- */
    const onMove  = (e: MouseEvent) => { mouseRef.current = {x: e.clientX, y: e.clientY}; };
    const onLeave = () => { mouseRef.current = null; };
    const onResize = () => { dimsRef.current = {w: window.innerWidth, h: window.innerHeight}; };

    window.addEventListener('mousemove',  onMove);
    document.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize',     onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('mousemove',  onMove);
      document.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize',     onResize);
      for (const p of particlesRef.current) p.el.remove();
    };
  }, []);

  /* ----------  render  ------------------------------------------- */
  return (
    <Layout title="Home">
      <main className="hero-center">
        <div className="eq-bg" ref={bgRef} />
        <div className="center-text">
          <h1>Hiroshiprover</h1>
          <p>&quot;Physics is dirty Math.&quot;</p>
        </div>
      </main>
    </Layout>
  );
}