/* ================= OCLUSIÓN AMBIENTAL EN PANTALLA Y SOMBRAS DEL FARO DE LA MOTO =================
   La escena se pinta en una textura con su profundidad. Un segundo paso mira alrededor de cada píxel:
   donde hay algo más cerca de la cámara justo al lado (un rincón, el pie de una pared, debajo de un coche,
   entre las góndolas) oscurece. Con el búfer logarítmico la profundidad se pasa a metros con exp2.
   Si el móvil no tiene texturas de profundidad, se pinta como siempre. */
const POST = { ok: null, rt: null, sc: null, cam: null, mat: null, w: 0, h: 0, on: true, shadowT: 0 };
function postInit() {
  const gl = renderer.getContext();
  POST.ok = renderer.capabilities.isWebGL2 || !!renderer.extensions.get('WEBGL_depth_texture');
  if (!POST.ok) return;
  POST.sc = new THREE.Scene(); POST.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  POST.mat = new THREE.ShaderMaterial({
    uniforms: { tCol: { value: null }, tDep: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uLogF: { value: Math.log2(camera.far + 1) }, uProj: { value: 1 }, uStr: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tCol, tDep; uniform vec2 uRes; uniform float uLogF, uProj, uStr; varying vec2 vUv;
      float lin(vec2 uv){ float d = texture2D(tDep, uv).x; return exp2(d * uLogF) - 1.0; }
      void main(){
        vec4 c = texture2D(tCol, vUv); float z = lin(vUv);
        if (z > 60.0) { gl_FragColor = c; return; }
        // radio de muestreo: unos 0,45 m en el mundo pasados a píxeles
        float r = clamp(0.45 * uProj / z, 2.0, 40.0);
        // pendiente local de la profundidad: lo que está en el mismo plano (suelo, pared) no cuenta como oclusión
        vec2 px = vec2(1.0, 0.0) / uRes, py = vec2(0.0, 1.0) / uRes;
        float gx = (lin(vUv + px) - lin(vUv - px)) * 0.5, gy = (lin(vUv + py) - lin(vUv - py)) * 0.5;
        float lim = 0.08 * z;
        gx = clamp(gx, -lim, lim); gy = clamp(gy, -lim, lim);
        float occ = 0.0;
        for (int i = 0; i < 10; i++) {
          float a = float(i) * 2.399 + fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5) * 6.283;
          float rr = r * (0.3 + 0.7 * fract(float(i) * 0.618));
          vec2 o = vec2(cos(a), sin(a)) * rr;
          float zs = lin(vUv + o / uRes), ze = z + gx * o.x + gy * o.y, dz = ze - zs;
          occ += smoothstep(0.04 + z * 0.004, 0.3, dz) * (1.0 - smoothstep(0.9, 2.2, dz));
        }
        float ao = 1.0 - uStr * 0.85 * occ / 10.0;
        ao = mix(ao, 1.0, smoothstep(22.0, 45.0, z));
        gl_FragColor = vec4(c.rgb * ao, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  POST.sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), POST.mat));
}
function postSize() {
  const v = new THREE.Vector2(); renderer.getDrawingBufferSize(v);
  if (POST.rt && POST.w === v.x && POST.h === v.y) return;
  if (POST.rt) { POST.rt.depthTexture.dispose(); POST.rt.dispose(); }
  POST.w = v.x; POST.h = v.y;
  const dt = new THREE.DepthTexture(v.x, v.y); dt.type = THREE.UnsignedIntType;
  POST.rt = new THREE.WebGLRenderTarget(v.x, v.y, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, depthTexture: dt });
  POST.mat.uniforms.tCol.value = POST.rt.texture; POST.mat.uniforms.tDep.value = dt; POST.mat.uniforms.uRes.value.set(v.x, v.y);
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
  // sombra del faro: cada dos fotogramas mientras vas en moto
  if (ride.on) { POST.shadowT ^= 1; if (POST.shadowT) renderer.shadowMap.needsUpdate = true; }
  for (const M2 of [chars, rchars]) for (const ch of M2.values()) if (!ch.sh0) { ch.sh0 = 1; shadowCharFix(ch); }
  if (!POST.ok || !POST.on) { renderer.render(scene, camera); return; }
  postSize();
  POST.mat.uniforms.uLogF.value = Math.log2(camera.far + 1);
  POST.mat.uniforms.uProj.value = POST.h / (2 * Math.tan(camera.fov * Math.PI / 360));
  renderer.setRenderTarget(POST.rt); renderer.render(scene, camera);
  renderer.setRenderTarget(null); renderer.render(POST.sc, POST.cam);
}
