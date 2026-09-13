const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const {course,validateExercise,target}=require('./weather-course.js');
const {makeDocument,capturePage}=require('./engine.js');

// JSDOM parses real HTML/CSS and executes JS, but does not render pixels.
// Geometry, image decoding and innerText are modeled for these DOM tests.
function layoutShims(window){
  const proto=window.HTMLElement.prototype;
  proto.getClientRects=function(){return window.getComputedStyle(this).display==='none'?[]:[{width:200,height:30}];};
  proto.getBoundingClientRect=function(){return {width:Number(this.getAttribute('width'))||200,height:100};};
  Object.defineProperty(proto,'innerText',{get(){
    function read(node){
      if(node.nodeType===3)return node.textContent.replace(/\s+/g,' ');
      if(['SCRIPT','STYLE'].includes(node.nodeName))return '';
      if(node.nodeName==='BR')return '\n';
      const value=[...node.childNodes].map(read).join('');
      return /^(H1|H2|P|DIV|LI|UL|ARTICLE|MAIN)$/.test(node.nodeName)?'\n'+value+'\n':value;
    }
    return read(this).replace(/ *\n */g,'\n').replace(/\n+/g,'\n').trim();
  }});
  Object.defineProperty(window.HTMLImageElement.prototype,'complete',{get(){return true;}});
  Object.defineProperty(window.HTMLImageElement.prototype,'naturalWidth',{get(){return /(?:station\.png|data:image\/png)/.test(this.src)?1536:0;}});
  proto.scrollIntoView=function(){};
}
function observe(code,noLayout=false){
  const dom=new JSDOM(makeDocument(code),{url:'http://localhost:3000/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse:layoutShims,virtualConsole:new VirtualConsole()});
  const hero=dom.window.document.querySelector('.hero');
  if(noLayout)dom.window.HTMLElement.prototype.getClientRects=()=>[];
  dom.window.__webLabHeroImageLoaded=!!hero&&/url\(["']?(?:\.\/)?mountains\.png["']?\)/.test(dom.window.getComputedStyle(hero).backgroundImage);
  const snapshot=dom.window.eval('('+capturePage.toString()+')()');
  dom.window.close();return snapshot;
}
async function main(){
  assert.equal(course.length,16);
  assert.deepEqual(course[0].starter,{html:'',css:'',js:''});
  assert.ok(validateExercise(4,observe(course[4].solution,true),course[4].solution).every(r=>r.pass),'Deferred iframe geometry must not reject a correct heading');
  const hiddenTitle={...course[4].solution,css:'h1 { display: none; }'};
  assert.equal(validateExercise(4,observe(hiddenTitle),hiddenTitle)[0].pass,false,'Explicitly hidden headings must still fail');
  const screenshotCode={html:'Station météo CHAMS\n<p>Des données pour mieux comprendre notre environnement.</p>',css:'',js:''};
  const screenshotSnapshot=observe(screenshotCode);
  screenshotSnapshot.paragraphs.forEach(p=>{p.visible=false;});
  assert.ok(validateExercise(3,screenshotSnapshot,screenshotCode).every(result=>result.pass),'Correct paragraph must not depend on offscreen layout');
  for(const html of ['Station météo CHAMS\nDes données pour mieux comprendre notre environnement.','Station météo CHAMS\n<p>Des données pour mieux comprendre notre environnement.','Station météo CHAMS\n<p></p>']){
    const code={html,css:'',js:''};
    assert.equal(validateExercise(3,observe(code),code)[0].pass,false,'Missing or empty paragraph must still fail');
  }
  for(let index=0;index<course.length;index++){
    const lesson=course[index];
    const results=validateExercise(index,observe(lesson.solution),lesson.solution);
    assert.ok(results.every(result=>result.pass),'Solution '+(index+1)+': '+JSON.stringify(results));
    const incomplete=validateExercise(index,observe(lesson.starter),lesson.starter);
    assert.ok(incomplete.some(result=>!result.pass),'Starter must not pass: '+(index+1));
    assert.equal(lesson.criteria.length,results.length);
    assert.ok(lesson.responses.every(Boolean)&&lesson.hints.length>=2);
    for(const code of [lesson.starter,lesson.solution])for(const match of makeDocument(code,{check:true,token:'test'}).matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
  }
  const wrongSelector={...course[11].solution,css:course[11].solution.css.replace('.hero {','.not-the-hero {')};
  assert.equal(validateExercise(11,observe(wrongSelector),wrongSelector)[0].pass,false);
  const staticMessage={...course[14].solution,js:'document.querySelector("#message").textContent="Les capteurs mesurent la météo sans clic.";'};
  assert.equal(validateExercise(14,observe(staticMessage),staticMessage)[0].pass,false);
  const brokenImage={...course[6].solution,html:course[6].solution.html.replace('station.png','missing.png')};
  assert.equal(validateExercise(6,observe(brokenImage),brokenImage)[0].pass,false);
  const assets={};for(const file of ['mountains.png','station.png'])assets[file]='data:image/png;base64,'+fs.readFileSync(file).toString('base64');
  const embedded=makeDocument(target,{assets});
  assert.ok(embedded.includes('src="data:image/png;base64,'));
  assert.ok(embedded.includes('url("data:image/png;base64,'));
  assert.ok(!embedded.includes('src="station.png"'));
  assert.ok(!embedded.includes('url("mountains.png")'));
  console.log('Passed: 16 solutions, rejection of incomplete starters, CSS selectors, missing image, real click behavior and standalone image export.');

  const errors=[];
  const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error.message));
  const dom=await JSDOM.fromURL('http://localhost:3000/',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,beforeParse(w){layoutShims(w);w.localStorage.setItem('chams-workshop-v6',JSON.stringify({step:19}));},virtualConsole});
  await new Promise(resolve=>dom.window.addEventListener('load',resolve,{once:true}));
  const window=dom.window,document=window.document,find=selector=>document.querySelector(selector);
  assert.deepEqual(errors,[],'Application must load without script errors');
  assert.equal(window.WebLabCourse.course[0].mode,'3d');
  find('[data-step="19"]').click();
  assert.equal(find('#code').value,'');assert.equal(find('#next').disabled,true);
  assert.equal(find('[data-tab="css"]').hidden,true);assert.equal(find('[data-tab="js"]').hidden,true);
  assert.ok(!/\b(?:2\s*[Hh]|deux heures|\d+ min)\b/.test(document.body.textContent));
  function submitSnapshot(index,code){
    find('#check').click();if(index===3)return;const frame=find('iframe[aria-hidden="true"]');
    const token=JSON.parse(frame.srcdoc.match(/token:("(?:[^"\\]|\\.)*")/)[1]);
    window.dispatchEvent(new window.MessageEvent('message',{source:frame.contentWindow,data:{type:'web-lab-check',token,snapshot:observe(code)}}));
  }
  function answer(index,value=course[index].answer){const radio=find('#quiz-options input[value="'+value+'"]');radio.checked=true;radio.dispatchEvent(new window.Event('change',{bubbles:true}));}
  const first={html:'Station météo CHAMS — notre classe',css:'',js:''};
  find('#code').value=first.html;find('#code').dispatchEvent(new window.Event('input',{bubbles:true}));
  submitSnapshot(0,first);assert.equal(find('#next').disabled,true);
  answer(0,1);assert.equal(find('#next').disabled,true);
  answer(0);assert.equal(find('#next').disabled,false);
  find('#next').click();assert.equal(find('#code').value,first.html,'Keep the student’s first text on step 2');
  for(let i=1;i<course.length;i++){
    const solution=course[i].solution;
    for(const tab of ['html','css','js']){
      const button=find('[data-tab="'+tab+'"]');
      if(!button.hidden){button.click();find('#code').value=solution[tab];find('#code').dispatchEvent(new window.Event('input',{bubbles:true}));}
    }
    submitSnapshot(i,solution);answer(i);
    assert.equal(find('#next').disabled,false,'Step '+(i+1)+' should unlock');
    if(i<course.length-1)find('#next').click();
  }
  assert.equal(find('#celebration').hidden,true);
  assert.equal(find('#progress-label').textContent,'16 / 35');
  const stored=JSON.parse(window.localStorage.getItem('chams-workshop-v6'));
  assert.equal(stored.drafts[19].html,first.html);
  assert.ok(stored.drafts[34].html.includes('Station météo CHAMS'));
  find('[data-step="20"]').click();
  window.confirm=()=>true;find('#reset').click();
  assert.equal(find('#code').value,first.html,'Reset must retain the student’s previous text, not replace it with the model');
  find('[data-step="22"]').click();
  // Reproduce the screenshot and a browser edit with no input event.
  find('#code').value=screenshotCode.html;
  find('#check').click();
  assert.ok(find('#check-results').textContent.includes('Ton code fait ce qui est demandé.'));
  assert.equal(find('#next').disabled,false);
  find('[data-step="19"]').click();assert.equal(find('#code').value,first.html);
  find('#code').value='';find('#code').dispatchEvent(new window.Event('input',{bubbles:true}));
  assert.equal(find('#next').disabled,true,'Editing invalidates old verification');
  find('#example-after').click();assert.equal(find('#code').value,'','The example must not fill in the answer');
  const saved=window.localStorage.getItem('chams-workshop-v6');dom.window.close();
  const restored=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'http://localhost:3000/',runScripts:'outside-only',beforeParse:layoutShims});
  restored.window.localStorage.setItem('chams-workshop-v6',saved);
  for(const file of ['weather-course.js','game-course.js','engine.js','app.js'])restored.window.eval(fs.readFileSync(file,'utf8'));
  assert.equal(restored.window.document.querySelector('#code').value,'');restored.window.close();
  for(const route of ['/','/preview.html','/goal.html','/weather-course.js','/engine.js','/mountains.png','/station.png'])assert.equal((await fetch('http://localhost:3000'+route)).status,200,route);
  assert.equal((await fetch('http://localhost:3000/package.json')).status,404);
  console.log('Passed: full 16-step app flow, blank start, question gating, cumulative code, saved versions, progressive tabs, examples, reload and routes.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
