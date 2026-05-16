import Layout from '@theme/Layout';
import {useEffect, useRef} from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

type Particle = {
  el: HTMLDivElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
};

export default function Home() {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bgRef.current) return;

    const formulas = [
      'i\\hbar \\partial_t \\psi = H\\psi',
      'i\\gamma^\\mu \\partial_\\mu \\psi - m\\psi = 0',
      '\\delta S = 0',
      'R_{\\mu\\nu} - \\frac{1}{2} R g_{\\mu\\nu} = 8\\pi G T_{\\mu\\nu}',
      'S = k_B \\ln \\Omega',
      'E = mc^2',
      'f(x) = \\frac{1}{\\sqrt{2\\pi\\sigma^2}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}',
      '\\frac{d}{dt} \\langle \\hat{O} \\rangle = \\frac{i}{\\hbar} \\langle [\\hat{H}, \\hat{O}] \\rangle + \\langle \\frac{\\partial \\hat{O}}{\\partial t} \\rangle',
      '\\frac{d}{dt}\\frac{\\partial L}{\\partial \\dot{q}} - \\frac{\\partial L}{\\partial q} = 0', 
      '\\frac{\\partial S}{\\partial t} + H\\left(q,\\frac{\\partial S}{\\partial q}, t\\right) = 0', 
      'dF = 0',
      'd\\star F = J',
      '\\mathcal{Z} = \\int \\mathcal{D} \\phi \\, e^{-S[\\phi]} ',
      'S[g] = \\frac{1}{2\\kappa} \\int  R\\sqrt{-g} \\, d^4x ',
      '[x_i, p_j] = i\\hbar \\delta_{ij}',
      '\\omega = d\\theta',
      'i\\hbar \\partial_t \\psi = H\\psi',
      'i\\gamma^\\mu \\partial_\\mu \\psi - m\\psi = 0',
      '\\delta S = 0',
      'R_{\\mu\\nu} - \\frac{1}{2} R g_{\\mu\\nu} = 8\\pi G T_{\\mu\\nu}',
      'S = k_B \\ln \\Omega',
      'E = mc^2',
      'f(x) = \\frac{1}{\\sqrt{2\\pi\\sigma^2}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}',
      '\\frac{d}{dt} \\langle \\hat{O} \\rangle = \\frac{i}{\\hbar} \\langle [\\hat{H}, \\hat{O}] \\rangle + \\langle \\frac{\\partial \\hat{O}}{\\partial t} \\rangle',
      '\\frac{d}{dt}\\frac{\\partial L}{\\partial \\dot{q}} - \\frac{\\partial L}{\\partial q} = 0', 
      '\\frac{\\partial S}{\\partial t} + H\\left(q,\\frac{\\partial S}{\\partial q}, t\\right) = 0', 
      'dF = 0',
      'd\\star F = J',
      '\\mathcal{Z} = \\int \\mathcal{D} \\phi \\, e^{-S[\\phi]} ',
      'S[g] = \\frac{1}{2\\kappa} \\int  R\\sqrt{-g} \\, d^4x ',
      '[x_i, p_j] = i\\hbar \\delta_{ij}',
      '\\omega = d\\theta'
    ];

    const particles: Particle[] = [];

    const W = window.innerWidth;
    const H = window.innerHeight;

    formulas.forEach((f) => {
      const el = document.createElement('div');

      katex.render(f, el, {
        throwOnError: false,
        displayMode: true,
      });

      const p: Particle = {
        el,
        x: Math.random() * W,
        y: Math.random() * H,
        vx: 0,
        vy: 0,
        r: 90,
      };

      el.style.position = 'absolute';
      el.style.opacity = '0.12';
      el.style.pointerEvents = 'none';

      bgRef.current?.appendChild(el);
      particles.push(p);
    });
    
    let t = 0;

    function step() {
      t += 1;

      const cx = W / 2;
      const cy = H / 2;

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];

        let ax = 0;
        let ay = 0;

        for (let j = 0; j < particles.length; j++) {
          if (i === j) continue;

          const b = particles[j];

          let dx = a.x - b.x;
          let dy = a.y - b.y;

          const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
          const minDist = a.r + b.r;

          if (dist < minDist) {
            const force = (minDist - dist) * 0.02;

            ax += (dx / dist) * force;
            ay += (dy / dist) * force;
          }
        }

        const dxC = cx - a.x;
        const dyC = cy - a.y;

        const distC = Math.sqrt(dxC * dxC + dyC * dyC) + 0.001;

        // 切向方向（绕中心旋转）
        const tx = -dyC / distC;
        const ty = dxC / distC;

        // 旋转强度（很弱，否则会压过其他力）
        const rotationStrength = 4e-2;

        ax += tx * rotationStrength;
        ay += ty * rotationStrength;

        const omega = 0.01;
        const A = 1e-4;

        const phase = (a.x + a.y) * 0.001;
        const oscillation = Math.sin(t * omega + phase) * Math.sin(t * omega + phase);

        ax += dxC * A * oscillation;
        ay += dyC * A * oscillation;

        a.vx = (a.vx + ax) * 0.9;
        a.vy = (a.vy + ay) * 0.9;

        a.x += a.vx;
        a.y += a.vy;
      }

      particles.forEach(p => {
        p.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      });

      requestAnimationFrame(step);
    }

    step();
  }, []);

  return (
    <Layout title="Home">
      <main className="hero-center">
        <div className="eq-bg" ref={bgRef} />

        <div className="center-text">
          <h1>Hiroshiprover</h1>
          <p>"Physics is dirty Math."</p>
        </div>
      </main>
    </Layout>
  );
}