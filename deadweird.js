'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const loading=document.getElementById('loading'),fill=document.getElementById('loadFill'),loadText=document.getElementById('loadText');
const title=document.getElementById('titleScreen'),hud=document.getElementById('hud'),mobile=document.getElementById('mobile');
const DPR=()=>Math.min(2,window.devicePixelRatio||1); let W=innerWidth,H=innerHeight;
const img={}; const sounds={};
const ASSETS={
  zombie_tp:'assets/sprites/zombie_tp.png', zombie_fp:'assets/sprites/zombie_fp.png',
  player_tp:'assets/sprites/player_tp.png', player_fp:'assets/sprites/player_fp.png',
  cow_tp:'assets/sprites/cow_tp.png', cow_fp:'assets/sprites/cow_fp.png',
  clown_tp:'assets/sprites/clown_tp.png', clown_fp:'assets/sprites/clown_fp.png',
  boss_tp:'assets/sprites/boss_tp.png', boss_fp:'assets/sprites/boss_fp.png',
  ufo_tp:'assets/sprites/ufo_tp.png', ufo_fp:'assets/sprites/ufo_fp.png'
};
const MUSIC={normal:'assets/sounds/normal.mp3',title:'assets/sounds/title.mp3',boss:'assets/sounds/boss.ogg',clown:'assets/sounds/clown.mp3'};
let audioCtx=null,music={el:null,key:null};
function resize(){W=innerWidth;H=innerHeight;canvas.width=W*DPR();canvas.height=H*DPR();ctx.setTransform(DPR(),0,0,DPR(),0,0)} addEventListener('resize',resize);resize();
const assetState={loaded:0,total:Object.keys(ASSETS).length,failed:[],ready:false};
function loadImage(k,src,timeout=12000){
  return new Promise(resolve=>{
    const im=new Image();
    let settled=false;
    const finish=(ok)=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      if(ok){img[k]=im;assetState.loaded++;}
      else assetState.failed.push(`${k} (${src})`);
      resolve(ok);
    };
    const timer=setTimeout(()=>finish(false),timeout);
    im.onload=()=>finish(true);
    im.onerror=()=>finish(false);
    im.src=src;
  });
}
function showBootError(message){
  const box=document.getElementById('bootError');
  if(box){box.textContent=message;box.classList.remove('hidden');}
}
function clearBootError(){
  const box=document.getElementById('bootError');
  if(box)box.classList.add('hidden');
}
function startAudio(){try{if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();}catch(e){}}
function musicKey(key){
  if(!musicOn && typeof musicOn!=='undefined')return;
  if(!MUSIC[key])return;
  startAudio();
  if(music.key===key && music.el && !music.el.paused)return;
  if(music.el){music.el.pause();music.el.currentTime=0;}
  const a=new Audio();
  a.src=encodeURI(MUSIC[key]); a.loop=true; a.volume=.34; a.preload='auto';
  a.addEventListener('error',()=>{music={el:null,key:null};});
  music={el:a,key};
  const p=a.play();
  if(p&&p.catch)p.catch(()=>{music.key=null;});
}

async function preload(){
  loading.style.display='flex';
  clearBootError();
  fill.style.width='0%';
  loadText.textContent='0%';
  const entries=Object.entries(ASSETS);
  const results=[];
  for(const [k,v] of entries){
    results.push(await loadImage(k,v));
    const done=assetState.loaded+assetState.failed.length;
    fill.style.width=(done/entries.length*100)+'%';
    loadText.textContent=Math.round(done/entries.length*100)+'%';
  }
  assetState.ready=assetState.failed.length===0;
  if(assetState.failed.length){
    showBootError('Some graphics failed to load: '+assetState.failed.join(', ')+' — gameplay can still start, but those actors may be invisible.');
  }
  loading.style.display='none';
  return true;
}
const G={running:false,over:false,wave:1,score:0,kills:0,hp:100,maxHp:100,x:0,y:0,angle:0,shootCd:0,reload:0,ammo:12,mag:12,weapon:0,autoAim:true,view:'tp',shake:0,event:null,eventT:0,eventCooldown:0,disco:false,combo:0,comboT:0,zombies:[],bullets:[],particles:[],decals:[],cows:[],clowns:[],ufo:null,boss:null,spawnT:0,stepT:0,attackT:0,attackType:'shoot'};
const WEAPONS=[{name:'Pistol',ammo:12,rate:170,dmg:26,pellets:1,spread:.02,reload:900},{name:'Duck Gun',ammo:8,rate:520,dmg:18,pellets:5,spread:.26,reload:1200},{name:'Pizza Cannon',ammo:5,rate:850,dmg:80,pellets:1,spread:0,reload:1500,explosive:true},{name:'Guitar Maxe',ammo:3,rate:1100,dmg:999,pellets:1,spread:0,reload:1800,shock:true}];
function reset(){Object.assign(G,{running:true,over:false,wave:1,score:0,kills:0,hp:100,x:W*.5,y:H*.55,angle:0,shootCd:0,reload:0,ammo:12,weapon:0,event:null,eventT:0,eventCooldown:12,disco:false,combo:0,comboT:0,zombies:[],bullets:[],particles:[],decals:[],cows:[],clowns:[],ufo:null,boss:null,spawnT:0,attackT:0,attackType:'shoot'}); title.classList.add('hidden');hud.style.display='block';musicKey('normal');startWave(1)}
function startWave(n){G.wave=n;G.spawnT=0;G.eventCooldown=12;G.zombies.length=0;G.cows.length=0;G.clowns.length=0;G.boss=null;for(let i=0;i<Math.min(5+n*2,38);i++)spawnZombie();if(n%5===0)spawnBoss();updateHUD()}

