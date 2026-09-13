const {cases:webCases}=require('./audit-cases.cjs');
const {JSDOM}=require('jsdom');
require('./weather-course.js');
const {course}=require('./game-course.js');
const cases=webCases.map(c=>({...c,index:c.index+30}));
function add(index,label,code,expected=true){cases.push({index,label:(index+1)+': '+label,code,expected});}
// These transformations preserve dependencies: only whole function declarations
// and independent object attributes move, never arbitrary executable statements.
function functionBlocks(source){
 const blocks=[];const pattern=/function\s+([a-zA-Z]+)\s*\([^)]*\)\s*\{/g;let match;
 while((match=pattern.exec(source))){let end=pattern.lastIndex,depth=1;for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}blocks.push({start:match.index,end,name:match[1],text:source.slice(match.index,end)});pattern.lastIndex=end;}
 return blocks;
}
function reorderFunctions(source){const blocks=functionBlocks(source);let other=source;for(const b of [...blocks].reverse())other=other.slice(0,b.start)+other.slice(b.end);return blocks.reverse().map(b=>b.text).join('\n\n')+'\n'+other;}
function expressions(source,kind){for(const b of functionBlocks(source).reverse()){const value=kind==='arrow'?b.text.replace(/^function\s+(\w+)\s*(\([^)]*\))/,'const $1 = $2 =>'):b.text.replace(/^function\s+(\w+)/,'window.$1 = function');source=source.slice(0,b.start)+value+';'+source.slice(b.end);}return source;}
function reformatHtml(source){if(!source.includes('<'))return source;const dom=new JSDOM(source);const doc=dom.window.document;for(const e of doc.querySelectorAll('*')){const attrs=[...e.attributes].map(a=>[a.name,a.value]).reverse();for(const a of [...e.attributes])e.removeAttribute(a.name);for(const [name,value] of attrs)e.setAttribute(name,value);}const html=doc.body.innerHTML.replace(/>\s+</g,'>\n<').replace(/<(\/?)([a-z][\w-]*)(?=[\s>])/gi,(_,slash,tag)=>'<'+slash+tag.toUpperCase());dom.window.close();return html;}
for(let index=0;index<course.length;index++){
 const l=course[index];
 if(index<30){
  add(index,'solution',l.solution);add(index,'incomplet',l.starter,false);add(index,'vide',{...l.solution,js:''},false);
  add(index,'fonctions placées dans un autre ordre',{...l.solution,js:reorderFunctions(l.solution.js)});
  add(index,'affectations équivalentes et commentaires',{...l.solution,js:l.solution.js.replace(/([\w.]+)\s*([+\-])=\s*([^;]+);/g,'$1 = $1 $2 ($3);').replaceAll('score >= 3','3 <= score').replaceAll('score >= 5','5 <= score')+'\n// Mon code fonctionne aussi avec cette écriture.'});
  if(functionBlocks(l.solution.js).length){add(index,'fonctions affectées à window',{...l.solution,js:expressions(l.solution.js,'window')});add(index,'fonctions fléchées nommées avec const',{...l.solution,js:expressions(l.solution.js,'arrow')});}
 }else{
  add(index,'HTML reformatté, attributs dans un autre ordre',{...l.solution,html:reformatHtml(l.solution.html)});
  if(l.solution.css)add(index,'propriétés CSS dans un autre ordre',{...l.solution,css:l.solution.css.replace(/\{([^{}]+)\}/g,(_,body)=>'{'+body.split(';').map(x=>x.trim()).filter(Boolean).reverse().join(';')+';}')});
 }
}
for(const index of [42,45]){
 add(index,'ordre des cartes inversé avec Flexbox',{...course[index].solution,css:course[index].solution.css+'\n.metrics { flex-direction: row-reverse; }'});
 add(index,'espacement horizontal seul',{...course[index].solution,css:course[index].solution.css.replace('gap: 20px','column-gap: 20px')});
}
for(const index of [39,45]){
 const code=course[index].solution,dom=new JSDOM(code.html),doc=dom.window.document;
 const tbody=doc.querySelector('tbody');[...tbody.children].reverse().forEach(row=>tbody.append(row));
 add(index,'relevés présentés dans l’ordre chronologique inverse',{...code,html:doc.body.innerHTML});
 for(const row of doc.querySelectorAll('table tr')){const cells=[...row.children];[cells[0],cells[2],cells[1],cells[3]].forEach(cell=>row.append(cell));}
 add(index,'colonnes réordonnées avec leurs en-têtes',{...code,html:doc.body.innerHTML});dom.window.close();
 add(index,'mesures numériquement équivalentes',{...code,html:code.html.replace('<td>19</td><td>60</td><td>1011</td>','<td>19.0</td><td>60.0</td><td>1011.0</td>')});
}
add(33,'fermeture implicite des paragraphes',{html:'Station météo CHAMS<p>Des données pour comprendre la météo.<p>Un projet de notre classe.',css:'',js:''});
add(44,'fonction nommée déclarée après son utilisation',{...course[44].solution,js:'document.getElementById("hello").onclick = expliquer;\nfunction expliquer() { document.getElementById("message").innerText = "Nos capteurs mesurent la météo autour du collège."; }'});
add(44,'message affiché après un traitement asynchrone court',{...course[44].solution,js:'document.getElementById("hello").onclick = () => setTimeout(() => { document.getElementById("message").textContent = "Nos capteurs mesurent la météo autour du collège."; }, 100);'});
add(44,'bouton qui affiche puis masque le texte',{...course[44].solution,js:'document.getElementById("hello").onclick = () => { const message = document.getElementById("message"); message.textContent = message.textContent ? "" : "Nos capteurs mesurent la météo autour du collège."; };'});
add(17,'ordre invalide : utilisation avant initialisation',{...course[17].solution,js:'deplacer("ArrowRight");\nconst deplacer = () => {};'},false);
add(29,'fonctions réordonnées mais mauvaise victoire',{...course[29].solution,js:reorderFunctions(course[29].solution.js).replace('drapeau.touche && score >= 5','true')},false);
module.exports={cases,reorderFunctions,expressions};
