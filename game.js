(()=>{
'use strict';
const W=480,H=270,cv=document.getElementById('game'),ctx=cv.getContext('2d'),$=id=>document.getElementById(id);
cv.width=W;cv.height=H;
const fit=()=>{const k=Math.min(innerWidth/W,innerHeight/H);cv.style.width=W*k+'px';cv.style.height=H*k+'px'};
addEventListener('resize',fit);fit();

/* ---------- PLACEHOLDER ART ----------
   Sprites are ASCII maps drawn at load time. To use real art, drop PNGs named
   after the keys below into /assets (e.g. assets/player.png) - they replace the
   placeholders automatically. Sprites should face LEFT. */
const PAL={k:'#0b1d2e',o:'#ff8a3d',w:'#ffffff',p:'#ff6fae',P:'#b84a86',s:'#9b6bff',b:'#7fd8f5',r:'#e5484d',y:'#ffd23f'};
const ART={
 player:["...kkkk....","..koowook.k",".kooowoook.","kooookwoook",".kooowoook.","..koowook.k","...kkkk...."],
 minnow:["..kkkk.r",".kbbwbkr","kbbbbbbr",".kbbbbkr","..kkkk.r"],
 jelly:["..kppppk..",".kppppppk.","kppwppwppk","kppppppppk",".kPPPPPPk.","..p.p.p.p.","..p.p.p.p.","...p.p.p.."],
 urchin:["s...s...s",".s..s..s.","..skkks..","sskwkwkss","sskkkkkss","..skkks..",".s..s..s.","s...s...s"],
 gem:["..b..",".bwb.","bwbbb",".bbb.","..b.."],
 claw:["r...r","rr.rr",".rrr.","..r.."]
};
const S={};
for(const k in ART){
  const rows=ART[k],c=document.createElement('canvas'),x=c.getContext('2d');
  c.width=rows[0].length;c.height=rows.length;
  rows.forEach((r,j)=>[...r].forEach((ch,i)=>{if(PAL[ch]){x.fillStyle=PAL[ch];x.fillRect(i,j,1,1)}}));
  S[k]=c;
  const im=new Image();im.onload=()=>{S[k]=im};im.src='assets/'+k+'.png'; // optional override
}
function spr(n,x,y,flip){
  const s=S[n];ctx.save();ctx.translate(Math.round(x),Math.round(y));
  if(flip)ctx.scale(-1,1);
  ctx.drawImage(s,Math.round(-s.width/2),Math.round(-s.height/2));ctx.restore();
}

/* ---------- DATA ---------- */
const ET={
 minnow:{hp:12,spd:50,dmg:8,r:5,xp:1},
 jelly:{hp:50,spd:24,dmg:14,r:6,xp:4},
 urchin:{hp:30,spd:18,dmg:10,r:6,xp:3,shoot:2.2}
};
const UPG=[
 {id:'mantis',n:'Mantis Shrimp Punch',max:5,d:'+30% damage and +8% chance to land a x3 crit.'},
 {id:'pistol',n:'Pistol Shrimp Snap',max:3,d:'+1 projectile per shot.'},
 {id:'frog',n:'Frogfish Lunge',max:5,d:'SPACE: lunge toward your cursor, hitting hard. Levels cut cooldown and add damage.'},
 {id:'claw',n:'Lobster Claws',max:5,d:'+1 orbiting claw that pinches nearby enemies.'},
 {id:'shell',n:'Nautilus Shell',max:5,d:'+25 max HP, heal 25, take 7% less damage.'},
 {id:'gills',n:'Efficient Gills',max:5,d:'Reload faster and regenerate 0.5 HP/sec.'},
 {id:'tuna',n:'Tuna Fins',max:4,d:'+12% swim speed.'},
 {id:'sword',n:'Swordfish Bill',max:3,d:'Bullets pierce one more enemy.'},
 {id:'angler',n:'Anglerfish Lure',max:4,d:'Pull in XP from farther away and gain +15% XP.'},
 {id:'eel',n:'Electric Eel',max:5,d:'Periodic chain lightning strikes nearby enemies.'}
];

/* ---------- STATE ---------- */
const keys={},mouse={x:W/2,y:H/2,down:false};
let g,lv,p,E,B,EB,G,FX,running=false;const s={};
const fmt=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

function reset(){
  lv={};E=[];B=[];EB=[];G=[];FX=[];
  g={t:0,kills:0,lvl:1,xp:0,need:5,spawn:1,over:false,paused:false,shake:0};
  p={x:0,y:0,hp:100,mhp:100,ammo:8,mag:8,rel:0,cd:0,inv:0,lunge:0,lcd:0,lx:0,ly:0,lhit:new Set(),face:1,ang:0,zap:0,clawA:0};
  recalc();p.hp=p.mhp;
}
function recalc(){
  const L=i=>lv[i]||0;
  s.dmg=10*(1+.3*L('mantis'));s.crit=.08*L('mantis');s.shots=1+L('pistol');
  p.mhp=100+25*L('shell');s.armor=Math.min(.5,.07*L('shell'));
  s.rel=1.3*Math.pow(.82,L('gills'));s.regen=.5*L('gills');
  s.spd=70*(1+.12*L('tuna'));s.pierce=L('sword');
  s.pick=24+22*L('angler');s.xpm=1+.15*L('angler');
  s.lcd=L('frog')?4.2-.6*L('frog'):0;s.ldmg=30+20*L('frog');
  s.claws=L('claw');s.eel=L('eel');
}

/* ---------- INPUT ---------- */
addEventListener('keydown',e=>{
  keys[e.code]=true;
  if(e.code==='Space')e.preventDefault();
  if(e.code==='KeyR'&&running&&!p.rel&&p.ammo<p.mag)p.rel=s.rel;
  if(g.paused&&/^[1-3]$/.test(e.key))$('cards').children[+e.key-1]?.click();
});
addEventListener('keyup',e=>{keys[e.code]=false});
cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*W;mouse.y=(e.clientY-r.top)/r.height*H});
cv.addEventListener('mousedown',()=>{mouse.down=true});
addEventListener('mouseup',()=>{mouse.down=false});
cv.addEventListener('contextmenu',e=>e.preventDefault());
$('btnStart').onclick=()=>{running=true;$('start').classList.remove('on')};
$('btnRetry').onclick=()=>{reset();$('over').classList.remove('on')};

