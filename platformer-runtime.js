/* The drawing and collision engine is supplied; learners write the game rules. */
(function(root){
function createPlatformer(w, options={}){
  const stage=options.stage??Number(w.document?.querySelector('.platform-workshop')?.dataset.stage||0);
  const T=32, WIDTH=3200, HEIGHT=640;
  const platforms=[[20,4],[29,4],[55,4],[64,3],[73,5],[83,4]].map(([column,length])=>({x:column*T,y:15*T,width:length*T}));
  const blocks=[['SAFE_START',0,10],['COLLECTIBLE_INTRO',10,19],['PLATFORM_INTRO',19,34],['ENEMY_INTRO',34,53],['PLATFORM_CHALLENGE',53,100]];
  const tiles=Array.from({length:20},()=>Array(100).fill(null));
  for(let x=0;x<100;x++){tiles[18][x]='ground';tiles[19][x]='body';}
  for(let x=40;x<=48;x++){tiles[17][x]=x===40?'slope-up':x===48?'slope-down':'ground';tiles[18][x]='body';}
  platforms.forEach(p=>{for(let x=p.x/T;x<(p.x+p.width)/T;x++)tiles[15][x]='ground';});
  const groundAt=x=>x>=1280&&x<1312?576-(x-1280):x>=1312&&x<1536?544:x>=1536&&x<1568?544+(x-1536):576;
  w.joueur={x:64,y:512,vitesseY:0,auSol:true};w.gravite=stage>=4?0:.55;w.multiplicateur=1;w.score=0;w.vies=3;w.pointDepart=64;
  w.niveau={plateformes:false};w.drapeau={touche:false};
  let keys=new Set(),playing=false,ended=false,lost=false,invincible=0,camera=0,facing=1,initial=null,checkpoint=false,frames=0;
  const coins=[...[10,12,14,16,18].map(c=>({x:c*T,y:15*T,category:'EASY_COLLECTIBLE'})),...platforms.flatMap(p=>[1,2].map(c=>({x:p.x+c*T,y:12*T,category:'REWARD_COLLECTIBLE'}))),...[43,46,90,92].map(c=>({x:c*T,y:(c<50?14:15)*T,category:'GUIDANCE_COLLECTIBLE'}))].map(c=>({...c,visible:true}));
  const enemies=[{x:1120,min:1088,max:1216},{x:1856,min:1792,max:1952},{x:2240,min:2176,max:2304},{x:2816,min:2784,max:2944}].map(e=>({...e,y:544,direction:1,visible:true,origin:e.x}));
  const call=(name,...args)=>typeof w[name]==='function'?w[name](...args):undefined;
  const notice=w.document?.querySelector('#notice'),hud=w.document?.querySelector('#score'),canvas=w.document?.querySelector('canvas');
  const ctx=canvas?.getContext('2d'),images={};let ready=false;
  const message=text=>{if(notice)notice.textContent=text;};
  function reset(){
    Object.assign(w.joueur,{x:initial?.x??64,y:512,vitesseY:0,auSol:true});
    w.joueur.y=groundAt(w.joueur.x+16)-64;w.score=0;w.vies=initial?.vies??3;w.pointDepart=w.joueur.x;w.drapeau.touche=false;
    coins.forEach(c=>c.visible=true);enemies.forEach(e=>Object.assign(e,{x:e.origin,visible:true,direction:1}));
    checkpoint=false;ended=false;lost=false;invincible=0;camera=0;keys.clear();message('Clique dans le niveau pour jouer.');render();
  }
  function respawn(){Object.assign(w.joueur,{x:w.pointDepart,y:groundAt(w.pointDepart+16)-64,vitesseY:0,auSol:true});invincible=100;keys.delete('Space');}
  function jump(){if(!ended&&!lost){call('sauter');if(w.joueur.vitesseY<0)w.joueur.auSol=false;}}
  function tick(){
    if(ended||lost)return;
    frames++;if(invincible>0)invincible--;
    const p=w.joueur,previousX=p.x,oldFeet=p.y+64,wasGrounded=p.auSol;
    w.multiplicateur=1;if(keys.has('ShiftLeft')||keys.has('ShiftRight'))call('courir');
    if(keys.has('ArrowRight'))call('deplacer','ArrowRight');
    if(keys.has('ArrowLeft'))call('deplacer','ArrowLeft');
    p.x=previousX+(p.x-previousX)*w.multiplicateur;
    p.x=Math.max(0,Math.min(stage<7?768:WIDTH-32,p.x));
    if(p.x!==previousX)facing=Math.sign(p.x-previousX);
    p.vitesseY=Math.min(16,p.vitesseY+w.gravite);p.y+=p.vitesseY;p.auSol=false;
    let floor=groundAt(p.x+16);
    if(stage>=7&&w.niveau.plateformes&&p.vitesseY>=0)for(const platform of platforms){
      if(p.x+26>platform.x&&p.x+6<platform.x+platform.width&&oldFeet<=platform.y+.1&&p.y+64>=platform.y)floor=Math.min(floor,platform.y);
    }
    if(p.vitesseY>=0&&(p.y+64>=floor||(wasGrounded&&Math.abs(oldFeet-floor)<=8))){p.y=floor-64;p.vitesseY=0;p.auSol=true;}
    if(![p.x,p.y,p.vitesseY].every(Number.isFinite))throw Error('Une position doit être un nombre. Vérifie les valeurs de ton code.');
    if(p.y<-180){p.y=-180;p.vitesseY=0;message('Ton personnage est très haut : vérifie le saut et la gravité.');}
    if(stage>=8)for(const coin of coins)if(coin.visible&&overlap(p,coin,32,32))call('ramasser',coin);
    if(stage>=10)for(const enemy of enemies){
      if(!enemy.visible)continue;call('avancerEnnemi',enemy);
      if(enemy.x>=enemy.max){enemy.x=enemy.max;enemy.direction=-1;}if(enemy.x<=enemy.min){enemy.x=enemy.min;enemy.direction=1;}
      enemy.y=groundAt(enemy.x+16)-32;
      if(overlap(p,enemy,32,32)){
        if(p.vitesseY>0&&oldFeet<=enemy.y+14){call('ecraser',enemy);if(enemy.visible){p.y=enemy.y-64;p.vitesseY=-8;}}
        else if(stage>=12&&invincible===0){call('recevoirDegats');if(w.vies<=0){lost=true;message('Plus de vies ! Clique sur Recommencer pour réessayer.');keys.clear();}else{respawn();message('Aïe ! Retour au dernier point de départ.');}}
      }
    }
    if(stage>=13&&!checkpoint&&Math.abs(p.x-1664)<36){call('activerCheckpoint',{x:1664});if(w.pointDepart===1664){checkpoint=true;message('Point de reprise activé !');}}
    if(stage>=14){w.drapeau.touche=p.x+32>=3072;if(call('victoire')===true){ended=true;keys.clear();message('Niveau terminé ! Ton code fait fonctionner tout ce jeu.');}else if(w.drapeau.touche)message('Drapeau atteint : il faut au moins 5 pièces et une règle de victoire correcte.');}
  }
  function overlap(p,o,width,height){return p.x+26>o.x+3&&p.x+6<o.x+width-3&&p.y+62>o.y+2&&p.y+5<o.y+height;}
  function observer(){
    const saved={p:{...w.joueur},score:w.score,vies:w.vies,m:w.multiplicateur,point:w.pointDepart,flag:w.drapeau.touche};
    const r={platformer:true,x:w.joueur.x,gravity:w.gravite,platforms:w.niveau.plateformes,moves:{}};
    try{
      for(const key of ['ArrowRight','ArrowLeft']){w.joueur.x=200;call('deplacer',key);r.moves[key]=w.joueur.x-200;}
      w.joueur.auSol=true;w.joueur.vitesseY=0;call('sauter');r.jump=w.joueur.vitesseY;
      w.joueur.auSol=false;w.joueur.vitesseY=3;call('sauter');r.airJump=w.joueur.vitesseY;
      w.multiplicateur=1;call('courir');r.sprint=w.multiplicateur;
      const coin={visible:true};w.score=0;call('ramasser',coin);r.collected=!coin.visible;r.reward=w.score;
      r.patrol=[-1,1].map(direction=>{const e={x:100,direction};call('avancerEnnemi',e);return e.x-100;});
      const enemy={visible:true};w.joueur.vitesseY=3;call('ecraser',enemy);r.stomp=!enemy.visible;r.bounce=w.joueur.vitesseY;
      w.vies=3;call('recevoirDegats');r.damage=w.vies;w.vies=0;call('recevoirDegats');r.minimumLives=w.vies;
      w.pointDepart=64;call('activerCheckpoint',{x:1664});r.checkpoint=w.pointDepart;
      r.wins=[];for(const score of [0,4,5,6])for(const touched of [false,true]){w.score=score;w.drapeau.touche=touched;r.wins.push({score,touched,won:call('victoire')===true});}
    }finally{Object.assign(w.joueur,saved.p);w.score=saved.score;w.vies=saved.vies;w.multiplicateur=saved.m;w.pointDepart=saved.point;w.drapeau.touche=saved.flag;}
    return r;
  }
  function render(){
    if(hud)hud.textContent=(stage>=9?'Pièces : '+w.score+' / '+coins.length+' · ':'')+(stage>=12?'Vies : '+w.vies+' / 3 · ':'')+'Parcours : '+(ended?100:Math.min(99,Math.round(w.joueur.x/3072*100)))+' %';
    if(!ctx||!ready)return;
    const rect=canvas.getBoundingClientRect(),scale=Math.max(.1,rect.height/HEIGHT),viewWidth=Math.max(640,rect.width/scale);
    const pixelRatio=Math.min(w.devicePixelRatio||1,2);const width=Math.round(rect.width*pixelRatio),height=Math.round(rect.height*pixelRatio);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    const s=height/HEIGHT;ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,width,height);
    camera=Math.max(0,Math.min(WIDTH-viewWidth,w.joueur.x-viewWidth*.38));
    const draw=(name,x,y,iw=32,ih=32,flip=false)=>{const img=images[name];if(!img)return;const left=Math.round((x-camera)*s),right=Math.round((x+iw-camera)*s),top=Math.round(y*s),bottom=Math.round((y+ih)*s);ctx.save();if(flip){ctx.translate(right,top);ctx.scale(-1,1);ctx.drawImage(img,0,0,right-left,bottom-top);}else ctx.drawImage(img,left,top,right-left,bottom-top);ctx.restore();};
    ctx.drawImage(images.background,Math.round(-camera*.22*s),0,Math.round(3200*s),height);
    for(let row=0;row<20;row++)for(let col=Math.max(0,Math.floor(camera/T));col<Math.min(100,Math.ceil((camera+viewWidth)/T)+1);col++){
      if(row===15&&(!w.niveau.plateformes||stage<7))continue;const tile=tiles[row][col];if(tile)draw(tile,col*T,row*T);
    }
    if(stage>=8)coins.filter(c=>c.visible).forEach(c=>draw('coin',c.x,c.y));
    if(stage>=10)enemies.filter(e=>e.visible).forEach(e=>draw('enemy',e.x,e.y,32,32,e.direction>0));
    if(stage>=13){draw('flag',1664,480,32,96);label(checkpoint?'REPRISE ACTIVÉE':'POINT DE REPRISE',1664,465);}
    if(stage>=14){draw('flag',3072,448,43,128);label('ARRIVÉE · 5 PIÈCES',3060,430);}
    if(invincible%12<7)draw('hero',w.joueur.x,w.joueur.y,32,64,facing<0);
    if(ended||lost){ctx.fillStyle='#142f38df';ctx.fillRect(0,height*.26,width,height*.32);ctx.fillStyle='#fff7da';ctx.font='bold '+Math.max(20,28*s)+'px system-ui';ctx.textAlign='center';ctx.fillText(ended?'Niveau terminé !':'Essaie encore !',width/2,height*.40);ctx.font=Math.max(13,17*s)+'px system-ui';ctx.fillText(ended?w.score+' pièces · '+w.vies+' vies restantes':'Recommencer remet les 3 vies et les pièces.',width/2,height*.49);}
    function label(text,x,y){ctx.font='bold '+Math.max(10,13*s)+'px system-ui';ctx.textAlign='center';const px=Math.round((x-camera)*s);const tw=ctx.measureText(text).width;ctx.fillStyle='#163b43dd';ctx.fillRect(px-tw/2-7,y*s-14,tw+14,20);ctx.fillStyle='#fff';ctx.fillText(text,px,y*s);}
  }
  function demarrer(){initial={x:w.joueur.x,vies:w.vies};w.pointDepart=w.joueur.x;w.joueur.y=groundAt(w.joueur.x+16)-64;render();}
  const api={observer,demarrer,reset,tick,jump,keys,groundAt,tiles,platforms,blocks,coins,enemies,render,get state(){return {ended,lost,camera,checkpoint,invincible,ready,stage,frames};}};
  w.atelier=api;
  if(canvas){
    Promise.all(Object.entries(w.PlatformerAssets||{}).map(([name,src])=>new Promise((resolve,reject)=>{const img=new w.Image();img.onload=()=>{images[name]=img;resolve();};img.onerror=()=>reject(Error('Une image du niveau ne charge pas.'));img.src=src;}))).then(()=>{ready=true;render();}).catch(e=>message(e.message));
    const normalize=code=>({KeyD:'ArrowRight',KeyA:'ArrowLeft',KeyQ:'ArrowLeft',ArrowUp:'Space',KeyW:'Space',KeyZ:'Space'}[code]||code);
    canvas.addEventListener('pointerdown',()=>{canvas.focus();playing=true;message('← → ou Q/D : marcher · Espace : sauter · Maj : courir');});
    canvas.addEventListener('keydown',e=>{const key=normalize(e.code);if(['ArrowRight','ArrowLeft','Space','ShiftLeft','ShiftRight'].includes(key)){e.preventDefault();playing=true;keys.add(key);if(key==='Space'&&!e.repeat)jump();}});
    canvas.addEventListener('keyup',e=>keys.delete(normalize(e.code)));
    const pause=()=>{keys.clear();playing=false;};canvas.addEventListener('blur',pause);w.addEventListener('blur',pause);
    w.document.querySelector('#rejouer').onclick=()=>{reset();canvas.focus();playing=true;};
    let last=0,acc=0;function loop(now){acc+=Math.min(50,now-last||0);last=now;try{while(acc>=1000/60){if(playing)tick();acc-=1000/60;}render();}catch(e){playing=false;message('Vérifie ton code : '+e.message);w.__webLabErrors?.push(e.message);}w.requestAnimationFrame(loop);}w.requestAnimationFrame(loop);
  }
  return api;
}
root.creerAtelier2D=()=>createPlatformer(root);
if(typeof module!=='undefined')module.exports={createPlatformer};
})(typeof window!=='undefined'?window:globalThis);