/* DEAD WEIRD recurring Pizza Delivery / Zombie Hotline framework.
   The character art can be dropped into assets/sprites later without changing gameplay logic. */
const ZOMBIE_HOTLINE=[
  "I'm sorry I tried to eat you. I was having a difficult day.",
  "Have you ever wondered if brains are just emotionally complicated soup?",
  "I apologize for chasing you. It's nothing personal. It's actually very personal.",
  "Before I kill you, could we discuss the meaning of existence?",
  "I used to have dreams. Now I mostly have cravings.",
  "I'm sorry about the screaming. I'm still adjusting to being undead.",
  "Do you think zombies have souls?",
  "I think I had a soul once. I misplaced it.",
  "Please don't shoot me. I'm working through some things.",
  "I apologize for biting you yesterday.",
  "Yesterday was a mistake.",
  "Actually, today might also be a mistake.",
  "Do you ever feel like you're running in circles?",
  "I'm literally running in circles right now.",
  "I don't know why I'm chasing you.",
  "My therapist says I need to let things go.",
  "Unfortunately, my arms fell off.",
  "Do you believe in an afterlife?",
  "Because I'm starting to think this is it.",
  "Have you seen my cow?",
  "Never mind. That's not my cow.",
  "Is murder still murder if you're already dead?",
  "Could you stop shooting while I'm talking?",
  "Thank you.",
  "Okay, now you can shoot.",
  "I have reconsidered.",
  "RUN."
];
const LATE_HOTLINE=[
  "Oh. It's you again.",
  "You made it this far?",
  "Honestly, I'm impressed.",
  "We're going to need more zombies.",
  "I was told you were difficult.",
  "Wave after wave and you still haven't learned anything."
];
function hotlineLine(){
  const pool=G.wave>=150?LATE_HOTLINE:ZOMBIE_HOTLINE;
  return pool[Math.floor(Math.random()*pool.length)];
}
function showHotline(text){
  let box=document.getElementById('hotline');
  if(!box){
    box=document.createElement('div');
    box.id='hotline';
    document.body.appendChild(box);
  }
  box.textContent='📞 '+text;
  box.classList.add('show');
  clearTimeout(showHotline.t);
  showHotline.t=setTimeout(()=>box.classList.remove('show'),4200);
}
function maybeHotline(){
  if(!G.running||G.over||Math.random()>0.035)return;
  showHotline(hotlineLine());
}

