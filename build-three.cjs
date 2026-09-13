const license=require('node:fs').readFileSync('node_modules/three/LICENSE','utf8');
require('esbuild').buildSync({entryPoints:['three-entry.js'],bundle:true,minify:true,format:'iife',outfile:'three.bundle.js',legalComments:'eof',banner:{js:'/*\n'+license+'\n*/'}});
