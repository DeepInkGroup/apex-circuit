const http=require('node:http'),{spawn}=require('node:child_process');
const port=Number(process.env.PORT)||3000,url='http://localhost:'+port;
function open(){console.log('Play at '+url);if(process.platform==='win32')spawn('explorer.exe',[url],{windowsHide:true,stdio:'ignore'}).on('error',()=>{});}
let started=false;
function start(){if(started)return;started=true;console.log('Starting Harbor Run. Keep this window open while playing.');require('./server.js');setTimeout(open,500);}
const req=http.get(url+'/health',res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>{try{if(JSON.parse(body).app==='apex-circuit'){console.log('The game server is already running.');open();return;}}catch{}console.error('Port '+port+' is already in use. Close the older server or set PORT to a free port.');});});
req.setTimeout(1500,()=>req.destroy());req.on('error',start);
