const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let W=innerWidth,H=innerHeight,DPR=Math.min(devicePixelRatio||1,2);

function resize(){
  W=innerWidth; H=innerHeight; DPR=Math.min(devicePixelRatio||1,2);
  canvas.width=W*DPR; canvas.height=H*DPR; canvas.style.width=W+"px"; canvas.style.height=H+"px";
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener("resize",resize); resize();

const keys = {};
const mouse={x:W/2,y:H/2,down:false};
addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;if(e.code==="Space")e.preventDefault()});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
canvas.addEventListener("mousemove",e=>{mouse.x=e.clientX;mouse.y=e.clientY});
canvas.addEventListener("mousedown",()=>mouse.down=true);
addEventListener("mouseup",()=>mouse.down=false);

const upgrades = [
  {id:"frogfish",name:"Frogfish Lunge",desc:"Dash farther and gain +35% dash speed. Dashing damages enemies you pass through.",tag:"Antennarius"},
  {id:"mantis",name:"Mantis Shrimp Punch",desc:"Shots deal +12 damage and have a 20% chance to create a shockwave on impact.",tag:"Stomatopoda"},
  {id:"shell",name:"Nautilus Shell",desc:"+35 maximum HP and restore 35 HP immediately.",tag:"Nautilus"},
  {id:"claws",name:"Crab Claws",desc:"Your fire rate improves by 28% and shots gain +15% knockback.",tag:"Brachyura"},
  {id:"gills",name:"Shark Gills",desc:"Regenerate 0.8 HP per second and gain +10% movement speed.",tag:"Selachimorpha"},
  {id:"ink",name:"Cephalopod Ink",desc:"Every 4 seconds release a cloud that slows nearby enemies by 65% for 2.5 seconds.",tag:"Cephalopoda"},
  {id:"biolume",name:"Bioluminescence",desc:"Projectiles glow brighter, gain +25% size, and reveal a larger area.",tag:"Dinoflagellata"},
  {id:"urchin",name:"Sea Urchin Spines",desc:"Gain 8 orbiting spines that damage enemies on contact.",tag:"Echinoidea"},
  {id:"electric",name:"Electric Ray",desc:"Every 6 seconds discharge a radial electric pulse that damages nearby enemies.",tag:"Torpediniformes"},
  {id:"tardigrade",name:"Tardigrade Resilience",desc:"Take 20% less damage and become briefly invulnerable after taking damage.",tag:"Tardigrada"},
  {id:"squid",name:"Squid Propulsion",desc:"+22% movement speed and +20% projectile speed.",tag:"Teuthida"},
  {id:"whale",name:"Whale Filter",desc:"Collect XP from 35% farther away and gain +10% XP.",tag:"Mysticeti"}
];

let state;
function freshState(){
  return {
    running:false, paused:false, gameOver:false, level:1,xp:0,xpNeed:12,kills:0,time:0,
    spawnTimer:0,shootTimer:0,dashTimer:0,inkTimer:0,electricTimer:0,
    enemies:[],shots:[],particles:[],xpOrbs:[],spines:[],
    upgrades:[],upgradeCounts:{},
    player:{x:W/2,y:H/2,r:16,hp:100,maxHp:100,speed:230,damage:20,fireRate:4.2,projectileSpeed:620,shotSize:5,knockback:80,regen:0,dashSpeed:700,dashTime:0,dashCooldown:1.5,dashInvuln:0,damageReduction:0,xpMult:1,magnet:100},
    bg:[]
  };
}
state=freshState();

function resetBG(){
  state.bg=Array.from({length:180},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.7+.2,a:Math.random()*.45+.1,s:Math.random()*10+4}));
}
resetBG();

function startGame(){state=freshState();resetBG();state.running=true;document.getElementById("start-screen").classList.add("hidden");document.getElementById("gameover-screen").classList.add("hidden");}
document.getElementById("start-button").onclick=startGame;
document.getElementById("restart-button").onclick=startGame;

