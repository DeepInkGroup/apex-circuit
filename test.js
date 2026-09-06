'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const P=require('./public/physics');
function place(p,s,now){const loc=P.at(s);p.x=loc.x;p.y=loc.y;p.angle=loc.angle;P.step(p,{},0,now);}
function driveDistance(p,from,to,start=1000){for(let s=from;s<=to;s+=8)place(p,s,start+s*10);place(p,to,start+to*10);}
test('all circuits are closed, separated, bounded, and have asphalt grids',()=>{
  assert.deepEqual(Object.keys(P.tracks),['harbor','alpine','sunset']);
  for(const [id,track] of Object.entries(P.tracks)){
    const a=P.at(0,id),b=P.at(track.length,id);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.001,id+' closes');
    for(let i=0;i<8;i++){const p=P.spawn(i,id);assert.equal(p.trackId,id);assert.ok(P.nearest(p.x,p.y,id).distance<track.road/2);}
    let gap=Infinity,pts=track.points;for(let i=0;i<pts.length;i++)for(let j=i+28;j<pts.length;j++){if(pts.length-j+i<=28)continue;gap=Math.min(gap,Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y));}
    assert.ok(gap>track.road,id+' road overlaps itself: '+gap);assert.ok(pts.every(p=>p.x>60&&p.x<1740&&p.y>55&&p.y<1045),id+' stays on canvas');
  }
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
test('sustained track-limit violation adds one 3-second penalty until clean re-entry',()=>{
  const p=P.spawn(),loc=P.at(300);p.x=loc.x+loc.nx*(P.ROAD/2+30);p.y=loc.y+loc.ny*(P.ROAD/2+30);
  for(let i=0;i<30;i++)P.step(p,{},1/60,1000+i*17);assert.equal(p.trackLimits,1);assert.equal(p.penalty,3000);assert.equal(p.valid,false);
  for(let i=0;i<30;i++)P.step(p,{},1/60,2000+i*17);assert.equal(p.penalty,3000);
  p.x=loc.x;p.y=loc.y;for(let i=0;i<10;i++)P.step(p,{},1/60,3000+i*17);p.x=loc.x+loc.nx*(P.ROAD/2+30);p.y=loc.y+loc.ny*(P.ROAD/2+30);for(let i=0;i<30;i++)P.step(p,{},1/60,4000+i*17);assert.equal(p.penalty,6000);assert.equal(p.trackLimits,2);
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
test('multiplayer: room settings, stream, authority, start, movement, recovery, reset and host transfer',{timeout:15000},async t=>{
  const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3199'},stdio:['ignore','pipe','pipe']});t.after(()=>child.kill());
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',()=>reject(new Error('Server exited')));});
  const base='http://127.0.0.1:3199';async function api(a,d={}){const r=await fetch(base+'/api/'+a,{method:'POST',body:JSON.stringify(d)});return {status:r.status,data:await r.json()};}
  const health=await(await fetch(base+'/health')).json();assert.equal(health.version,P.VERSION);
  for(const file of ['/','/renderer.js','/physics.js','/game.js','/style.css'])assert.equal((await fetch(base+file)).status,200);
  assert.equal((await fetch(base+'/constructor')).status,404);
  const host=(await api('host',{name:'Host',laps:10,trackId:'alpine'})).data;assert.equal(host.room.laps,10);assert.equal(host.room.trackId,'alpine');assert.ok(host.room.players.every(p=>p.trackId==='alpine'));assert.match(host.room.code,/^[A-F0-9]{6}$/);
  const guest=(await api('join',{name:'Guest',code:host.room.code.toLowerCase()})).data;assert.equal(guest.room.players.length,2);
  assert.equal((await api('join',{code:'XXXXXX'})).status,404);assert.equal((await api('start',{token:guest.token})).status,403);assert.equal((await api('recover',{token:host.token})).status,409);
  const abort=new AbortController();t.after(()=>abort.abort());const stream=await fetch(base+'/events?token='+host.token,{signal:abort.signal});const reader=stream.body.getReader(),decoder=new TextDecoder();let pending='';
  async function state(){for(;;){const boundary=pending.indexOf('\n\n');if(boundary>=0){const msg=pending.slice(0,boundary);pending=pending.slice(boundary+2);if(msg.startsWith('data: '))return JSON.parse(msg.slice(6));continue;}const r=await reader.read();assert.ok(!r.done);pending+=decoder.decode(r.value);}}
  let s=await state();assert.equal(s.players.length,2);assert.ok(!JSON.stringify(s).includes(host.token));
  await api('start',{token:host.token});do{s=await state();}while(s.status!=='racing');assert.ok(s.start>s.now);assert.equal(s.players[0].speed,0);
  assert.equal((await api('join',{code:host.room.code})).status,409);
  await new Promise(r=>setTimeout(r,3100));await api('input',{token:host.token,up:true,handbrake:true});
  do{s=await state();}while(s.now<Date.now()-100);while(s.players[0].speed===0)s=await state();assert.ok(s.players[0].x>host.room.players[0].x);assert.ok(s.players[0].grip<1);
  assert.equal((await api('recover',{token:host.token})).status,200);do{s=await state();}while(s.players[0].recoveries!==1);assert.equal(s.players[0].valid,false);
  assert.equal((await api('recover',{token:host.token})).status,409);
  await api('reset',{token:host.token});do{s=await state();}while(s.status!=='lobby');assert.equal(s.players[0].lap,0);assert.equal(s.players[0].recoveries,0);
  await api('leave',{token:host.token});assert.equal((await api('start',{token:guest.token})).status,200);
  await api('leave',{token:guest.token});assert.equal((await api('join',{code:host.room.code})).status,404);abort.abort();
});
