(() => {
'use strict';
const W=1280,H=720,X=390,TAU=Math.PI*2;
const canvas=document.getElementById('screen'),ctx=canvas.getContext('2d',{alpha:false});
const music=document.getElementById('music'),start=document.getElementById('start'),sound=document.getElementById('soundButton');
const C={ink:'#101028',cream:'#ffe8a3',pink:'#ff5198',mint:'#baf0ce',teal:'#28cfc8'};
const SKIN='#c98d79',SUIT='#14283f';
let audioGraph=null;
let s;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const seed=i=>((Math.sin(i*127.1+17.3)*43758.5453)%1+1)%1;
const hex=h=>h[0]==='#'?[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)):h.match(/\d+/g).slice(0,3).map(Number);
const rgb=(a,b,t)=>{const A=hex(a),B=hex(b);return `rgb(${A.map((v,i)=>Math.round(mix(v,B[i],t))).join(',')})`};
function setupAudio(){
 if(audioGraph)return;const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
 try{
  const ac=new Audio(),master=ac.createGain(),filter=ac.createBiquadFilter(),source=ac.createMediaElementSource(music);
  filter.type='lowpass';source.connect(filter).connect(master);
  const pads=[110,165].map((freq,i)=>{const osc=ac.createOscillator(),gain=ac.createGain();osc.type=i?'sine':'triangle';osc.frequency.value=freq;gain.gain.value=.015;osc.connect(gain).connect(master);osc.start();return {osc,gain}});
  const leadOsc=ac.createOscillator(),leadGain=ac.createGain();leadOsc.type='sine';leadGain.gain.value=.0001;leadOsc.connect(leadGain).connect(master);leadOsc.start();
  const bassOsc=ac.createOscillator(),bassGain=ac.createGain();bassOsc.type='triangle';bassGain.gain.value=0;bassOsc.connect(bassGain).connect(master);bassOsc.start();
  const buffer=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const noise=ac.createBufferSource(),noiseFilter=ac.createBiquadFilter(),rainGain=ac.createGain();noise.buffer=buffer;noise.loop=true;noiseFilter.type='bandpass';noiseFilter.frequency.value=630;noiseFilter.Q.value=.36;rainGain.gain.value=0;noise.connect(noiseFilter).connect(rainGain).connect(master);noise.start();
  master.gain.value=0;master.connect(ac.destination);music.volume=1;
  audioGraph={ac,master,filter,pads,rainGain,leadOsc,leadGain,bassOsc,bassGain,melodyStep:-1};ac.resume().catch(()=>{})
 }catch(e){audioGraph=null}
}
function updateAudio(p,dt){
 if(!audioGraph){if(!music.paused&&!music.muted)music.volume=Math.min(.32,music.volume+dt*.055);return}
 const g=audioGraph,{ac,master,filter,pads,rainGain}=g,t=ac.currentTime,phase=p.phase,storm=p.rain,night=p.night,muted=music.muted||music.paused;
 master.gain.setTargetAtTime(muted?0:.42,t,.24);
 filter.frequency.setTargetAtTime(5200-night*2200-storm*2250,t,.8);
 const dusk=smooth((phase-.75)/.3)*(1-smooth((phase-1.8)/.3)),notes=[110-12*dusk-28*night-37*storm,164.81-18*dusk-41*night-54*storm];
 pads.forEach(({osc,gain},i)=>{osc.frequency.setTargetAtTime(notes[i],t,1.4);gain.gain.setTargetAtTime((i?.012:.018)*(1+night*.55+storm*.25),t,.8)});
 rainGain.gain.setTargetAtTime(storm*.045,t,.5);
 const stage=Math.floor(phase),step=Math.floor(s.clock*1.35);
 if(step!==g.melodyStep){
  g.melodyStep=step;
  const scales=[[329.63,392,440,523.25,587.33],[293.66,349.23,440,523.25,392],[261.63,311.13,392,466.16,349.23],[196,233.08,293.66,349.23,261.63]];
  const pattern=[0,2,1,3,2,4,1,2],note=scales[stage][pattern[step%pattern.length]];
  g.leadOsc.frequency.setTargetAtTime(note,t,.09);
  g.leadGain.gain.cancelScheduledValues(t);g.leadGain.gain.setValueAtTime(.0001,t);g.leadGain.gain.exponentialRampToValueAtTime(stage===3?.009:.018,t+.055);g.leadGain.gain.exponentialRampToValueAtTime(.0001,t+.66);
 }
 g.bassOsc.frequency.setTargetAtTime(stage===3?73.42:stage===2?82.41:stage===1?98:110,t,.6);
 g.bassGain.gain.setTargetAtTime((.003+night*.009+storm*.018)*(.55+.45*Math.sin(s.clock*TAU*.7)**2),t,.2)
}
function reset(){s={world:0,speed:370,airY:0,airV:0,angle:0,spin:0,airborne:false,holding:false,crashed:false,crashTime:0,score:0,combo:0,best:s?.best||0,clock:0,pose:0,tuck:0,grab:0,landing:0,displayY:0,displayAngle:0,message:'TOCA PARA SALTAR · MANTÉN PARA BACKFLIP',messageTime:5};s.displayY=surfaceY(X)}
function stormLevel(world){const p=((world/2600)%4+4)%4;return p<2.7?0:p<3?smooth((p-2.7)/.3):p<3.7?1:1-smooth((p-3.7)/.3)}
function top(x){const p=s.world+x,section=Math.floor(p/520),storm=stormLevel(s.world);let y=418+14*Math.sin(p*.0045)+storm*24*Math.sin(p*.009);for(let offset=-1;offset<=1;offset++){const i=section+offset,q=seed(i),width=(145+115*seed(i+71))*(1+storm*.12),center=i*520+260+80*(q-.5),d=(p-center)/width;y-=(35+83*q+storm*(48+95*q))*Math.exp(-2*d*d)}return y+(4+storm*9)*Math.sin(p*.025)}
function depth(x){return 265+(418-top(x))*.28+16*Math.sin((s.world+x)*.007)+stormLevel(s.world)*24}
function surfaceY(x){return top(x)+29}
function slopeAt(x){return (surfaceY(x+18)-surfaceY(x-18))/36}
function jump(){const slope=slopeAt(X);s.airborne=true;s.airY=surfaceY(X);s.airV=-345-Math.min(105,Math.max(0,s.speed-300)*.38)-Math.max(0,-slope)*65;s.angle=Math.atan(slope)*.5;s.spin=0;s.landing=0}
function hold(value){if(s.crashed){if(value&&s.crashTime>.55)reset();return}if(value&&!s.holding&&!s.airborne)jump();s.holding=value}
function wipeout(){s.crashed=true;s.crashTime=0;s.best=Math.max(s.best,Math.floor(s.score));s.holding=false;s.message='CAÍDA';s.messageTime=10}
function step(dt){s.clock+=dt;s.pose=mix(s.pose,s.holding?1:0,clamp(dt*5,0,1));s.tuck=mix(s.tuck,s.crashed?0:s.airborne?1:s.pose*.6,clamp(dt*7,0,1));s.grab=mix(s.grab,s.airborne&&!s.crashed?1:0,clamp(dt*9,0,1));s.landing=Math.max(0,s.landing-dt*2.5);if(s.crashed){s.crashTime+=dt;return}
 s.world+=s.speed*dt;s.messageTime=Math.max(0,s.messageTime-dt);
 if(s.airborne){s.airY+=s.airV*dt;s.airV+=710*dt;if(s.holding){s.angle-=5.2*dt;s.spin=Math.min(s.spin,s.angle)}else{const target=Math.round(s.angle/TAU)*TAU;s.angle=mix(s.angle,target,clamp(dt*5,0,1))}const target=surfaceY(X);if(s.airV>0&&s.airY>=target){const tilt=Math.atan(slopeAt(X))*.5,alignment=Math.abs(((s.angle-tilt+Math.PI)%TAU+TAU)%TAU-Math.PI);if(alignment<1.05){s.airborne=false;s.airY=target;s.airV=0;s.angle=tilt;s.landing=1;const turns=Math.round(-s.spin/TAU);if(turns>0){s.combo++;s.score+=250*turns*s.combo;s.message=`¡${turns} BACKFLIP! ×${s.combo}`;s.messageTime=2;s.speed=Math.min(650,s.speed+32*turns)}else s.score+=35}else wipeout()}if(s.airY>H+80&&!s.crashed)wipeout()}
 else{const slope=slopeAt(X);s.speed=clamp(s.speed+((385-s.speed)*.38+slope*170)*dt,290,650)}
 if(!s.crashed)s.score+=s.speed*dt*.025}
function weather(){const p=((s.world/2600)%4+4)%4,stage=Math.floor(p),t=smooth((p-stage-.70)/.30);const palettes=[{high:'#466d9b',low:'#eca8a9',water:'#48d4bd',deep:'#225c81',foam:'#fff5cd',pink:'#ff8b93',sun:'#ffdfaa'},{high:'#100d2b',low:'#50336f',water:'#28cfc8',deep:'#32245d',foam:'#ffe8a3',pink:'#ff5198',sun:'#ff7196'},{high:'#090d27',low:'#2a2953',water:'#217fb5',deep:'#192854',foam:'#bde9f6',pink:'#aa79d8',sun:'#ccdff9'},{high:'#202d48',low:'#526678',water:'#5a9ea8',deep:'#293e5d',foam:'#e3eff0',pink:'#9caec5',sun:'#b2c4d0'}];const a=palettes[stage],b=palettes[(stage+1)%4],out={};for(const k in a)out[k]=rgb(a[k],b[k],t);out.rain=stormLevel(s.world);out.phase=p;out.night=smooth((p-1.65)/.35)*(1-smooth((p-2.8)/.3));return out}
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
function cloud(x,y,z,p,i){const dark=p.rain,shade=rgb(p.foam,p.high,.55+dark*.35);ctx.save();ctx.globalAlpha=.12+dark*.3;poly([[x-95*z,y+13*z],[x-70*z,y-15*z],[x-28*z,y-22*z],[x+4*z,y-43*z],[x+52*z,y-30*z],[x+86*z,y-8*z],[x+108*z,y+16*z]],shade);for(const [dx,dy,r] of [[-56,-9,34],[-17,-23,41],[28,-30,49],[69,-5,35]])circle(x+dx*z,y+dy*z,r*z,shade);ctx.globalAlpha=.07+dark*.12;line([[x-80*z,y+29*z],[x+82*z,y+29*z]],p.foam,3*z);ctx.restore()}
function background(p){const gradient=ctx.createLinearGradient(0,0,0,450);gradient.addColorStop(0,p.high);gradient.addColorStop(1,p.low);ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);circle(1030,171,96,`rgba(255,110,155,${.13*(1-p.rain*.7)})`);ctx.globalAlpha=1-p.rain*.55;circle(1030,171,65,p.sun);ctx.globalAlpha=1;ctx.fillStyle=p.low;ctx.globalAlpha=.72*(1-p.rain);for(const [x,y,w] of [[974,191,112],[984,206,92],[1000,222,60]])ctx.fillRect(x,y,w,5);ctx.globalAlpha=1;
 for(let i=0;i<4;i++){const x=((i*251-s.world*.06)%(W+340)+(W+340))%(W+340)-170,y=248+13*Math.sin(i*3.1);line([[x,y],[x+120+(i%3)*45,y]],'rgba(255,160,205,.15)',3)}
 for(let i=0;i<6;i++){const x=((i*314-s.world*(.06+p.rain*.1))%(W+390)+(W+390))%(W+390)-195,y=126+(i%3)*59,z=.58+(i%3)*.18+p.rain*.26;cloud(x,y,z,p,i)}
 if(p.rain>.6&&((s.clock+2.3)%13.1)<.12){ctx.fillStyle=`rgba(210,235,255,${p.rain*.16})`;ctx.fillRect(0,0,W,H);line([[900,80],[869,151],[896,153],[849,236]],'#d8f6ff',4)}
 for(let i=0;i<7;i++){const x=((i*271-s.world*.22)%(W+170)+(W+170))%(W+170)-85,y=116+(i*41)%106+5*Math.sin(s.clock*1.6+i),z=.65+(i%3)*.19,flap=4*Math.sin(s.clock*4+x*.03);line([[x-17*z,y+(-5+flap)*z],[x-5*z,y+z],[x,y],[x+5*z,y+z],[x+17*z,y+(-5+flap)*z]],'#241a42',2.6*z)}
 for(let i=0;i<3;i++){const x=((i*670+105-s.world*.16)%(W+230)+(W+230))%(W+230)-115;palm(x,428,1+(i%2)*.26)}
 const horizon=[];for(let i=0;i<=64;i++){const x=i*20;horizon.push([x,408+5*Math.sin((x+s.world*.33)*.012)])}line(horizon,'#bd5a92',3)}
