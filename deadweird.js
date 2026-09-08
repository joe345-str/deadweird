'use strict';

/* ============================================================
   DEAD WEIRD v4 — Core Init + Unlock + Menu Fix
   catfishheads.site - Joey Donner
   ============================================================ */

/* ========================= */
/*        GLOBAL STATE                    */
/* ========================= */

let G = {
  demo: true,
  fullGame: false,
  wave: 1,
};

const DPR = window.devicePixelRatio || 1;
let canvas, ctx;
const Cache = new Map();

/* ========================= */
/*      PAYMENT / UNLOCK              */
/* ========================= */

function unlockFullGame(){
  G.fullGame = true;
  G.demo = false;
  localStorage.setItem('dw_full','1');
}

function checkUnlock(){
  const params = new URLSearchParams(location.search);
  if(params.get("unlock") === "1"){
    unlockFullGame();
    showScr('unlock-confirm');
  }
}

function applyLocalUnlock(){
  if(localStorage.getItem('dw_full') === '1'){
    G.fullGame = true;
    G.demo = false;

    const fb = document.getElementById('full-btn');
    if(fb){
      fb.textContent = '✓ FULL GAME UNLOCKED';
      fb.onclick = ()=>{
        G.fullGame = true;
        G.demo = false;
        updateMenuIndicators();
        showScr('ts');
      };
    }
  }
}

/* ========================= */
/*      MENU INDICATORS               */
/* ========================= */

function updateMenuIndicators(){
  const fullInd = document.getElementById('full-indicator');
  const demoInd = document.getElementById('demo-indicator');
  const playBtn = document.querySelector('#ts .btn.btn-red');

  if(G.fullGame){
    if(fullInd) fullInd.textContent = 'FULL GAME ✔';
    if(demoInd) demoInd.textContent = '';
    if(playBtn) playBtn.textContent = '▶ PLAY FULL GAME';
  } else {
    if(fullInd) fullInd.textContent = '';
    if(demoInd) demoInd.textContent = 'DEMO · WAVES 1–3 · 🔓 UNLOCK';
  }
}

/* ========================= */
/*      GAME INIT STATE                  */
/* ========================= */

function initG(){
  G = {
    meleeTimer:0,
    meleeReady:true,
    running:false,
    demo:true,
    wave:1,
    score:0,
    kills:0,
    combo:0,
    comboTimer:0,
    weps: WEPS.map(w => Object.assign({cur:w.ammo, unlocked:false}, w)),
    P:{x:0,y:0,angle:0,hp:100,maxHp:100,inv:0,shield:0,boost:0,size:TW*.4},
    Z:[], Bullets:[], Parts:[], PUs:[], FTs:[], Deco:[],
    discoTimer:0, jazzTimer:0, staticTimer:0, bgTime:0, discoAngle:0,
    shake:0, shootT:0, reloading:false, rlProg:0, rlTimer:null,
    waveActive:false, waveDone:false, groanTimer:0, stepTimer:0,
    ufo:null, allyHP:0, pizzaDrone:null, duckRain:[], rainTimer:0, TW,
    autoAim:true,
    bloodMoonTimer:0,
    asteroidTimer:0,
    asteroids:[]
  };

  G.weps[0].unlocked = true;
  oldMap();
}

/* ========================= */
/*      DEMO / FULL GAME              */
/* ========================= */

function startDemo(){
  try{ gac(); }catch(e){}
  initG();
  G.demo = true;

  const db = document.getElementById('demo-b');
  if(db) db.style.display = 'block';

  try{ resumeMusic(); }catch(e){}
  startWave(1);
}

function startFullGame(){
  try{ gac(); }catch(e){}
  initG();
  G.demo = false;

  const db = document.getElementById('demo-b');
  if(db) db.style.display = 'none';

  try{ resumeMusic(); }catch(e){}
  startWave(1);
}

function restartGame(){
  if(G.demo) startDemo();
  else startFullGame();
}

/* ========================= */
/*      PAYMENT BUTTON                */
/* ========================= */

async function handlePayment(){
  const btn = document.getElementById('pay-btn');
  if(!btn) return;

  const orig = btn.innerHTML;
  btn.innerHTML = '⏳ Processing...';
  btn.disabled = true;

  try {
    const stripe = Stripe("pk_live_51T3YlGQ2KAmRXihJLmYNGEaInpV9pSADZN1ehb77pkNWD5zQdg0pkLKbBfg0FOBkoQ8qViw0UHiNY99NsiJ5BGZl004wAgZmzG");

    const res = await fetch("https://https://bitter-art-d1ee.catfishheadssite.workers.dev//create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();

    const result = await stripe.redirectToCheckout({
      sessionId: data.id
    });

    if(result.error){
      alert(result.error.message);
    }

  } catch (err){
    alert("Payment failed: " + err.message);
  }

  btn.innerHTML = orig;
  btn.disabled = false;
}

/* ========================= */
/*          INIT GAME                          */
/* ========================= */

async function init(){
  const loading = document.getElementById('loading');
  loading.style.display = 'block';

  await preloadAssets();            // load everything

  loading.style.display = 'none';   // hide loading

  applyLocalUnlock();               // local unlock
  checkUnlock();                    // Stripe unlock
  updateMenuIndicators();           // update UI

  // If Stripe unlock triggered, unlock-confirm is already shown
  if (!G.fullGame || location.search.indexOf("unlock=1") === -1) {
    showScr('menu');
  }
}

  // Map state+dir to frame index base
  const TPPlayer = {
  x: 100, y: 100,
  state: 'idle',   // idle, walk, attack
  dir: 0,          // 0=down, 1=left, 2=right, 3=up
  frame: 0,
  timer: 0
};

function updateTPPlayer(dt){
  TPPlayer.timer += dt;

  if(TPPlayer.timer > 120){ // ms per frame
    TPPlayer.timer = 0;

    if(TPPlayer.state === 'walk'){
      TPPlayer.frame = (TPPlayer.frame + 1) % 4; // walk cycle
    } else if(TPPlayer.state === 'attack'){
      TPPlayer.frame = (TPPlayer.frame + 1) % 3; // attack cycle
    } else {
      TPPlayer.frame = 0; // idle frame
    }
  }
}
}

function getCached(key) {
  return Cache.get(key);
}

function setCached(key, value) {
  Cache.set(key, value);
}

/* ========================= */
/*         ASSET LIST                         */
/* ========================= */

const ASSETS = {
  images: [    
 // 'player_tp.png',
    'player_fp.png',
    'zombie_tp.png',
    'zombie_fp.png',
    'clown_tp.png',
    'clown_fp.png',
    'boss_tp.png',
    'boss_fp.png',
    'ufo_tp.png',
    'ufo_fp.png',
    'cow_tp.png',
    'cow_fp.png',
    'ufo_beam_tp.png',
    'ufo_idle_tp.png'
  ],
  audio: [
    ],
  audio: [
    'Alexander_Ehlers-Great_Mission.mp3',
    'Alexander_Ehlers-Dark_Intro.ogg',
    'Alexander_Ehlers-Warped.mp3',
    'Alexander_Ehlers-Waking_the_Devil.mp3'
  ]
};
  
/* -- ASSETS -- */
const IMG = {};

function loadImageCached(src) {
  if (Cache.has(src)) return Cache.get(src);

  const img = new Image();
  img.src = src;
  Cache.set(src, img);
  return img;
}

function loadAssets(cb){
  cb();

  // Player
  IMG.playerTP = loadImageCached('player_tp.png');
  IMG.playerFP = loadImageCached('player_fp.png');

  // Zombie
  IMG.zombieTP = loadImageCached('zombie_tp.png');
  IMG.zombieFP = loadImageCached('zombie_fp.png');

  // Clown
  IMG.clownTP = loadImageCached('clown_tp.png');
  IMG.clownFP = loadImageCached('clown_fp.png');

  // Boss
  IMG.bossTP = loadImageCached('boss_tp.png');
  IMG.bossFP = loadImageCached('boss_fp.png');

  // UFO
  IMG.ufoTP = loadImageCached('ufo_tp.png');
  IMG.ufoFP = loadImageCached('ufo_fp.png');

  // Cow
  IMG.cowTP = loadImageCached('cow_tp.png');
  IMG.cowFP = loadImageCached('cow_fp.png');
}

/* ========================= */
/*        AUDIO ENGINE       */
/* ========================= */

const AudioEngine = {
  ctx: null,
  gain: null,
  sfxGain: null,
  ready: false
};

async function initAudio(){
  if(AudioEngine.ready) return;

  AudioEngine.ctx = new (window.AudioContext || window.webkitAudioContext)();

  // master music gain
  AudioEngine.gain = AudioEngine.ctx.createGain();
  AudioEngine.gain.gain.value = 0.35;
  AudioEngine.gain.connect(AudioEngine.ctx.destination);

  // SFX gain
  AudioEngine.sfxGain = AudioEngine.ctx.createGain();
  AudioEngine.sfxGain.gain.value = 0.9;
  AudioEngine.sfxGain.connect(AudioEngine.ctx.destination);

  AudioEngine.ready = true;
}

/* ========================= */
/*      LOAD + CACHE AUDIO   */
/* ========================= */

async function loadMusic(src){
  await initAudio();

  const res = await fetch(src);
  const arr = await res.arrayBuffer();
  return await AudioEngine.ctx.decodeAudioData(arr);
}

async function loadAudioCached(src){
  if(Cache.has(src)) return Cache.get(src);

  const buffer = await loadMusic(src);
  Cache.set(src, buffer);
  return buffer;
}

/* ========================= */
/*        PLAY MUSIC         */
/* ========================= */

let currentMusic = null;
let musicOn = true;

function playMusic(buffer){
  if(!buffer) return;
  initAudio();

  if(currentMusic){
    try { currentMusic.stop(); } catch(e){}
  }

  const src = AudioEngine.ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.connect(AudioEngine.gain);
  src.start();

  currentMusic = src;
}

function toggleMusic(){
  musicOn = !musicOn;
  const btn =

/* ========================= */
/*      MUSIC ROUTING        */
/* ========================= */

const TRACKS = {
  wakingDevil: Cache.get('Alexander_Ehlers-Waking_the_Devil.mp3'),
  darkIntro: Cache.get('Alexander_Ehlers-Dark_Intro.ogg'),
  warped: Cache.get('Alexander_Ehlers-Warped.mp3'),
  greatMission: Cache.get('Alexander_Ehlers-Great_Mission.mp3')
};

let musicGain = null;
let currentMusic = null;
let musicOn = true;

function initMusic(){
  if(!AudioEngine.ctx) initAudio();

  if(!musicGain){
    musicGain = AudioEngine.ctx.createGain();
    musicGain.gain.value = 0.35;
    musicGain.connect(AudioEngine.ctx.destination);
  }
}

function playMusic(buffer){
  if(!buffer) return;
  initMusic();

  if(currentMusic){
    try { currentMusic.stop(); } catch(e){}
  }

  const src = AudioEngine.ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.connect(musicGain);
  src.start();

  currentMusic = src;
}

function toggleMusic(){
  musicOn = !musicOn;
  const btn = document.getElementById('music-btn');

  if(musicOn){
    musicGain.gain.value = 0.35;
    if(btn) btn.textContent = '🎵';
  } else {
    musicGain.gain.value = 0.0;
    if(btn) btn.textContent = '🔇';
  }
}

function pauseMusic(){
  if(musicGain) musicGain.gain.value = 0.0;
}

function resumeMusic(){
  if(musicGain && musicOn) musicGain.gain.value = 0.35;
}

/* ========================= */
/*      EVENT ROUTING        */
/* ========================= */

function onWaveStart(w){
  if(w % 3 === 0){
    playMusic(TRACKS.warped);       // boss
  } else {
    playMusic(TRACKS.wakingDevil);  // normal
  }
}

function triggerUFOEvent(){
  playMusic(TRACKS.greatMission);
}

function endUFOEvent(){
  playMusic(TRACKS.wakingDevil);
}
/* ========================= */
/*        PRELOAD SYSTEM             */
/* ========================= */

async function preloadAssets(){
  const total = ASSETS.images.length + ASSETS.audio.length;
  let loaded = 0;

  const updateProgress = () => {
    loaded++;
    const pct = Math.floor((loaded / total) * 100);
    document.getElementById('load-fill').style.width = pct + '%';
    document.getElementById('load-pct').innerText = pct + '%';
  };

  const imgPromises = ASSETS.images.map(src =>
    preloadImage(src).then(updateProgress)
  );

  const audioPromises = ASSETS.audio.map(src =>
    preloadAudio(src).then(updateProgress)
  );

  await Promise.all([...imgPromises, ...audioPromises]);
}

/* ========================= */
/*      MUSIC CROSSFADE              */
/* ========================= */

let currentMusic = null;
let nextMusic = null;
let musicGainA = null;
let musicGainB = null;
let activeChannel = 0;   // 0 = A, 1 = B
let musicOn = true;

function initMusic(){
  initAudio();

  if(!musicGainA){
    musicGainA = AudioEngine.ctx.createGain();
    musicGainB = AudioEngine.ctx.createGain();

    musicGainA.gain.value = 0;
    musicGainB.gain.value = 0;

    musicGainA.connect(AudioEngine.ctx.destination);
    musicGainB.connect(AudioEngine.ctx.destination);
  }
}

/* Fade duration in seconds */
const FADE_TIME = 1.8;

/* ========================= */
/*      PLAY WITH FADE                   */
/* ========================= */

function playMusicFade(buffer){
  if(!buffer) return;
  initMusic();

  const ctx = AudioEngine.ctx;

  // Create new source
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;

  // Decide which channel to use
  if(activeChannel === 0){
    // Fade out A, fade in B
    src.connect(musicGainB);

    musicGainA.gain.cancelScheduledValues(ctx.currentTime);
    musicGainB.gain.cancelScheduledValues(ctx.currentTime);

    musicGainA.gain.setValueAtTime(musicGainA.gain.value, ctx.currentTime);
    musicGainA.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_TIME);

    musicGainB.gain.setValueAtTime(0, ctx.currentTime);
    musicGainB.gain.linearRampToValueAtTime(musicOn ? 0.35 : 0, ctx.currentTime + FADE_TIME);

    activeChannel = 1;
  } else {
    // Fade out B, fade in A
    src.connect(musicGainA);

    musicGainA.gain.cancelScheduledValues(ctx.currentTime);
    musicGainB.gain.cancelScheduledValues(ctx.currentTime);

    musicGainB.gain.setValueAtTime(musicGainB.gain.value, ctx.currentTime);
    musicGainB.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_TIME);

    musicGainA.gain.setValueAtTime(0, ctx.currentTime);
    musicGainA.gain.linearRampToValueAtTime(musicOn ? 0.35 : 0, ctx.currentTime + FADE_TIME);

    activeChannel = 0;
  }

  // Stop old track
  if(currentMusic){
    try { currentMusic.stop(); } catch(e){}
  }

  src.start();
  currentMusic = src;
}

