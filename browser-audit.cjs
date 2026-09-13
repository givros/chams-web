const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const crypto=require('node:crypto');
const {cases}=require('./audit-cases.cjs');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const directory=path.resolve('.checks');fs.mkdirSync(directory,{recursive:true});
const fixture=path.join(directory,'browser-audit.html');
const script=`const cases=${JSON.stringify(cases).replace(/</g,'\\u003c')};const results=[];
async function check(test){return new Promise(resolve=>{const frame=document.createElement('iframe'),token=crypto.randomUUID();frame.setAttribute('sandbox','allow-scripts');frame.style.cssText='position:fixed;left:-20000px;top:0;width:1200px;height:1400px;border:0;';let timeout;function end(result){clearTimeout(timeout);window.removeEventListener('message',handler);frame.remove();resolve(result);}function handler(event){if(event.source===frame.contentWindow&&event.data.token===token&&event.data.type==='web-lab-check'){const checks=WebLabCourse.validateExercise(test.index,event.data.snapshot,test.code);end({label:test.label,expected:test.expected,actual:checks.every(c=>c.pass),checks});}}window.addEventListener('message',handler);timeout=setTimeout(()=>end({label:test.label,timeout:true}),10000);frame.srcdoc=WebLabEngine.makeDocument(test.code,{check:true,token,base:'http://localhost:3000/'});document.body.append(frame);});}
(async()=>{for(const test of cases){results.push(await check(test));window.auditResult={completed:false,results};}window.auditResult={completed:true,results};})();`;
fs.writeFileSync(fixture,'<!doctype html><meta charset="utf-8"><body><p>Audit des exercices</p><script src="../weather-course.js"></script><script src="../engine.js"></script><script>'+script+'</script>');
async function main(){
  // Serve the harness over loopback HTTP, like the real app. A file:// parent
  // can trigger local-network permission checks on the first image request.
  const harness=require('node:http').createServer((req,res)=>{
    const name=new URL(req.url,'http://localhost').pathname;
    const files={'/audit.html':fixture,'/weather-course.js':path.resolve('weather-course.js'),'/engine.js':path.resolve('engine.js')};
    if(!files[name]){res.writeHead(404);return res.end();}
    res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(files[name]));
  });
  await new Promise(resolve=>harness.listen(0,'127.0.0.1',resolve));
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
    const {targetId}=await send('Target.createTarget',{url:'http://127.0.0.1:'+harness.address().port+'/audit.html'});
    const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    let result;
    for(let attempt=0;attempt<240;attempt++){
      const response=await send('Runtime.evaluate',{expression:'window.auditResult',returnByValue:true},sessionId);
      result=response.result?.value;if(result?.completed)break;await delay(500);
    }
    if(!result?.completed)throw new Error('Audit did not finish: '+(result?.results.length||0)+' cases.');
    fs.writeFileSync(path.join(directory,'browser-audit-result.json'),JSON.stringify(result,null,2));
    const failures=result.results.filter(r=>r.timeout||r.actual!==r.expected);
    console.log(JSON.stringify({cases:result.results.length,passed:result.results.length-failures.length,failures},null,2));
    if(failures.length)process.exitCode=1;
    // Run the actual app: no synthetic verifier messages or mocked layout.
    const appTarget=await send('Target.createTarget',{url:'http://localhost:3000/'});
    const appSession=await send('Target.attachToTarget',{targetId:appTarget.targetId,flatten:true});
    for(let attempt=0;attempt<40;attempt++){const ready=await send('Runtime.evaluate',{expression:'!!document.querySelector("#code") && typeof WebLabCourse!=="undefined" && document.querySelectorAll("[data-step]").length===35',returnByValue:true},appSession.sessionId);if(ready.result?.value)break;await delay(100);}
    const flow=await send('Runtime.evaluate',{awaitPromise:true,returnByValue:true,timeout:90000,expression:`(async()=>{
      const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
      const find=s=>document.querySelector(s);
      const assert=(condition,message)=>{if(!condition)throw new Error(message);};
      assert(WebLabCourse.course[0].mode==='3d', 'Start with the 3D game');
      const completed=[];
      for(let index=0;index<WebLabCourse.course.length;index++){
        const lesson=WebLabCourse.course[index];
        for(const tab of ['html','css','js']){
          const button=find('[data-tab="'+tab+'"]');if(button.hidden)continue;
          button.click();find('#code').value=lesson.solution[tab];find('#code').dispatchEvent(new Event('input',{bubbles:true}));
        }
        find('#check').click();
        for(let attempt=0;attempt<650&&find('#check').disabled;attempt++)await wait(20);
        assert(find('#check-results').textContent.includes('Ton code fait ce qui est demandé.'),'Actual check failed on '+(index+1)+': '+find('#check-results').textContent);
        const wrong=find('#quiz-options input[value="'+((lesson.answer+1)%3)+'"]');wrong.checked=true;wrong.dispatchEvent(new Event('change',{bubbles:true}));
        assert(find('#next').disabled,'Wrong quiz must block step '+(index+1));
        const correct=find('#quiz-options input[value="'+lesson.answer+'"]');correct.checked=true;correct.dispatchEvent(new Event('change',{bubbles:true}));
        assert(!find('#next').disabled,'Correct quiz must unlock step '+(index+1));
        completed.push(index+1);if(index<WebLabCourse.course.length-1)find('#next').click();
      }
      assert(!find('#celebration').hidden,'Completion must appear');
      assert(find('#progress-label').textContent==='35 / 35','Progress must be complete');
      return {completed,progress:find('#progress-label').textContent};
    })()`},appSession.sessionId);
    if(flow.exceptionDetails)throw new Error(flow.exceptionDetails.exception?.description||'Application flow failed');
    console.log('Actual browser app flow: '+JSON.stringify(flow.result.value));
    await send('Page.reload',{},appSession.sessionId);
    let restored=false;
    for(let attempt=0;attempt<50;attempt++){const check=await send('Runtime.evaluate',{expression:'document.querySelector("#progress-label")?.textContent === "35 / 35" && document.querySelector("#code")?.value.includes("Station météo CHAMS")',returnByValue:true},appSession.sessionId);if(check.result?.value){restored=true;break;}await delay(100);}
    if(!restored)throw new Error('Saved code and progress did not survive reload');
    console.log('Actual browser reload: saved code and 35/35 progress restored.');
    await send('Browser.close');
  }finally{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999999,method:'Browser.close'}));await delay(200);ws.close();}browser.kill();harness.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
