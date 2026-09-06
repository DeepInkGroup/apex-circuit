/* Canvas artwork stays crisp without image downloads or external assets. */
class CircuitRenderer {
  constructor(canvas) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.P=Physics;
    this.bg=document.createElement('canvas');this.bg.width=Physics.WIDTH;this.bg.height=Physics.HEIGHT;
    this.skids=document.createElement('canvas');this.skids.width=Physics.WIDTH;this.skids.height=Physics.HEIGHT;
    this.skidCtx=this.skids.getContext('2d');this.previous=new Map();this.particles=[];this.frameCount=0;this.camera=null;
    this.build();
  }
  path(g,offset=0) {
    g.beginPath();Physics.points.forEach((p,i)=>{const n=Physics.at(i*Physics.LENGTH/Physics.points.length);const x=p.x+n.nx*offset,y=p.y+n.ny*offset;i?g.lineTo(x,y):g.moveTo(x,y);});g.closePath();
  }
  stroke(g,width,color,offset=0,dash=[]) {
    this.path(g,offset);g.lineWidth=width;g.strokeStyle=color;g.lineJoin='round';g.lineCap='round';g.setLineDash(dash);g.stroke();g.setLineDash([]);
  }
  build() {
    const g=this.bg.getContext('2d'),P=Physics;
    const gradient=g.createLinearGradient(0,0,1800,1100);gradient.addColorStop(0,'#34554a');gradient.addColorStop(1,'#234337');g.fillStyle=gradient;g.fillRect(0,0,1800,1100);
    // Harbor water in the northeast corner, with a sand and stone shoreline.
    g.beginPath();g.moveTo(1590,-10);g.bezierCurveTo(1510,105,1610,240,1660,370);g.bezierCurveTo(1710,440,1700,560,1810,605);g.lineTo(1810,-10);g.closePath();
    g.lineWidth=38;g.strokeStyle='#8f9673';g.stroke();g.lineWidth=18;g.strokeStyle='#739385';g.stroke();
    const sea=g.createLinearGradient(1500,0,1800,500);sea.addColorStop(0,'#337b7c');sea.addColorStop(1,'#174b59');g.fillStyle=sea;g.fill();
    g.save();g.clip();g.strokeStyle='#a4d1bd28';g.lineWidth=2;
    for(let i=0;i<65;i++){const x=1560+(i*61)%240,y=(i*43)%590;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+18,y+5,x+45,y);g.stroke();}g.restore();
    // Infield marsh.
    g.beginPath();g.moveTo(900,460);g.bezierCurveTo(970,405,1120,325,1160,440);g.bezierCurveTo(1185,490,1280,540,1280,630);g.bezierCurveTo(1240,755,1010,780,970,700);g.bezierCurveTo(995,575,840,570,900,460);g.closePath();g.lineWidth=15;g.strokeStyle='#476450';g.stroke();g.fillStyle='#326963';g.fill();
    // Subtle mowing stripes and small ground texture.
    g.save();g.globalAlpha=.025;g.fillStyle='#b6cf8d';for(let i=0;i<18;i++){g.save();g.translate(i*150-600,0);g.rotate(-.35);g.fillRect(0,-400,65,1800);g.restore();}g.restore();
    let seed=7283;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<2100;i++){const x=rand()*1800,y=rand()*1100;g.fillStyle=rand()>.5?'#deedb408':'#061c140e';g.fillRect(x,y,2+rand()*5,2);}
    // Runoff and the track ribbon use exactly the same centerline as physics.
    this.stroke(g,185,'#192e2545');this.stroke(g,158,'#798875');this.stroke(g,146,'#516658');
    this.stroke(g,130,'#e3dfc6');this.stroke(g,130,'#d97858',0,[21,21]);this.stroke(g,112,'#dddcc4');this.stroke(g,108,'#303b3c');
    this.stroke(g,36,'#111a1b20');this.stroke(g,1,'#bfc9b718',0,[4,18]);
    // Braking boards and direction chevrons.
    for(let i=0;i<24;i++){
      const p=P.at(i*P.LENGTH/24+150);g.save();g.translate(p.x,p.y);g.rotate(p.angle);g.strokeStyle='#ced8c33a';g.lineWidth=2;g.beginPath();g.moveTo(-9,-6);g.lineTo(1,0);g.lineTo(-9,6);g.stroke();g.restore();
    }
    for(const ratio of [.2,.32,.45,.62,.79,.9]){
      const p=P.at(P.LENGTH*ratio-95);g.save();g.translate(p.x+p.nx*84,p.y+p.ny*84);g.rotate(p.angle);g.fillStyle='#e4e6ce';g.fillRect(-14,-9,28,18);g.fillStyle='#243c2f';g.font='bold 10px Consolas';g.textAlign='center';g.fillText('50',0,4);g.restore();
    }
    // Start/finish and grid positions on the main straight.
    const start=P.at(0);g.save();g.translate(start.x,start.y);g.rotate(start.angle);
    for(let y=-56;y<56;y+=8)for(let x=0;x<16;x+=8){g.fillStyle=((y+56)/8+x/8)%2?'#f0edd5':'#1b2828';g.fillRect(x,y,8,8);}g.restore();
    for(let i=0;i<8;i++){const p=P.spawn(i);g.save();g.translate(p.x,p.y);g.rotate(p.angle);g.strokeStyle='#dbe3c955';g.lineWidth=1;g.strokeRect(-19,-12,38,24);g.restore();}
    // Pit lane, garages, grandstand and solar roofs.
    g.fillStyle='#344a40';g.beginPath();g.roundRect(830,1000,640,32,12);g.fill();g.setLineDash([16,12]);g.strokeStyle='#d8dfbc75';g.lineWidth=2;g.beginPath();g.moveTo(850,1016);g.lineTo(1450,1016);g.stroke();g.setLineDash([]);
    for(let i=0;i<8;i++){
      const x=865+i*70;g.fillStyle='#14282088';g.fillRect(x+9,1043,60,36);g.fillStyle='#9baba0';g.fillRect(x,1037,60,30);g.fillStyle='#dae1c5';g.fillRect(x,1037,60,5);g.fillStyle=i%2?'#53776d':'#385d57';g.fillRect(x+5,1047,50,15);g.fillStyle='#b7f76b';g.fillRect(x+7,1031,14,4);
    }
    this.grandstand(g,965,813,280,38,0);this.grandstand(g,75,330,130,35,-Math.PI/2);
    // Yacht, dock and mooring posts.
    g.save();g.translate(1738,180);g.rotate(.15);g.fillStyle='#162c2c55';g.beginPath();g.ellipse(7,8,18,58,0,0,Math.PI*2);g.fill();g.fillStyle='#e4e5d3';g.beginPath();g.moveTo(0,-50);g.quadraticCurveTo(23,-14,14,43);g.lineTo(-14,43);g.quadraticCurveTo(-23,-14,0,-50);g.fill();g.fillStyle='#326471';g.fillRect(-9,-10,18,34);g.fillStyle='#f4eee0';g.fillRect(-6,0,12,18);g.restore();
    g.fillStyle='#9f9e7d';g.fillRect(1735,294,65,12);g.fillRect(1741,282,8,40);
    // Trees have offset shadows and layered crowns. Exclude road and water.
    for(let i=0;i<300;i++){
      const x=55+rand()*1685,y=75+rand()*960,n=P.nearest(x,y);
      if(n.distance<105||x>1620||(x>875&&x<1310&&y>365&&y<760)||(x>820&&y>780)||(x>610&&x<880&&y>420&&y<540))continue;
      this.tree(g,x,y,11+rand()*13,rand());
    }
    this.label(g,'HARBOR',1070,550,25,'#a1c1a768');this.label(g,'RUN',1070,579,25,'#a1c1a768');
    this.label(g,'APEX MOTORSPORT',1100,1077,10,'#c1d8a0');
    this.label(g,'01  /  THE ESSES',720,475,11,'#abc5a77a');
    this.label(g,'02  /  HARBOR HAIRPIN',1460,95,10,'#d3dac491');
    this.label(g,'03  /  FOREST LOOP',325,440,11,'#abc5a77a');
    // Start gantry kept outside the driving surface.
    g.fillStyle='#172f25';g.fillRect(648,990,142,25);g.fillStyle='#b7f76b';g.font='bold 10px Consolas';g.fillText('START / FINISH',662,1007);
  }
  label(g,text,x,y,size,color){g.save();g.textAlign='center';g.font='600 '+size+'px Segoe UI';g.letterSpacing='3px';g.fillStyle=color;g.fillText(text,x,y);g.restore();}
  tree(g,x,y,r,t){g.fillStyle='#0b211c42';g.beginPath();g.ellipse(x+9,y+11,r*1.1,r*.7,.5,0,7);g.fill();g.fillStyle=t>.5?'#224435':'#2a4c39';g.beginPath();g.arc(x,y,r,0,7);g.fill();g.fillStyle=t>.5?'#466746':'#3a5e43';g.beginPath();g.arc(x-3,y-4,r*.77,0,7);g.fill();g.fillStyle='#74915755';g.beginPath();g.arc(x-5,y-7,r*.4,0,7);g.fill();}
  grandstand(g,x,y,w,h,angle){g.save();g.translate(x,y);g.rotate(angle);g.fillStyle='#0e261e70';g.fillRect(7,8,w,h);g.fillStyle='#596f5c';g.fillRect(0,0,w,h);for(let row=0;row<4;row++){g.fillStyle=row%2?'#c1c9b0':'#859b80';g.fillRect(4,3+row*8,w-8,3);for(let j=0;j<w/9;j++){g.fillStyle=['#b7f76b','#d7956a','#d0dac2','#305553'][j%4];g.fillRect(5+j*9,6+row*8,3,3);}}g.restore();}
  clear(){this.skidCtx.clearRect(0,0,1800,1100);this.previous.clear();this.particles=[];this.camera=null;}
  car(g,p,you=false,ghost=false){
    g.save();g.translate(p.x,p.y);g.rotate(p.angle);if(ghost)g.globalAlpha=.32;
    if(you&&!ghost){g.strokeStyle='#d6f3a780';g.lineWidth=1;g.beginPath();g.arc(0,0,27,0,7);g.stroke();}
    g.fillStyle='#0c1c2088';g.beginPath();g.roundRect(-20+5,-10+6,40,20,5);g.fill();
    g.fillStyle='#101718';g.fillRect(-14,-14,10,6);g.fillRect(-14,8,10,6);
    for(const y of [-11,11]){g.save();g.translate(11,y);g.rotate((p.steer||0)*.35);g.fillRect(-5,-3,10,6);g.restore();}
    const paint=g.createLinearGradient(0,-11,0,11);paint.addColorStop(0,'#eef4d7');paint.addColorStop(.2,ghost?'#a8e6e6':p.color);paint.addColorStop(.75,ghost?'#6faeae':p.color);paint.addColorStop(1,'#355048');
    g.fillStyle=paint;g.beginPath();g.roundRect(-21,-10,43,20,5);g.fill();
    g.fillStyle='#13292d';g.beginPath();g.moveTo(7,-8);g.lineTo(12,-6);g.lineTo(12,6);g.lineTo(7,8);g.closePath();g.fill();g.fillStyle='#16292b';g.fillRect(-13,-7,7,14);
    g.fillStyle='#213c3c';g.fillRect(-5,-7,11,14);g.fillStyle='#d9e7cf';g.globalAlpha*=.35;g.fillRect(-20,-2,39,4);g.globalAlpha=ghost?.32:1;
    g.fillStyle='#e7f2dd';g.fillRect(19,-8,3,5);g.fillRect(19,3,3,5);
    g.fillStyle=p.braking?'#ff5a43':'#8c3c30';g.fillRect(-21,-8,3,5);g.fillRect(-21,3,3,5);
    g.fillStyle='#142728';g.fillRect(-19,-13,4,26);g.fillStyle='#cce0c277';g.fillRect(-19,-13,1,26);g.restore();
    if(!ghost){g.save();g.textAlign='center';g.font=(you?'bold ':'')+'11px Segoe UI';const text=p.name+(you?' · YOU':'');const width=g.measureText(text).width;g.fillStyle='#10271fd9';g.beginPath();g.roundRect(p.x-width/2-6,p.y-39,width+12,17,4);g.fill();g.fillStyle=you?'#d8f9ad':'#e1e6d7';g.fillText(text,p.x,p.y-27);g.restore();}
  }
  draw(players,me,ghost,guide,time,dt,follow=false){
    const g=this.ctx;g.save();
    if(follow){
      const zoom=2.15,halfW=900/zoom,halfH=550/zoom;
      const target={x:Math.max(halfW,Math.min(1800-halfW,me.x+(me.vx||0)*.28)),y:Math.max(halfH,Math.min(1100-halfH,me.y+(me.vy||0)*.28))};
      this.camera??=target;const f=1-Math.exp(-7*dt);this.camera.x+=(target.x-this.camera.x)*f;this.camera.y+=(target.y-this.camera.y)*f;
      g.translate(900,550);g.scale(zoom,zoom);g.translate(-this.camera.x,-this.camera.y);
    }else this.camera=null;
    g.drawImage(this.bg,0,0);
    if(guide){
      const P=Physics;g.save();g.globalAlpha=.48;
      for(let s=0;s<P.LENGTH;s+=33){const p=P.at(s),next=P.at(s+65);const bend=Math.abs(Math.atan2(Math.sin(next.angle-p.angle),Math.cos(next.angle-p.angle)));g.fillStyle=bend>.3?'#ffb67c':bend>.13?'#d9dc8a':'#b7f76b';g.beginPath();g.arc(p.x,p.y,2.1,0,7);g.fill();}g.restore();
    }
    this.frameCount++;
    if(this.frameCount%300===0){this.skidCtx.save();this.skidCtx.globalCompositeOperation='destination-out';this.skidCtx.fillStyle='#00000018';this.skidCtx.fillRect(0,0,1800,1100);this.skidCtx.restore();}
    for(const p of players){
      const prev=this.previous.get(p.id),drifting=p.slip>10||p.braking&&Math.abs(p.speed)>100;
      if(prev&&drifting&&p.surface!=='GRASS'&&Math.hypot(p.x-prev.x,p.y-prev.y)<25){
        const k=this.skidCtx;k.strokeStyle='#07101235';k.lineWidth=3;k.lineCap='round';
        for(const side of [-9,9]){k.beginPath();k.moveTo(prev.x-Math.sin(prev.angle)*side,prev.y+Math.cos(prev.angle)*side);k.lineTo(p.x-Math.sin(p.angle)*side,p.y+Math.cos(p.angle)*side);k.stroke();}
      }
      if(Math.abs(p.speed)>45&&(p.surface==='GRASS'||drifting)&&this.frameCount%3===0&&this.particles.length<90)this.particles.push({x:p.x-Math.cos(p.angle)*18,y:p.y-Math.sin(p.angle)*18,life:1,dust:p.surface==='GRASS'});
      this.previous.set(p.id,{x:p.x,y:p.y,angle:p.angle});
    }
    g.drawImage(this.skids,0,0);
    for(const p of this.particles){p.life-=dt*1.6;g.fillStyle=p.dust?'#ccb88a':'#d5e0d6';g.globalAlpha=Math.max(0,p.life)*.19;g.beginPath();g.arc(p.x,p.y,3+(1-p.life)*12,0,7);g.fill();}g.globalAlpha=1;this.particles=this.particles.filter(p=>p.life>0);
    if(ghost)this.car(g,ghost,false,true);
    players.filter(p=>p.id!==me.id).forEach(p=>this.car(g,p));this.car(g,me,true);g.restore();
    if(follow){
      g.save();g.translate(1430,120);g.fillStyle='#10251ddd';g.beginPath();g.roundRect(-12,-12,340,222,12);g.fill();
      g.scale(.175,.175);this.stroke(g,23,'#788e77');this.stroke(g,12,'#273f32');
      for(const p of players){g.fillStyle=p.id===me.id?'#b7f76b':p.color;g.beginPath();g.arc(p.x,p.y,p.id===me.id?27:18,0,7);g.fill();}
      g.restore();
    }
  }
}
window.CircuitRenderer=CircuitRenderer;
