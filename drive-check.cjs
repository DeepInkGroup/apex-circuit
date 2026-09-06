const P=require('./public/physics'),R=require('./public/racing'),assert=require('node:assert/strict');
for(const trackId of Object.keys(P.tracks)){
  const p=P.spawn(0,trackId),completed=[];let maxOffset=0;
  for(let i=0;i<24000&&p.lap<3;i++){
    const lap=p.lap;P.step(p,R.input(p,'club'),1/60,1000+i*1000/60);maxOffset=Math.max(maxOffset,P.nearest(p.x,p.y,trackId).distance);
    if(lap!==p.lap)completed.push({lap:p.lap,time:Math.round(p.last),valid:p.lastValid});
  }
  console.log(trackId,JSON.stringify({laps:completed,maxOffset:Math.round(maxOffset),trackLength:Math.round(P.getTrack(trackId).length)}));
  assert.equal(p.lap,3,trackId+' must be driveable for three laps');assert.ok(completed.every(lap=>lap.valid),trackId+' conservative laps stay within limits');assert.equal(p.penalty,0,trackId+' clean driver receives no penalties');
}
