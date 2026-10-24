// VISOR 3D del editor de mapas: pinta la carretera con el mismo decorado del juego (scenery.js), los objetos colocados,
// marcas de los enemigos y los carteles. Se mueve con el dedo: arrastrar = girar, pellizcar = acercar,
// dos dedos arriba/abajo = avanzar por la carretera. Un toque = elegir ese punto (distancia, lado y altura).
import * as THREE from '../lib/three.module.js';
import { makeMats, buildChunk, CH } from './scenery.js';
import { BIOMES, BIOME_KEYS } from './defs.js';
import { toon } from './toon.js';

const V = new THREE.Vector3(), V2 = new THREE.Vector3();
function label(text, col = '#ffe14a', bg = 'rgba(0,0,0,.72)') {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = 'bold 30px sans-serif';
  const w = Math.min(512, Math.ceil(g.measureText(text).width) + 24);
  c.width = w; c.height = 46;
  g.font = 'bold 30px sans-serif'; g.fillStyle = bg; g.fillRect(0, 0, w, 46); g.strokeStyle = col; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, 43);
  g.fillStyle = col; g.textBaseline = 'middle'; g.fillText(text, 12, 24);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(w / 46 * 1.3, 1.3, 1); s.renderOrder = 10;
  return s;
}

export class View3D {
  constructor(box) {
    this.box = box;
    this.r = new THREE.WebGLRenderer({ antialias: true });
    this.r.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    box.appendChild(this.r.domElement);
    this.r.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block';
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b8e8);
    this.scene.fog = new THREE.Fog(0x87b8e8, 140, 520);
    this.cam = new THREE.PerspectiveCamera(60, 1, 0.3, 2000);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8a8070, 1.1); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.6); this.sun.position.set(80, 140, 60); this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), toon({ color: 0x1d7ec8 }));
    this.scene.add(this.sea);
    this.M = makeMats();
    this.chunks = new Map();
    this.marks = new THREE.Group(); this.scene.add(this.marks);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.18, 6, 24).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe14a, depthTest: false }));
    this.ring.renderOrder = 9; this.scene.add(this.ring);
    this.road = null; this.td = 0; this.yaw = 0.6; this.pitch = 0.45; this.dist = 45; this.fp = false;
    this.on = false; this.onPick = null; this.range = [0, 0];
    this._input();
    new ResizeObserver(() => this.resize()).observe(box);
    const loop = () => { requestAnimationFrame(loop); if (this.on) this.frame(); };
    loop();
  }
  resize() { const w = this.box.clientWidth, h = this.box.clientHeight; if (!w || !h) return; this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
  show(on) { this.on = on; this.box.hidden = !on; if (on) this.resize(); }
  // carretera nueva (cada cambio en el editor): se tira el decorado y se vuelve a hacer alrededor de donde se mira
  setRoad(R, marks, range) {
    for (const g of this.chunks.values()) this._drop(g);
    this.chunks.clear();
    this.road = R; this.range = range || [0, R.len];
    this.td = Math.max(0, Math.min(R.len - 1, this.td || range[0] + 30));
    this.setMarks(marks || []);
  }
  _drop(g) { this.scene.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  setMarks(L) {
    for (const o of [...this.marks.children]) { this.marks.remove(o); o.traverse(q => { if (q.geometry) q.geometry.dispose(); if (q.material && q.material.map) q.material.map.dispose(); }); }
    const R = this.road; if (!R) return;
    const body = new THREE.MeshLambertMaterial({ color: 0xff3a3a }), skin = new THREE.MeshLambertMaterial({ color: 0xffc89a }), yel = new THREE.MeshLambertMaterial({ color: 0xffb020 });
    for (const m of L) {
      const g = new THREE.Group();
      R.toWorld(m.d, m.lat || 0, (m.h || 0) + 0.18, g.position);
      g.rotation.y = -R.yawAt(m.d) + Math.PI;
      if (m.t === 'enemy') {
        const n = Math.min(4, m.n || 1);
        for (let i = 0; i < n; i++) {
          const p = new THREE.Group(); p.position.set((i % 2) * 1.2, 0, -i * 1.3);
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.4, 8), m.c ? new THREE.MeshLambertMaterial({ color: m.c }) : body); b.position.y = 0.9; p.add(b);
          const h = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), skin); h.position.y = 1.85; p.add(h);
          p.scale.setScalar(1.3); g.add(p);
        }
        if (m.cv) { const c = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.2), new THREE.MeshLambertMaterial({ color: 0x8a6a44 })); c.position.set(0, 0.55, 1.4); g.add(c); }
      } else if (m.t === 'event') {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 6), yel); c.rotation.x = Math.PI; c.position.y = 4.5; g.add(c);
      }
      if (m.l) { const s = label(m.l, m.col || '#ffe14a'); s.position.y = m.t === 'sign' ? 7.5 : m.t === 'event' ? 6.6 : 3.6; g.add(s); }
      if (m.t === 'sign') { const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 6, 0.25), new THREE.MeshLambertMaterial({ color: 0x8a8f96 })); p.position.y = 3; g.add(p); const b = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2, 0.15), new THREE.MeshLambertMaterial({ color: 0x0b6b3a })); b.position.y = 6; g.add(b); }
      if (m.t === 'flag') { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 0.2), new THREE.MeshLambertMaterial({ color: 0xffffff })); p.position.y = 2.5; g.add(p); const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 2), new THREE.MeshLambertMaterial({ color: m.c || 0x111111 })); f.position.set(0, 4.4, 1); g.add(f); }
      this.marks.add(g);
    }
  }
  // mirar a un punto de la carretera
  look(d) { if (!this.road) return; this.td = Math.max(0, Math.min(this.road.len - 1, d)); }
  frame() {
    const R = this.road; if (!R) { this.r.render(this.scene, this.cam); return; }
    // decorado: lo que falte alrededor (dos trozos por fotograma, para no dar tirones)
    const c0 = Math.floor((this.td - 220) / CH), c1 = Math.floor((this.td + 320) / CH);
    let built = 0;
    const want = []; for (let c = Math.max(0, c0); c <= c1; c++) if (!this.chunks.has(c) && (c + 1) * CH + 1 <= R.len) want.push(c);
    want.sort((a, b) => Math.abs(a * CH - this.td) - Math.abs(b * CH - this.td));
    for (const c of want) { if (built >= 2) break; let g = null; try { g = buildChunk(R, c, this.M); } catch (e) { console.warn('chunk', c, e); } this.chunks.set(c, g || new THREE.Group()); if (g) this.scene.add(g); built++; }
    for (const [c, g] of this.chunks) if (c < c0 - 3 || c > c1 + 3) { this._drop(g); this.chunks.delete(c); }
    // luz y cielo de la zona que se mira
    const B = BIOMES[BIOME_KEYS[R.bioAt(this.td)]] || BIOMES.monaco;
    this.scene.background.setHex(B.sky); this.scene.fog.color.setHex(B.sky);
    this.hemi.color.setHex(B.hemi[0]); this.hemi.groundColor.setHex(B.hemi[1]); this.hemi.intensity = B.hemi[2] * 1.1;
    this.sun.color.setHex(B.sun[0]); this.sun.intensity = B.sun[1] * 1.3;
    this.sea.material.color.setHex(B.sea);
    // cámara
    const o = R.at(this.td, {});
    R.toWorld(this.td, 0, 1.2, V);
    this.ring.position.copy(V); this.ring.position.y -= 1.0; this.ring.visible = !this.fp;
    if (this.fp) {
      R.toWorld(this.td, 3, 2.3, this.cam.position);
      const yw = -o.yaw + this.yaw * 0.5 - 0.3;
      R.toWorld(this.td + 20, 3, 2.0, V2);
      this.cam.lookAt(V2); this.cam.rotateY(this.yaw - 0.6); this.cam.rotateX(-(this.pitch - 0.45));
    } else {
      const yw = -o.yaw + this.yaw;
      this.cam.position.set(V.x + Math.sin(yw) * Math.cos(this.pitch) * this.dist, V.y + Math.sin(this.pitch) * this.dist, V.z + Math.cos(yw) * Math.cos(this.pitch) * this.dist);
      this.cam.lookAt(V);
    }
    this.sea.position.set(this.cam.position.x, R.seaAt(this.td), this.cam.position.z);
    this.sun.target.position.copy(V); this.sun.position.copy(V).add(V2.set(60, 120, 40));
    this.r.render(this.scene, this.cam);
  }
  _input() {
    const el = this.r.domElement, P = new Map();
    let start = null, moved = 0, pinch = null;
    el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); P.set(e.pointerId, [e.clientX, e.clientY]); if (P.size === 1) { start = [e.clientX, e.clientY, performance.now()]; moved = 0; } pinch = null; });
    el.addEventListener('pointermove', e => {
      if (!P.has(e.pointerId)) return;
      const [px, py] = P.get(e.pointerId), dx = e.clientX - px, dy = e.clientY - py;
      P.set(e.pointerId, [e.clientX, e.clientY]);
      moved += Math.abs(dx) + Math.abs(dy);
      if (P.size === 1) { this.yaw -= dx * 0.008; this.pitch = Math.max(this.fp ? -0.4 : 0.08, Math.min(this.fp ? 1.2 : 1.45, this.pitch + dy * 0.006)); }
      else if (P.size === 2) {
        const [a, b] = [...P.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), my = (a[1] + b[1]) / 2;
        if (pinch) { this.dist = Math.max(8, Math.min(260, this.dist * pinch.d / Math.max(1, d))); this.look(this.td + (pinch.y - my) * 0.25 * Math.max(1, this.dist / 40)); }
        pinch = { d, y: my };
      }
    });
    const up = e => {
      if (!P.has(e.pointerId)) return;
      P.delete(e.pointerId);
      if (!P.size && start && moved < 10 && performance.now() - start[2] < 450) this._pick(e.clientX, e.clientY);
      if (!P.size) start = null;
      pinch = null;
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', e => { e.preventDefault(); this.dist = Math.max(8, Math.min(260, this.dist * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });
  }
  // toque: qué punto de la carretera (y a qué lado y altura) se ha tocado
  _pick(cx, cy) {
    const R = this.road; if (!R || !this.onPick) return;
    const rc = this.r.domElement.getBoundingClientRect();
    const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((cx - rc.left) / rc.width * 2 - 1, -((cy - rc.top) / rc.height) * 2 + 1), this.cam);
    const objs = []; for (const g of this.chunks.values()) objs.push(g);
    const hit = ray.intersectObjects(objs, true)[0];
    let p = hit ? hit.point.clone() : null;
    if (!p) { R.toWorld(this.td, 0, 0, V); const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), -V.y); p = new THREE.Vector3(); if (!ray.ray.intersectPlane(pl, p)) return; }
    // el punto de la carretera más cercano (en el camino que se edita)
    let best = -1, bd = 1e18;
    const [a, b] = this.range;
    for (let i = Math.max(0, Math.floor(a)); i <= Math.min(R.len, Math.ceil(b)); i++) { const dx = R.x[i] - p.x, dz = R.z[i] - p.z, q = dx * dx + dz * dz; if (q < bd) { bd = q; best = i; } }
    if (best < 0) return;
    const yw = R.yaw[best], lat = (p.x - R.x[best]) * Math.cos(yw) + (p.z - R.z[best]) * Math.sin(yw);
    this.onPick({ d: best, lat: Math.round(lat * 2) / 2, h: Math.max(0, Math.round((p.y - R.y[best] - 0.18) * 2) / 2) });
  }
}
