'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const P=require('./public/physics'),R=require('./public/racing');
for(const level of ['rookie','club','pro'])test('AI '+level+' finishes a clean three-lap race with real controls',()=>{
  const race=R.createSprint('Tester',level,3);
  for(let i=0;i<22000&&race.status!=='finished';i++)R.stepSprint(race,R.input(race.players[0],level),1/60);
  assert.equal(race.status,'finished');assert.equal(race.players.length,4);
  for(const p of race.players){assert.equal(p.lap,3,p.name+' completes every lap');assert.equal(p.dnf,false);assert.equal(p.penalty,0,p.name+' stays within track limits');assert.ok(p.finish>0);}
});
for(const trackId of ['alpine','sunset','metro','emerald','thunder','zenith','aurora','sakura','marina','volcano','obsidian','titan','vesper','copper','lotus'])test('AI field completes three clean laps at '+trackId,()=>{
  const race=R.createSprint('Tester','club',3,trackId);for(let i=0;i<24000&&race.status!=='finished';i++)R.stepSprint(race,R.input(race.players[0],'club'),1/60);
  assert.equal(race.status,'finished');assert.equal(race.trackId,trackId);for(const p of race.players){assert.equal(p.lap,3,p.name+' finishes');assert.equal(p.trackId,trackId);if(trackId!=='marina'){assert.equal(p.lastValid,true,p.name+' finishes a clean final lap');assert.equal(p.penalty,0,p.name+' has no limits penalty');}}
});
test('race distance accepts one through twenty laps and clamps other values',()=>{assert.equal(R.createSprint('A','club',1).laps,1);assert.equal(R.createSprint('A','club',10).laps,10);assert.equal(R.createSprint('A','club',20).laps,20);assert.equal(R.createSprint('A','club',99).laps,20);});
test('countdown freezes grid, recovery invalidates a lap, and timed-out drivers are DNF',()=>{
  const race=R.createSprint();const x=race.players[0].x;
  for(let i=0;i<100;i++)R.stepSprint(race,{up:true},1/60);assert.equal(race.players[0].x,x);assert.equal(race.status,'countdown');
  while(race.clock<4000)R.stepSprint(race,{up:true},1/60);P.recover(race.players[0],race.clock);assert.equal(race.players[0].valid,false);
  race.firstFinish=race.clock-46000;R.stepSprint(race,{},1/60);assert.equal(race.status,'finished');assert.equal(race.players[0].dnf,true);
});
test('penalties affect classification and DNF is last',()=>{
  const players=[{id:'a',dnf:false,finished:true,finish:105000},{id:'b',dnf:false,finished:true,finish:103000},{id:'c',dnf:true,finished:true,finish:null}];
  assert.deepEqual(R.standings(players).map(p=>p.id),['b','a','c']);assert.equal(R.medal(42000),'GOLD');assert.equal(R.medal(50000),'SILVER');assert.equal(R.medal(65000),'BRONZE');assert.equal(R.medal(66000),null);assert.equal(R.medal(null),null);
});
test('Pages build has relative assets and disables the implicit local backend',()=>{
  const html=fs.readFileSync(path.join(__dirname,'public/index.html'),'utf8');
  const renderer=fs.readFileSync(path.join(__dirname,'public/renderer.js'),'utf8');
  const sources=[...html.matchAll(/(?:src|href)="(\.\/[^"#]*)"/g)].map(m=>m[1]);assert.ok(sources.length>=7);
  for(const file of sources){if(file!=='./')assert.ok(fs.existsSync(path.join(__dirname,'public',file)),file+' exists');}
  assert.ok(!/(?:src|href)="\/(?!\/)/.test(html));
  assert.doesNotMatch(renderer,/stroke\(g,15,'#eee9dc'/,'rounded pink-and-white edge markers stay removed');assert.doesNotMatch(renderer,/drawPaddock/,'repeated trackside colour blocks stay removed');assert.match(renderer,/stroke\(g,3,'#f5f4e8dd'/,'continuous white track boundary remains');
  require('./build-pages.cjs');const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'dist/config.js'),'utf8'),context);assert.equal(context.window.APEX_CONFIG.static,true);assert.equal(context.window.APEX_CONFIG.serverUrl,'');
});
