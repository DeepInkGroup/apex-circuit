/* Offline rivals use the same physics and track limits as human drivers. */
(function(root){
  'use strict';
  const P=typeof module!=='undefined'?require('./physics'):root.Physics;
  const levels={rookie:{corner:122,max:222,look:0,margin:18},club:{corner:174,max:274,look:4,margin:13},pro:{corner:202,max:290,look:8,margin:10}};
  function input(car,difficulty='club',index=0){
    const setup=levels[difficulty]||levels.club,n=P.nearest(car.x,car.y,car.trackId);
    const target=P.at(n.s+35+Math.abs(car.speed)*.22+setup.look,car.trackId),desired=Math.atan2(target.y-car.y,target.x-car.x);
    const error=Math.atan2(Math.sin(desired-car.angle),Math.cos(desired-car.angle));
    let curvature=0;
    for(let d=0;d<200;d+=20){const a=P.at(n.s+d,car.trackId),b=P.at(n.s+d+25,car.trackId);curvature=Math.max(curvature,Math.abs(Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle)))/25);}
    const circuitPace={metro:.9,zenith:.94,alpine:.97,aurora:.96,marina:.88,obsidian:.91,emerald:.96,titan:.9,vesper:.92}[car.trackId]||1,pace=[.96,1,1.025][index%3]*circuitPace;
    const targetSpeed=Math.max(52,Math.min(setup.max,Math.sqrt(setup.corner/Math.max(.001,curvature))))*pace,brakeBuffer=setup.margin+Math.min(10,curvature*120);
    return {up:car.speed<targetSpeed,down:car.speed>targetSpeed+brakeBuffer,right:error>.023,left:error<-.023};
  }
  function createSprint(name='Driver',difficulty='club',laps=3,trackId=P.activeTrack,driverSetup=P.setupDefaults){
    const names=[name,'Mika','Jules','Nova'],colors=['#b7f76b','#67d9ff','#ff826f','#c09cff'];
    const distance=Math.max(1,Math.min(20,Math.round(Number(laps)||3)));
    const aiSetups=[{downforce:'high',brakeBias:59,differential:48,gearing:'short',compound:'soft'},{downforce:'balanced',brakeBias:58,differential:56,gearing:'balanced',compound:'medium'},{downforce:'low',brakeBias:57,differential:62,gearing:'long',compound:'hard'}];
    return {status:'countdown',clock:0,start:3000,firstFinish:null,laps:distance,trackId:P.getTrack(trackId).id,difficulty:levels[difficulty]?difficulty:'club',players:names.map((name,i)=>({...P.spawn(i,trackId,i?aiSetups[i-1]:driverSetup),raceMode:true,id:i===0?'local':'ai-'+i,name,color:colors[i],ai:i>0,dnf:false}))};
  }
  function stepSprint(race,keys,dt){
    if(race.status==='finished')return;
    dt=Math.min(.05,Math.max(0,dt));race.clock+=dt*1000;
    if(race.clock<race.start)return;
    race.status='racing';
    race.players.forEach((car,i)=>{
      if(car.finished)return;
      P.step(car,i?input(car,race.difficulty,i-1):keys,dt,race.clock);
      if(car.lap>=race.laps){car.finished=true;car.vx=car.vy=car.speed=0;car.finish=race.clock-race.start+car.penalty;race.firstFinish??=race.clock;}
    });
    if(race.firstFinish!==null&&race.clock-race.firstFinish>45000){for(const p of race.players)if(!p.finished){p.dnf=true;p.finished=true;p.vx=p.vy=p.speed=0;}}
    if(race.players.every(p=>p.finished))race.status='finished';
  }
  function standings(players){return [...players].sort((a,b)=>a.dnf!==b.dnf?(a.dnf?1:-1):a.finished&&b.finished?(a.finish??Infinity)-(b.finish??Infinity):a.finished?-1:b.finished?1:b.progress-a.progress);}
  function medal(time){return time==null?null:time<=42000?'GOLD':time<=50000?'SILVER':time<=65000?'BRONZE':null;}
  const api={input,createSprint,stepSprint,standings,medal};
  if(typeof module!=='undefined')module.exports=api;else root.Racing=api;
})(typeof window==='undefined'?globalThis:window);
