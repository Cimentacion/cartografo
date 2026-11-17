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
          // la tolerancia crece con la pendiente en pantalla: el suelo visto de canto ya no se raya a bandas
          float tol = 0.05 + z * 0.006 + length(vec2(gx, gy)) * rr * 0.35;
          occ += smoothstep(tol, tol + 0.3, dz) * (1.0 - smoothstep(1.0 + tol, 2.4 + tol, dz));
        }
        float ao = 1.0 - 0.8 * occ / 12.0;
        gl_FragColor = vec4(vec3(mix(ao, 1.0, smoothstep(20.0, 40.0, z))), 1.0);
      }`,
  });
  POST.mOut = new THREE.ShaderMaterial({
    uniforms: { tCol: { value: null }, tDep: { value: null }, tAO: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uLogF: { value: 1 }, uInvP: { value: new THREE.Matrix4() }, uCamW: { value: new THREE.Matrix4() }, uL: { value: Array.from({ length: 16 }, () => new THREE.Vector4()) }, uLC: { value: Array.from({ length: 16 }, () => new THREE.Color(0, 0, 0)) }, uFog: { value: new THREE.Vector2(10, 40) }, uAdd: { value: 1.1 } },
    vertexShader: vs, depthTest: false, depthWrite: false,
    fragmentShader: `uniform sampler2D tCol, tDep, tAO; uniform vec2 uRes; uniform float uLogF; varying vec2 vUv;
      ${POST_LIN}
      uniform mat4 uInvP, uCamW; uniform vec4 uL[16]; uniform vec3 uLC[16]; uniform vec2 uFog; uniform float uAdd;
      vec3 wpos(vec2 uv){ float z = lin(tDep, uv); vec4 r = uInvP * vec4(uv * 2.0 - 1.0, 1.0, 1.0); r.xyz /= r.w; return (uCamW * vec4(r.xyz * (z / -r.z), 1.0)).xyz; }
      void main(){
        vec4 c = texture2D(tCol, vUv); float z = lin(tDep, vUv);
        // luz de farolas, escaparates y máquinas calculada sobre lo que se ve: no hay planos en el suelo que se corten
        vec3 lig = vec3(0.0);
        if (z < 70.0) {
          vec3 P = wpos(vUv), Px = wpos(vUv + vec2(2.0, 0.0) / uRes), Py = wpos(vUv + vec2(0.0, 2.0) / uRes);
          vec3 N = normalize(cross(Px - P, Py - P)); if (dot(N, cameraPosition - P) < 0.0) N = -N;
          // en el suelo la normal sacada de la profundidad sale con escalones (más en unas GPU que en otras) y la luz hacía rayas: el suelo mira arriba
          N = normalize(mix(N, vec3(0.0, 1.0, 0.0), 1.0 - smoothstep(0.1, 0.25, P.y)));
          for (int i = 0; i < 16; i++) {
            vec3 d = uL[i].xyz - P; float dist = length(d), r = uL[i].w;
            if (r <= 0.0 || dist > r) continue;
            float at = 1.0 - dist / r; at = at * sqrt(at);
            lig += uLC[i] * at * (0.25 + 0.75 * max(dot(N, d / dist), 0.0));
          }
          lig *= 1.0 - smoothstep(uFog.x, uFog.y, z) * 0.85;
        }
        c.rgb = c.rgb * (1.0 + lig * 3.0) + lig * uAdd;
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
  D.handle.traverse(o => { o.castShadow = false; o.receiveShadow = false; });
  // dentro del local manda su propia luz: la sombra del faro desde la calle lo dejaba negro
  if (D.shopGrp) D.shopGrp.traverse(o => { o.receiveShadow = false; });
}
function shadowCharFix(ch) { ch.g.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; } }); }
// los charcos de luz del suelo no escriben profundidad: así no se recortan unos a otros ni con el faro
function glowFix() { scene.traverse(o => { if (o.isMesh && o.material && o.material.blending === THREE.AdditiveBlending && !o.material.isShaderMaterial) { o.material.depthWrite = false; o.material.polygonOffset = true; o.material.polygonOffsetFactor = -4; o.material.polygonOffsetUnits = -4; } }); }
function renderFrame() {
  if (POST.ok === null) { postInit(); shadowsInit(); glowFix(); }
  // la sombra del faro en Lambert (r128) oscurece TODA la luz directa del píxel, no solo la del faro: al bajarte de la moto
  // se quedaba el mapa de sombras viejo y dentro del local salía una sombra negrísima. Sin moto, el faro mira al cielo y el mapa queda limpio.
  if (ride.on) { POST.shOff = 0; POST.shadowT ^= 1; if (POST.shadowT) renderer.shadowMap.needsUpdate = true; }
  else if (POST.shOff !== 1) {
    POST.shOff = 1; LG.head.position.set(camera.position.x, 400, camera.position.z); LG.head.target.position.set(camera.position.x, 900, camera.position.z);
    LG.head.updateMatrixWorld(); LG.head.target.updateMatrixWorld(); renderer.shadowMap.needsUpdate = true;
  }
  for (const M2 of [chars, rchars]) for (const ch of M2.values()) if (!ch.sh0) { ch.sh0 = 1; shadowCharFix(ch); }
  if (!POST.ok || !POST.on) { renderer.render(scene, camera); return; }
  postSize();
  const lf = Math.log2(camera.far + 1);
  POST.mAO.uniforms.uLogF.value = lf; POST.mOut.uniforms.uLogF.value = lf;
  POST.mAO.uniforms.uProj.value = (POST.h >> 1) / (2 * Math.tan(camera.fov * Math.PI / 360));
  postLights();
  renderer.setRenderTarget(POST.rt); renderer.render(scene, camera);
  POST.q.material = POST.mAO; renderer.setRenderTarget(POST.ao); renderer.render(POST.sc, POST.cam);
  POST.q.material = POST.mOut; renderer.setRenderTarget(null); renderer.render(POST.sc, POST.cam);
}

