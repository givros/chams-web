const {course,validateExercise,target}=WebLabCourse;
const {makeDocument}=WebLabEngine;
const KEY='chams-workshop-v6';
const last=course.length-1;
const $=selector=>document.querySelector(selector);
const clone=code=>({html:code.html,css:code.css,js:code.js});
const validCode=code=>code&&['html','css','js'].every(key=>typeof code[key]==='string');
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state={step:0,drafts:{},answers:{},validated:{}};
try {
  let saved=JSON.parse(localStorage.getItem(KEY));
  for(const version of [5,4,3])if(!saved){
    const old=JSON.parse(localStorage.getItem('chams-workshop-v'+version));
    if(old){
      const shift=course.filter(l=>l.mode==='3d').length-5;
      const map=i=>version===3?i+course.findIndex(l=>l.webIndex===0):i<5?i:i+shift;
      saved={step:version===4&&old.step<5?0:map(Number(old.step)||0),drafts:{},answers:{},validated:{}};
      for(const key of ['drafts','answers','validated'])for(const [i,value] of Object.entries(old[key]||{}))if(version!==4||Number(i)>=5)saved[key][map(Number(i))]=value;
      if(version===5)for(let i=0;i<5;i++)if(validCode(saved.drafts[i]))saved.drafts[i]={...saved.drafts[i],html:course[i].starter.html};
    }
  }
  if(saved&&typeof saved==='object'){
    state.step=Number.isInteger(saved.step)&&saved.step>=0&&saved.step<=last?saved.step:0;
    for(let i=0;i<course.length;i++){
      if(validCode(saved.drafts?.[i]))state.drafts[i]=clone(saved.drafts[i]);
      if(Number.isInteger(saved.answers?.[i])&&saved.answers[i]>=0&&saved.answers[i]<3)state.answers[i]=saved.answers[i];
      if(saved.validated?.[i]===true&&state.drafts[i])state.validated[i]=true;
    }
  }
}catch{}
function ensureDraft(index){
  if(!state.drafts[index]){
    const previous=state.drafts[index-1];
    state.drafts[index]=index===0?clone(course[0].starter):course[index].prepare(clone(previous||course[index-1].solution));
  }
  return state.drafts[index];
}
function passed(index){return !!state.validated[index]&&state.answers[index]===course[index].answer;}
const base=new URL('./',location.href).href;
let previewToken='';
function sizePreview(){
  const viewport=$('#preview-viewport');if(!viewport)return;
  const frame=$('#preview');
  if(course[state.step].webIndex>=11){const scale=(viewport.clientWidth||480)/1200;frame.style.cssText='width:1200px;height:1450px;transform-origin:top left;transform:scale('+scale+');';viewport.style.height=Math.ceil(1450*scale)+'px';}
  else if(course[state.step].mode){const height=course[state.step].mode==='3d'&&state.step>=7?540:470;frame.style.cssText='width:100%;height:'+height+'px;';viewport.style.height=height+'px';}
  else{frame.style.cssText='';viewport.style.height='';}
}
function renderPreview(){previewToken=crypto.randomUUID();$('#preview').srcdoc=makeDocument(ensureDraft(state.step),{base,token:previewToken,play:document.body.hasAttribute('data-preview-page')});sizePreview();}
if(document.body.hasAttribute('data-target-page')){
  const project=new URLSearchParams(location.search).get('project');
  const finalLesson=course.findLast(l=>l.mode===project);
  const isGame=!!finalLesson;
  document.title=isGame?'Le jeu '+project.toUpperCase()+' terminé — Web Lab':'Le site CHAMS à construire';
  $('header strong').textContent=isGame?'Le jeu '+project.toUpperCase()+' terminé · Modèle':'Le modèle du site CHAMS';
  $('header span').textContent=isGame?(project==='3d'?'Flèches : marcher · Espace : sauter · Maj : courir · Q/E : tourner · F : lancer':'Clique dans le terrain · Flèches pour collecter les étoiles'):'Les nombres sont des données d’exemple.';
  $('#preview').title=isGame?'Modèle jouable du jeu '+project.toUpperCase():'Modèle final du site CHAMS';
  $('#preview').srcdoc=makeDocument(isGame?finalLesson.solution:target,{base,play:isGame});
}else if(document.body.hasAttribute('data-preview-page')){
  const query=new URLSearchParams(location.search),requested=query.has('step')?Number(query.get('step')):state.step;
  const pinnedStep=Number.isInteger(requested)&&requested>=0&&requested<=last?requested:state.step;
  state.step=pinnedStep;
  const lesson=course[pinnedStep];
  const chapterEnd=lesson.mode&&course.findLastIndex(l=>l.mode===lesson.mode)===pinnedStep;
  $('header strong').textContent=lesson.mode?(chapterEnd?'Mon jeu '+lesson.mode.toUpperCase()+' · Version finale':'Ma version du jeu '+lesson.mode.toUpperCase()+' · Mission '+(pinnedStep+1)):'Ma page Web';
  $('header span').textContent=lesson.mode?'Clique dans le terrain pour tester les touches que tu as programmées.':'Ta page se met à jour quand tu modifies son code.';
  document.title=$('header strong').textContent+' — Web Lab';
  $('#preview').title=$('header strong').textContent;
  if(!state.drafts[pinnedStep]){
    $('header span').textContent='Cette étape n’a pas encore été commencée. Reviens à l’atelier pour créer ta version.';
    $('#preview').hidden=true;
  }else{
  renderPreview();
  }
  window.addEventListener('storage',event=>{if(event.key===KEY&&event.newValue){try{const next=JSON.parse(event.newValue),draft=next.drafts?.[pinnedStep];if(validCode(draft)&&JSON.stringify(draft)!==JSON.stringify(state.drafts[pinnedStep])){state.drafts[pinnedStep]=clone(draft);$('#preview').hidden=false;renderPreview();}}catch{}}});
}else{
  let tab='html',hintCount=0,timer,checkRun=null;
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));$('#save-status').textContent='✓ Ton code est enregistré';}catch{$('#save-status').textContent='Enregistrement indisponible : télécharge ta page pour la garder.';}};
  function lines(){const editor=$('#code');$('#line-numbers').textContent=Array.from({length:editor.value.split('\n').length},(_,i)=>i+1).join('\n');$('#cursor-position').textContent='Ligne '+editor.value.slice(0,editor.selectionStart).split('\n').length;}
  function setTab(value){tab=value;document.querySelectorAll('[data-tab]').forEach(button=>{button.setAttribute('aria-selected',String(button.dataset.tab===tab));button.tabIndex=button.dataset.tab===tab?0:-1;});$('#code').value=ensureDraft(state.step)[tab];$('#code').setAttribute('aria-label','Ton code '+tab.toUpperCase());$('#filename').textContent={html:'index.html',css:'style.css',js:'script.js'}[tab];$('#code').scrollTop=0;$('#line-numbers').scrollTop=0;lines();}
  function navigation(){
    $('#lesson-nav').innerHTML=course.map((lesson,i)=>`${lesson.chapterStart?'<h3 class="chapter-label">'+escapeHtml(lesson.chapter)+'</h3>':''}<button class="nav-step ${i===state.step?'active':''} ${passed(i)?'done':''}" data-step="${i}" ${i===state.step?'aria-current="step"':''} ${i>0&&!lesson.chapterStart&&!state.drafts[i]&&!passed(i-1)?'disabled title="Réussis l’étape précédente pour continuer"':''}><span class="step-number">${passed(i)?'✓':i+1}</span><span class="step-text"><strong>${escapeHtml(lesson.title)}</strong><small>${passed(i)?'Exercice réussi':lesson.chapter+' · '+lesson.tab.toUpperCase()}</small></span></button>`).join('');
    const count=course.filter((_,i)=>passed(i)).length;
    $('#progress-label').textContent=count+' / '+course.length;$('#progress-bar').style.width=count/course.length*100+'%';
    const complete=passed(state.step);$('#next').disabled=!complete;$('#next').textContent=state.step===last?'Télécharger mon site ↓':'Exercice suivant →';
    $('#next-note').textContent=complete?'Exercice réussi. Tu peux continuer.':state.validated[state.step]?'Ton code fonctionne. Réponds à la question pour valider.':'Vérifie ton code et réponds à la question pour valider.';
    $('#takeaway').hidden=!complete;$('#takeaway').textContent='À retenir : '+course[state.step].takeaway;
    $('#celebration').hidden=count!==course.length;
  }
  function example(after){const l=course[state.step];$('#example-before').setAttribute('aria-pressed',String(!after));$('#example-after').setAttribute('aria-pressed',String(after));$('#example-code').textContent=after?l.after:l.before;$('#example-preview').srcdoc=makeDocument(after?l.exampleAfter:l.exampleBefore,{base});}
  function quizFeedback(){const l=course[state.step],answer=state.answers[state.step];$('#quiz-feedback').hidden=answer===undefined;$('#quiz-feedback').textContent=answer===undefined?'':l.responses[answer];$('#quiz-feedback').className=answer===l.answer?'correct':'';}
  function cancelCheck(){if(checkRun){clearTimeout(checkRun.timeout);checkRun.frame.remove();checkRun=null;}$('#check').disabled=false;$('#check').textContent='Vérifier mon code';}
  function showCheckResults(results){
    const successful=results.length>0&&results.every(result=>result.pass);cancelCheck();state.validated[state.step]=successful;
    $('#check-results').innerHTML='<h3>'+(successful?'Ton code fait ce qui est demandé.':'Voilà ce que tu peux corriger :')+'</h3><ul>'+results.map(result=>`<li class="${result.pass?'passed':'needs-work'}"><span class="check-icon" aria-label="${result.pass?'Réussi':'À corriger'}">${result.pass?'✓':'→'}</span><span>${escapeHtml(result.message)}</span></li>`).join('')+'</ul>';
    navigation();save();
  }
  function render(){
    cancelCheck();clearTimeout(timer);const l=course[state.step];ensureDraft(state.step);hintCount=0;
    $('#lesson-kicker').textContent='EXERCICE '+(state.step+1)+' · '+l.topic;$('#lesson-title').textContent=l.title;$('#lesson-objective').textContent=l.objective;$('#explanation').textContent=l.explanation;
    $('#scaffold-note').hidden=!l.scaffold;$('#scaffold-note').textContent=l.scaffold||'';
    for(const [selector,items] of [['#annotations',l.annotations],['#instructions',l.instructions],['#criteria',l.criteria]])$(selector).innerHTML=items.map(item=>'<li>'+escapeHtml(item)+'</li>').join('');
    $('#hints').textContent='';$('#hint').disabled=false;$('#hint').textContent='Un indice';$('#solution').open=false;
    $('#solution-code').innerHTML=(l.tabs||['html','css','js']).filter(key=>l.solution[key]).map(key=>`<h4>${key.toUpperCase()}</h4><pre>${escapeHtml(l.solution[key])}</pre>`).join('');
    $('#challenge').textContent=l.challenge;$('#previous').disabled=state.step===0;
    $('#quiz-question').textContent=l.question;$('#quiz-options').innerHTML=l.options.map((option,i)=>`<label class="quiz-option"><input type="radio" name="answer" value="${i}" ${state.answers[state.step]===i?'checked':''}><span>${escapeHtml(option)}</span></label>`).join('');
    $('#check-results').textContent=state.validated[state.step]?'Ton dernier code a été vérifié avec succès.':'';$('#runtime-error').hidden=true;
    document.querySelectorAll('[data-tab]').forEach(button=>{button.hidden=!l.tabs.includes(button.dataset.tab);});
    $('#editor-instruction').textContent=l.webIndex===0?'Clique ici et écris ta première phrase.':'Modifie le code, puis observe le résultat.';
    $('.preview-panel strong').textContent=l.mode?'Teste ton jeu':'Aperçu de ta page';
    $('.target-link').href=l.mode?'goal.html?project='+l.mode:'goal.html';
    $('.target-link').textContent=l.mode?'Voir le jeu terminé ↗':'Voir le site à construire ↗';
    $('.open-preview').href='preview.html?step='+state.step;
    $('.open-preview').textContent=l.mode?'Jouer à ma version ↗':'Voir ma page ↗';
    $('#play-finale').hidden=!l.mode||course.findLastIndex(lesson=>lesson.mode===l.mode)!==state.step;
    $('#play-own').href='preview.html?step='+state.step;
    $('#play-model').href=l.mode?'goal.html?project='+l.mode:'goal.html';
    $('.preview-caption').textContent=l.mode==='3d'?[
      'Change le nombre dans le code et observe le personnage.',
      'Clique dans le jeu, puis maintiens la flèche droite.',
      'Clique dans le jeu, puis teste les flèches gauche et droite.',
      'Clique dans le jeu, puis teste les quatre flèches.',
      'Clique dans le jeu · Flèches pour marcher · Espace pour sauter'
    ][state.step]||'Clique dans le jeu pour tester la mission : '+l.title:l.mode?'Clique dans le jeu · Flèches pour bouger':'Le résultat change pendant que tu écris.';
    $('#example-preview').style.height=l.mode==='3d'&&state.step>=7?'540px':l.mode?'470px':'';
    setTab(l.tab);example(false);quizFeedback();navigation();renderPreview();save();
  }
  function goTo(index){if(index>0&&!course[index].chapterStart&&!state.drafts[index]&&!passed(index-1))return;state.step=index;render();$('.lesson-header').scrollIntoView({behavior:'smooth',block:'start'});}
  function update(){cancelCheck();state.drafts[state.step][tab]=$('#code').value;state.validated[state.step]=false;$('#check-results').textContent='Le code a changé : vérifie ta nouvelle version.';lines();navigation();save();clearTimeout(timer);timer=setTimeout(()=>{$('#runtime-error').hidden=true;renderPreview();},300);}
  $('#code').addEventListener('input',update);$('#code').addEventListener('click',lines);$('#code').addEventListener('keyup',lines);$('#code').addEventListener('scroll',()=>{$('#line-numbers').scrollTop=$('#code').scrollTop;});
  $('#code').addEventListener('keydown',event=>{if(event.key==='Tab'&&!event.shiftKey){event.preventDefault();const editor=event.target;editor.setRangeText('  ',editor.selectionStart,editor.selectionEnd,'end');update();}});
  document.querySelectorAll('[data-tab]').forEach(button=>{button.onclick=()=>setTab(button.dataset.tab);button.onkeydown=event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();const buttons=[...document.querySelectorAll('[data-tab]')].filter(b=>!b.hidden);const index=buttons.findIndex(b=>b.dataset.tab===tab);const next=buttons[(index+(event.key==='ArrowRight'?1:buttons.length-1))%buttons.length];setTab(next.dataset.tab);next.focus();}};});
  $('#lesson-nav').onclick=event=>{const button=event.target.closest('[data-step]');if(button)goTo(Number(button.dataset.step));};
  $('#previous').onclick=()=>{if(state.step>0)goTo(state.step-1);};
  $('#next').onclick=()=>{if(passed(state.step)){if(state.step<last)goTo(state.step+1);else download();}};
  $('#example-before').onclick=()=>example(false);$('#example-after').onclick=()=>example(true);
  $('#hint').onclick=()=>{const l=course[state.step];if(hintCount<l.hints.length){const paragraph=document.createElement('p');paragraph.textContent='Indice '+(hintCount+1)+' : '+l.hints[hintCount++];$('#hints').append(paragraph);}$('#hint').textContent='Un autre indice';$('#hint').disabled=hintCount>=l.hints.length;};
  $('#locate').onclick=()=>{setTab(course[state.step].tab);const editor=$('#code'),needle=course[state.step].focus,index=needle?editor.value.indexOf(needle):-1;editor.scrollIntoView({behavior:'smooth',block:'center'});editor.focus({preventScroll:true});editor.setSelectionRange(index<0?editor.value.length:index,index<0?editor.value.length:index+needle.length);lines();};
  $('#quiz-options').onchange=event=>{if(event.target.name==='answer'){state.answers[state.step]=Number(event.target.value);quizFeedback();navigation();save();}};
  $('#reset').onclick=()=>{if(confirm('Recommencer cet exercice ? Son code sera remplacé par le point de départ. Les autres exercices seront conservés.')){const previous=state.drafts[state.step-1];state.drafts[state.step]=state.step>0&&previous?course[state.step].prepare(clone(previous)):clone(course[state.step].starter);delete state.validated[state.step];delete state.answers[state.step];render();}};
  $('#check').onclick=()=>{
    // Read what the learner sees now, including edits that did not emit input.
    ensureDraft(state.step)[tab]=$('#code').value;
    state.validated[state.step]=false;
    navigation();save();
    if(course[state.step].webIndex===3){
      const code=clone(ensureDraft(state.step));
      const parsed=new DOMParser().parseFromString(code.html,'text/html');
      const snapshot={paragraphs:[...parsed.querySelectorAll('p')].map(p=>({text:p.textContent||''})),brCount:parsed.querySelectorAll('br').length};
      showCheckResults(validateExercise(state.step,snapshot,code));
      return;
    }
    cancelCheck();const token=crypto.randomUUID(),frame=document.createElement('iframe');frame.title='Vérification isolée de ton exercice';frame.setAttribute('sandbox','allow-scripts');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;frame.style.cssText='position:fixed;left:-20000px;top:0;width:1200px;height:1400px;border:0;';
    const code=clone(ensureDraft(state.step));
    checkRun={token,frame,step:state.step,code,timeout:setTimeout(()=>{cancelCheck();$('#check-results').textContent='La page n’a pas répondu. Vérifie les ressources chargées et les erreurs, puis réessaie.';},10000)};
    $('#check').disabled=true;$('#check').textContent='Je vérifie…';$('#check-results').textContent='Vérification du résultat et des actions…';
    frame.srcdoc=makeDocument(code,{base,token,check:true});document.body.append(frame);
  };
  window.addEventListener('message',event=>{
    const data=event.data;if(!data||typeof data!=='object')return;
    if(event.source===$('#preview').contentWindow&&data.type==='web-lab-error'&&data.token===previewToken){$('#runtime-error').hidden=false;$('#runtime-error').textContent='Le JavaScript ne peut pas terminer son action. Vérifie le nom de l’élément et la ponctuation. Détail du navigateur : '+data.message;}
    if(checkRun&&event.source===checkRun.frame.contentWindow&&data.token===checkRun.token){
      if(data.type==='web-lab-check'){
        const run=checkRun;let results;try{results=validateExercise(run.step,data.snapshot,run.code);}catch{cancelCheck();$('#check-results').textContent='Impossible de lire ce résultat. Vérifie le code puis réessaie.';return;}
        showCheckResults(results);
      }else if(data.type==='web-lab-check-failed'){cancelCheck();$('#check-results').textContent='La structure de la page empêche la vérification. Vérifie les balises puis réessaie.';}
    }
  });
  async function download(){
    const code=ensureDraft(state.step),assets={},scripts={};
    try{if(course[state.step].mode==='3d')await Promise.all(['three.bundle.js','three-runtime.js'].map(async name=>{const response=await fetch(name);if(!response.ok)throw new Error(name);scripts[name]=await response.text();}));await Promise.all(['mountains.png','station.png'].filter(name=>(code.html+code.css).includes(name)).map(async name=>{const response=await fetch(name);if(!response.ok)throw new Error(name);const blob=await response.blob();assets[name]=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});}));}catch{$('#save-status').textContent='Une ressource du projet n’a pas pu être intégrée. Réessaie le téléchargement.';return;}
    const blob=new Blob([makeDocument(code,{assets,scripts})],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=course[state.step].mode?'mon-jeu-'+course[state.step].mode+'.html':state.step===last?'station-meteo-chams.html':'chams-etape-'+(course[state.step].webIndex+1)+'.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const themeToggle=$('#theme-toggle');
  function applyTheme(theme){
    const dark=theme==='dark';document.documentElement.dataset.theme=dark?'dark':'light';
    themeToggle.textContent=dark?'☀ Mode jour':'☾ Mode nuit';
    themeToggle.setAttribute('aria-pressed',String(dark));
  }
  applyTheme(document.documentElement.dataset.theme);
  themeToggle.onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';applyTheme(theme);try{localStorage.setItem('chams-theme',theme);}catch{}};
  window.addEventListener('storage',event=>{if(event.key==='chams-theme')applyTheme(event.newValue);});
  $('#download').onclick=download;$('#download-final').onclick=()=>{goTo(last);download();};
  $('#help').onclick=()=>$('#guide').showModal();$('.close-dialog').onclick=$('.close-guide').onclick=()=>$('#guide').close();
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(sizePreview).observe($('#preview-viewport'));
  render();
}