/* ---------- LOGIC ---------- */
function shoot(){
  const n=s.shots;
  for(let i=0;i<n;i++){
    const a=p.ang+(i-(n-1)/2)*.14+(Math.random()-.5)*.05,c=Math.random()<s.crit;
    B.push({x:p.x,y:p.y,vx:Math.cos(a)*230,vy:Math.sin(a)*230,life:.8,d:s.dmg*(c?3:1),c,pr:s.pierce,hit:[]});
  }
  p.ammo--;p.cd=.22;
  if(p.ammo<=0)p.rel=s.rel;
}
function hurt(e,d,c){
  e.hp-=d;e.fl=.08;
  if(FX.length<120)FX.push({k:'n',x:e.x,y:e.y-6,t:.5,s:Math.round(d),c});
  if(e.hp<=0&&!e.dead){e.dead=true;g.kills++;G.push({x:e.x,y:e.y,v:ET[e.type].xp})}
}
function hurtPlayer(d){
  if(p.inv>0||p.lunge>0)return;
  p.hp-=d*(1-s.armor);p.inv=.5;g.shake=.2;
  if(p.hp<=0){
    g.over=true;
    $('overText').innerHTML='Survived '+fmt(g.t)+'<br>Level '+g.lvl+' &middot; '+g.kills+' kills';
    $('over').classList.add('on');
  }
}
function spawnEnemy(){
  const a=Math.random()*6.283,d=Math.hypot(W,H)/2+20,r=Math.random();
  let type='minnow';
  if(g.t>90&&r<.2)type='urchin';else if(g.t>30&&r<.45)type='jelly';
  const hp=ET[type].hp*(1+g.t/100);
  E.push({type,x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d,hp,fl:0,cl:0,kx:0,ky:0});
}
function openLevelUp(){
  const picks=UPG.filter(u=>(lv[u.id]||0)<u.max).sort(()=>Math.random()-.5).slice(0,3);
  if(!picks.length){p.hp=p.mhp;return}
  g.paused=true;
  const box=$('cards');box.innerHTML='';
  picks.forEach(u=>{
    const c=document.createElement('button');c.className='card';
    c.innerHTML='<b>'+u.n+'</b><i>Level '+((lv[u.id]||0)+1)+' of '+u.max+'</i><span>'+u.d+'</span>';
    c.onclick=()=>{
      lv[u.id]=(lv[u.id]||0)+1;recalc();
      if(u.id==='shell')p.hp=Math.min(p.mhp,p.hp+25);
      $('lvl').classList.remove('on');g.paused=false;
    };
    box.appendChild(c);
  });
  $('lvl').classList.add('on');box.firstChild.focus();
}