function addUpgrade(id){
  const u=upgrades.find(x=>x.id===id); if(!u)return;
  state.upgrades.push(u.name); state.upgradeCounts[id]=(state.upgradeCounts[id]||0)+1;
  const p=state.player;
  if(id==="frogfish"){p.dashSpeed*=1.35;p.dashCooldown=Math.max(.75,p.dashCooldown-.15)}
  if(id==="mantis"){p.damage+=12}
  if(id==="shell"){p.maxHp+=35;p.hp=Math.min(p.maxHp,p.hp+35)}
  if(id==="claws"){p.fireRate*=1.28;p.knockback+=15}
  if(id==="gills"){p.regen+=.8;p.speed*=1.1}
  if(id==="ink"){state.inkTimer=0}
  if(id==="biolume"){p.shotSize*=1.25}
  if(id==="urchin"){for(let i=0;i<2;i++)state.spines.push({a:Math.random()*Math.PI*2,r:34+state.spines.length*2})}
  if(id==="electric"){state.electricTimer=0}
  if(id==="tardigrade"){p.damageReduction=Math.min(.6,p.damageReduction+.2)}
  if(id==="squid"){p.speed*=1.22;p.projectileSpeed*=1.2}
  if(id==="whale"){p.magnet*=1.35;p.xpMult*=1.1}
}

function levelUp(){
  state.level++; state.xp-=state.xpNeed; state.xpNeed=Math.floor(state.xpNeed*1.23+5);
  state.paused=true;
  const cardBox=document.getElementById("upgrade-cards"); cardBox.innerHTML="";
  const pool=[...upgrades].sort(()=>Math.random()-.5).slice(0,4);
  pool.forEach(u=>{
    const el=document.createElement("div");el.className="upgrade-card";
    el.innerHTML=`<h3>${u.name}</h3><p>${u.desc}</p><small>${u.tag}</small>`;
    el.onclick=()=>{addUpgrade(u.id);document.getElementById("levelup-screen").classList.add("hidden");state.paused=false;};
    cardBox.appendChild(el);
  });
  document.getElementById("levelup-screen").classList.remove("hidden");
}

function spawnEnemy(){
  const side=Math.floor(Math.random()*4), margin=50;
  let x,y;
  if(side===0){x=-margin;y=Math.random()*H}else if(side===1){x=W+margin;y=Math.random()*H}else if(side===2){x=Math.random()*W;y=-margin}else{x=Math.random()*W;y=H+margin}
  const t=Math.random(), elapsed=state.time;
  let type="jelly",r=12,hp=32,speed=65,damage=9,value=2;
  if(t>.80){type="eel";r=16;hp=70+elapsed*1.4;speed=100;damage=14;value=4}
  else if(t>.62){type="crab";r=19;hp=110+elapsed*2;speed=42;damage=18;value=5}
  else if(t>.35){type="puffer";r=14;hp=48+elapsed;speed=78;damage=11;value=3}
  state.enemies.push({x,y,r,hp,maxHp:hp,speed:speed*(1+elapsed/360),damage,value,type,hit:0,slow:0});
}

function shoot(){
  const p=state.player, a=Math.atan2(mouse.y-p.y,mouse.x-p.x);
  state.shots.push({x:p.x+Math.cos(a)*20,y:p.y+Math.sin(a)*20,vx:Math.cos(a)*p.projectileSpeed,vy:Math.sin(a)*p.projectileSpeed,r:p.shotSize,life:1.5,damage:p.damage,knock:p.knockback});
}

function dash(){
  const p=state.player;if(state.dashTimer>0)return;
  let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
  let dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
  if(!dx&&!dy){dx=mouse.x-p.x;dy=mouse.y-p.y}
  const len=Math.hypot(dx,dy)||1; p.dashTime=.18;p.dashInvuln=.22;p.dashDX=dx/len;p.dashDY=dy/len;state.dashTimer=p.dashCooldown;
}

function damagePlayer(amount){
  const p=state.player;if(p.dashInvuln>0)return;
  p.hp-=amount*(1-p.damageReduction);p.dashInvuln=.35;
  for(let i=0;i<8;i++)state.particles.push({x:p.x,y:p.y,vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,life:.4,r:2});
  if(p.hp<=0){p.hp=0;state.gameOver=true;state.running=false;document.getElementById("gameover-stats").textContent=`You reached level ${state.level}, survived ${formatTime(state.time)}, and collected ${state.kills} specimens.`;document.getElementById("gameover-screen").classList.remove("hidden")}
}

function killEnemy(e){
  state.kills++;state.xpOrbs.push({x:e.x,y:e.y,value:e.value,r:5});
  for(let i=0;i<8;i++)state.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*140,vy:(Math.random()-.5)*140,life:.5,r:2+Math.random()*3});
}

