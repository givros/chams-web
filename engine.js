(() => {
/* This function runs inside the isolated preview and observes the rendered page. */
function capturePage() {
  const all = selector => [...document.querySelectorAll(selector)];
  const text = el => (el?.textContent || '').trim();
  const visible = el => {
    // Offscreen verification frames can defer geometry; that does not make
    // correctly authored content hidden. Only explicit CSS hiding matters.
    if(!el) return false;
    for(let current=el;current;current=current.parentElement) {
      const style=getComputedStyle(current);
      if(style.display==='none'||style.visibility==='hidden'||style.opacity==='0') return false;
    }
    return true;
  };
  const style = selector => { const el=document.querySelector(selector);return el?getComputedStyle(el):null; };
  const titleStyle=style('h1'), card=style('.card'), tiles=style('.tiles');
  const body=style('body'), hero=style('.hero'), metrics=style('.metrics'), station=style('.station'), table=style('table');
  const snapshot={
    bodyText:document.body.innerText,
    brCount:all('br').length,
    headings:all('h1,h2').map(el=>({tag:el.tagName,text:text(el),visible:visible(el)})),
    paragraphs:all('p').map(el=>({text:text(el),id:el.id,visible:visible(el)})),
    strongInParagraph:all('p strong').filter(visible).map(text),
    lists:all('ul,ol').filter(visible).map(el=>({tag:el.tagName,items:[...el.children].filter(li=>li.tagName==='LI'&&visible(li)).map(text)})),
    images:all('img').map(el=>({src:el.getAttribute('src')||'',alt:el.alt,loaded:el.complete&&el.naturalWidth>0,visible:visible(el),width:el.getBoundingClientRect().width})),
    links:all('a').map(el=>{const href=el.getAttribute('href')||'';let valid=false;try{valid=href.startsWith('#')?!!document.getElementById(decodeURIComponent(href.slice(1))):/^https?:\/\//i.test(href)&&!!new URL(href).hostname;}catch{}return {href,text:text(el),valid,visible:visible(el),inNav:!!el.closest('.site-header nav'),inUseful:!!el.closest('.useful-links'),inUsefulList:el.matches('.useful-links > ul > li > a')};}),
    metrics:all('.metric').map(el=>({value:text(el.querySelector('.value')),kind:['temperature','humidity','pressure','conditions'].find(name=>el.classList.contains(name)),visible:visible(el)})),
    usefulLinkCount:all('.useful-links > ul > li > a').length,
    tableRows:all('tbody tr').map(row=>[...row.cells].map(text)),
    tableHeadings:all('thead th').length,
    footerText:text(document.querySelector('footer')),
    styles:{titleColor:titleStyle?.color,titleSize:titleStyle?.fontSize,background:getComputedStyle(document.body).backgroundColor,padding:card?['Top','Right','Bottom','Left'].map(side=>card['padding'+side]):null,margin:card?['Top','Right','Bottom','Left'].map(side=>card['margin'+side]):null,radius:card?.borderTopLeftRadius,display:tiles?.display,direction:tiles?.flexDirection,gap:tiles?.gap,justify:tiles?.justifyContent},
    errors:[...window.__webLabErrors],interaction:{exists:false,before:'',after:''}
  };
  Object.assign(snapshot.styles,{bodyFont:body?.fontFamily,bodyColor:body?.color,bodyMargin:body?['Top','Right','Bottom','Left'].map(side=>body['margin'+side]):null,heroImage:hero?.backgroundImage,heroImageLoaded:window.__webLabHeroImageLoaded===true,heroPadding:hero?.paddingTop,heroColor:hero?.color,metricsDisplay:metrics?.display,metricsDirection:metrics?.flexDirection||'row',metricsGap:metrics?.gap,stationDisplay:station?.display,stationColumns:station?.gridTemplateColumns,tableCollapse:table?.borderCollapse});
  const button=document.querySelector('button#hello'), message=document.querySelector('#message');
  if(button&&message&&visible(button)){
    snapshot.interaction={exists:true,before:text(message),after:''};
    try{button.click();}catch(error){window.__webLabErrors.push(error.message);}
    snapshot.interaction.after=text(message);
    snapshot.interaction.visible=visible(message);
  }
  if(window.atelier){snapshot.game=window.atelier.observer();snapshot.game.validColor=CSS.supports('color',snapshot.game.color);}
  snapshot.errors=[...window.__webLabErrors];
  return snapshot;
}

async function prepareObservation(){
  await Promise.all([...document.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});setTimeout(resolve,1500);})));
  window.__webLabHeroImageLoaded=false;
  const hero=document.querySelector('.hero');
  const source=hero?getComputedStyle(hero).backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)?.[1]:null;
  if(source&&new URL(source,document.baseURI).pathname.endsWith('/mountains.png')){
    window.__webLabHeroImageLoaded=await new Promise(resolve=>{const img=new Image();const timeout=setTimeout(()=>resolve(false),2000);const finish=success=>{clearTimeout(timeout);resolve(success);};img.onload=()=>finish(img.naturalWidth>0);img.onerror=()=>finish(false);img.src=source;});
  }
}