/* ========================= */
/*      MUSIC TOGGLE                     */
/* ========================= */

function toggleMusic(){
  musicOn = !musicOn;

  const btn = document.getElementById('music-btn');
  if(btn) btn.textContent = musicOn ? '🎵' : '🔇';

  const ctx = AudioEngine.ctx;

  if(activeChannel === 0){
    musicGainA.gain.cancelScheduledValues(ctx.currentTime);
    musicGainA.gain.linearRampToValueAtTime(musicOn ? 0.35 : 0, ctx.currentTime + 0.5);
  } else {
    musicGainB.gain.cancelScheduledValues(ctx.currentTime);
    musicGainB.gain.linearRampToValueAtTime(musicOn ? 0.35 : 0, ctx.currentTime + 0.5);
  }
}

function pauseMusic(){
  toggleMusic(false);
}

function resumeMusic(){
  toggleMusic(true);
}

/* -------------------- CACHE SYSTEM -------------------- */
const Cache = new Map();

function getCached(key) {
  return Cache.get(key);
}

function setCached(key, value) {
  Cache.set(key, value);
}

/* -- AUTO AIM TOGGLE -- */
function toggleAutoAim(){
  if (!G) return;
  G.autoAim = !G.autoAim;

  const btn = document.getElementById('autoaim-btn');
  if (btn){
    btn.textContent = G.autoAim ? '🎯' : '🎯̶';
    btn.classList.toggle('active', G.autoAim);
  }
}

/* ========================= */
/*         SFX ENGINE        */
/* ========================= */

