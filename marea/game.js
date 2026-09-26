(() => {
'use strict';
const W=1280,H=720,X=390,TAU=Math.PI*2;
const canvas=document.getElementById('screen'),ctx=canvas.getContext('2d',{alpha:false});
const music=document.getElementById('music'),tracks=[music,document.getElementById('musicNight'),document.getElementById('musicStorm')].filter(Boolean),start=document.getElementById('start'),sound=document.getElementById('soundButton');
const gameOver=document.getElementById('gameOver'),scoreForm=document.getElementById('scoreForm'),scoreList=document.getElementById('highscores'),initials=document.getElementById('initials');
const C={ink:'#101028',cream:'#ffe8a3',pink:'#ff5198',mint:'#baf0ce',teal:'#28cfc8'};
const SKIN='#c98d79',SUIT='#14283f';
const BLOND='#e9bf73',BLOND_SHADOW='#ba8848';
const characters=[
 {name:'RUBIO',skin:'#c98d79',suit:'#14283f',accent:'#087f88',highlight:'#63d2ca',hair:BLOND,shadow:BLOND_SHADOW,build:1,eyes:'#36d8d1'},
 {name:'PUNK',skin:'#e0a38e',suit:'#492365',accent:'#b041a8',highlight:'#d9f76d',hair:'#f158a6',shadow:'#8a2a91',build:.92,eyes:'#d9f76d'},
 {name:'ATLAS',skin:'#734936',suit:'#1a396d',accent:'#e56d3e',highlight:'#f7b564',hair:'#19152b',shadow:'#0c1026',build:1.22,eyes:'#e9d0a7'},
 {name:'YUNA',skin:'#d3a387',suit:'#7d253d',accent:'#d55159',highlight:'#ffe6ad',hair:'#19172c',shadow:'#383046',build:.94,eyes:'#23213e'}
];
let characterIndex=0;try{characterIndex=Math.max(0,Math.min(3,Number(localStorage.getItem('marea.character.v1'))||0))|0}catch{}
let audioGraph=null;
let s;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const seed=i=>((Math.sin(i*127.1+17.3)*43758.5453)%1+1)%1;
const hex=h=>h[0]==='#'?[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)):h.match(/\d+/g).slice(0,3).map(Number);
const rgb=(a,b,t)=>{const A=hex(a),B=hex(b);return `rgb(${A.map((v,i)=>Math.round(mix(v,B[i],t))).join(',')})`};
const GIANT_START=12000,GIANT_SPACING=15600;
function giantIndex(p){return Math.max(0,Math.round((p-GIANT_START)/GIANT_SPACING))}
function giantDistance(p){return p-(GIANT_START+GIANT_SPACING*giantIndex(p))}
function giantCore(p){const d=giantDistance(p)/380;return Math.exp(-2*d*d)}
function giantPresence(p){return smooth((1500-Math.abs(giantDistance(p)))/1000)}
function nightLevel(world){const p=((world/2600)%4+4)%4;return smooth((p-1.65)/.35)*(1-smooth((p-2.8)/.3))}
function calmLevel(world){const p=((world/2600)%4+4)%4;return smooth((p-2.38)/.16)*(1-smooth((p-2.68)/.08))}
function setupAudio(){
 if(audioGraph)return;const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
 try{
  const ac=new Audio(),master=ac.createGain(),filter=ac.createBiquadFilter();
  filter.type='lowpass';filter.connect(master);
  const trackGains=tracks.map((track,i)=>{const source=ac.createMediaElementSource(track),gain=ac.createGain();gain.gain.value=i?0:.75;source.connect(gain).connect(filter);return gain});
  const pads=[110,165].map((freq,i)=>{const osc=ac.createOscillator(),gain=ac.createGain();osc.type=i?'sine':'triangle';osc.frequency.value=freq;gain.gain.value=.015;osc.connect(gain).connect(master);osc.start();return {osc,gain}});
  const leadOsc=ac.createOscillator(),leadGain=ac.createGain();leadOsc.type='sine';leadGain.gain.value=.0001;leadOsc.connect(leadGain).connect(master);leadOsc.start();
  const bassOsc=ac.createOscillator(),bassGain=ac.createGain();bassOsc.type='triangle';bassGain.gain.value=0;bassOsc.connect(bassGain).connect(master);bassOsc.start();
  const echo=ac.createDelay(1.5),feedback=ac.createGain(),echoFilter=ac.createBiquadFilter(),echoWet=ac.createGain();echo.delayTime.value=.43;feedback.gain.value=.31;echoFilter.type='lowpass';echoFilter.frequency.value=1900;echoWet.gain.value=.38;echo.connect(echoFilter).connect(feedback).connect(echo);echo.connect(echoWet).connect(master);
  const buffer=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const noise=ac.createBufferSource(),noiseFilter=ac.createBiquadFilter(),rainGain=ac.createGain(),oceanFilter=ac.createBiquadFilter(),oceanGain=ac.createGain();noise.buffer=buffer;noise.loop=true;noiseFilter.type='bandpass';noiseFilter.frequency.value=630;noiseFilter.Q.value=.36;rainGain.gain.value=0;noise.connect(noiseFilter).connect(rainGain).connect(master);oceanFilter.type='lowpass';oceanFilter.frequency.value=280;oceanGain.gain.value=0;noise.connect(oceanFilter).connect(oceanGain).connect(master);noise.start();
  master.gain.value=0;master.connect(ac.destination);tracks.forEach(track=>track.volume=1);
  audioGraph={ac,master,filter,trackGains,pads,rainGain,oceanGain,leadOsc,leadGain,bassOsc,bassGain,echo,melodyStep:-1};ac.resume().catch(()=>{})
 }catch(e){audioGraph=null}
}
function waterBell(g,frequency,volume,time){
 const {ac,master,echo}=g,osc=ac.createOscillator(),shimmer=ac.createOscillator(),envelope=ac.createGain(),high=ac.createGain();
 osc.type='sine';osc.frequency.setValueAtTime(frequency,time);osc.frequency.exponentialRampToValueAtTime(frequency*.996,time+1.4);
 shimmer.type='sine';shimmer.frequency.value=frequency*2.01;high.gain.value=.12;shimmer.connect(high).connect(envelope);
 envelope.gain.setValueAtTime(.0001,time);envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+.026);envelope.gain.exponentialRampToValueAtTime(.0001,time+1.85);
 osc.connect(envelope);envelope.connect(master);envelope.connect(echo);osc.start(time);shimmer.start(time);osc.stop(time+1.9);shimmer.stop(time+1.9)
}
function updateAudio(p,dt){
 const phase=p.phase,storm=p.rain,night=p.night,nightMix=smooth((phase-.8)/.8)*(1-smooth((phase-2.6)/.5)),weights=[Math.max(0,1-nightMix-storm),nightMix,storm],flourish=clamp(s.giantSuccess/2.5,0,1),duck=(1-.86*p.giant*(1-flourish))*(1-.75*p.calm);
 if(!audioGraph){tracks.forEach((track,i)=>track.volume=music.muted?0:.32*weights[i]*duck);return}
 const g=audioGraph,{ac,master,filter,trackGains,pads,rainGain}=g,t=ac.currentTime,muted=music.muted||music.paused;
 master.gain.setTargetAtTime(muted?0:.42,t,.24);
 trackGains.forEach((gain,i)=>gain.gain.setTargetAtTime(.47*weights[i]*duck,t,.4));
 filter.frequency.setTargetAtTime(5200-night*2200-storm*2250,t,.8);
 const dusk=smooth((phase-.75)/.3)*(1-smooth((phase-1.8)/.3)),notes=[110-12*dusk-28*night-37*storm,164.81-18*dusk-41*night-54*storm];
 pads.forEach(({osc,gain},i)=>{osc.frequency.setTargetAtTime(notes[i]*(1+flourish*.04),t,1.4);gain.gain.setTargetAtTime((i?.012:.018)*(1+night*.55+storm*.25+flourish*.9)*duck,t,.5)});
 rainGain.gain.setTargetAtTime(storm*.045,t,.5);
 g.oceanGain.gain.setTargetAtTime(p.giant*(1-flourish)*.3+p.calm*.013,t,.35);
 const stage=Math.floor(phase),step=Math.floor(s.clock*1.6);
 if(step!==g.melodyStep){
  g.melodyStep=step;
  const scales=[[293.66,369.99,440,493.88,587.33,739.99],[261.63,329.63,392,440,523.25,659.25],[220,277.18,329.63,392,440,554.37],[196,246.94,293.66,349.23,392,493.88]];
  const pattern=[0,3,5,2,4,1,3,0,5,2,4,1],note=scales[stage][pattern[step%pattern.length]];
  g.leadOsc.frequency.setTargetAtTime(note,t,.09);
  g.leadGain.gain.cancelScheduledValues(t);g.leadGain.gain.setValueAtTime(.0001,t);g.leadGain.gain.exponentialRampToValueAtTime((stage===3?.006:.012)*duck*(1+flourish),t+.08);g.leadGain.gain.exponentialRampToValueAtTime(.0001,t+.58);
  if(step%3!==2)waterBell(g,note*(step%6===0?.5:1),(stage===3?.018:.038)*duck,t);
 }
 g.bassOsc.frequency.setTargetAtTime(stage===3?73.42:stage===2?82.41:stage===1?98:110,t,.6);
 g.bassGain.gain.setTargetAtTime((.003+night*.009+storm*.018)*(.55+.45*Math.sin(s.clock*TAU*.7)**2)*duck,t,.2)
}
function loadScores(){try{const data=JSON.parse(localStorage.getItem('marea.highscores.v1')||'[]');return Array.isArray(data)?data.filter(e=>/^[A-Z]{3}$/.test(e.name)&&Number.isFinite(e.score)&&Number.isFinite(e.distance)).sort((a,b)=>b.score-a.score||b.distance-a.distance).slice(0,10):[]}catch{return []}}
let highScores=loadScores();
function renderScores(newEntry){if(!scoreList)return;scoreList.replaceChildren();for(let i=0;i<10;i++){const item=document.createElement('li'),entry=highScores[i];if(entry){const name=document.createElement('span'),points=document.createElement('span');name.textContent=entry.name;points.textContent=String(entry.score).padStart(5,'0');item.append(name,points);if(entry===newEntry)item.classList.add('new')}else{item.classList.add('empty');item.textContent='···'}scoreList.appendChild(item)}}
function showGameOver(){if(!gameOver)return;document.getElementById('finalScore').textContent=`${s.score} PUNTOS · ${Math.floor(s.distance)} METROS`;const qualifies=highScores.length<10||s.score>highScores[9].score||s.score===highScores[9].score&&s.distance>highScores[9].distance;scoreForm.classList.toggle('hidden',!qualifies);initials.value='';renderScores();gameOver.classList.remove('hidden');if(qualifies)initials.focus()}
function reset(){s={world:0,speed:370,boostTime:0,airY:0,airV:0,angle:0,spin:0,airborne:false,holding:false,crashed:false,crashTime:0,distance:0,nextMilestone:100,score:0,combo:0,clock:0,pose:0,tuck:0,grab:0,landing:0,giantSuccess:0,giantRewarded:-1,displayY:0,displayAngle:0,wake:[],wakeTimer:0,message:'100 M = 100 PUNTOS · BACKFLIP = 250+',messageTime:5};s.displayY=surfaceY(X);gameOver?.classList.add('hidden')}
function stormLevel(world){const p=((world/2600)%4+4)%4;return p<2.7?0:p<3?smooth((p-2.7)/.3):p<3.7?1:1-smooth((p-3.7)/.3)}
function top(x){const p=s.world+x,section=Math.floor(p/1000),storm=stormLevel(s.world),calm=calmLevel(s.world);let y=520+18*Math.sin(p*.003)+storm*24*Math.sin(p*.006);for(let offset=-1;offset<=1;offset++){const i=section+offset,q=seed(i),width=(270+180*seed(i+71))*(1+storm*.1),center=i*1000+500+140*(q-.5),d=(p-center)/width;y-=(145+205*q+storm*(70+100*q))*Math.exp(-2*d*d)}return Math.max(75,mix(y+(6+storm*10)*Math.sin(p*.018),475,calm*.76)-215*giantCore(p))}
function depth(x){return 345+(520-top(x))*.23+15*Math.sin((s.world+x)*.006)+stormLevel(s.world)*25}
function surfaceY(x){return top(x)+29}
function slopeAt(x){return (surfaceY(x+18)-surfaceY(x-18))/36}
function jump(){const slope=slopeAt(X);s.airborne=true;s.airY=surfaceY(X);s.airV=-345-Math.min(105,Math.max(0,s.speed-300)*.38)-Math.max(0,-slope)*65;s.angle=Math.atan(slope)*.5;s.spin=0;s.landing=0}
function hold(value){if(s.crashed)return;if(value&&!s.holding&&!s.airborne)jump();s.holding=value}
function wipeout(){if(s.crashed)return;s.crashed=true;s.crashTime=0;s.holding=false;s.message='CAÍDA';s.messageTime=10;showGameOver()}
function step(dt){s.clock+=dt;s.pose=mix(s.pose,s.holding?1:0,clamp(dt*5,0,1));s.tuck=mix(s.tuck,s.crashed?0:s.airborne?1:s.pose*.6,clamp(dt*7,0,1));s.grab=mix(s.grab,s.airborne&&!s.crashed?1:0,clamp(dt*9,0,1));s.landing=Math.max(0,s.landing-dt*2.5);s.giantSuccess=Math.max(0,s.giantSuccess-dt);s.boostTime=Math.max(0,s.boostTime-dt);if(s.crashed){s.crashTime+=dt;return}
 s.world+=s.speed*dt;s.distance+=s.speed*dt*.025;s.messageTime=Math.max(0,s.messageTime-dt);
 s.wake.forEach(w=>w.life-=dt);s.wake=s.wake.filter(w=>w.life>0);s.wakeTimer+=dt;
 if(s.wakeTimer>.085&&!s.airborne){s.wakeTimer=0;const glow=nightLevel(s.world);if(glow>.08)s.wake.push({world:s.world+X,life:3,night:glow})}
 while(s.distance>=s.nextMilestone){s.score+=100;s.message=`${s.nextMilestone} METROS · +100`;s.messageTime=2;s.nextMilestone+=100}
 if(s.airborne){s.airY+=s.airV*dt;s.airV+=710*dt;if(s.holding){s.angle-=5.2*dt;s.spin=Math.min(s.spin,s.angle)}else{const target=Math.round(s.angle/TAU)*TAU;s.angle=mix(s.angle,target,clamp(dt*5,0,1))}const target=surfaceY(X);if(s.airV>0&&s.airY>=target){const tilt=Math.atan(slopeAt(X))*.5,alignment=Math.abs(((s.angle-tilt+Math.PI)%TAU+TAU)%TAU-Math.PI);if(alignment<1.05){s.airborne=false;s.airY=target;s.airV=0;s.angle=tilt;s.landing=1;const turns=Math.round(-s.spin/TAU);if(turns>0){s.combo++;s.score+=250*turns*s.combo;s.boostTime=Math.min(7,4.2+turns*.8);s.message=`¡${turns} BACKFLIP! · IMPULSO ×${s.combo}`;s.messageTime=2.5;s.speed=Math.min(680,s.speed+105*turns);const event=giantIndex(s.world+X);if(giantCore(s.world+X)>.2&&s.giantRewarded!==event){s.giantRewarded=event;s.giantSuccess=2.8;s.score+=1000;s.message='¡GRAN OLA! · BACKFLIP +1000';s.messageTime=3}}}else wipeout()}if(s.airY>H+80&&!s.crashed)wipeout()}
 else{const slope=slopeAt(X),momentum=s.boostTime>0?85*s.boostTime/5:0;s.speed=clamp(s.speed+((385+momentum-s.speed)*(s.boostTime>0?.13:.38)+slope*150)*dt,290,680)}
}
function weather(){const p=((s.world/2600)%4+4)%4,stage=Math.floor(p),t=smooth((p-stage-.70)/.30);const palettes=[{high:'#273b59',low:'#bb8492',water:'#37b6ac',deep:'#183d61',foam:'#eee8d7',pink:'#dc7087',sun:'#f0d4ac'},{high:'#12172f',low:'#563d64',water:'#2aaea9',deep:'#23294c',foam:'#eadab3',pink:'#d65484',sun:'#e49a96'},{high:'#0a1027',low:'#303452',water:'#277e9b',deep:'#142747',foam:'#badde4',pink:'#9b83b8',sun:'#ced7df'},{high:'#1b263d',low:'#596776',water:'#578f98',deep:'#263c55',foam:'#d4e2e2',pink:'#a7a5b3',sun:'#b9c4cc'}];const a=palettes[stage],b=palettes[(stage+1)%4],out={};for(const k in a)out[k]=rgb(a[k],b[k],t);out.rain=stormLevel(s.world);out.phase=p;out.night=nightLevel(s.world);out.calm=calmLevel(s.world);out.giant=giantPresence(s.world+X);out.high=rgb(out.high,'#10152f',out.giant*.65);out.low=rgb(out.low,'#45425f',out.giant*.52);out.sun=rgb(out.sun,'#b8c4dc',out.giant*.5);return out}
function poly(points,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fill()}
function line(points,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.stroke()}
function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill()}
function palm(x,y,z){
 const crown=[x+19*z,y-100*z],ink='#1c183d';
 ctx.strokeStyle=ink;ctx.lineWidth=6*z;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+4*z,y-60*z,crown[0],crown[1]);ctx.stroke();
 for(const side of [-1,1])for(let i=0;i<3;i++){
  const reach=(54+i*14)*z,tip=[crown[0]+side*reach,crown[1]+(8+i*10)*z];
  const mid=[crown[0]+side*reach*.55,crown[1]-(16-i*4)*z];
  line([crown,mid,tip],ink,3.6*z);
  for(const f of [.42,.68]){
   const bx=mix(crown[0],tip[0],f),by=mix(crown[1],tip[1],f)-8*z;
   line([[bx,by],[bx+side*8*z,by+12*z]],ink,2.2*z);
  }
 }
 line([crown,[crown[0]+2*z,crown[1]-24*z]],ink,3*z)
}
function cloud(x,y,z,p,i){const dark=p.rain,shade=rgb(p.foam,p.high,.55+dark*.35);ctx.save();ctx.globalAlpha=.23+dark*.28;poly([[x-95*z,y+13*z],[x-70*z,y-15*z],[x-28*z,y-22*z],[x+4*z,y-43*z],[x+52*z,y-30*z],[x+86*z,y-8*z],[x+108*z,y+16*z]],shade);for(const [dx,dy,r] of [[-56,-9,34],[-17,-23,41],[28,-30,49],[69,-5,35]])circle(x+dx*z,y+dy*z,r*z,shade);ctx.globalAlpha=.32+dark*.12;line([[x-78*z,y+20*z],[x-24*z,y+20*z],[x+7*z,y+11*z],[x+69*z,y+13*z]],p.foam,3*z);ctx.globalAlpha=.2+dark*.12;line([[x-68*z,y+30*z],[x+77*z,y+30*z]],p.high,5*z);ctx.restore()}
function dolphin(x,y,z,tilt,p){ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.scale(z,z);const body=rgb('#b4cbd1','#819eae',p.night*.6+p.rain*.22),back=rgb('#4e7181','#354b67',p.night*.6+p.rain*.25);poly([[-52,6],[-38,-7],[-10,-18],[21,-14],[42,-5],[53,-7],[46,0],[33,7],[9,13],[-18,14],[-39,12]],back);poly([[-38,5],[-16,4],[12,5],[36,-2],[30,9],[8,17],[-17,16]],body);poly([[-13,-14],[-2,-36],[10,-15]],back);poly([[-30,11],[-35,34],[-15,15]],back);poly([[-49,5],[-68,-12],[-62,4],[-70,17],[-48,12]],back);circle(33,-4,2,'#152d3f');line([[46,0],[56,2]],body,2);ctx.restore()}
function turtle(x,y,z,phase,p){ctx.save();ctx.translate(x,y);ctx.scale(z,z);const shell=rgb('#25565e','#183c51',p.night*.5),rim='#74b5a5',skin=rgb('#65aba2','#558e99',p.night*.5);ctx.save();ctx.rotate(Math.sin(phase)*.26);poly([[-18,-6],[-49,-18],[-42,4],[-14,13]],skin);poly([[11,-6],[41,-24],[37,-2],[17,13]],skin);ctx.restore();poly([[-23,7],[-42,22],[-21,16]],skin);poly([[17,8],[37,18],[18,16]],skin);circle(29,-4,11,skin);circle(34,-6,2,'#0e3449');ctx.beginPath();ctx.ellipse(0,0,26,18,0,0,TAU);ctx.fillStyle=rim;ctx.fill();ctx.beginPath();ctx.ellipse(0,-1,23,15,0,0,TAU);ctx.fillStyle=shell;ctx.fill();line([[-17,-7],[-6,-2],[-14,8]],'rgba(170,220,191,.7)',2);line([[-6,-2],[10,-10],[19,-2]],'rgba(170,220,191,.7)',2);line([[-6,-2],[3,11],[15,6]],'rgba(170,220,191,.7)',2);ctx.restore()}
function background(p){const gradient=ctx.createLinearGradient(0,0,0,450);gradient.addColorStop(0,p.high);gradient.addColorStop(1,p.low);ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);circle(1030,171,96,`rgba(255,110,155,${.13*(1-p.rain*.7)*(1-p.giant*.65)})`);ctx.globalAlpha=(1-p.rain*.55)*(1-p.giant*.65);circle(1030,171,65,p.sun);ctx.globalAlpha=1;ctx.fillStyle=p.low;ctx.globalAlpha=.72*(1-p.rain)*(1-p.giant);for(const [x,y,w] of [[974,191,112],[984,206,92],[1000,222,60]])ctx.fillRect(x,y,w,5);ctx.globalAlpha=1;
 for(let i=0;i<4;i++){const x=((i*251-s.world*.06)%(W+340)+(W+340))%(W+340)-170,y=248+13*Math.sin(i*3.1);line([[x,y],[x+120+(i%3)*45,y]],'rgba(255,160,205,.15)',3)}
 for(let i=0;i<6;i++){const x=((i*314-s.world*(.06+p.rain*.1))%(W+390)+(W+390))%(W+390)-195,y=126+(i%3)*59,z=.58+(i%3)*.18+p.rain*.26;cloud(x,y,z,p,i)}
 for(let i=0;i<2;i++){const cycle=(s.clock*.115+i*.53)%1;if(cycle>.54)continue;const t=cycle/.54,x=((i*761+260+s.clock*38-s.world*.055)%(W+240)+(W+240))%(W+240)-120,y=395-135*Math.sin(Math.PI*t)-i*26;ctx.globalAlpha=.7*(1-p.rain*.35);dolphin(x,y,.72+i*.12,(.5-t)*.65,p);ctx.globalAlpha=1}
 if(p.rain>.6&&((s.clock+2.3)%13.1)<.12){ctx.fillStyle=`rgba(210,235,255,${p.rain*.16})`;ctx.fillRect(0,0,W,H);line([[900,80],[869,151],[896,153],[849,236]],'#d8f6ff',4)}
 ctx.globalAlpha=1-p.calm;for(let i=0;i<7;i++){const x=((i*271-s.world*.22)%(W+170)+(W+170))%(W+170)-85,y=116+(i*41)%106+5*Math.sin(s.clock*1.6+i),z=.65+(i%3)*.19,flap=4*Math.sin(s.clock*4+x*.03);line([[x-17*z,y+(-5+flap)*z],[x-5*z,y+z],[x,y],[x+5*z,y+z],[x+17*z,y+(-5+flap)*z]],'#241a42',2.6*z)}ctx.globalAlpha=1;
 for(let i=0;i<3;i++){const x=((i*670+105-s.world*.16)%(W+230)+(W+230))%(W+230)-115;palm(x,428,1+(i%2)*.26)}
 const horizon=[];for(let i=0;i<=64;i++){const x=i*20;horizon.push([x,408+5*Math.sin((x+s.world*.33)*.012)])}line(horizon,'#bd5a92',3)}
