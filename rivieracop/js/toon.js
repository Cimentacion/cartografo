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
// degradado vertical en cada pieza de los modelos: abajo más oscuro, arriba más claro
// (en espacio local de la pieza: en una caja centrada, los vértices de arriba tienen y > 0)
function gradPatch(sh) {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vGrad;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGrad = 0.8 + 0.32 * smoothstep(-0.55, 0.55, position.y);');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vGrad;')
    .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= vGrad;');
}
export function toonGrad2(o = {}) {
  const m = toon(o);
  m.onBeforeCompile = gradPatch;
  m.customProgramCacheKey = () => 'grad';
  return m;
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
        ink: { value: new THREE.Color(0x14101a) }, inkOn: { value: 1 }, red: { value: new THREE.Color(0xff1a14) }, ow: { value: 2.0 }, redOn: { value: 0 }, aoOn: { value: 1 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tColor; uniform sampler2D tDepth; uniform sampler2D tMask; uniform vec2 res; uniform float near; uniform float far;
        uniform vec3 ink; uniform float inkOn; uniform vec3 red; uniform float ow; uniform float redOn; uniform float aoOn;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
        varying vec2 vUv;
        float lin(float d){ float z = d * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
        void main(){
          vec3 c = texture2D(tColor, vUv).rgb;
          vec2 px = 1.0 / res;
          float raw = texture2D(tDepth, vUv).r;
          float d = lin(raw);
          // 1/z es lineal en pantalla sobre una superficie plana: su segunda derivada solo salta en los bordes reales
          float w = 1.0 / d;
          float dl = lin(texture2D(tDepth, vUv + vec2(-px.x, 0.0)).r);
          float dr = lin(texture2D(tDepth, vUv + vec2(px.x, 0.0)).r);
          float du = lin(texture2D(tDepth, vUv + vec2(0.0, px.y)).r);
          float dd = lin(texture2D(tDepth, vUv + vec2(0.0, -px.y)).r);
          float e = (abs(1.0 / dl + 1.0 / dr - 2.0 * w) + abs(1.0 / du + 1.0 / dd - 2.0 * w)) / w;
          // solo siluetas: además del cambio de pendiente tiene que haber un salto real de profundidad
          // (así no salen rayas en pegatinas, pasos de cebra, suelos en ángulo rasante, etc.)
          float jump = max(max(abs(dl - d), abs(dr - d)), max(abs(du - d), abs(dd - d)));
          float sil = smoothstep(0.25 + d * 0.03, 0.6 + d * 0.06, jump);
          float edge = smoothstep(0.06, 0.14, e) * sil * (1.0 - smoothstep(30.0, 60.0, d)) * inkOn;
          // trazo irregular, como dibujado a mano
          float nz = vnoise(gl_FragCoord.xy / 5.0);
          edge *= 0.45 + 0.75 * nz;
          // oclusión ambiental barata: rincones y bases de las cosas más oscuros
          float ao = 0.0;
          if (aoOn > 0.5 && raw < 0.99999) {
            float rad = clamp(14.0 / d, 1.5, 9.0);
            for (int k = 0; k < 8; k++) {
              float a = float(k) * 0.785398 + nz * 0.8;
              vec2 o2 = vec2(cos(a), sin(a)) * px * rad * (1.0 + float(k / 4));
              float dn = lin(texture2D(tDepth, vUv + o2).r);
              float dd2 = d - dn;
              ao += smoothstep(0.04, 0.6, dd2) * (1.0 - smoothstep(1.5, 4.0, dd2));
            }
            ao = clamp(ao / 8.0, 0.0, 1.0) * (1.0 - smoothstep(25.0, 70.0, d));
          }
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
          float redE = n * (1.0 - mk.r) * redOn;
          // fondo lejano con menos color (el cielo y lo marcado se respeta)
          float sky = step(0.99999, raw);
          float keep = max(mk.r, mk.g);
          float lum = dot(c, vec3(0.299, 0.587, 0.114));
          c = mix(c, vec3(lum), smoothstep(28.0, 115.0, d) * 0.6 * (1.0 - keep) * (1.0 - sky));
          // enemigos más saturados que el fondo, y lo cercano con más color que lo lejano
          float near = 1.0 - smoothstep(4.0, 30.0, d);
          c = clamp(mix(vec3(lum), c, 1.0 + 0.35 * mk.r + 0.22 * near * (1.0 - sky)), 0.0, 1.0);
          c *= 1.0 - ao * 0.45;
          c = mix(c, ink * (0.8 + 0.5 * nz), clamp(edge, 0.0, 1.0) * 0.9);
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
    U.redOn.value = this.red ? 1 : 0;
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