function sfxNoise(dur, vol, freq, q = 1){
  initAudio();

  const ctx = AudioEngine.ctx;

  const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for(let i = 0; i < data.length; i++){
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

  src.connect(filter);
  filter.connect(AudioEngine.sfxGain);
  gain.connect(AudioEngine.sfxGain);

  src.start();
  src.stop(ctx.currentTime + dur);
}

function sfxTone(freq, dur, vol){
  initAudio();

  const ctx = AudioEngine.ctx;

  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = freq;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

  osc.connect(gain);
  gain.connect(AudioEngine.sfxGain);

  osc.start();
  osc.stop(ctx.currentTime + dur);
}

/* ========================= */
/*         WEAPON SFX        */
/* ========================= */

const SFX = {

  /* --- PISTOL --- */
  pistol(){
    sfxNoise(0.05, 0.35, 1800, 5);   // crack
    sfxNoise(0.10, 0.16, 200, 1.2);  // body
    sfxTone(900, 0.07, 0.25);        // snap
  },

  /* --- DUCK GUN --- */
  duckGun(){
    sfxTone(220, 0.12, 0.4);         // quack base
    sfxNoise(0.08, 0.25, 600, 3);    // puff
    sfxNoise(0.12, 0.20, 1200, 4);   // comedic blast
  },

  /* --- PIZZA CANNON --- */
  pizzaCharge(){
    sfxTone(80, 0.3, 0.2);           // low rumble
    sfxNoise(0.3, 0.15, 150, 1);     // sauce boil
  },

  pizzaFire(){
    sfxNoise(0.12, 0.45, 900, 4);    // splat
    sfxNoise(0.20, 0.30, 300, 2);    // sauce spray
    sfxTone(1200, 0.05, 0.3);        // cheese crack
  },

  /* --- GUITAR --- */
  guitarShock(){
    sfxTone(440, 0.25, 0.5);         // power chord
    sfxNoise(0.25, 0.35, 2000, 6);   // shockwave
    sfxNoise(0.40, 0.20, 300, 2);    // reverb tail
  },

  /* --- MELEE --- */
  melee(){
    sfxNoise(0.08, 0.35, 900, 4);    // slash
    sfxTone(120

/* -- CONSTANTS -- */
const MSIZE = 24, TW = 24;
const DEMO_MAX = 3;

const WEPS = [
  {name:'PISTOL',ico:'🔫',dmg:2,ammo:24,rate:180,reload:1200,spread:.04,cnt:1,color:'#ffcc00',explo:false,quack:false,shockwave:false},
  {name:'DUCK GUN',ico:'🦆',dmg:3,ammo:18,rate:140,reload:1500,spread:.06,cnt:2,color:'#ffdd44',explo:false,quack:true,shockwave:false},
  {name:'PIZZACANNON',ico:'🍕',dmg:4,ammo:12,rate:32 0,reload:2000,spread:.02,cnt:1,color:'#ff6600',explo:true,quack:false,shockwave:false},
  {name:'GUITAR ⅞ I'mAXE',ico:'🎸',dmg:99,ammo:6,rate:600,reload:3000,spread:0,cnt:1,color:'#cc44ff',explo:false,quack:false,shockwave:true},
];
const WEIRD_EVENTS = [
  {name:'🤡 CLOWN NIGHTMARE', fn:'clownwave'},
  {name:'🎪 DISCO FEVER!',fn:'discofever'},
  {name:'☎️ PHONE CALL',fn:'phonecall'},
  {name:'🍕 PIZZA DELIVERY',fn:'pizzadrop'},
  {name:'🐄 COW STAMPEDE',fn:'moomadness'},
  {name:'🎵 SMOOTH JAZZ',fn:'smoothjazz'},
  {name:'🌧️ DUCK RAIN',fn:'duckrain'},
  {name:'💅 MAKEOVER',fn:'makeover'},
  {name:'🤖 VENDOR RAGE',fn:'vendorrage'},
  {name:'📺 TV STATIC',fn:'tvstatic'},
  {name:'🎂 BIRTHDAY BONUS!',fn:'birthday'},
  {name:'👽 ALIEN INVASION!',fn:'ufoattack'},
  {name:'🌕 BLOOD MOON RISING',fn:'bloodmoon'},
  {name:'☄️ ASTEROID STORM',fn:'asteroidstorm'},
  {name:'🤡 KILLER CLOWN NIGHT',fn:'clownnight'},
];
const QUOTES = [
  '"I was only pretending to be dead."','"My therapist said this would help."',
  '"The discount brains were a mistake."','"Someone left a light on."',
  '"I blame the government."','"This is not how I planned retirement."',
];

/* -- INPUT -- */
const KEYS = {};
let MX = 0, MY = 0, MDOWN = false, mouseDX = 0;
let joyDelta = {x:0,y:0};
let joyId = -1, joyBase = {x:0,y:0};
let aimId = -1, aimLastX = 0, fireTouchId = -1;
let fireTouchActive = false;

document.addEventListener('keydown',e=>{
  KEYS[e.key.toLowerCase()] = true;
  if(e.key.toLowerCase()==='v' && G?.running) toggleView();
  if(e.key.toLowerCase()==='r' && G?.running) startReload();
  if(['1','2','3','4'].includes(e.key) && G?.running) switchWep(parseInt(e.key)-1);
});
document.addEventListener('keyup',e=>{ KEYS[e.key.toLowerCase()] = false; });
document.addEventListener('mousemove',e=>{  if(document.pointerLockElement){
    mouseDX += e.movementX*.0022;
  }else{
    MX = e.clientX; MY = e.clientY;
  }
});
document.addEventListener('mousedown',e=>{
  if(e.button===0){
    MDOWN = true; gac();
    if(G?.running && G.viewMode===catch(e){}
    }
    hideFiHint();
  }
});
document.addEventListener('mouseup',e=>{ if(e.button===0) MDOWN = false; });
document.addEventListener('pointerlockchange',()=>{});

/* -- MAP -- */
function buildMap(){
  worldMap = [];
  for(let y=0;y<MSIZE;y++){
    worldMap[y] = [];
    for(let x=0;x<MSIZE;x++){
      worldMap[y][x] = (x===0||y===0||x===MSIZE-1||y===MSIZE-1)?1:0;
    }
  }
  const walls = [[4,4],[4,8],[4,14],[4,18],[8,4],[8,18],[14,4],[14,8],[14,14],[14,18],
    [18,4],[18,8],[18,14],[18,18],[6,6],[6,7],[7,6],[10,10],[10,11],[11,10],
    [16,6],[16,7],[17,6],[16,16],[17,16],[6,16],[7,16]];
  walls.forEach(([x,y])=>{ worldMap[y][x] = 1; });
  for(let y=10;y<=14;y++) for(let x=10;x<=14;x++) worldMap[y][x] = 0;
  G.Deco = [];
  [[4,4],[18,4],[4,18],[18,18],[11,6],[6,11]].forEach(([x,y])=>{
    if(worldMap[y][x]===0){
      G.Deco.push({
        type:Math.random()<.5?'tomb':'barrel',
        x:x*TW+TW/2,
        y:y*TW+TW/2,
        angle:Math.random()*Math.PI*2
      });
    }
  });
}
 
/* ========================= */
/*        SCREEN LOGIC                   */
/* ========================= */

function showScr(id){
  // hide all screens
  document.querySelectorAll('.scr').forEach(s => s.classList.add('off'));

  // show selected
  const el = document.getElementById(id);
  if(el) el.classList.remove('off');

  // music routing
  if(id === 'menu'){
    playMusic(TRACKS.darkIntro);
  }
}}
function showPaywall(){ stopGame(); showScr('ps'); }
function backToTitle(){ stopGame(); showScr('ts'); }

let startViewMode = 'fp';
function setMode(m){
  startViewMode = m;
  G || initG();
  G.viewMode = m;

/* ========================= */
/*        BUTTON WIRING                 */
/* ========================= */

document.getElementById('uc-play').onclick = () => showScr('menu');
document.getElementById('uc-menu').onclick = () => showScr('menu');

// your other buttons…

document.getElementById('mb-fp').classList.toggle('active',m==='fp');
  document.getElementById('mb-tp').classList.toggle('active',m==='tp');
}
function hideFiHint(){
  const fi = document.getElementById('fi-hint');
  if(fi){
    fi.style.transition = 'opacity .5s';
    fi.style.opacity = '0';
    setTimeout(()=>fi.style.display='none',600);
  }
}

/* -- WAVE SYSTEM -- */
function startWave(n){
  G.wave = n;
  G.waveActive = true;
  G.waveDone = false;
  G.waveSpawning = false;2 and
  G.Z = [];
  G.Bullets = [];
  G.discoTimer = 0;
  G.jazzTimer = 0;
  G.staticTimer = 0;

  try{
    const wd = document.getElementById('wave-d');
    if(wd) wd.textContent = 'WAVE '+n;
  }catch(e){}

  if(n>1) spawnPU();

  if(!G.demo){
    if(n>=2) G.weps[1].unlocked = true;
    if(n>=4) G.weps[2].unlocked = true;
    if(n>=6) G.weps[3].unlocked = true;
  }

  try{updateWB();}catch(e){}

  if(!G.running){
    G.running = true;
    G.P.x = MSIZE/2*TW;
    G.P.y = MSIZE/2*TW; y
    G.P.hp = G.P.maxHp;){}

    G.P.angle = 0;
    try{ if(canvas) canvas.style.display='block'; }catch(e){}
    try{ const h=document.getElementById('hud'); if(h) h.style.display='block'; }catch(e    try{
      const cr=document ?.getElementById('crosshair');
      if(cr) cr.className = G.viewMode==='fp'?'show':'';
    }catch(e){}
    try{
      const showMM =  || G.viewMode==='tp';
      const mm = document.getElementById('minimap');
      if(mm) mm.style.display = showMM?'block':'none';
    }catch(e){}
    try{Qza z—-☆-☆☆-+☆aif(isMobile){
        const tc=document.getElementById('tc');
        if(tc) tc.style.display='block';
      }
    }catch(e){}
    try{
     Xe  if(G.viewMode==='tp' && document.pointerLockElement) document.exitPointerLock();
    }catch(e){}
    showScr('__none__');
    try{updateHUD();}catch(e){}
    loop();
  }

  try{spawnWaveZombies(n);}catch(e){}

  if(n>=2){
    setTimeout(()=>{
      if(G.running && G.waveActive){
        triggerWeird(WEIRD_EVENTS[Math.floor(Math.random()*WEIRD_EVENTS.length)]);
      }
    },3000+Math.random()*4000);
  }
}
function spawnClownWave(n){
  const clownTypes = [
    'clown','chainsaw_clown','balloon_clown','jester'
  ];
  for(let i=0;i<n;i++){
    const t = clownTypes[Math.floor(Math.random()*clownTypes.length)];
    spawnZ(t);
  }
}
function spawnWaveZombies(wave){
  const count = 3+wave*2;
 const types=['normal','normal','fast','tank','pizza_boy','boss','killer_clown'];
const weights = wave>=4
  ? [3,2,2,1,1,wave%3===0?1:0, 2]   // killer_clown appears more from wave 4+
  : [5,3,1,0,0,0, 0];
  let spawned = 0;
  function spawnNext(){
    if(!G.running || spawned>=count) return;
    let total = weights.reduce((a,b)=>a+b,0);
    let r = Math.floor(Math.random()*total), t = 'normal';
    let acc = 0;
    for(let i=0;i<types.length;i++){
      acc += weights[i];
      if(r<acc){ t = types[i]; break; }
    }
    spawnZ(t); spawned++;
    if(spawned<count) setTimeout(spawnNext,800+Math.random()*1200);
  }
  spawnNext();
}

function spawnZ(type){
  let x,y,attempts=0;
  do{
    const edge = Math.floor(Math.random()*4);
    if(edge===0){ x=1+Math.random()*(MSIZE-2); y=1; }
    else if(edge===1){ x=MSIZE-2; y=1+Math.random()*(MSIZE-2); }
    else if(edge===2){ x=1+Math.random()*(MSIZE-2); y=MSIZE-2; }
    else{ x=1; y=1+Math.random()*(MSIZE-2); }
    x = Math.floor(x); y = Math.floor(y);
  }while(worldMap[y]?.[x]===1 && ++attempts<20);
const hps={
  normal:2,fast:1,tank:6,pizza_boy:3,boss:20,cow:4,
  killer_clown:5
};
const spds={
  normal:.55,fast:1.1,tank:.35,pizza_boy:.65,boss:.7,cow:1.2,
  killer_clown:1.25
};
const sizes={
  normal:.4,fast:.3,tank:.55,pizza_boy:.4,boss:.65,cow:.5,
  killer_clown:.5
};

G.Z.push({
  x:x*TW+TW/2,y:y*TW+TW/2,angle:0,type,
  hp:hps[type]||2,maxHp:hps[type]||2,
  speed:spds[type]*TW*.028,size:sizes[type]*TW,
  wobble:Math.random()*Math.PI*2,
  dead:false,deadT:0,
  dancing:G.discoTimer>0,stunned:0,
  makeover:false,makeoverTimer:0,
  bloodBuff:false, // NEW: for blood moon buff
  // AI state ...
});

  if(Math.random()<.5){
    setTimeout(()=>{
      if(G.running) SFX.groan(type);
    },Math.random()*800);
  }
}

function spawnPU(){
  const types = ['❤️','⚡','🛡️','💎'];
  const t = types[Math.floor(Math.random()*types.length)];
  let x,y,att=0;
  do{
    x = 3+Math.floor(Math.random()*(MSIZE-6));
    y = 3+Math.floor(Math.random()*(MSIZE-6));
  }while(worldMap[y][x]===1 && ++att<30);
  G.PUs.push({x:x*TW+TW/2,y:y*TW+TW/2,type:t,life:600,pulse:0});
}
function spawnCow(){ spawnZ('cow'); spawnZ('cow'); spawnZ('cow'); }

/* -- PATHFINDING -- */
function getPath(fx,fy,tx,ty){
  const sx = Math.floor(fx/TW), sy = Math.floor(fy/TW);
  const ex = Math.floor(tx/TW), ey = Math.floor(ty/TW);
  if(sx===ex && sy===ey) return [];
  const open = [{x:sx,y:sy,g:0,f:0,parent:null}];
  const closed = new Set();
  const key = (x,y)=>x+','+y;
  const h = (x,y)=>Math.abs(x-ex)+Math.abs(y-ey);
  let best = null, iter = 0;
  while(open.length && iter++<200){
    open.sort((a,b)=>a.f-b.f);
    const curr = open.shift();
    const k = key(curr.x,curr.y);
    if(closed.has(k)) continue;
    closed.add(k);
    if(curr.x===ex && curr.y===ey){ best = curr; break; }
    const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
    for(const[dx,dy]of dirs){
      const nx = curr.x+dx, ny = curr.y+dy;
      if(nx<0||ny<0||nx>=MSIZE||ny>=MSIZE||worldMap[ny][nx]===1) continue;
      const nk = key(nx,ny);
      if(closed.has(nk)) continue;
      const g = curr.g+(dx!==0&&dy!==0?1.41:1);
      open.push({x:nx,y:ny,g,f:g+h(nx,ny),parent:curr});
    }
  }
  if(!best) return [];
  const path = []; let n = best;
  while(n.parent){ path.unshift({x:n.x*TW+TW/2,y:n.y*TW+TW/2}); n = n.parent; }
  return path;
}

/* -- WEIRD EVENTS -- */
function triggerWeird(ev){
  const wb=document.getElementById('weird-banner');
  wb.textContent = ev.name;
  wb.style.opacity = '1';
  setTimeout(()=>wb.style.opacity='0',3000);

  if(ev.fn==='discofever'){
    // ...
  } else if(ev.fn==='ufoattack'){
    // ...
  }

  else if(ev.fn==='bloodmoon'){
    G.bloodMoonActive = true;        // ⭐ TURN BLOOD MOON ON HERE
    G.bloodMoonTimer = 900;          // ~15 seconds
    G.shake = 4;

    // Buff existing zombies
    G.Z.forEach(z=>{
      if(!z.dead){
        z.bloodBuff = true;
        z.hp = Math.min(z.maxHp+2, z.hp+2);
      }
    });

    floatText(CW()/2, CH()/3, '🌕 BLOOD MOON', '#f33', 2.2);
  }

  else if(ev.fn==='asteroidstorm'){
    // ...
  }

  else if(ev.fn==='clownnight'){
    // ...
  }
}  // NEW EVENTS:
  else if(ev.fn==='bloodmoon'){
    G.bloodMoonTimer=900; // ~15 seconds at 60fps
    G.shake=4;
    // Buff existing zombies
    G.Z.forEach(z=>{
      if(!z.dead){
        z.bloodBuff=true;
        z.hp=Math.min(z.maxHp+2,z.hp+2);
      }
    });
    floatText(CW()/2,CH()/3,'🌕 BLOOD MOON','#f33',2.2);
  } else if(ev.fn==='asteroidstorm'){
    G.asteroidTimer=600;
    G.astroids=[]; // typo guard if you had it; we use asteroids below
    G.astroids=undefined;
    G.asteroids=[];
    floatText(CW()/2,CH()/3,'☄️ ASTEROID STORM','#fa0',2.0);
  } else if(ev.fn==='clownnight'){
    // Spawn a burst of killer zombie clowns
    for(let i=0;i<6;i++)spawnZ('killer_clown');
    G.shake=10;
    floatText(CW()/2,CH()/3,'🤡 KILLER CLOWNS','#f0f',2.4);
  }
}
  if(ev.fn==='discofever'){
    G.discoTimer = 360;
    G.Z.forEach(z=>z.dancing=true);
    setTimeout(()=>{ if(G.running) G.Z.forEach(z=>z.dancing=false); },6000);
  }else if(ev.fn==='smoothjazz'){
    G.jazzTimer = 300;
  }else if(ev.fn==='tvstatic'){
    G.staticTimer = 180;
    G.Z.forEach(z=>z.stunned = Math.max(z.stunned,120));
  }else if(ev.fn==='pizzadrop'){
    G.pizzaDrone = {x:CW()/2,y:50,vy:2,delivered:false,targetY:CH()/2-40};
  }else if(ev.fn==='moomadness'){
    spawnCow(); SFX.moo();
  }else if(ev.fn==='duckrain'){
    G.rainTimer = 200;
    G.weps[G.wepIdx].cur = G.weps[G.wepIdx].ammo;
    updateHUD();
  }else if(ev.fn==='makeover'){
    G.Z.forEach(z=>{ if(!z.dead){ z.makeover=true; z.makeoverTimer=240; } });
  }else if(ev.fn==='vendorrage'){
    for(let i=0;i<6;i++) setTimeout(()=>{
      if(!G.running) return;
      const ang = G.P.angle+(Math.random()-.5)*.6;
      G.Bullets.push({
        x:G.P.x,y:G.P.y,
        vx:Math.cos(ang)*TW*.2,vy:Math.sin(ang)*TW*.2,
        dmg:3,life:80,size:TW*.15,col:'#00aaff',
        friendly:true,trail:[]
      });
    },i*200);
  }else if(ev.fn==='phonecall'){
    const z = G.Z.find(z=>!z.dead);
    if(z) floatText(z.x,z.y-z.size,QUOTES[Math.floor(Math.random()*QUOTES.length)],'#c0f',.85);
  }else if(ev.fn==='birthday'){
    G.score += 500;
    SFX.pu();
    floatText(G.P.x,G.P.y-40,'🎂 +500','#fa0',1.6);
    updateHUD();
  }else if(ev.fn==='ufoattack'){
    G.ufo = {
      x:G.P.x,y:TW*3,
      vx:(Math.random()-.5)*TW*.08,vy:TW*.05,
      hp:20,angle:0,shootTimer:80,bullets:[],
      alive:true,beamOn:false
    };
    floatText(CW()/2,CH()/3,'👽 ALIEN INVASION!','#0f8',2.2);
    G.shake = 8;
  }
}

/* -- FIRE -- */
function fire(){
  const w = G.weps[G.wepIdx];
  if(w.cur<=0 || G.reloading || G.shootT>0) return;
  w.cur--; G.shootT = Math.ceil(w.rate/16.67);

  if(w.shockwave){
    SFX.guitar(); G.shake = 14;
    G.Bullets.push({
      x:G.P.x,y:G.P.y,vx:0,vy:0,dmg:99,life:2,size:TW*15,
      explo:false,col:'#cc44ff',shockwave:true,trail:[]
    });
    for(let i=0;i<24;i++){
      const a = i/24*Math.PI*2;
      G.Parts.push({
        x:G.P.x,y:G.P.y,
        vx:Math.cos(a)*5,vy:Math.sin(a)*5,
        life:40,col:'#cc44ff',size:8
      });
    }
    floatText(G.P.x,G.P.y-50,'🎸 SHOCKWAVE!','#c0f',2);
  }else{
    for(let i=0;i<(w.cnt||1);i++){
      const spread = (Math.random()-.5)*w.spread*2;
      const a = G.P.angle+spread;
      G.Bullets.push({
        x:G.P.x,y:G.P.y,
        vx:Math.cos(a)*TW*.19,vy:Math.sin(a)*TW*.19,
        dmg:w.dmg,life:80,size:TW*.18,explo:w.explo,
        col:w.color,friendly:false,trail:[]
      });
    }
    if(w.quack) SFX.quack();
    else if(w.explo) SFX.pizza();
    else SFX.shoot();
    G.shake = w.explo?5:1.5;
  }

  if(w.cur===0) startReload();
  updateHUD();
}

function startReload(){
  const w = G.weps[G.wepIdx];
  if(G.reloading || w.cur===w.ammo) return;
  G.reloading = true; G.rlProg = 0;

  const rlBar = document.getElementById('rl-bar');
  const rlLbl = document.getElementById('rl-lbl');
  if(rlBar) rlBar.style.display = 'block';
  if(rlLbl) rlLbl.style.display = 'block';

  SFX.reload();
  let elapsed = 0;
  const step = 50;
  G.rlTimer = setInterval(()=>{
    elapsed += step;
    G.rlProg = elapsed/w.reload;
    const rlFill = document.getElementById('rl-fill');
    if(rlFill) rlFill.style.width = (G.rlProg*100)+'%';
    if(elapsed>=w.reload){
      clearInterval(G.rlTimer);
      w.cur = w.ammo;
      G.reloading = false;
      G.rlProg = 0;
      SFX.rdone();
      if(rlBar) rlBar.style.display = 'none';
      if(rlLbl) rlLbl.style.display = 'none';
      updateHUD();
    }
  },step);
}

function switchWep(i){
  if(!G.weps[i].unlocked){
    floatText(CW()/2,CH()/2,'🔒 LOCKED','#888',1.2);
    return;
  }
  G.wepIdx = i;
  G.shootT = 0;
  SFX.click();
  updateWB();
  updateHUD();
}

/* -- DAMAGE / EXPLOSIONS -- */
function damageZ(z,dmg,explo){
  z.hp -= dmg;
  G.shake = Math.max(G.shake, explo?7:2.5);
  for(let i=0;i<(explo?10:3);i++){
    G.Parts.push({
      x:z.x+(Math.random()-.5)*z.size,
      y:z.y+(Math.random()-.5)*z.size,
      vx:(Math.random()-.5)*4,vy:-2-Math.random()*3,
      life:20+Math.random()*14,col:'#8B0000',
      size:3+Math.random()*4
    });
  }
  if(z.hp<=0){
    z.dead = true; z.deadT = 35;
    SFX.kill();
    G.kills++; G.score += 10*G.wave;
    DECALS.push({x:z.x,y:z.y,r:z.size*.9,a:.75});
    if(DECALS.length>100) DECALS.shift();
    G.combo++; G.comboTimer = 240;
    if(G.combo>G.bestCombo) G.bestCombo = G.combo;
    if(G.combo>=2){
      SFX.combo(Math.min(G.combo,8));
      const labels = ['','','DOUBLE','TRIPLE','QUAD','PENTA','HEXA','GODLIKE','GODLIKE'];
      const cols   = ['','','#fa0','#f60','#f08','#c0f','#0ef','#f33','#f33'];
      const lbl = labels[Math.min(G.combo,8)]+'  x'+G.combo;
      ÀfloatText(z.x,z.y-z.size,lbl,cols[Math.min(G.combo,8)]||'#f33',1+G.combo*.1);
      G.score += 50*G.combo*G.wave;
    }else{
      floatText(z.x,z.y-z.size,'+'+10*G.wave,'#aaa',.85);
    }
    const cd = document.getElementById('combo-d');
    if(cd){
      cd.textContent = '⚡ x'+G.combo+' COMBO';
      cd.style.opacity = '1';
    }
    updateHUD();
  }else{
    floatText(z.x,z.y-z.size*.4,'-'+dmg,'#f87',.75);
  }
}

function explodeAt(x,y){
  SFX.explode(); G.shake = 9;
  for(let i=0;i<18;i++){
    G.Parts.push({
      x,y,
      vx:(Math.random()-.5)*7,vy:-3-Math.random()*5,
      life:25+Math.random()*18,
      col:i%2?'#f60':'#fa0',
      size:4+Math.random()*6
    });
  }
 for(const z of G.Z){
    if(z.dead){z.deadT--;continue;}
    z.wobble+=z.dancing?.18:.07;
    if(z.wobble>Math.PI*200)z.wobble-=Math.PI*200;
    z.frame+=1;if(z.frame>5)z.frame=0;
    if(z.stunned>0){z.stunned--;continue;}
    if(z.dancing||z.makeover){if(z.makeoverTimer>0)z.makeoverTimer--;continue;}

I// Asteroid storm
  if(G.asteroidTimer>0){
    G.asteroidTimer--;
    // spawn random falling asteroids
    if(Math.random()<.08){
      G.asteroids.push({
        x:Math.random()*CW(),
        y:-40,
        vx:(Math.random()-.5)*2,
        vy:3+Math.random()*2,
        life:140
      });
    }
  }
  G.asteroids=G.asteroids.filter(a=>{
    a.x+=a.vx;a.y+=a.vy;a.life--;
    // impact near player or zombies
    if(a.y>CH()-20){
      explodeAt(a.x,a.y);
      return false;
    }
    return a.life>0;
  });
   
 // Blood moon buff: faster and meaner
    const baseSpeed=z.speed;
    const zspdBuff = (G.bloodMoonTimer>0 || z.bloodBuff) ? baseSpeed*1.35 : baseSpeed;
    const zspd = G.jazzTimer>0 ? zspdBuff*.5 : zspdBuff;
    // ... then use zspd instead of z.speed below

// Clown behaviors
if(z.type==='clown'){
  z.wobble += .25;
  z.x += Math.sin(z.wobble)*0.4;
}
if(z.type==='chainsaw_clown'){
  const dx = p.x - z.x, dy = p.y - z.y;
  const a = Math.atan2(dy,dx);
  z.x += Math.cos(a)*z.speed*1.8;
  z.y += Math.sin(a)*z.speed*1.8;
}
if(z.type==='balloon_clown'){
  z.wobble += .15;
  z.x += Math.sin(z.wobble)*0.6;
  z.y += Math.cos(z.wobble*.7)*0.4;
}
if(z.type==='jester' && Math.random()<.01){
  z.x += (Math.random()-0.5)*TW*4;
  z.y += (Math.random()-0.5)*TW*4;
}
if(z.type==='clowncar_boss'){
  z.wobble += .05;
  z.x += Math.cos(z.wobble)*1.2;
  z.y += Math.sin(z.wobble)*1.2;
  if(Math.random()<.02){
    spawnZ('clown');
  }
}

function healP(amt){
  G.P.hp = Math.min(G.P.maxHp,G.P.hp+amt);
  const v = document.getElementById('vig');
  if(v){
    v.className = 'heal';
    setTimeout(()=>v.className='',400);
  }
  floatText(G.P.x,G.P.y-40,'+'+amt+' HP','#0f0',1.3);
  updateHUD();
}
function hitFX(){
  const v = document.getElementById('vig');
  if(v){
    v.className = 'hit';
    setTimeout(()=>v.className='',220);
  }
}

/* -- FLOAT TEXT -- */
function floatText(x,y,txt,col,scale){
  G.FTs.push({x,y,txt,col,scale:scale||1,life:55});
}

/* -- HUD -- */
function updateHUD(){
  if(!G) return;
  const w = G.weps[G.wepIdx];
  const p = G.P;
  const scoreEl = document.getElementById('score-d');
  if(scoreEl) scoreEl.textContent = 'SCORE: '+G.score.toLocaleString();
  const hp = Math.max(0,p.hp/p.maxHp*100);
  const hf = document.getElementById('hpf');
  if(hf){
    hf.style.width = hp+'%';
    hf.style.background = hp>50
      ? 'linear-gradient(90deg,#0c0,#6f0)'
      : hp>25
        ? 'linear-gradient(90deg,#a80,#fc0)'
        : 'linear-gradient(90deg,#c00,#f44)';
  }
function showPaywall(){
  showScr('ps');
}
 const demoHud = document.getElementById('demo-b');
if(demoHud){
  demoHud.style.display = G.fullGame ? 'none' : 'block';
}
 const ammoEl = document.getElementById('ammo-d');
  if(ammoEl) ammoEl.textContent = w.cur+'/'+w.ammo;
  const wn = document.getElementById('wep-name');
  if(wn) wn.textContent = w.name;
  const pur = document.getElementById('pur');
  if(pur){
    pur.innerHTML = '';
    if(p.boost>0) pur.innerHTML += '<div class="pu-ic" style="border-color:#fa0;color:#fa0">⚡</div>';
    if(p.shield>0) pur.innerHTML += '<div class="pu-ic" style="border-color:#0ef;color:#0ef">🛡️</div>';
  }
}
function updateWB(){
  G.weps.forEach((w,i)=>{
    const el = document.getElementById('ws'+i);
    if(!el) return;
    el.classList.toggle('active',i===G.wepIdx);
    el.classList.toggle('locked',!w.unlocked);
  });
}

/* -- STOP / GAME OVER / WAVE CLEAR -- */
function stopGame(){
  if(!G) return;
  G.running = false;
  cancelAnimationFrame(animId);
  if(G.rlTimer) clearInterval(G.rlTimer);
  if(canvas) canvas.style.display = 'none';
  const hud = document.getElementById('hud');
  if(hud) hud.style.display = 'none';
  const tc = document.getElementById('tc');
  if(tc) tc.style.display = 'none';
  const mm = document.getElementById('minimap');
  if(mm) mm.style.display = 'none';
  const cr = document.getElementById('crosshair');
  if(cr) cr.className = '';
  if(document.pointerLockElement) document.exitPointerLock();
}

function gameOver(){
  G.running = false; I 3ŕ
  cancelAnimationFrame(animId);
  SFX.go();
  if(document.pointerLockElement) document.exitPointerLock();
  setTimeout(()=>{
    stopGame();
    const gs1 = document.getElementById('gs1');
    const gs2 = document.getElementById('gs2');
    const gs3 = document.getElementById('gs3');
    const gs4 = document.getElementById('gs4');
    const gq  = document.getElementById('go-quote');
    if(gs1) gs1.textContent = G.score.toLocaleString();
    if(gs2) gs2.textContent = G.wave;
    if(gs3) gs3.textContent = G.kills;
    if(gs4) gs4.textContent = 'x'+G.bestCombo;
    if(gq)  gq.textContent  = QUOTES[Math.floor(Math.random()*QUOTES.length)];
    showScr('go');
  },600);
}

function waveClear(){
  G.waveActive = false;
  G.waveDone = true;
  const bonus = G.wave*150+G.kills*5;
  G.score += bonus;
  SFX.wclr();
  const popup = document.getElementById('wc-popup');
  const sub   = document.getElementById('wc-sub');
  const btxt  = document.getElementById('wc-bonus');
  if(sub)  sub.textContent  = 'Wave '+G.wave+' cleared! +'+bonus+' pts';
  if(btxt) btxt.textContent = '';
  if(popup){
    popup.classList.add('show');
    setTimeout(()=>{
      popup.classList.remove('show');
      if(!G.running) return;
     if(!G.fullGame && G.demo && G.wave >= DEMO_MAX){
  stopGame();
  setTimeout(()=>showScr('ps'),300); // 'ps' is your paywall screen ID
  return;
}
      startWave(G.wave+1);
    },2600);
  }
  updateHUD();
}

/* -- UPDATE LOOP -- */
function update(){
  if(!G.running) return;
  const p = G.P;
  G.bgTime += .016;
  G.discoAngle += .03;
  if(G.shootT>0) G.shootT--;
  if(G.discoTimer>0) G.discoTimer--;
  if(G.jazzTimer>0) G.jazzTimer--;
  if(G.staticTimer>0) G.staticTimer--;
  if(G.rainTimer>0){
    G.rainTimer--;
}
   if(G.bloodMoonTimer > 0){
  G.bloodMoonTimer--;
  if(G.bloodMoonTimer === 0){
    G.bloodMoonActive = false;
  }
}
 if(Math.random()<.3){
      G.duckRain.push({
        x:Math.random()*CW(),y:-20,
        vy:3+Math.random()*2,life:80
    });
    }
  }
  G.duckRain = G.duckRain.filter(d=>{
    d.y += d.vy; d.life--;
    return d.life>0;
  });
  if(G.combo>0){
    G.comboTimer--;
    if(G.comboTimer<=0){
      G.combo = 0;
      const cd = document.getElementById('combo-d');
      if(cd) cd.style.opacity = '0';
    }
  }

  G.groanTimer--;
  if(G.groanTimer<=0 && G.Z.length>0){
    G.groanTimer = 80+Math.floor(Math.random()*120);
    const alive = G.Z.filter(z=>!z.dead);
    if(alive.length){
      SFX.groan(alive[Math.floor(Math.random()*alive.length)].type);
    }
  }

  if(G.pizzaDrone){
    const dr = G.pizzaDrone;
    if(!dr.delivered){
      dr.y += dr.vy;
      if(dr.y>=dr.targetY){
        dr.delivered = true;
        healP(40);
        SFX.pu();
        floatText(p.x,p.y-40,'🍕 +40 HP','#f60',1.6);
        setTimeout(()=>G.pizzaDrone=null,1200);
      }
    }
  }

  if(G.ufo && G.ufo.alive){
    const u = G.ufo;
    u.x += u.vx; u.y += u.vy; u.angle += .04;
    if(u.x<TW*2 || u.x>TW*(MSIZE-2)) u.vx *= -1;
    if(u.y<TW*2 || u.y>TW*(MSIZE-2)) u.vy *= -1;
    u.shootTimer--;
    if(u.shootTimer<=0){
      u.shootTimer = 50+Math.floor(Math.random()*70);
      u.beamOn = true;
      setTimeout(()=>{ if(G.ufo) G.ufo.beamOn = false; },280);
      const dx = p.x-u.x, dy = p.y-u.y, spd = TW*.17;
      [-0.18,0,0.18].forEach(sp=>{
        const a = Math.atan2(dy,dx)+sp;
        u.bullets.push({
          x:u.x,y:u.y,
          vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
          life:110
        });
      });
      SFX.ufo();
    }
.
  // HUD flash
  const v=document.getElementById('vig');
  if(v){
   bloodMoonFlashFX();
    setTimeout(()=>v.className='',120);
  }

  // reset cooldown
  setTimeout(()=>{G.meleeReady=true;},200);
}
  u.bullets = u.bullets.filter(b=>{
      b.x += b.vx; b.y += b.vy; b.life--;
      if(Math.hypot(b.x-p.x,b.y-p.y)<TW*.9 && p.inv<=0){
        if(p.shield>0){
          p.shield = 0;
          floatText(p.x,p.y-30,'🛡️ BLOCKED!','#0ef',1.3);
        }else{
          p.hp -= 2;
          SFX.hurt(); hitFX(); p.inv = 40;
          if(p.hp<=0){ gameOver(); return false; }
        }
          G.score += bonus;
          floatText(u.x,u.y,'👽 UFO DOWN! +'+bonus,'#0f8',2.2);
          SFX.explode(); G.shake = 14;
          for(let i=0;i<10;i++){
            G.Parts.push({
              x:u.x+(Math.random()-.5)*TW*2,
              y:u.y+(Math.random()-.5)*TW*2,
              vx:(Math.random()-.5)*6,
              vy:-3-Math.random()*5,
              life:35+Math.random()*20,
              col:i%2?'#0f8':'#fff',
              size:6
            });
          }
          setTimeout(()=>G.ufo=null,1500);
        }
        return false;
      }
      return b.life>0;
    });
  }
function update(dt){
  if(G.viewMode === 'fp'){
    updateFPWeapon(dt);
  } else {
    updateTPPlayer(dt);
  }
}
  if(G.viewMode==='tp'){
    p.angle = Math.atan2(MY-CH()/2,MX-CW()/2);
  }else{    mouseDX = 0;
  }

  /* Auto-aim: soft magnetism toward nearest zombie in a forward cone. */
  if(G.autoAim){
    const maxRange = TW*11, coneHalf = Math.PI/5;
    let best = null, bestDist = Infinity;
    for(const z of G.Z){
      if(z.dead) continue;
      const dx = z.x-p.x, dy = z.y-p.y, dist = Math.hypot(dx,dy);
      if(dist>maxRange) continue;
      let diff = Math.atan2(dy,dx)-p.angle;
      while(diff>Math.PI)  diff -= Math.PI*2;
      while(diff<-Math.PI) diff += Math.PI*2;
      if(Math.abs(diff)>coneHalf) continue;
      if(dist<bestDist){ bestDist = dist; best = z; }
    }
    if(best){
      let diff = Math.atan2(best.y-p.y,best.x-p.x)-p.angle;
      while(diff>Math.PI)  diff -= Math.PI*2;
      while(diff<-Math.PI) diff += Math.PI*2;
      p.angle += diff*0.14;
    }
 
  let dx = 0, dy = 0;
  const spd = 0.055;
  if(isMobile){
    dx = joyDelta.x*spd*TW;
    dy = joyDelta.y*spd*TW;
  }else{
    if(KEYS['w']){ dx += Math.cos(p.angle)*spd*TW; dy += Math.sin(p.angle)*spd*TW; }
    if(KEYS['s']){ dx -= Math.cos(p.angle)*spd*TW; dy -= Math.sin(p.angle)*spd*TW; }
    if(KEYS['a']){ dx += Math.cos(p.angle-Math.PI/2)*spd*TW; dy += Math.sin(p.angle-Math.PI/2)*spd*TW; }
    if(KEYS['d']){ dx -= Math.cos(p.angle-Math.PI/2)*spd*TW; dy -= Math.sin(p.angle-Math.PI/2)*spd*TW; }
    if(dx && dy){ dx *= .707; dy *= .707; }
  }
  const bst = p.boost>0?1.75:1;
  const nx = p.x+dx*bst, ny = p.y+dy*bst;
  const tx = Math.floor(nx/TW), ty = Math.floor(ny/TW);
  const ox2 = Math.floor(p.x/TW), oy2 = Math.floor(p.y/TW);
  if(tx>=0&&tx<MSIZE&&ty>=0&&ty<MSIZE&&worldMap[ty][tx]===0){ p.x = nx; p.y = ny; }
  else if(tx>=0&&tx<MSIZE&&oy2>=0&&oy2<MSIZE&&worldMap[oy2][tx]===0){ p.x = nx; }
  else if(ox2>=0&&ox2<MSIZE&&ty>=0&&ty<MSIZE&&worldMap[ty][ox2]===0){ p.y = ny; }
  p.x = Math.max(TW*.55,Math.min((MSIZE-.55)*TW,p.x));
  p.y = Math.max(TW*.55,Math.min((MSIZE-.55)*TW,p.y));
G.stepTimer--;
if (G.stepTimer <= 0 && (dx || dy)) {
  G.stepTimer = 22;

  const onBlood = DECALS.some(d => Math.hypot(p.x - d.x, p.y - d.y) < TW * 1.2);

  if (onBlood) {
    SFX.bloodStep();
  } else if (Math.random() < 0.4) {
    SFX.step();
  }
}
  if(p.inv>0)    p.inv--;
  if(p.boost>0)  p.boost--;

  for(const z of G.Z){
    if(z.dead){ z.deadT--; continue; }
    z.wobble += z.dancing ? .18 : .07;
    if(z.wobble>Math.PI*200) z.wobble -= Math.PI*200;
    z.frame += 1;
    if(z.frame>5) z.frame = 0;
    if(z.stunned>0){ z.stunned--; continue; }
    if(z.dancing || z.makeover){
      if(z.makeoverTimer>0) z.makeoverTimer--;
      continue;
    }
    z.pathTimer--;
    if(z.pathTimer<=0){
      z.pathTimer = 30+Math.floor(Math.random()*20);
      z.path = getPath(z.x,z.y,p.x,p.y);
    }
    let tx2 = p.x, ty2 = p.y;
    if(z.path && z.path.length>0){
      const next = z.path[0];
      if(Math.hypot(z.x-next.x,z.y-next.y)<TW*.7) z.path.shift();
      else{ tx2 = next.x; ty2 = next.y; }
    }
    const ddx = tx2-z.x, ddy = ty2-z.y, dist = Math.hypot(ddx,ddy)||1;
    const zspd = G.jazzTimer>0 ? z.speed*.5 : z.speed;
    z.x += ddx/dist*zspd;
    z.y += ddy/dist*zspd;
    z.angle = Math.atan2(ddy,ddx);
    const ztx = Math.floor(z.x/TW), zty = Math.floor(z.y/TW);
    if(worldMap[zty]?.[ztx]===1){
      z.x = p.x+Math.cos(z.angle+Math.PI)*TW;
      z.y = p.y+Math.sin(z.angle+Math.PI)*TW;
    }
    for(const z2 of G.Z){
      if(z2===z || z2.dead) continue;
      const sd = Math.hypot(z.x-z2.x,z.y-z2.y);
      if(sd<z.size+z2.size && sd>0){
        z.x += (z.x-z2.x)/sd*1.5;
        z.y += (z.y-z2.y)/sd*1.5;
      }
    }q
      if(z.type==='boss'){
        lctx.shadowColor = '#f0f';
        lctx.shadowBlur = 8;
      }
      lctx.beginPath();
      lctx.arc(ex+Math.cos(eAngle)*pr,ey+Math.sin(eAngle)*pr,zs*.1,0,Math.PI*2);
      lctx.fill();
      lctx.shadowBlur = 0;
    });

    lctx.strokeStyle = 'rgba(0,0,0,.7)';
    lctx.lineWidth = zs*.09;
    lctx.lineCap = 'round';
    lctx.beginPath();
    if(dancing){
      lctx.arc(0,zs*.16,zs*.18,0,Math.PI);
    }else{
      lctx.moveTo(-zs*.16,zs*.18);
      lctx.lineTo(-zs*.06,zs*.13);
      lctx.lineTo(0,zs*.2);
      lctx.lineTo(zs*.07,zs*.11);
      lctx.lineTo(zs*.16,zs*.2);
    }
    lctx.stroke();

    if(dancing){
      lctx.fillStyle = 'rgba(0,0,0,.85)';
      lctx.beginPath();
      lctx.roundRect(-zs*.4,-zs*.12+(-zs*.12)-.01,zs*.34,zs*.22,zs*.05);
      lctx.fill();
      lctx.beginPath();
      lctx.roundRect(zs*.08,-zs*.12+(-zs*.12)-.01,zs*.34,zs*.22,zs*.05);
      lctx.fill();
      lctx.strokeStyle = '#ffd700';
      lctx.lineWidth = 1.5;
      lctx.beginPath();
      lctx.moveTo(-zs*.06,-zs*.12+(-zs*.12)-.01+zs*.11);
      lctx.lineTo(zs*.08,-zs*.12+(-zs*.12)-.01+zs*.11);
      lctx.stroke();
      const nt = (z.wobble*.5)%1;
      ['🎵','🎶'].forEach((n,i)=>{
        const phase = (nt+i*.5)%1;
        lctx.font = `${zs*.55}px serif`;
        lctx.textAlign = 'center';
        lctx.textBaseline = 'middle';
        lctx.globalAlpha = alpha*Math.sin(phase*Math.PI)*.9;
        lctx.fillText(n,Math.cos(z.wobble+i)*zs*1.6,-phase*zs*2.5-zs*.3);
      });
      lctx.globalAlpha = alpha;
    }

    if(z.type==='boss'){
      lctx.fillStyle = '#ffd700';
      lctx.shadowColor = '#ffd700';
      lctx.shadowBlur = 10;
      lctx.beginPath();
      const cy2 = -zs*.46;
      lctx.moveTo(-zs*.28,cy2);
      lctx.lineTo(-zs*.28,cy2-zs*.2);
      lctx.lineTo(-zs*.14,cy2-zs*.08);
      lctx.lineTo(0,cy2-zs*.24);
      lctx.lineTo(zs*.14,cy2-zs*.08);
      lctx.lineTo(zs*.28,cy2-zs*.2);
      lctx.lineTo(zs*.28,cy2);
      lctx.fill();
      lctx.shadowBlur = 0;
    }
  }
  lctx.restore();

  if(!dead){
    const bw = zs*2.2, bh = Math.max(3,zs*.2), bx = -bw/2, by = zs*.58;
    lctx.fillStyle = 'rgba(0,0,0,.65)';
    lctx.fillRect(bx-1,by-1,bw+2,bh+2);
    const hpR = z.hp/z.maxHp;
    lctx.fillStyle = hpR>.5?'#0c0':hpR>.25?'#a80':'#c00';
    lctx.fillRect(bx,by,bw*hpR,bh);
    if(z.type==='boss'){
      lctx.font = `bold ${Math.max(8,zs*.38)}px Arial`;
      lctx.textAlign = 'center';
      lctx.fillStyle = '#f0f';
      lctx.shadowColor = '#f0f';
      lctx.shadowBlur = 6;
      lctx.fillText('BOSS',0,by+bh+10);
      lctx.shadowBlur = 0;
    }
  }
  lctx.restore();
}

