'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const P=require('./public/physics');
function place(p,s,now){const loc=P.at(s);p.x=loc.x;p.y=loc.y;p.angle=loc.angle;P.step(p,{},0,now);}
function driveDistance(p,from,to,start=1000){for(let s=from;s<=to;s+=8)place(p,s,start+s*10);place(p,to,start+to*10);}
test('all circuits are closed, separated, bounded, and have asphalt grids',()=>{
  assert.deepEqual(Object.keys(P.tracks),['harbor','alpine','sunset','metro','emerald','thunder','zenith','aurora','sakura','marina','volcano','obsidian','titan','vesper','copper','lotus']);
  for(const [id,track] of Object.entries(P.tracks)){
    const a=P.at(0,id),b=P.at(track.length,id);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.001,id+' closes');
    for(let i=0;i<8;i++){const p=P.spawn(i,id);assert.equal(p.trackId,id);assert.ok(P.nearest(p.x,p.y,id).distance<track.road/2);}
    let gap=Infinity,pts=track.points;for(let i=0;i<pts.length;i++)for(let j=i+28;j<pts.length;j++){if(pts.length-j+i<=28)continue;gap=Math.min(gap,Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y));}
    assert.ok(gap>track.road,id+' road overlaps itself: '+gap);assert.ok(pts.every(p=>p.x>60&&p.x<1740&&p.y>55&&p.y<1045),id+' stays on canvas');
  }
});
test('long Grand Tour circuits are measured beyond three kilometres',()=>{
  for(const id of ['titan','vesper','lotus'])assert.ok(P.tracks[id].length>=6000,id+' must be at least 3 km');
});
test('full forward route awards a lap, three sectors, and a clean best',()=>{
  const p=P.spawn();driveDistance(p,-22,P.LENGTH+10);
  assert.equal(p.lap,1);assert.equal(p.lastValid,true);assert.ok(p.best>30000);assert.equal(p.bestSectors.length,3);
  assert.ok(Math.abs(p.bestSectors.reduce((a,b)=>a+b,0)-p.last)<.01);
});
test('reverse crossing and teleports do not award laps',()=>{
  const p=P.spawn();driveDistance(p,-22,-5);for(let i=0;i<3;i++){place(p,8,1000);place(p,-8,1200);}
  assert.equal(p.lap,0);place(p,P.LENGTH*.5,2000);place(p,P.LENGTH*.9,3000);place(p,10,4000);assert.equal(p.lap,0);assert.equal(p.valid,false);
});
test('grass excursion invalidates best, and recovery keeps progress without a shortcut',()=>{
  const p=P.spawn();driveDistance(p,-22,100);const loc=P.at(100);p.x=loc.x+loc.nx*100;p.y=loc.y+loc.ny*100;P.step(p,{},0,3000);assert.equal(p.valid,false);
  const before=p.progress;assert.equal(P.recover(p,5000),true);assert.equal(p.recoveries,1);assert.equal(P.recover(p,5500),false);assert.ok(Math.abs(p.progress-before)<1);
  driveDistance(p,100,P.LENGTH+10,6000);assert.equal(p.lap,1);assert.equal(p.lastValid,false);assert.equal(p.best,null);
});
test('four-wheel track limits delete laps and use F1-style race strikes',()=>{
  const practice=P.spawn(),loc=P.at(300),move=(p,offset,now)=>{p.x=loc.x+loc.nx*offset;p.y=loc.y+loc.ny*offset;p.angle=loc.angle;for(let i=0;i<5;i++)P.step(p,{},1/60,now+i*17);};
  move(practice,P.ROAD/2+5,1000);assert.ok(practice.wheelsOut>0&&practice.wheelsOut<4);assert.equal(practice.trackLimits,0,'two wheels may remain over the white line');
  move(practice,P.ROAD/2+12,2000);assert.equal(practice.wheelsOut,4);assert.equal(practice.trackLimits,1);assert.equal(practice.penalty,0);assert.equal(practice.valid,false);
  const race={...P.spawn(),raceMode:true};for(let strike=1;strike<=5;strike++){move(race,0,3000+strike*1000);move(race,P.ROAD/2+12,3500+strike*1000);assert.equal(race.trackLimits,strike);}
  assert.equal(race.blackWhite,true);assert.equal(race.penalty,10000,'strike four and every later strike add five seconds');
});
test('surface grip transitions progressively across asphalt, kerb, and grass',()=>{
  const loc=P.at(420),sample=offset=>{const p=P.spawn();p.x=loc.x+loc.nx*offset;p.y=loc.y+loc.ny*offset;p.angle=loc.angle;P.step(p,{},0,1000);return p;},asphalt=sample(P.ROAD/2-12),kerb=sample(P.ROAD/2-2),nearGrass=sample(P.ROAD/2+10),deepGrass=sample(P.ROAD/2+24);
  assert.equal(asphalt.surface,'ASPHALT');assert.equal(kerb.surface,'CURB');assert.equal(nearGrass.surface,'GRASS');assert.ok(asphalt.grip>kerb.grip&&kerb.grip>nearGrass.grip&&nearGrass.grip>deepGrass.grip);
});
test('garage setup is sanitized and materially changes the car',()=>{
  assert.deepEqual(P.sanitizeSetup({downforce:'rocket',frontWing:20,rearWing:0,rideHeight:99,camber:2,engineMode:'warp',fuelLoad:999,brakeBias:99,brakePressure:120,brakeCooling:999,differential:2,offThrottleDifferential:99,gearing:'long',compound:'soft',suspension:99,antiRoll:1,steering:72,tirePressure:18,frontTirePressure:19,rearTirePressure:99,frontToe:-4,rearToe:99,engineBraking:4}),{downforce:'balanced',frontWing:11,rearWing:1,rideHeight:45,camber:15,engineMode:'standard',fuelLoad:100,brakeBias:64,brakePressure:100,brakeCooling:100,differential:30,offThrottleDifferential:75,gearing:'long',compound:'soft',suspension:80,antiRoll:20,steering:70,tirePressure:20,frontTirePressure:20,rearTirePressure:27,frontToe:0,rearToe:20,engineBraking:20});
  const short=P.spawn(0,'harbor',{gearing:'short'}),long=P.spawn(0,'harbor',{gearing:'long'});for(let i=0;i<120;i++){P.step(short,{up:true},1/60,1000+i*17);P.step(long,{up:true},1/60,1000+i*17);}assert.ok(short.speed>long.speed,'short gearing accelerates harder');
  const soft=P.spawn(0,'harbor',{compound:'soft'}),hard=P.spawn(0,'harbor',{compound:'hard'});for(let i=0;i<600;i++){P.step(soft,{up:true,right:i%180<60},1/60,5000+i*17);P.step(hard,{up:true,right:i%180<60},1/60,5000+i*17);}assert.ok(soft.tireWear<hard.tireWear,'soft tyres trade life for grip');
  const strong=P.spawn(0,'aurora',{brakePressure:100}),safe=P.spawn(0,'aurora',{brakePressure:80});for(let i=0;i<80;i++){P.step(strong,{up:true},1/60,20000+i*17);P.step(safe,{up:true},1/60,20000+i*17);}for(let i=0;i<18;i++){P.step(strong,{down:true},1/60,22000+i*17);P.step(safe,{down:true},1/60,22000+i*17);}assert.ok(strong.speed<safe.speed-8,'brake pressure changes stopping force');
  const rotation=P.spawn(0,'metro',{frontToe:10,rearToe:4}),stable=P.spawn(0,'metro',{frontToe:0,rearToe:20});for(let i=0;i<70;i++){P.step(rotation,{up:true,right:i>35},1/60,25000+i*17);P.step(stable,{up:true,right:i>35},1/60,25000+i*17);}assert.ok(Math.abs(rotation.yaw)>Math.abs(stable.yaw),'toe balance changes corner rotation');
  const openDiff=P.spawn(0,'harbor',{offThrottleDifferential:25}),lockedDiff=P.spawn(0,'harbor',{offThrottleDifferential:75});for(let i=0;i<85;i++){const input=i<62?{up:true}:{down:true,right:true};P.step(openDiff,input,1/60,26500+i*17);P.step(lockedDiff,input,1/60,26500+i*17);}assert.ok(Math.abs(openDiff.yaw)>Math.abs(lockedDiff.yaw),'coast differential changes braking rotation');
  const open=P.spawn(0,'harbor',{brakeCooling:100}),closed=P.spawn(0,'harbor',{brakeCooling:20});for(let i=0;i<420;i++){const input=i%70<48?{up:true}:{down:true};P.step(open,input,1/60,28000+i*17);P.step(closed,input,1/60,28000+i*17);}assert.ok(open.brakeTemp<closed.brakeTemp,'open brake ducts control repeated-stop temperature');
  const axle=P.spawn(0,'harbor',{frontTirePressure:20,rearTirePressure:27});for(let i=0;i<240;i++)P.step(axle,{up:true,right:i>60&&i<190,down:i>195},1/60,36000+i*17);assert.notEqual(axle.frontTireTemp,axle.rearTireTemp);assert.notEqual(axle.frontTireWear,axle.rearTireWear);assert.ok(Math.abs(axle.tireTemp-(axle.frontTireTemp+axle.rearTireTemp)/2)<.001);assert.ok(Math.abs(axle.tireWear-(axle.frontTireWear+axle.rearTireWear)/2)<.001);
});
test('analog controller inputs preserve proportional steering and trigger pressure',()=>{
  const half=P.spawn(),full=P.spawn();
  for(let i=0;i<36;i++){P.step(half,{steer:.28,throttle:.45},1/60,1000+i*17);P.step(full,{steer:.82,throttle:1},1/60,1000+i*17);}
  assert.ok(full.throttle>half.throttle+.3);assert.ok(Math.abs(full.steer)>Math.abs(half.steer)+.3);assert.ok(full.speed>half.speed+30);
});
test('lap telemetry records speed, pedal use, slip, and tyre consumption',()=>{
  const p=P.spawn();p.started=true;p.telemetry={maxSpeed:0,speedSum:0,samples:0,brakeTime:0,throttleTime:0,maxSlip:0,startWear:p.tireWear};
  for(let i=0;i<150;i++)P.step(p,{up:true,right:i>90,down:i>120},1/60,1000+i*17);
  assert.ok(p.telemetry.samples>100);assert.ok(p.telemetry.maxSpeed>0);assert.ok(p.telemetry.throttleTime>0);assert.ok(p.telemetry.brakeTime>0);assert.ok(p.tireWear<p.telemetry.startWear);
});
test('starting grid is staggered, separated, and fully behind the line on every circuit',()=>{
  for(const id of Object.keys(P.tracks)){const cars=Array.from({length:8},(_,i)=>P.spawn(i,id));for(const car of cars){assert.ok(car.progress<=-45,id+' car behind line');assert.equal(car.gridSlot,cars.indexOf(car));assert.ok(P.nearest(car.x,car.y,id).distance<P.getTrack(id).road/2);}for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++)assert.ok(Math.hypot(cars[i].x-cars[j].x,cars[i].y-cars[j].y)>40,id+' grid cars separated');}
});
test('braking, progressive steering, rear slip, grip and frozen finish',()=>{
  const p=P.spawn();for(let i=0;i<90;i++)P.step(p,{up:true},1/60,1000+i*1000/60);
  assert.ok(p.speed>150);const speed=p.speed;P.step(p,{right:true},1/60,2600);assert.ok(p.steer>0&&p.steer<1);
  for(let i=0;i<12;i++)P.step(p,{down:true},1/60,2700+i*1000/60);assert.ok(p.speed<speed-40);
  const road=P.at(50),grip={...P.spawn(),x:road.x,y:road.y,angle:road.angle,vx:220*Math.cos(road.angle),vy:220*Math.sin(road.angle)};
  const drift={...grip};for(let i=0;i<15;i++){P.step(grip,{right:true,up:true},1/60,4000+i*17);P.step(drift,{right:true,up:true,handbrake:true},1/60,4000+i*17);}
  assert.ok(drift.grip<grip.grip);assert.ok(drift.slip>grip.slip);assert.ok(Math.abs(drift.speed)<Math.abs(grip.speed));
  p.finished=true;const x=p.x;P.step(p,{up:true},1/60,9000);assert.equal(p.x,x);
});
test('physics stays stable with a fixed timestep under sustained inputs',()=>{
  const p=P.spawn();for(let i=0;i<6000;i++){P.step(p,{up:true,left:i%300<100,right:i%300>200,handbrake:i%400>350},1/60,1000+i*1000/60);assert.ok([p.x,p.y,p.vx,p.vy,p.angle,p.progress].every(Number.isFinite));}
  assert.ok(P.nearest(p.x,p.y).distance<P.ROAD/2+73);
});
test('multiplayer: room settings, qualifying, movement, recovery, reset and host transfer',{timeout:15000},async t=>{
  const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3199'},stdio:['ignore','pipe','pipe']});t.after(()=>child.kill());
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',()=>reject(new Error('Server exited')));});
  const base='http://127.0.0.1:3199';async function api(a,d={}){const r=await fetch(base+'/api/'+a,{method:'POST',body:JSON.stringify(d)});return {status:r.status,data:await r.json()};}
  const health=await(await fetch(base+'/health')).json();assert.equal(health.version,P.VERSION);
  for(const file of ['/','/renderer.js','/physics.js','/game.js','/style.css','/telemetry.css'])assert.equal((await fetch(base+file)).status,200);
  assert.equal((await fetch(base+'/constructor')).status,404);
  const host=(await api('host',{name:'Host',laps:10,trackId:'metro',setup:{downforce:'high',compound:'soft',brakeBias:61}})).data;assert.equal(host.room.laps,10);assert.equal(host.room.trackId,'metro');assert.ok(host.room.players.every(p=>p.trackId==='metro'));assert.equal(host.room.players[0].setup.downforce,'high');assert.equal(host.room.players[0].setup.brakeBias,61);assert.match(host.room.code,/^[A-F0-9]{6}$/);
  const guest=(await api('join',{name:'Guest',code:host.room.code.toLowerCase(),setup:{gearing:'long'}})).data;assert.equal(guest.room.players.length,2);assert.equal(guest.room.players[1].setup.gearing,'long');
  assert.equal((await api('join',{code:'XXXXXX'})).status,404);assert.equal((await api('start',{token:guest.token})).status,403);assert.equal((await api('recover',{token:host.token})).status,409);
  const abort=new AbortController();t.after(()=>abort.abort());const stream=await fetch(base+'/events?token='+host.token,{signal:abort.signal});const reader=stream.body.getReader(),decoder=new TextDecoder();let pending='';
  async function state(){for(;;){const boundary=pending.indexOf('\n\n');if(boundary>=0){const msg=pending.slice(0,boundary);pending=pending.slice(boundary+2);if(msg.startsWith('data: '))return JSON.parse(msg.slice(6));continue;}const r=await reader.read();assert.ok(!r.done);pending+=decoder.decode(r.value);}}
  let s=await state();assert.equal(s.players.length,2);assert.ok(!JSON.stringify(s).includes(host.token));
  await api('start',{token:host.token});do{s=await state();}while(s.status!=='qualifying');assert.ok(s.start>s.now);assert.ok(s.qualifyingEnd>s.start);assert.equal(s.players[0].speed,0);
  assert.equal((await api('join',{code:host.room.code})).status,409);
  await new Promise(r=>setTimeout(r,3100));await api('input',{token:host.token,up:true,handbrake:true});
  do{s=await state();}while(s.now<Date.now()-100);while(s.players[0].speed===0)s=await state();assert.ok(Math.hypot(s.players[0].x-host.room.players[0].x,s.players[0].y-host.room.players[0].y)>.001);assert.ok(s.players[0].grip<1);
  assert.equal((await api('recover',{token:host.token})).status,200);do{s=await state();}while(s.players[0].recoveries!==1);assert.equal(s.players[0].valid,false);
  assert.equal((await api('recover',{token:host.token})).status,409);
  assert.equal((await api('lock',{token:host.token})).status,200);do{s=await state();}while(s.status!=='grid');assert.deepEqual(s.players.map(p=>p.gridPosition),[1,2]);assert.ok(s.players.every(p=>Object.hasOwn(p,'qualifyingTime')));
  await api('start',{token:host.token});do{s=await state();}while(s.status!=='racing');assert.ok(s.start>s.now);
  await api('reset',{token:host.token});do{s=await state();}while(s.status!=='lobby');assert.equal(s.players[0].lap,0);assert.equal(s.players[0].recoveries,0);
  await api('leave',{token:host.token});assert.equal((await api('start',{token:guest.token})).status,200);
  await api('leave',{token:guest.token});assert.equal((await api('join',{code:host.room.code})).status,404);abort.abort();
});
