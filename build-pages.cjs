'use strict';
const fs=require('node:fs'),path=require('node:path');
const source=path.join(__dirname,'public'),target=path.join(__dirname,'dist');
fs.mkdirSync(target,{recursive:true});
for(const file of fs.readdirSync(source)){if(fs.statSync(path.join(source,file)).isFile())fs.copyFileSync(path.join(source,file),path.join(target,file));}
fs.writeFileSync(path.join(target,'config.js'),'window.APEX_CONFIG = { static: true, serverUrl: "" };\n');
fs.writeFileSync(path.join(target,'.nojekyll'),'');
console.log('Static GitHub Pages build ready in dist/');
