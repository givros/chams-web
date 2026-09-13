const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),crypto=require('node:crypto');require('./weather-course');const {course}=require('./game-course');const directory=path.resolve('.checks');const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
  const profile=path.join(directory,'audit-'+crypto.randomUUID());
  const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--enable-unsafe-swiftshader','--use-angle=swiftshader','--enable-webgl','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
  let ws;
  try{
    const portFile=path.join(profile,'DevToolsActivePort');let address;
    for(let attempt=0;attempt<100;attempt++){try{const [port,endpoint]=fs.readFileSync(portFile,'utf8').trim().split(/\r?\n/);address='ws://127.0.0.1:'+port+endpoint;break;}catch{}await delay(100);}
    if(!address)throw new Error('Headless Chrome did not start.');
    ws=new WebSocket(address);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
    const events=[];let counter=0;const requests=new Map();
    ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.method)events.push(message);if(requests.has(message.id)){const pending=requests.get(message.id);requests.delete(message.id);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result);}};
    const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++counter;requests.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,sessionId}));});



    const open=async url=>{const {targetId}=await send('Target.createTarget',{url});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Runtime.enable',{},sessionId);await send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:true},sessionId);await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},sessionId);return sessionId;};
    const evaluate=async(sessionId,expression,contextId)=>{const r=await send('Runtime.evaluate',{expression,contextId,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result.value;};
    const waitFor=async(sessionId,expression)=>{for(let n=0;n<100;n++){try{if(await evaluate(sessionId,expression))return;}catch{}await delay(100);}throw Error('Timed out: '+expression);};
    const app=await open('http://localhost:3000/');await waitFor(app,'document.querySelector(".target-link")?.href.includes("project=3d")');
    if(!(await evaluate(app,'document.querySelector("#play-finale").hidden')))throw Error('Final card must wait for last lesson');
    const draft={...course[4].solution,js:course[4].solution.js.replace('= 2;','= -1;')};
    const saved={step:4,drafts:{4:draft},answers:{},validated:{}};
    await evaluate(app,'localStorage.setItem("chams-workshop-v5",'+JSON.stringify(JSON.stringify(saved))+')');await send('Page.reload',{},app);await waitFor(app,'document.querySelector("#play-finale") && !document.querySelector("#play-finale").hidden');
    const own=await open('http://localhost:3000/preview.html?step=4');await waitFor(own,'document.querySelector("#preview")?.srcdoc.includes("= -1;")');
    const doc=await evaluate(own,'document.querySelector("#preview").srcdoc');
    await evaluate(app,'(()=>{const s=JSON.parse(localStorage.getItem("chams-workshop-v5"));s.step=9;s.drafts[9]={html:"Ma page web",css:"",js:""};localStorage.setItem("chams-workshop-v5",JSON.stringify(s));})()');await delay(300);
    if(await evaluate(own,'document.querySelector("#preview").srcdoc')!==doc)throw Error('Changing chapters must not restart or replace the game');
    await evaluate(app,'(()=>{const s=JSON.parse(localStorage.getItem("chams-workshop-v5"));s.drafts[4].js=s.drafts[4].js.replace("= -1;","= -2;");localStorage.setItem("chams-workshop-v5",JSON.stringify(s));})()');await waitFor(own,'document.querySelector("#preview").srcdoc.includes("= -2;")');
    const model=await open('http://localhost:3000/goal.html?project=3d');await waitFor(model,'document.querySelector("#preview")?.srcdoc.includes("vitesseVerticale = 0.12")');
    // Locate the real default execution context of each sandboxed game frame.
    for(const sessionId of [own,model]){
      await send('Page.bringToFront',{},sessionId);
      let context,gameSession=sessionId,ready=false;
      for(let n=0;n<100;n++){
        const child=events.findLast(e=>e.sessionId===sessionId&&e.method==='Target.attachedToTarget'&&e.params.targetInfo.type==='iframe');
        if(child){gameSession=child.params.sessionId;context=undefined;try{await send('Runtime.enable',{},gameSession);ready=await evaluate(gameSession,'!!window.atelier');}catch{}}
        else{const tree=await send('Page.getFrameTree',{},sessionId);const frame=tree.frameTree.childFrames?.[0]?.frame.id;context=events.filter(e=>e.sessionId===sessionId&&e.method==='Runtime.executionContextCreated').map(e=>e.params.context).findLast(c=>c.auxData?.frameId===frame&&c.auxData?.isDefault)?.id;if(context)try{ready=await evaluate(gameSession,'!!window.atelier',context);}catch{}}
        if(ready)break;await delay(100);
      }
      if(!ready)throw Error('No playable frame context');
      const start=await evaluate(gameSession,'personnage.position.x',context);
      await evaluate(gameSession,'document.querySelector("#terrain").focus()',context);
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39},gameSession);await delay(250);await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39},gameSession);
      if((await evaluate(gameSession,'personnage.position.x',context))<=start)throw Error('Keyboard movement failed on playable page');
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32},gameSession);await delay(180);await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32},gameSession);
      if((await evaluate(gameSession,'personnage.position.y',context))<=0)throw Error('Jump failed on playable page');
      if((await evaluate(gameSession,'document.querySelector("canvas").clientHeight',context))<600)throw Error('Game must use the dedicated page height');
    }
    const after=await evaluate(app,'JSON.parse(localStorage.getItem("chams-workshop-v5")).drafts[4].js');if(!after.includes('= -2;'))throw Error('Model must not change learner code');
    const shot=await send('Page.captureScreenshot',{format:'png'},model);fs.writeFileSync(path.join(directory,'finished-game-page.png'),Buffer.from(shot.data,'base64'));
    console.log('Passed: model link, final chapter card, learner code preservation, pinned project, live code update, full-height Three.js, keyboard movement and jump on both pages.');
    await send('Browser.close');
  }finally{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999999,method:'Browser.close'}));await delay(200);ws.close();}browser.kill();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
