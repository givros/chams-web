const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');const {makeDocument}=require('./engine.js');require('./weather-course.js');const {course}=require('./game-course.js');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const directory=path.resolve('.checks');fs.mkdirSync(directory,{recursive:true});
 const scripts=Object.fromEntries(['platformer-assets.js','platformer-runtime.js'].map(f=>[f,fs.readFileSync(f,'utf8')]));
 const fixture=path.join(directory,'platformer-export.html');fs.writeFileSync(fixture,makeDocument(course[29].solution,{scripts,play:true}));
 const profile=path.join(directory,'platformer-'+crypto.randomUUID());
 const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});let ws;
 try{
  let address;for(let i=0;i<100;i++){try{const [port,endpoint]=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').trim().split(/\r?\n/);address='ws://127.0.0.1:'+port+endpoint;break;}catch{}await delay(100);}
  if(!address)throw Error('Headless Chrome did not start');ws=new WebSocket(address);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let counter=0;const requests=new Map(),events=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=requests.get(m.id);if(p){requests.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}}else events.push(m);};
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++counter;requests.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,sessionId}));});
  const evaluate=async(session,expression)=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},session);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result?.value;};
  const wait=async(session,expression)=>{for(let i=0;i<100;i++){if(await evaluate(session,expression))return;await delay(80);}throw Error('Timeout: '+expression);};
  const open=async url=>{const {targetId}=await send('Target.createTarget',{url});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false},sessionId);return sessionId;};
  const session=await open('file:///'+fixture.replace(/\\/g,'/'));
  await wait(session,'window.atelier?.state.ready');
  const key=async(code,down=true,target=session)=>send('Input.dispatchKeyEvent',{type:down?'keyDown':'keyUp',key:code==='Space'?' ':code,code,windowsVirtualKeyCode:({Space:32,ArrowRight:39,ArrowLeft:37,ShiftLeft:16})[code]},target);
  await evaluate(session,'document.querySelector("canvas").focus()');const start=await evaluate(session,'joueur.x');
  await key('ArrowRight');await delay(240);await key('ArrowRight',false);const walked=await evaluate(session,'joueur.x');assert.ok(walked>start);
  await key('ShiftLeft');await key('ArrowRight');await delay(240);await key('ArrowRight',false);await key('ShiftLeft',false);assert.ok((await evaluate(session,'joueur.x'))-walked>(walked-start)*1.4,'Sprint is faster');
  await key('Space');await delay(150);assert.ok((await evaluate(session,'joueur.y'))<500,'Real keyboard jump');await key('Space',false);await delay(750);assert.equal(await evaluate(session,'joueur.auSol'),true);
  await evaluate(session,'document.querySelector("#rejouer").click()');assert.equal(await evaluate(session,'joueur.x'),128);
  await key('ArrowRight');let won=false;
  for(let i=0;i<400;i++){
   const state=await evaluate(session,'({x:joueur.x,grounded:joueur.auSol,ended:atelier.state.ended,lost:atelier.state.lost,near:atelier.coins.some(c=>c.visible&&c.x>=joueur.x&&c.x-joueur.x<90)||atelier.enemies.some(e=>e.visible&&e.x>=joueur.x-5&&e.x-joueur.x<110)||atelier.platforms.some(p=>p.x>=joueur.x&&p.x-joueur.x<85)})');
   if(state.ended){won=true;break;}if(state.lost)throw Error('Autoplay lost all lives at '+state.x);
   if(state.grounded&&state.near){await key('Space');await key('Space',false);}
   await delay(70);
  }
  await key('ArrowRight',false);assert.ok(won,'Entire level completed with real keyboard events');
  assert.ok(await evaluate(session,'score>=5&&atelier.state.checkpoint'));assert.deepEqual(await evaluate(session,'window.__webLabErrors'),[]);
  fs.writeFileSync(path.join(directory,'platformer-complete.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'},session)).data,'base64'));
  await evaluate(session,'document.querySelector("#rejouer").click()');assert.deepEqual(await evaluate(session,'[score,vies,pointDepart,drapeau.touche,atelier.state.ended]'),[0,3,128,false,false]);
  fs.writeFileSync(path.join(directory,'platformer-start.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'},session)).data,'base64'));
  console.log('Passed standalone export: actual keyboard movement, sprint, jump, entire level, collection, checkpoint, victory, restart, images and no runtime errors.');
  // Exercise pages must use the learner draft, not silently substitute the model.
  const app=await open('http://localhost:3000/');await wait(app,'window.WebLabCourse?.course.length===46');
  const saved={step:29,drafts:{29:{...course[29].solution,js:course[29].solution.js.replace('joueur.x = 128','joueur.x = 96')}},answers:{29:2},validated:{29:true}};
  await evaluate(app,'localStorage.setItem("chams-workshop-v7",'+JSON.stringify(JSON.stringify(saved))+')');await send('Page.reload',{},app);await wait(app,'document.querySelector("#play-finale")&&!document.querySelector("#play-finale").hidden');
  assert.ok(await evaluate(app,'document.querySelector(".lesson-footer").compareDocumentPosition(document.querySelector("#play-finale")) & Node.DOCUMENT_POSITION_FOLLOWING'));
  for(const [url,x] of [['preview.html?step=29',96],['goal.html?project=2d',128]]){
   const page=await open('http://localhost:3000/'+url);await send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:true},page);await send('Runtime.enable',{},page);await send('Page.reload',{},page);
   await wait(page,'document.querySelector("#preview")?.srcdoc.includes("platform-workshop")');
   let child;for(let i=0;i<70;i++){child=events.findLast(e=>e.method==='Target.attachedToTarget'&&e.sessionId===page&&e.params.targetInfo.type==='iframe');if(child)break;await delay(100);}
   if(!child)throw Error('Game iframe not attached');const game=child.params.sessionId;await send('Runtime.enable',{},game);await wait(game,'window.atelier?.state.ready');
   assert.equal(await evaluate(game,'joueur.x'),x,url+' code source');await send('Page.bringToFront',{},page);await evaluate(game,'document.querySelector("canvas").focus()');await key('ArrowRight',true,game);await delay(250);await key('ArrowRight',false,game);assert.ok((await evaluate(game,'joueur.x'))>x,'Own/model page keyboard');assert.deepEqual(await evaluate(game,'window.__webLabErrors'),[]);
   await send('Target.closeTarget',{targetId:child.params.targetInfo.targetId}).catch(()=>{});
  }
  // v6 migration preserves 3D and Web work and starts the new 2D curriculum cleanly.
  const legacy={step:20,drafts:{14:course[14].solution,15:{html:'old collector',css:'',js:'old=true'},20:{html:'Texte conservé',css:'',js:''}},answers:{20:1},validated:{20:true}};
  await evaluate(app,'localStorage.removeItem("chams-workshop-v7");localStorage.setItem("chams-workshop-v6",'+JSON.stringify(JSON.stringify(legacy))+')');await send('Page.reload',{},app);await wait(app,'document.querySelector("#code")?.value==="Texte conservé"');
  const migrated=await evaluate(app,'JSON.parse(localStorage.getItem("chams-workshop-v7"))');assert.equal(migrated.step,31);assert.ok(migrated.drafts[14]);assert.ok(!migrated.drafts[15]);assert.equal(migrated.validated[31],true);
  console.log('Passed own/model pages, actual iframe keyboard, final card order and v6 migration.');
  await send('Browser.close');
 }finally{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:99999,method:'Browser.close'}));await delay(200);ws.close();}browser.kill();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
