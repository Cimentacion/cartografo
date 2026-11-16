/* ================= OCLUSIÓN AMBIENTAL EN PANTALLA Y SOMBRAS DEL FARO DE LA MOTO =================
   1) La escena se pinta en una textura con su profundidad.
   2) Pase de oclusión a media resolución con un patrón FIJO de muestras (sin ruido aleatorio por píxel,
      que era lo que hacía el granulado que se movía contigo).
   3) Composición: la oclusión se difumina con un filtro de 9 muestras que respeta los bordes de profundidad.
   Con el búfer logarítmico la profundidad se pasa a metros con exp2. Sin texturas de profundidad se pinta normal. */
const POST = { ok: null, rt: null, ao: null, sc: null, cam: null, mAO: null, mOut: null, q: null, w: 0, h: 0, on: true, shadowT: 0 };
const POST_LIN = 'float lin(sampler2D t, vec2 uv){ return exp2(texture2D(t, uv).x * uLogF) - 1.0; }\n';
function postInit() {
  POST.ok = renderer.capabilities.isWebGL2 || !!renderer.extensions.get('WEBGL_depth_texture');
  if (!POST.ok) return;
  POST.sc = new THREE.Scene(); POST.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  POST.mAO = new THREE.ShaderMaterial({
    uniforms: { tDep: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uLogF: { value: 1 }, uProj: { value: 1 } },
    vertexShader: vs, depthTest: false, depthWrite: false,
    fragmentShader: `uniform sampler2D tDep; uniform vec2 uRes; uniform float uLogF, uProj; varying vec2 vUv;
      ${POST_LIN}
      void main(){
        float z = lin(tDep, vUv);
        if (z > 45.0) { gl_FragColor = vec4(1.0); return; }
        float r = clamp(0.5 * uProj / z, 3.0, 48.0);
        vec2 px = vec2(1.0, 0.0) / uRes, py = vec2(0.0, 1.0) / uRes;
        float gx = clamp((lin(tDep, vUv + px) - lin(tDep, vUv - px)) * 0.5, -0.1 * z, 0.1 * z);
        float gy = clamp((lin(tDep, vUv + py) - lin(tDep, vUv - py)) * 0.5, -0.1 * z, 0.1 * z);
        float occ = 0.0;
        for (int i = 0; i < 12; i++) {
          float fi = float(i), a = fi * 2.39996, rr = r * sqrt((fi + 0.5) / 12.0);
          vec2 o = vec2(cos(a), sin(a)) * rr;
          float dz = z + gx * o.x + gy * o.y - lin(tDep, vUv + o / uRes);
          occ += smoothstep(0.05 + z * 0.005, 0.35, dz) * (1.0 - smoothstep(1.0, 2.4, dz));
        }
        float ao = 1.0 - 0.8 * occ / 12.0;
        gl_FragColor = vec4(vec3(mix(ao, 1.0, smoothstep(20.0, 40.0, z))), 1.0);
      }`,
  });
  POST.mOut = new THREE.ShaderMaterial({
    uniforms: { tCol: { value: null }, tDep: { value: null }, tAO: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uLogF: { value: 1 } },
    vertexShader: vs, depthTest: false, depthWrite: false,
    fragmentShader: `uniform sampler2D tCol, tDep, tAO; uniform vec2 uRes; uniform float uLogF; varying vec2 vUv;
      ${POST_LIN}
      void main(){
        vec4 c = texture2D(tCol, vUv); float z = lin(tDep, vUv);
        float s = 0.0, w = 0.0;
        for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
          vec2 o = vec2(float(x), float(y)) * 2.0 / uRes;
          float zz = lin(tDep, vUv + o), k = 1.0 / (1.0 + abs(zz - z) * 6.0 / max(z, 0.5));
          s += texture2D(tAO, vUv + o).r * k; w += k;
        }
        gl_FragColor = vec4(c.rgb * (s / w), 1.0);
      }`,
  });
  POST.q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), POST.mAO); POST.sc.add(POST.q);
}
function postSize() {
  const v = new THREE.Vector2(); renderer.getDrawingBufferSize(v);
  if (POST.rt && POST.w === v.x && POST.h === v.y) return;
  if (POST.rt) { POST.rt.depthTexture.dispose(); POST.rt.dispose(); POST.ao.dispose(); }
  POST.w = v.x; POST.h = v.y;
  const dt = new THREE.DepthTexture(v.x, v.y); dt.type = THREE.UnsignedIntType;
  POST.rt = new THREE.WebGLRenderTarget(v.x, v.y, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, depthTexture: dt });
  const hw = Math.max(1, v.x >> 1), hh = Math.max(1, v.y >> 1);
  POST.ao = new THREE.WebGLRenderTarget(hw, hh, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  POST.mAO.uniforms.tDep.value = dt; POST.mAO.uniforms.uRes.value.set(hw, hh);
  POST.mOut.uniforms.tCol.value = POST.rt.texture; POST.mOut.uniforms.tDep.value = dt; POST.mOut.uniforms.tAO.value = POST.ao.texture; POST.mOut.uniforms.uRes.value.set(v.x, v.y);
}
// sombras: solo el faro de la moto las da; el mapa se actualiza mientras vas montado
function shadowsInit() {
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
  const L = LG.head; L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.camera.near = 0.6; L.shadow.camera.far = 40; L.shadow.bias = -0.0015; L.shadow.normalBias = 0.03;
  scene.traverse(o => {
    if (!o.isMesh || !o.material) return; const m = o.material; if (Array.isArray(m)) return;
    if (m.isMeshBasicMaterial || m.transparent || m.blending === THREE.AdditiveBlending) return;
    o.castShadow = true; o.receiveShadow = true;
  });
}
function shadowCharFix(ch) { ch.g.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; } }); }
// los charcos de luz del suelo no escriben profundidad: así no se recortan unos a otros ni con el faro
function glowFix() { scene.traverse(o => { if (o.isMesh && o.material && o.material.blending === THREE.AdditiveBlending) { o.material.depthWrite = false; o.material.polygonOffset = true; o.material.polygonOffsetFactor = -4; o.material.polygonOffsetUnits = -4; } }); }
function renderFrame() {
  if (POST.ok === null) { postInit(); shadowsInit(); glowFix(); }
  if (ride.on) { POST.shadowT ^= 1; if (POST.shadowT) renderer.shadowMap.needsUpdate = true; }
  for (const M2 of [chars, rchars]) for (const ch of M2.values()) if (!ch.sh0) { ch.sh0 = 1; shadowCharFix(ch); }
  if (!POST.ok || !POST.on) { renderer.render(scene, camera); return; }
  postSize();
  const lf = Math.log2(camera.far + 1);
  POST.mAO.uniforms.uLogF.value = lf; POST.mOut.uniforms.uLogF.value = lf;
  POST.mAO.uniforms.uProj.value = (POST.h >> 1) / (2 * Math.tan(camera.fov * Math.PI / 360));
  renderer.setRenderTarget(POST.rt); renderer.render(scene, camera);
  POST.q.material = POST.mAO; renderer.setRenderTarget(POST.ao); renderer.render(POST.sc, POST.cam);
  POST.q.material = POST.mOut; renderer.setRenderTarget(null); renderer.render(POST.sc, POST.cam);
}
