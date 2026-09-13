const fs=require('node:fs');
const path=require('node:path');
const files=['index.html','preview.html','goal.html','style.css','app.js','weather-course.js','game-course.js','engine.js','three.bundle.js','three-runtime.js','mountains.png','station.png'];
const output=path.join(__dirname,'dist');
fs.mkdirSync(output,{recursive:true});
for(const file of files)fs.copyFileSync(path.join(__dirname,file),path.join(output,file));
fs.writeFileSync(path.join(output,'.nojekyll'),'');
console.log('Static site ready in dist.');