function makeDocument(code, options = {}) {
  const safe = value => JSON.stringify(value).replace(/</g,'\\u003c');
  const token=options.token||'';
  const header = `<script>window.__webLabErrors=[];window.addEventListener('error',e=>{window.__webLabErrors.push(e.message);parent.postMessage({type:'web-lab-error',token:${safe(token)},message:e.message},'*');});<\/script>`;
  const check = options.check ? `<script>window.addEventListener('load',async()=>{try{await (${prepareObservation.toString()})();const snapshot=(${capturePage.toString()})();parent.postMessage({type:'web-lab-check',token:${safe(token)},snapshot},'*');}catch(e){parent.postMessage({type:'web-lab-check-failed',token:${safe(token)},message:e.message},'*');}});<\/script>` : '';
  const execution=`<script>try{(0,eval)(${safe(code.js)});window.atelier?.demarrer?.();}catch(e){window.__webLabErrors.push(e.message);parent.postMessage({type:'web-lab-error',token:${safe(token)},message:e.message},'*');}<\/script>`;
  let html=code.html;
  for(const [name,source] of Object.entries(options.scripts||{}))html=html.replace('<script src="'+name+'"></script>',()=>'<script>'+source.replace(/<\/script/gi,'<\\/script')+'<\/script>');
  let css=code.css;
  if(options.play&&code.html.includes('platform-workshop'))css+='\n.platform-workshop canvas{height:calc(100vh - 200px);min-height:340px}';
  if(options.play&&code.html.includes('three-workshop'))css+='\n.three-workshop #terrain{height:calc(100vh - 180px);min-height:340px}';
  for(const [name,data] of Object.entries(options.assets||{})){
    const escapedName=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    html=html.replace(new RegExp('src\\s*=\\s*(["\'])(?:\\.\\/|\\/)?'+escapedName+'\\1','gi'),(_match,quote)=>`src=${quote}${data}${quote}`);
    css=css.replace(new RegExp('url\\(\\s*(["\']?)(?:\\.\\/|\\/)?'+escapedName+'\\1\\s*\\)','gi'),()=>`url("${data}")`);
  }
  if(options.imageData) html=html.replace(/src\s*=\s*(["'])(?:\.\/|\/)?planet\.svg\1/gi,(_match,quote)=>`src=${quote}${options.imageData}${quote}`);
  const base=options.base?`<base href="${String(options.base).replace(/["<>]/g,'')}">`:'';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Station météo CHAMS</title>${base}<style>${css.replace(/<\/style/gi,'<\\/style')}</style>${header}${check}</head><body>${html}${execution}</body></html>`;
}
globalThis.WebLabEngine={makeDocument,capturePage};
if(typeof module!=='undefined')module.exports={makeDocument,capturePage};
})();
