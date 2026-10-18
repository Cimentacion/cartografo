// Capa 2D encima del 3D: mira, avisos de "te van a disparar" y flechas para girar el móvil
import * as THREE from 'three';
import { vw, vh } from './util.js';

const V = new THREE.Vector3(), P = new THREE.Vector3();

function urgCol(u, a = 1) {
  // verde -> amarillo -> rojo
  const h = u < 0.5 ? 120 - u * 2 * 60 : 60 - (u - 0.5) * 2 * 60;
  return `hsla(${h},100%,55%,${a})`;
}

export class Hud {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.dpr = 1;
    this.hitT = 0; this.hot = false; this.myCol = '#3fa9ff';
    this.resize();
  }
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.c.width = Math.round(vw() * this.dpr);
    this.c.height = Math.round(vh() * this.dpr);
  }
  draw(cam, view, li, t, dt, o) {
    const g = this.g, W = vw(), H = vh();
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (!cam) return;
    const cx = W / 2, cy = H / 2;
    // líneas de velocidad (cuesta abajo, turbo)
    if (o.wind > 0) {
      g.lineCap = 'round';
      for (let i = 0; i < 26 * o.wind; i++) {
        const a = Math.random() * Math.PI * 2, r0 = (0.35 + Math.random() * 0.4) * Math.max(W, H) * 0.5, len = 30 + Math.random() * 90 * o.wind;
        const x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0 * 0.75;
        g.strokeStyle = `rgba(255,255,255,${0.12 + Math.random() * 0.25 * o.wind})`;
        g.lineWidth = 1 + Math.random() * 2;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a) * len, y0 + Math.sin(a) * len * 0.75); g.stroke();
      }
    }
    // --- amenazas sobre mí ---
    let edgeL = 0, edgeR = 0, edgeB = 0;
    for (const k of view.tele) {
      if (k.tgt !== li || o.dead) continue;
      V.set(k.x, k.y, k.z).applyMatrix4(cam.matrixWorldInverse);
      const front = V.z < -0.3;
      let on = false, sx = 0, sy = 0;
      if (front) {
        P.copy(V).applyMatrix4(cam.projectionMatrix);
        sx = (P.x * 0.5 + 0.5) * W; sy = (-P.y * 0.5 + 0.5) * H;
        on = sx > 24 && sx < W - 24 && sy > 24 && sy < H - 24;
      }
      const u = k.r;
      if (on) this.ring(sx, sy, u, t);
      else {
        const a = this.arrow(V.x, V.y, front, u, t, W, H);
        if (u > 0.45) { if (!front && Math.abs(V.x) < Math.abs(V.z) * 0.6) edgeB = Math.max(edgeB, u); else if (a < 0) edgeL = Math.max(edgeL, u); else edgeR = Math.max(edgeR, u); }
      }
    }
    const edge = (x0, x1, u) => {
      const gr = g.createLinearGradient(x0, 0, x1, 0);
      gr.addColorStop(0, `rgba(255,30,30,${0.15 + u * 0.45 * (0.6 + 0.4 * Math.sin(t * 20))})`);
      gr.addColorStop(1, 'rgba(255,30,30,0)');
      g.fillStyle = gr;
      g.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), H);
    };
    if (edgeL) edge(0, W * 0.18, edgeL);
    if (edgeR) edge(W, W * 0.82, edgeR);
    if (edgeB) { edge(0, W * 0.14, edgeB); edge(W, W * 0.86, edgeB); }
    // --- textos flotantes ---
    g.textAlign = 'center';
    for (let i = view.pops.length - 1; i >= 0; i--) {
      const p = view.pops[i];
      p.t += dt;
      if (p.t > 1.3) { view.pops.splice(i, 1); continue; }
      V.set(p.x, p.y + p.t * 1.2, p.z).applyMatrix4(cam.matrixWorldInverse);
      if (V.z > -0.5) continue;
      V.applyMatrix4(cam.projectionMatrix);
      const sx = (V.x * 0.5 + 0.5) * W, sy = (-V.y * 0.5 + 0.5) * H;
      const a = p.t < 1 ? 1 : 1 - (p.t - 1) / 0.3;
      g.font = `900 ${p.txt.length > 6 ? 18 : 22}px system-ui, sans-serif`;
      g.lineWidth = 4; g.strokeStyle = `rgba(0,0,0,${a * 0.8})`;
      g.strokeText(p.txt, sx, sy);
      g.globalAlpha = a; g.fillStyle = p.col; g.fillText(p.txt, sx, sy); g.globalAlpha = 1;
    }
    // --- mira ---
    if (!o.dead) {
      this.hitT = Math.max(0, this.hitT - dt);
      const col = this.hot ? '#ff3030' : this.myCol;
      const r = this.hot ? 13 : 17;
      g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.55)';
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 2; g.strokeStyle = col;
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        g.beginPath(); g.moveTo(cx + dx * (r - 6), cy + dy * (r - 6)); g.lineTo(cx + dx * (r + 8), cy + dy * (r + 8)); g.stroke();
      }
      g.fillStyle = col; g.fillRect(cx - 1.5, cy - 1.5, 3, 3);
      if (this.hitT > 0) {
        g.strokeStyle = '#ffffff'; g.lineWidth = 3;
        for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          g.beginPath(); g.moveTo(cx + dx * 8, cy + dy * 8); g.lineTo(cx + dx * 15, cy + dy * 15); g.stroke();
        }
      }
    }
  }
  ring(x, y, u, t) {
    const g = this.g;
    const r = 18 + (1 - u) * 62;
    const blink = u > 0.75 && Math.floor(t * 14) % 2 === 0;
    g.lineWidth = 4 + u * 2;
    g.strokeStyle = 'rgba(0,0,0,.5)';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 2.5 + u * 2;
    g.strokeStyle = blink ? '#ffffff' : urgCol(u);
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
    const rot = t * 2;
    for (let i = 0; i < 4; i++) {
      const a = rot + i * Math.PI / 2;
      g.beginPath(); g.moveTo(x + Math.cos(a) * (r - 7), y + Math.sin(a) * (r - 7)); g.lineTo(x + Math.cos(a) * (r + 9), y + Math.sin(a) * (r + 9)); g.stroke();
    }
    if (u > 0.8) {
      g.font = '900 14px system-ui, sans-serif'; g.textAlign = 'center';
      g.fillStyle = '#ff3030'; g.fillText('¡DISPARA!', x, y - r - 8);
    }
  }
  // flecha en el borde hacia la amenaza; devuelve la componente x (para el brillo lateral)
  arrow(vx, vy, front, u, t, W, H) {
    const g = this.g;
    let dx = vx, dy = -vy;
    if (!front) { dy = Math.max(-0.3, Math.min(0.3, dy)); if (Math.abs(dx) < 0.05) dx = 0.05; }
    const L = Math.hypot(dx, dy) || 1;
    dx /= L; dy /= L;
    const hw = W / 2 - 60, hh = H / 2 - 60;
    const s = Math.min(hw / Math.max(1e-3, Math.abs(dx)), hh / Math.max(1e-3, Math.abs(dy)));
    const x = W / 2 + dx * s, y = H / 2 + dy * s;
    const a = Math.atan2(dy, dx);
    const sz = 16 + u * 24, pulse = 0.65 + 0.35 * Math.sin(t * (6 + u * 18));
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.fillStyle = urgCol(u, pulse);
    g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(sz, 0); g.lineTo(-sz * 0.6, -sz * 0.75); g.lineTo(-sz * 0.25, 0); g.lineTo(-sz * 0.6, sz * 0.75); g.closePath();
    g.stroke(); g.fill();
    g.restore();
    if (u > 0.3) {
      g.font = `900 ${12 + Math.round(u * 6)}px system-ui, sans-serif`;
      g.textAlign = 'center';
      g.fillStyle = urgCol(u, 0.95);
      const lbl = dx < -0.2 ? '⟲ GIRA' : dx > 0.2 ? 'GIRA ⟳' : dy > 0 ? 'BAJA' : 'SUBE';
      g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)';
      g.strokeText(lbl, x - dx * (sz + 18), y - dy * (sz + 18) + 5);
      g.fillText(lbl, x - dx * (sz + 18), y - dy * (sz + 18) + 5);
    }
    return dx;
  }
}
