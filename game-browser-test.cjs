const fs=require('node:fs');const path=require('node:path');const {spawn}=require('node:child_process');const crypto=require('node:crypto');const {makeDocument}=require('./engine.js');require('./weather-course.js');const {course}=require('./game-course.js');const directory=path.resolve('.checks');fs.mkdirSync(directory,{recursive:true});const delay=ms=>new Promise(r=>setTimeout(r,ms));
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

    for(const index of [18]){
      const fixture=path.join(directory,'play-'+index+'.html');fs.writeFileSync(fixture,makeDocument(course[index].solution));
      const {targetId}=await send('Target.createTarget',{url:'file:///'+fixture.replace(/\\/g,'/')});
      const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
      await send('Emulation.setDeviceMetricsOverride',{width:1000,height:700,deviceScaleFactor:1,mobile:false},sessionId);
      const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result.value;};
      for(let t=0;t<50;t++){if(await evaluate('!!window.atelier'))break;await delay(100);}
      await evaluate('document.querySelector("#terrain").focus()');
      const initial=await evaluate('personnage.x');
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39},sessionId);await delay(250);await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39},sessionId);
      if((await evaluate('personnage.x'))<=initial)throw Error('Real keyboard movement failed');
      if(index===4){await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32},sessionId);await delay(180);if((await evaluate('personnage.y'))<=0)throw Error('Jump failed');await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32},sessionId);}
      const screenshot=await send('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(path.join(directory,'game-'+index+'.png'),Buffer.from(screenshot.data,'base64'));
      await delay(1100);if(index===4&&(await evaluate('personnage.y'))!==0)throw Error('Landing failed');
      const count=index===4?3:5;
      for(let n=0;n<count;n++){
        await evaluate('etoile.x=personnage.x;etoile.z=personnage.z;');
        if(index===4){await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32},sessionId);await delay(100);await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32},sessionId);await delay(900);}else await delay(100);
      }
      if(!(await evaluate('document.querySelector("#notice").textContent.includes("gagné")')))throw Error('Victory failed');
      await evaluate('document.querySelector("#rejouer").click()');if((await evaluate('score'))!==0)throw Error('Restart failed');
      if((await evaluate('window.__webLabErrors.length'))!==0)throw Error('Runtime errors');
      console.log('Passed '+course[index].mode+': keyboard, '+(index===4?'jump, landing, ':'')+'collection, victory, restart, screenshot and zero runtime errors.');
    }
    const app=await send('Target.createTarget',{url:'http://localhost:3000/'});
    const session=await send('Target.attachToTarget',{targetId:app.targetId,flatten:true});
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false},session.sessionId);
    await delay(1500);
    await send('Runtime.evaluate',{expression:'document.querySelector("#theme-toggle").click();document.querySelector(".workspace").scrollIntoView()'},session.sessionId);
    await delay(400);
    const shot=await send('Page.captureScreenshot',{format:'png'},session.sessionId);fs.writeFileSync(path.join(directory,'workshop-games.png'),Buffer.from(shot.data,'base64'));
    await send('Browser.close');
  }finally{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999999,method:'Browser.close'}));await delay(200);ws.close();}browser.kill();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
