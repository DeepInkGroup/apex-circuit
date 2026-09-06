'use strict';
const $=id=>document.getElementById(id),keys={},renderer=new CircuitRenderer($('track'));
const STORAGE='apex-'+Physics.VERSION;
let session=null,room=null,events=null,offset=0,local,previous=performance.now(),accumulator=0,simTime=Date.now();
let boardAt=0,inputBusy=false,recording=[],recordAt=0,personal=null,ghostEnabled=true,guide=true,sound=false,audio=null;
let snapshots=[],toastUntil=0,seenLap=0,seenSector=0,wasValid=true,follow=matchMedia('(max-width:700px)').matches;
let localRace=null,selectedMode='practice',lapHistory=[],serverReady=false,apiBase='',connecting=false;
const config=window.APEX_CONFIG||{static:false,serverUrl:''};
try{const saved=JSON.parse(localStorage.getItem(STORAGE+'-laps'));if(Array.isArray(saved))lapHistory=saved.filter(p=>p&&Number.isFinite(p.time)&&p.time>0&&Array.isArray(p.sectors)&&typeof p.mode==='string').slice(0,10);}catch{}
try{const saved=JSON.parse(localStorage.getItem(STORAGE));if(saved?.version===Physics.VERSION&&Number.isFinite(saved.best)&&saved.best>0&&Array.isArray(saved.frames)&&saved.frames.length>2&&saved.frames.length<=12000&&saved.frames.every(f=>['t','x','y','angle'].every(k=>Number.isFinite(f[k]))))personal=saved;const name=localStorage.getItem('apex-name');if(name)$('name').value=name.slice(0,18);}catch{}
function fmt(ms){if(ms==null||!Number.isFinite(ms))return '—';ms=Math.max(0,Math.floor(ms));return String(Math.floor(ms/60000)).padStart(2,'0')+':'+String(Math.floor(ms/1000)%60).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0');}
function split(ms){return ms==null?'—':(ms/1000).toFixed(3);}
function message(text){$('message').textContent=text;}
function toast(text){$('toast').textContent=text;toastUntil=performance.now()+3500;}
function clearKeys(){for(const k in keys)keys[k]=false;}
function practice(){
  localRace=null;if($('results').open)$('results').close();
  local={...Physics.spawn(),id:'local',name:$('name').value.trim()||'Driver',color:'#b7f76b'};
  if(personal){local.best=personal.best;local.bestSectors=personal.sectors||[];}
  simTime=Date.now();local.lapStart=simTime;accumulator=0;recording=[];recordAt=0;seenLap=seenSector=0;wasValid=true;clearKeys();renderer.clear();
}
practice();
function setMode(mode){
  if(session&&mode!=='online'){toast('LEAVE YOUR ONLINE ROOM BEFORE SWITCHING MODES');return;}
  if(localRace&&mode!==selectedMode)practice();selectedMode=mode;message('');
  for(const item of ['practice','sprint','online']){$('mode-'+item).setAttribute('aria-pressed',String(item===mode));$(item+'-controls').hidden=item!==mode;}
  $('distance-setting').hidden=mode==='practice'||!!session;
  $('panel-title').textContent=mode==='practice'?'Chase your best.':mode==='sprint'?'Meet your rivals.':'Bring your friends.';
  $('panel-eyebrow').textContent=mode==='practice'?'ONE MORE LAP':mode==='sprint'?'A GRID OF FOUR':'MAKE IT A RACE';
  $('panel-description').textContent=mode==='practice'?'Find your rhythm, save a ghost, and earn your Harbor Run medal.':mode==='sprint'?'Mika, Jules, and Nova are waiting. Pick your pace and chase the podium.':'Connect to the same server, then share a six-character room code.';
}
for(const mode of ['practice','sprint','online'])$('mode-'+mode).onclick=()=>setMode(mode);
function renderHistory(){
  const container=$('lap-history');container.replaceChildren();$('export-laps').disabled=!lapHistory.length;
  if(!lapHistory.length){const p=document.createElement('p');p.className='empty-history';p.textContent='Cross the finish line to start your session log.';container.append(p);return;}
  for(const lap of lapHistory){const row=document.createElement('div');row.className='history-row';
    for(const text of [lap.mode,fmt(lap.time),...lap.sectors.map(split),lap.valid?(Racing.medal(lap.time)||'CLEAN'):'INVALID']){const span=document.createElement('span');span.textContent=text;row.append(span);}
    row.classList.toggle('invalid',!lap.valid);container.append(row);
  }
}
function recordLap(car,mode){
  lapHistory.unshift({mode,time:car.last,sectors:[...car.lastSectors],valid:car.lastValid,date:new Date().toISOString()});lapHistory=lapHistory.slice(0,10);
  try{localStorage.setItem(STORAGE+'-laps',JSON.stringify(lapHistory));}catch{}renderHistory();
}
$('export-laps').onclick=()=>{const blob=new Blob([JSON.stringify({track:'Harbor Run',laps:lapHistory},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='apex-circuit-laps.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
renderHistory();
function startSprint(){
  if(session)return;practice();setMode('sprint');
  localRace=Racing.createSprint($('name').value.trim()||'Driver',$('difficulty').value,Number($('race-laps').value));local=localRace.players[0];clearKeys();
  try{localStorage.setItem('apex-name',$('name').value);}catch{}
}
$('start-sprint').onclick=startSprint;$('end-sprint').onclick=()=>{practice();setMode('practice');};
$('practice-reset').onclick=()=>{practice();toast('NEW SESSION · CROSS THE LINE TO START');};
$('name').onchange=()=>{if(!session&&!localRace)local.name=$('name').value.trim()||'Driver';try{localStorage.setItem('apex-name',$('name').value);}catch{}};
function showResults(){
  const order=Racing.standings(localRace.players),position=order.findIndex(p=>p.id==='local')+1;
  $('results-title').textContent=local.dnf?'Next race is yours.':position===1?'Top step. Well driven.':'P'+position+' · Race complete.';
  $('results-subtitle').textContent=localRace.laps+' laps · '+localRace.difficulty.toUpperCase()+' · Penalties included';
  $('results-board').replaceChildren(...order.map((p,i)=>{const row=document.createElement('div');row.className='result-row';const name=document.createElement('span');name.textContent=(i+1)+'. '+p.name+(p.id==='local'?' · YOU':'');name.style.color=p.color;const time=document.createElement('b');time.textContent=p.dnf?'DNF':fmt(p.finish)+(p.penalty?' (+'+p.penalty/1000+'s)':'');row.append(name,time);return row;}));
  $('results').showModal();clearKeys();
}
$('race-again').onclick=()=>{$('results').close();startSprint();};$('close-results').onclick=()=>$('results').close();
function endpoint(path){return new URL(path,apiBase).href;}
async function connectServer(value,quiet=false){
  if(session||connecting)return;connecting=true;serverReady=false;$('host').disabled=$('join').disabled=true;$('connect-server').disabled=true;
  try{
    const url=new URL(value||'./',location.href);
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('Use a plain HTTP or HTTPS server address.');
    if(location.protocol==='https:'&&url.protocol!=='https:')throw new Error('This page needs an HTTPS multiplayer server.');
    if(!url.pathname.endsWith('/'))url.pathname+='/';
    const res=await fetch(new URL('health',url),{signal:AbortSignal.timeout(7000)});if(!res.ok)throw new Error('Server is unavailable. Check its address.');
    const info=await res.json();if(info.app!=='apex-circuit'||info.version!==Physics.VERSION||info.protocol!==3)throw new Error('This server needs the Rivals update.');
    apiBase=url.href;serverReady=true;$('server-url').value=url.origin+(url.pathname==='/'?'':url.pathname);$('server-status').textContent='Connected · ready to host or join.';
    try{if(url.origin!==location.origin)localStorage.setItem('apex-server',apiBase);}catch{}
  }catch(e){$('server-status').textContent=quiet?'Solo and AI racing are ready. Connect a server for online rooms.':e.message==='Failed to fetch'?'Could not connect. Check HTTPS, the server address, and its allowed origins.':e.message;}
  finally{connecting=false;$('connect-server').disabled=false;$('host').disabled=$('join').disabled=!serverReady;}
}
$('connect-server').onclick=()=>connectServer($('server-url').value);
let savedServer='';try{savedServer=localStorage.getItem('apex-server')||'';}catch{}
if(!config.static)connectServer(location.origin+'/',true);else if(config.serverUrl||savedServer){$('server-url').value=config.serverUrl||savedServer;connectServer($('server-url').value,true);}
async function api(action,data={}){
  if(!serverReady)throw new Error('Connect a multiplayer server first.');
  const res=await fetch(endpoint('api/'+action),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,token:session?.token}),signal:AbortSignal.timeout(5000)});
  const result=await res.json();if(!res.ok)throw new Error(result.error||'Connection failed');return result;
}
function receive(next){
  room=next;offset=room.now-Date.now();snapshots.push(next);if(snapshots.length>5)snapshots.shift();
  $('connection').textContent='● ROOM '+room.code;
}
async function enter(action){
  if(!serverReady||session)return;if(localRace)practice();setMode('online');
  $('host').disabled=$('join').disabled=true;clearKeys();
  try{
    const result=await api(action,{name:$('name').value,code:$('code').value.trim(),laps:Number($('race-laps').value)});
    session={token:result.token,id:result.id};snapshots=[];receive(result.room);seenLap=seenSector=0;wasValid=true;renderer.clear();
    try{localStorage.setItem('apex-name',$('name').value);}catch{}
    events=new EventSource(endpoint('events')+'?token='+session.token);
    events.onmessage=e=>receive(JSON.parse(e.data));events.onerror=()=>{$('connection').textContent='● RECONNECTING';};
    $('room-form').hidden=true;$('room').hidden=false;$('copy').textContent=room.code;$('server-setup').hidden=true;$('driver-profile').hidden=true;$('distance-setting').hidden=true;
    message('Friends connect to '+new URL(apiBase).host+' and enter this room code.');
  }catch(e){message(e.message);}finally{$('host').disabled=$('join').disabled=!serverReady;}
}
function leaveLocal(){events?.close();events=null;session=null;room=null;snapshots=[];$('room-form').hidden=false;$('room').hidden=true;$('server-setup').hidden=false;$('driver-profile').hidden=false;$('connection').textContent='● SOLO PRACTICE';practice();setMode('online');}
$('host').onclick=()=>enter('host');$('join').onclick=()=>enter('join');$('code').onkeydown=e=>{if(e.key==='Enter')enter('join');};
$('leave').onclick=async()=>{try{await api('leave');}catch{}leaveLocal();message('Back in practice.');};
$('start').onclick=async()=>{try{await api('start');clearKeys();seenLap=seenSector=0;wasValid=true;renderer.clear();message('');}catch(e){message(e.message);}};
$('reset').onclick=async()=>{try{await api('reset');clearKeys();}catch(e){message(e.message);}};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(room.code);message('Room code copied.');}catch{message('Room code: '+room.code);}};
$('restart').onclick=()=>{practice();toast('NEW SESSION · CROSS THE LINE TO START');};
async function recover(){if(session){try{await api('recover');toast('RECOVERED · LAP INVALID');}catch(e){toast(e.message);}}else if(localRace?.status==='countdown'){toast('WAIT FOR THE GREEN LIGHT');}else if(Physics.recover(local,localRace?localRace.clock:simTime)){toast('RECOVERED · LAP INVALID');}clearKeys();}
$('recover').onclick=recover;
function toggle(button,value,label){button.setAttribute('aria-pressed',String(value));button.replaceChildren(document.createTextNode(label+' '));const state=document.createElement('span');state.textContent=value?'ON':'OFF';button.append(state);}
$('line-toggle').onclick=()=>{guide=!guide;toggle($('line-toggle'),guide,'Guide');};
$('ghost-toggle').onclick=()=>{ghostEnabled=!ghostEnabled;toggle($('ghost-toggle'),ghostEnabled,'Ghost');};
$('camera-toggle').onclick=()=>{follow=!follow;toggle($('camera-toggle'),follow,'Follow');};
toggle($('camera-toggle'),follow,'Follow');
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.race-shell').requestFullscreen();}catch{toast('Fullscreen is not available in this browser.');}};
function initAudio(){
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Audio is unavailable in this browser.');
  const context=new AC(),gain=context.createGain(),filter=context.createBiquadFilter(),engine=context.createOscillator(),harmonic=context.createOscillator();
  engine.type='sawtooth';harmonic.type='triangle';filter.type='lowpass';filter.frequency.value=360;gain.gain.value=0;
  engine.connect(filter);harmonic.connect(filter);filter.connect(gain);gain.connect(context.destination);engine.start();harmonic.start();return {context,gain,filter,engine,harmonic};
}
$('sound-toggle').onclick=async()=>{try{audio??=initAudio();sound=!sound;if(sound)await audio.context.resume();else await audio.context.suspend();toggle($('sound-toggle'),sound,'Sound');}catch(e){sound=false;toast(e.message);}};
function updateAudio(p){if(!audio||!sound)return;const t=audio.context.currentTime,speed=Math.abs(p.speed),gear=Math.max(1,Math.ceil(speed/62)),rpm=55+(speed%62)*1.6+(keys.up?18:0);audio.engine.frequency.setTargetAtTime(rpm,t,.06);audio.harmonic.frequency.setTargetAtTime(rpm*.5,t,.06);audio.filter.frequency.setTargetAtTime(260+speed*2,t,.12);audio.gain.gain.setTargetAtTime(document.hidden?0:.012+(keys.up?.007:0),t,.1);}
const keymap={w:'up',arrowup:'up',s:'down',arrowdown:'down',a:'left',arrowleft:'left',d:'right',arrowright:'right',' ':'handbrake'};
addEventListener('keydown',e=>{
  if(/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName))return;
  const key=e.key.toLowerCase(),k=keymap[key];if(k){e.preventDefault();keys[k]=true;}
  if(!e.repeat){if(key==='r')recover();if(key==='g')$('ghost-toggle').click();if(key==='l')$('line-toggle').click();if(key==='m')$('sound-toggle').click();if(key==='c')$('camera-toggle').click();}
});
addEventListener('keyup',e=>{const k=keymap[e.key.toLowerCase()];if(k){if(!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))e.preventDefault();keys[k]=false;}});
addEventListener('blur',clearKeys);document.addEventListener('visibilitychange',()=>{clearKeys();previous=performance.now();accumulator=0;});
// Buttons release focus after pointer use so keyboard driving resumes immediately.
document.querySelectorAll('button').forEach(b=>b.addEventListener('click',e=>{if(e.detail)b.blur();}));
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.key]=true;};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys[b.dataset.key]=false;});
setInterval(async()=>{if(!session||inputBusy)return;inputBusy=true;try{await api('input',keys);}catch(e){message(e.message);if(e.message.includes('expired'))leaveLocal();}finally{inputBusy=false;}},50);
addEventListener('pagehide',()=>{if(session)navigator.sendBeacon(endpoint('api/leave'),JSON.stringify({token:session.token}));});
function ghostFrame(p,t){return {t,x:p.x,y:p.y,angle:p.angle};}
function simulate(dt){
  accumulator+=dt;
  while(accumulator>=1/60){
    accumulator-=1/60;simTime+=1000/60;
    if(localRace){const lap=local.lap;Racing.stepSprint(localRace,keys,1/60);if(local.lap>lap)recordLap(local,'AI '+localRace.difficulty);if(localRace.status==='finished'&&!localRace.shown){localRace.shown=true;showResults();}continue;}
    const lap=local.lap,started=local.started,start=local.lapStart,best=local.best;
    Physics.step(local,keys,1/60,simTime);
    if(!started&&local.started){recording=[ghostFrame(local,0)];recordAt=simTime;}
    if(local.lap>lap){
      recordLap(local,'Time attack');
      if(recording.length)recording.push(ghostFrame(local,simTime-start));
      if(local.lastValid&&(best===null||local.best<best)&&recording.length>2){
        personal={version:Physics.VERSION,best:local.best,sectors:[...local.bestSectors],frames:recording};
        try{localStorage.setItem(STORAGE,JSON.stringify(personal));}catch{toast('BEST LAP SET · STORAGE FULL, GHOST SAVED FOR THIS SESSION');}
      }
      recording=[ghostFrame(local,0)];recordAt=simTime;
    }else if(local.started&&simTime-recordAt>=90&&recording.length<12000){recording.push(ghostFrame(local,simTime-local.lapStart));recordAt=simTime;}
  }
}
function ghostAt(t){
  if(!ghostEnabled||session||localRace||!personal||!local.started||t>personal.best)return null;
  const frames=personal.frames;let lo=0,hi=frames.length-1;
  while(lo+1<hi){const mid=(lo+hi)>>1;if(frames[mid].t<t)lo=mid;else hi=mid;}
  const a=frames[lo],b=frames[hi],f=Math.max(0,Math.min(1,(t-a.t)/Math.max(1,b.t-a.t)));
  return {...a,x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,angle:a.angle+Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle))*f,color:'#9fdddd'};
}
function visualPlayers(time){
  if(!room)return localRace?localRace.players:[local];
  const target=time-85;let a=snapshots[0],b=snapshots.at(-1);
  for(let i=0;i<snapshots.length-1;i++){if(snapshots[i].now<=target){a=snapshots[i];b=snapshots[i+1];}}
  if(!a||!b)return room.players;
  const f=Math.max(0,Math.min(1,(target-a.now)/Math.max(1,b.now-a.now)));
  return room.players.map(p=>{
    const older=a.players.find(v=>v.id===p.id),newer=b.players.find(v=>v.id===p.id);
    if(!older||!newer||Math.hypot(newer.x-older.x,newer.y-older.y)>100||older.recoveries!==newer.recoveries)return p;
    return {...p,x:older.x+(newer.x-older.x)*f,y:older.y+(newer.y-older.y)*f,angle:older.angle+Math.atan2(Math.sin(newer.angle-older.angle),Math.cos(newer.angle-older.angle))*f};
  });
}
function ranked(players){return Racing.standings(players);}
function board(players){
  $('count').textContent=String(players.length).padStart(2,'0');
  $('board').replaceChildren(...ranked(players).map((p,i)=>{
    const row=document.createElement('div');row.className='row';const driver=document.createElement('div');driver.className='driver';
    const rank=document.createElement('span');rank.className='rank';rank.textContent=String(i+1).padStart(2,'0');
    const name=document.createElement('span');name.className='driver-name';name.style.color=p.color;name.textContent=p.name;
    const race=room||localRace;const info=document.createElement('small');info.textContent=(p.id===(session?.id||'local')?'YOU · ':p.ai?'AI · ':'')+(p.dnf?'DNF':p.finished?'FIN '+fmt(p.finish):race?'LAP '+Math.min(p.lap+1,race.laps):'TIME ATTACK')+(p.penalty?' · +'+p.penalty/1000+'s':'');name.append(info);
    const best=document.createElement('b');best.textContent=fmt(p.best);driver.append(rank,name);row.append(driver,best);return row;
  }));
}
function hud(p,players,time){
  const race=room||localRace;
  const waiting=room?.status==='lobby',countdown=race?.status==='countdown'||room?.status==='racing'&&time<room.start;
  const current=waiting||countdown||!p.started?0:p.finished?p.last:Math.max(0,time-p.lapStart);
  $('lap').innerHTML=String(Math.min(p.lap+1,race?.laps||Infinity)).padStart(2,'0')+' <em>/ '+(race?.laps||'∞')+'</em>';
  $('time').textContent=fmt(current);$('best').textContent=fmt(p.best);$('speed').textContent=Math.round(Math.abs(p.speed)*.76);
  $('gear').textContent=p.speed<-2?'R':Math.abs(p.speed)<3?'N':Math.min(6,Math.ceil(Math.abs(p.speed)/62));$('rev').style.width=Math.min(100,Math.abs(p.speed)/340*100)+'%';
  $('position').textContent=race?'P'+(ranked(players).findIndex(v=>v.id===p.id)+1)+' / '+players.length+' DRIVERS':'SOLO PRACTICE';
  const clean=p.finished?p.lastValid:p.valid;$('validity').textContent=p.dnf?'DID NOT FINISH':!p.started?'CROSS THE LINE TO START':clean?'CLEAN LAP':'INVALID LAP'+(race?' · +5s':'');$('validity').className=clean?'':'invalid';
  const sector=p.checkpoint;let difference=null;
  if(sector>0&&p.bestSectors.length>=sector)difference=p.sectors.slice(0,sector).reduce((a,b)=>a+b,0)-p.bestSectors.slice(0,sector).reduce((a,b)=>a+b,0);
  $('delta').textContent=difference===null?(p.best?'BEST CLEAN LAP':'SET YOUR BENCHMARK'):'S'+sector+' '+(difference>=0?'+':'−')+(Math.abs(difference)/1000).toFixed(3)+'s';$('delta').className=difference===null?'':difference<=0?'faster':'slower';
  for(let i=0;i<3;i++){const value=p.sectors[i]??p.lastSectors[i];const el=$('s'+(i+1));el.textContent=split(value);el.style.color=value!=null&&p.bestSectors[i]!=null?(value<=p.bestSectors[i]?'#b7f76b':'#f6b66b'):'';}
  $('surface').textContent=p.wrongWay?'↶ WRONG WAY':p.slip>12?'● SLIDING':p.surface==='GRASS'?'● OFF TRACK':'● '+p.surface;$('surface').style.color=p.surface==='GRASS'||p.wrongWay?'#ffbd87':'#b7f76b';
  $('ghost-status').textContent=race?'CLEAN RACING · GHOST CARS':!ghostEnabled?'GHOST HIDDEN':personal?'PB GHOST · '+fmt(personal.best):'SET A CLEAN LAP TO UNLOCK YOUR GHOST';
  $('restart').hidden=!!race;$('ghost-toggle').disabled=!!race;
  $('mode').textContent=room?'MULTIPLAYER / '+room.laps+' LAPS':localRace?'AI SPRINT / '+localRace.laps+' LAPS':'TIME ATTACK';$('session-subtitle').textContent=room?'ROOM '+room.code:localRace?localRace.difficulty.toUpperCase()+' · THREE RIVALS':'CHASE YOUR PERSONAL BEST';
  $('end-sprint').hidden=!localRace;$('start-sprint').disabled=!!localRace&&localRace.status!=='finished';$('start-sprint').textContent=localRace?.status==='finished'?'Race again →':'Race the rivals →';
  $('difficulty').disabled=!!localRace&&localRace.status!=='finished';$('race-laps').disabled=!!localRace&&localRace.status!=='finished';
  $('medal-status').textContent=personal?(Racing.medal(personal.best)?'◈ '+Racing.medal(personal.best)+' EARNED · '+fmt(personal.best):'NEXT TARGET · BRONZE IN 65 SECONDS'):'Complete a clean lap to earn a medal.';
  if(!session)$('connection').textContent=localRace?'● AI SPRINT':'● SOLO PRACTICE';
  let banner=localRace?(countdown?String(Math.ceil((localRace.start-time)/1000)):p.dnf?'RACE OVER':p.finished?'FINISHED\n'+fmt(p.finish):time-localRace.start<1000?'GO!':''):'';
  if(room){
    const host=room.host===session.id;$('start').hidden=!host;$('reset').hidden=!host||waiting;$('start').disabled=room.status==='racing';$('start').textContent=room.status==='finished'?'Race again →':'Lights out →';
    $('room-status').textContent=waiting?(host?'Share your code. Start when the grid is ready.':'Waiting for the host to start…'):room.status==='finished'?'Race complete. Results include penalties.':'Race live · '+room.laps+' laps. Keep it clean.';
    banner=waiting?'GRID OPEN':countdown?String(Math.ceil((room.start-time)/1000)):p.finished?'FINISHED\n'+fmt(p.finish):time-room.start<1000?'GO!':'';
    $('board-note').textContent=room.status==='finished'?'Final classification · penalties included.':'Invalid lap = +5s. Cars do not collide.';
  }else $('board-note').textContent=localRace?'AI rivals · same physics · +5s per invalid lap.':personal?'Personal best saved on this browser.':'Your next rival is your last lap.';
  $('banner').textContent=banner;
  if(p.lap<seenLap||waiting){seenLap=p.lap;seenSector=0;wasValid=true;}
  if(p.lap>seenLap){if(session)recordLap(p,'Online');toast((p.lastValid?p.last===p.best?'PERSONAL BEST · ':'LAP COMPLETE · ':'INVALID LAP · ')+fmt(p.last));seenLap=p.lap;seenSector=0;}
  if(p.checkpoint>seenSector){toast('SECTOR '+p.checkpoint+' · '+split(p.sectors[p.checkpoint-1])+'s');seenSector=p.checkpoint;}
  if(wasValid&&!p.valid&&p.started)toast('TRACK LIMITS · '+(race?'5s PENALTY THIS LAP':'LAP WILL NOT SET A BEST TIME'));wasValid=p.valid;
  $('coach-text').textContent=p.wrongWay?'Turn around and follow the guide dots. Reverse driving does not advance your lap.':p.surface==='GRASS'?'Ease off the throttle and rejoin safely. Press R if you need to recover to the circuit.':p.slip>14?'You’re sliding. Release the handbrake and unwind the steering to recover rear grip.':Math.abs(p.speed)>230?'Eyes up. Brake early for the next bend; trying to turn at full speed will push you wide.':'Brake before the corner, then ease onto the throttle as you unwind the steering.';
}
function frame(now){
  const dt=Math.min((now-previous)/1000,.1);previous=now;if(!session&&!document.hidden)simulate(dt);
  const time=session?Date.now()+offset:localRace?localRace.clock:simTime,players=room?room.players:localRace?localRace.players:[local],me=players.find(p=>p.id===(session?.id||'local'))||local;
  const visuals=visualPlayers(time),visualMe=visuals.find(p=>p.id===me.id)||me;
  renderer.draw(visuals,visualMe,ghostAt(time-local.lapStart),guide,now,dt,follow);
  hud(me,players,time);updateAudio(me);if(now>toastUntil)$('toast').textContent='';
  if(now-boardAt>200){boardAt=now;board(players);}requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
