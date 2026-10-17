// Estilo toon: sombreado en 3 franjas + texturas compartidas + contorno negro por post-proceso
import * as THREE from 'three';

let GRAD = null;
export function toonGrad() {
  if (!GRAD) {
    const d = new Uint8Array([150, 150, 150, 255, 210, 210, 210, 255, 255, 255, 255, 255]);
    GRAD = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
    GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter;
    GRAD.generateMipmaps = false;
    GRAD.needsUpdate = true;
  }
  return GRAD;
}
export function toon(o = {}) {
  return new THREE.MeshToonMaterial(Object.assign({ gradientMap: toonGrad() }, o));
}

// texturas (en la carpeta tex/): repetidas, en sRGB
const LOADER = new THREE.TextureLoader();
const TEX = {};
export function tex(name) {
  if (!TEX[name]) {
    const t = LOADER.load('tex/' + name + '.jpg?v=3');
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    TEX[name] = t;
  }
  return TEX[name];
}

// --- contorno: detecta saltos de profundidad y los pinta en negro ---
export class Outline {
  constructor(renderer) {
    this.renderer = renderer;
    this.enabled = true;
    this.rt = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: true });
    this.rt.texture.colorSpace = THREE.SRGBColorSpace;
    this.rt.depthTexture = new THREE.DepthTexture(2, 2);
    // profundidad en coma flotante: con 16/24 bits los móviles pintaban rayas en paredes y suelo
    this.rt.depthTexture.type = THREE.FloatType;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture },
        res: { value: new THREE.Vector2(2, 2) }, near: { value: 0.1 }, far: { value: 260 },
        ink: { value: new THREE.Color(0x14101a) },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 res; uniform float near; uniform float far; uniform vec3 ink;
        varying vec2 vUv;
        float lin(float d){ float z = d * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
        void main(){
          vec3 c = texture2D(tColor, vUv).rgb;
          vec2 px = 1.0 / res;
          // 1/z es lineal en pantalla sobre una superficie plana: su segunda derivada solo salta en los bordes reales
          float d = lin(texture2D(tDepth, vUv).r);
          float w = 1.0 / d;
          float wl = 1.0 / lin(texture2D(tDepth, vUv + vec2(-px.x, 0.0)).r);
          float wr = 1.0 / lin(texture2D(tDepth, vUv + vec2(px.x, 0.0)).r);
          float wu = 1.0 / lin(texture2D(tDepth, vUv + vec2(0.0, px.y)).r);
          float wd = 1.0 / lin(texture2D(tDepth, vUv + vec2(0.0, -px.y)).r);
          float e = (abs(wl + wr - 2.0 * w) + abs(wu + wd - 2.0 * w)) / w;
          float edge = smoothstep(0.05, 0.12, e) * (1.0 - smoothstep(35.0, 80.0, d));
          gl_FragColor = vec4(mix(c, ink, edge * 0.9), 1.0);
          #include <colorspace_fragment>
        }`,
      depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.quad.frustumCulled = false;
    this.qs = new THREE.Scene();
    this.qs.add(this.quad);
    this.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  setSize(w, h) {
    const pr = this.renderer.getPixelRatio();
    const W = Math.max(2, Math.floor(w * pr)), H = Math.max(2, Math.floor(h * pr));
    this.rt.setSize(W, H);
    this.mat.uniforms.res.value.set(W, H);
  }
  render(scene, camera) {
    const R = this.renderer;
    if (!this.enabled) { R.setRenderTarget(null); R.render(scene, camera); return; }
    this.mat.uniforms.near.value = camera.near;
    this.mat.uniforms.far.value = camera.far;
    R.setRenderTarget(this.rt);
    R.render(scene, camera);
    R.setRenderTarget(null);
    R.render(this.qs, this.qc);
  }
}
