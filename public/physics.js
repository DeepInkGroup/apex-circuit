/* Shared simulation: the browser and server use the same track and handling. */
(function (root) {
  'use strict';
  const VERSION = 'harbor-2';
  const WIDTH = 1800, HEIGHT = 1100, ROAD = 112;
  const controls = [
    [680, 920], [1050, 920], [1420, 905], [1590, 790],
    [1575, 600], [1390, 505], [1260, 365], [1430, 210],
    [1260, 135], [1040, 185], [900, 355], [720, 350],
    [590, 170], [355, 170], [175, 305], [170, 545],
    [330, 650], [575, 570], [790, 600], [805, 715], [630, 770], [455, 845], [515, 925]
  ];
  const raw = [];
  function spline(a, b, c, d, t) {
    return .5 * ((2*b) + (-a+c)*t + (2*a-5*b+4*c-d)*t*t + (-a+3*b-3*c+d)*t*t*t);
  }
  for (let i = 0; i < controls.length; i++) {
    const a=controls[(i+controls.length-1)%controls.length], b=controls[i], c=controls[(i+1)%controls.length], d=controls[(i+2)%controls.length];
    for (let j=0;j<32;j++) raw.push({x:spline(a[0],b[0],c[0],d[0],j/32),y:spline(a[1],b[1],c[1],d[1],j/32)});
  }
  let rawLength=0;
  const lengths=raw.map((p,i)=>{const next=raw[(i+1)%raw.length];const length=Math.hypot(next.x-p.x,next.y-p.y);rawLength+=length;return length;});
  const count=Math.ceil(rawLength/9), spacing=rawLength/count, points=[];
  let segment=0, consumed=0;
  for(let i=0;i<count;i++) {
    const target=i*spacing;
    while(consumed+lengths[segment]<target){consumed+=lengths[segment++];}
    const a=raw[segment],b=raw[(segment+1)%raw.length],t=(target-consumed)/lengths[segment];
    points.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  }
  const LENGTH=count*spacing;
  const wrap=s=>(s%LENGTH+LENGTH)%LENGTH;
  function at(s) {
    const f=wrap(s)/spacing,i=Math.floor(f),a=points[i],b=points[(i+1)%count],t=f-i;
    const angle=Math.atan2(b.y-a.y,b.x-a.x);
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle,nx:-Math.sin(angle),ny:Math.cos(angle)};
  }
  function nearest(x,y) {
    let best=Infinity,result;
    for(let i=0;i<count;i++) {
      const a=points[i],b=points[(i+1)%count],dx=b.x-a.x,dy=b.y-a.y;
      const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));
      const px=a.x+t*dx,py=a.y+t*dy,d=(x-px)**2+(y-py)**2;
      if(d<best){best=d;result={x:px,y:py,index:i,s:(i+t)*spacing,angle:Math.atan2(dy,dx)};}
    }
    result.distance=Math.sqrt(best);return result;
  }
  function spawn(slot=0) {
    const s=-22-Math.floor(slot/2)*48, p=at(s),lane=slot%2?23:-23;
    return {x:p.x+p.nx*lane,y:p.y+p.ny*lane,angle:p.angle,vx:0,vy:0,speed:0,steer:0,yaw:0,slip:0,grip:1,surface:'ASPHALT',braking:false,
      lap:0,lapStart:0,started:false,progress:s,trackS:wrap(s),safeS:s,checkpoint:0,
      best:null,last:null,lastValid:true,valid:true,sectors:[],bestSectors:[],lastSectors:[],sectorStart:0,
      finished:false,finish:null,recoveries:0,recoveryAt:0,wrongWay:false};
  }
  function recover(p,now) {
    if(p.finished||now-p.recoveryAt<2000)return false;
    const loc=at(p.safeS);
    Object.assign(p,{x:loc.x,y:loc.y,angle:loc.angle,vx:0,vy:0,speed:0,yaw:0,steer:0,slip:0,trackS:wrap(p.safeS),valid:false,recoveryAt:now});
    p.recoveries++;return true;
  }
  function timing(p,n,now) {
    let delta=n.s-p.trackS;
    if(delta>LENGTH/2)delta-=LENGTH;if(delta<-LENGTH/2)delta+=LENGTH;
    p.trackS=n.s;
    // Progress follows the actual route. Teleports cannot advance a lap.
    if(Math.abs(delta)>85){p.valid=false;return;}
    const before=p.progress;
    p.progress+=delta;
    p.wrongWay=delta<-.25&&Math.abs(p.speed)>25;
    if(n.distance<ROAD/2+6)p.safeS=p.progress;
    if(n.distance>ROAD/2+28)p.valid=false;
    if(!p.started&&before<0&&p.progress>=0){p.started=true;p.lapStart=now;p.sectorStart=now;p.valid=true;}
    if(!p.started)return;
    const completed=p.lap*LENGTH;
    // All three sectors must be crossed in order, including the finish line.
    while(p.checkpoint<2&&p.progress>=completed+(p.checkpoint+1)*LENGTH/3) {
      p.sectors.push(now-p.sectorStart);p.sectorStart=now;p.checkpoint++;
    }
    if(p.progress>=(p.lap+1)*LENGTH&&p.checkpoint===2) {
      p.last=now-p.lapStart;p.lastValid=p.valid;p.lastSectors=[...p.sectors,now-p.sectorStart];
      if(p.valid&&(p.best===null||p.last<p.best)){p.best=p.last;p.bestSectors=[...p.lastSectors];}
      p.lap++;p.lapStart=now;p.sectorStart=now;p.checkpoint=0;p.sectors=[];p.valid=true;
    }
  }
  function step(p,input,dt,now) {
    if(p.finished)return;
    dt=Math.max(0,Math.min(dt,.05));
    const n=nearest(p.x,p.y),off=n.distance>ROAD/2+5,curb=!off&&n.distance>ROAD/2-7;
    p.surface=off?'GRASS':curb?'CURB':'ASPHALT';
    const c=Math.cos(p.angle),s=Math.sin(p.angle);
    let forward=p.vx*c+p.vy*s,lateral=-p.vx*s+p.vy*c;
    const steering=(input.right?1:0)-(input.left?1:0);
    p.steer+=(steering-p.steer)*(1-Math.exp(-8*dt));
    const braking=!!input.down&&forward>8;
    p.braking=braking||!!input.handbrake;
    // Braking shifts load forward; handbrake releases rear grip.
    const grip=(off?.42:curb?.83:1)*(input.handbrake?.35:1);
    p.grip=grip;
    const steeringAngle=p.steer*.62/(1+Math.abs(forward)/400);
    const desiredYaw=forward/27*Math.tan(steeringAngle)*(input.handbrake?1.5:1)*(braking?1.12:1);
    const yawLimit=(off?150:input.handbrake?380:310)/Math.max(65,Math.abs(forward));
    const targetYaw=Math.max(-yawLimit,Math.min(yawLimit,desiredYaw));
    p.yaw+=(targetYaw-p.yaw)*(1-Math.exp(-7*dt));
    p.angle+=p.yaw*dt;p.angle=Math.atan2(Math.sin(p.angle),Math.cos(p.angle));
    // Velocity remains in world space as the body rotates: a real slip angle.
    const nc=Math.cos(p.angle),ns=Math.sin(p.angle);
    forward=p.vx*nc+p.vy*ns;lateral=-p.vx*ns+p.vy*nc;
    lateral*=Math.exp(-(off?3.2:9)*grip*dt);
    const throttle=input.up?(forward<0?260:205*(1-Math.min(1,Math.max(0,forward)/410))):0;
    const brake=input.down?(forward>8?-360:input.up?0:-100):0;
    forward+=(throttle+brake-forward*(off?2.1:.15)-forward*Math.abs(forward)*.00024)*dt;
    if(input.handbrake)forward*=Math.exp(-1.35*dt);
    if(!input.up&&!input.down&&Math.abs(forward)<1.5)forward=0;
    forward=Math.max(-70,Math.min(390,forward));
    p.vx=nc*forward-ns*lateral;p.vy=ns*forward+nc*lateral;
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.speed=forward;p.slip=Math.abs(lateral);
    const next=nearest(p.x,p.y);
    // Soft outer barriers prevent getting lost in scenery; damp the impact.
    if(next.distance>ROAD/2+72) {
      const dx=p.x-next.x,dy=p.y-next.y,k=(ROAD/2+70)/next.distance;
      p.x=next.x+dx*k;p.y=next.y+dy*k;p.vx*=.35;p.vy*=.35;p.speed*=.35;p.valid=false;
    }
    timing(p,nearest(p.x,p.y),now);
  }
  const api={VERSION,WIDTH,HEIGHT,ROAD,LENGTH,points,at,nearest,spawn,recover,step};
  if(typeof module!=='undefined')module.exports=api;else root.Physics=api;
})(typeof window==='undefined'?globalThis:window);
