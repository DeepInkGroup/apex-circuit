const P=require('./public/physics'),assert=require('node:assert/strict');
const p=P.spawn();let maxOffset=0,completed=[];
for(let i=0;i<20000&&p.lap<3;i++){
  const n=P.nearest(p.x,p.y),look=35+Math.abs(p.speed)*.22,target=P.at(n.s+look);
  const desired=Math.atan2(target.y-p.y,target.x-p.x),error=Math.atan2(Math.sin(desired-p.angle),Math.cos(desired-p.angle));
  let curvature=0;
  for(let d=0;d<180;d+=20){const a=P.at(n.s+d),b=P.at(n.s+d+25);curvature=Math.max(curvature,Math.abs(Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle)))/25);}
  const targetSpeed=Math.max(52,Math.min(270,Math.sqrt(170/Math.max(.001,curvature))));
  const lap=p.lap;
  P.step(p,{up:p.speed<targetSpeed,down:p.speed>targetSpeed+12,right:error>.025,left:error<-.025},1/60,1000+i*1000/60);
  maxOffset=Math.max(maxOffset,P.nearest(p.x,p.y).distance);
  if(lap!==p.lap)completed.push({lap:p.lap,time:p.last,valid:p.lastValid});
}
console.log(JSON.stringify({laps:completed,maxOffset,finalProgress:p.progress,trackLength:P.LENGTH},null,2));
assert.equal(p.lap,3,'A driver using throttle/brake/steering must be able to complete the circuit');
assert.ok(completed.every(lap=>lap.valid),'Conservative driving should complete clean laps');
