const assert=require('node:assert/strict');
const vm=require('node:vm');
require('./weather-course.js');
const {course,validateExercise}=require('./game-course.js');
const {createPlatformer}=require('./platformer-runtime.js');
function boot(code,stage=14){const w={};const runtime=createPlatformer(w,{stage});vm.createContext(w);vm.runInContext(code.js,w);runtime.demarrer();return {w,runtime};}
function observe(code,stage){try{const {runtime}=boot(code,stage);return {game:runtime.observer(),errors:[]};}catch(e){return {errors:[e.message]};}}
for(let i=15;i<30;i++){
 const lesson=course[i];
 assert.ok(validateExercise(i,observe(lesson.solution,i-15),lesson.solution).every(c=>c.pass),'Solution '+(i+1));
 assert.ok(validateExercise(i,observe(lesson.starter,i-15),lesson.starter).some(c=>!c.pass),'Starter '+(i+1)+' must need work');
 const broken={...lesson.solution,js:lesson.solution.js+'\nthrow new Error("broken")'};
 assert.ok(validateExercise(i,observe(broken,i-15),broken).every(c=>!c.pass),'Runtime error must not pass');
}
assert.equal(course.length,46);assert.equal(course[30].prepare(course[29].solution).html,'','Web starts blank');
assert.ok(!course[15].prepare(course[14].solution).js.includes('sauter'),'2D starts a new project');
const custom={...course[16].solution,js:course[16].solution.js.replace('= 128','= 96')};assert.ok(course[18].prepare(custom).js.includes('= 96'));
const {w,runtime:r}=boot(course[29].solution);
assert.equal(r.tiles.length,20);assert.ok(r.tiles.every(row=>row.length===100));
assert.equal(r.groundAt(1280),576);assert.equal(r.groundAt(1312),544);assert.equal(r.groundAt(1568),576);
r.jump();assert.equal(w.joueur.vitesseY,-12);for(let i=0;i<10;i++)r.tick();const vy=w.joueur.vitesseY;r.jump();assert.equal(w.joueur.vitesseY,vy,'Air jump blocked');for(let i=0;i<80;i++)r.tick();assert.equal(w.joueur.y,512);assert.equal(w.joueur.auSol,true);
// Walk a real physics route; no teleporting or skipping collision checks.
r.keys.add('ArrowRight');let topLanding=false,slopeReached=false;
for(let i=0;i<3000&&!r.state.ended&&!r.state.lost;i++){
 const p=w.joueur;
 const nearCoin=r.coins.some(c=>c.visible&&c.x>=p.x&&c.x-p.x<90);
 const nearEnemy=r.enemies.some(e=>e.visible&&e.x>=p.x-5&&e.x-p.x<100);
 const nearPlatform=r.platforms.some(q=>q.x>=p.x&&q.x-p.x<85);
 if(p.auSol&&(nearCoin||nearEnemy||nearPlatform))r.jump();
 r.tick();if(p.auSol&&p.y===416)topLanding=true;if(p.x>1312&&p.x<1536&&p.y===480)slopeReached=true;
}
assert.equal(r.state.ended,true,'Complete level can be finished through movement and jumps');assert.ok(w.score>=5);assert.ok(topLanding,'Platforms are reachable');assert.ok(r.state.checkpoint);assert.ok(slopeReached,'Hill surface is walkable');
r.reset();assert.equal(w.score,0);assert.equal(w.vies,3);assert.equal(w.pointDepart,128);assert.equal(w.joueur.x,128);assert.equal(r.state.ended,false);assert.ok(r.coins.every(c=>c.visible));assert.ok(r.enemies.every(e=>e.visible));
// Contact damage, stomp and checkpoint use the same collision loop as live play.
const enemy=r.enemies[0];w.joueur.x=enemy.x;w.joueur.y=512;r.tick();assert.equal(w.vies,2);assert.equal(w.joueur.x,128);
w.pointDepart=1664;for(let i=0;i<110;i++)r.tick();w.joueur.x=enemy.x;w.joueur.y=512;r.tick();assert.equal(w.vies,1);assert.equal(w.joueur.x,1664);
for(let i=0;i<110;i++)r.tick();w.joueur.x=enemy.x;w.joueur.y=512;r.tick();assert.equal(r.state.lost,true);assert.equal(w.vies,0);
r.reset();w.joueur.x=enemy.x;w.joueur.y=enemy.y-64;w.joueur.vitesseY=4;w.joueur.auSol=false;r.tick();assert.equal(enemy.visible,false);assert.equal(w.joueur.vitesseY,-8);
console.log('Passed: 15 platformer solutions and incomplete starters, errors, chapter resets, full traversable level, platforms, hill, coins, checkpoint, damage, loss, stomp and restart.');
