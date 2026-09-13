/* Supplied scene: learner code controls the actual Three.js Group named personnage. */
window.creerAtelier3D = function () {
  const host=document.querySelector('#terrain');
  const hint=document.querySelector('#notice');
  const stage=Number(document.querySelector('.three-workshop').dataset.stage||0);
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
  window.vitesseVerticale=0;window.multiplicateur=1;window.score=0;window.vie=0;
  const crystals=[];
  const crystalGeometry=new THREE.OctahedronGeometry(0.24);
  const crystalMaterial=new THREE.MeshStandardMaterial({color:0x26aada,emissive:0x083c60,roughness:0.3});
  for(const [x,z] of [[-2,-1],[2,-1],[0,1.6]]){const mesh=new THREE.Mesh(crystalGeometry,crystalMaterial);mesh.position.set(x,0.55,z);mesh.castShadow=true;mesh.visible=stage>=7;scene.add(mesh);crystals.push(mesh);}
  window.cible=box(scene,1,1,0.3,0,0.7,2.65,new THREE.MeshStandardMaterial({color:0xf09b30}));cible.visible=stage>=10;
  const hazard=new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.7,0.06,32),new THREE.MeshStandardMaterial({color:0xdd5353,emissive:0x551515}));hazard.position.set(-2,0.03,1.6);hazard.visible=stage>=12;scene.add(hazard);
  const potion=new THREE.Group();box(potion,0.4,0.6,0.4,0,0.4,0,new THREE.MeshStandardMaterial({color:0x51c88d}));box(potion,0.12,0.35,0.025,0,0.4,0.21,materials.shoe);box(potion,0.3,0.12,0.025,0,0.4,0.215,materials.shoe);potion.position.set(2,0,1.6);potion.visible=stage>=13;scene.add(potion);
  const hud=document.createElement('div');hud.id='game-hud';hud.hidden=stage<8;
  hud.style.cssText='display:flex;gap:16px;align-items:center;flex-wrap:wrap;font:12px system-ui;margin:8px 0;';
  if(hud.hidden)hud.style.display='none';
  hud.innerHTML='<span id="crystal-score"></span><span id="target-state"></span><label id="health-label">Vie <progress id="health" max="100" value="0"></progress> <span id="health-text"></span></label>';
  host.before(hud);document.querySelector('#health-label').hidden=stage<11;
  const projectiles=[];
  window.creerProjectile=speed=>{
    if(!Number.isFinite(speed)||speed<=0||speed>0.3)throw new Error('Choisis une vitesse de projectile entre 0 et 0.3.');
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(0.12,12,8),new THREE.MeshStandardMaterial({color:0x8058dc,emissive:0x291150}));
    mesh.position.copy(personnage.position);mesh.position.y+=0.85;scene.add(mesh);
    projectiles.push({mesh,direction:new THREE.Vector3(0,0,1).applyQuaternion(personnage.quaternion),speed,age:0});
  };
  const removeProjectile=index=>{const [p]=projectiles.splice(index,1);scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();};
  const keys=new Set();let started=false,active=false,last=0,accumulator=0,walk=0,damageCooldown=0,shotCooldown=0,ended=false,initialHealth=0;
  const call=(name,...args)=>{if(typeof window[name]==='function')return window[name](...args);};
  const showControls=()=>{if(ended)return;hint.textContent=stage>=14?'Objectif : 3 cristaux + la cible. Évite la zone rouge ; le soin vert rend de la vie.':typeof window.deplacer==='function'?'Flèches : marcher'+(stage>=4?' · Espace : sauter':'')+(stage>=5?' · Maj : courir':'')+(stage>=6?' · Q/E : tourner':'')+(stage>=9?' · F : lancer':''):'Modifie le nombre dans le code pour déplacer ton personnage.';};
  host.addEventListener('pointerdown',()=>{host.focus();active=true;showControls();});
  host.addEventListener('keydown',event=>{
    const key=['q','e','f'].includes(event.key?.toLowerCase())?event.key.toLowerCase():event.code;
    if(!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Space','ShiftLeft','ShiftRight','q','e','f'].includes(key))return;
    event.preventDefault();if(ended)return;active=true;keys.add(key);showControls();
    if(event.code==='Space'&&!event.repeat&&personnage.position.y===0)call('sauter');
    if(key==='f'&&!event.repeat&&shotCooldown===0){call('lancer');shotCooldown=15;}
  });
  host.addEventListener('keyup',event=>{keys.delete(event.code);keys.delete(event.key?.toLowerCase());});
  const pause=()=>{keys.clear();active=false;};host.addEventListener('blur',pause);window.addEventListener('blur',pause);
  function reset(){personnage.position.set(0,0,0);personnage.rotation.y=0;vitesseVerticale=0;multiplicateur=1;score=0;vie=initialHealth;ended=false;damageCooldown=0;shotCooldown=0;keys.clear();accumulator=0;walk=0;crystals.forEach(c=>c.visible=stage>=7);cible.visible=stage>=10;potion.visible=stage>=13;while(projectiles.length)removeProjectile(0);for(const l of limbs){l.arm.rotation.x=0;l.leg.rotation.x=0;}hint.textContent='Personnage replacé au centre, sur le cercle.';updateHud();renderer.render(scene,camera);}
  document.querySelector('#rejouer').onclick=()=>{reset();host.focus();active=true;};
  if(stage>=7)document.querySelector('#rejouer').textContent='Recommencer la partie';
  function updateHud(){document.querySelector('#crystal-score').textContent='Cristaux : '+score+' / 3';document.querySelector('#target-state').textContent=stage>=10?'Cible : '+(cible.visible?'à toucher':'touchée'):'';document.querySelector('#health').value=vie;document.querySelector('#health-text').textContent=vie+' / 100';}
  function step(){
    if(ended)return;
    const before=personnage.position.clone();
    multiplicateur=1;
    if(active){if(keys.has('ShiftLeft')||keys.has('ShiftRight'))call('courir');for(const key of keys){call('deplacer',key);call('tourner',key);}personnage.position.x=before.x+(personnage.position.x-before.x)*multiplicateur;personnage.position.z=before.z+(personnage.position.z-before.z)*multiplicateur;}
    personnage.position.x=THREE.MathUtils.clamp(personnage.position.x,-4.3,4.3);
    personnage.position.z=THREE.MathUtils.clamp(personnage.position.z,-2.7,2.7);
    if(active){personnage.position.y=Math.max(0,personnage.position.y+vitesseVerticale);vitesseVerticale=personnage.position.y>0?vitesseVerticale-0.006:0;}
    const moving=Math.hypot(personnage.position.x-before.x,personnage.position.z-before.z)>0.0001;
    if(moving)walk+=0.16;
    for(const l of limbs){l.arm.rotation.x=moving?Math.sin(walk)*0.45*l.side:0;l.leg.rotation.x=moving?-Math.sin(walk)*0.45*l.side:0;}
    if(active){
      shotCooldown=Math.max(0,shotCooldown-1);damageCooldown=Math.max(0,damageCooldown-1);
      if(stage>=7)for(const c of crystals)if(c.visible&&Math.hypot(personnage.position.x-c.position.x,personnage.position.z-c.position.z)<0.55&&personnage.position.y<0.6)call('ramasser',c);
      for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.mesh.position.addScaledVector(p.direction,p.speed);p.age++;if(cible.visible&&p.mesh.position.distanceTo(cible.position)<0.7){call('toucher',cible);removeProjectile(i);}else if(p.age>180)removeProjectile(i);}
      if(stage>=12&&damageCooldown===0&&personnage.position.y<0.35&&Math.hypot(personnage.position.x+2,personnage.position.z-1.6)<0.75){call('recevoirDegats');damageCooldown=60;}
      if(stage>=13&&potion.visible&&vie<100&&Math.hypot(personnage.position.x-2,personnage.position.z-1.6)<0.6){const beforeHealth=vie;call('soigner');if(vie>beforeHealth)potion.visible=false;}
      if(stage>=12&&vie<=0){ended=true;keys.clear();hint.textContent='Plus de vie ! Clique sur Recommencer la partie pour réessayer.';}
      else if(stage>=14&&call('victoire')===true){ended=true;keys.clear();hint.textContent='Bravo ! Trois cristaux et une cible touchée : tu as gagné !';}
    }
    updateHud();
  }
  function resize(){const width=host.clientWidth||520,height=host.clientHeight||370;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.render(scene,camera);}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
  renderer.setAnimationLoop(now=>{if(!started)return;accumulator+=Math.min(now-last||0,50);last=now;try{while(accumulator>=1000/60){step();accumulator-=1000/60;}renderer.render(scene,camera);}catch(error){renderer.setAnimationLoop(null);hint.textContent='Vérifie ton code : '+error.message;throw error;}});
  window.atelier={
    demarrer(){initialHealth=vie;started=true;showControls();updateHud();renderer.render(scene,camera);},
    reset,
    observer(){
      const original=personnage.position.clone(),velocity=vitesseVerticale,rotation=personnage.rotation.y,oldScore=score,oldHealth=vie,oldMultiplier=multiplicateur,oldTarget=cible.visible,projectileCount=projectiles.length;
      const result={mode:'3d',three:true,revision:THREE.REVISION,isGroup:personnage.isGroup,meshCount:0,x:original.x,moves:{},jump:0};
      personnage.traverse(o=>{if(o.isMesh)result.meshCount++;});
      try{
        for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']){personnage.position.set(0,0,0);call('deplacer',key);result.moves[key]={x:personnage.position.x,z:personnage.position.z};}
        vitesseVerticale=0;call('sauter');result.jump=vitesseVerticale;
        multiplicateur=1;call('courir');result.sprint=multiplicateur;
        personnage.rotation.y=0;call('tourner','q');result.turnLeft=personnage.rotation.y;personnage.rotation.y=0;call('tourner','e');result.turnRight=personnage.rotation.y;
        const item={visible:true};score=0;call('ramasser',item);result.collected=!item.visible;result.reward=score;
        call('lancer');result.projectileSpeed=projectiles.at(-1)?.speed||0;
        const testTarget={visible:true};call('toucher',testTarget);result.targetHit=!testTarget.visible;
        result.health=oldHealth;result.healthBar=!document.querySelector('#health-label').hidden;
        vie=100;call('recevoirDegats');result.damageHealth=vie;vie=10;call('recevoirDegats');result.lowHealth=vie;
        vie=50;call('soigner');result.healed=vie;vie=95;call('soigner');result.cappedHeal=vie;
        result.wins=[];for(const [points,visible] of [[2,false],[3,true],[3,false],[4,false]]){score=points;cible.visible=visible;result.wins.push({score:points,targetVisible:visible,won:call('victoire')===true});}
      }finally{personnage.position.copy(original);personnage.rotation.y=rotation;vitesseVerticale=velocity;score=oldScore;vie=oldHealth;multiplicateur=oldMultiplier;cible.visible=oldTarget;while(projectiles.length>projectileCount)removeProjectile(projectiles.length-1);updateHud();renderer.render(scene,camera);}
      return result;
    }
  };
  window.addEventListener('pagehide',()=>{resizeObserver.disconnect();renderer.setAnimationLoop(null);scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();renderer.forceContextLoss();},{once:true});
};
