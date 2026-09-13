/* Supplied scene: learner code controls the actual Three.js Group named personnage. */
window.creerAtelier3D = function () {
  const host=document.querySelector('#terrain');
  const hint=document.querySelector('#notice');
  if(!window.THREE){hint.textContent='Three.js n’a pas pu charger. Actualise la page.';throw new Error('Three.js indisponible');}
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#dceefa');
  const camera=new THREE.PerspectiveCamera(38,1,0.1,100);
  camera.position.set(0,6.5,11.5);camera.lookAt(0,0.8,0);
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}
  catch(error){hint.textContent='La 3D nécessite WebGL. Essaie un navigateur avec l’accélération graphique activée.';throw error;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label','Personnage Three.js sur son terrain');
  host.append(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xe8f6ff,0x6c8663,2.5));
  const sunlight=new THREE.DirectionalLight(0xfff0dc,3);
  sunlight.position.set(-3,8,5);sunlight.castShadow=true;
  sunlight.shadow.mapSize.set(1024,1024);
  Object.assign(sunlight.shadow.camera,{left:-6,right:6,top:6,bottom:-6});
  sunlight.shadow.bias=-0.0005;scene.add(sunlight);
  const materials={
    shirt:new THREE.MeshStandardMaterial({color:'#3976d6',roughness:0.85}),
    skin:new THREE.MeshStandardMaterial({color:'#efbc94',roughness:0.9}),
    pants:new THREE.MeshStandardMaterial({color:'#26374b',roughness:0.95}),
    shoe:new THREE.MeshStandardMaterial({color:'#f6f8fc',roughness:0.8}),
    hair:new THREE.MeshStandardMaterial({color:'#543c33',roughness:1}),
    dark:new THREE.MeshStandardMaterial({color:'#202d40',roughness:0.8})
  };
  function box(parent,w,h,d,x,y,z,material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  const floor=new THREE.Mesh(new THREE.BoxGeometry(10,0.25,7),new THREE.MeshStandardMaterial({color:'#b8d5b1',roughness:1}));
  floor.position.y=-0.15;floor.receiveShadow=true;scene.add(floor);
  const grid=new THREE.GridHelper(10,10,0x79a08b,0x99bba0);grid.position.y=-0.015;grid.scale.z=0.7;scene.add(grid);
  // A readable, articulated character made from real meshes, not a CSS cube.
  window.personnage=new THREE.Group();personnage.name='personnage';scene.add(personnage);
  box(personnage,0.64,0.7,0.38,0,1.06,0,materials.shirt);
  box(personnage,0.54,0.54,0.5,0,1.72,0,materials.skin);
  box(personnage,0.57,0.17,0.53,0,1.98,-0.015,materials.hair);
  box(personnage,0.13,0.31,0.5,-0.23,1.82,-0.02,materials.hair);
  for(const x of [-0.12,0.12])box(personnage,0.065,0.075,0.025,x,1.75,0.26,materials.dark);
  box(personnage,0.14,0.025,0.025,0,1.57,0.26,materials.dark);
  const limbs=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*0.43,1.32,0);personnage.add(arm);
    box(arm,0.22,0.45,0.26,0,-0.2,0,materials.shirt);box(arm,0.19,0.22,0.22,0,-0.49,0,materials.skin);
    const leg=new THREE.Group();leg.position.set(side*0.18,0.72,0);personnage.add(leg);
    box(leg,0.25,0.53,0.29,0,-0.28,0,materials.pants);box(leg,0.28,0.18,0.43,0,-0.63,0.065,materials.shoe);
    limbs.push({arm,leg,side});
  }
  // The origin marker helps compare positions before and after changing x.
  const marker=new THREE.Mesh(new THREE.RingGeometry(0.45,0.49,40),new THREE.MeshBasicMaterial({color:0x4177b4,side:THREE.DoubleSide}));
  marker.rotation.x=-Math.PI/2;marker.position.y=0.003;scene.add(marker);
  window.vitesseVerticale=0;
  const keys=new Set();let started=false,active=false,last=0,accumulator=0,walk=0;
  const call=(name,...args)=>{if(typeof window[name]==='function')return window[name](...args);};
  const showControls=()=>{hint.textContent=typeof window.deplacer==='function'?'Teste les flèches que tu as programmées.'+(typeof window.sauter==='function'?' Espace : sauter.':''):'Modifie le nombre dans le code pour déplacer ton personnage.';};
  host.addEventListener('pointerdown',()=>{host.focus();active=true;showControls();});
  host.addEventListener('keydown',event=>{
    if(!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Space'].includes(event.code))return;
    event.preventDefault();active=true;keys.add(event.code);showControls();
    if(event.code==='Space'&&!event.repeat&&personnage.position.y===0)call('sauter');
  });
  host.addEventListener('keyup',event=>keys.delete(event.code));
  const pause=()=>{keys.clear();active=false;};host.addEventListener('blur',pause);window.addEventListener('blur',pause);
  function reset(){personnage.position.set(0,0,0);personnage.rotation.y=0;vitesseVerticale=0;keys.clear();accumulator=0;walk=0;for(const l of limbs){l.arm.rotation.x=0;l.leg.rotation.x=0;}hint.textContent='Personnage replacé au centre, sur le cercle.';renderer.render(scene,camera);}
  document.querySelector('#rejouer').onclick=()=>{reset();host.focus();active=true;};
  function step(){
    const before=personnage.position.clone();
    if(active)for(const key of keys)call('deplacer',key);
    personnage.position.x=THREE.MathUtils.clamp(personnage.position.x,-4.3,4.3);
    personnage.position.z=THREE.MathUtils.clamp(personnage.position.z,-2.7,2.7);
    if(active){personnage.position.y=Math.max(0,personnage.position.y+vitesseVerticale);vitesseVerticale=personnage.position.y>0?vitesseVerticale-0.006:0;}
    const moving=Math.hypot(personnage.position.x-before.x,personnage.position.z-before.z)>0.0001;
    if(moving)walk+=0.16;
    for(const l of limbs){l.arm.rotation.x=moving?Math.sin(walk)*0.45*l.side:0;l.leg.rotation.x=moving?-Math.sin(walk)*0.45*l.side:0;}
  }
  function resize(){const width=host.clientWidth||520,height=host.clientHeight||370;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.render(scene,camera);}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
  renderer.setAnimationLoop(now=>{if(!started)return;accumulator+=Math.min(now-last||0,50);last=now;try{while(accumulator>=1000/60){step();accumulator-=1000/60;}renderer.render(scene,camera);}catch(error){renderer.setAnimationLoop(null);hint.textContent='Vérifie ton code : '+error.message;throw error;}});
  window.atelier={
    demarrer(){started=true;showControls();renderer.render(scene,camera);},
    reset,
    observer(){
      const original=personnage.position.clone(),velocity=vitesseVerticale;
      const result={mode:'3d',three:true,revision:THREE.REVISION,isGroup:personnage.isGroup,meshCount:0,x:original.x,moves:{},jump:0};
      personnage.traverse(o=>{if(o.isMesh)result.meshCount++;});
      try{
        for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']){personnage.position.set(0,0,0);call('deplacer',key);result.moves[key]={x:personnage.position.x,z:personnage.position.z};}
        vitesseVerticale=0;call('sauter');result.jump=vitesseVerticale;
      }finally{personnage.position.copy(original);vitesseVerticale=velocity;renderer.render(scene,camera);}
      return result;
    }
  };
  window.addEventListener('pagehide',()=>{resizeObserver.disconnect();renderer.setAnimationLoop(null);scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();renderer.forceContextLoss();},{once:true});
};
