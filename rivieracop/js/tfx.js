// EL TITANIC (lado del cliente): el mar con oleaje, el barco que se acerca y choca contra el iceberg,
// la inclinación mientras se hunde, el barco hundido bajo el agua, el que se parte en dos a lo lejos y la nieve
import * as THREE from '../lib/three.module.js';
import * as TM from './titanic.js';

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// mar oscuro con olas fuertes (desplazamiento en el vértice, espuma en las crestas, brillo de la luna)
function waveMat() {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(THREE.UniformsUtils.clone(THREE.UniformsLib.fog), {
      time: { value: 0 }, calm: { value: new THREE.Vector3(0, 0, 0) }, deep: { value: new THREE.Color(0x061232) }, lit: { value: new THREE.Color(0x1a3a7a) }, under: { value: 0 },
    }),
    fog: true, side: THREE.DoubleSide,
    vertexShader: `
      uniform float time; uniform vec3 calm; varying float vH; varying vec3 vW;
      #include <common>
      #include <fog_pars_vertex>
      #include <logdepthbuf_pars_vertex>
      float wv(vec2 p){
        return 1.1 * sin(dot(p, vec2(0.30, 0.12)) + time * 1.3) + 0.7 * sin(dot(p, vec2(-0.16, 0.41)) + time * 1.7)
             + 0.35 * sin(dot(p, vec2(0.71, -0.53)) + time * 2.6) + 0.2 * sin(dot(p, vec2(-0.9, -1.1)) + time * 3.1);
      }
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        float k = mix(1.0, 0.12 + 0.88 * smoothstep(4.0, 22.0, distance(w.xz, calm.xy)), calm.z);
        float h = wv(w.xz) * k;
        w.y += h; vH = h / max(0.2, k * 2.35); vW = w.xyz;
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <logdepthbuf_vertex>
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform vec3 deep; uniform vec3 lit; uniform float under; varying float vH; varying vec3 vW;
      #include <common>
      #include <fog_pars_fragment>
      #include <logdepthbuf_pars_fragment>
      void main(){
        #include <logdepthbuf_fragment>
        vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
        if (n.y < 0.0) n = -n;
        vec3 L = normalize(vec3(0.4, 0.7, -0.6));
        float d = clamp(dot(n, L), 0.0, 1.0);
        vec3 c = mix(deep, lit, d * 0.9 + vH * 0.25);
        vec3 V = normalize(cameraPosition - vW);
        float sp = pow(clamp(dot(reflect(-L, n), V), 0.0, 1.0), 40.0);
        c += vec3(0.55, 0.65, 0.85) * sp * 0.6;
        c = mix(c, vec3(0.86, 0.92, 1.0), smoothstep(0.62, 0.9, vH) * 0.8);
        if (under > 0.5) c = mix(vec3(0.015, 0.05, 0.07), vec3(0.06, 0.16, 0.21), d);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

// coche/camión/autobús/carro hundido (cajas sencillas)
const SKM = {};
const skm = c => SKM[c] || (SKM[c] = new THREE.MeshLambertMaterial({ color: c }));
function sunkCar(k) {
  const g = new THREE.Group(), bx = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), skm(c)); m.position.set(x, y, z); g.add(m); return m; };
  const col = [0x6a1a14, 0x1a2a4a, 0x2a2a2a, 0x3a4a2a][k];
  if (k === 0 || k === 1) { bx(2, 0.9, 4.4, col, 0, 0.6, 0); bx(1.8, 0.8, 2.2, col, 0, 1.4, -0.2); bx(1.7, 0.6, 0.06, 0x1a2a34, 0, 1.4, 0.92); for (const x of [-1, 1]) for (const z of [-1.4, 1.4]) bx(0.3, 0.8, 0.8, 0x111111, x, 0.3, z); }
  else if (k === 2) { bx(2.4, 2.6, 5, col, 0, 1.6, -0.6); bx(2.4, 1.6, 1.8, 0x8a8a8a, 0, 1.1, 2.6); for (const x of [-1.2, 1.2]) for (const z of [-1.8, 2.4]) bx(0.3, 0.9, 0.9, 0x111111, x, 0.4, z); }
  else { bx(2.2, 1.2, 3.6, 0x6a4a2a, 0, 1.1, 0); for (const x of [-1.2, 1.2]) for (const z of [-1.2, 1.2]) bx(0.15, 1.3, 1.3, 0x4a2a14, x, 0.6, z); bx(0.12, 0.12, 2.4, 0x4a2a14, 0, 0.8, 2.8); }
  return g;
}
export class TitanicFX {
  constructor(scene, fx) {
    this.scene = scene; this.fx = fx;
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 700, 140, 140).rotateX(-Math.PI / 2), waveMat());
    this.sea.frustumCulled = false; this.sea.visible = false; this.sea.renderOrder = -1;
    scene.add(this.sea);
    this.ship = null; this.halves = null;
    this.tilt = 0; this.roll = 0; this.bob = 0; this.on = false; this.under = false; this.T = null;
    this.snowM = null;
  }
  // el barco entero se hace la primera vez que se necesita (es grande)
  mkShip() {
    if (!this.ship) { this.ship = TM.ship({ inset: 0.12, smoke: true }); this.ship.visible = false; this.scene.add(this.ship); this.ship.position.y = -1e4; }
    return this.ship;
  }
  // el medio barco del lado de la primera cubierta (el otro lado lo ponen las cubiertas de la carretera)
  mkPort() {
    if (!this.port) { this.port = TM.ship({ inset: 0.12, smoke: true, side: -1 }); this.port.visible = false; this.scene.add(this.port); }
    return this.port;
  }
  // el medio barco del otro lado (el de la vuelta): mientras se va por la primera cubierta
  mkStar() {
    if (!this.star) { this.star = TM.ship({ inset: 0.12, smoke: true, side: 1 }); this.star.visible = false; this.scene.add(this.star); }
    return this.star;
  }
  // la colina puntiaguda de hielo dentro de la curva del iceberg: una sola pieza que se ve desde lejos (no aparece de golpe)
  mkHill(road, T) {
    if (this.hill || road.len < T.berg + 2) return this.hill;
    const g = new THREE.Group(), Rc = (340 - 25) / 2.5;
    road.toWorld(T.berg, -Rc, 0, g.position); g.position.y = T.S + 1;
    const M = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
    const add = (geo, c, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m; };
    add(new THREE.CylinderGeometry(3, Rc - 13, 92, 16, 3), 0xe8f2fc, 0, 46, 0);
    add(new THREE.CylinderGeometry(0.5, Rc * 0.5, 62, 9), 0xf4f8ff, 10, 70, -8, 0.4);
    add(new THREE.CylinderGeometry(0.5, Rc * 0.38, 44, 7), 0xd8ecfa, -30, 56, 25, 1);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, m = add(new THREE.BoxGeometry(14, 26 + (k % 3) * 8, 10), k % 2 ? 0xb8dcf4 : 0xd0e8fa, Math.cos(a) * (Rc - 24), 14, Math.sin(a) * (Rc - 24), -a); m.rotation.z = 0.25; }
    this.scene.add(g); this.hill = g;
    return g;
  }
  mkHalves() {
    if (!this.halves) { this.halves = new THREE.Group(); const a = TM.ship({ half: 1 }), b = TM.ship({ half: 2 }); this.halves.add(a, b); this.halves.userData.a = a; this.halves.userData.b = b; this.halves.visible = false; this.scene.add(this.halves); }
    return this.halves;
  }
  // colocar el barco con su eje en (d, lat) de la carretera, a la altura del agua + gy
  pose(o, road, d, lat, h, yawOff = 0) {
    road.toWorld(d, lat, h, o.position);
    o.rotation.set(0, -road.yawAt(d) + Math.PI + yawOff, 0, 'YXZ'); // el modelo tiene la proa en -Z: girado, la proa mira hacia atrás en la carretera
  }
  update(G, dt, camera, B, sea0, chunks, onCrash) {
    const road = G.road, c = G.carD, T = road.titanicAt(c);
    this.T = T;
    const deco = B.deco, on = !!T && T.S != null && (c < T.out + 150);
    this.on = on;
    if (!on) {
      this.sea.visible = false; sea0.visible = true; this.tilt = this.roll = this.bob = 0; this.under = false;
      if (this.ship) this.ship.visible = false; if (this.halves) this.halves.visible = false;
      return;
    }
    const S = T.S, t = G.t;
    // nivel del agua: sube mientras se hunde el barco (hasta casi la cubierta) y vuelve a su sitio bajo el agua
    const lvl = S + (c < T.under ? 6 * ss(T.deck2, T.down, c) : 0);
    this.mkHill(road, T);
    if (this.hill) this.hill.visible = c < T.deck1 + 120;
    this.lvl = lvl;
    sea0.visible = false;
    const M = this.sea, U = M.material.uniforms;
    M.visible = true; M.position.set(Math.round(camera.position.x / 5) * 5, lvl, Math.round(camera.position.z / 5) * 5);
    U.time.value = t;
    const car = road.toWorld(c, 3, 0, new THREE.Vector3());
    const floating = c > T.rise + 20 && c < T.beach;
    U.calm.value.set(car.x, car.z, floating || c > T.down ? 1 : 0);
    const wasUnder = this.under;
    this.under = camera.position.y < lvl - 0.3;
    // chapuzón al caer al agua desde el barco partido
    if (this.under && !wasUnder && c > T.exit && c < T.exit + 90) {
      if (!this.splM) this.splM = new THREE.MeshBasicMaterial({ color: 0xe8f6ff });
      const p = camera.position.clone(); p.y = lvl;
      for (let k = 0; k < 40; k++) this.fx.part(p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6)), new THREE.Vector3((Math.random() - 0.5) * 6, 5 + Math.random() * 7, (Math.random() - 0.5) * 6), 1.4, 0.15 + Math.random() * 0.25, this.splM, 14, 0);
      G.shake = Math.max(G.shake || 0, 0.8);
    }
    U.under.value = this.under ? 1 : 0;
    U.fogColor.value.copy(this.scene.fog.color); U.fogNear.value = this.scene.fog.near; U.fogFar.value = this.scene.fog.far;
    // el barco: llega desde lejos y se clava en el iceberg; luego queda quieto (y se le ven las cubiertas de verdad)
    const crash = T.jump - 25, crashed = c >= crash;
    if (crashed && !this.crashed) { this.crashed = 1; if (onCrash) onCrash(); }
    if (!crashed) this.crashed = 0;
    for (const g of chunks.values()) if (g.userData.hasShip) for (const m of g.children) if (m.userData.ship) m.visible = crashed;
    const sh = this.mkShip(), po = this.mkPort(), st = this.mkStar();
    po.visible = false; st.visible = false;
    if (c > T.jump - 320 && !crashed) {
      // se acerca de lado hasta clavarse en el iceberg
      sh.visible = true;
      const X = Math.min(700, Math.max(0, (crash - c) * 2.4));
      this.pose(sh, road, T.deck1, -10.2, -0.1);
      const fw = new THREE.Vector3(0, 0, 1).applyEuler(sh.rotation);
      sh.position.addScaledVector(fw, X);
    } else if (crashed && c < T.exit + 40) {
      // ya chocado: el medio barco del lado por donde NO se va (el otro medio son las cubiertas de la carretera)
      sh.visible = false;
      // (en el salón no: el salón ya llega hasta el otro costado)
      const q = c < T.deck2 + 8 ? st : po; q.visible = !(c > T.down + 12 && c < T.exit + 10);
      this.pose(q, road, T.deck1, -10.2, -0.1);
    } else if (c >= T.exit + 40 && c < T.rise + 20) {
      // bajo el agua: el Titanic hundido al lado, ladeado, con la proa clavada hacia el fondo
      sh.visible = true;
      this.pose(sh, road, T.under + 170, -48, 6, 0.25);
      sh.rotation.z = 0.35; sh.rotation.x = 0.12;
    } else sh.visible = false;
    // a lo lejos, en el mar helado: se parte en dos y se hunde (la popa se levanta y se va al fondo)
    if (c > T.float - 40 && c < T.boss - 40) {
      const H = this.mkHalves(); H.visible = true;
      this.pose(H, road, T.float + 210, 150, -3, -1.2);
      const k = ss(T.float - 20, T.boss - 60, c), a = H.userData.a, b = H.userData.b;
      a.position.set(0, -6 - 20 * k, 0); a.rotation.x = -0.12 - 0.25 * k;
      b.position.set(0, -4 - 30 * Math.max(0, k - 0.5) * 2, 0); b.rotation.x = 0.1 + 0.9 * Math.min(1, k * 1.6);
      b.position.z = 150 * (1 - Math.cos(b.rotation.x)) * 0.3;
    } else if (this.halves) this.halves.visible = false;
    // inclinación: todo se va de lado mientras se hunde (y se endereza al caer al agua)
    const tl = c < T.deck2 ? 0 : c < T.exit ? 0.13 * ss(T.deck2, T.down + 20, c) : 0.13 * (1 - ss(T.exit, T.exit + 60, c));
    this.tilt += (tl - this.tilt) * Math.min(1, dt * 2);
    // flotando en el mar helado: el coche cabecea con las olas
    this.bob = floating ? Math.sin(t * 1.6) * 0.18 : 0;
    this.roll = floating ? Math.sin(t * 1.1) * 0.05 : 0;
    // nieve que cae (fuera del agua y del salón)
    if (!this.under && deco !== 'tsub' && road.kindAt(c + 2) !== 3) {
      if (!this.snowM) this.snowM = new THREE.MeshBasicMaterial({ color: 0xf4f8ff });
      for (let k = Math.random() < dt * 15 ? 2 : 0; k > 0; k--) {
        const p = new THREE.Vector3((Math.random() - 0.5) * 40, 8 + Math.random() * 6, -5 - Math.random() * 30).applyQuaternion(camera.quaternion).add(camera.position);
        this.fx.part(p, new THREE.Vector3((Math.random() - 0.5) * 1.5, -2.2, (Math.random() - 0.5) * 1.5), 3, 0.06 + Math.random() * 0.05, this.snowM, 0, 0);
      }
    }
    // burbujas bajo el agua (muchas, de varios tamaños)
    if (!this.bubM) this.bubM = new THREE.MeshBasicMaterial({ color: 0xc8f0ff, transparent: true, opacity: 0.7 });
    if (this.under) for (let k = Math.floor(dt * 28 + Math.random()); k > 0; k--) {
      const p = new THREE.Vector3((Math.random() - 0.5) * 24, -4 + Math.random() * 3, -4 - Math.random() * 24).applyQuaternion(camera.quaternion).add(camera.position);
      this.fx.part(p, new THREE.Vector3((Math.random() - 0.5) * 0.4, 2 + Math.random() * 1.5, 0), 3.5, 0.05 + Math.random() * 0.12, this.bubM, 0, 0);
    }
    this.sinkers(road, T, c, dt, camera);
  }
  // coches y camiones que se hunden despacio desde la superficie, girando y soltando muchas burbujas
  sinkers(road, T, c, dt, camera) {
    const L = this.sk || (this.sk = []), act = this.under && c > T.exit + 30 && c < T.rise - 20;
    if (act && L.length < 3 && Math.random() < dt * 0.35) {
      const g = sunkCar(Math.floor(Math.random() * 4)), d = c + 45 + Math.random() * 40, lat = (Math.random() < 0.5 ? -1 : 1) * (7 + Math.random() * 22);
      road.toWorld(d, lat, 0, g.position); g.position.y = this.lvl - 1;
      g.rotation.set(Math.random() * 0.6, Math.random() * 6, Math.random() * 0.6);
      g.userData.v = 1.3 + Math.random() * 1.2; g.userData.sp = new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.5);
      g.userData.floor = road.y[Math.min(road.len - 1, Math.floor(d))] - 0.6; this.scene.add(g); L.push(g);
    }
    for (let i = L.length - 1; i >= 0; i--) {
      const g = L[i], u = g.userData, far = g.position.distanceToSquared(camera.position) > 160 * 160;
      if (!act || far) { this.scene.remove(g); g.traverse(o => o.geometry && o.geometry.dispose()); L.splice(i, 1); continue; }
      if (g.position.y > u.floor) { g.position.y = Math.max(u.floor, g.position.y - u.v * dt); g.rotation.x += u.sp.x * dt; g.rotation.y += u.sp.y * dt; g.rotation.z += u.sp.z * dt; }
      const nb = g.position.y > u.floor ? 7 : 1.5;
      for (let k = Math.floor(dt * nb * 3 + Math.random()); k > 0; k--) {
        const p = g.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 0.8 + Math.random(), (Math.random() - 0.5) * 3));
        this.fx.part(p, new THREE.Vector3((Math.random() - 0.5) * 0.6, 2.2 + Math.random() * 1.8, (Math.random() - 0.5) * 0.6), 3.2, 0.08 + Math.random() * 0.16, this.bubM, 0, 0);
      }
    }
  }
}