function shockwave(x,y,damage,radius){
  for(const e of state.enemies){
    const d=Math.hypot(e.x-x,e.y-y);
    if(d<radius){e.hp-=damage*(1-d/radius*.5);e.slow=Math.max(e.slow,1.2);e.x+=(e.x-x)/(d||1)*60;e.y+=(e.y-y)/(d||1)*60}
  }
  for(let i=0;i<18;i++)state.particles.push({x,y,vx:Math.cos(i/18*Math.PI*2)*100,vy:Math.sin(i/18*Math.PI*2)*100,life:.45,r:3});
}

function update(dt){
  if(!state.running||state.paused||state.gameOver)return;
  const p=state.player;state.time+=dt;
  state.dashTimer=Math.max(0,state.dashTimer-dt);p.dashInvuln=Math.max(0,p.dashInvuln-dt);
  if(keys[" "]||keys.shift)dash();
  if(p.dashTime>0){p.x+=p.dashDX*p.dashSpeed*dt;p.y+=p.dashDY*p.dashSpeed*dt;p.dashTime-=dt}
  else{
    let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
    const len=Math.hypot(dx,dy)||1;if(dx||dy){p.x+=dx/len*p.speed*dt;p.y+=dy/len*p.speed*dt}
  }
  p.x=Math.max(p.r,Math.min(W-p.r,p.x));p.y=Math.max(p.r,Math.min(H-p.r,p.y));
  p.hp=Math.min(p.maxHp,p.hp+p.regen*dt);

  state.spawnTimer-=dt;
  const interval=Math.max(.08,.72-state.time*.0018);
  if(state.spawnTimer<=0){state.spawnTimer=interval;spawnEnemy();if(Math.random()<Math.min(.35,state.time/240))spawnEnemy()}
  state.shootTimer-=dt;
  if(mouse.down&&state.shootTimer<=0){shoot();state.shootTimer=1/p.fireRate}

  if(state.upgradeCounts.ink){
    state.inkTimer-=dt;if(state.inkTimer<=0){state.inkTimer=4;for(const e of state.enemies)if(Math.hypot(e.x-p.x,e.y-p.y)<150)e.slow=2.5}
  }
  if(state.upgradeCounts.electric){
    state.electricTimer-=dt;if(state.electricTimer<=0){state.electricTimer=6;shockwave(p.x,p.y,42,190)}
  }

  for(const s of state.shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt}
  state.shots=state.shots.filter(s=>s.life>0&&s.x>-50&&s.x<W+50&&s.y>-50&&s.y<H+50);

  for(const e of state.enemies){
    const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1,slow= e.slow>0?.35:1;
    e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;e.slow=Math.max(0,e.slow-dt);e.hit=Math.max(0,e.hit-dt);
    if(d<e.r+p.r){damagePlayer(e.damage*dt);e.x-=dx/d*35*dt;e.y-=dy/d*35*dt}
  }

  for(const s of state.shots){
    for(const e of state.enemies){
      if(e.hit>0)continue;
      if(Math.hypot(s.x-e.x,s.y-e.y)<s.r+e.r){
        e.hp-=s.damage;e.hit=.035;e.x+=s.vx/Math.hypot(s.vx,s.vy)*s.knock;e.y+=s.vy/Math.hypot(s.vx,s.vy)*s.knock;s.life=0;
        if(state.upgradeCounts.mantis&&Math.random()<.2)shockwave(e.x,e.y,p.damage*.75,65);
        if(e.hp<=0)killEnemy(e);
        break;
      }
    }
  }
  state.enemies=state.enemies.filter(e=>e.hp>0);

  if(state.spines.length){
    state.spines.forEach((s,i)=>{s.a+=dt*(1.7+i*.03);s.x=p.x+Math.cos(s.a)*s.r;s.y=p.y+Math.sin(s.a)*s.r});
    for(const s of state.spines)for(const e of state.enemies)if(Math.hypot(s.x-e.x,s.y-e.y)<e.r+5&&e.hit<=0){e.hp-=22;e.hit=.18;if(e.hp<=0)killEnemy(e)}
  }

  for(const o of state.xpOrbs){
    const dx=p.x-o.x,dy=p.y-o.y,d=Math.hypot(dx,dy)||1;
    if(d<p.magnet){o.x+=dx/d*(d<55?400:120)*dt;o.y+=dy/d*(d<55?400:120)*dt}
    if(d<p.r+o.r+5){p.xp+=o.value*p.xpMult;o.collected=true}
  }
  state.xpOrbs=state.xpOrbs.filter(o=>!o.collected);

  while(p.xp>=state.xpNeed)levelUp();

  for(const q of state.particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt}
  state.particles=state.particles.filter(q=>q.life>0);

  document.getElementById("hp-bar").style.width=`${p.hp/p.maxHp*100}%`;
  document.getElementById("xp-bar").style.width=`${p.xp/p.xpNeed*100}%`;
  document.getElementById("hp-text").textContent=`${Math.ceil(p.hp)}/${p.maxHp}`;
  document.getElementById("level-text").textContent=`Lv. ${state.level}`;
  document.getElementById("timer").textContent=formatTime(state.time);
  document.getElementById("kills").textContent=`Kills: ${state.kills}`;
  document.getElementById("upgrade-list").textContent=state.upgrades.length?`Traits: ${state.upgrades.slice(-3).join(" • ")}`:"Trait: None";
}