function update(dt){
  if(g.xp>=g.need){g.xp-=g.need;g.lvl++;g.need=Math.floor(g.need*1.25+3);openLevelUp();return}
  g.t+=dt;g.shake-=dt;
  const mx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),
        my=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0),m=Math.hypot(mx,my)||1;
  p.ang=Math.atan2(mouse.y-H/2,mouse.x-W/2);p.face=Math.cos(p.ang)<0?-1:1;
  if(p.lunge>0){p.lunge-=dt;p.x+=p.lx*dt;p.y+=p.ly*dt}
  else{p.x+=mx/m*s.spd*dt;p.y+=my/m*s.spd*dt}
  p.lcd-=dt;p.inv-=dt;p.cd-=dt;
  if(keys.Space&&s.lcd&&p.lcd<=0){p.lunge=.16;p.lcd=s.lcd;p.lx=Math.cos(p.ang)*420;p.ly=Math.sin(p.ang)*420;p.lhit=new Set()}
  if(p.rel>0){p.rel-=dt;if(p.rel<=0){p.rel=0;p.ammo=p.mag}}
  if(mouse.down&&p.cd<=0&&!p.rel&&p.ammo>0&&p.lunge<=0)shoot();
  p.hp=Math.min(p.mhp,p.hp+s.regen*dt);

  g.spawn-=dt;
  if(g.spawn<=0){
    g.spawn=Math.max(.15,1.2/(1+g.t/45));   // spawn rate keeps climbing, no cap on time
    const n=1+Math.floor(g.t/240);
    for(let i=0;i<n&&E.length<350;i++)spawnEnemy();
  }

  for(const e of E){
    const T=ET[e.type],dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d,sp=T.spd*(1+Math.min(g.t/600,.5));
    if(T.shoot){
      const dir=d>110?1:d<70?-1:0;e.x+=ux*sp*dir*dt;e.y+=uy*sp*dir*dt;
      e.sh=(e.sh===undefined?T.shoot:e.sh)-dt;
      if(e.sh<=0&&d<200){e.sh=T.shoot;EB.push({x:e.x,y:e.y,vx:ux*80,vy:uy*80,life:4})}
    }else{e.x+=ux*sp*dt;e.y+=uy*sp*dt}
    e.x+=e.kx*dt;e.y+=e.ky*dt;const f=Math.pow(.01,dt);e.kx*=f;e.ky*=f;
    e.fl-=dt;e.cl-=dt;
    if(d<T.r+6)hurtPlayer(T.dmg);
    if(p.lunge>0&&d<T.r+9&&!p.lhit.has(e)){p.lhit.add(e);hurt(e,s.ldmg)}
    if(d>450)e.dead=true;
  }

  p.clawA+=dt*3.2;
  for(let i=0;i<s.claws;i++){
    const a=p.clawA+i*6.283/s.claws,cx=p.x+Math.cos(a)*26,cy=p.y+Math.sin(a)*26;
    for(const e of E)if(!e.dead&&e.cl<=0&&Math.hypot(e.x-cx,e.y-cy)<ET[e.type].r+5){
      hurt(e,14);e.cl=.35;e.kx+=Math.cos(a)*120;e.ky+=Math.sin(a)*120;
    }
  }

  if(s.eel){
    p.zap-=dt;
    if(p.zap<=0){
      p.zap=3.4-.4*s.eel;
      const near=E.filter(e=>!e.dead&&dist(e,p)<110).sort((a,b)=>dist(a,p)-dist(b,p)).slice(0,2+s.eel);
      let px=p.x,py=p.y;
      for(const e of near){hurt(e,18+8*s.eel);FX.push({k:'z',x1:px,y1:py,x2:e.x,y2:e.y,t:.12});px=e.x;py=e.y}
    }
  }

  for(const b of B){
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    for(const e of E){
      if(e.dead||b.hit.includes(e))continue;
      const r=ET[e.type].r+2;
      if((e.x-b.x)**2+(e.y-b.y)**2<r*r){
        hurt(e,b.d,b.c);b.hit.push(e);e.kx+=b.vx*.2;e.ky+=b.vy*.2;
        if(b.pr--<=0){b.life=0;break}
      }
    }
  }
  for(const b of EB){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.hypot(b.x-p.x,b.y-p.y)<5){hurtPlayer(8);b.life=0}}

  for(const q of G){
    const d=dist(q,p);
    if(d<s.pick){q.x+=(p.x-q.x)/d*150*dt;q.y+=(p.y-q.y)/d*150*dt}
    if(d<5){g.xp+=q.v*s.xpm;q.got=true}
  }
  for(const f of FX){f.t-=dt;if(f.k==='n')f.y-=20*dt}

  E=E.filter(e=>!e.dead);B=B.filter(b=>b.life>0);EB=EB.filter(b=>b.life>0);G=G.filter(q=>!q.got);FX=FX.filter(f=>f.t>0);
}

