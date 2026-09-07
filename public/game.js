'use strict';
const $=id=>document.getElementById(id),keys={},renderer=new CircuitRenderer($('track'));
const STORAGE='apex-'+Physics.VERSION;
let session=null,room=null,events=null,offset=0,local,previous=performance.now(),accumulator=0,simTime=Date.now();
let boardAt=0,inputBusy=false,recording=[],recordAt=0,personal=null,ghostEnabled=true,guide=true,sound=false,audio=null;
let snapshots=[],toastUntil=0,seenLap=0,seenSector=0,wasValid=true,follow=matchMedia('(max-width:700px)').matches;
let localRace=null,selectedMode=null,lapHistory=[],serverReady=false,apiBase='',connecting=false,selectedTrack='harbor';
const config=window.APEX_CONFIG||{static:false,serverUrl:''};
const telemetryStyles=document.createElement('link');telemetryStyles.rel='stylesheet';telemetryStyles.href='./telemetry.css';document.head.append(telemetryStyles);
document.querySelector('.track-picker').insertAdjacentHTML('beforeend','<button data-track="obsidian" aria-pressed="false"><span>12</span><strong>Obsidian Pass</strong><small>Expert · Canyon</small></button>');
$('car-setup').insertAdjacentHTML('beforeend','<div class="advanced-setup"><div class="eyebrow">AERODYNAMIC PLATFORM</div><div class="setup-grid"><label>FRONT WING <output id="front-wing-value">6</output><input id="setup-front-wing" type="range" min="1" max="11" value="6"></label><label>REAR WING <output id="rear-wing-value">6</output><input id="setup-rear-wing" type="range" min="1" max="11" value="6"></label><label>RIDE HEIGHT <output id="ride-height-value">32 MM</output><input id="setup-ride-height" type="range" min="25" max="45" value="32"></label><label>CAMBER <output id="camber-value">−2.5°</output><input id="setup-camber" type="range" min="15" max="35" value="25"></label></div></div>');
let currentSetup={...Physics.setupDefaults};
try{const savedTrack=localStorage.getItem('apex-track');if(Physics.tracks[savedTrack])selectedTrack=savedTrack;const name=localStorage.getItem('apex-name');if(name)$('name').value=name.slice(0,18);currentSetup=Physics.sanitizeSetup(JSON.parse(localStorage.getItem('apex-setup')||'{}'));}catch{}
const setupFields=[['setup-downforce','downforce'],['setup-front-wing','frontWing'],['setup-rear-wing','rearWing'],['setup-ride-height','rideHeight'],['setup-camber','camber'],['setup-gearing','gearing'],['setup-compound','compound'],['setup-brake-bias','brakeBias'],['setup-differential','differential'],['setup-suspension','suspension'],['setup-anti-roll','antiRoll'],['setup-steering','steering'],['setup-tire-pressure','tirePressure']];
function readSetup(){return Physics.sanitizeSetup(Object.fromEntries(setupFields.map(([id,key])=>[key,$(id).value])));}
function renderSetupBase(){for(const [id,key] of setupFields)$(id).value=currentSetup[key];for(const [id,value] of [['front-wing-value',currentSetup.frontWing],['rear-wing-value',currentSetup.rearWing],['ride-height-value',currentSetup.rideHeight+' MM'],['camber-value','−'+(currentSetup.camber/10).toFixed(1)+'°'],['brake-bias-value',currentSetup.brakeBias+'%'],['differential-value',currentSetup.differential+'%'],['suspension-value',currentSetup.suspension],['anti-roll-value',currentSetup.antiRoll],['steering-value',currentSetup.steering],['tire-pressure-value',currentSetup.tirePressure+' PSI']])$(id).textContent=value;const wingDrag=(currentSetup.frontWing+currentSetup.rearWing-12)*1.7,speed=69+(currentSetup.gearing==='long'?20:currentSetup.gearing==='short'?-2:10)+(currentSetup.downforce==='low'?12:currentSetup.downforce==='high'?-7:3)-wingDrag,corner=45+(currentSetup.downforce==='high'?15:currentSetup.downforce==='low'?-4:7)+(currentSetup.compound==='soft'?10:currentSetup.compound==='hard'?-2:4)+currentSetup.frontWing*2+(currentSetup.suspension-50)*.12,stability=47+currentSetup.rearWing*2.2+(12-Math.abs(currentSetup.brakeBias-58)*4)+(65-currentSetup.differential)*.2+(50-currentSetup.antiRoll)*.08-Math.abs(currentSetup.rideHeight-32)*.8;for(const [id,value] of [['setup-speed-meter',speed],['setup-corner-meter',corner],['setup-stability-meter',stability]])$(id).style.width=Math.max(12,Math.min(100,value))+'%';$('setup-status').textContent='W'+currentSetup.frontWing+'/'+currentSetup.rearWing+' · '+currentSetup.compound.toUpperCase();$('setup-advice').textContent=currentSetup.frontWing>currentSetup.rearWing+2?'Front-biased aero gives sharp turn-in but a nervous rear at speed.':currentSetup.rearWing>currentSetup.frontWing+2?'Rear-biased aero adds traction and stability but can create understeer.':currentSetup.rideHeight<29?'A low floor adds aero efficiency; avoid aggressive kerbs and grass.':currentSetup.camber>31?'High negative camber adds loaded-corner grip and increases tyre wear.':'A balanced aero platform keeps the car predictable through a full stint.';document.querySelectorAll('[data-setup-preset]').forEach(b=>b.setAttribute('aria-pressed',String(JSON.stringify(Physics.sanitizeSetup(Physics.setupPresets[b.dataset.setupPreset]))===JSON.stringify(currentSetup))));}
function renderSetup(){renderSetupBase();const life={soft:45,medium:70,hard:94}[currentSetup.compound]-(currentSetup.tirePressure-23)*4-(currentSetup.camber-25)*.9;$('setup-tire-meter').style.width=Math.max(15,Math.min(100,life))+'%';const balance=(currentSetup.frontWing-currentSetup.rearWing)*2.8+(currentSetup.differential-55)*.22+(currentSetup.steering-50)*.2+(currentSetup.antiRoll-50)*.12;$('setup-balance').textContent=balance>8?'OVERSTEER':balance<-8?'UNDERSTEER':'NEUTRAL';}
const engineerSetups={harbor:{...Physics.setupPresets.balanced,downforce:'high',frontWing:9,rearWing:8,gearing:'short',compound:'soft',brakeBias:59,differential:58,suspension:48,antiRoll:55,steering:57,tirePressure:22},alpine:{...Physics.setupPresets.balanced,downforce:'high',frontWing:8,rearWing:9,rideHeight:35,suspension:42,steering:55},sunset:{...Physics.setupPresets.race,downforce:'low',frontWing:3,rearWing:4,gearing:'long',antiRoll:58},metro:{...Physics.setupPresets.qualifying,downforce:'high',frontWing:11,rearWing:10,rideHeight:36,differential:45,steering:54},emerald:{...Physics.setupPresets.race,downforce:'balanced',frontWing:7,rearWing:7,antiRoll:55},thunder:{...Physics.setupPresets.race,downforce:'low',frontWing:4,rearWing:5,antiRoll:62},zenith:{...Physics.setupPresets.balanced,downforce:'high',frontWing:10,rearWing:9,rideHeight:34,gearing:'short',steering:60},aurora:{...Physics.setupPresets.race,downforce:'balanced',frontWing:7,rearWing:9,rideHeight:37,suspension:35,differential:40},sakura:{...Physics.setupPresets.balanced,downforce:'high',frontWing:9,rearWing:9,steering:58,antiRoll:57},marina:{...Physics.setupPresets.race,downforce:'balanced',frontWing:6,rearWing:7,rideHeight:34,gearing:'long',camber:27},volcano:{...Physics.setupPresets.qualifying,downforce:'high',frontWing:10,rearWing:10,rideHeight:37,suspension:40,differential:47},obsidian:{...Physics.setupPresets.qualifying,downforce:'high',frontWing:11,rearWing:10,rideHeight:36,camber:30,gearing:'short',suspension:38,differential:43}};
function storeKey(suffix=''){return STORAGE+'-'+selectedTrack+suffix;}
function loadTrackData(){
  personal=null;lapHistory=[];
  try{
    const laps=JSON.parse(localStorage.getItem(storeKey('-laps')));
    if(Array.isArray(laps))lapHistory=laps.filter(p=>p&&Number.isFinite(p.time)&&p.time>0&&Array.isArray(p.sectors)&&typeof p.mode==='string').slice(0,10);
    const saved=JSON.parse(localStorage.getItem(storeKey()));
    const validFrames=Array.isArray(saved?.frames)&&saved.frames.length>2&&saved.frames.length<=12000&&saved.frames.every(frame=>['t','x','y','angle'].every(key=>Number.isFinite(frame[key])));
    if(saved?.version===Physics.VERSION&&saved.trackId===selectedTrack&&Number.isFinite(saved.best)&&saved.best>0&&validFrames)personal=saved;
  }catch{}
}
Physics.selectTrack(selectedTrack);renderer.setTrack(selectedTrack);loadTrackData();
function fmt(ms){if(ms==null||!Number.isFinite(ms))return '—';ms=Math.max(0,Math.floor(ms));return String(Math.floor(ms/60000)).padStart(2,'0')+':'+String(Math.floor(ms/1000)%60).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0');}
function split(ms){return ms==null?'—':(ms/1000).toFixed(3);}
function message(text){$('message').textContent=text;}
function toast(text){$('toast').textContent=text;toastUntil=performance.now()+3500;}
function clearKeys(){for(const k in keys)keys[k]=false;}
function practice(){
  localRace=null;if($('results').open)$('results').close();
  local={...Physics.spawn(0,selectedTrack,currentSetup),id:'local',name:$('name').value.trim()||'Driver',color:Physics.getTrack(selectedTrack).accent};
  if(personal){local.best=personal.best;local.bestSectors=personal.sectors||[];}
  simTime=Date.now();local.lapStart=simTime;accumulator=0;recording=[];recordAt=0;seenLap=seenSector=0;wasValid=true;clearKeys();renderer.clear();
}
renderSetup();practice();
for(const [id] of setupFields)$(id).oninput=()=>{currentSetup=readSetup();renderSetup();try{localStorage.setItem('apex-setup',JSON.stringify(currentSetup));}catch{}if(!session&&!localRace)practice();};
document.querySelectorAll('[data-setup-preset]').forEach(button=>button.onclick=()=>{if(session||localRace)return;currentSetup=Physics.sanitizeSetup(Physics.setupPresets[button.dataset.setupPreset]);renderSetup();try{localStorage.setItem('apex-setup',JSON.stringify(currentSetup));}catch{}practice();toast(button.textContent+' SETUP LOADED');});
const trackCopy={harbor:{intro:'Harbor walls, linked corners, and no room for a lazy line.',character:'TECHNICAL CIRCUIT',weather:'☀',temperature:'24° · TRACK 32°'},alpine:{intro:'Climb through fast switchbacks where rhythm matters more than power.',character:'RHYTHM CIRCUIT',weather:'◭',temperature:'14° · TRACK 20°'},sunset:{intro:'Wide desert sweepers reward bravery, clean exits, and top speed.',character:'HIGH-SPEED CIRCUIT',weather:'◒',temperature:'31° · TRACK 43°'},metro:{intro:'Thread the neon canyon: late braking, tight walls, zero room for error.',character:'STREET CIRCUIT',weather:'☾',temperature:'19° · TRACK 23°'},emerald:{intro:'Carry momentum through a fast forest ribbon of crests and long arcs.',character:'FLOWING CIRCUIT',weather:'◌',temperature:'18° · TRACK 25°'},thunder:{intro:'Commit through long high-G corners, then unleash the car down the power sections.',character:'HIGH-G CIRCUIT',weather:'ϟ',temperature:'27° · TRACK 38°'},zenith:{intro:'Attack the summit esses and late-apex corners where balance beats brute force.',character:'TECHNICAL CIRCUIT',weather:'△',temperature:'12° · TRACK 18°'},aurora:{intro:'Race beneath the northern lights on a frozen, flat-out ribbon of asphalt.',character:'ARCTIC CIRCUIT',weather:'✦',temperature:'−4° · TRACK 2°'},sakura:{intro:'Link precise rhythm corners through a floodlit garden in full bloom.',character:'RHYTHM CIRCUIT',weather:'✿',temperature:'21° · TRACK 28°'},marina:{intro:'Draft along the waterfront and brake late into broad coastal corners.',character:'POWER CIRCUIT',weather:'≈',temperature:'29° · TRACK 37°'},volcano:{intro:'Survive the caldera: blind crests, heat haze, and relentless direction changes.',character:'EXTREME CIRCUIT',weather:'▲',temperature:'38° · TRACK 52°'}};
trackCopy.marina.intro='The rebuilt Marina is a long coastal grand prix: technical infield, fast sweepers, and punishing braking zones.';trackCopy.marina.character='ENDURANCE CIRCUIT';
trackCopy.obsidian={intro:'Conquer a narrow canyon labyrinth of blind switchbacks, compressions, and one final high-speed commitment.',character:'EXPERT CIRCUIT',weather:'◆',temperature:'17° · TRACK 24°'};
function updateTrackUI(){const track=Physics.getTrack(selectedTrack),copy=trackCopy[selectedTrack];document.documentElement.style.setProperty('--lime',track.accent);$('nav-track').textContent=track.name.toUpperCase();$('race-track-name').textContent=track.name.toUpperCase();$('track-stamp').textContent=track.name.toUpperCase()+' / 12';if(selectedMode)$('track-intro').textContent=copy.intro;$('track-length').innerHTML=(track.length/2000).toFixed(1)+'<span> KM</span>';$('track-character').textContent=copy.character;$('track-condition').textContent=track.subtitle;$('weather').firstChild.textContent=copy.weather;$('weather').querySelector('small').textContent=copy.temperature;document.querySelectorAll('[data-track]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.track===selectedTrack)));}
function changeTrack(id,forced=false){if(!Physics.tracks[id]||(!forced&&(session||localRace))){toast('FINISH OR LEAVE THE CURRENT RACE TO CHANGE CIRCUIT');return false;}selectedTrack=id;renderer.setTrack(id);loadTrackData();practice();updateTrackUI();renderSetup();renderHistory();try{localStorage.setItem('apex-track',id);}catch{}return true;}
document.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>changeTrack(b.dataset.track));updateTrackUI();
function setMode(mode){
  if(session&&mode!=='online'){toast('LEAVE YOUR ONLINE ROOM BEFORE SWITCHING MODES');return;}
  if(localRace&&mode!==selectedMode)practice();selectedMode=mode;message('');
  $('event-builder').hidden=false;document.querySelectorAll('.event-content').forEach(el=>el.hidden=false);$('builder-title').textContent=mode==='practice'?'Practice configuration':mode==='sprint'?'AI race configuration':'Online race configuration';$('connection').textContent=mode==='practice'?'● SOLO PRACTICE':mode==='sprint'?'● AI EVENT SETUP':'● ONLINE EVENT SETUP';updateTrackUI();
  for(const item of ['practice','sprint','online']){$('mode-'+item).setAttribute('aria-pressed',String(item===mode));$(item+'-controls').hidden=item!==mode;}
  $('distance-setting').hidden=mode==='practice'||!!session;
  $('panel-title').textContent=mode==='practice'?'Chase your best.':mode==='sprint'?'Meet your rivals.':'Bring your friends.';
  $('panel-eyebrow').textContent=mode==='practice'?'ONE MORE LAP':mode==='sprint'?'A GRID OF FOUR':'MAKE IT A RACE';
  $('panel-description').textContent=mode==='practice'?'Engineer your car, read the telemetry, and master all twelve circuits.':mode==='sprint'?'Mika, Jules, and Nova are waiting. Build your setup and choose a race distance.':'Connect to the same server, choose a circuit and setup, then share a six-character code.';
}
for(const mode of ['practice','sprint','online'])$('mode-'+mode).onclick=()=>setMode(mode);
$('change-event').onclick=()=>{if(session||localRace){toast('LEAVE THE CURRENT RACE FIRST');return;}selectedMode=null;$('event-builder').hidden=true;document.querySelectorAll('.event-content').forEach(el=>el.hidden=true);for(const mode of ['practice','sprint','online'])$('mode-'+mode).setAttribute('aria-pressed','false');$('connection').textContent='● CHOOSE EVENT';$('track-intro').textContent='Select a format to open its circuit, distance, and garage options.';scrollTo({top:0,behavior:'smooth'});};
$('engineer-setup').onclick=()=>{if(session||localRace)return;currentSetup=Physics.sanitizeSetup(engineerSetups[selectedTrack]||Physics.setupPresets.balanced);renderSetup();practice();try{localStorage.setItem('apex-setup',JSON.stringify(currentSetup));}catch{}toast('RACE ENGINEER · '+Physics.getTrack(selectedTrack).name.toUpperCase()+' SETUP READY');};
function renderHistory(){
  const container=$('lap-history');container.replaceChildren();$('export-laps').disabled=!lapHistory.length;
  if(!lapHistory.length){const p=document.createElement('p');p.className='empty-history';p.textContent='Cross the finish line to start your session log.';container.append(p);return;}
  for(const [index,lap] of lapHistory.entries()){const row=document.createElement('article');row.className='telemetry-row';row.classList.toggle('invalid',!lap.valid);const telemetry=lap.telemetry||{},setup=lap.setup||{};
    const head=document.createElement('div');head.className='telemetry-head';head.innerHTML='<span>LAP '+String(lapHistory.length-index).padStart(2,'0')+' · '+lap.mode+'</span><strong>'+fmt(lap.time)+'</strong><b>'+(lap.valid?(Racing.medal(lap.time)||'CLEAN'):'INVALID')+'</b>';row.append(head);
    const sectors=document.createElement('div');sectors.className='telemetry-sectors';lap.sectors.forEach((value,i)=>{const span=document.createElement('span');span.innerHTML='<small>S'+(i+1)+'</small>'+split(value)+'s';sectors.append(span);});row.append(sectors);
    const data=document.createElement('div');data.className='telemetry-grid';for(const [label,value] of [['TOP SPEED',telemetry.topSpeed==null?'—':telemetry.topSpeed+' km/h'],['AVG SPEED',telemetry.averageSpeed==null?'—':telemetry.averageSpeed+' km/h'],['THROTTLE',telemetry.throttlePct==null?'—':telemetry.throttlePct+'%'],['BRAKE',telemetry.brakePct==null?'—':telemetry.brakePct+'%'],['TYRE USED',telemetry.tireUsed==null?'—':telemetry.tireUsed+'%'],['MAX SLIP',telemetry.maxSlip==null?'—':telemetry.maxSlip]]){const span=document.createElement('span');span.innerHTML='<small>'+label+'</small>'+value;data.append(span);}row.append(data);
    const setupLine=document.createElement('p');setupLine.className='telemetry-setup';setupLine.textContent=(lap.driver||'Driver')+' · '+String(setup.compound||'medium').toUpperCase()+' · WINGS '+(setup.frontWing??'—')+'/'+(setup.rearWing??'—')+' · '+(lap.limits||0)+' LIMIT STRIKES';row.append(setupLine);container.append(row);
  }
}
function recordLap(car,mode){
  lapHistory.unshift({mode,time:car.last,sectors:[...car.lastSectors],valid:car.lastValid,date:new Date().toISOString(),driver:car.name||$('name').value||'Driver',telemetry:car.lastTelemetry?{...car.lastTelemetry}:null,setup:{...car.setup},limits:car.trackLimits||0});lapHistory=lapHistory.slice(0,10);
  try{localStorage.setItem(storeKey('-laps'),JSON.stringify(lapHistory));}catch{}renderHistory();
}
$('export-laps').onclick=()=>{const blob=new Blob([JSON.stringify({track:Physics.getTrack(selectedTrack).name,laps:lapHistory},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='apex-'+selectedTrack+'-laps.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
renderHistory();
function startSprint(){
  if(session)return;practice();setMode('sprint');
  localRace=Racing.createSprint($('name').value.trim()||'Driver',$('difficulty').value,Number($('race-laps').value),selectedTrack,currentSetup);local=localRace.players[0];clearKeys();
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
    const info=await res.json();if(info.app!=='apex-circuit'||info.version!==Physics.VERSION||info.protocol!==8)throw new Error('This server needs the Telemetry update.');
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
  if(next.trackId&&next.trackId!==selectedTrack)changeTrack(next.trackId,true);
  room=next;offset=room.now-Date.now();snapshots.push(next);if(snapshots.length>5)snapshots.shift();
  $('connection').textContent='● ROOM '+room.code;
}
async function enter(action){
  if(!serverReady||session)return;if(localRace)practice();setMode('online');
  $('host').disabled=$('join').disabled=true;clearKeys();
  try{
    const result=await api(action,{name:$('name').value,code:$('code').value.trim(),laps:Number($('race-laps').value),trackId:selectedTrack,setup:currentSetup});
    if(result.room.trackId&&result.room.trackId!==selectedTrack)changeTrack(result.room.trackId,true);session={token:result.token,id:result.id};snapshots=[];receive(result.room);seenLap=seenSector=0;wasValid=true;renderer.clear();
    try{localStorage.setItem('apex-name',$('name').value);}catch{}
    events=new EventSource(endpoint('events')+'?token='+session.token);
    events.onmessage=e=>receive(JSON.parse(e.data));events.onerror=()=>{$('connection').textContent='● RECONNECTING';};
    $('room-form').hidden=true;$('room').hidden=false;$('copy').textContent=room.code;$('server-setup').hidden=true;$('driver-profile').hidden=true;$('distance-setting').hidden=true;$('car-setup').disabled=true;
    message('Friends connect to '+new URL(apiBase).host+' and enter this room code.');
  }catch(e){message(e.message);}finally{$('host').disabled=$('join').disabled=!serverReady;}
}
function leaveLocal(){events?.close();events=null;session=null;room=null;snapshots=[];$('room-form').hidden=false;$('room').hidden=true;$('server-setup').hidden=false;$('driver-profile').hidden=false;$('car-setup').disabled=false;$('connection').textContent='● SOLO PRACTICE';practice();setMode('online');}
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
        personal={version:Physics.VERSION,trackId:selectedTrack,best:local.best,sectors:[...local.bestSectors],frames:recording};
        try{localStorage.setItem(storeKey(),JSON.stringify(personal));}catch{toast('BEST LAP SET · STORAGE FULL, GHOST SAVED FOR THIS SESSION');}
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
  const clean=p.finished?p.lastValid:p.valid;$('validity').textContent=p.dnf?'DID NOT FINISH':!p.started?'CROSS THE LINE TO START':clean?'CLEAN LAP':'INVALID LAP'+(race?' · LIMITS':'');$('validity').className=clean?'':'invalid';
  const sector=p.checkpoint;let difference=null;
  if(sector>0&&p.bestSectors.length>=sector)difference=p.sectors.slice(0,sector).reduce((a,b)=>a+b,0)-p.bestSectors.slice(0,sector).reduce((a,b)=>a+b,0);
  $('delta').textContent=difference===null?(p.best?'BEST CLEAN LAP':'SET YOUR BENCHMARK'):'S'+sector+' '+(difference>=0?'+':'−')+(Math.abs(difference)/1000).toFixed(3)+'s';$('delta').className=difference===null?'':difference<=0?'faster':'slower';
  for(let i=0;i<3;i++){const value=p.sectors[i]??p.lastSectors[i];const el=$('s'+(i+1));el.textContent=split(value);el.style.color=value!=null&&p.bestSectors[i]!=null?(value<=p.bestSectors[i]?'#b7f76b':'#f6b66b'):'';}
  $('surface').textContent=p.wrongWay?'↶ WRONG WAY':p.slip>12?'● SLIDING':p.surface==='GRASS'?'● OFF TRACK':'● '+p.surface;$('surface').style.color=p.surface==='GRASS'||p.wrongWay?'#ffbd87':'#b7f76b';
  $('tire-temp').textContent=Math.round(p.tireTemp||72)+'° · '+Math.round(p.tireWear??100)+'%';$('tire-temp').style.color=p.tireWear<30||p.tireTemp>108?'#ff9675':p.tireTemp>82?'var(--lime)':'';$('damage').textContent=Math.round(p.damage||0)+'%';$('damage').style.color=p.damage>50?'#ff9675':'';$('limits').textContent=(p.trackLimits||0)+(p.blackWhite?' · B/W':p.penalty?' · +'+p.penalty/1000+'s':' STRIKES');$('limits').style.color=p.blackWhite||p.penalty?'#ffb066':'';
  $('car-status').textContent=p.impact>20?'IMPACT':p.wheelsOut===4?'ALL WHEELS OUT':p.wheelsOut?'WHEELS ON WHITE LINE':p.abs?'ABS ACTIVE':p.tractionControl?'TRACTION CONTROL':p.tireTemp>108?'TIRES HOT':'TRACK CLEAR';
  $('ghost-status').textContent=race?'CLEAN RACING · GHOST CARS':!ghostEnabled?'GHOST HIDDEN':personal?'PB GHOST · '+fmt(personal.best):'SET A CLEAN LAP TO UNLOCK YOUR GHOST';
  $('restart').hidden=!!race;$('ghost-toggle').disabled=!!race;
  $('mode').textContent=room?'MULTIPLAYER / '+room.laps+' LAPS':localRace?'AI SPRINT / '+localRace.laps+' LAPS':'TIME ATTACK';$('session-subtitle').textContent=room?'ROOM '+room.code:localRace?localRace.difficulty.toUpperCase()+' · THREE RIVALS':'CHASE YOUR PERSONAL BEST';
  $('end-sprint').hidden=!localRace;$('start-sprint').disabled=!!localRace&&localRace.status!=='finished';$('start-sprint').textContent=localRace?.status==='finished'?'Race again →':'Race the rivals →';
  $('difficulty').disabled=!!localRace&&localRace.status!=='finished';$('race-laps').disabled=!!localRace&&localRace.status!=='finished';$('car-setup').disabled=!!session||!!localRace&&localRace.status!=='finished';
  $('medal-status').textContent=personal?(Racing.medal(personal.best)?'◈ '+Racing.medal(personal.best)+' EARNED · '+fmt(personal.best):'NEXT TARGET · BRONZE IN 65 SECONDS'):'Complete a clean lap to earn a medal.';
  if(!session)$('connection').textContent=localRace?'● AI SPRINT':selectedMode==='practice'?'● SOLO PRACTICE':selectedMode==='sprint'?'● AI EVENT SETUP':selectedMode==='online'?'● ONLINE EVENT SETUP':'● CHOOSE EVENT';
  let banner=localRace?(countdown?String(Math.ceil((localRace.start-time)/1000)):p.dnf?'RACE OVER':p.finished?'FINISHED\n'+fmt(p.finish):time-localRace.start<1000?'GO!':''):'';
  if(room){
    const host=room.host===session.id;$('start').hidden=!host;$('reset').hidden=!host||waiting;$('start').disabled=room.status==='racing';$('start').textContent=room.status==='finished'?'Race again →':'Lights out →';
    $('room-status').textContent=waiting?(host?'Share your code. Start when the grid is ready.':'Waiting for the host to start…'):room.status==='finished'?'Race complete. Results include penalties.':'Race live · '+room.laps+' laps. Keep it clean.';
    banner=waiting?'GRID OPEN':countdown?String(Math.ceil((room.start-time)/1000)):p.finished?'FINISHED\n'+fmt(p.finish):time-room.start<1000?'GO!':'';
    $('board-note').textContent=room.status==='finished'?'Final classification · penalties included.':'Four wheels out = strike. Strike 3 warning; strike 4 = +5s.';
  }else $('board-note').textContent=localRace?'F1-style limits · warning at 3, +5s from strike 4.':personal?'Personal best saved on this browser.':'Your next rival is your last lap.';
  $('banner').textContent=banner;
  if(p.lap<seenLap||waiting){seenLap=p.lap;seenSector=0;wasValid=true;}
  if(p.lap>seenLap){if(session)recordLap(p,'Online');toast((p.lastValid?p.last===p.best?'PERSONAL BEST · ':'LAP COMPLETE · ':'INVALID LAP · ')+fmt(p.last));seenLap=p.lap;seenSector=0;}
  if(p.checkpoint>seenSector){toast('SECTOR '+p.checkpoint+' · '+split(p.sectors[p.checkpoint-1])+'s');seenSector=p.checkpoint;}
  if(p.lastPenalty&&time-p.lastPenalty<120){const strikes=p.trackLimits||0;toast(race?(strikes===3?'BLACK & WHITE FLAG · FINAL WARNING':strikes>=4?'TRACK LIMITS · 5 SECOND PENALTY':'TRACK LIMIT STRIKE '+strikes):'TRACK LIMITS · LAP DELETED');}else if(wasValid&&!p.valid&&p.started)toast('TRACK LIMITS · LAP DELETED');wasValid=p.valid;
  $('coach-text').textContent=p.wrongWay?'Turn around and follow the guide dots. Reverse driving does not advance your lap.':p.surface==='GRASS'?'Ease off the throttle and rejoin safely. Press R if you need to recover to the circuit.':p.slip>14?'You’re sliding. Release the handbrake and unwind the steering to recover rear grip.':Math.abs(p.speed)>230?'Eyes up. Brake early for the next bend; trying to turn at full speed will push you wide.':'Brake before the corner, then ease onto the throttle as you unwind the steering.';
}
function frame(now){
  const dt=Math.min((now-previous)/1000,.1);previous=now;if(selectedMode&&!session&&!document.hidden)simulate(dt);
  const time=session?Date.now()+offset:localRace?localRace.clock:simTime,players=room?room.players:localRace?localRace.players:[local],me=players.find(p=>p.id===(session?.id||'local'))||local;
  const visuals=visualPlayers(time),visualMe=visuals.find(p=>p.id===me.id)||me;
  renderer.draw(visuals,visualMe,ghostAt(time-local.lapStart),guide,now,dt,follow);
  hud(me,players,time);updateAudio(me);if(now>toastUntil)$('toast').textContent='';
  if(now-boardAt>200){boardAt=now;board(players);}requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