// las luces que se pasan al último paso: las 16 más cercanas a la cámara
let PL = null;
function postLightsList() {
  PL = [];
  for (const L of TOWN.lamps) { if (L.md === 2) continue; const y = L.hy || 4.6; PL.push({ x: L.hx, y, z: L.hz, r: L.pr ? 11 : L.lit ? 10.5 : 8, c: L.lit || L.pr ? [1.0, 0.9, 0.75] : [1.0, 0.62, 0.3], k: L.lit || L.pr ? 0.7 : 0.5, L }); }
  for (const p of LIFE.shops) if (p.lit) PL.push({ x: p.x + p.nx * 0.9, y: 2.0, z: p.z + p.nz * 0.9, r: 5, c: [1.0, 0.95, 0.85], k: 0.3 });
  for (const p of LIFE.vend) { const [x, z] = sp2w(p, 0, 0.7); PL.push({ x, y: 1.2, z, r: 4.2, c: [0.35, 0.6, 1.0], k: 0.5 }); }
}
function postLights() {
  if (!PL) postLightsList();
  const U = POST.mOut.uniforms, cx = camera.position.x, cz = camera.position.z, out = !inShop(cx, cz) && !inBld(cx, cz);
  camera.updateMatrixWorld(); U.uInvP.value.copy(camera.projectionMatrixInverse); U.uCamW.value.copy(camera.matrixWorld);
  if (scene.fog) U.uFog.value.set(scene.fog.near, scene.fog.far);
  for (const l of PL) l.d = (l.x - cx) ** 2 + (l.z - cz) ** 2;
  const near = out ? PL.filter(l => l.d < 3600).sort((a, b) => a.d - b.d).slice(0, 16) : [];
  for (let i = 0; i < 16; i++) {
    const l = near[i], v = U.uL.value[i], c = U.uLC.value[i];
    if (!l || (l.L && lampOff(l.L))) { v.set(0, 0, 0, 0); c.setRGB(0, 0, 0); continue; }
    v.set(l.x, l.y, l.z, l.r + l.y * 1.05); c.setRGB(l.c[0] * l.k, l.c[1] * l.k, l.c[2] * l.k);
  }
}
