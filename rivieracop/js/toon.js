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

// --- post-proceso: contorno negro por saltos de profundidad + contorno ROJO en los enemigos visibles
// + el fondo lejano menos saturado (los enemigos, carteles y objetos se quedan con todo su color) ---
// Capas: 1 = enemigo (contorno rojo y más color), 2 = importante (cartel, botiquín, arma: sin desaturar)
export const LAYER_ENEMY = 1, LAYER_KEEP = 2;
export class Outline {
  constructor(renderer) {
    this.renderer = renderer;
    this.enabled = true;   // contorno negro (se puede quitar en el menú)
    this.rt = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: true });
    this.rt.texture.colorSpace = THREE.SRGBColorSpace;
    this.rt.depthTexture = new THREE.DepthTexture(2, 2);
    // profundidad en coma flotante: con 16/24 bits los móviles pintaban rayas en paredes y suelo
    this.rt.depthTexture.type = THREE.FloatType;
    // máscara de enemigos: comparte la profundidad de la escena, así solo marca lo que se ve (nada a través de paredes)
    this.mrt = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: true, depthTexture: this.rt.depthTexture });
    const mm = c => new THREE.MeshBasicMaterial({ color: c, fog: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
    this.maskE = mm(0xff0000); this.maskK = mm(0x00ff00);
    this.cc = new THREE.Color();
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, tMask: { value: this.mrt.texture },
        res: { value: new THREE.Vector2(2, 2) }, near: { value: 0.1 }, far: { value: 260 },
        ink: { value: new THREE.Color(0x14101a) }, inkOn: { value: 1 }, red: { value: new THREE.Color(0xff1a14) }, ow: { value: 2.0 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tColor; uniform sampler2D tDepth; uniform sampler2D tMask; uniform vec2 res; uniform float near; uniform float far;
        uniform vec3 ink; uniform float inkOn; uniform vec3 red; uniform float ow;
        varying vec2 vUv;
        float lin(float d){ float z = d * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
        void main(){
          vec3 c = texture2D(tColor, vUv).rgb;
          vec2 px = 1.0 / res;
          float raw = texture2D(tDepth, vUv).r;
          float d = lin(raw);
          // 1/z es lineal en pantalla sobre una superficie plana: su segunda derivada solo salta en los bordes reales
          float w = 1.0 / d;
          float wl = 1.0 / lin(texture2D(tDepth, vUv + vec2(-px.x, 0.0)).r);
          float wr = 1.0 / lin(texture2D(tDepth, vUv + vec2(px.x, 0.0)).r);
          float wu = 1.0 / lin(texture2D(tDepth, vUv + vec2(0.0, px.y)).r);
          float wd = 1.0 / lin(texture2D(tDepth, vUv + vec2(0.0, -px.y)).r);
          float e = (abs(wl + wr - 2.0 * w) + abs(wu + wd - 2.0 * w)) / w;
          float edge = smoothstep(0.05, 0.12, e) * (1.0 - smoothstep(35.0, 80.0, d)) * inkOn;
          vec4 mk = texture2D(tMask, vUv);
          // contorno rojo: píxel fuera del enemigo con un vecino dentro
          vec2 o = px * ow;
          float n = 0.0;
          n = max(n, texture2D(tMask, vUv + vec2(o.x, 0.0)).r);
          n = max(n, texture2D(tMask, vUv - vec2(o.x, 0.0)).r);
          n = max(n, texture2D(tMask, vUv + vec2(0.0, o.y)).r);
          n = max(n, texture2D(tMask, vUv - vec2(0.0, o.y)).r);
          n = max(n, texture2D(tMask, vUv + o * 0.7).r);
          n = max(n, texture2D(tMask, vUv - o * 0.7).r);
          n = max(n, texture2D(tMask, vUv + vec2(o.x, -o.y) * 0.7).r);
          n = max(n, texture2D(tMask, vUv + vec2(-o.x, o.y) * 0.7).r);
          float redE = n * (1.0 - mk.r);
          // fondo lejano con menos color (el cielo y lo marcado se respeta)
          float sky = step(0.99999, raw);
          float keep = max(mk.r, mk.g);
          float lum = dot(c, vec3(0.299, 0.587, 0.114));
          c = mix(c, vec3(lum), smoothstep(28.0, 115.0, d) * 0.6 * (1.0 - keep) * (1.0 - sky));
          // enemigos más saturados que el fondo
          c = clamp(mix(vec3(lum), c, 1.0 + 0.35 * mk.r), 0.0, 1.0);
          c = mix(c, ink, edge * 0.9);
          c = mix(c, red, redE);
          gl_FragColor = vec4(c, 1.0);
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
    this.mrt.setSize(W, H);
    this.mat.uniforms.res.value.set(W, H);
    this.mat.uniforms.ow.value = Math.max(1.5, 1.6 * pr);
  }
  render(scene, camera) {
    const R = this.renderer, U = this.mat.uniforms;
    U.near.value = camera.near;
    U.far.value = camera.far;
    U.inkOn.value = this.enabled ? 1 : 0;
    R.setRenderTarget(this.rt);
    R.render(scene, camera);
    // máscara: enemigos en rojo, lo importante en verde, contra la profundidad ya pintada
    const bg = scene.background, ac = R.autoClear, lm = camera.layers.mask;
    R.getClearColor(this.cc); const ca = R.getClearAlpha();
    scene.background = null; R.autoClear = false;
    R.setRenderTarget(this.mrt);
    R.setClearColor(0x000000, 1);
    R.clear(true, false, false);
    scene.overrideMaterial = this.maskE; camera.layers.set(LAYER_ENEMY); R.render(scene, camera);
    scene.overrideMaterial = this.maskK; camera.layers.set(LAYER_KEEP); R.render(scene, camera);
    scene.overrideMaterial = null; camera.layers.mask = lm;
    scene.background = bg; R.autoClear = ac; R.setClearColor(this.cc, ca);
    R.setRenderTarget(null);
    R.render(this.qs, this.qc);
  }
}