function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,"0")}:${String(Math.floor(t%60)).padStart(2,"0")}`}

function draw(){
  ctx.clearRect(0,0,W,H);
  const g=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*.75);g.addColorStop(0,"#06304a");g.addColorStop(1,"#010813");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(const b of state.bg){b.y+=b.s*.008;if(b.y>H)b.y=0;ctx.globalAlpha=b.a;ctx.fillStyle="#b9f4ff";ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;

  for(const o of state.xpOrbs){ctx.fillStyle="#70e5ff";ctx.shadowBlur=12;ctx.shadowColor="#70e5ff";ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
  for(const s of state.shots){ctx.fillStyle="#d8fbff";ctx.shadowBlur=14;ctx.shadowColor="#5de7ff";ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
  for(const e of state.enemies)drawEnemy(e);
  for(const s of state.spines){ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.a);ctx.fillStyle="#e6c97a";ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-5,3);ctx.lineTo(-3,0);ctx.lineTo(-5,-3);ctx.closePath();ctx.fill();ctx.restore()}
  for(const q of state.particles){ctx.globalAlpha=Math.max(0,q.life*2);ctx.fillStyle="#8deeff";ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;

  drawPlayer();
}
function drawPlayer(){
  const p=state.player;ctx.save();ctx.translate(p.x,p.y);
  const a=Math.atan2(mouse.y-p.y,mouse.x-p.x);ctx.rotate(a);
  ctx.shadowBlur=20;ctx.shadowColor="#53e5ff";ctx.fillStyle=p.dashInvuln>0?"#dfffff":"#62dcff";
  ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(-13,-12);ctx.lineTo(-8,0);ctx.lineTo(-13,12);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle="#062133";ctx.beginPath();ctx.arc(-2,0,7,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawEnemy(e){
  ctx.save();ctx.translate(e.x,e.y);
  ctx.globalAlpha=e.slow>0?.65:1;
  if(e.type==="jelly"){
    ctx.fillStyle="#d57cff";ctx.beginPath();ctx.arc(0,-2,e.r,Math.PI,0);ctx.lineTo(e.r,9);ctx.quadraticCurveTo(6,2,0,10);ctx.quadraticCurveTo(-6,2,-e.r,9);ctx.closePath();ctx.fill();
  }else if(e.type==="puffer"){
    ctx.fillStyle="#ff9c61";ctx.beginPath();ctx.arc(0,0,e.r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#ffd2a8";for(let i=0;i<8;i++){let a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*e.r,Math.sin(a)*e.r);ctx.lineTo(Math.cos(a)*(e.r+7),Math.sin(a)*(e.r+7));ctx.stroke()}
  }else if(e.type==="crab"){
    ctx.fillStyle="#e65e65";ctx.beginPath();ctx.ellipse(0,0,e.r,13,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#ffaaa8";ctx.lineWidth=4;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(i*8,8);ctx.lineTo(i*15,17);ctx.stroke();ctx.beginPath();ctx.moveTo(i*8,-8);ctx.lineTo(i*15,-17);ctx.stroke()}
  }else{
    ctx.fillStyle="#55c98a";ctx.beginPath();ctx.ellipse(0,0,e.r+7,8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#173c34";ctx.beginPath();ctx.arc(9,-4,2,0,Math.PI*2);ctx.fill()
  }
  ctx.globalAlpha=1;
  if(e.hp<e.maxHp){ctx.fillStyle="#122d37";ctx.fillRect(-e.r,-e.r-9,e.r*2,3);ctx.fillStyle="#ff6d76";ctx.fillRect(-e.r,-e.r-9,e.r*2*(e.hp/e.maxHp),3)}
  ctx.restore();
}

let last=performance.now();
function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(loop)}
requestAnimationFrame(loop);
