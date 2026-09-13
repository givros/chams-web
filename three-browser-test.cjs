const fs=require('node:fs');const path=require('node:path');const {spawn}=require('node:child_process');const crypto=require('node:crypto');const {makeDocument}=require('./engine.js');require('./weather-course.js');const {course,validateExercise}=require('./game-course.js');const directory=path.resolve('.checks');fs.mkdirSync(directory,{recursive:true});const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
  const profile=path.join(directory,'audit-'+crypto.randomUUID());
  const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--enable-unsafe-swiftshader','--use-angle=swiftshader','--enable-webgl','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
  let ws;
  try{
    const portFile=path.join(profile,'DevToolsActivePort');let address;
    for(let attempt=0;attempt<100;attempt++){try{const [port,endpoint]=fs.readFileSync(portFile,'utf8').trim().split(/\r?\n/);address='ws://127.0.0.1:'+port+endpoint;break;}catch{}await delay(100);}
    if(!address)throw new Error('Headless Chrome did not start.');
    ws=new WebSocket(address);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
    let counter=0;const requests=new Map();
    ws.onmessage=event=>{const message=JSON.parse(event.data);if(requests.has(message.id)){const pending=requests.get(message.id);requests.delete(message.id);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result);}};
    const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++counter;requests.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,sessionId}));});


    for(const index of process.env.THREE_PLAY_ONLY?[14]:Array.from({length:15},(_,i)=>i))for(const variant of process.env.THREE_PLAY_ONLY?['solution']:['starter','solution']){
      const code=course[index][variant];const fixture=path.join(directory,'three-'+index+'-'+variant+'.html');
      const scripts=index===14&&variant==='solution'?Object.fromEntries(['three.bundle.js','three-runtime.js'].map(name=>[name,fs.readFileSync(name,'utf8')])):{};
      fs.writeFileSync(fixture,makeDocument(code,Object.keys(scripts).length?{scripts}:{base:'http://localhost:3000/'}));
      const {targetId}=await send('Target.createTarget',{url:'file:///'+fixture.replace(/\\/g,'/')});
      const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
      await send('Emulation.setDeviceMetricsOverride',{width:1000,height:700,deviceScaleFactor:1,mobile:false},sessionId);
      const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result.value;};
      for(let t=0;t<100;t++){if(await evaluate('!!window.atelier'))break;await delay(100);}
      const snapshot=await evaluate('({game:window.atelier?.observer(),errors:window.__webLabErrors})');
      if(!snapshot.game)throw Error('Three.js did not initialize: '+JSON.stringify(snapshot));
      const checks=validateExercise(index,snapshot,code);if(checks.every(c=>c.pass)!==(variant==='solution'))throw Error('Unexpected checks '+index+' '+variant+': '+JSON.stringify(checks));
      if(snapshot.errors.length)throw Error('Runtime error '+snapshot.errors);
      if(index===0&&variant==='solution'){
        await evaluate('document.querySelector("#rejouer").click()');
        await delay(150);
        if(!(await evaluate('personnage.position.x===0 && personnage.position.y===0 && personnage.position.z===0')))throw Error('First lesson reset must return x=2 to the origin');
        const colors=await evaluate('(()=>{const c=document.querySelector("canvas"),gl=c.getContext("webgl2"),pixels=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);const colors=new Set();for(let i=0;i<pixels.length;i+=400)colors.add(pixels.slice(i,i+3).join(","));return colors.size;})()');
        if(colors<15)throw Error('Canvas appears blank: '+colors+' colors');
      }
      if(index===14&&variant==='solution'){
        await evaluate('document.querySelector("#terrain").focus()');
        const key=async(code,type)=>send('Input.dispatchKeyEvent',{type,key:({Space:' ',ShiftLeft:'Shift',KeyQ:'q',KeyE:'e',KeyF:'f'})[code]||code,code,windowsVirtualKeyCode:{ArrowRight:39,ArrowLeft:37,ArrowUp:38,ArrowDown:40,Space:32,ShiftLeft:16,KeyQ:81,KeyE:69,KeyF:70}[code]},sessionId);
        const initial=await evaluate('personnage.position.x');
        await key('ArrowRight','keyDown');await delay(250);await key('ArrowRight','keyUp');if((await evaluate('personnage.position.x'))<=initial)throw Error('Keyboard right failed');
        const right=await evaluate('personnage.position.x');await key('ArrowLeft','keyDown');await delay(250);await key('ArrowLeft','keyUp');if((await evaluate('personnage.position.x'))>=right)throw Error('Keyboard left failed');
        await key('ArrowUp','keyDown');await delay(200);await key('ArrowUp','keyUp');if((await evaluate('personnage.position.z'))>=0)throw Error('Depth movement failed');
        await key('Space','keyDown');await delay(180);await key('Space','keyUp');if((await evaluate('personnage.position.y'))<=0)throw Error('Jump failed');
        const shot=await send('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(path.join(directory,'three-character.png'),Buffer.from(shot.data,'base64'));
        await delay(1100);if((await evaluate('personnage.position.y'))!==0)throw Error('Landing failed');
        await key('ArrowRight','keyDown');await key('Space','keyDown');await delay(180);
        await evaluate('document.querySelector("#rejouer").click()');
        await delay(180);
        if(!(await evaluate('personnage.position.x===0 && personnage.position.y===0 && personnage.position.z===0 && vitesseVerticale===0')))throw Error('Reset must cancel movement and jump and remain at the origin');
        await key('ArrowRight','keyUp');await key('Space','keyUp');
        await key('ArrowRight','keyDown');await delay(180);await key('ArrowRight','keyUp');
        if((await evaluate('personnage.position.x'))<=0)throw Error('Controls must still work after reset');
        const reset=()=>evaluate('document.querySelector("#rejouer").click()');
        const waitUntil=async(expression,timeout=5000)=>{const deadline=Date.now()+timeout;while(Date.now()<deadline){if(await evaluate(expression))return;await delay(40);}throw Error('Not reached: '+expression);};
        const moveTo=async(x,z)=>{for(const [axis,target] of [['x',x],['z',z]]){const start=await evaluate('personnage.position.'+axis);if(Math.abs(start-target)<0.15)continue;const positive=target>start;const code=axis==='x'?(positive?'ArrowRight':'ArrowLeft'):(positive?'ArrowDown':'ArrowUp');await key(code,'keyDown');await waitUntil('personnage.position.'+axis+(positive?'>=':'<=')+(target+(positive?-0.12:0.12)));await key(code,'keyUp');}};
        await reset();await key('ArrowRight','keyDown');await delay(250);await key('ArrowRight','keyUp');const walking=await evaluate('personnage.position.x');
        await reset();await key('ShiftLeft','keyDown');await key('ArrowRight','keyDown');await delay(250);await key('ArrowRight','keyUp');await key('ShiftLeft','keyUp');if((await evaluate('personnage.position.x'))<walking*1.5)throw Error('Shift must increase real movement speed');
        await reset();await key('KeyQ','keyDown');await delay(200);await key('KeyQ','keyUp');if((await evaluate('personnage.rotation.y'))>=0)throw Error('Q rotation failed');const rotated=await evaluate('personnage.rotation.y');await key('KeyE','keyDown');await delay(200);await key('KeyE','keyUp');if((await evaluate('personnage.rotation.y'))<=rotated)throw Error('E rotation failed');
        await reset();await moveTo(-2,1.6);await waitUntil('vie<100');const damaged=await evaluate('vie');
        if((await evaluate('document.querySelector("#health").value'))!==damaged)throw Error('Health bar must track damage');
        await moveTo(2,1.6);await waitUntil('vie>'+damaged);if((await evaluate('vie'))>100)throw Error('Healing exceeds maximum');
        await moveTo(-2,1.6);await waitUntil('vie===0',7000);if(!(await evaluate('document.querySelector("#notice").textContent.includes("Plus de vie")')))throw Error('Defeat message missing');
        await reset();if((await evaluate('vie'))!==100)throw Error('Restart must restore health');
        await moveTo(-2,-1);await waitUntil('score===1');await delay(250);if((await evaluate('score'))!==1)throw Error('Collected object scored twice');
        await moveTo(2,-1);await waitUntil('score===2');await moveTo(0,1.6);await waitUntil('score===3');
        if(!(await evaluate('cible.visible')))throw Error('Target must still need a hit');
        await moveTo(0,0);await key('KeyF','keyDown');await key('KeyF','keyUp');await waitUntil('!cible.visible');
        if(!(await evaluate('document.querySelector("#notice").textContent.includes("gagné")')))throw Error('Final victory did not trigger');
        const completed=await send('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(path.join(directory,'three-complete-game.png'),Buffer.from(completed.data,'base64'));
        await reset();if(!(await evaluate('score===0 && vie===100 && cible.visible')))throw Error('Full game restart did not reset objects');
        console.log('Passed: sprint, Q/E rotation, real pickup without duplicate score, projectile collision, health bar, damage, healing, defeat, victory and restart.');
        console.log('Passed: real Three.js meshes, WebGL pixels, left/right/depth keyboard input, jump, landing, reset and standalone export.');
      }
      await send('Target.closeTarget',{targetId});
    }
    if(!process.env.THREE_PLAY_ONLY)console.log('Passed: all 15 Three.js solutions and rejection of all 15 incomplete starters.');
    const app=await send('Target.createTarget',{url:'http://localhost:3000/'});const session=await send('Target.attachToTarget',{targetId:app.targetId,flatten:true});await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false},session.sessionId);await delay(2000);
    await send('Runtime.evaluate',{expression:'document.querySelector(".workspace").scrollIntoView()'},session.sessionId);await delay(300);
    const shot=await send('Page.captureScreenshot',{format:'png'},session.sessionId);fs.writeFileSync(path.join(directory,'three-workshop.png'),Buffer.from(shot.data,'base64'));
    await send('Browser.close');
  }finally{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999999,method:'Browser.close'}));await delay(200);ws.close();}browser.kill();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
