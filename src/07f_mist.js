/* ================= NIEBLA A LO SILENT HILL, GENTE EN LOS BALCONES =================
   La niebla pesa abajo y se aclara con la altura: de lejos se ve la silueta de las torres pero no la calle.
   Cerca hay jirones de niebla (planos) que van y vienen y se deshacen al acercarte. Las vallas se pierden a lo lejos. */
(function () {
  const C = THREE.ShaderChunk;
  C.fog_fragment = `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, fogDepth );
    float outF = step( 22.0, fogFar );
    // en la calle: algo más de luz a ras de suelo y lo alto de los edificios más oscuro
    float lo = 1.0 + 0.22 * ( 1.0 - smoothstep( 0.5, 6.0, vWY ) ), hi = mix( 1.0, 0.45, smoothstep( 9.0, 45.0, vWY ) );
    gl_FragColor.rgb *= mix( 1.0, lo * hi, outF );
    // niebla de suelo: arriba pesa menos y se recortan las torres contra el cielo
    fogFactor *= mix( 1.0, mix( 1.0, 0.3, smoothstep( 3.0, 38.0, vWY ) ), outF );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;
})();
const MIST = { cards: [], figs: null, t: 0 };
const FOG_DARK = new THREE.Color(0x24262b);
function mistTex() {
  const t = ctex(128, 64, (g) => {
    g.clearRect(0, 0, 128, 64);
    for (let i = 0; i < 26; i++) { const x = 16 + Math.random() * 96, y = 20 + Math.random() * 26, r = 10 + Math.random() * 18, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 64); }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
function figTex() {
  const t = ctex(32, 64, (g) => {
    g.clearRect(0, 0, 32, 64); g.fillStyle = '#000';
    g.beginPath(); g.ellipse(16, 9, 5.5, 7, 0, 0, 7); g.fill();                 // cabeza
    g.fillRect(14, 15, 4, 4);                                                    // cuello
    g.beginPath(); g.moveTo(5, 21); g.quadraticCurveTo(16, 16, 27, 21); g.lineTo(26, 46); g.lineTo(6, 46); g.closePath(); g.fill();   // hombros y torso
    g.fillRect(3, 22, 4, 22); g.fillRect(25, 22, 4, 22); g.fillRect(8, 44, 7, 20); g.fillRect(17, 44, 7, 20);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
// vallas y rejas: se desvanecen con la distancia en vez de hacer moaré
function fadeFar(m, d0, d1) {
  if (!m || m.userData.fade) return; m.userData.fade = 1; m.transparent = true; m.depthWrite = true;
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', '#include <fog_fragment>\n#ifdef USE_FOG\n gl_FragColor.a *= 1.0 - smoothstep(' + d0.toFixed(1) + ', ' + d1.toFixed(1) + ', fogDepth);\n if (gl_FragColor.a < 0.04) discard;\n#endif'); };
  m.needsUpdate = true;
}
function buildMist() {
  fadeFar(D.barsM, 12, 30); scene.traverse(o => { if (o.isMesh && o.material && o.material.alphaTest && o.material.map && o.material.side === THREE.DoubleSide && o !== D.figs) { const im = o.material.map.image; if (im && im.width === 64 && im.height === 64 && o.geometry.attributes.position.count > 40) fadeFar(o.material, 14, 34); } });
  // jirones de niebla
  const tex = mistTex();
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, color: 0x9a9ea8, transparent: true, depthWrite: false, opacity: 0, fog: false }));
    m.renderOrder = 4; m.frustumCulled = false; scene.add(m); MIST.cards.push({ m, a: 0, life: 0, vx: 0, vz: 0, dead: true });
  }
  // siluetas negras de pie en los balcones, mirando a la calle
  const fg = [], r = mulberry32(666);
  for (const b of TOWN.bld) {
    if (!(b.l >= 4 && b.t !== 'roof' && b.t !== 'low') || Math.hypot(b.cx, b.cz) > 230 || r() > 0.85) continue;
    const S = simplify(b.P, 0.6), n = Math.min(12, 2 + (b.l / 2 | 0) + (r() * 3 | 0));
    for (let k = 0; k < n; k++) {
      const i = r() * S.length | 0, a = S[i], c = S[(i + 1) % S.length], [nx, nz, L] = outN(S, i); if (L < 3) continue;
      const t = 0.15 + r() * 0.7, f = 1 + (r() * Math.max(1, b.l - 2) | 0), x = lerp(a[0], c[0], t) + nx * 1.1, z = lerp(a[1], c[1], t) + nz * 1.1, y = f * FLH + 0.45 + 0.85;
      if (Math.hypot(x, z) < 12) continue;
      const g = new THREE.PlaneGeometry(0.62, 1.7); g.rotateY(Math.atan2(nx, nz)); g.translate(x, y, z); fg.push(g);
    }
  }
  if (fg.length) { MIST.figs = addMerged(fg, new THREE.MeshBasicMaterial({ map: figTex(), color: 0x000000, alphaTest: 0.5, side: THREE.DoubleSide })); }
}
function updMist(dt) {
  if (!MIST.cards.length) buildMist();
  const cx = camera.position.x, cz = camera.position.z, out = !inShop(cx, cz) && !inBld(cx, cz);
  MIST.t += dt;
  for (const C of MIST.cards) {
    if (C.dead) {
      if (!out) { C.m.visible = false; continue; }
      const a = Math.random() * PI * 2, d = 7 + Math.random() * 26, s = 5 + Math.random() * 8;
      C.m.position.set(cx + Math.cos(a) * d, 0.7 + Math.random() * 1.8, cz + Math.sin(a) * d); C.m.scale.set(s, s * 0.45, 1);
      C.vx = 0.25 + Math.random() * 0.35; C.vz = (Math.random() - 0.5) * 0.25; C.life = 14 + Math.random() * 14; C.a = 0; C.base = 0.35 + Math.random() * 0.45; C.dead = false; C.m.visible = true;
    }
    C.a += dt; C.m.position.x += C.vx * dt; C.m.position.z += C.vz * dt;
    const d = Math.hypot(C.m.position.x - cx, C.m.position.z - cz);
    // aparece y se va despacio, y se deshace cuando te acercas
    const life = Math.min(1, C.a / 3) * Math.min(1, (C.life - C.a) / 3), near = clamp((d - 1.5) / 6, 0, 1), far = 1 - clamp((d - 30) / 8, 0, 1);
    C.m.material.opacity = (out ? 1 : 0) * C.base * life * near * far;
    C.m.rotation.set(0, Math.atan2(cx - C.m.position.x, cz - C.m.position.z), 0);
    if (C.a > C.life || d > 40 || !out) C.dead = true;
  }
}
