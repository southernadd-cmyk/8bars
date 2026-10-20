import {compose,TRACKS,STYLES} from "./composer.js?v=0.5.3";
import {DRUMS,VOICES,DEFAULT_VOICES,REGEN_VOICE_POOLS,nearestSample} from "./sounds.js";
import {LOCAL_SAMPLES} from "./sample-map.js";
import {sampleGain} from "./sample-levels.js";

const $=id=>document.getElementById(id);
const pitchNames=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const roles=["bass","chords","arp","lead","counter","pad"];
const drums=TRACKS.filter(x=>x.type==="drum").map(x=>x.id);
const probabilities=[2,2,2,3,3]; // At least two listens before moving on.
const sampleCache=new Map();
const failures=new Map();
const choice=a=>a[Math.floor(Math.random()*a.length)];
const pianoPitch=n=>pitchNames[(pitchNames.indexOf(n)+12)%12];
const pc=n=>pitchNames.indexOf(n);
let ctx,master,buses=[],current=null,next=null,loadingNext=false;
let playing=false,timer=null,step=0,stepTime=0,loops=0,targetLoops=2,segments=0,changeIn=3;
let lastText="";
let epoch=0,nextRetryTime=0;

function status(text){if(text!==lastText){$("message").textContent=text;lastText=text}}
function rngToken(){const array=new Uint32Array(2);crypto.getRandomValues(array);return Array.from(array,x=>x.toString(36)).join("")}
function relativeMove(key,mode){
  const offset=choice([5,7,-5,-7]);
  const shift=(pc(key)+offset+120)%12;
  return {key:pitchNames[shift],mode};
}
function planNext(){
  const old=current;
  let key=old?.key??choice(pitchNames),mode=old?.mode??choice(["major","minor"]);
  let bpm=old?.bpm??choice([82,88,92,96,102,108,114]);
  let change="new variation";
  if(old){
    changeIn--;
    if(changeIn<=0){
      // Related-key transitions only; relative key and fifths avoid arbitrary harmonic jumps.
      const kind=choice(["fifth","fifth","relative","steady"]);
      if(kind==="relative"){
        const offset=mode==="minor"?3:-3;
        key=pitchNames[(pc(key)+offset+12)%12];mode=mode==="minor"?"major":"minor";
        change="relative key";
      }else if(kind==="fifth"){
        const moved=relativeMove(key,mode);key=moved.key;change="new key";
      }
      const delta=choice([-4,-3,-2,0,2,3,4]);
      bpm=Math.max(74,Math.min(126,bpm+delta));
      changeIn=choice([2,3,3,4]);
    }
  }
  const style=old?.style??choice(STYLES);
  // Keep the same groove identity/drum sample choices across transitions.
  const voices={...DEFAULT_VOICES};
  for(const role of roles){
    const pool=REGEN_VOICE_POOLS[role].filter(v=>VOICES[v]?.length && (!v.startsWith("vocalSung") || v==="vocalSungNotes"));
    const recent=old?.voices[role],options=pool.filter(x=>x!==recent);
    voices[role]=choice(options.length?options:pool);
  }
  const drumSounds=old?.drumSounds??Object.fromEntries(drums.map(id=>[id,Math.floor(Math.random()*Math.min(DRUMS[id].length,12))]));
  const seed=rngToken();
  const piece=compose({seed,key,mode,style,bpm,density:.63,swing:.10});
  // Hold a shared drum motif between adjacent pieces, but let the groove evolve.
  const generated=piece.events.filter(e=>drums.includes(e.track));
  const oldPercussion=old?.events.filter(e=>drums.includes(e.track))??[];
  const keep=old?choice([
    ["kick","hat"],["kick","snare"],["hat","openhat"],["kick"],["snare","hat"],[]
  ]):[];
  // At a modulation or tempo shift, retain one recognisable rhythmic anchor.
  if(old && change!=="new variation" && keep.length===0)keep.push("kick");
  const percussion=generated.filter(e=>!keep.includes(e.track))
    .concat(oldPercussion.filter(e=>keep.includes(e.track)));
  const carried=new Set(keep);
  const chosenDrums={...drumSounds};
  for(const id of drums){
    if(carried.has(id))chosenDrums[id]=old.drumSounds[id];
    else if(old && Math.random()<.38)chosenDrums[id]=Math.floor(Math.random()*Math.min(DRUMS[id].length,16));
  }
  const events=[...percussion,...piece.events.filter(e=>!drums.includes(e.track))].sort((a,b)=>a.step-b.step);
  return {seed,key,mode,bpm,style,voices,drumSounds:chosenDrums,events,change,ready:false,missing:0};
}
function soundFor(piece,e){
  if(drums.includes(e.track)){
    const choices=DRUMS[e.track];
    return choices[Math.max(0,Math.min(piece.drumSounds[e.track]??0,choices.length-1))];
  }
  return nearestSample(piece.voices[e.track],e.note,e.velocity);
}
function uniqueSamples(piece){
  return [...new Map(piece.events.map(e=>{const s=soundFor(piece,e);return [s.url,s]})).values()];
}
async function loadSound(s){
  if(sampleCache.has(s.url))return sampleCache.get(s.url);
  const url=LOCAL_SAMPLES[s.url];
  // No remote upstream audio requests: a missing build mapping is a broken catalogue.
  if(!url)throw Error("Built-in recording missing from the site's audio map");
  const response=await fetch(url,{cache:"force-cache"});
  if(!response.ok)throw Error("Audio HTTP "+response.status);
  const buffer=await ctx.decodeAudioData(await response.arrayBuffer());
  if(!buffer.duration||!buffer.length)throw Error("Empty audio recording");
  sampleCache.set(s.url,buffer);return buffer;
}
async function prepare(piece){
  const list=uniqueSamples(piece).filter(s=>!sampleCache.has(s.url));
  let index=0;
  const errors=[];
  await Promise.all(Array.from({length:5},async()=>{
    while(index<list.length){
      const s=list[index++];
      try{await loadSound(s)}catch(error){errors.push(error.message);failures.set(s.url,error.message)}
    }
  }));
  piece.missing=errors.length;
  piece.ready=errors.length===0;
  if(!piece.ready)throw Error(errors[0]||"Recordings unavailable");
  return piece;
}
async function queueNext(){
  if(loadingNext||next||!current||!playing||Date.now()<nextRetryTime)return;
  loadingNext=true;
  try{
    for(let attempt=0;attempt<3&&playing&&!next;attempt++){
      const candidate=planNext();
      try{
        await prepare(candidate);
        if(playing){next=candidate;status("Next piece ready · transitions stay on the beat")}
      }catch(e){console.warn("Human Radio: next piece skipped",e)}
    }
    if(!next&&playing){nextRetryTime=Date.now()+8000;status("Keeping the current groove while the next piece loads…");}
  }finally{loadingNext=false}
}
function gainFor(piece){
  const bus=ctx.createGain();bus.gain.value=0;bus.connect(master);
  piece.bus=bus;return bus;
}
function playNote(piece,e,when){
  const sample=soundFor(piece,e),buffer=sampleCache.get(sample.url);
  if(!buffer)return;
  const src=ctx.createBufferSource(),envelope=ctx.createGain();
  src.buffer=buffer;
  const rate=sample.oneShot?1:drums.includes(e.track)?1:Math.pow(2,(e.note-sample.root)/12);
  src.playbackRate.value=rate;
  const stepSeconds=60/piece.bpm/4;
  const noteLength=Math.min(buffer.duration/rate,Math.max(.04,e.duration*stepSeconds));
  const fade=Math.min(.075,noteLength*.35);
  const role=drums.includes(e.track)?.62:e.track==="bass"?.75:e.track==="pad"?.24:.42;
  const amp=Math.max(.0001,e.velocity*role*sampleGain(buffer));
  envelope.gain.setValueAtTime(amp,when);
  envelope.gain.setValueAtTime(amp,when+Math.max(.001,noteLength-fade));
  envelope.gain.linearRampToValueAtTime(.0001,when+noteLength);
  src.connect(envelope);
  if(e.track==="bass"||e.track==="pad"){
    const filter=ctx.createBiquadFilter();filter.type="lowpass";
    filter.frequency.value=e.track==="bass"?950:1550;
    envelope.connect(filter);filter.connect(piece.bus);
  }else envelope.connect(piece.bus);
  src.start(when);src.stop(when+noteLength+.004);
  src.onended=()=>{try{src.disconnect();envelope.disconnect()}catch{}};
}
function switchPiece(at){
  if(!next?.ready){targetLoops=loops+1;void queueNext();return}
  const prev=current;
  current=next;next=null;loops=0;targetLoops=choice(probabilities);
  segments++;
  gainFor(current);
  current.bus.gain.setValueAtTime(0,at);
  current.bus.gain.linearRampToValueAtTime(.82,at+.4);
  prev.bus.gain.setValueAtTime(.82,at);
  prev.bus.gain.linearRampToValueAtTime(0,at+.4);
  // Old tracks are allowed a short tail; the shared drum motif continues.
  setTimeout(()=>{try{prev.bus.disconnect()}catch{}},2000);
  $("track").textContent=current.key+" "+current.mode+" · "+current.bpm+" BPM";
  $("phase").textContent="Piece "+(segments+1)+" · "+current.change;
  status("A shared drum pattern carries the transition · next song is preloading");
  void queueNext();
}
function pump(){
  if(!playing||!ctx||!current)return;
  const now=ctx.currentTime;
  let count=0;
  while(stepTime<now+.23&&count++<64){
    if(step===0&&loops>=targetLoops)switchPiece(stepTime);
    const scheduled=current,localStep=step;
    for(const e of scheduled.events)if(e.step===localStep)playNote(scheduled,e,stepTime);
    step++;
    stepTime+=60/scheduled.bpm/4;
    if(step===128){step=0;loops++}
  }
  // If the tab was suspended, realign rather than playing a backlog of stale notes.
  if(stepTime<now-.5)stepTime=now+.04;
  if(!next&&!loadingNext&&loops>=1)void queueNext();
}
async function start(){
  $("start").disabled=true;$("play").disabled=true;
  try{
    if(!ctx){ctx=new AudioContext();master=ctx.createGain();master.gain.value=.83;const safety=ctx.createDynamicsCompressor();safety.threshold.value=-12;safety.knee.value=18;safety.ratio.value=3;safety.attack.value=.005;safety.release.value=.2;master.connect(safety);safety.connect(ctx.destination)}
    await ctx.resume();
    if(!current||!current.ready){
      status("Preparing the first eight bars and decoding the recorded instruments…");
      if(!current)current=planNext();
      await prepare(current);
      gainFor(current);
      current.bus.gain.value=.82;
      $("track").textContent=current.key+" "+current.mode+" · "+current.bpm+" BPM";
      $("phase").textContent="Piece 1 · shared groove";
    }
    playing=true;epoch++;
    step=0;loops=0;targetLoops=choice(probabilities);
    stepTime=ctx.currentTime+.09;
    $("intro").hidden=true;$("play").textContent="Ⅱ Pause";$("skip").disabled=false;
    status("Live · each eight-bar piece plays two or three times");
    timer=setInterval(pump,25);pump();void queueNext();
  }catch(error){
    status("Radio could not start: "+error.message);
    $("intro").hidden=false;
  }finally{$("start").disabled=false;$("play").disabled=false}
}
async function pause(){
  playing=false;epoch++;
  clearInterval(timer);timer=null;
  if(ctx)await ctx.suspend();
  $("play").textContent="▶ Resume";
  $("skip").disabled=true;
  status("Paused · press Resume to continue");
}
$("start").addEventListener("click",start);
$("play").addEventListener("click",()=>playing?pause():start());
$("skip").addEventListener("click",()=>{
  if(!playing)return;
  if(next?.ready){targetLoops=loops+1;status("Switching at the next eight-bar boundary")}
  else{status("Preparing the next piece · current loop will continue");void queueNext()}
});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&playing)pump()});