function fish(x,y,z){poly([[x-12*z,y],[x-z,y-6*z],[x+12*z,y],[x-z,y+6*z]],'rgba(158,225,222,.56)');poly([[x-11*z,y],[x-21*z,y-7*z],[x-21*z,y+7*z]],'rgba(158,225,222,.56)');circle(x+6*z,y-z,1.3*z,'#171b4b')}
function vegetation(){for(let i=0;i<9;i++){const x=((i*209-s.world*.43)%(W+140)+(W+140))%(W+140)-70,h=50+(i*19)%57,drift=Math.sin(s.clock*1.3+i)*6;line([[x,H+9],[x-8,H+9-h*.45],[x+drift,H+9-h]],'rgba(79,222,179,.55)',4);line([[x-5,H+9-h*.3],[x-20,H+9-h*.55]],'rgba(79,222,179,.4)',3);line([[x-7,H+9-h*.52],[x+9,H+9-h*.72]],'rgba(79,222,179,.4)',3)}for(let i=0;i<6;i++){const x=((i*301-s.world*.38)%(W+140)+(W+140))%(W+140)-70,z=.7+(i%3)*.25,y=H+8,c='rgba(255,86,163,.57)';line([[x,y],[x,y-66*z]],c,6*z);line([[x,y-30*z],[x-24*z,y-55*z]],c,5*z);line([[x,y-42*z],[x+22*z,y-72*z]],c,5*z);line([[x-13*z,y-44*z],[x-22*z,y-72*z]],c,3*z)}}
function wave(p){const crests=[],depths=[];for(let i=0;i<=64;i++){const x=i*20;crests.push(top(x));depths.push(depth(x))}
 const sea=[[0,H],[W,H]];for(let i=64;i>=0;i--)sea.push([i*20,crests[i]]);poly(sea,p.deep);
 for(let band=0;band<14;band++){const a=band/14,b=(band+1)/14,pts=[];for(let i=0;i<=64;i++)pts.push([i*20,crests[i]+depths[i]*a]);for(let i=64;i>=0;i--)pts.push([i*20,crests[i]+depths[i]*b]);poly(pts,rgb(p.water,p.deep,clamp(a*1.25,0,1)))}
 vegetation();for(let i=0;i<12;i++){const x=((i*163-s.world*(.24+(i%3)*.05))%(W+120)+(W+120))%(W+120)-60;fish(x,top(x)+depth(x)*(.37+(i%4)*.12),.65+(i%3)*.2)}
 for(let stripe=0;stripe<10;stripe++){const f=.055+stripe*.096,pts=[];for(let i=0;i<=64;i++){const x=i*20,r=Math.sin((s.world+x)*.017+stripe*.77)*(3+3*f);pts.push([x,crests[i]+depths[i]*f+r])}ctx.globalAlpha=stripe<5?.51:.32;line(pts,stripe===0?p.foam:stripe<5?p.water:p.pink,stripe%3?2:3);ctx.globalAlpha=1}
 const crest=[];for(let i=0;i<=64;i++){const x=i*20;crest.push([x,crests[i]+3*Math.sin((s.world+x)*.05)])}line(crest,'#182050',16+p.rain*3);line(crest,p.foam,6+p.rain*5);line(crest,p.water,2);
 if(p.rain)for(let i=0;i<54;i++){const x=((i*137-s.world*.69)%(W+90)+(W+90))%(W+90)-45,y=top(x)-5-(i*19)%32,drift=Math.sin(s.clock*2+i)*8;ctx.globalAlpha=p.rain*(.2+(i%4)*.12);circle(x+drift,y,1.5+(i%3)*1.2,p.foam);ctx.globalAlpha=1}
 for(let k=0;k<19;k++){const x=((k*191-s.world*(.68+(k%4)*.04))%(W+160)+(W+160))%(W+160)-80,f=.07+((k*17)%71)*.012,y=top(x)+depth(x)*f,w=28+(k*29)%63;ctx.globalAlpha=f>.5?.24:.43;poly([[x-w,y+4],[x-w*.35,y-4],[x+w*.24,y-2],[x+w,y+8],[x+w*.37,y+13]],k%3===0?p.pink:k%3===1?p.foam:p.water);ctx.globalAlpha=1}
 const first=Math.floor(s.world/520)-1;for(let k=0;k<5;k++){const section=first+k,size=seed(section);if(size<.38)continue;const x=section*520+260+80*(size-.5)-s.world;if(x<-115||x>W+115)continue;const y=top(x),reach=45+56*size,curl=[[x-reach,y+7],[x-39,y-17],[x+12,y-27],[x+61,y-7],[x+reach,y+45+reach*.23],[x+73,y+41],[x+42,y+5],[x-15,y+13]];poly(curl,'#20215a');line(curl.slice(0,5),p.pink,4)}
 for(let i=0;i<42;i++){const x=((i*173-s.world*(.6+(i%3)*.12))%W+W)%W,y=top(x)+(i*37)%100-57;ctx.globalAlpha=.58;line([[x,y],[x-9-s.speed*.009,y+1]],i%7?p.water:p.foam,1.5);ctx.globalAlpha=1}}