function spawnZombie(){const a=Math.random()*Math.PI*2,d=Math.max(W,H)*.65+Math.random()*400;G.zombies.push({x:G.x+Math.cos(a)*d,y:G.y+Math.sin(a)*d,hp:50+G.wave*2,speed:35+Math.random()*20+G.wave*.7,r:25,frame:0,t:0,dead:false,hitT:0})}
function spawnCow(){const a=Math.random()*Math.PI*2,d=Math.max(W,H)*.8;G.cows.push({x:G.x+Math.cos(a)*d,y:G.y+Math.sin(a)*d,hp:80+G.wave*3,speed:120+G.wave*.6,r:30,t:0,hitT:0})}
function spawnClown(){const a=Math.random()*Math.PI*2,d=Math.max(W,H)*.7;G.clowns.push({x:G.x+Math.cos(a)*d,y:G.y+Math.sin(a)*d,hp:100+G.wave*3,speed:75+G.wave,r:28,t:0,hitT:0})}
function spawnBoss(){G.boss={x:G.x+(Math.random()<.5?-1:1)*Math.max(W,H)*.6,y:G.y-Math.max(W,H)*.5,hp:1000+G.wave*100,max:1000+G.wave*100,r:65,speed:35,t:0,hitT:0};G.event='BOSS';G.eventT=10;musicKey('boss');}
function beginEvent(type){G.event=type;G.eventT=8;G.eventCooldown=30;const map={UFO:'ufo',BOSS:'boss',CLOWN:'clown',DISCO:'normal'};if(map[type])musicKey(map[type]); if(type==='COW')for(let i=0;i<Math.min(5+G.wave,20);i++)spawnCow();if(type==='CLOWN')for(let i=0;i<Math.min(4+Math.floor(G.wave/3),14);i++)spawnClown();if(type==='UFO')G.ufo={x:G.x,y:G.y-300,r:55,t:0,hitT:0,hp:300+G.wave*20};if(type==='DISCO'){G.disco=true;G.eventT=12;musicKey('normal')}if(type==='COW')G.eventT=9;}
function endEvent(){if(G.event==='UFO'||G.event==='BOSS'||G.event==='CLOWN')musicKey('normal');G.event=null;G.disco=false}
function pickEvent(){const a=['COW','CLOWN','UFO','DISCO'];beginEvent(a[Math.floor(Math.random()*a.length)])}
function fire(){G.attackT=.28;G.attackType='shoot';if(!G.running||G.over||G.reload>0||G.shootCd>0)return;const w=WEAPONS[G.weapon];if(G.ammo<=0){startReload();return}G.ammo--;G.shootCd=w.rate;startAudio();for(let i=0;i<w.pellets;i++){let a=G.angle+(Math.random()-.5)*w.spread;G.bullets.push({x:G.x,y:G.y,vx:Math.cos(a)*760,vy:Math.sin(a)*760,dmg:w.dmg,life:1.2,explosive:w.explosive,shock:w.shock})}G.shake=w.explosive?12:w.shock?16:3;vibrate(w.explosive?100:w.shock?140:25);burst(G.x+Math.cos(G.angle)*28,G.y+Math.sin(G.angle)*28,w.explosive?'#ff8a00':'#fff',w.explosive?18:6);if(G.ammo===0)startReload();updateHUD()}
function startReload(){if(G.reload>0||G.ammo===G.mag)return;G.attackType='reload';G.reload=WEAPONS[G.weapon].reload;document.getElementById('reload').style.display='block';}
function melee(){if(G._melee)return;G._melee=true;setTimeout(()=>G._melee=false,350);G.shake=5;vibrate(45);const a=G.angle;for(const e of allEnemies()){const dx=e.x-G.x,dy=e.y-G.y,d=Math.hypot(dx,dy),ad=Math.atan2(dy,dx)-a;if(d<85&&Math.abs(Math.atan2(Math.sin(ad),Math.cos(ad)))<.8)damage(e,90)}burst(G.x+Math.cos(a)*55,G.y+Math.sin(a)*55,'#ff3344',10)}
function allEnemies(){return [...G.zombies,...G.cows,...G.clowns,...(G.boss?[G.boss]:[]),...(G.ufo?[G.ufo]:[])]}
function damage(e,dmg){if(e.hp<=0)return;e.hitT=.16;e.hp-=dmg;burst(e.x,e.y,'#ff3158',8);if(e.hp<=0){G.kills++;G.score+=100+G.wave*5;G.combo++;G.comboT=2.5;G.decals.push({x:e.x,y:e.y,t:8});burst(e.x,e.y,G.disco?'#ff3cff':'#d21f3c',G.disco?20:10);if(G.disco)burst(e.x,e.y,'#00eaff',14);if(e===G.boss){G.score+=1000;G.boss=null;musicKey('normal')}if(e===G.ufo){G.score+=500*G.wave;G.ufo=null;musicKey('normal')}}}
function burst(x,y,c,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=40+Math.random()*180;G.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t:.4,c,r:2+Math.random()*5})}}
function hurt(d){G.hp-=d;G.shake=8;vibrate(60);if(G.hp<=0)gameOver()}
function update(dt){if(!G.running||G.over)return;maybeHotline();G.shake=Math.max(0,G.shake-dt*20);G.attackT=Math.max(0,G.attackT-dt);for(const e of allEnemies())if(e.hitT>0)e.hitT=Math.max(0,e.hitT-dt);if(G.shootCd>0)G.shootCd-=dt*1000;if(G.reload>0){G.reload-=dt*1000;if(G.reload<=0){G.reload=0;G.ammo=WEAPONS[G.weapon].ammo;document.getElementById('reload').style.display='none'}}if(G.comboT>0){G.comboT-=dt;if(G.comboT<=0)G.combo=0}G.eventCooldown-=dt;if(G.eventCooldown<=0&&!G.event){pickEvent()}
let mx=0,my=0;if(keys.w)my--;if(keys.s)my++;if(keys.a)mx--;if(keys.d)mx++;if(joy.x||joy.y){mx=joy.x;my=joy.y}const len=Math.hypot(mx,my);if(len>0){mx/=Math.max(1,len);my/=Math.max(1,len);const sp=260*(len>.7?1.2:1);G.x+=mx*sp*dt;G.y+=my*sp*dt}G.x=Math.max(25,Math.min(W-25,G.x));G.y=Math.max(25,Math.min(H-25,G.y));if(G.autoAim){let b=null,bd=Infinity;for(const e of allEnemies()){if(e.hp<=0)continue;const d=Math.hypot(e.x-G.x,e.y-G.y);if(d<bd){bd=d;b=e}}if(b&&bd<500){const target=Math.atan2(b.y-G.y,b.x-G.x);G.angle=lerpAngle(G.angle,target,.08)}}
for(const z of G.zombies)moveEnemy(z,dt,45);for(const c of G.cows)moveEnemy(c,dt,c.speed);for(const c of G.clowns)moveEnemy(c,dt,c.speed);if(G.boss)moveEnemy(G.boss,dt,G.boss.speed);if(G.ufo){G.ufo.t+=dt;G.ufo.x=G.x+Math.cos(G.ufo.t*.7)*260;G.ufo.y=G.y-220+Math.sin(G.ufo.t)*80;if(Math.sin(G.ufo.t*2)>.96)hurt(8*dt)}
G.zombies=G.zombies.filter(e=>e.hp>0);G.cows=G.cows.filter(e=>e.hp>0);G.clowns=G.clowns.filter(e=>e.hp>0);for(const b of G.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;for(const e of allEnemies()){if(e.hp>0&&Math.hypot(e.x-b.x,e.y-b.y)<e.r){damage(e,b.dmg);if(b.explosive){for(const q of allEnemies())if(Math.hypot(q.x-b.x,q.y-b.y)<110)damage(q,b.dmg*.7);burst(b.x,b.y,'#ff9b00',30)}if(!b.shock){b.life=0;break}}}}G.bullets=G.bullets.filter(b=>b.life>0);for(const p of G.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.t-=dt}G.particles=G.particles.filter(p=>p.t>0);
for(const e of allEnemies()){if(e.hp>0&&Math.hypot(e.x-G.x,e.y-G.y)<e.r+18)hurt((e===G.cows?8:18)*dt)}
G.spawnT-=dt;if(G.spawnT<=0){G.spawnT=Math.max(.18,1.2-G.wave*.012);for(let i=0;i<1+Math.floor(G.wave/12);i++)spawnZombie()}if(G.wave>0&&G.kills>0&&G.kills%Math.max(10,Math.floor(20+G.wave*.5))===0){if(G.zombies.length<10+G.wave*.4)startWave(G.wave+1)}if(G.eventT>0){G.eventT-=dt;if(G.eventT<=0)endEvent()}updateHUD()}
function moveEnemy(e,dt,sp){const a=Math.atan2(G.y-e.y,G.x-e.x);e.x+=Math.cos(a)*sp*dt;e.y+=Math.sin(a)*sp*dt;e.t+=dt}
function lerpAngle(a,b,t){let d=Math.atan2(Math.sin(b-a),Math.cos(b-a));return a+d*t}function vibrate(ms){try{navigator.vibrate?.(ms)}catch(e){}}
function updateHUD(){document.getElementById('score').textContent='SCORE '+G.score.toLocaleString();document.getElementById('wave').textContent='WAVE '+G.wave;document.getElementById('hp').textContent='♥ '+Math.max(0,Math.ceil(G.hp));const w=WEAPONS[G.weapon];document.getElementById('ammo').textContent='🔫 '+G.ammo+' / '+w.ammo;const ev=document.getElementById('event');ev.textContent=G.event?({'DISCO':'🪩 DISCO FEVER','COW':'🐄 ZOMBIE COW STAMPEDE','CLOWN':'🤡 KILLER CLOWN NIGHT','UFO':'🛸 UFO INVASION','BOSS':'👹 BOSS'}[G.event]||''):'';ev.className=G.event==='DISCO'?'event-disco':'event-'+(G.event||'').toLowerCase();if(G.reload>0)document.getElementById('reloadFill').style.width=(100-G.reload/WEAPONS[G.weapon].reload*100)+'%'}
function drawSheet(im,col,row,cols,rows,x,y,w,h,flip=false){if(!im)return;const sw=im.width/cols,sh=im.height/rows;if(flip){ctx.save();ctx.translate(x+w,y);ctx.scale(-1,1);ctx.drawImage(im,col*sw,row*sh,sw,sh,0,0,w,h);ctx.restore()}else ctx.drawImage(im,col*sw,row*sh,sw,sh,x,y,w,h)}
const SHEETS={
  zombie:{tp:[8,8],fp:[8,8]}, player:{tp:[8,12],fp:[7,5]}, cow:{tp:[5,6],fp:[8,8]},
  clown:{tp:[5,5],fp:[8,8]}, boss:{tp:[5,5],fp:[8,6]}, ufo:{tp:[7,7],fp:[8,8]}
};
function sheetFor(type){const view=G.view;const im=img[type+'_'+view];const cfg=SHEETS[type]?.[view];return im&&cfg?{im,cols:cfg[0],rows:cfg[1]}:null}
function actorFrame(e,type){
  const view=G.view, cfg=SHEETS[type][view], cols=cfg[0];
  let row=0,frames=cols;
  const dist=Math.hypot(G.x-e.x,G.y-e.y);
  if(e.hitT>0){
    if(type==='zombie') row=5; else if(type==='cow') row=4; else if(type==='clown') row=2; else if(type==='boss') row=view==='tp'?3:4; else if(type==='ufo') row=5;
  } else if(type==='zombie'){row=dist<55?3:(dist<150?2:1);}
  else if(type==='cow'){row=dist<90?(Math.floor(e.t*8)%3)+3:(dist<220?2:1);}
  else if(type==='clown'){row=dist<95?(Math.floor(e.t*9)%2)+2:1;}
  else if(type==='boss'){row=dist<120?(view==='tp'?2:2):1;}
  else if(type==='ufo'){row=dist<220?((Math.floor(e.t*8)%3)+3):1;}
  if(type==='boss'&&view==='tp'){frames=row===0?3:4;}
  if(type==='ufo'&&view==='tp')frames=7;
  if(type==='cow'&&view==='tp')frames=5;
  if(type==='clown'&&view==='tp')frames=5;
  const frame=Math.floor(e.t*(type==='ufo'?8:10))%frames;
  return {row,frame,cols};
}
function drawActor(e,type,size){const s=sheetFor(type);if(!s)return;const f=actorFrame(e,type);let flip=false;if(type==='clown'||type==='cow'||type==='zombie'){const dx=G.x-e.x;flip=dx<0&&G.view==='fp';}drawSheet(s.im,f.frame,f.row,s.cols,s.rows,e.x-size/2,e.y-size/2,size,size,flip)}
function drawFloor(){const s=48;ctx.fillStyle='#171927';ctx.fillRect(0,0,W,H);for(let x=0;x<W;x+=s)for(let y=0;y<H;y+=s){ctx.strokeStyle='#25293b';ctx.strokeRect(x,y,s,s)}for(let i=0;i<10;i++){ctx.fillStyle='rgba(0,180,255,.06)';ctx.fillRect((i*137+G.wave*5)%W,0,3,H)}}
function drawDisco(){ctx.save();const pulse=(Math.sin(performance.now()/90)+1)/2;for(let x=0;x<W;x+=48)for(let y=0;y<H;y+=48){const hue=(x/48+y/48+performance.now()/120)%3;ctx.fillStyle=hue<1?'rgba(0,180,255,'+(0.12+pulse*.22)+')':hue<2?'rgba(40,255,90,'+(0.12+pulse*.22)+')':'rgba(255,40,70,'+(0.12+pulse*.22)+')';ctx.fillRect(x,y,46,46)}ctx.translate(W/2,70);ctx.rotate(performance.now()/1800);ctx.fillStyle='#ddd';ctx.beginPath();ctx.arc(0,0,35,0,7);ctx.fill();for(let i=0;i<18;i++){ctx.fillStyle=i%3===0?'#2cf':i%3===1?'#3f5':'#f44';ctx.fillRect(Math.cos(i)*32,Math.sin(i)*32,5,5)}ctx.restore();for(let i=0;i<5;i++){const a=performance.now()/700+i*1.25;const x=W/2+Math.cos(a)*W*.65;ctx.fillStyle=i%3===0?'rgba(0,170,255,.09)':i%3===1?'rgba(50,255,100,.09)':'rgba(255,40,50,.09)';ctx.beginPath();ctx.moveTo(W/2,80);ctx.lineTo(x,H);ctx.lineTo(x+100,H);ctx.closePath();ctx.fill()}}
function drawUFO(){const s=110;const sh=sheetFor('ufo');if(sh){const f={row:Math.floor(G.ufo.t*8)%sh.rows,frame:Math.floor(G.ufo.t*10)%sh.cols};drawSheet(sh.im,f.frame,f.row,sh.cols,sh.rows,G.ufo.x-s/2,G.ufo.y-s/2,s,s)}ctx.fillStyle='rgba(90,255,220,.18)';ctx.beginPath();ctx.moveTo(G.ufo.x-38,G.ufo.y+20);ctx.lineTo(G.ufo.x+38,G.ufo.y+20);ctx.lineTo(G.ufo.x+80,G.y);ctx.lineTo(G.ufo.x-80,G.y);ctx.closePath();ctx.fill()}
function playerFrame(){const s=sheetFor('player');if(!s)return null;let row=0,frames=s.cols,flip=false;const moving=keys.w||keys.a||keys.s||keys.d||joy.x||joy.y;if(G.view==='tp'){
  let face=Math.sin(G.angle); if(Math.abs(face)<.45)row=moving?4:1; else if(face<0)row=moving?8:2; else row=moving?3:0;
  if(moving&&Math.hypot(joy.x,joy.y)<.7&&!(keys.shift))row-=0; if(G.attackT>0)row=9; if(G.reload>0)row=11; frames=8;
  flip=Math.cos(G.angle)<0 && row!==0&&row!==2&&row!==5&&row!==8;
} else {row=G.reload>0?2:(G.attackT>0?1:0);frames=7;}
 return {s,row,frames,flip,frame:Math.floor(performance.now()/90)%frames};}
