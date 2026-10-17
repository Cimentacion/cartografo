// Control: giroscopio (principal), arrastrar con el dedo si el móvil no tiene giroscopio, y ratón en PC
import * as THREE from 'three';
import { angWrap, clamp, VP } from './util.js';

const ZEE = new THREE.Vector3(0, 0, 1);
const Q0 = new THREE.Quaternion();
const Q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
const EU = new THREE.Euler(), QQ = new THREE.Quaternion(), E2 = new THREE.Euler();
const D2R = Math.PI / 180;
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

export class Look {
  constructor() {
    this.yaw = 0; this.pitch = 0;
    this.tYaw = 0; this.tPitch = 0;
    this.gain = 1.5;
    this.gyro = false; this.gyroSeen = 0;
    this.raw = null; this.ref = null;
    this.mode = 'touch';
    this.fire = false; this.fireTouches = new Set();
    this.dragId = null; this.lx = 0; this.ly = 0;
    this.locked = false;
    this.onReload = null; this.onCal = null;
    this.enabled = false;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

    // Fuente principal: velocidad de giro del giroscopio (devicemotion.rotationRate), integrada.
    // No depende de brújula ni de "alpha", así que funciona en casi todos los Android.
    // Respaldo: deviceorientation / deviceorientationabsolute si no hay rotationRate.
    this.src = 'ninguno'; this.rateSeen = 0; this.lastRateT = 0;
    this.grav = { x: 0, y: 0, z: 0, n: 0 }; this.axes = ''; this.map = 0; this.mapOk = false; this.up2 = { x: 1, y: 0, ok: false };
    this.absP = 0; this.refAbsP = 0; this.invX = false; this.invY = false;
    this.gYaw = 0; this.gPitch = 0;
    this.force = null; // 'dedo' = el jugador ha elegido apuntar con el dedo
    this.diag = { motion: 0, motionNull: 0, ori: 0, oriNull: 0, abs: 0, sensor: 0, sensorErr: '', perm: '', last: '' };
    window.addEventListener('devicemotion', e => this.onMotion(e), true);
    window.addEventListener('deviceorientation', e => this.onOri(e, 'rel'), true);
    window.addEventListener('deviceorientationabsolute', e => this.onOri(e, 'abs'), true);
  }
  async requestGyro() {
    this.startSensor();
    try {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') await DeviceMotionEvent.requestPermission();
    } catch (e) { }
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') await DeviceOrientationEvent.requestPermission();
    } catch (e) { }
  }
  screenAngle() {
    const a = screen.orientation && typeof screen.orientation.angle === 'number' ? screen.orientation.angle : (window.orientation || 0);
    return ((a % 360) + 360) % 360;
  }
  // API de sensores genérica de Chrome (Gyroscope): otra vía por si devicemotion no llega
  startSensor() {
    if (this.sensor || typeof window.Gyroscope !== 'function') { if (!this.sensor) this.diag.sensorErr = 'no existe'; return; }
    try {
      const g = new window.Gyroscope({ frequency: 60 });
      g.addEventListener('reading', () => {
        this.diag.sensor++;
        // el sensor nativo es el más fiable: si llega, manda él
        if (this.src !== 'sensor' && this.diag.sensor > 5) { this.src = 'ninguno'; this.rateSeen = 0; }
        this.mapOk = true;
        this.integrate(g.x, g.y, g.z, 'sensor');
      });
      g.addEventListener('error', ev => { this.diag.sensorErr = (ev.error && (ev.error.name + ' ' + ev.error.message)) || 'error'; });
      g.start();
      this.sensor = g;
    } catch (e) { this.diag.sensorErr = e.name + ' ' + e.message; }
    try {
      if (navigator.permissions) navigator.permissions.query({ name: 'gyroscope' }).then(r => { this.diag.perm = r.state; }).catch(() => { });
    } catch (e) { }
  }
  onMotion(e) {
    const r = e.rotationRate;
    this.diag.motion++;
    if (!r || r.alpha == null || r.beta == null || r.gamma == null) { this.diag.motionNull++; return; }
    this.diag.last = `${r.alpha.toFixed(1)} ${r.beta.toFixed(1)} ${r.gamma.toFixed(1)}`;
    // gravedad: dice qué eje del móvil apunta hacia arriba, sea cual sea la postura
    const a = e.accelerationIncludingGravity;
    if (a && a.x != null && a.y != null && a.z != null && (a.x || a.y || a.z)) {
      this.learnMap(r, a.x * (IOS ? -1 : 1), a.y * (IOS ? -1 : 1), a.z * (IOS ? -1 : 1));
      const sg = IOS ? -1 : 1, G = this.grav, k = G.n ? 0.06 : 1;
      G.x += (a.x * sg - G.x) * k; G.y += (a.y * sg - G.y) * k; G.z += (a.z * sg - G.z) * k; G.n++;
      const gl = Math.hypot(G.x, G.y, G.z);
      if (gl > 4) this.absP = Math.asin(clamp(-G.z / gl, -1, 1));
    }
    if (r.alpha === 0 && r.beta === 0 && r.gamma === 0 && this.rateSeen === 0) return;
    if (this.src === 'sensor' || this.diag.sensor > 5) return;
    const w = this.omega(r, this.map);
    this.integrate(w[0], w[1], w[2], 'giroscopio');
  }
  // Cada navegador/móvil nombra los ejes de rotationRate a su manera. Probamos 8 combinaciones
  // y nos quedamos con la que mejor explica cómo cambia la gravedad al girar el móvil.
  omega(r, m) {
    const u = (m & 1) ? 1 : D2R, sg = (m & 2) ? -1 : 1;
    return (m & 4) ? [r.alpha * u * sg, r.beta * u * sg, r.gamma * u * sg] : [r.beta * u * sg, r.gamma * u * sg, r.alpha * u * sg];
  }
  learnMap(r, ax, ay, az) {
    const M = this.mm || (this.mm = { gx: ax, gy: ay, gz: az, t: performance.now(), err: new Float64Array(8), n: 0 });
    const now = performance.now(), dt = Math.min(0.1, (now - M.t) / 1000);
    M.t = now;
    const px = M.gx, py = M.gy, pz = M.gz;
    M.gx += (ax - M.gx) * 0.5; M.gy += (ay - M.gy) * 0.5; M.gz += (az - M.gz) * 0.5;
    const dx = M.gx - px, dy = M.gy - py, dz = M.gz - pz;
    const big = Math.max(Math.abs(r.alpha), Math.abs(r.beta), Math.abs(r.gamma));
    if (dt <= 0 || big < 0.5) return;
    for (let m = 0; m < 8; m++) {
      const [wx, wy, wz] = this.omega(r, m);
      // dg/dt = -w × g
      const ex = dx + (wy * pz - wz * py) * dt, ey = dy + (wz * px - wx * pz) * dt, ez = dz + (wx * py - wy * px) * dt;
      M.err[m] = M.err[m] * 0.997 + ex * ex + ey * ey + ez * ez;
    }
    M.n++;
    if (M.n > 25) {
      let best = 0;
      for (let m = 1; m < 8; m++) if (M.err[m] < M.err[best]) best = m;
      if (!this.mapOk && best !== this.map && M.err[best] < M.err[this.map] * 0.7) this.map = best;
      // cuando está clarísimo, se queda fijo para toda la partida
      if (!this.mapOk && M.n > 80) {
        let second = Infinity;
        for (let m = 0; m < 8; m++) if (m !== best && M.err[m] < second) second = M.err[m];
        if (M.err[best] < second * 0.35) { this.map = best; this.mapOk = true; }
      }
    }
    this.diag.map = ['spec°', 'spec rad', 'spec° -', 'spec rad -', 'xyz°', 'xyz rad', 'xyz° -', 'xyz rad -'][this.map] + (this.mapOk ? ' ✓ fijo' : ' (' + M.n + ')');
  }
  // bx = giro alrededor del eje X del móvil, gy = alrededor del eje Y (rad/s)
  integrate(bx, gy, az, name) {
    const now = performance.now();
    let dt = 0.016;
    if (this.lastRateT) dt = Math.min(0.1, (now - this.lastRateT) / 1000);
    this.lastRateT = now;
    let yawR, pitR;
    // la gravedad se gira con el propio giroscopio entre lecturas del acelerómetro (sin retraso)
    if (this.grav.n > 3 && this.mapOk) {
      const g0 = this.grav, wx = bx, wy = gy, wz = az;
      const cx = wy * g0.z - wz * g0.y, cy = wz * g0.x - wx * g0.z, cz = wx * g0.y - wy * g0.x;
      g0.x -= cx * dt; g0.y -= cy * dt; g0.z -= cz * dt;
    }
    const G = this.grav, gl = Math.hypot(G.x, G.y, G.z), gp = Math.hypot(G.x, G.y);
    this.axes = 'gravedad';
    if (G.n > 3 && gl > 4 && (gp > 4.5 || this.up2.ok)) {
      if (gp > 4.5) this.up2.ok = true;
      // Ejes de la propia pantalla: "arriba de la pantalla" (según la gravedad) y "derecha de la pantalla".
      // Izquierda/derecha = giro alrededor del arriba de la pantalla; arriba/abajo = alrededor de la derecha.
      // Así inclinar el móvil hacia abajo o girar la muñeca nunca se cuela como izquierda/derecha.
      // con el móvil muy inclinado (mirando muy arriba/abajo) la gravedad ya no dice bien dónde está
      // el "arriba de la pantalla": usamos el último que era fiable
      if (gp > 4.5) { this.up2.x = G.x / gp; this.up2.y = G.y / gp; }
      const ux = this.up2.x, uy = this.up2.y;
      yawR = bx * ux + gy * uy;
      pitR = bx * uy - gy * ux;
    } else switch (this.axes = 'pantalla', this.screenAngle()) {
      case 90: yawR = bx; pitR = -gy; break;
      case 270: yawR = -bx; pitR = gy; break;
      case 180: yawR = -gy; pitR = -bx; break;
      default: yawR = gy; pitR = bx;
    }
    this.gYaw += yawR * dt;
    this.gPitch += pitR * dt;
    // el cabeceo se corrige poco a poco con la gravedad: así no se queda mirando arriba ni abajo
    if (this.axes === 'gravedad') this.gPitch += ((this.absP - this.refAbsP) - this.gPitch) * 0.2;
    this.rateSeen++;
    if (this.rateSeen > 5 && this.src === 'ninguno') {
      this.src = name;
      this.gyro = this.force !== 'dedo';
      this.calibrate();
    }
  }
  onOri(e, kind) {
    this.diag[kind === 'abs' ? 'abs' : 'ori']++;
    if (e.beta == null || e.gamma == null) { this.diag.oriNull++; return; }
    const orient = this.screenAngle() * D2R;
    EU.set(e.beta * D2R, (e.alpha || 0) * D2R, -e.gamma * D2R, 'YXZ');
    QQ.setFromEuler(EU);
    QQ.multiply(Q1);
    QQ.multiply(Q0.setFromAxisAngle(ZEE, -orient));
    E2.setFromQuaternion(QQ, 'YXZ');
    this.raw = { y: E2.y, p: E2.x };
    this.gyroSeen++;
    // solo si no llega la velocidad de giro
    if (this.gyroSeen > 10 && this.rateSeen === 0 && this.src === 'ninguno') {
      this.src = kind === 'abs' ? 'brújula' : 'orientación';
      this.gyro = this.force !== 'dedo';
      this.calibrate();
    }
  }
  setForce(f) { this.force = f; this.gyro = f !== 'dedo' && this.src !== 'ninguno'; this.calibrate(); }
  calibrate() {
    if (this.raw) this.ref = { y: this.raw.y, p: this.raw.p };
    this.gYaw = 0; this.gPitch = 0; this.refAbsP = this.absP;
    this.tYaw = this.tPitch = 0;
    this.yaw = this.pitch = 0;
  }
  update(dt) {
    if (this.gyro) {
      if (this.src === 'giroscopio' || this.src === 'sensor') {
        this.gPitch = clamp(this.gPitch, -1.1 / this.gain, 1.2 / this.gain);
        this.tYaw = angWrap(this.gYaw * this.gain) * (this.invX ? -1 : 1);
        this.tPitch = this.gPitch * this.gain * (this.invY ? -1 : 1);
      } else if (this.raw && this.ref) {
        this.tYaw = angWrap(this.raw.y - this.ref.y) * this.gain;
        this.tPitch = clamp((this.raw.p - this.ref.p) * this.gain, -1.1, 1.2);
      }
    }
    this.tPitch = clamp(this.tPitch, -1.1, 1.2);
    const k = 1 - Math.exp(-dt * (this.gyro ? 30 : 40));
    this.yaw += angWrap(this.tYaw - this.yaw) * k;
    this.pitch += (this.tPitch - this.pitch) * k;
  }
  // los botones de la interfaz no disparan
  attach(el) {
    const isUI = t => t.closest && t.closest('button, .ui');
    el.addEventListener('pointerdown', e => {
      if (!this.enabled || isUI(e.target)) return;
      if (e.pointerType === 'mouse') {
        if (!this.locked && el.requestPointerLock) { try { el.requestPointerLock(); } catch (x) { } }
        if (e.button === 0) this.fire = true;
        return;
      }
      if (this.gyro) { this.fireTouches.add(e.pointerId); this.fire = true; }
      else if (this.dragId == null) { this.dragId = e.pointerId; this.lx = e.clientX; this.ly = e.clientY; }
    });
    el.addEventListener('pointermove', e => {
      if (!this.enabled) return;
      if (e.pointerType === 'mouse') {
        if (this.locked) { this.tYaw -= e.movementX * 0.0026; this.tPitch -= e.movementY * 0.0026; }
        return;
      }
      if (e.pointerId === this.dragId) {
        const s = 0.0055 * (this.gain / 1.5);
        let dx = e.clientX - this.lx, dy = e.clientY - this.ly;
        if (VP.rot === 90) [dx, dy] = [dy, -dx]; else if (VP.rot === -90) [dx, dy] = [-dy, dx];
        this.tYaw -= dx * s; this.tPitch -= dy * s;
        this.lx = e.clientX; this.ly = e.clientY;
      }
    });
    const up = e => {
      if (e.pointerType === 'mouse') { if (e.button === 0) this.fire = false; return; }
      this.fireTouches.delete(e.pointerId);
      if (this.gyro) this.fire = this.fireTouches.size > 0;
      if (e.pointerId === this.dragId) this.dragId = null;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === el; });
    window.addEventListener('keydown', e => {
      if (!this.enabled) return;
      if (e.code === 'KeyR') this.onReload && this.onReload();
      if (e.code === 'KeyC') { this.tYaw = this.tPitch = 0; this.onCal && this.onCal(); }
      if (e.code === 'Space') this.fire = true;
    });
    window.addEventListener('keyup', e => { if (e.code === 'Space') this.fire = false; });
  }
}
