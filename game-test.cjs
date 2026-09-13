const assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
require('./weather-course.js');
const {course,validateExercise}=require('./game-course.js');
const {makeDocument}=require('./engine.js');
function observe(code){
  const errors=[];const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(makeDocument(code),{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console});
  try{const s=dom.window.atelier.observer();const style=dom.window.document.createElement('i').style;style.color=s.color;s.validColor=!!style.color;return {game:s,errors:[...errors,...dom.window.__webLabErrors]};}finally{dom.window.close();}
}
for(let i=5;i<9;i++){
  const lesson=course[i];
  assert.ok(validateExercise(i,observe(lesson.solution),lesson.solution).every(c=>c.pass),'Solution '+(i+1));
  assert.ok(validateExercise(i,observe(lesson.starter),lesson.starter).some(c=>!c.pass),'Starter '+(i+1)+' must need work');
  const broken={...lesson.solution,js:lesson.solution.js+'\nthrow new Error("broken")'};
  assert.ok(validateExercise(i,observe(broken),broken).every(c=>!c.pass),'Runtime error must not pass');
}
assert.equal(course[9].prepare(course[8].solution).html,'','Web starts blank');
assert.ok(!course[5].prepare(course[4].solution).js.includes('sauter'),'2D starts a new project');
const customGame={...course[1].solution,js:course[1].solution.js.replace('= 2','= -2')};
assert.ok(course[3].prepare(customGame).js.includes('= -2'),'New function preserves personalization');
console.log('Passed: 4 2D solutions, incomplete starters, runtime errors, chapter resets and preserved changes. Three.js is tested in a real browser.');