function drawPlayer(){const p=playerFrame();if(!p)return;const size=G.view==='fp'?100:76;drawSheet(p.s.im,p.frame,p.row,p.s.cols,p.s.rows,G.x-size/2,G.y-size/2,size,size,p.flip);ctx.save();ctx.translate(G.x,G.y);ctx.rotate(G.angle);ctx.strokeStyle='#ddd';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(38,0);ctx.stroke();ctx.restore()}
function render(){ctx.save();let sx=(Math.random()-.5)*G.shake,sy=(Math.random()-.5)*G.shake;ctx.translate(sx,sy);ctx.fillStyle='#111321';ctx.fillRect(-sx,-sy,W,H);drawFloor();for(const d of G.decals){ctx.globalAlpha=Math.max(0,d.t/8);ctx.fillStyle='#67152a';ctx.beginPath();ctx.ellipse(d.x,d.y,25,14,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}if(G.disco)drawDisco();for(const e of G.zombies)drawActor(e,'zombie',58);for(const e of G.cows)drawActor(e,'cow',68);for(const e of G.clowns)drawActor(e,'clown',64);if(G.boss){ctx.shadowBlur=30;ctx.shadowColor='#ff204f';drawActor(G.boss,'boss',140);ctx.shadowBlur=0}if(G.ufo)drawUFO();for(const b of G.bullets){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,4,0,7);ctx.fill()}for(const p of G.particles){ctx.globalAlpha=Math.max(0,p.t/.4);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();ctx.globalAlpha=1}drawPlayer();ctx.restore();}
function gameOver(){G.over=true;G.running=false;musicKey('normal');document.getElementById('finalStats').textContent='Score '+G.score.toLocaleString()+' · Wave '+G.wave+' · Kills '+G.kills;document.getElementById('gameover').classList.remove('hidden');hud.style.display='none'}
const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='r')startReload();if(/^\d$/.test(e.key)&&+e.key>=1&&+e.key<=4){G.weapon=+e.key-1;G.mag=WEAPONS[G.weapon].ammo;G.ammo=Math.min(G.ammo,G.mag);updateHUD()}if(e.key.toLowerCase()==='v')G.view=G.view==='tp'?'fp':'tp'});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);addEventListener('mousemove',e=>{if(G.running&&!('ontouchstart' in window)){G.angle=Math.a