/* ---------- RENDER ---------- */
const hash=(i,j)=>{let h=Math.imul(i,374761393)+Math.imul(j,668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return(h^(h>>>16))>>>0};
function txt(t,x,y,c,al){ctx.font='bold 8px monospace';ctx.textAlign=al||'left';ctx.fillStyle='#000';ctx.fillText(t,x+1,y+1);ctx.fillStyle=c||'#fff';ctx.fillText(t,x,y)}

function draw(){
  const cx=Math.round(p.x-W/2),cy=Math.round(p.y-H/2),sh=g.shake>0?(Math.random()-.5)*4:0,T=16;
  ctx.save();ctx.translate(sh-cx,sh-cy);
  ctx.fillStyle='#14506b';ctx.fillRect(cx-8,cy-8,W+16,H+16);
  for(let j=Math.floor(cy/T);j<=(cy+H)/T;j++)for(let i=Math.floor(cx/T);i<=(cx+W)/T;i++){
    const h=hash(i,j),x=i*T,y=j*T;
    if(h%3===0){ctx.fillStyle='#185a78';ctx.fillRect(x,y,T,T)}
    if((h>>>4)%19===0){ctx.fillStyle='#2e8f6b';ctx.fillRect(x+6,y+4,2,8);ctx.fillRect(x+9,y+7,2,5)}
    else if((h>>>8)%31===1){ctx.fillStyle='#ff7aa2';ctx.fillRect(x+5,y+9,6,3);ctx.fillRect(x+7,y+6,2,3)}
    else if((h>>>12)%13===2){ctx.fillStyle='#4aa3c4';ctx.fillRect(x+8,y+8,1,1)}
  }
  for(const q of G)spr('gem',q.x,q.y+Math.sin(g.t*4+q.x)*1.5);
  for(const e of E){ctx.globalAlpha=e.fl>0?.45:1;spr(e.type,e.x,e.y,e.type==='minnow'&&p.x>e.x);ctx.globalAlpha=1}
  for(let i=0;i<s.claws;i++){const a=p.clawA+i*6.283/s.claws;spr('claw',p.x+Math.cos(a)*26,p.y+Math.sin(a)*26)}
  for(const b of B){ctx.fillStyle=b.c?'#ffd23f':'#e8fbff';ctx.fillRect(Math.round(b.x)-1,Math.round(b.y)-1,3,3)}
  for(const b of EB){ctx.fillStyle='#c77dff';ctx.fillRect(Math.round(b.x)-1,Math.round(b.y)-1,3,3)}
  if(!(p.inv>0&&Math.floor(g.t*20)%2)){ctx.globalAlpha=p.lunge>0?.6:1;spr('player',p.x,p.y,p.face>0);ctx.globalAlpha=1}
  if(p.rel>0){ctx.fillStyle='#000';ctx.fillRect(p.x-8,p.y+9,16,3);ctx.fillStyle='#ffd23f';ctx.fillRect(p.x-8,p.y+9,16*(1-p.rel/s.rel),3)}
  for(const f of FX){
    if(f.k==='z'){
      ctx.strokeStyle='#fff36b';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(f.x1,f.y1);
      ctx.lineTo((f.x1+f.x2)/2+(Math.random()-.5)*10,(f.y1+f.y2)/2+(Math.random()-.5)*10);ctx.lineTo(f.x2,f.y2);ctx.stroke();
    }else txt(f.s,f.x,f.y,f.c?'#ffd23f':'#fff','center');
  }
  ctx.restore();

  // HUD
  ctx.fillStyle='#000';ctx.fillRect(5,5,82,8);ctx.fillStyle='#e5484d';ctx.fillRect(6,6,80*Math.max(0,p.hp/p.mhp),6);
  txt(Math.ceil(p.hp)+'/'+p.mhp,92,12);
  txt(fmt(g.t),W/2,12,'#fff','center');
  txt('LV '+g.lvl+'   KILLS '+g.kills,W-6,12,'#fff','right');
  for(let i=0;i<p.mag;i++){ctx.fillStyle=i<p.ammo?'#ffd23f':'#443c2a';ctx.fillRect(6+i*5,H-18,3,7)}
  if(p.rel>0)txt('RELOADING',50,H-11,'#ffd23f');
  if(s.lcd)txt(p.lcd<=0?'LUNGE READY':'LUNGE '+p.lcd.toFixed(1),W-6,H-10,p.lcd<=0?'#46e0a0':'#7a8a94','right');
  ctx.fillStyle='#000';ctx.fillRect(0,H-4,W,4);ctx.fillStyle='#4cc9f0';ctx.fillRect(0,H-4,W*Math.min(1,g.xp/g.need),4);
  // crosshair
  ctx.fillStyle='#fff';const mx=Math.round(mouse.x),my=Math.round(mouse.y);
  ctx.fillRect(mx-4,my,3,1);ctx.fillRect(mx+2,my,3,1);ctx.fillRect(mx,my-4,1,3);ctx.fillRect(mx,my+2,1,3);
}

reset();
let last=performance.now();
(function loop(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(running&&!g.paused&&!g.over)update(dt);
  draw();requestAnimationFrame(loop);
})(last);
})();