function fish(x,y,z,night){if(night>.05){ctx.globalAlpha=night*.16;circle(x-3*z,y,17*z,'#54ffe5');ctx.globalAlpha=1}poly([[x-12*z,y],[x-z,y-6*z],[x+12*z,y],[x-z,y+6*z]],rgb('rgb(158,225,222)','#baffef',night));poly([[x-11*z,y],[x-21*z,y-7*z],[x-21*z,y+7*z]],rgb('rgb(158,225,222)','#baffef',night));line([[x-4*z,y-3*z],[x+4*z,y-2*z]],'rgba(255,255,255,.5)',z);circle(x+6*z,y-z,1.3*z,'#171b4b')}
function vegetation(){for(let i=0;i<9;i++){const x=((i*209-s.world*.43)%(W+140)+(W+140))%(W+140)-70,h=50+(i*19)%57,drift=Math.sin(s.clock*1.3+i)*6;line([[x,H+9],[x-8,H+9-h*.45],[x+drift,H+9-h]],'rgba(79,222,179,.55)',4);line([[x-5,H+9-h*.3],[x-20,H+9-h*.55]],'rgba(79,222,179,.4)',3);line([[x-7,H+9-h*.52],[x+9,H+9-h*.72]],'rgba(79,222,179,.4)',3)}for(let i=0;i<6;i++){const x=((i*301-s.world*.38)%(W+140)+(W+140))%(W+140)-70,z=.7+(i%3)*.25,y=H+8,c='rgba(255,86,163,.57)';line([[x,y],[x,y-66*z]],c,6*z);line([[x,y-30*z],[x-24*z,y-55*z]],c,5*z);line([[x,y-42*z],[x+22*z,y-72*z]],c,5*z);line([[x-13*z,y-44*z],[x-22*z,y-72*z]],c,3*z)}}
function wave(p){const crests=[],depths=[];for(let i=0;i<=64;i++){const x=i*20;crests.push(top(x));depths.push(depth(x))}
 const sea=[[0,H],[W,H]];for(let i=64;i>=0;i--)sea.push([i*20,crests[i]]);poly(sea,p.deep);
 for(let band=0;band<14;band++){const a=band/14,b=(band+1)/14,pts=[];for(let i=0;i<=64;i++)pts.push([i*20,crests[i]+depths[i]*a]);for(let i=64;i>=0;i--)pts.push([i*20,crests[i]+depths[i]*b]);poly(pts,rgb(p.water,p.deep,clamp(a*1.25,0,1)))}
 ctx.save();ctx.globalAlpha=.075*(1-p.rain*.7);for(let i=0;i<9;i++){const x=((i*193-s.world*.18)%(W+260)+(W+260))%(W+260)-130,y=top(x)+9;poly([[x-9,y],[x+12,y],[x+90,y+depth(x)*.85],[x+27,y+depth(x)*.85]],p.foam)}ctx.restore();
 ctx.save();for(let i=0;i<30;i++){const x=((i*227-s.world*(.3+(i%3)*.05))%(W+230)+(W+230))%(W+230)-115,f=.12+(i%6)*.13,y=top(x)+depth(x)*f,w=50+(i%4)*28;ctx.globalAlpha=.055+(i%3)*.023;poly([[x-w,y-8],[x-12,y-22],[x+w,y-5],[x+30,y+27],[x-w*.65,y+18]],i%2?p.foam:p.deep)}ctx.restore();
 vegetation();for(let i=0;i<12;i++){const x=((i*163-s.world*(.24+(i%3)*.05))%(W+120)+(W+120))%(W+120)-60;fish(x,top(x)+depth(x)*(.37+(i%4)*.12),.65+(i%3)*.2,p.night)}
 for(let i=0;i<3;i++){const x=((i*931+500-s.world*.32)%(W+1100)+(W+1100))%(W+1100)-220;if(x<35||x>W-25)continue;const y=Math.min(H-105,top(x)+depth(x)*(.57+(i%2)*.14));turtle(x,y,.56+(i%2)*.12,s.clock*2+i,p)}
 for(let stripe=0;stripe<10;stripe++){const f=.055+stripe*.096,pts=[];for(let i=0;i<=64;i++){const x=i*20,r=Math.sin((s.world+x)*.017+stripe*.77)*(3+3*f);pts.push([x,crests[i]+depths[i]*f+r])}ctx.globalAlpha=stripe<5?.51:.32;line(pts,stripe===0?'#f7ffff':stripe<5?p.water:p.pink,stripe%3?2:3);ctx.globalAlpha=1}
 const crest=[];for(let i=0;i<=64;i++){const x=i*20;crest.push([x,crests[i]+3*Math.sin((s.world+x)*.05)])}ctx.globalAlpha=.72;line(crest,p.deep,13+p.rain*3);ctx.globalAlpha=.87;line(crest,p.foam,6+p.rain*5);ctx.globalAlpha=.6;line(crest,'#f7ffff',2);ctx.globalAlpha=1;
 for(let i=0;i<31;i++){const x=((i*97-s.world*.76)%(W+120)+(W+120))%(W+120)-60,y=top(x),rise=clamp(-slopeAt(x)*.8,0,25),scale=.55+(i%4)*.19;ctx.globalAlpha=.37+(i%3)*.18;line([[x-20*scale,y+13],[x-8*scale,y+7-rise*.3],[x+3*scale,y+10-rise*.6],[x+17*scale,y+12]],'#fff',2.2+p.rain*1.7);circle(x+22*scale,y+8-rise*.4,1.3+(i%3)*.7,'#fff');ctx.globalAlpha=1}
 if(p.night>.05){ctx.globalAlpha=p.night*.4;line(crest,'#4effde',13);ctx.globalAlpha=p.night*.55;line(crest,'#c6fff1',3);ctx.globalAlpha=1}
 for(let i=0;i<48;i++){const x=((i*73-s.world*.17)%(W+100)+(W+100))%(W+100)-50,intensity=giantCore(s.world+x);if(intensity<.08)continue;const drift=Math.sin(s.clock*3+i)*8,y=top(x)-12-(i*17)%46;ctx.globalAlpha=intensity*(.3+(i%4)*.13);circle(x+drift,y,2+(i%4)*1.4,'#fff');ctx.globalAlpha=1}
 for(let i=0;i<36;i++){const x=((i*127-s.world*.82)%(W+90)+(W+90))%(W+90)-45,y=top(x)+8+(i%4)*3;ctx.globalAlpha=.35+(i%3)*.17;line([[x-16,y],[x-3,y-3],[x+10,y+1]],'#fff',1.8+(i%3)*.7);ctx.globalAlpha=1}
 if(p.rain)for(let i=0;i<54;i++){const x=((i*137-s.world*.69)%(W+90)+(W+90))%(W+90)-45,y=top(x)-5-(i*19)%32,drift=Math.sin(s.clock*2+i)*8;ctx.globalAlpha=p.rain*(.2+(i%4)*.12);circle(x+drift,y,1.5+(i%3)*1.2,p.foam);ctx.globalAlpha=1}
 for(let k=0;k<19;k++){const x=((k*191-s.world*(.68+(k%4)*.04))%(W+160)+(W+160))%(W+160)-80,f=.07+((k*17)%71)*.012,y=top(x)+depth(x)*f,w=28+(k*29)%63;ctx.globalAlpha=f>.5?.24:.43;poly([[x-w,y+4],[x-w*.35,y-4],[x+w*.24,y-2],[x+w,y+8],[x+w*.37,y+13]],k%3===0?p.pink:k%3===1?p.foam:p.water);ctx.globalAlpha=1}
 const first=Math.floor(s.world/1000)-1;for(let k=0;k<4;k++){const section=first+k,size=seed(section);if(size<.38)continue;const x=section*1000+500+140*(size-.5)-s.world;if(x<-185||x>W+185)continue;const y=top(x),reach=74+88*size,curl=[[x-reach,y+9],[x-55,y-30],[x+18,y-43],[x+83,y-12],[x+reach,y+62+reach*.21],[x+97,y+50],[x+52,y+6],[x-22,y+17]];poly(curl,'#1a2548');line(curl.slice(0,5),p.foam,4)}
 for(let i=0;i<42;i++){const x=((i*173-s.world*(.6+(i%3)*.12))%W+W)%W,y=top(x)+(i*37)%100-57;ctx.globalAlpha=.58;line([[x,y],[x-9-s.speed*.009,y+1]],i%7?p.water:p.foam,1.5);ctx.globalAlpha=1}}
