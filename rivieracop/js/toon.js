// Estilo toon: sombreado en 3 franjas + texturas compartidas + contorno negro por post-proceso
import * as THREE from 'three';

let GRAD = null;
export function toonGrad() {
  if (!GRAD) {
    // sombreado suave en 4 tonos (estilo dibujos: la parte en sombra no se va a negro)
    const d = new Uint8Array([120, 122, 140, 255, 182, 182, 192, 255, 232, 230, 226, 255, 255, 252, 244, 255]);
    GRAD = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat);
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
    t.anisotropy = 16; // a lo lejos las texturas no hacen rayas (se limita a lo que admita el móvil)
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
        ink: { value: new THREE.Color(0x14101a) }, inkOn: { value: 1 }, red: { value: new THREE.Color(0xff1a14) }, ow: { value: 2.0 }, redOn: { value: 0 }, aoOn: { value: 1 }, aoN: { value: 8 }, palOn: { value: 1 }, tint: { value: new THREE.Color(0xa8c8e8) }, palA: { value: new THREE.Vector4(0.2, 0.68, 0.88, 0.09) }, palB: { value: new THREE.Vector4(1.45, 0, 0.25, 0) }, palT: { value: new THREE.Color(1, 1, 1) }, dim: { value: 0 }, dimD: { value: 100 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tColor; uniform sampler2D tDepth; uniform sampler2D tMask; uniform vec2 res; uniform float near; uniform float far;
        uniform vec3 ink; uniform float inkOn; uniform vec3 red; uniform float ow; uniform float redOn; uniform float aoOn; uniform float aoN; uniform float palOn; uniform vec3 tint; uniform vec4 palA; uniform vec4 palB; uniform vec3 palT; uniform float dim; uniform float dimD;
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
          // en superficies muy inclinadas (techos y suelos lejanos) la profundidad cambia mucho de un píxel a otro:
          // el borde solo cuenta si la curvatura es grande comparada con esa pendiente (si no, salían puntitos)
          float g1 = (abs(1.0 / dl - 1.0 / dr) + abs(1.0 / du - 1.0 / dd)) / w;
          float edge = smoothstep(0.06, 0.14, e) * smoothstep(0.35, 0.7, e / max(g1, 1e-4)) * sil * (1.0 - smoothstep(22.0, 40.0, d)) * inkOn;
          // trazo irregular, como dibujado a mano
          float nz = vnoise(gl_FragCoord.xy / 5.0);
          edge *= 0.85 + 0.15 * nz;
          // oclusión ambiental barata: rincones y bases de las cosas más oscuros
          float ao = 0.0;
          if (aoOn > 0.5 && raw < 0.99999) {
            // radio en píxeles de ~0,9 m de mundo. Muestras por PAREJAS opuestas: en una superficie plana 1/z es lineal,
            // así que la media de las dos coincide con el centro y no oscurece (antes salían bandas en paredes inclinadas)
            float rad = clamp(0.9 * res.y / (d * 1.1), 3.0, 40.0);
            for (int k = 0; k < 6; k++) {
              if (float(k * 2) >= aoN) break;
              float a = float(k) * 0.5236 + nz * 1.3;
              vec2 o2 = vec2(cos(a), sin(a)) * px * rad * (k < 3 ? 0.5 : 1.0);
              float da = lin(texture2D(tDepth, vUv + o2).r), db = lin(texture2D(tDepth, vUv - o2).r);
              // profundidad del plano que pasa por las dos muestras, en el centro
              float dp = 2.0 / (1.0 / da + 1.0 / db);
              float dd2 = d - dp;
              // solo rincones (concavidad); si una muestra está mucho más cerca es un objeto delante: no cuenta
              ao += smoothstep(0.05 + d * 0.012, 0.4 + d * 0.03, dd2) * (1.0 - smoothstep(1.5, 3.5, max(d - da, d - db))) * 2.0;
            }
            ao = clamp(ao / (aoN * 0.6), 0.0, 1.0) * (1.0 - smoothstep(18.0, 45.0, d));
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
          float bg = (1.0 - keep) * (1.0 - sky);
          float near = 1.0 - smoothstep(4.0, 30.0, d);
          // oclusión ambiental teñida de azul-violeta
          c *= mix(vec3(1.0), vec3(0.5, 0.52, 0.68), ao * 0.8);
          if (palOn > 0.5) {
            // PALETA SUAVE: el decorado se lleva a una gama de valores media y poco contrastada, con un tinte común
            // de la zona; así los enemigos (y lo importante) destacan por contraste y color
            lum = dot(c, vec3(0.299, 0.587, 0.114));
            vec3 tn = mix(tint, palT, palB.y);
            float lv = mix(palA.x, palA.y, smoothstep(0.0, 1.0, lum));
            vec3 cb = c * (lv / max(lum, 0.03));
            cb = mix(vec3(lv), cb, palA.z);                       // menos saturado
            cb = mix(cb, tn * (lv * 1.2), palA.w);              // tinte común de la zona
            cb = mix(cb, tn * 0.95, smoothstep(40.0, 160.0, d) * palB.z); // perspectiva aérea
            // el coche, el arma y las manos (muy cerca) no se tocan
            c = mix(c, clamp(cb, 0.0, 1.0), bg * smoothstep(2.5, 6.0, d) * 0.85);
            // enemigos: más saturados y nunca demasiado oscuros
            float le = dot(c, vec3(0.299, 0.587, 0.114));
            vec3 ce = clamp(mix(vec3(le), c, palB.x) * 1.12 + 0.05, 0.0, 1.0);
            c = mix(c, ce, mk.r);
            c = mix(c, clamp(mix(vec3(le), c, 1.2), 0.0, 1.0), mk.g * (1.0 - mk.r));
          } else {
            c = mix(c, vec3(lum), smoothstep(40.0, 140.0, d) * 0.3 * bg);
            c = clamp(mix(vec3(lum), c, 1.28 + 0.35 * mk.r + 0.25 * near * (1.0 - sky)), 0.0, 1.0);
            lum = dot(c, vec3(0.299, 0.587, 0.114));
            c *= mix(vec3(0.9, 0.94, 1.08), vec3(1.05, 1.01, 0.93), smoothstep(0.15, 0.85, lum));
            c = clamp((c - 0.5) * 1.08 + 0.52, 0.0, 1.0);
          }
          // lo que está más apartado de la carretera (más lejos) tiene luces y sombras más contrastadas
          // túnel a oscuras: todo lo que queda antes de la boca se apaga; lo de fuera (y el cielo) sigue con luz
          if (dim > 0.0) c *= mix(1.0, mix(0.13, 0.32, 1.0 - smoothstep(2.5, 6.0, d)), dim * (1.0 - sky) * (1.0 - smoothstep(dimD - 8.0, dimD + 3.0, d)));
          c = mix(c, ink, clamp(edge, 0.0, 1.0) * 0.9);
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
