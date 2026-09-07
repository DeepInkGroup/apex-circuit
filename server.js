'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const P=require('./public/physics');
const rooms=new Map(),sessions=new Map(),PORT=Number(process.env.PORT)||3000;
const allowedOrigins=new Set((process.env.ALLOWED_ORIGINS||'https://deepinkgroup.github.io').split(',').map(s=>s.trim()).filter(Boolean));
const colors=['#b7f76b','#67d9ff','#ff826f','#ffc75b','#c09cff','#ffffff','#64ffc9','#ee91df'];
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function snapshot(r){return {code:r.code,host:r.host,status:r.status,start:r.start,laps:r.laps,trackId:r.trackId,now:Date.now(),engine:P.VERSION,players:[...r.players.values()].map(({token,input,stream,seen,...p})=>p)};}
function remove(p){const r=rooms.get(p.code);p.stream?.end();sessions.delete(p.token);if(!r)return;r.players.delete(p.id);if(!r.players.size)rooms.delete(r.code);else if(r.host===p.id)r.host=r.players.keys().next().value;}
function resetCars(r){let i=0;for(const p of r.players.values()){const setup=p.setup;Object.assign(p,P.spawn(i++,r.trackId,setup),{raceMode:true,input:{}});}}
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    const origin=req.headers.origin;
    if(origin){
      let sameHost=false;try{sameHost=new URL(origin).host===req.headers.host;}catch{}
      const permitted=sameHost||allowedOrigins.has(origin);
      if(!permitted&&(url.pathname==='/health'||url.pathname==='/events'||url.pathname.startsWith('/api/')||req.method==='OPTIONS'))return send(res,403,{error:'This website is not allowed by the server.'});
      if(permitted){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');}
    }
    if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
    if(url.pathname==='/health')return send(res,200,{app:'apex-circuit',version:P.VERSION,release:'7.0.0',protocol:7,tracks:Object.keys(P.tracks),rooms:rooms.size});
    if(url.pathname==='/events'){
      const p=sessions.get(url.searchParams.get('token'));
      if(!p)return send(res,401,{error:'Session expired. Join again.'});
      p.stream?.end();res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});
      p.stream=res;p.seen=Date.now();res.write('data: '+JSON.stringify(snapshot(rooms.get(p.code)))+'\n\n');
      res.on('close',()=>{if(p.stream===res){p.stream=null;p.input={};}});return;
    }
    if(req.method==='POST'&&url.pathname.startsWith('/api/')){
      let body='';for await(const c of req){body+=c;if(body.length>4096)return send(res,413,{error:'Request too large'});}
      let data;try{data=JSON.parse(body||'{}');}catch{return send(res,400,{error:'Invalid JSON'});}
      if(!data||typeof data!=='object'||Array.isArray(data))return send(res,400,{error:'Invalid request'});
      const action=url.pathname.slice(5);
      if(action==='host'||action==='join'){
        let r;
        if(action==='host'){
          if(rooms.size>=100)return send(res,503,{error:'Server full'});
          let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));
          const trackId=P.tracks[data.trackId]?data.trackId:'harbor',laps=Math.max(1,Math.min(20,Math.round(Number(data.laps)||3)));
          r={code,players:new Map(),status:'lobby',start:0,laps,trackId};rooms.set(code,r);
        }else{
          r=rooms.get(String(data.code).trim().toUpperCase());
          if(!r)return send(res,404,{error:'Room not found. Check the code.'});
          if(r.status!=='lobby')return send(res,409,{error:'Race in progress. Ask the host to return to the lobby.'});
          if(r.players.size>=8)return send(res,409,{error:'Room is full.'});
        }
        const token=crypto.randomBytes(24).toString('hex'),id=crypto.randomBytes(6).toString('hex');
        const used=new Set([...r.players.values()].map(p=>p.color));
        const p={...P.spawn(r.players.size,r.trackId,data.setup),raceMode:true,id,token,code:r.code,name:String(data.name||'Driver').trim().slice(0,18)||'Driver',color:colors.find(c=>!used.has(c))||colors[0],input:{},seen:Date.now()};
        r.players.set(id,p);sessions.set(token,p);r.host??=id;
        return send(res,200,{token,id,room:snapshot(r)});
      }
      const p=sessions.get(data.token);if(!p)return send(res,401,{error:'Session expired. Join again.'});
      p.seen=Date.now();const r=rooms.get(p.code);
      if(action==='input')p.input={up:!!data.up,down:!!data.down,left:!!data.left,right:!!data.right,handbrake:!!data.handbrake};
      else if(action==='start'){
        if(r.host!==p.id)return send(res,403,{error:'Only the host can start.'});
        if(r.status==='racing')return send(res,409,{error:'Race already running.'});
        resetCars(r);r.status='racing';r.start=Date.now()+3000;
        for(const car of r.players.values())car.lapStart=r.start;
      }else if(action==='reset'){
        if(r.host!==p.id)return send(res,403,{error:'Only the host can reset.'});
        r.status='lobby';resetCars(r);
      }else if(action==='recover'){
        if(r.status!=='racing'||Date.now()<r.start)return send(res,409,{error:'Recovery is available during a race.'});
        if(!P.recover(p,Date.now()))return send(res,409,{error:'Wait a moment before recovering again.'});
      }else if(action==='leave')remove(p);
      else return send(res,404,{error:'Unknown action'});
      return send(res,200,{ok:true});
    }
    if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
    const files=new Map([['/','index.html'],['/index.html','index.html'],['/style.css','style.css'],['/game.js','game.js'],['/physics.js','physics.js'],['/racing.js','racing.js'],['/config.js','config.js'],['/icon.svg','icon.svg'],['/renderer.js','renderer.js']]);
    const file=files.get(url.pathname);if(!file)return send(res,404,{error:'Not found'});
    const content=await fs.promises.readFile(path.join(__dirname,'public',file));
    res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/javascript','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(content);
  }catch(e){if(!res.headersSent)send(res,500,{error:'Server error'});else res.end();}
});
let tick=0,last=performance.now(),accumulator=0;
setInterval(()=>{
  const clock=performance.now();accumulator+=Math.min(.2,(clock-last)/1000);last=clock;
  while(accumulator>=1/60){
    accumulator-=1/60;tick++;const now=Date.now()-accumulator*1000;
    for(const r of rooms.values()){
      for(const p of r.players.values()){
        if(Date.now()-p.seen>30000){remove(p);continue;}
        if(r.status==='racing'&&now>=r.start){
          P.step(p,now-p.seen<600?p.input:{},1/60,now);
          if(p.lap>=r.laps){p.finished=true;p.speed=0;p.vx=p.vy=0;p.finish??=now-r.start+p.penalty;}
        }
      }
      if(r.status==='racing'&&r.players.size&&[...r.players.values()].every(p=>p.finished))r.status='finished';
      if(tick%3===0){const msg='data: '+JSON.stringify(snapshot(r))+'\n\n';for(const p of r.players.values())if(p.stream&&!p.stream.writableNeedDrain)p.stream.write(msg);}
    }
  }
},1000/60).unref();
server.listen(PORT,'0.0.0.0',()=>console.log('APEX CIRCUIT '+P.VERSION+' at http://localhost:'+PORT));
