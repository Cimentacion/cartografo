// Control: giroscopio (principal), arrastrar con el dedo si el móvil no tiene giroscopio, y ratón en PC
import * as THREE from 'three';
import { angWrap, clamp } from './util.js';

const ZEE = new THREE.Vector3(0, 0, 1);
const Q0 = new THREE.Quaternion();
const Q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
const EU = new THREE.Euler(), QQ = new THREE.Quaternion(), E2 = new THREE.Euler();
const D2R = Math.PI / 180;

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

    window.addEventListener('deviceorientation', e => this.onOri(e), true);
  }
  async requestGyro() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        await DeviceOrientationEvent.requestPermission();
      }
    } catch (e) { /* sin permiso: se juega arrastrando */ }
  }
  onOri(e) {
    if (e.beta == null || e.gamma == null) return;
    const orient = (screen.orientation && typeof screen.orientation.angle === 'number' ? screen.orientation.angle : (window.orientation || 0)) * D2R;
    EU.set(e.beta * D2R, (e.alpha || 0) * D2R, -e.gamma * D2R, 'YXZ');
    QQ.setFromEuler(EU);
    QQ.multiply(Q1);
    QQ.multiply(Q0.setFromAxisAngle(ZEE, -orient));
    E2.setFromQuaternion(QQ, 'YXZ');
    this.raw = { y: E2.y, p: E2.x };
    this.gyroSeen++;
    if (this.gyroSeen > 3 && !this.gyro && this.isTouch) {
      this.gyro = true;
      if (!this.ref) this.calibrate();
    }
  }
  calibrate() {
    if (this.raw) this.ref = { y: this.raw.y, p: this.raw.p };
    this.tYaw = this.tPitch = 0;
    this.yaw = this.pitch = 0;
  }
  update(dt) {
    if (this.gyro && this.raw && this.ref) {
      this.tYaw = angWrap(this.raw.y - this.ref.y) * this.gain;
      this.tPitch = clamp((this.raw.p - this.ref.p) * this.gain, -1.1, 1.2);
    }
    this.tPitch = clamp(this.tPitch, -1.1, 1.2);
    const k = 1 - Math.exp(-dt * (this.gyro ? 28 : 40));
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
        this.tYaw -= (e.clientX - this.lx) * s; this.tPitch -= (e.clientY - this.ly) * s;
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