function bone(a,b,width,color=SUIT){line([a,b],color,width);circle(a[0],a[1],width/2,color);circle(b[0],b[1],width/2,color)}
function surfer(y,angle,pose=s,offset=0){
 ctx.save();ctx.translate(X+offset,y);ctx.rotate(angle);ctx.scale(.56,.56);
 const ch=characters[characterIndex],bend=clamp(.35+pose.tuck*.58+pose.landing*.17,0,1),grab=pose.grab,sway=Math.sin(pose.clock*5)*2*(1-grab),silhouette=rgb(ch.suit,'#111b32',.32),skin=ch.skin;
 // A compact, readable silhouette with a slim pink surfboard.
 poly([[-67,9],[-55,4],[-34,2],[36,2],[59,6],[70,10],[59,15],[36,18],[-37,18],[-57,15]],'#f36caa');
 line([[-58,12],[51,12]],'#ffc1d8',2);line([[-40,5],[40,5]],'#9f3c73',2);
 poly([[-22,17],[-15,17],[-19,23]],'#263950');poly([[26,17],[33,16],[30,23]],'#263950');
 const hip=[3,-41+10*bend],backKnee=[mix(-18,-31,bend),-20],frontKnee=[mix(15,29,bend),-18],shoulder=[-7,-74+17*bend];
 bone([-31,1],backKnee,10*ch.build,silhouette);bone(backKnee,hip,12*ch.build,silhouette);
 bone([26,1],frontKnee,10*ch.build,silhouette);bone(frontKnee,hip,12*ch.build,silhouette);
 line([[-30,0],[-40,2]],skin,5);line([[27,0],[39,1]],skin,5);
 bone(hip,shoulder,20*ch.build,silhouette);
 poly([[-16,-65+16*bend],[-8,-70+17*bend],[6,-60+16*bend],[1,-44+10*bend],[-8,-42+10*bend]],ch.accent);
 line([[-12,-64+16*bend],[-6,-51+13*bend]],ch.highlight,2.5);
 const a=[shoulder[0]-8,shoulder[1]+6],el=[mix(-33,-20,grab),mix(-51+14*bend,-21,grab)+sway],hand=[mix(-48,1,grab),mix(-61+25*bend,8,grab)];
 bone(a,el,8*ch.build,silhouette);bone(el,hand,7*ch.build,silhouette);circle(hand[0],hand[1],4,skin);
 if(grab>.65)line([[hand[0],hand[1]],[hand[0]+3,12]],skin,2.8);
 const ra=[shoulder[0]+9,shoulder[1]+6],re=[23,-52+11*bend-sway],rh=[45,-67+20*bend];
 bone(ra,re,8*ch.build,silhouette);bone(re,rh,7*ch.build,silhouette);circle(rh[0],rh[1],4,skin);
 const hx=shoulder[0]-3,hy=shoulder[1]-21;
 if(characterIndex===0){
  poly([[hx-11,hy-12],[hx-21,hy-3],[hx-25,hy+20],[hx-32,hy+29],[hx-15,hy+23],[hx+10,hy+26],[hx+15,hy-10]],ch.shadow);
  circle(hx,hy,13,skin);
  poly([[hx-15,hy-3],[hx-13,hy-13],[hx+1,hy-19],[hx+13,hy-10],[hx+10,hy-3],[hx-2,hy-9]],ch.hair);
  poly([[hx+4,hy+8],[hx+14,hy+5],[hx+12,hy+15],[hx+5,hy+18]],ch.hair);
 }else if(characterIndex===1){
  circle(hx,hy,13,skin);
  poly([[hx-15,hy-4],[hx-12,hy-25],[hx-5,hy-14],[hx,hy-37],[hx+5,hy-14],[hx+12,hy-27],[hx+14,hy-2]],ch.hair);
 }else if(characterIndex===2){
  circle(hx,hy-7,18,ch.hair);circle(hx,hy,14,skin);
  poly([[hx-11,hy+10],[hx+1,hy+14],[hx+13,hy+8],[hx+9,hy+18],[hx-5,hy+19]],ch.shadow);
 }else{
  poly([[hx-16,hy-14],[hx-23,hy+26],[hx-12,hy+24],[hx+18,hy+28],[hx+16,hy-13]],ch.hair);
  circle(hx,hy,13,skin);
  poly([[hx-15,hy-4],[hx-11,hy-16],[hx+8,hy-17],[hx+14,hy-4],[hx+1,hy-10]],ch.hair);
 }
 circle(hx+7,hy-2,1.9,ch.eyes);
 ctx.restore()
}
function logo(){ctx.save();ctx.font='italic 900 43px Arial Black,Impact,sans-serif';ctx.textBaseline='top';ctx.lineJoin='round';ctx.lineWidth=5;ctx.strokeStyle='#152139';ctx.strokeText('MAREA',51,23);ctx.fillStyle='#a34f70';ctx.fillText('MAREA',54,27);ctx.fillStyle='#eee1bf';ctx.fillText('MAREA',49,22);ctx.font='bold 11px Arial,sans-serif';ctx.fillStyle=C.mint;ctx.fillText('CREADO POR NACHOMMMARTINEZ',52,74);ctx.restore()}
function hud(){logo();ctx.font='20px Arial';ctx.fillStyle=C.mint;ctx.fillText(`${String(Math.floor(s.distance)).padStart(6,'0')} m`,50,104);ctx.fillStyle=C.cream;ctx.font='bold 21px Arial';ctx.fillText(`${String(s.score).padStart(5,'0')} PTS`,50,131);ctx.fillStyle='rgba(220,245,255,.23)';ctx.fillRect(50,143,180,4);ctx.fillStyle=C.cream;ctx.fillRect(50,143,180*clamp((s.speed-280)/370,0,1),4);if(s.combo){ctx.font='17px Arial';ctx.fillText(`COMBO ×${s.combo}`,50,171)}const approaching=giantPresence(s.world+X);if(approaching>.25&&!s.crashed&&s.giantSuccess<=0){ctx.textAlign='center';ctx.font='bold 27px Arial';ctx.fillStyle='#f7ffff';ctx.globalAlpha=clamp(approaching*1.5,0,1);ctx.fillText('LA GRAN OLA',W/2,208);ctx.font='15px Arial';ctx.fillText('BACKFLIP EN LA CRESTA · +1000',W/2,235);ctx.globalAlpha=1;ctx.textAlign='left'}const calm=calmLevel(s.world);if(calm>.45&&!s.crashed){ctx.textAlign='center';ctx.globalAlpha=calm*.75;ctx.font='italic 21px Arial';ctx.fillStyle='#e7f9ff';ctx.fillText('EL MAR CONTIENE EL ALIENTO',W/2,208);ctx.globalAlpha=1;ctx.textAlign='left'}if(s.messageTime>0&&!s.crashed){ctx.textAlign='center';ctx.font='24px Arial';ctx.fillStyle='#fff';ctx.fillText(s.message,W/2,620);ctx.textAlign='left'}}
function momentumHud(){if(s.boostTime<=0||s.crashed)return;ctx.save();ctx.font='italic bold 16px Arial';ctx.fillStyle='#f3d7bf';ctx.fillText('INERCIA',50,s.combo?194:171);ctx.fillStyle='rgba(238,225,193,.2)';ctx.fillRect(50,s.combo?202:179,135,4);ctx.fillStyle='#e5798d';ctx.fillRect(50,s.combo?202:179,135*clamp(s.boostTime/5,0,1),4);ctx.restore()}
function drawWake(){for(const w of s.wake){const x=w.world-s.world;if(x<-50||x>W+50)continue;const y=top(x)+29,alpha=w.night*(w.life/3);ctx.globalAlpha=alpha*.13;circle(x,y,13,'#37ffe1');ctx.globalAlpha=alpha*.62;circle(x,y,2.5,'#aaffec')}ctx.globalAlpha=1}
function render(){
 const p=weather();background(p);wave(p);drawWake();let y=s.displayY;
 if(!s.airborne&&!s.crashed){const glow=clamp(.2+s.combo*.13+s.boostTime*.09+s.giantSuccess*.2,.2,.95),trail=[],dark=rgb('#d12a72','#32ffe2',p.night),light=rgb('#ff96b6','#abffed',p.night);
  for(let j=0;j<(s.boostTime>0?26:19);j++){const x=X-20-j*18;trail.push([x,top(x)+31+3*Math.sin(s.world*.024+j)])}
  ctx.globalAlpha=glow*.35;line(trail,dark,9);ctx.globalAlpha=glow;line(trail,light,3.5);
  for(let i=0;i<15;i++){const x=X-30-i*21,yy=top(x)+24-(i*13)%14;ctx.globalAlpha=glow*(.25+(i%3)*.16);circle(x,yy,1.5+(i%3),rgb('#ffeaf5','#c7fff4',p.night))}
  ctx.globalAlpha=.12;circle(X,y+12,20+s.landing*22,p.foam);ctx.globalAlpha=1
 }
 surfer(s.crashed?Math.min(y+s.crashTime*160,H+50):y,s.crashed?1.1+s.crashTime*3:s.displayAngle);
 if(p.rain){ctx.fillStyle=`rgba(31,54,79,${.14*p.rain})`;ctx.fillRect(0,0,W,H);for(let i=0;i<95;i++){const x=((i*157-s.clock*155)%(W+70)+(W+70))%(W+70)-35,y=((i*89+s.clock*(490+(i%4)*80))%(H+90)+(H+90))%(H+90)-45;line([[x,y],[x-8,y+20]],`rgba(195,225,245,${.36*p.rain})`,1.5)}}hud();momentumHud()
}
let last=performance.now();function frame(now){const delta=Math.min((now-last)/1000,.10);last=now;if(!start.classList.contains('hidden')){render();requestAnimationFrame(frame);return}let remaining=delta;while(remaining>.00001){const dt=Math.min(remaining,1/120);step(dt);remaining-=dt}const target=s.airborne?s.airY:surfaceY(X);s.displayY=mix(s.displayY,s.crashed?s.displayY:target,1-Math.exp(-delta*17));const tilt=Math.atan((surfaceY(X+14)-surfaceY(X-14))/28)*.52,desired=s.airborne?s.angle:tilt;const difference=((desired-s.displayAngle+Math.PI)%TAU+TAU)%TAU-Math.PI;s.displayAngle+=difference*(1-Math.exp(-delta*19));render();updateAudio(weather(),delta);requestAnimationFrame(frame)}
reset();requestAnimationFrame(frame);
const characterButtons=[...document.querySelectorAll('[data-character]')];
function chooseCharacter(index){characterIndex=index;characterButtons.forEach((button,i)=>{button.classList.toggle('selected',i===index);button.setAttribute('aria-pressed',i===index?'true':'false')});try{localStorage.setItem('marea.character.v1',String(index))}catch{}}
characterButtons.forEach(button=>button.addEventListener('click',()=>chooseCharacter(Number(button.dataset.character))));chooseCharacter(characterIndex);
function enter(){start.classList.add('hidden');tracks.forEach(track=>track.volume=0);setupAudio();tracks.forEach(track=>track.play().catch(()=>{}));last=performance.now()}
document.getElementById('startButton').addEventListener('click',enter);
scoreForm?.addEventListener('submit',e=>{e.preventDefault();const name=initials.value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);if(name.length!==3){initials.setCustomValidity('Escribe tres letras');initials.reportValidity();return}initials.setCustomValidity('');const entry={name,score:s.score,distance:Math.floor(s.distance)};highScores.push(entry);highScores.sort((a,b)=>b.score-a.score||b.distance-a.distance);highScores=highScores.slice(0,10);try{localStorage.setItem('marea.highscores.v1',JSON.stringify(highScores))}catch{}scoreForm.classList.add('hidden');renderScores(entry)});
initials?.addEventListener('input',()=>{initials.value=initials.value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);initials.setCustomValidity('')});
document.getElementById('replayButton')?.addEventListener('click',reset);
document.getElementById('changeCharacterButton')?.addEventListener('click',()=>{reset();start.classList.remove('hidden')});
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);hold(true)});
canvas.addEventListener('pointerup',e=>{e.preventDefault();hold(false)});
canvas.addEventListener('pointercancel',()=>hold(false));
window.addEventListener('keydown',e=>{if(!gameOver?.classList.contains('hidden')||document.activeElement===initials)return;if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat)hold(true)}});
window.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();hold(false)}});
window.addEventListener('blur',()=>hold(false));
sound.addEventListener('click',e=>{e.stopPropagation();music.muted=!music.muted;tracks.forEach(track=>track.muted=music.muted);sound.classList.toggle('muted',music.muted);sound.textContent=music.muted?'♪̸':'♫';sound.setAttribute('aria-label',music.muted?'Activar música':'Silenciar música');if(!music.muted)tracks.forEach(track=>{if(track.paused)track.play().catch(()=>{})})});
})();