function drawPlayer(lctx,p,s){
  const ps = p.size*s*.85;
  const w = G.weps[G.wepIdx];
  lctx.save();

  const angleNorm = ((p.angle+Math.PI/2)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
  const frame = Math.floor(angleNorm/(Math.PI*2)*8)%8;
  const pCol = frame%2, pRow = Math.floor(frame/2);
  const sprSz = ps*2.2;
  if(!drawSprFrame(lctx,IMG.player,pCol,pRow,2,4,0,-sprSz*.1,sprSz,sprSz,0)){
    if(p.shield>0){
      const sg = lctx.createRadialGradient(0,0,ps*.5,0,0,ps*1.7);
      sg.addColorStop(0,'rgba(0,229,255,.08)');
      sg.addColorStop(.7,'rgba(0,229,255,.14)');
      sg.addColorStop(1,'rgba(0,229,255,0)');
      lctx.fillStyle = sg;
      lctx.beginPath();
      lctx.arc(0,0,ps*1.7,0,Math.PI*2);
      lctx.fill();
      lctx.strokeStyle = 'rgba(0,229,255,.55)';
      lctx.lineWidth = 2;
      lctx.shadowColor = '#0ef';
      lctx.shadowBlur = 12;
      lctx.beginPath();
      lctx.arc(0,0,ps*1.55,0,Math.PI*2);
      lctx.stroke();
      lctx.shadowBlur = 0;
    }
    if(p.boost>0){
      for(let i=0;i<4;i++){
        const fa = i/4*Math.PI*2+G.bgTime*5;
        lctx.strokeStyle = 'rgba(255,215,0,.4)';
        lctx.lineWidth = ps*.16;
        lctx.lineCap = 'round';
        lctx.beginPath();
        lctx.moveTo(0,0);
        lctx.lineTo(Math.cos(fa)*ps*1.3,Math.sin(fa)*ps*1.3);
        lctx.stroke();
      }
    }
    lctx.fillStyle = 'rgba(0,0,0,.5)';
    lctx.beginPath();
    lctx.ellipse(0,ps*.9,ps*.6,ps*.18,0,0,Math.PI*2);
    lctx.fill();
    const la = Math.sin(G.bgTime*12)*(KEYS['w']||KEYS['s']||KEYS['a']||KEYS['d']?1:0)*.38;
    [[-ps*.2,ps*.3,la],[ps*.2,ps*.3,-la]].forEach(([lx,ly,lr])=>{
      lctx.save();
      lctx.translate(lx,ly);
      lctx.rotate(lr);
      lctx.fillStyle = '#1e3a5c';
      lctx.beginPath();
      lctx.roundRect(-ps*.12,0,ps*.24,ps*.46,ps*.05);
      lctx.fill();
      lctx.fillStyle = '#0f2040';
      lctx.beginPath();
      lctx.roundRect(-ps*.13,ps*.42,ps*.28,ps*.12,ps*.04);
      lctx.fill();
      lctx.restore();
    });
    lctx.fillStyle = 'rgba(0,0,0,.45)';
    lctx.beginPath();
    lctx.roundRect(-ps*.52,-ps*.1,ps*1.04,ps*.58,ps*.1);
    lctx.fill();
    const bg2 = lctx.createLinearGradient(-ps*.5,-ps*.1,ps*.5,ps*.45);
    bg2.addColorStop(0,p.boost>0?'#fbbf24':'#2563eb');
    bg2.addColorStop(1,p.boost>0?'#92400e':'#1e3a8a');
    lctx.fillStyle = bg2;
    lctx.beginPath();
    lctx.roundRect(-ps*.5,-ps*.08,ps,ps*.55,ps*.1);
    lctx.fill();
    lctx.save();
    lctx.translate(ps*.42,ps*.08);
    lctx.rotate(G.shootT>0?-G.shootT*.03:0);
    lctx.fillStyle = '#1e3a5c';
    lctx.beginPath();
    lctx.roundRect(-ps*.11,-ps*.09,ps*.22,ps*.38,ps*.05);
    lctx.fill();
    const gg = lctx.createLinearGradient(0,0,ps*.6,0);
    gg.addColorStop(0,'#374151');
    gg.addColorStop(1,w.color);
    lctx.fillStyle = gg;
    lctx.shadowColor = w.color;
    lctx.shadowBlur = G.shootT>2?12:4;
    lctx.beginPath();
    lctx.roundRect(ps*.08,-ps*.07,ps*.58,ps*.13,ps*.04);
    lctx.fill();
    lctx.shadowBlur = 0;
    if(G.shootT>2){
      const fl = G.shootT/10;
      lctx.shadowColor = '#fff';
      lctx.shadowBlur = 22*fl;
      lctx.fillStyle = `rgba(255,240,150,${fl})`;
      lctx.beginPath();
      lctx.arc(ps*.68,0,ps*.18*fl,0,Math.PI*2);
      lctx.fill();
      lctx.shadowBlur = 0;
    }
    lctx.restore();
    lctx.fillStyle = '#f5d5a0';
    lctx.beginPath();
    lctx.roundRect(-ps*.1,-ps*.24,ps*.2,ps*.18,ps*.04);
    lctx.fill();
    lctx.fillStyle = 'rgba(0,0,0,.45)';
    lctx.beginPath();
    lctx.ellipse(0,-ps*.28,ps*.34,ps*.38,0,0,Math.PI*2);
    lctx.fill();
    lctx.fillStyle = '#f5d5a0';
    lctx.beginPath();
    lctx.ellipse(0,-ps*.3,ps*.3,ps*.34,0,0,Math.PI*2);
    lctx.fill();
  }
  lctx.restore();
}

/* -- DRAW TP -- */
function drawTP(){
  const p = G.P, s = tpScale();
  const ox = CW()/2-p.x*s, oy = CH()/2-p.y*s;
  const W = CW(), H = CH();
  const TPPlayer = {
  x: 100, y: 100,
  state: 'idle',   // idle, walk, attack
  dir: 0,          // 0=down, 1=left, 2=right, 3=up
  frame: 0,
  timer: 0
};

function updateTPPlayer(dt){
  TPPlayer.timer += dt;

  if(TPPlayer.timer > 120){ // ms per frame
    TPPlayer.timer = 0;

    if(TPPlayer.state === 'walk'){
      TPPlayer.frame = (TPPlayer.frame + 1) % 4; // walk cycle
    } else if(TPPlayer.state === 'attack'){
      TPPlayer.frame = (TPPlayer.frame + 1) % 3; // attack cycle
    } else {
      TPPlayer.frame = 0; // idle frame
    }
  }
}
  ctx.save();
  if(G.shake>0) ctx.translate((Math.random()-.5)*G.shake,(Math.random()-.5)*G.shake);

  if(G.discoTimer>0){
    const dh = (G.discoAngle*40)%360;
    ctx.fillStyle = `hsl(${dh},40%,5%)`;
  }else{
    ctx.fillStyle = '#060810';
  }
  ctx.fillRect(0,0,W,H);

  ctx.save();
  ctx.globalAlpha = G.discoTimer>0?.2:.08;
  const gs = TW*s;
  const gox = (ox%gs+gs)%gs, goy = (oy%gs+gs)%gs;
  ctx.strokeStyle = G.discoTimer>0?`hsl(${(G.discoAngle*80)%360},80%,50%)`:'#0d2040';
  ctx.lineWidth = .5;
  for(let x=gox-gs;x<W+gs;x+=gs){
    ctx.beginPath();
    ctx.moveTo(x,0);
    ctx.lineTo(x,H);
    ctx.stroke();
  }
  for(let y=goy-gs;y<H+gs;y+=gs){
    ctx.beginPath();
    ctx.moveTo(0,y);
    ctx.lineTo(W,y);
    ctx.stroke();
  }
  ctx.restore();

/* BLOOD MOON SKY TINT (TP MODE) */
if (G.bloodMoonActive) {
  ctx.fillStyle = 'rgba(150, 10, 25, 0.28)';
  ctx.fillRect(0, 0, CW(), CH());
}
  for(let y=0;y<MSIZE;y++) for(let x=0;x<MSIZE;x++){
    if(worldMap[y][x]!==1) continue;
    const wx = ox+x*TW*s, wy = oy+y*TW*s, ws = TW*s+.5;
    ctx.fillStyle = '#0a1220';
    ctx.fillRect(wx,wy,ws,ws);
    const wg = ctx.createLinearGradient(wx,wy,wx+ws,wy+ws);
    wg.addColorStop(0,'#1a2840');
    wg.addColorStop(1,'#0d1a2a');
    ctx.fillStyle = wg;
    ctx.fillRect(wx+1,wy+1,ws-2,ws-2);
    ctx.strokeStyle = 'rgba(5,10,20,.8)';
    ctx.lineWidth = .8;
    const bh = ws/3;
    for(let b=1;b<3;b++){
      ctx.beginPath();
      ctx.moveTo(wx,wy+bh*b);
      ctx.lineTo(wx+ws,wy+bh*b);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(80,130,220,.06)';
    ctx.fillRect(wx,wy,ws,2);
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(wx+ws-2,wy,2,ws);
    ctx.fillRect(wx,wy+ws-2,ws,2);
  }

  ctx.save();
  for(const d of DECALS){
    const dx2 = ox+d.x*s, dy2 = oy+d.y*s;
    const bg2 = ctx.createRadialGradient(dx2,dy2,0,dx2,dy2,d.r*s);
    bg2.addColorStop(0,`rgba(110,0,0,${d.a})`);
    bg2.addColorStop(.5,`rgba(70,0,0,${d.a*.6})`);
    bg2.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = bg2;
    ctx.beginPath();
    ctx.arc(dx2,dy2,d.r*s,0,Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  for(const d of G.Deco){
    const dx2 = ox+d.x*s, dy2 = oy+d.y*s;
    ctx.save();
    ctx.translate(dx2,dy2);
    ctx.rotate(d.angle);
    if(d.type==='tomb'){
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath();
      ctx.ellipse(0,TW*s*.3,TW*s*.32,TW*s*.1,0,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#1e2d45';
      ctx.beginPath();
      ctx.roundRect(-TW*s*.26,-TW*s*.48,TW*s*.52,TW*s*.58,TW*s*.04);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0,-TW*s*.48,TW*s*.26,Math.PI,0);
      ctx.fill();
      ctx.fillStyle = 'rgba(100,140,200,.4)';
      ctx.font = `bold ${TW*s*.16}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('RIP',0,-TW*s*.26);
    }else{
      ctx.fillStyle = '#3a2010';
      ctx.beginPath();
      ctx.roundRect(-TW*s*.2,-TW*s*.3,TW*s*.4,TW*s*.5,TW*s*.05);
      ctx.fill();
      ctx.fillStyle = '#2a1505';
      ctx.fillRect(-TW*s*.16,-TW*s*.25,TW*s*.32,TW*s*.4);
    }
    ctx.restore();
  }

  for(const d of G.duckRain){
    ctx.globalAlpha = d.life/80;
    ctx.font = `${TW*s*.55}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🦆',d.x,d.y);
  }
  ctx.globalAlpha = 1;

  if(G.pizzaDrone){
    const dr = G.pizzaDrone;
    ctx.font = `${TW*s*.9}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#f60';
    ctx.shadowBlur = 18;
    ctx.fillText('🚁',W/2,dr.y);
    ctx.fillText('🍕',W/2+TW*s*.7,dr.y+TW*s*.5);
    ctx.shadowBlur = 0;
  }

  for(const pu of G.PUs){
    const px2 = ox+pu.x*s, py2 = oy+pu.y*s, pulse = Math.sin(pu.pulse)*3;
    ctx.save();
    ctx.translate(px2,py2);
    const pg = ctx.createRadialGradient(0,0,TW*s*.25,0,0,TW*s*.85+pulse);
    pg.addColorStop(0,'rgba(255,215,0,.15)');
    pg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(0,0,TW*s*.85+pulse,0,Math.PI*2);
    ctx.fill();
    ctx.shadowColor = '#fa0';
    ctx.shadowBlur = 12+pulse;
    ctx.font = `${TW*s*.75}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pu.type,0,2);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = .07;
  const lg = ctx.createRadialGradient(ox+p.x*s,oy+p.y*s,0,ox+p.x*s,oy+p.y*s,TW*s*7);
  lg.addColorStop(0,'rgba(80,120,220,.3)');
  lg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0,0,W,H);
  ctx.restore();

  if(G.ufo){
    const u = G.ufo;
    ctx.save();
    ctx.shadowColor = '#0f8';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#0f8';
    for(const b of u.bullets){
      const bx = ox+b.x*s, by = oy+b.y*s;
      ctx.beginPath();
      ctx.arc(bx,by,5,0,Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,255,136,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx,by);
      ctx.lineTo(bx-b.vx*4,by-b.vy*4);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    if(u.alive){
      const ux = ox+u.x*s, uy = oy+u.y*s;
      if(u.beamOn){
        const lg2 = ctx.createLinearGradient(ux,uy,ox+p.x*s,oy+p.y*s);
        lg2.addColorStop(0,'rgba(0,255,136,.6)');
        lg2.addColorStop(1,'rgba(0,255,136,0)');
        ctx.strokeStyle = lg2;
        ctx.lineWidth = TW*s*.4;
        ctx.beginPath();
        ctx.moveTo(ux,uy);
        ctx.lineTo(ox+p.x*s,oy+p.y*s);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(ux,uy);
      const ug = ctx.createRadialGradient(0,0,0,0,0,TW*s*2.5);
      ug.addColorStop(0,'rgba(0,255,136,.2)');
      ug.addColorStop(1,'rgba(0,255,136,0)');
      ctx.fillStyle = ug;
      ctx.beginPath();
      ctx.arc(0,0,TW*s*2.5,0,Math.PI*2);
      ctx.fill();
      ctx.rotate(u.angle);
      ctx.font = `${TW*s*2.1}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#0f8';
      ctx.shadowBlur = 25;
      ctx.fillText('🛸',0,0);
      ctx.shadowBlur = 0;
      const hpR = u.hp/20;
      ctx.strokeStyle = 'rgba(0,255,136,.15)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0,0,TW*s*1.3,0,Math.PI*2);
      ctx.stroke();
      ctx.strokeStyle = '#0f8';
      ctx.beginPath();
      ctx.arc(0,0,TW*s*1.3,-Math.PI/2,-Math.PI/2+hpR*Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  for(const z of G.Z){
    const zx = ox+z.x*s, zy = oy+z.y*s;
    const alpha = z.dead?Math.max(0,z.deadT/35):1;
    if(alpha<=0) continue;
    ctx.save();
    ctx.translate(zx,zy);
    if(z.type==='boss' && !z.dead){
      const ag = ctx.createRadialGradient(0,0,z.size*s*.5,0,0,z.size*s*2.5);
      ag.addColorStop(0,'rgba(255,0,255,.18)');
      ag.addColorStop(1,'rgba(255,0,255,0)');
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.arc(0,0,z.size*s*2.5,0,Math.PI*2);
      ctx.fill();
    }
    drawZombie(ctx,z,s,alpha);
    ctx.restore();
  }
  for(const b of G.Bullets){
    const bx = ox+b.x*s, by = oy+b.y*s;
    if(b.trail && b.trail.length>1){
      for(let i=1;i<b.trail.length;i++){
        ctx.globalAlpha = (i/b.trail.length)*.3;
        ctx.strokeStyle = b.col;
        ctx.lineWidth = Math.max(1,b.size*s*.6);
        ctx.beginPath();
        ctx.moveTo(ox+b.trail[i-1].x*s,oy+b.trail[i-1].y*s);
        ctx.lineTo(ox+b.trail[i].x*s,oy+b.trail[i].y*s);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    const bg3 = ctx.createRadialGradient(bx,by,0,bx,by,Math.max(3,b.size*s*.7)*2);
    bg3.addColorStop(0,'#fff');
    bg3.addColorStop(.3,b.col);
    bg3.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = bg3;
    ctx.beginPath();
    ctx.arc(bx,by,Math.max(3,b.size*s*.7)*2,0,Math.PI*2);
Ñ in    ctx.fill();
  }

  for(const pt of G.Parts){and
    ctx.globalAlpha = pt.lifebb/40;
    ctx.fillStyle = pt.col;
    ctx.shadowColor = pt.col;
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.arc(ox+pt.x*s,oy+pt.y*s,Math.max(1,pt.size*.5),0,
  ctx.save();
  ctx.translate(ox+p.x*s,oy+p.y*s);
  ctx.rotate(p.angle+Math.PI/2);
  drawPlayer(ctx,p,s);
  ctx.restore();

  for(const ft of G.FTs){
    ctx.save();
    ctx.globalAlpha = Math.min(1,ft.life/18);
    ctx.font = `bold ${Math.round(13*ft.scale)}px 'Arial Black',sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,.9)';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = ft.col;
    ctx.shadowBlur = 8;
    const fx = ox+ft.x*s, fy = oy+ft.y*s;
    ctx.strokeText(ft.txt,fx,fy);
    ctx.fillStyle = ft.col;
    ctx.fillText(ft.txt,fx,fy);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  if(G.staticTimer>0){
    ctx.fillStyle = `rgba(160,200,255,${.06+Math.random()*.05})`;
    ctx.fillRect(0,0,W,H);
    for(let i=0;i<H;i+=3){
      ctx.fillStyle = 'rgba(0,0,0,.09)';
      ctx.fillRect(0,i,W,1.5);
    }
  }
  if(G.discoTimer>0 && Math.random()<.035){
    ctx.fillStyle = 'rgba(255,255,255,.04)';
    ctx.fillRect(0,0,W,H);
  }

  ctx.restore();
  drawMinimap(ox,oy,s);
}

function drawMinimap(ox,oy,s){
  const mc = document.getElementById('minimap');
  if(!mc || mc.style.display==='none') return;
  const mctx = mc.getContext('2d'), mw = mc.width, mh = mc.height, ms = mw/(TW*MSIZE);
  mctx.fillStyle = 'rgba(0,0,5,.92)';
  mctx.fillRect(0,0,mw,mh);
  for(let y=0;y<MSIZE;y++) for(let x=0;x<MSIZE;x++){
    if(worldMap[y][x]===1){
      mctx.fillStyle = '#1a2a40';
      mctx.fillRect(x*TW*ms,y*TW*ms,TW*ms-.5,TW*ms-.5);
    }
  }
  for(const z of G.Z){
    if(!z.dead){
      mctx.fillStyle = z.type==='boss'?'#f0f':'#c00';
      mctx.beginPath();
      mctx.arc(z.x*ms,z.y*ms,2.5,0,Math.PI*2);
      mctx.fill();
    }
  }
  mctx.fillStyle = '#3b8';
  mctx.shadowColor = '#5fa';
  mctx.shadowBlur = 4;
  mctx.beginPath();
  mctx.arc(G.P.x*ms,G.P.y*ms,3.5,0,Math.PI*2);
  mctx.fill();
  mctx.shadowBlur = 0;
  mctx.strokeStyle = '#3b8';
  mctx.lineWidth = 1.5;
  mctx.beginPath();
  mctx.moveTo(G.P.x*ms,G.P.y*ms);
  mctx.lineTo(G.P.x*ms+Math.cos(G.P.angle)*8,G.P.y*ms+Math.sin(G.P.angle)*8);
  mctx.stroke();
  mctx.strokeStyle = '#1a2a40';
  mctx.lineWidth = 1;
  mctx.strokeRect(0,0,mw,mh);
}

/* -- DRAW FP -- */
function drawFP(){
  const p = G.P, W = CW(), H = CH();
  ctx.save();
  if(G.shake>0) ctx.translate((Math.random()-.5)*G.shake,(Math.random()-.5)*G.shake);

  function updateFPWeapon(dt){
  const w = G.weps[G.curWep];

  // fire animation
  if(G.shootT > 0){
    G.shootT -= dt;
    G.weaponFrame = 1; // fire frame
  } else {
    G.weaponFrame = 0; // idle frame
  }

  // reload animation
  if(G.reloading){
    G.rlProg += dt;
    G.weaponFrame = 2; // reload frame
    if(G.rlProg >= w.reloadTime){
      G.reloading = false;
      G.rlProg = 0;
      G.weaponFrame = 0;
    }
  }
}
if(G.discoTimer>0){
    const dh = (G.discoAngle*40)%360;
    ctx.fillStyle = `hsl(${dh},65%,12%)`;
    ctx.fillRect(0,0,W,H/2);
    ctx.fillStyle = `hsl(${(dh+180)%360},55%,8%)`;
    ctx.fillRect(0,H/2,W,H/2);
  }else{
    const sg = ctx.createLinearGradient(0,0,0,H/2);
    sg.addColorStop(0,'#010208');
    sg.addColorStop(.65,'#040c18');
    sg.addColorStop(1,'#0a1828');
    ctx.fillStyle = sg;
    ctx.fillRect(0,0,W,H/2);
    for(let i=0;i<60;i++){
      const sx = ((i*179+31)%W), sy = ((i*89+7)%(H*.44));
      const tw = .4+Math.sin(G.bgTime*1.2+i)*.35;
      ctx.fillStyle = `rgba(255,255,255,${tw*.45})`;
      ctx.fillRect(sx,sy,1.2,1.2);
    }
    const fg2 = ctx.createLinearGradient(0,H/2,0,H);
    fg2.addColorStop(0,'#0c1520');
    fg2.addColorStop(1,'#040810');
    ctx.fillStyle = fg2;
    ctx.fillRect(0,H/2,W,H/2);
    ctx.strokeStyle = 'rgba(20,50,100,.18)';
    ctx.lineWidth = .5;
    for(let i=1;i<=10;i++){
      const y = H/2+i*(H/2)/10;
      ctx.beginPath();
      ctx.moveTo(0,y);
      ctx.lineTo(W,y);
      ctx.stroke();
    }
  }
/* BLOOD MOON SKY TINT (FP MODE) */
if (G.bloodMoonActive) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(200, 40, 60, 0.45)');
  g.addColorStop(1, 'rgba(120, 10, 20, 0.25)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
  const FOV = Math.PI/2.4, RAYS = Math.min(Math.floor(W),400), sliceW = W/RAYS;
  const zBuf = [];
  for(let r=0;r<RAYS;r++){
    const ra = p.angle-FOV/2+(r/RAYS)*FOV;
    let mapX = Math.floor(p.x/TW), mapY = Math.floor(p.y/TW);
    const rdx = Math.cos(ra), rdy = Math.sin(ra);
    const dX = Math.abs(1/rdx)||1e30, dY = Math.abs(1/rdy)||1e30;
    const sx = rdx<0?-1:1, sy = rdy<0?-1:1;
    let sdX = (rdx<0?(p.x/TW-mapX):(mapX+1-p.x/TW))*dX;
    let sdY = (rdy<0?(p.y/TW-mapY):(mapY+1-p.y/TW))*dY;
    let hit = false, side = 0;
    for(let dda=0;dda<50&&!hit;dda++){
      if(sdX<sdY){ sdX+=dX; mapX+=sx; side=0; }
      else{ sdY+=dY; mapY+=sy; side=1; }
      if(mapX<0||mapY<0||mapX>=MSIZE||mapY>=MSIZE) hit = true;
      else if(worldMap[mapY][mapX]===1) hit = true;
    }
    const pd = side===0?(sdX-dX):(sdY-dY);
    const cd = pd*Math.cos(ra-p.angle);
    zBuf[r] = pd;
0    const wh = Math.min(H*2.5,(TW*14)/Math.max(cd,.01));
    const wt = Math.max(0,(H-wh)/2);
    const bright = Math.max(0,1-pd/18);
    const dim = side===1?.7:1;
    const sw2 = Math.ceil(sliceW)+1;
    if(G.discoTimer>0){
      const dh2 = (r/RAYS*360+G.discoAngle*60)%360;
      ctx.fillStyle = `hsl(${dh2},80%,${Math.floor((18+bright*45)*dim)}%)`;
    }else{
      const rv = Math.floor(bright*dim*148),
            gv = Math.floor(bright*dim*108),
            bv = Math.floor(bright*dim*78);
      ctx.fillStyle = `rgb(${rv},${gv},${bv})`;
    }
    ctx.fillRect(r*sliceW,wt,sw2,wh);
    if(bright>.3 && side===0){
      ctx.fillStyle = `rgba(200,160,100,${bright*dim*.12})`;
      ctx.fillRect(r*sliceW,wt,sw2,3);
    }
    const fogA = Math.min(.96,Math.pow(pd/18,1.6));
    ctx.fillStyle = `rgba(4,8,16,${fogA})`;
    ctx.fillRect(r*sliceW,wt,sw2,wh);
  }

  const sprList = [];
  for(const z of G.Z) if(!z.dead) sprList.push({type:'z',ref:z,x:z.x,y:z.y});
  for(const pu of G.PUs) sprList.push({type:'pu',ref:pu,x:pu.x,y:pu.y});
  if(G.ufo?.alive) sprList.push({type:'ufo',ref:G.ufo,x:G.ufo.x,y:G.ufo.y});
  sprList.sort((a,b)=>Math.hypot(b.x-p.x,b.y-p.y)-Math.hypot(a.x-p.x,a.y-p.y));

  for(const sp of sprList){
    const sdx = sp.x-p.x, sdy = sp.y-p.y, dist = Math.hypot(sdx,sdy);
    if(dist<.3) continue;
    let ad = Math.atan2(sdy,sdx)-p.angle;
    while(ad>Math.PI)  ad -= Math.PI*2;
    while(ad<-Math.PI) ad += Math.PI*2;
    if(Math.abs(ad)>FOV*.75) continue;
    const sx2 = W/2+(ad/FOV)*W;
    const ri = Math.floor(sx2/sliceW);
    if(ri<0||ri>=RAYS||zBuf[ri]<dist*.88) continue;
    const sbright = Math.max(.12,1-dist/15);
    const h2 = Math.min(H*1.7,(sp.ref.size||TW*.35)*TW*16/Math.max(dist,.3));
    ctx.save();
    ctx.translate(sx2,H/2);
    ctx.globalAlpha = Math.min(1,sbright+.12);
    if(sp.type==='ufo'){
      ctx.font = `${h2*1.1}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#0f8';
      ctx.shadowBlur = 20;
      ctx.fillText('🛸',0,0);
      ctx.shadowBlur = 0;
    }else if(sp.type==='pu'){
      ctx.font = `${h2*.9}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#fa0';
      ctx.shadowBlur = 14+Math.sin(G.bgTime*4)*4;
      ctx.fillText(sp.ref.type,0,0);
      ctx.shadowBlur = 0;
    }else{
      const z = sp.ref;
      if(z.dancing) ctx.rotate(Math.sin(z.wobble*3)*.3);
      if(z.makeover){
        ctx.font = `${h2}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💅',0,0);
        ctx.restore();
        continue;
      }
      if(z.type==='cow'){
        ctx.font = `${h2*1.1}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐄',0,0);
        ctx.restore();
        continue;
      }
      const wc = Math.floor(z.wobble*2)%3, zrow = z.type==='fast'?1:0;
      const sprH = h2*1.3, sprW = sprH*.75;
      if(!drawSprFrame(ctx,IMG.zombie,wc,zrow,5,5,0,-sprH*.05,sprW,sprH,0)){
        const hue = z.type==='boss'?300:z.type==='tank'?25:z.type==='fast'?165:110;
        if(z.type==='boss'){
          ctx.shadowColor = '#f0f';
          ctx.shadowBlur = 25;
        }
        ctx.fillStyle = 'rgba(0,0,0,.5)';
        ctx.fillRect(-h2*.52,-h2*.52,h2*1.04,h2*1.04);
        ctx.fillStyle = `hsl(${hue},60%,${25+sbright*18})`;
        ctx.fillRect(-h2*.5,-h2*.5,h2,h2);
        ctx.shadowBlur = 0;
        ctx.fillStyle = z.stunned?'#94a3b8':'#fff';
        ctx.fillRect(-h2*.22,-h2*.35,h2*.16,h2*.14);
        ctx.fillRect(h2*.07,-h2*.35,h2*.16,h2*.14);
        ctx.fillStyle = z.type==='boss'?'#f0f':'#f00';
        ctx.fillRect(-h2*.2,-h2*.33,h2*.12,h2*.1);
        ctx.fillRect(h2*.09,-h2*.33,h2*.12,h2*.1);
        ctx.strokeStyle = 'rgba(0,0,0,.7)';
        ctx.lineWidth = h2*.07;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if(z.dancing){
          ctx.arc(0,h2*.15,h2*.15,0,Math.PI);
        }else{
          ctx.moveTo(-h2*.16,h2*.2);
          ctx.lineTo(0,h2*.25);
          ctx.lineTo(h2*.16,h2*.2);
        }
        ctx.stroke();
      }
      const bw = h2*.85, bh = Math.max(2,h2*.07);
      ctx.fillStyle = 'rgba(0,0,0,.7)';
      ctx.fillRect(-bw/2,h2*.56,bw,bh+1);
      const hpR = z.hp/z.maxHp;
      ctx.fillStyle = hpR>.5?'#0c0':hpR>.25?'#a80':'#c00';
      ctx.fillRect(-bw/2,h2*.56,bw*hpR,bh);
      if(z.type==='boss'){
        ctx.font = `bold ${Math.max(8,h2*.1)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f0f';
        ctx.shadowColor = '#f0f';
        ctx.shadowBlur = 5;
        ctx.fillText('BOSS',0,h2*.72);
        ctx.shadowBlur = 0;
      }
    }
    ctx.restore();
  }

  if(G.ufo){
    ctx.save();
    ctx.shadowColor = '#0f8';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#0f8';
    for(const b of G.ufo.bullets){
      const sdx = b.x-p.x, sdy = b.y-p.y, dist = Math.hypot(sdx,sdy)||1;
      let ad = Math.atan2(sdy,sdx)-p.angle;
      while(ad>Math.PI)  ad -= Math.PI*2;
      while(ad<-Math.PI) ad += Math.PI*2;
      if(Math.abs(ad)<FOV*.8){
        const sx2 = W/2+(ad/FOV)*W;
        const h3 = Math.min(H,(20)/(dist*.1||1));
        ctx.beginPath();
        ctx.arc(sx2,H/2,Math.min(12,h3*.5),0,Math.PI*2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawWeapon();

  if(G.staticTimer>0){
    ctx.fillStyle = `rgba(160,200,255,${.07+Math.random()*.05})`;
    ctx.fillRect(0,0,W,H);
    for(let i=0;i<H;i+=3){
      ctx.fillStyle = 'rgba(0,0,0,.1)';
      ctx.fillRect(0,i,W,1.5);
    }
  }

  for(const ft of G.FTs){
    ctx.save();
    ctx.globalAlpha = Math.min(1,ft.life/18);
    ctx.font = `bold ${Math.round(14*ft.scale)}px 'Arial Black',sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,.9)';
    ctx.lineWidth = 3;
    ctx.shadowColor = ft.col;
    ctx.shadowBlur = 7;
    const fdx = ft.x-p.x, fdy = ft.y-p.y;
    let fad = Math.atan2(fdy,fdx)-p.angle;
    while(fad>Math.PI)  fad -= Math.PI*2;
    while(fad<-Math.PI) fad += Math.PI*2;
    if(Math.abs(fad)<FOV){
      const sx2 = W/2+(fad/FOV)*W;
      const sy  = H/2-Math.min(H*.28,H*1.8/(Math.hypot(fdx,fdy)+.5));
      ctx.strokeText(ft.txt,sx2,sy);
      ctx.fillStyle = ft.col;
      ctx.fillText(ft.txt,sx2,sy);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  if(!document.pointerLockElement){
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.beginPath();
    ctx.roundRect(W/2-210,H/2-25,420,50,7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,0,0,.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = 'bold 15px Arial';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🖱  CLICK GAME TO LOCK MOUSE & AIM',W/2,H/2);
  }

  ctx.restore();
}

/* -- WEAPON DRAW -- */
function drawWeapon(){
  const W = CW(), H = CH();
  const w = G.weps[G.wepIdx];
  const t = Date.now();
  const bob = Math.sin(t*.0026)*5+Math.sin(t*.0043)*2.5;
  const sway = Math.sin(t*.0017)*4;
  const recoil = G.shootT>0?G.shootT*5:0;
  const tilt = G.reloading?Math.sin(G.rlProg*Math.PI)*-18:0;
  ctx.save();
  ctx.translate(W*.7+sway,H*.65+bob+recoil);
  ctx.rotate(tilt*Math.PI/180);
  const sc = H/600;
  ctx.scale(sc,sc);
  ctx.save();
  ctx.globalAlpha = .28;
  ctx.filter = 'blur(7px)';
  ctx.font = '118px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#000';
  ctx.fillText(w.ico,9,9);
  ctx.restore();
  if(G.shootT>2){
    const fl = G.shootT/10;
    ctx.save();
    ctx.translate(-55,-85);
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 32*fl;
    const fg = ctx.createRadialGradient(0,0,0,0,0,30*fl);
    fg.addColorStop(0,'rgba(255,255,255,1)');
    fg.addColorStop(.3,`rgba(255,220,100,${fl})`);
    fg.addColorStop(1,'rgba(255,100,0,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(0,0,30*fl,0,Math.PI*2);
    ctx.fill();
    for(let i=0;i<8;i++){
      const fa = i/8*Math.PI*2+(t*.012);
      const len = 16+Math.random()*32*fl;
      ctx.strokeStyle = `rgba(255,200,80,${fl*.7})`;
      ctx.lineWidth = 3*fl;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.lineTo(Math.cos(fa)*len,Math.sin(fa)*len);
      ctx.stroke();
    function updateWeapon(dt){
     const w = G.weps[G.curWep];
  // fire animation
  if(G.shootT > 0){
     G.shootT -= dt;
     G.weaponFrame = 1; // fire frame
  } else {
     G.weaponFrame = 0; // idle frame
  }
  // reload animation
   if(G.reloading){
      G.rlProg += dt;
      G.weaponFrame = 2; // reload frame
   if(G.rlProg >= w.reloadTime){
      G.reloading = false;
      G.rlProg = 0;
      G.weaponFrame = 0;
    }
  }
}
  
}

    ctx.shadowBlur = 0;
    ctx.restore();
  }
  ctx.font = '116px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = w.color;
  ctx.shadowBlur = G.shootT>2?24:9;
  ctx.fillText(w.ico,0,0);
  ctx.shadowBlur = 0;
  if(G.reloading){
    ctx.save();
    ctx.translate(0,-148);
    ctx.strokeStyle = 'rgba(20,5,40,.8)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0,0,37,0,Math.PI*2);
    ctx.stroke();
    ctx.strokeStyle = w.color;
    ctx.shadowColor = w.color;
    ctx.shadowBlur = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0,0,37,-Math.PI/2,-Math.PI/2+G.rlProg*Math.PI*2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = w.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RELOAD',0,0);
    ctx.restore();
  }
  const cur = G.weps[G.wepIdx].cur, max = w.ammo, dm = Math.min(max,24);
  ctx.save();
  ctx.translate(-(dm-1)*4.5,-152);
  for(let i=0;i<dm;i++){
    ctx.fillStyle = i<cur?w.color:'rgba(20,5,40,.8)';
    if(i<cur){
      ctx.shadowColor = w.color;
      ctx.shadowBlur = 4;
    }
    ctx.beginPath();
    ctx.arc(i*9,0,2.8,0,Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
  ctx.restore();
}

/* -- MAIN LOOP -- */
function loop() {
  if (!G.running) return;

  // Draw all entities dynamically
  for (const e of ENTITIES) {
    drawEntity(e);
  }

  // Update all entities
  update();

  // Render world
  if (G.viewMode === 'fp') {
    drawFP();
  } else {
    drawTP();
  }

  animId = requestAnimationFrame(loop);
}
/* -- ENEMY AI MODULE -- */
function getPlayerEntity() {
  return ENTITIES.find(e => e.name === 'player');
}

function enemyChasePlayer(enemy) {
  const player = getPlayerEntity();
  if (!player) return;

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy);

  if (dist > enemy.aggroRange) return;

  const nx = dx / dist;
  const ny = dy / dist;

  enemy.x += nx * enemy.speed;
  enemy.y += ny * enemy.speed;
}

function enemyStrafeAndCharge(enemy) {
  const player = getPlayerEntity();
  if (!player) return;

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy);

  if (dist > enemy.aggroRange) return;

  const nx = dx / dist;
  const ny = dy / dist;

  const sx = -ny;
  const sy = nx;

  if (dist > 180) {
    enemy.x += sx * (enemy.speed * 0.9);
    enemy.y += sy * (enemy.speed * 0.9);
  } else {
    enemy.x += nx * (enemy.speed * 2.2);
    enemy.y += ny * (enemy.speed * 2.2);
/* -- ENEMY ATTACK + DAMAGE SYSTEM -- */
function enemyTryAttack(enemy) {
  const player = ENTITIES.find(e => e.name === 'player');
  if (!player) return;

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy);

  // Attack range
  if (dist > (enemy.attackRange || 40)) return;

  // Attack cooldown
  if (!enemy.attackCooldown) enemy.attackCooldown = 0;
  if (enemy.attackCooldown > 0) {
    enemy.attackCooldown--;
    return;
  }

  // Damage player
  const dmg = enemy.damage || 5;

  if (!G.P.invuln) {
    G.P.hp -= dmg;

    // Hit flash
    G.P.hitFlash = 1;

    // SFX
    if (SFX && SFX.hurt) SFX.hurt();

    // Knockback
    const nx = dx / dist;
    const ny = dy / dist;
    player.x -= nx * 10;
    player.y -= ny * 10;

    // Invulnerability frames
    G.P.invuln = 20;
  }

  // Reset cooldown
  enemy.attackCooldown = enemy.attackSpeed || 30;
}
  }
}

/* -- ENTITY LIST -- */
const ENTITIES = [
  {
    name: 'player',
    fp: IMG.playerFP,
    tp: IMG.playerTP,
    x: 100,
    y: 100,
    frame: 0,
    frameMax: 4,
    frameSpeed: 6,
    frameTick: 0,
    update() {
      // player movement logic here
    }
  },

  {
  name: 'zombie',
  fp: IMG.zombieFP,
  tp: IMG.zombieTP,
  x: 300,
  y: 200,
  speed: 0.8,
  aggroRange: 260,
  attackRange: 40,
  damage: 6,
  attackSpeed: 30,
  update() {
    enemyChasePlayer(this);
    enemyTryAttack(this);
  }
}
{
  name: 'boss',
  fp: IMG.bossFP,
  tp: IMG.bossTP,
  x: 500,
  y: 120,
  speed: 1.2,
  aggroRange: 400,
  attackRange: 60,
  damage: 12,
  attackSpeed: 20,
  update() {
    enemyStrafeAndCharge(this);
    enemyTryAttack(this);
  }
}
  { name: 'cow',   fp: IMG.cowFP,   tp: IMG.cowTP,   x: 0, y: 0 },
  { name: 'ufo',   fp: IMG.ufoFP,   tp: IMG.ufoTP,   x: 0, y: 0 },
  { name: 'clown', fp: IMG.clownFP, tp: IMG.clownTP, x: 0, y: 0 }
];

/* -- ENTITY UPDATE WRAPPER -- */
function update() {
  for (const e of ENTITIES) {
    if (e.update) e.update();
  }
}

/* -- ENTITY DRAWER -- */
function drawEntity(entity) {
  const spr = (G.viewMode === 'fp') ? entity.fp : entity.tp;
  const frame = entity.frame || 0;
  drawSprFrame(ctx, spr, entity.x, entity.y, frame);
}
/* -- VIEW TOGGLE -- */
function toggleView(){
  if(!G) return;
  G.viewMode = G.viewMode==='fp'?'tp':'fp';
  const cr = document.getElementById('crosshair');
  if(cr) cr.className = G.viewMode==='fp'?'show':'';
  const mm = document.getElementById('minimap');
  if(mm) mm.style.display = G.viewMode==='tp'?'block':'none';
  if(G.viewMode==='tp' && document.pointerLockElement) document.exitPointerLock();
  if(isMobile){
    const vfp = document.getElementById('vt-fp');
    const vtp = document.getElementById('vt-tp');
    if(vfp && vtp){
      if(G.viewMode==='fp'){
        vfp.style.color = 'var(--teal,#0ef)';
        vtp.style.color = '#444';
      }else{
        vtp.style.color = 'var(--teal,#0ef)';
        vfp.style.color = '#444';
      }
    }
  }
}

/* ========================= */
/*      MOBILE TOUCH                     */
/* ========================= */

(function setupTouch(){
  if(!isMobile) return;

  const jz = document.getElementById('jz');
  const jk = document.getElementById('jk');
  const fb = document.getElementById('fire-btn');

  let joyIdLocal = -1;
  let joyBaseLocal = {x:0,y:0};

  document.addEventListener('touchstart', e => {
    e.preventDefault();

    for(const t of e.changedTouches){
      const el = document.elementFromPoint(t.clientX, t.clientY);

      // joystick zone
      if(el === jz || (jz && jz.contains(el))){
        joyIdLocal = t.identifier;
        joyBaseLocal = {x:t.clientX, y:t.clientY};
      }

      // fire button
      else if(el === fb || (fb && fb.contains(el))){
        fireTouchId = t.identifier;
        fireTouchActive = true;
        fb.classList.add('pressed');
        hideFiHint();
        gac(); // fire
      }

      // aim zone
      else if(t.clientX > window.innerWidth * 0.4){
        aimId = t.identifier;
        aimLastX = t.clientX;
      }
    }
  }, {passive:false});

  document.addEventListener('touchmove', e => {
    e.preventDefault();

    for(const t of e.changedTouches){

      // joystick movement
      if(t.identifier === joyIdLocal){
        const dx = t.clientX - joyBaseLocal.x;
        const dy = t.clientY - joyBaseLocal.y;
        const dist = Math.min(Math.hypot(dx,dy), 50);
        const a = Math.atan2(dy, dx);

        joyDelta = {
          x: Math.cos(a) * (dist/50),
          y: Math.sin(a) * (dist/50)
        };

        if(jk){
          jk.style.left = (50 + joyDelta.x * 35) + '%';
          jk.style.top  = (50 + joyDelta.y * 35) + '%';
          jk.style.transform = 'translate(-50%, -50%)';
        }
      }

      // aim movement
      if(t.identifier === aimId){
        if(G.viewMode === 'fp'){
          mouseDX += (t.clientX - aimLastX) * 0.006;
        } else {
          MX = t.clientX;
          MY = t.clientY;
        }
        aimLastX = t.clientX;
      }
    }
  }, {passive:false});

  document.addEventListener('touchend', e => {
    for(const t of e.changedTouches){

      // joystick release
      if(t.identifier === joyIdLocal){
        joyIdLocal = -1;
        joyDelta = {x:0,y:0};

        if(jk){
          jk.style.left = '50%';
          jk.style.top  = '50%';
          jk.style.transform = 'translate(-50%, -50%)';
        }
      }

      // fire release
      if(t.identifier === fireTouchId){
        fireTouchId = -1;
        fireTouchActive = false;
        fb.classList.remove('pressed');
      }

      // aim release
      if(t.identifier === aimId){
        aimId = -1;
        aimLastX = 0;
      }
    }
 
/* ========================= */
/*      CANVAS SETUP                     */
/* ========================= */

(function setupCanvas(){
  canvas = document.getElementById('gc');

  function resize(){
    canvas.width  = window.innerWidth * DPR;
    canvas.height = window.innerHeight * DPR;
    ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);
  }

  window.addEventListener('resize', resize);
  resize();

  // local unlock
  if(localStorage.getItem('dw_full') === 'true'){
    const fb = document.getElementById('full-btn');
    if(fb){
      fb.textContent = '✓ FULL GAME UNLOCKED';
      fb.onclick = () => {
        G.fullGame = true;
        G.demo = false;
        updateMenuIndicators();
        showScr('ts');
      };
    }
  }
})();




