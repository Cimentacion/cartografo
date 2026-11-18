/* Chicas de Tripo en la pantalla de Nocturna: three.js dibuja a 176×220 con un material PS1
   (vértices ajustados al píxel, textura afín, luz dura por faceta) y el resultado se mezcla en el búfer del juego. */
const PS1G=(function(){
  let R=null,cv=null;const G={};let px=null;
  const VS=`
    #include <common>
    #include <skinning_pars_vertex>
    uniform vec2 res;
    varying vec2 vUv;varying vec3 vV;varying vec3 vNs;
    void main(){
      #include <beginnormal_vertex>
      #include <skinbase_vertex>
      #include <skinnormal_vertex>
      #include <begin_vertex>
      #include <skinning_vertex>
      vec4 mv=modelViewMatrix*vec4(transformed,1.);
      vec4 p=projectionMatrix*mv;
      vec2 h=res;p.xy=floor(p.xy/p.w*h+.5)/h*p.w;
      vUv=uv;vV=mv.xyz;vNs=normalize(normalMatrix*objectNormal);
      gl_Position=p;
    }`;
  const FS=`
    uniform sampler2D map;uniform vec3 L;uniform vec3 RIM;uniform vec3 tint;uniform float facet;
    varying vec2 vUv;varying vec3 vV;varying vec3 vNs;
    void main(){
      vec4 t=texture2D(map,vUv);
      if(t.a<.5)discard;
      vec3 n=normalize(vNs);if(dot(n,-vV)<0.)n=-n;
      /* la textura de Tripo ya trae el sombreado pintado: luz suave encima, sin facetas */
      float d=max(dot(n,L),0.);
      float rim=max(dot(n,RIM),0.)*pow(1.-abs(n.z),2.);
      vec3 sh=vec3(.78+d*.30+rim*.10,.78+d*.28+rim*.14,.82+d*.24+rim*.24);
      gl_FragColor=vec4(t.rgb*sh*tint,1.);
    }`;
  function nrm(v){const l=Math.hypot(...v);return v.map(x=>x/l)}
  function mat(tex,facet){
    if(tex){tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;tex.generateMipmaps=false;tex.needsUpdate=true}
    return new THREE.ShaderMaterial({vertexShader:VS,fragmentShader:FS,skinning:true,extensions:{derivatives:true},side:THREE.DoubleSide,
      uniforms:{map:{value:tex},res:{value:new THREE.Vector2(RW,RH)},L:{value:new THREE.Vector3(...nrm([-0.62,0.48,0.62]))},
        RIM:{value:new THREE.Vector3(...nrm([0.85,0.25,-0.45]))},tint:{value:new THREE.Vector3(1,1,1)},facet:{value:facet}}});
  }
  function init(){
    if(R)return true;
    if(!window.THREE||!THREE.GLTFLoader)return false;
    cv=document.createElement('canvas');cv.width=RW;cv.height=RH;
    try{R=new THREE.WebGLRenderer({canvas:cv,alpha:true,antialias:false,preserveDrawingBuffer:true})}catch(e){return false}
    R.setPixelRatio(1);R.setSize(RW,RH,false);R.setClearColor(0x000000,0);
    px=new Uint8Array(RW*RH*4);return true;
  }
  /* cfg: {glb:base64, clips:{gesto:'nombre de clip'}, facet, frame:{y,h}} */
  function load(id,cfg){
    if(!init())return Promise.resolve(null);
    const bin=Uint8Array.from(atob(cfg.glb),c=>c.charCodeAt(0)).buffer;
    return new Promise(res=>new THREE.GLTFLoader().parse(bin,'',gl=>{
      const root=gl.scene;const meshes=[];
      root.traverse(o=>{if(o.isMesh){o.material=mat(o.material.map,cfg.facet??.65);o.frustumCulled=false;meshes.push(o)}});
      const scene=new THREE.Scene();scene.add(root);
      /* encuadre de busto a partir de la caja del personaje en reposo */
      const box=new THREE.Box3().setFromObject(root),H=box.max.y-box.min.y,cx=(box.min.x+box.max.x)/2,cz=(box.min.z+box.max.z)/2;
      const f=cfg.frame||{y:.80,h:.42,yaw:-.22};
      const cam=new THREE.PerspectiveCamera(22,RW/RH,.01,100);
      const ty=box.min.y+H*f.y,dist=(H*f.h/2)/Math.tan(THREE.MathUtils.degToRad(11));
      cam.position.set(cx,ty+H*.03,cz+dist);cam.lookAt(cx,ty,cz);
      const turn=new THREE.Group();scene.add(turn);turn.add(root);turn.rotation.y=(cfg.face??-Math.PI/2)+(f.yaw??-.22);
      let pelvis=null,head=null;root.traverse(o=>{if(o.isBone&&/pelvis|hip/i.test(o.name)&&!pelvis)pelvis=o;if(o.isBone&&/^head$/i.test(o.name))head=o});
      const mixer=new THREE.AnimationMixer(root),acts={};
      /* reposo propio: la pose de enlace (brazos caídos, hombros relajados) con respiración y balanceo suaves.
         El standing_relax de Tripo encoge los hombros y arquea los brazos. */
      const bind={};root.traverse(b=>{if(b.isBone)bind[b.name]={q:b.quaternion.clone(),p:b.position.clone()}});
      /* bajar los brazos de la pose en T: girar cada brazo en el mundo hasta que cuelgue junto al cuerpo */
      const aim=(name,child,dir)=>{let b=null,c=null;root.traverse(o=>{if(o.name===name)b=o;if(o.name===child)c=o});if(!b||!c)return;
        root.updateMatrixWorld(true);const pb=new THREE.Vector3(),pc=new THREE.Vector3();b.getWorldPosition(pb);c.getWorldPosition(pc);
        const cur=pc.sub(pb).normalize(),dq=new THREE.Quaternion().setFromUnitVectors(cur,dir.clone().normalize());
        const wq=new THREE.Quaternion();b.getWorldQuaternion(wq);const pq=new THREE.Quaternion();b.parent.getWorldQuaternion(pq);
        b.quaternion.copy(pq.invert().multiply(dq.multiply(wq)));root.updateMatrixWorld(true)};
      {root.updateMatrixWorld(true);const pl=new THREE.Vector3(),pr=new THREE.Vector3();let L=null,Rr=null;
        root.traverse(o=>{if(o.name==='L_Upperarm')L=o;if(o.name==='R_Upperarm')Rr=o});
        if(L&&Rr){L.getWorldPosition(pl);Rr.getWorldPosition(pr);const side=pl.clone().sub(pr).normalize(),up=new THREE.Vector3(0,1,0);
          const fwd=new THREE.Vector3().crossVectors(side,up).normalize();
          aim('L_Upperarm','L_Forearm',up.clone().multiplyScalar(-1).addScaledVector(side,.16).addScaledVector(fwd,-.02));
          aim('R_Upperarm','R_Forearm',up.clone().multiplyScalar(-1).addScaledVector(side,-.16).addScaledVector(fwd,-.02));
          /* codo apenas doblado hacia delante */
          const ff=fwd.clone();root.updateMatrixWorld(true);
          const bendDir=(s)=>up.clone().multiplyScalar(-1).addScaledVector(side,s*.10).addScaledVector(ff,.0);
          aim('L_Forearm','L_Hand',bendDir(1));aim('R_Forearm','R_Hand',bendDir(-1));
          console.log('[ps1g] fwd',fwd.toArray().map(v=>v.toFixed(2)))}}
      {const tracks=[],T=6,K=24,ax=new THREE.Vector3(),q=new THREE.Quaternion();
        const sway={Spine01:[[1,0,0],.012,1],Spine02:[[1,0,0],.015,1],NeckTwist01:[[0,1,0],.04,.5],Head:[[0,1,0],.06,.5],
          L_Upperarm:[[0,0,1],.02,1],R_Upperarm:[[0,0,1],-.02,1],L_Forearm:[[0,0,1],.025,1],R_Forearm:[[0,0,1],-.025,1]};
        root.traverse(b=>{if(!b.isBone)return;const times=[],vals=[];const sw=sway[b.name];
          for(let k=0;k<=K;k++){const t=k/K*T;times.push(t);q.copy(b.quaternion);
            if(sw){ax.set(...sw[0]);q.multiply(new THREE.Quaternion().setFromAxisAngle(ax,Math.sin(t/T*Math.PI*2*sw[2]*(sw[2]<1?2:2))*sw[1]))}
            vals.push(q.x,q.y,q.z,q.w)}
          tracks.push(new THREE.QuaternionKeyframeTrack(b.name+'.quaternion',times,vals));
          tracks.push(new THREE.VectorKeyframeTrack(b.name+'.position',[0],[b.position.x,b.position.y,b.position.z]))});
        acts.__rest=mixer.clipAction(new THREE.AnimationClip('__rest',T,tracks));}
      for(const c of gl.animations){acts[c.name]=mixer.clipAction(c)}
      G[id]={loop:cfg.loop||[],scene,cam,root,turn,pelvis,head,rest:null,hrest:null,tgt:new THREE.Vector3(cx,ty,cz),off:cam.position.clone().sub(new THREE.Vector3(cx,ty,cz)),cs:null,mixer,acts,clips:cfg.clips||{},cur:null,meshes};
      console.log('[ps1g]',id,'head',!!head,'pelvis',!!pelvis,'clips',Object.keys(acts),'alto',H.toFixed(2));
      play(id,'rest');res(G[id]);
    },e=>{console.warn('[ps1g]',e);res(null)}));
  }
  function clipFor(g,gesture){
    if(gesture==='rest'&&g.acts.__rest&&!g.clips.rest)return g.acts.__rest;
    const want=g.clips[gesture]||g.clips.rest;
    if(want&&g.acts[want])return g.acts[want];
    const k=Object.keys(g.acts).find(n=>want&&n.toLowerCase().includes(want.toLowerCase()))||Object.keys(g.acts)[0];
    return g.acts[k];
  }
  function play(id,gesture,from){
    const g=G[id];if(!g)return;const a=clipFor(g,gesture);if(!a||a===g.cur)return;
    const once=gesture!=='rest'&&!(g.loop||[]).includes(gesture);
    a.reset();a.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);a.clampWhenFinished=once;a.enabled=true;a.play();
    if(once&&!g.hooked){g.hooked=true;g.mixer.addEventListener('finished',e=>{if(e.action===g.cur){g.cur=null;play(id,'rest',e.action)}})}
    const prev=g.cur||from;if(prev&&prev!==a)prev.crossFadeTo(a,.45,false);g.cur=a;
  }
  /* dibuja la chica id sobre buf (Float32 RGB 0..255) */
  function draw(id,buf,dt,opt){
    const g=G[id];if(!g)return false;
    g.mixer.update(dt);
    /* anclar la pelvis: las animaciones no se desplazan por la escena */
    if(g.pelvis){g.root.position.set(0,0,0);g.scene.updateMatrixWorld(true);const p=new THREE.Vector3();g.pelvis.getWorldPosition(p);
      if(!g.rest)g.rest=p.clone();
      const d=new THREE.Vector3(g.rest.x-p.x,0,g.rest.z-p.z);g.turn.worldToLocal(d.add(g.turn.position));g.root.position.copy(d)}
    /* la cámara sigue a la cabeza con suavidad (reverencias, risas, brazos arriba) */
    if(g.head){g.scene.updateMatrixWorld(true);const h=new THREE.Vector3();g.head.getWorldPosition(h);
      if(!g.hrest)g.hrest=h.clone();
      const want=g.tgt.clone().add(h.clone().sub(g.hrest).multiplyScalar(.9));
      if(!g.cs)g.cs=want.clone();g.cs.lerp(want,1-Math.exp(-(dt||1/30)*6));
      g.cam.position.copy(g.cs).add(g.off);g.cam.lookAt(g.cs)}
    const tn=opt&&opt.tint||[1,1,1];for(const m of g.meshes)m.material.uniforms.tint.value.set(...tn);
    g.turn.position.x=(opt&&opt.xoff||0)*.1;
    R.render(g.scene,g.cam);
    const gl=R.getContext();gl.readPixels(0,0,RW,RH,gl.RGBA,gl.UNSIGNED_BYTE,px);
    const skip=opt&&opt.skipOdd;
    for(let y=0;y<RH;y++){const sy=RH-1-y;
      if(skip&&(y&1))continue;
      for(let x=0;x<RW;x++){const o=(sy*RW+x)*4;if(px[o+3]<128)continue;const k=(y*RW+x)*3;
        buf[k]=px[o];buf[k+1]=px[o+1];buf[k+2]=px[o+2]}}
    return true;
  }
  return{load,play,draw,has:id=>!!G[id]};
})();