function bone(a,b,width,color=SUIT){line([a,b],color,width);circle(a[0],a[1],width/2,color);circle(b[0],b[1],width/2,color)}
function surfer(y,angle){
 ctx.save();ctx.translate(X,y);ctx.rotate(angle);
 const bend=clamp(.34+s.tuck*.58+s.landing*.16,0,1),grab=s.grab,sway=Math.sin(s.clock*5)*2*(1-grab);
 poly([[-62,10],[-47,4],[35,4],[63,8],[41,17],[-47,16]],C.cream);
 line([[-44,14],[51,13]],C.pink,4);line([[-43,6],[46,6]],'#fff8b4',1.5);
 const hip=[3,-40+10*bend],backKnee=[mix(-18,-31,bend),-20],frontKnee=[mix(15,29,bend),-18],shoulder=[-7,-74+17*bend];
 bone([-31,1],backKnee,11,C.ink);bone(backKnee,hip,13,C.ink);
 bone([26,1],frontKnee,11,C.ink);bone(frontKnee,hip,13,C.ink);
 bone([-30,1],[-41,3],6,SKIN);bone([27,1],[39,2],6,SKIN);
 bone(hip,shoulder,20,C.ink);
 poly([[-17,-66+16*bend],[-7,-72+17*bend],[1,-61+16*bend],[-1,-44+10*bend],[-7,-40+10*bend]],'#087f88');
 line([[-15,-64+16*bend],[-10,-51+13*bend]],C.teal,2);
 // Small stylized skull on the chest of the wetsuit.
 const sy=-58+15*bend;circle(-6,sy,6,'#b9e8dc');circle(-9,sy-1,1.3,C.ink);circle(-3,sy-1,1.3,C.ink);
 poly([[-6,sy],[-8,sy+3],[-4,sy+3]],C.ink);line([[-9,sy+5],[-3,sy+5]],C.ink,1.3);
 // The trailing hand reaches the board's middle for the indy grab.
 const leftShoulder=[shoulder[0]-8,shoulder[1]+6],leftElbow=[mix(-33,-20,grab),mix(-51+14*bend,-21,grab)+sway],leftHand=[mix(-48,1,grab),mix(-61+25*bend,8,grab)];
 bone(leftShoulder,leftElbow,9,C.ink);bone(leftElbow,[leftHand[0]-4,leftHand[1]-4],7,C.ink);bone([leftHand[0]-4,leftHand[1]-4],leftHand,5,SKIN);
 if(grab>.65)line([[leftHand[0],leftHand[1]],[leftHand[0]+3,12]],SKIN,2.7);
 const rightShoulder=[shoulder[0]+9,shoulder[1]+6],rightElbow=[23,-52+11*bend-sway],rightHand=[45,-67+20*bend];
 bone(rightShoulder,rightElbow,9,C.ink);bone(rightElbow,[rightHand[0]-5,rightHand[1]+4],7,C.ink);bone([rightHand[0]-5,rightHand[1]+4],rightHand,5,SKIN);
 const head=[shoulder[0]-3,shoulder[1]-21];
 // Long hair trails behind the face and follows the motion.
 poly([[head[0]-7,head[1]-12],[head[0]-18,head[1]-15],[head[0]-28,head[1]-7],[head[0]-25,head[1]+8],[head[0]-35,head[1]+16+sway],[head[0]-18,head[1]+13],[head[0]-9,head[1]+3]],C.ink);
 circle(head[0],head[1],14,SKIN);
 poly([[head[0]-14,head[1]-4],[head[0]-13,head[1]-13],[head[0]-1,head[1]-18],[head[0]+12,head[1]-11],[head[0]+9,head[1]-5],[head[0]+1,head[1]-9],[head[0]-8,head[1]-5]],C.ink);
 line([[head[0]+11,head[1]-1],[head[0]+16,head[1]+2],[head[0]+10,head[1]+4]],SKIN,2);
 circle(head[0]+7,head[1]-2,1.5,C.ink);line([[head[0]+5,head[1]+7],[head[0]+11,head[1]+7]],'#713a49',1.5);
 ctx.restore()
}
function logo(){ctx.save();ctx.font='italic 900 43px Arial Black, Arial, sans-serif';ctx.textBaseline='top';ctx.lineJoin='round';ctx.lineWidth=5;ctx.strokeStyle='rgba(255,50,138,.65)';ctx.strokeText('MAREA',54,27);ctx.fillStyle=C.teal;ctx.fillText('MAREA',49,23);ctx.fillStyle=C.cream;ctx.globalAlpha=.75;ctx.fillText('MAREA',50,22);ctx.globalAlpha=1;ctx.font='11px Arial, sans-serif';ctx.fillStyle=C.mint;ctx.fillText('CREADO POR NACHOMMMARTINEZ',52,73);ctx.restore()}
function hud(){logo();ctx.font='22px Arial';ctx.fillStyle=C.mint;ctx.fillText(`${String(Math.floor(s.score)).padStart(6,'0')} m`,50,100);ctx.fillStyle='rgba(220,245,255,.23)';ctx.fillRect(50,112,180,4);ctx.fillStyle=C.cream;ctx.fillRect(50,112,180*clamp((s.speed-280)/370,0,1),4);if(s.combo){ctx.font='18px Arial';ctx.fillText(`COMBO ×${s.combo}`,50,140)}if(s.messageTime>0&&!s.crashed){ctx.textAlign='center';ctx.font='24px Arial';ctx.fillStyle='#fff';ctx.fillText(s.message,W/2,620);ctx.textAlign='left'}if(s.crashed){ctx.fillStyle='rgba(8,6,34,.65)';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='bold 70px Arial';ctx.fillText('CAÍDA',W/2,307);ctx.fillStyle=C.mint;ctx.font='25px Arial';ctx.fillText(`${Math.floor(s.score)} m  ·  RÉCORD ${s.best} m`,W/2,360);if(s.crashTime>.55){ctx.fillStyle='#fff';ctx.font='23px Arial';ctx.fillText('TOCA PARA VOLVER AL AGUA',W/2,426)}ctx.textAlign='left'}}
function render(){const p=weather();background(p);wave(p);let y=s.displayY;if(!s.airborne&&!s.crashed){const trail=[];for(let j=0;j<16;j++)trail.push([X-25-j*17,y+13+j*.54+4*Math.sin(s.world*.024+j)]);ctx.globalAlpha=.42;line(trail,p.pink,4);ctx.globalAlpha=.12;circle(X,y+12,20+s.landing*22,p.foam);ctx.globalAlpha=1}surfer(s.crashed?Math.min(y+s.crashTime*160,H+50):y,s.crashed?1.1+s.crashTime*3:s.displayAngle);if(p.rain){ctx.fillStyle=`rgba(31,54,79,${.14*p.rain})`;ctx.fillRect(0,0,W,H);for(let i=0;i<95;i++){const x=((i*157-s.clock*155)%(W+70)+(W+70))%(W+70)-35,y=((i*89+s.clock*(490+(i%4)*80))%(H+90)+(H+90))%(H+90)-45;line([[x,y],[x-8,y+20]],`rgba(195,225,245,${.36*p.rain})`,1.5)}}hud()}
let last=performance.now();function frame(now){const delta=Math.min((now-last)/1000,.10);last=now;if(!start.classList.contains('hidden')){render();requestAnimationFrame(frame);return}let remaining=delta;while(remaining>.00001){const dt=Math.min(remaining,1/120);step(dt);remaining-=dt}const target=s.airborne?s.airY:surfaceY(X);s.displayY=mix(s.displayY,s.crashed?s.displayY:target,1-Math.exp(-delta*17));const tilt=Math.atan((surfaceY(X+14)-surfaceY(X-14))/28)*.52,desired=s.airborne?s.angle:tilt;const difference=((desired-s.displayAngle+Math.PI)%TAU+TAU)%TAU-Math.PI;s.displayAngle+=difference*(1-Math.exp(-delta*19));render();updateAudio(weather(),delta);requestAnimationFrame(frame)}
reset();requestAnimationFrame(frame);
function enter(){start.classList.add('hidden');music.volume=0;setupAudio();music.play().catch(()=>{});last=performance.now()}
document.getElementById('startButton').addEventListener('click',enter);
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);hold(true)});
canvas.addEventListener('pointerup',e=>{e.preventDefault();hold(false)});
canvas.addEventListener('pointercancel',()=>hold(false));
window.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat)hold(true)}});
window.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();hold(false)}});
window.addEventListener('blur',()=>hold(false));
sound.addEventListener('click',e=>{e.stopPropagation();music.muted=!music.muted;sound.classList.toggle('muted',music.muted);sound.textContent=music.muted?'♪̸':'♫';sound.setAttribute('aria-label',music.muted?'Activar música':'Silenciar música');if(!music.muted&&music.paused)music.play().catch(()=>{})});
})();
