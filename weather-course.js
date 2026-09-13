(() => {
const empty=()=>({html:'',css:'',js:''});
const copy=code=>({...code});
const course=[];
const change=(code,key,from,to)=>({...code,[key]:code[key].replace(from,to)});
const append=(code,key,text)=>({...code,[key]:code[key]+'\n'+text});
const same=code=>copy(code);
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
let markupParser;
function parseHtml(html){
  if(!markupParser){if(typeof DOMParser!=='undefined')markupParser=new DOMParser();else{const {window}=new (require('jsdom').JSDOM)('');markupParser=new window.DOMParser();}}
  return markupParser.parseFromString(html,'text/html');
}
function pairedText(html,tag){
  const source=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
  return [...source.matchAll(new RegExp('<'+tag+'(?:\\s[^>]*)?>[\\s\\S]*?<\\/'+tag+'\\s*>','gi'))].map(match=>parseHtml(match[0]).querySelector(tag)?.textContent.trim()||'').filter(Boolean);
}
function editHtml(code,edit){const doc=parseHtml(code.html);edit(doc);return {...code,html:doc.body.innerHTML};}
const hasTitle=s=>s.headings.some(h=>h.tag==='H1'&&normalize(h.text).includes('station meteo chams')&&h.visible);
const paragraph=s=>s.paragraphs.some(p=>p.text.trim().length>0);
const hasImage=s=>s.images.some(i=>i.loaded&&i.visible&&/(?:^|\/)station\.png(?:[?#].*)?$/.test(i.src)&&i.alt.trim().length>0);
const navWorks=s=>['#accueil','#station','#donnees','#apropos'].every(href=>s.links.some(a=>a.inNav&&a.href===href&&a.valid));
const measurements=s=>Object.entries({temperature:'22 °C',humidity:'65 %',pressure:'1013 hPa',conditions:'Ensoleillé'}).every(([kind,value])=>s.metrics.some(m=>m.kind===kind&&m.visible&&normalize(m.value).replace(/\s/g,'')===normalize(value).replace(/\s/g,'')));
const usefulLinks=s=>s.usefulLinkCount>=5&&s.links.filter(a=>a.inUsefulList).every(a=>a.valid&&a.text.trim())&&s.links.some(a=>a.inUsefulList&&a.href==='#station'&&a.valid&&/CHAMS/i.test(a.text));
const tableComplete=s=>{
  const headings=(s.tableHeadingTexts||[]).map(normalize);
  const indexes=[/date|heure/,/temperature/,/humidite/,/pression/].map(pattern=>headings.findIndex(h=>pattern.test(h)));
  if(s.tableHeadings!==4||indexes.some(i=>i<0)||new Set(indexes).size!==4||s.tableRows.length<5)return false;
  const [date,...values]=indexes,numeric=v=>Number(v.trim().replace(',','.'));
  return s.tableRows.every(row=>row.length===4&&row.every(v=>v.trim())&&values.every(i=>Number.isFinite(numeric(row[i]))))&&s.tableRows.some(row=>/10:32/.test(row[date])&&values.every((i,n)=>numeric(row[i])===[19,60,1011][n]));
};
const equalColumns=s=>{const columns=(s.styles.stationColumns||'').split(/\s+/).filter(Boolean);return s.styles.stationDisplay==='grid'&&columns.length===2&&((columns[0]==='1fr'&&columns[1]==='1fr')||columns.every(v=>/^\d+(?:\.\d+)?px$/.test(v))&&Math.abs(parseFloat(columns[0])-parseFloat(columns[1]))<1);};
const heroReady=s=>s.styles.heroImageLoaded===true&&s.styles.heroColor==='rgb(255, 255, 255)'&&s.styles.heroPadding==='28px';
const cardsAligned=s=>s.styles.metricsDisplay==='flex'&&['row','row-reverse'].includes(s.styles.metricsDirection)&&(s.styles.metricsColumnGap||s.styles.metricsGap)==='20px';
const action=s=>s.interaction.exists&&s.interaction.visible&&s.interaction.after!==s.interaction.before&&s.interaction.after.length>=20&&!s.errors.length;
function add(meta,prepare,finish,checks){
  const prior=course.length?course[course.length-1].solution:empty();
  const starter=prepare(copy(prior)),solution=finish(copy(starter));
  const tab=meta.tab||'html';
  const sample=(text)=>tab==='html'?{html:text,css:'',js:''}:tab==='css'?{html:'<h1>Station météo CHAMS</h1><p>Observer notre environnement.</p>',css:text,js:''}:{html:'<button id="hello">En savoir plus</button><p id="message"></p>',css:'',js:text};
  course.push({tab,focus:'',challenge:'Modifie un mot ou une valeur, observe le résultat, puis annule avec Ctrl + Z.',...meta,exampleBefore:meta.exampleBefore||sample(meta.before),exampleAfter:meta.exampleAfter||sample(meta.after),starter,solution,prepare,checks,criteria:checks.map(check=>check.label)});
}
const text='Station météo CHAMS';
const subtitle='Des données pour mieux comprendre notre environnement';
add({title:'Écrire le premier texte',topic:'Premiers pas · La page blanche',objective:'Faire apparaître le nom de notre station sur une page entièrement vide.',explanation:'À gauche, tu écris le contenu de la page. À droite, le navigateur affiche ce contenu. Il n’y a rien pour le moment : ni titre, ni image, ni style. Pour commencer, écris simplement du texte.',before:'',after:text,annotations:['Ce que tu tapes dans la zone de code apparaît dans l’aperçu.', 'Pour cet exercice, aucun symbole spécial n’est nécessaire.'],question:'Tu changes un mot dans le code. Que se passe-t-il à droite ?',options:['Le texte affiché change aussi.','Une image apparaît.','Il faut recommencer le site.'],answer:0,responses:['Oui : le navigateur affiche le texte que tu écris.','Pour afficher une image, il faudra lui donner une autre instruction.','Tu peux modifier une page autant de fois que tu veux.'],instructions:['Clique dans la zone de code vide.','Écris : Station météo CHAMS','Observe le résultat, puis essaie de modifier un mot avant de revenir au nom de la station.'],hints:['Clique à côté du numéro 1 dans l’éditeur, puis commence à écrire.','Écris seulement Station météo CHAMS, sans guillemets ni balise.'],takeaway:'Du texte brut suffit pour afficher le premier contenu d’une page.'},same,()=>({html:text,css:'',js:''}),[{label:'Le nom « Station météo CHAMS » apparaît sur la page.',test:(s,c)=>/Station météo CHAMS/i.test(s.bodyText)&&!/<[^>]*>/.test(c.html),help:'Écris Station météo CHAMS dans le code, sans ajouter de balise pour le moment.'}]);
add({title:'Essayer la touche Entrée',topic:'Premiers pas · Observer',objective:'Découvrir la différence entre les lignes du code et les lignes affichées.',explanation:'Place le curseur à la fin du nom de la station et appuie sur Entrée. Écris une seconde phrase. Le code a deux lignes, mais le navigateur les rassemble : dans du texte HTML ordinaire, il regroupe les espaces et les retours à la ligne. Ce n’est pas un problème de clavier.',before:text+' '+subtitle,after:text+'\n'+subtitle,annotations:['Le code « Après » possède deux lignes.','À l’écran, le retour à la ligne du code est traité comme un espace.','Un texte long peut se replier quand la fenêtre est étroite : ce n’est pas une coupure demandée par Entrée.'],question:'Pourquoi les deux phrases restent-elles ensemble dans la page ?',options:['La touche Entrée est cassée.','Le navigateur regroupe les espaces et retours à la ligne.','Il faut écrire le texte en majuscules.'],answer:1,responses:['Le code montre bien deux lignes : le clavier fonctionne.','Exact. Il faudra une instruction HTML pour imposer une coupure.','Les majuscules ne changent pas la façon d’afficher les lignes.'],instructions:['Garde le nom de la station. À la fin, appuie sur Entrée.','Sur la deuxième ligne, écris : '+subtitle,'Compare le code et le résultat avant de répondre à la question.'],hints:['Place le curseur après CHAMS, puis appuie sur Entrée.','N’ajoute pas encore de balise : observe simplement ce que fait le navigateur.'],challenge:'Ajoute plusieurs espaces entre deux mots. Le navigateur les affiche-t-il tous ?',takeaway:'Un retour à la ligne dans le code n’impose pas une nouvelle ligne dans la page.'},same,c=>({...c,html:text+'\n'+subtitle}),[{label:'Deux lignes de texte, sans balise, sont présentes dans le code.',test:(s,c)=>c.html.split(/\r?\n/).filter(l=>l.trim()).length>=2&&/CHAMS/.test(s.bodyText)&&s.bodyText.length>40&&!/<[^>]*>/.test(c.html),help:'Appuie sur Entrée après CHAMS et écris la phrase de présentation sur une deuxième ligne. Ne mets pas encore de balise.'}]);
add({title:'Découvrir la balise br',topic:'HTML · Le retour à la ligne',objective:'Faire passer la présentation à la ligne avec ta première balise.',explanation:'Une balise est une instruction pour le navigateur, entourée par les signes < et >. Écris <br> entre les deux phrases pour demander une coupure. br signifie « break ». Cette balise n’a pas de fermeture et ses lettres ne s’affichent pas sur la page.',before:text+'\n'+subtitle,after:text+'<br>\n'+subtitle,annotations:['<br> est une instruction ; br sans les chevrons serait du simple texte.','La coupure est provoquée par la balise, pas par la touche Entrée.'],question:'Quelle écriture impose un retour à la ligne ?',options:['br','<br>','(br)'],answer:1,responses:['Sans chevrons, les lettres br sont affichées.','Oui. Les chevrons forment une balise HTML.','Les parenthèses ne forment pas une balise.'],instructions:['Entre le nom de la station et la phrase suivante, écris <br>.','Observe : la présentation commence maintenant sur une autre ligne.'],hints:['Ajoute <br> juste après CHAMS.','Il faut le signe <, les lettres br, puis le signe >.'],challenge:'Retire les chevrons, observe, puis remets-les.',takeaway:'Une balise donne une instruction au navigateur. br demande une coupure de ligne.'},same,c=>({...c,html:text+'<br>\n'+subtitle}),[{label:'Une balise br sépare deux lignes visibles.',test:s=>s.brCount>=1&&s.bodyText.split('\n').filter(l=>l.trim()).length>=2,help:'Écris <br> entre les deux phrases et conserve du texte de chaque côté.'}]);
add({title:'Créer un paragraphe',topic:'HTML · Ouvrir et fermer',objective:'Donner à la présentation le rôle de paragraphe.',explanation:'Une phrase de présentation est un paragraphe. On écrit <p> avant son texte et </p> après. Le / ferme la balise. Le navigateur place ce paragraphe dans son propre bloc et lui ajoute un peu d’espace. On n’a donc plus besoin de br pour le séparer du nom de la station.',before:'Nom de la station<br>\nSa présentation.',after:'Nom de la station\n<p>Sa présentation.</p>',annotations:['<p> ouvre le paragraphe ; </p> le ferme.','Le contenu est écrit entre les deux balises.','p structure un paragraphe ; br coupe simplement une ligne.'],question:'Comment ferme-t-on un paragraphe ?',options:['<p>','</p>','<fin>'],answer:1,responses:['C’est la balise ouvrante.','Exact : le / indique la fermeture.','HTML utilise </p>, pas une balise fin.'],instructions:['Retire <br>.','Écris <p> avant la phrase de présentation et </p> après.','Conserve le nom de la station au-dessus.'],hints:['La présentation doit devenir <p>Des données pour mieux comprendre notre environnement</p>.','Vérifie le / dans </p>. L’éditeur et le navigateur n’affichent pas les balises de la même façon.'],takeaway:'Une balise ouvrante et une balise fermante entourent un contenu.'},same,c=>({...c,html:text+'\n<p>'+subtitle+'</p>'}),[{label:'La présentation est un paragraphe correctement fermé.',test:(s,c)=>paragraph(s)&&/<p(?:\s[^>]*)?>[\s\S]*?<\/p\s*>/i.test(c.html),help:'Entoure la présentation avec <p> et </p>.'},{label:'La balise br devenue inutile est retirée.',test:s=>s.brCount===0,help:'Retire <br> : le paragraphe crée déjà son propre bloc.'}]);
add({title:'Ajouter des titres',topic:'HTML · La structure du texte',objective:'Créer le titre principal et la section qui présente la station.',explanation:'h1 indique le titre principal de la page. h2 indique le titre d’une section. Les deux fonctionnent comme p : ouverture, texte, fermeture. Ils ne servent pas seulement à agrandir des lettres : ils organisent les informations.',before:'Station météo CHAMS\n<p>Notre station météo</p>',after:'<h1>Station météo CHAMS</h1>\n<h2>Notre station météo</h2>',annotations:['Il y a un titre principal h1 pour annoncer la page.','h2 introduit une section. Son paragraphe explique ensuite le sujet.'],question:'Quel rôle a h2 dans notre page ?',options:['Créer une image.','Fermer le site.','Donner un titre à une section.'],answer:2,responses:['Une image utilise img.','Une page ne se ferme pas avec h2.','Oui : h2 organise les sections sous le titre principal.'],instructions:['Entoure Station météo CHAMS avec <h1> et </h1>.','Sous la présentation, écris <h2>Notre station météo</h2>.','Ajoute un paragraphe d’au moins une phrase pour expliquer que la station est conçue par les élèves du projet CHAMS.'],hints:['La première ligne devient <h1>Station météo CHAMS</h1>.','Tu peux écrire : <p>Cette station météo est conçue par les élèves du projet CHAMS.</p>.'],takeaway:'h1 annonce la page ; h2 annonce une section ; p contient une explication.',focus:text},same,c=>({...c,html:'<h1>'+text+'</h1>\n<p>'+subtitle+'</p>\n<h2>Notre station météo</h2>\n<p>Cette station météo a été conçue par les élèves dans le cadre du projet CHAMS. Elle permet de mesurer différents paramètres météorologiques et d’afficher les données sur cette page web.</p>\n<p>Ce projet nous permet de découvrir la programmation, l’électronique, les capteurs et la création de sites web.</p>'}),[{label:'Un titre h1 annonce la station CHAMS.',test:(s,c)=>hasTitle(s)&&/<\/h1>/i.test(c.html),help:'Écris <h1>Station météo CHAMS</h1> en fermant la balise.'},{label:'La section « Notre station météo » a un titre h2 et une explication.',test:s=>s.headings.some(h=>h.tag==='H2'&&/Notre station météo/i.test(h.text))&&s.paragraphs.length>=2,help:'Ajoute le sous-titre h2 et un paragraphe sur le travail des élèves.'}]);

function structure(code){
  if(parseHtml(code.html).getElementById('accueil'))return code;
  const split=code.html.search(/<h2\b/i),intro=split<0?code.html:code.html.slice(0,split),story=split<0?'':code.html.slice(split);
  return {...code,html:`<header class="site-header">
  <a class="brand" href="#accueil">☁ <strong>Station météo CHAMS</strong></a>
  <nav aria-label="Navigation principale">
    <a class="active" href="#accueil">Accueil</a>
    <a href="#a-completer">La station</a>
    <a href="#donnees">Données</a>
    <a href="#apropos">À propos</a>
  </nav>
  <span class="motto">🌿 Observer aujourd’hui<br>pour demain</span>
</header>
<section class="hero" id="accueil">
${intro.trim()}
  <p class="eco-badge">🌿 Un projet technologique, scientifique et écologique</p>
</section>
<main>
  <section class="station" id="station">
    <div class="station-copy">
${story.trim()}
    </div>
  </section>
  <section class="lower" id="donnees"></section>
</main>
<footer class="site-footer" id="apropos">
  <div><strong>☁ Station météo CHAMS</strong><br><small>Projet CHAMS · Collège · 2026</small></div>
  <nav aria-label="Navigation de pied de page"><a href="#accueil">Accueil</a><a href="#station">La station</a><a href="#donnees">Données</a><a href="#apropos">À propos</a></nav>
  <a class="back-top" href="#accueil" aria-label="Retour en haut">↑</a>
</footer>`};
}
add({title:'Relier les sections',topic:'HTML · Les liens',objective:'Faire fonctionner le menu de navigation de la station.',explanation:'Le contenu que tu as écrit est maintenant rangé dans des sections nommées. id="station" donne un nom à une section. Le lien <a href="#station">La station</a> mène vers elle : href contient la destination et le texte entre les balises est cliquable. Le bloc de navigation est fourni ; un lien reste à corriger.',before:'<a href="#inconnu">La station</a>',after:'<a href="#station">La station</a>\n<section id="station">Présentation de la station</section>',annotations:['Le # signifie « un élément de cette page ».','La valeur après # doit être identique à l’id visé.','header, nav, section et footer servent à ranger les grandes parties de la page.'],question:'Que doit contenir href pour rejoindre id="station" ?',options:['#station','station.png','h2'],answer:0,responses:['Exact : le # suivi du nom de la section.','C’est un nom de fichier image, pas cette section.','h2 est une balise de titre, pas la destination.'],instructions:['Dans le menu du haut, trouve le lien « La station ».','Remplace #a-completer par #station.','Ouvre ta page séparément et teste les quatre liens : ils mènent aux sections correspondantes.'],hints:['Cherche href="#a-completer" dans le HTML.','Change seulement la valeur entre guillemets. Les id des sections sont déjà en place.'],takeaway:'Un lien interne associe href="#nom" à id="nom".',focus:'#a-completer',scaffold:'Ton texte est conservé. Le menu, les sections et le pied de page sont ajoutés comme structure à compléter.'},structure,c=>change(c,'html','#a-completer','#station'),[{label:'Les quatre liens du menu visent des sections existantes.',test:navWorks,help:'Corrige le lien « La station » avec href="#station". Conserve les id accueil, station, donnees et apropos.'}]);

add({title:'Afficher la station',topic:'HTML · Les images',objective:'Ajouter la photographie de la station avec une description utile.',explanation:'img affiche une image. src indique le nom du fichier ; alt décrit ce qu’il représente. La photo station.png est fournie. img n’a pas de balise de fermeture. figure regroupe la photo et sa légende, écrite dans figcaption.',before:'<img src="" alt="">',after:'<img src="station.png"\n     alt="Une station météo avec ses capteurs">',annotations:['src choisit le fichier : station.png.','alt décrit l’image pour quelqu’un qui ne peut pas la voir.','Le fichier est fourni avec l’atelier : aucune recherche d’image n’est nécessaire.'],question:'Quelle différence y a-t-il entre src et alt ?',options:['Les deux changent la taille.','src choisit l’image, alt la décrit.','alt contient toujours une adresse.'],answer:1,responses:['La taille peut se régler avec width ou le CSS.','Oui : un fichier d’un côté, une description de l’autre.','C’est src qui indique le fichier.'],instructions:['Dans la balise img ajoutée, écris station.png dans src.','Dans alt, décris la station et ses capteurs avec au moins quelques mots.','Vérifie que la photographie s’affiche.'],hints:['Complète src="station.png" en gardant les guillemets.','Exemple : alt="Une station météo équipée de capteurs".'],takeaway:'Une image doit avoir un fichier à charger et une description adaptée.',focus:'src=""',scaffold:'Un bloc figure avec une image à compléter est ajouté à la présentation.'},c=>change(c,'html','\n  </section>\n  <section class="lower"','\n    <figure>\n      <img src="" alt="" width="540">\n      <figcaption>Notre station météo en action !</figcaption>\n    </figure>\n  </section>\n  <section class="lower"'),c=>change(change(c,'html','src=""','src="station.png"'),'html','alt=""','alt="Une station météo avec un anémomètre et ses capteurs"'),[{label:'La photographie station.png est chargée et décrite.',test:hasImage,help:'Utilise src="station.png" et un alt d’au moins 15 caractères contenant le mot « station ».'}]);

const metrics=`<section class="metrics" aria-label="Mesures météo d’exemple">
  <article class="metric temperature"><span class="icon">🌡️</span><div><h2>Température</h2><strong class="value">À COMPLÉTER °C</strong></div><p>Une température agréable</p></article>
  <article class="metric humidity"><span class="icon">💧</span><div><h2>Humidité</h2><strong class="value">À COMPLÉTER %</strong></div><p>Un air un peu humide</p></article>
  <article class="metric pressure"><span class="icon">◴</span><div><h2>Pression</h2><strong class="value">À COMPLÉTER hPa</strong></div><p>Pression stable</p></article>
  <article class="metric conditions"><span class="icon">☀</span><div><h2>Conditions</h2><strong class="value">À COMPLÉTER</strong></div><p>Ciel dégagé</p></article>
</section>
<p class="updated">◷ Relevé d’exemple : 14 octobre 2026 à 14:32 <span>· Données d’entraînement, sans capteur connecté</span></p>`;
add({title:'Écrire les mesures météo',topic:'HTML · Les classes et les cartes',objective:'Renseigner les quatre cartes de mesures avec leurs unités.',explanation:'Chaque carte est un article qui regroupe un intitulé, une valeur et une courte explication. class="metric" donne une classe commune aux quatre cartes : elle permettra de les présenter de la même façon en CSS. Les données sont un jeu d’entraînement, pas des relevés en direct.',before:'<strong class="value">À COMPLÉTER °C</strong>',after:'<strong class="value">22 °C</strong>',annotations:['La valeur reste du texte HTML.','L’unité permet de comprendre le nombre : °C, %, hPa.','Une classe peut être utilisée sur plusieurs éléments, contrairement à un id qui doit être unique.'],question:'Pourquoi les quatre cartes ont-elles la classe metric ?',options:['Pour recevoir un style commun.','Pour mesurer la température seules.','Pour ouvrir quatre pages.'],answer:0,responses:['Oui. Le CSS pourra toutes les sélectionner avec .metric.','Une classe ne mesure rien : il faudrait un capteur et une liaison de données.','Elles restent sur la même page.'],instructions:['Remplace les quatre textes « À COMPLÉTER ».','Utilise 22 °C, 65 %, 1013 hPa et Ensoleillé.','Conserve les intitulés et les unités.'],hints:['Chaque valeur est placée entre <strong class="value"> et </strong>.','N’écris pas deux fois l’unité : °C, % et hPa sont déjà présents après les trois premiers emplacements.'],takeaway:'Les classes regroupent les éléments à styliser. Les unités donnent un sens aux mesures.',focus:'À COMPLÉTER',scaffold:'Les quatre cartes sont fournies avec leurs valeurs manquantes pour éviter de recopier quatre fois la même structure.'},c=>change(c,'html','<main>','<main>\n'+metrics),c=>{for(const value of ['22','65','1013','Ensoleillé'])c=change(c,'html','À COMPLÉTER',value);return c;},[{label:'Les quatre cartes affichent 22 °C, 65 %, 1013 hPa et Ensoleillé.',test:measurements,help:'Complète chaque élément .value avec la donnée et l’unité demandées.'}]);

const links=`<aside class="useful-links">
  <h2>🔗 Liens utiles</h2>
  <ul>
    <li><a href="https://meteofrance.com">Météo France</a></li>
    <li><a href="https://meteofrance.com/comprendre-la-meteo">Comprendre la météo</a></li>
    <li><a href="https://www.ademe.fr">Les énergies renouvelables</a></li>
    <li><a href="https://www.arduino.cc">Arduino</a></li>
    <!-- Ajoute ici le cinquième lien vers #station -->
  </ul>
  <p class="eco-note">🌿 Agir pour la planète, c’est aussi mieux comprendre son environnement !</p>
</aside>`;
add({title:'Compléter une liste de liens',topic:'HTML · Les listes',objective:'Ajouter un cinquième lien utile dans une liste.',explanation:'ul contient une liste à puces. Chaque li contient un élément de la liste. Ici, un lien a se trouve à l’intérieur de chaque li. Pour ajouter un lien, il faut donc ouvrir li, écrire le lien, fermer a, puis fermer li. Les espaces au début des lignes aident à lire cet emboîtement.',before:'<ul>\n  <li>Un premier élément</li>\n</ul>',after:'<ul>\n  <li>Un premier élément</li>\n  <li><a href="#station">Le projet CHAMS</a></li>\n</ul>',annotations:['ul contient le groupe ; li contient un élément.','Le nouvel élément doit être ajouté avant </ul>.','On ferme les balises dans l’ordre inverse de leur ouverture.'],question:'Où faut-il placer le nouveau li ?',options:['Après </ul>.','À l’intérieur de ul, après le dernier li.','Dans l’attribut href.'],answer:1,responses:['Il serait hors de la liste.','Exact : il devient le cinquième élément de la même liste.','href contient une adresse, pas un élément de liste.'],instructions:['Repère la liste « Liens utiles ».','À la place du commentaire, ajoute un li contenant un lien vers #station.','Écris « Le projet CHAMS » comme texte du lien et ferme a puis li.'],hints:['Commence par <li>, puis ajoute <a href="#station">.','La ligne complète se termine par Le projet CHAMS</a></li>.'],takeaway:'On peut imbriquer des balises : ul contient li, qui peut contenir a.',focus:'<!-- Ajoute ici',scaffold:'La rubrique de liens est ajoutée avec quatre exemples ; tu écris le cinquième élément.'},c=>change(c,'html','<section class="lower" id="donnees"></section>','<section class="lower" id="donnees">\n'+links+'\n</section>'),c=>change(c,'html','<!-- Ajoute ici le cinquième lien vers #station -->','<li><a href="#station">Le projet CHAMS</a></li>'),[{label:'La liste comporte cinq liens, dont « Le projet CHAMS » vers #station.',test:s=>s.usefulLinkCount>=5&&s.links.some(a=>a.inUseful&&a.href==='#station'&&a.valid&&/CHAMS/.test(a.text)),help:'Ajoute <li><a href="#station">Le projet CHAMS</a></li> à l’intérieur de la liste.'}]);

const table=`<section class="history">
  <h2>▤ Dernières mesures</h2>
  <table>
    <caption>Jeu de mesures d’exemple du 14 octobre 2026</caption>
    <thead><tr><th scope="col">Date et heure</th><th scope="col">Température (°C)</th><th scope="col">Humidité (%)</th><th scope="col">Pression (hPa)</th></tr></thead>
    <tbody>
      <tr><td>14/10 - 14:32</td><td>22</td><td>65</td><td>1013</td></tr>
      <tr><td>14/10 - 13:32</td><td>21</td><td>66</td><td>1012</td></tr>
      <tr><td>14/10 - 12:32</td><td>21</td><td>64</td><td>1011</td></tr>
      <tr><td>14/10 - 11:32</td><td>20</td><td>62</td><td>1011</td></tr>
      <!-- Ajoute la mesure de 10:32 : 19, 60, 1011 -->
    </tbody>
  </table>
</section>`;
add({title:'Ajouter une ligne de tableau',topic:'HTML · Les tableaux',objective:'Ranger une mesure dans la bonne ligne et les bonnes colonnes.',explanation:'Un tableau organise des données. tr crée une ligne ; td une cellule. Les cellules th indiquent les en-têtes des colonnes. Toutes les lignes doivent suivre le même ordre : date, température, humidité, pression. Les unités sont déjà dans les en-têtes.',before:'<tr><td>14/10 - 11:32</td><td>20</td></tr>',after:'<tr><td>14/10 - 11:32</td><td>20</td></tr>\n<tr><td>14/10 - 10:32</td><td>19</td></tr>',exampleBefore:{html:'<table border="1"><tr><th>Heure</th><th>°C</th></tr><tr><td>11:32</td><td>20</td></tr></table>',css:'',js:''},exampleAfter:{html:'<table border="1"><tr><th>Heure</th><th>°C</th></tr><tr><td>11:32</td><td>20</td></tr><tr><td>10:32</td><td>19</td></tr></table>',css:'',js:''},annotations:['Dans notre site, chaque ligne contient quatre td.','thead regroupe les titres ; tbody regroupe les mesures.','Une valeur dans la mauvaise colonne change le sens des données.'],question:'Que représente tr ?',options:['Une image.','Une colonne entière.','Une ligne de tableau.'],answer:2,responses:['Les images utilisent img.','tr regroupe les cellules d’une même ligne.','Exact : chaque tr contient les cellules de la ligne.'],instructions:['Repère le commentaire dans tbody.','Remplace-le par un tr contenant quatre td.','Écris dans l’ordre : 14/10 - 10:32, 19, 60, 1011.'],hints:['Duplique la ligne précédente, puis change les quatre valeurs.','Il faut quatre ouvertures <td> et quatre fermetures </td> à l’intérieur de <tr>…</tr>.'],takeaway:'tr = ligne ; td = cellule ; th = en-tête.',focus:'<!-- Ajoute la mesure',scaffold:'Le tableau est fourni avec ses en-têtes et quatre relevés. Tu ajoutes le cinquième.'},c=>change(c,'html','<section class="lower" id="donnees">','<section class="lower" id="donnees">\n'+table),c=>change(c,'html','<!-- Ajoute la mesure de 10:32 : 19, 60, 1011 -->','<tr><td>14/10 - 10:32</td><td>19</td><td>60</td><td>1011</td></tr>'),[{label:'La cinquième ligne contient la date puis 19, 60 et 1011.',test:s=>s.tableRows.some(row=>row.length===4&&/10:32/.test(row[0])&&row.slice(1).join(',')==='19,60,1011')&&s.tableHeadings>=4,help:'Ajoute un tr avec quatre td, dans l’ordre date / température / humidité / pression.'}]);

add({title:'Écrire le premier CSS',topic:'CSS · L’apparence',tab:'css',objective:'Changer la police, la couleur du texte et les marges de la page.',explanation:'Le contenu existe, mais il n’a pas encore le style du modèle. Le CSS va régler son apparence. Dans body { color: #10243a; }, body choisit le corps de la page, color est la propriété et #10243a sa valeur. Une déclaration se termine par un point-virgule. Le contenu HTML ne change pas.',before:'body {\n  color: black;\n}',after:'body {\n  font-family: Arial, sans-serif;\n  color: #10243a;\n  margin: 0;\n}',annotations:['Le sélecteur body choisit la page entière.','Les accolades regroupent ses déclarations.','Les mots du langage restent en anglais : color, pas couleur.'],question:'Dans color: #10243a;, quelle est la propriété ?',options:['color','#10243a','body'],answer:0,responses:['Oui : color indique ce que tu modifies.','#10243a est la valeur de la couleur.','body est le sélecteur, c’est-à-dire l’élément choisi.'],instructions:['Ouvre l’onglet CSS, qui est encore vide.','Écris une règle body avec font-family: Arial, sans-serif; et color: #10243a;.','Ajoute margin: 0; pour retirer la marge extérieure par défaut.'],hints:['Commence par body {, puis écris une déclaration par ligne avant }.','Conserve les deux-points, les points-virgules et les accolades.'],takeaway:'Un sélecteur choisit quoi modifier ; les propriétés et valeurs définissent le style.'},same,c=>({...c,css:'body {\n  font-family: Arial, sans-serif;\n  color: #10243a;\n  margin: 0;\n}'}),[{label:'La page utilise Arial et la couleur #10243a.',test:s=>/Arial/i.test(s.styles.bodyFont)&&s.styles.bodyColor==='rgb(16, 36, 58)',help:'Écris font-family: Arial, sans-serif; et color: #10243a; dans body.'},{label:'La marge extérieure de body vaut 0.',test:s=>s.styles.bodyMargin?.every(value=>value==='0px'),help:'Ajoute margin: 0; dans la règle body.'}]);

const headerCss=`/* Le bandeau et le menu : complète la règle .hero plus bas. */
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { background: white; line-height: 1.5; }
a { color: #087cf0; text-decoration: none; }
a:hover { text-decoration: underline; }
.site-header { display: flex; align-items: center; gap: 36px; padding: 12px 4.5%; background: #1e3b53; color: white; }
.site-header .brand { display: flex; align-items: center; gap: 14px; color: white; font-size: 22px; white-space: nowrap; }
.site-header nav { display: flex; gap: 10px; }
.site-header nav a { color: white; padding: 10px 16px; border-radius: 5px; }
.site-header .active { background: #087cf0; }
.motto { margin-left: auto; font-size: 12px; font-style: italic; }
.hero {
  background-image: url("");
  background-size: cover;
  background-position: center 48%;
  padding: 0;
  color: #10243a;
  text-align: center;
  box-shadow: inset 0 0 0 1000px #163b5c38;
}
.hero h1 { font-size: 46px; margin: 0 0 2px; }
.hero > p { font-size: 23px; margin: 0 0 14px; }
.hero .eco-badge { display: inline-block; background: #ffffffd9; border-radius: 12px; color: #1c3a50; padding: 12px 40px; font-size: 16px; margin: 0; }
`;
add({title:'Habiller le bandeau',topic:'CSS · Images et espaces',tab:'css',objective:'Ajouter la montagne en fond et rendre le titre lisible.',explanation:'Un fond décoratif peut être ajouté avec background-image. padding crée de l’espace à l’intérieur d’un bloc, autour de son contenu. Pour rendre le titre lisible sur la photographie, on choisit du texte blanc. Les règles du menu sont fournies : tu complètes celles du bandeau .hero.',before:'.hero {\n  padding: 0;\n}',after:'.hero {\n  background-image: url("mountains.png");\n  padding: 28px;\n  color: white;\n}',exampleBefore:{html:'<section class="hero"><h1>Station météo CHAMS</h1></section>',css:'.hero{background:#1e3b53}',js:''},exampleAfter:{html:'<section class="hero"><h1>Station météo CHAMS</h1></section>',css:'.hero{background:url("mountains.png") center/cover;padding:28px;color:white;text-align:center}',js:''},annotations:['Le point de .hero sélectionne les éléments class="hero".','background-size: cover remplit le bandeau avec la photo.','padding ajoute de l’espace dedans ; margin en ajouterait dehors.'],question:'Le titre touche le bord de son bandeau. Quelle propriété ajoute de l’espace à l’intérieur ?',options:['href','padding','alt'],answer:1,responses:['href indique la destination d’un lien.','Oui. padding éloigne le contenu des bords du bloc.','alt décrit une image.'],instructions:['Dans .hero, complète url("mountains.png").','Remplace padding: 0; par padding: 28px;.','Remplace la couleur du texte par white dans cette même règle.'],hints:['La règle .hero se trouve après les styles du menu.','Ne change pas la couleur de body : vise seulement le texte du bandeau avec .hero.'],takeaway:'Une classe peut recevoir une image de fond, du texte blanc et de l’espace intérieur.',focus:'background-image: url("")',scaffold:'Les règles du menu et du titre sont fournies. Trois valeurs du bandeau restent à compléter.'},c=>append(c,'css',headerCss),c=>({...c,css:c.css.replace('background-image: url("")','background-image: url("mountains.png")').replace('  padding: 0;\n  color: #10243a;','  padding: 28px;\n  color: white;')}),[{label:'La montagne est utilisée en fond du bandeau.',test:s=>s.styles.heroImage?.includes('mountains.png'),help:'Dans .hero, complète background-image: url("mountains.png");.'},{label:'Le bandeau a 28px d’espace intérieur et du texte blanc.',test:s=>s.styles.heroPadding==='28px'&&s.styles.heroColor==='rgb(255, 255, 255)',help:'Dans .hero, écris padding: 28px; et color: white;.'}]);

const cardsCss=`/* Les cartes : règle leur disposition dans .metrics. */
.metrics {
  display: block;
  gap: 0;
  margin: 18px 4.5%;
}
.metric { flex: 1; min-width: 0; border-radius: 12px; padding: 18px; display: grid; grid-template-columns: 70px 1fr; align-items: center; gap: 4px 12px; }
.metric h2 { font-size: 16px; margin: 0 0 8px; }
.metric .value { font-size: 28px; line-height: 1.2; color: #081a2b; white-space: nowrap; }
.metric .icon { font-size: 54px; line-height: 1.2; text-align: center; }
.metric p { grid-column: 1 / -1; text-align: center; font-size: 14px; color: #55616b; margin: 10px 0 0; }
.temperature { background: #ffedcc; color: #ed4726; }
.humidity { background: #d8ecff; color: #006bb5; }
.pressure { background: #def1df; color: #2a813d; }
.conditions { background: #e8e0ff; color: #6235a8; }
.conditions .icon { color: #ffb300; }
.pressure .icon { color: #2a813d; font-weight: bold; }
.updated { text-align: center; font-size: 14px; margin: 16px 0 22px; color: #405366; }
.updated span { display: block; font-size: 11px; color: #677b8b; }
`;
add({title:'Aligner les quatre cartes',topic:'CSS · Flexbox',tab:'css',objective:'Placer les cartes côte à côte en gardant un espace entre elles.',explanation:'display: flex organise les enfants d’un conteneur en ligne. Ici, on l’applique à .metrics, la boîte qui contient les quatre cartes. gap sépare les cartes. Leurs couleurs et leurs détails sont fournis : ce sont des réglages visuels que tu pourras modifier après l’exercice.',before:'.metrics { display: block; gap: 0; }',after:'.metrics { display: flex; gap: 20px; }',exampleBefore:{html:'<div class="metrics"><div>22 °C</div><div>65 %</div></div>',css:'.metrics>div{padding:15px;background:#d8ecff}',js:''},exampleAfter:{html:'<div class="metrics"><div>22 °C</div><div>65 %</div></div>',css:'.metrics{display:flex;gap:20px}.metrics>div{padding:15px;background:#d8ecff}',js:''},annotations:['.metrics est le parent des quatre .metric.','display: flex se place sur le parent.','gap ajoute un espace entre ses enfants.'],question:'Sur quelle classe faut-il mettre display: flex pour aligner les quatre cartes ?',options:['.metrics, leur conteneur.','.value, les nombres.','.hero, le bandeau.'],answer:0,responses:['Oui : le conteneur organise ses enfants.','Cela ne dispose pas les quatre cartes.','Le bandeau ne contient pas les cartes.'],instructions:['Dans .metrics, remplace block par flex.','Remplace gap: 0; par gap: 20px;.','Ouvre la page en grand pour observer les quatre cartes sur une ligne.'],hints:['La règle .metrics est en bas de ta feuille CSS, dans les nouvelles règles.','Ne confonds pas .metric, une carte, avec .metrics, leur groupe.'],takeaway:'Pour disposer plusieurs éléments, règle leur conteneur.',focus:'display: block;',scaffold:'Les couleurs et le style intérieur des cartes sont ajoutés ; tu règles la disposition du groupe.'},c=>append(c,'css',cardsCss),c=>({...c,css:c.css.replace('  display: block;\n  gap: 0;','  display: flex;\n  gap: 20px;')}),[{label:'Les cartes sont alignées avec Flexbox et espacées de 20 pixels.',test:s=>s.styles.metricsDisplay==='flex'&&s.styles.metricsGap==='20px',help:'Dans .metrics, écris display: flex; et gap: 20px;.'}]);

const layoutCss=`/* Les sections : complète .station et table. */
.station {
  display: block;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 38px;
  background: #f5f8fb;
  padding: 28px 4.5%;
}
.station h2, .lower h2 { font-size: 28px; margin: 0 0 20px; line-height: 1.2; }
.station h2::after, .lower h2::after { content: ""; display: block; height: 3px; width: 70px; background: #087cf0; margin-top: 15px; }
.station-copy > p { font-size: 18px; margin: 0 0 16px; }
figure { margin: 0; position: relative; }
figure img { width: 100%; height: 330px; object-fit: cover; border-radius: 10px; display: block; }
figcaption { position: absolute; bottom: 10px; left: 10px; padding: 5px 9px; border-radius: 5px; background: #152316ce; color: white; font-size: 12px; }
button { border: 0; border-radius: 25px; background: #087cf0; color: white; font: bold 16px Arial, sans-serif; padding: 12px 24px; cursor: pointer; }
button:hover { background: #005dc5; }
a:focus-visible, button:focus-visible { outline: 3px solid #e2a600; outline-offset: 4px; }
#message { font-size: 14px; color: #235840; }
#message:empty { display: none; }
.lower { display: grid; grid-template-columns: 1.25fr 1fr; gap: 32px; padding: 28px 4.5%; }
.useful-links { border-left: 1px solid #e5ebf2; padding-left: 30px; }
.useful-links ul { list-style: none; padding: 0; line-height: 1.85; margin: 0; }
.useful-links li::before { content: "↗"; color: #087cf0; margin-right: 10px; font-weight: bold; }
.eco-note { background: #e4f4e4; color: #245e32; border-radius: 10px; padding: 18px 24px; margin: 20px 0 0; font-size: 15px; }
table {
  width: 100%;
  border-collapse: separate;
  font-size: 13px;
  text-align: center;
}
caption { text-align: left; color: #63788a; font-size: 11px; margin-bottom: 8px; }
th, td { border: 1px solid #dbe4ee; padding: 7px 9px; }
th { background: #e9eff6; }
tbody tr:nth-child(even) { background: #f6f8fb; }
.site-footer { display: flex; align-items: center; gap: 32px; background: #1e3b53; color: white; padding: 22px 4.5%; }
.site-footer small { color: #d8e5ef; }
.site-footer nav { display: flex; gap: 28px; margin-left: auto; font-size: 13px; }
.site-footer a { color: white; }
.back-top { display: grid; place-items: center; background: #537793; border-radius: 50%; width: 36px; height: 36px; font-size: 24px; }
`;
add({title:'Mettre la page en colonnes',topic:'CSS · La mise en page',tab:'css',objective:'Placer le texte à côté de la photo et rendre le tableau lisible.',explanation:'CSS Grid peut répartir une section en colonnes. display: grid active cette disposition. grid-template-columns: 1fr 1fr partage la largeur en deux parts égales. Dans un tableau, border-collapse: collapse fusionne les bordures voisines pour éviter les traits doublés.',before:'.station { display: block; }\ntable { border-collapse: separate; }',after:'.station { display: grid; grid-template-columns: 1fr 1fr; }\ntable { border-collapse: collapse; }',annotations:['Les deux enfants de .station sont le texte et la figure.','1fr 1fr crée deux colonnes de même largeur.','Les autres règles fournies règlent les détails : arrondis, bordures, boutons et pied de page.'],question:'Que signifie 1fr 1fr dans cette grille ?',options:['Deux couleurs.','Deux colonnes de même largeur.','Deux lignes de JavaScript.'],answer:1,responses:['Il s’agit de la répartition de la largeur.','Exact : chaque colonne reçoit une part de la place disponible.','C’est une règle CSS, pas du JavaScript.'],instructions:['Dans .station, remplace display: block; par display: grid;.','Dans table, remplace separate par collapse.','Compare ta page avec le modèle : les textes, images et mesures doivent être rangés dans les mêmes grandes zones.'],hints:['Cherche la règle .station dans la dernière partie du CSS.','La propriété grid-template-columns est déjà fournie. Tu dois activer la grille avec display: grid.'],takeaway:'Grid partage un espace en colonnes ; le CSS du tableau organise les bordures.',focus:'.station {',scaffold:'Les règles de finition sont ajoutées avec deux propriétés à compléter. Tu actives les colonnes et la fusion des bordures.'},c=>append(c,'css',layoutCss),c=>({...c,css:c.css.replace('.station {\n  display: block;','.station {\n  display: grid;').replace('border-collapse: separate','border-collapse: collapse')}),[{label:'La station utilise une grille à deux colonnes.',test:s=>s.styles.stationDisplay==='grid'&&s.styles.stationColumns?.split(' ').filter(Boolean).length===2,help:'Dans .station, utilise display: grid; et grid-template-columns: 1fr 1fr;.'},{label:'Le tableau fusionne les bordures des cellules.',test:s=>s.styles.tableCollapse==='collapse',help:'Dans table, écris border-collapse: collapse;.'}]);

add({title:'Faire réagir un bouton',topic:'JavaScript · Le clic',tab:'js',objective:'Afficher une explication sur les capteurs quand on clique sur « En savoir plus ».',explanation:'HTML crée le bouton, CSS le présente et JavaScript lui donne un comportement. querySelector("#hello") trouve le bouton par son id. addEventListener("click", …) attend un clic. L’instruction textContent change ensuite le texte du paragraphe #message.',before:'document.querySelector("#hello");',after:'document.querySelector("#hello").addEventListener("click", () => {\n  document.querySelector("#message").textContent = "Les capteurs mesurent notre environnement.";\n});',annotations:['#hello correspond à id="hello" dans le HTML.','Le code entre les accolades s’exécute à chaque clic.','Le message est du texte : conserve les guillemets autour.'],question:'Quand les instructions dans le gestionnaire de clic s’exécutent-elles ?',options:['Quand on change la couleur.','Seulement quand on ferme la page.','Quand on clique sur le bouton.'],answer:2,responses:['La couleur se règle en CSS.','Ce code attend un clic, pas une fermeture.','Oui : l’événement click déclenche les instructions.'],instructions:['Dans JavaScript, remplace #introuvable par #hello.','Remplace « À compléter » par une phrase d’au moins 20 caractères expliquant le rôle des capteurs.','Clique sur « En savoir plus » dans ta page pour tester.'],hints:['Le bouton possède id="hello". Son sélecteur est donc #hello.','Exemple de phrase : Les capteurs mesurent la température, l’humidité et la pression.'],takeaway:'JavaScript associe un événement à une action sur la page.',focus:'#introuvable',scaffold:'Le bouton et son paragraphe sont ajoutés. Le gestionnaire de clic contient un sélecteur et un message à corriger.'},c=>({...c,html:c.html.replace('    </div>\n    <figure>','      <button id="hello">ⓘ En savoir plus</button>\n      <p id="message" aria-live="polite"></p>\n    </div>\n    <figure>'),js:'document.querySelector("#introuvable").addEventListener("click", () => {\n  document.querySelector("#message").textContent = "À compléter";\n});'}),c=>({...c,js:'document.querySelector("#hello").addEventListener("click", () => {\n  document.querySelector("#message").textContent = "Les capteurs mesurent la température, l’humidité et la pression. Les valeurs de cette page sont des exemples pour apprendre.";\n});'}),[{label:'Le bouton affiche une explication au clic, sans erreur JavaScript.',test:action,help:'Corrige #hello, puis écris une phrase d’au moins 20 caractères dans textContent. Le texte doit changer après un clic.'}]);

add({title:'Vérifier et garder mon site',topic:'Projet · La station CHAMS',tab:'html',objective:'Comparer ton site au modèle, le tester et en conserver une copie.',explanation:'Ta page a grandi à chaque étape. Vérifie maintenant l’ensemble : le menu, les quatre cartes, la photo, les mesures et le bouton. Le modèle montre le résultat attendu, mais tes phrases peuvent être différentes. Le téléchargement garde ton HTML, ton CSS, ton JavaScript et les deux images dans un seul fichier.',before:'<p>Projet CHAMS</p>',after:'<p>Projet CHAMS — Réalisé par notre classe</p>',annotations:['Teste les liens du menu : chacun rejoint une section.','Teste le bouton avec la souris, puis avec Tab et Entrée.','Les nombres sont des données d’entraînement : aucune connexion à une vraie station n’est simulée.'],question:'Pour recevoir de vraies mesures de la station, qu’est-ce qui manque encore ?',options:['Une liaison avec les capteurs ou un service qui fournit leurs données.','Un titre plus gros.','Une autre couleur de fond.'],answer:0,responses:['Exact. Le site utilise ici un jeu d’exemple ; des données réelles demandent une connexion supplémentaire.','La taille du titre ne change pas l’origine des données.','Le CSS ne remplace pas une connexion aux capteurs.'],instructions:['Ouvre le modèle et ta page dans deux onglets pour les comparer.','Vérifie les liens et le bouton ; corrige les éventuels messages de la vérification.','Dans le pied de page, ajoute « Réalisé par notre classe » après Projet CHAMS.','Télécharge ton site et ouvre le fichier obtenu dans un navigateur.'],hints:['Reviens à l’étape concernée si une notion te manque. Ton code est conservé à chaque étape.','Cherche Projet CHAMS · Collège dans le pied de page et ajoute la mention demandée.'],takeaway:'Tu as construit une page depuis zéro : contenu, structure, style et interaction.',focus:'Projet CHAMS · Collège',challenge:'Explique à un camarade une ligne de HTML, une règle CSS et l’action du bouton. Puis invente une amélioration.'},same,c=>change(c,'html','Projet CHAMS · Collège','Projet CHAMS — Réalisé par notre classe · Collège'),[{label:'Le titre, la photo, les cartes et les liens de navigation sont présents.',test:s=>hasTitle(s)&&hasImage(s)&&measurements(s)&&navWorks(s),help:'Vérifie le titre CHAMS, la photographie, les quatre valeurs et les destinations du menu.'},{label:'Le tableau possède cinq relevés et le bouton fonctionne.',test:s=>s.tableRows.length>=5&&action(s),help:'Ajoute la cinquième mesure et vérifie le clic sur « En savoir plus ».'},{label:'Le pied de page mentionne le travail de la classe.',test:s=>/Réalisé par notre classe/i.test(s.footerText),help:'Ajoute « Réalisé par notre classe » dans le pied de page.'},{label:'La montagne, les cartes alignées et la station en colonnes sont visibles.',test:s=>s.styles.heroImage?.includes('mountains.png')&&s.styles.metricsDisplay==='flex'&&s.styles.stationDisplay==='grid',help:'Reprends les règles .hero, .metrics et .station : image de fond, Flexbox et grille.'}]);

// Check the concept taught, accepting equivalent HTML/CSS and personal wording.
course[0].checks[0].test=(s,c)=>normalize(s.bodyText).includes('station meteo chams')&&!/<[^>]*>/.test(c.html);
course[1].checks[0].test=(s,c)=>c.html.split(/\r?\n/).filter(l=>l.trim()).length>=2&&normalize(s.bodyText).includes('station meteo chams')&&normalize(s.bodyText).length>30&&!/<[^>]*>/.test(c.html);
course[3].checks[0].test=s=>paragraph(s);
course[4].checks[0].test=(s,c)=>hasTitle(s)&&pairedText(c.html,'h1').some(t=>normalize(t).includes('station meteo chams'));
course[4].checks[1].test=(s,c)=>pairedText(c.html,'h2').some(t=>normalize(t)==='notre station meteo')&&s.paragraphs.filter(p=>p.text.trim()).length>=2;
course[4].checks[1].help='Ajoute <h2>Notre station météo</h2>, puis un paragraphe non vide sur le travail des élèves.';
course[6].checks[0].help='Utilise src="station.png" et une description non vide dans alt. Décris avec tes mots ce que montre la photo.';
course[6].instructions[1]='Dans alt, décris avec tes mots ce que montre la photographie.';
course[6].annotations.push('La vérification contrôle que la description est présente. Relis-la pour vérifier qu’elle décrit vraiment l’image.');
course[8].checks[0].test=usefulLinks;
course[8].checks[0].help='Garde cinq liens non vides dans des li de la liste. Vérifie leurs destinations, dont #station pour « Le projet CHAMS ».';
course[9].checks[0].test=tableComplete;
course[9].checks[0].help='Garde cinq relevés avec quatre cellules et leurs en-têtes. Le relevé de 10:32 doit associer 19 à la température, 60 à l’humidité et 1011 à la pression, quel que soit l’ordre des colonnes ou des lignes.';
course[11].checks[0].test=s=>s.styles.heroImageLoaded===true;
course[11].checks[0].help='Dans .hero, utilise url("mountains.png") : le fichier doit réellement se charger.';
course[12].checks[0].test=cardsAligned;
course[12].checks[0].help='Dispose les cartes horizontalement avec Flexbox et un espace de 20 pixels entre les colonnes. gap et column-gap conviennent.';
course[13].checks[0].test=equalColumns;
course[13].checks[0].help='Dans .station, utilise display: grid; et deux colonnes égales, par exemple grid-template-columns: 1fr 1fr;.';
course[13].checks[0].label='La station utilise une grille à deux colonnes de même largeur.';
course[13].exampleBefore={html:'<section class="station"><div>Présentation</div><div>Photo de la station</div></section><table><tr><th>Heure</th><th>°C</th></tr><tr><td>10:32</td><td>19</td></tr></table>',css:'.station { display: block; }\n.station > div { padding: 12px; background: #d8ecff; }\ntable { border-collapse: separate; margin-top: 12px; }\nth, td { border: 1px solid #55718a; padding: 6px; }',js:''};
course[13].exampleAfter={...course[13].exampleBefore,css:course[13].exampleBefore.css.replace('display: block','display: grid; grid-template-columns: 1fr 1fr; gap: 12px').replace('border-collapse: separate','border-collapse: collapse')};
course[15].checks[1].test=s=>tableComplete(s)&&usefulLinks(s)&&action(s);
course[15].checks[1].label='Le tableau est complet, les cinq liens utiles sont présents et le bouton fonctionne.';
course[15].checks[1].help='Vérifie les cinq relevés à quatre cellules, les cinq liens de la liste et le clic sur « En savoir plus ».';
course[15].checks[3].test=s=>heroReady(s)&&cardsAligned(s)&&equalColumns(s)&&s.styles.tableCollapse==='collapse';
// Insert by element identity, not by whitespace, indentation or quote style.
const figureMarkup=parseHtml(course[6].starter.html).querySelector('#station figure').outerHTML;
const buttonMarkup='<button id="hello">ⓘ En savoir plus</button>\n<p id="message" aria-live="polite"></p>';
const initialJavaScript=course[14].starter.js;
course[6].prepare=c=>editHtml(c,doc=>{const section=doc.getElementById('station');if(section&&!section.querySelector('figure'))section.insertAdjacentHTML('beforeend','\n'+figureMarkup+'\n');});
course[7].prepare=c=>editHtml(c,doc=>{if(!doc.querySelector('.metrics'))doc.querySelector('main')?.insertAdjacentHTML('afterbegin','\n'+metrics+'\n');});
course[8].prepare=c=>editHtml(c,doc=>{if(!doc.querySelector('.useful-links'))doc.getElementById('donnees')?.insertAdjacentHTML('beforeend','\n'+links+'\n');});
course[9].prepare=c=>editHtml(c,doc=>{if(!doc.querySelector('.history'))doc.getElementById('donnees')?.insertAdjacentHTML('afterbegin','\n'+table+'\n');});
course[14].prepare=c=>({...editHtml(c,doc=>{if(!doc.getElementById('hello'))doc.querySelector('.station-copy')?.insertAdjacentHTML('beforeend','\n'+buttonMarkup+'\n');}),js:c.js.trim()?c.js:initialJavaScript});
for(let i=0;i<course.length;i++){course[i].criteria=course[i].checks.map(c=>c.label);if(i>0)course[i].starter=course[i].prepare(copy(course[i-1].solution));}
function validateExercise(index,snapshot,code){return course[index].checks.map(check=>{let pass=false;try{pass=!!check.test(snapshot,code);}catch{}return {pass,message:pass?check.label:check.help};});}
const target=course[course.length-1].solution;
globalThis.WebLabCourse={course,validateExercise,target};
if(typeof module!=='undefined')module.exports={course,validateExercise,target};
})();
