import {compose,TRACKS,STYLES} from "./composer.js?v=0.5.3";
import {DRUMS,VOICES,DEFAULT_VOICES,REGEN_VOICE_POOLS,nearestSample} from "./sounds.js";
import {LOCAL_SAMPLES} from "./sample-map.js";
import {sampleGain} from "./sample-levels.js";
import {chooseRadioProfile,radioNoveltyScore,arrangeRadioNote,recommendedCacheEvictions} from "./radio-planner.js";

const $=id=>document.getElementById(id);
const pitchNames=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const roles=["bass","chords","arp","lead","counter","pad"];
const drums=TRACKS.filter(x=>x.type==="drum").map(x=>x.id);
const sampleCache=new Map();
const failures=new Map();
const choice=a=>a[Math.floor(Math.random()*a.length)];
let ctx,master,buses=[],current=null,next=null,loadingNext=false;
let playing=false,paused=false,timer=null,step=0,stepTime=0,loops=0,targetLoops=2,segments=0;
const recentPieces=[]; // Previous musical identities, oldest discarded after eight pieces.
let lastText="";
let epoch=0,nextRetryTime=0;
// Slow cinematic crops and colour grading of the ORIGINAL GIF, not alternate footage.
// Modest changes preserve the characters and scene; new looks arrive on bar boundaries.
const visualPresets=[
  {zoom:1.05,x:0,y:0,hue:0,saturation:1.08,brightness:1.02,contrast:1.02},
  {zoom:1.16,x:-2.6,y:1.3,hue:-15,saturation:1.25,brightness:1.04,contrast:1.06},
  {zoom:1.12,x:2.7,y:-1.3,hue:18,saturation:.88,brightness:1.06,contrast:1.03},
  {zoom:1.20,x:-3.2,y:-1.1,hue:36,saturation:1.14,brightness:.97,contrast:1.08},
  {zoom:1.13,x:1.4,y:1.7,hue:-29,saturation:.77,brightness:1.08,contrast:1.05},
  {zoom:1.10,x:-1.5,y:0,hue:7,saturation:1.38,brightness:1,contrast:1.04},
  {zoom:1.18,x:2.5,y:.8,hue:48,saturation:.92,brightness:1.04,contrast:1.08}
];
let lastVisual=-1;
function changeVisual(){
  const img=document.querySelector(".scene img");
  if(!img)return;
  let index=Math.floor(Math.random()*visualPresets.length);
  if(index===lastVisual)index=(index+1)%visualPresets.length;
  lastVisual=index;
  const p=visualPresets[index];
  img.style.transform="translate("+p.x+"%, "+p.y+"%) scale("+p.zoom+")";
  img.style.filter="hue-rotate("+p.hue+"deg) saturate("+p.saturation+") brightness("+p.brightness+") contrast("+p.contrast+")";
}


function status(text){if(text!==lastText){$("message").textContent=text;lastText=text}}
function rngToken(){const array=new Uint32Array(2);crypto.getRandomValues(array);return Array.from(array,x=>x.toString(36)).join("")}
function selectDrum(id){
 const options=DRUMS[id];
 // Most percussion stays in a playable kit family; sometimes explore the
 // wider catalogue rather than choosing only the first dozen forever.
 const limit=Math.random()<.27?options.length:Math.min(options.length,28);
 return Math.floor(Math.random()*limit);
}
function indexEvents(piece){
 piece.eventsByStep=Array.from({length:128},()=>[]);
 for(const event of piece.events)piece.eventsByStep[event.step].push(event);
 return piece;
}
function planNext(){
 const old=current;
 const profile=chooseRadioProfile(old);
 const {seed:ignore,...settings}=profile;
 const voices={...DEFAULT_VOICES};
 for(const role of roles){
   const pool=REGEN_VOICE_POOLS[role].filter(v=>VOICES[v]?.length &&
     (!v.startsWith("vocalSung")||v==="vocalSungNotes"));
   const previous=old?.voices[role];
   if(previous&&Math.random()<.43&&VOICES[previous])voices[role]=previous;
   else{
     const options=pool.filter(id=>id!==previous);
     voices[role]=choice(options.length?options:pool);
   }
 }
 const oldDrums=old?.drumSounds;
 const drumSounds=Object.fromEntries(drums.map(id=>
   [id,oldDrums&&Math.random()<.7?oldDrums[id]:selectDrum(id)]));
 const seed=rngToken();
 const piece=compose({seed,key:profile.key,mode:profile.mode,style:profile.style,
   bpm:profile.bpm,density:profile.density,swing:profile.swing});
 // Retaining one or two recognisable drum motifs gives adjacent pieces a
 // clear connection without leaving the entire backing beat unchanged.
 const generated=piece.events.filter(e=>drums.includes(e.track));
 const oldPercussion=old?.events.filter(e=>drums.includes(e.track))??[];
 const keep=old?choice([
   ["kick","hat"],["kick","snare"],["hat","openhat"],["kick"],["snare","hat"],[]
 ]):[];
 if(old&&profile.change!=="new variation"&&keep.length===0)keep.push("kick");
 const percussion=generated.filter(e=>!keep.includes(e.track))
   .concat(oldPercussion.filter(e=>keep.includes(e.track)));
 for(const id of keep)drumSounds[id]=old.drumSounds[id];
 const events=[...percussion,...piece.events.filter(e=>!drums.includes(e.track))]
   .sort((a,b)=>a.step-b.step);
 return indexEvents({...profile,seed,voices,drumSounds,events,
   progression:piece.progression,ready:false,missing:0});
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
  sampleCache.set(s.url,buffer);failures.delete(s.url);return buffer;
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
   // Several *symbolic* arrangements are cheap to score. Only download the
   // winning recorded-sample set, avoiding needless network requests.
   const alternatives=Array.from({length:5},()=>planNext())
     .sort((a,b)=>radioNoveltyScore(b,[current,...recentPieces])-
                    radioNoveltyScore(a,[current,...recentPieces]));
   for(const candidate of alternatives){
     if(!playing||next)break;
     try{
       await prepare(candidate);
       if(playing){
         next=candidate;
         status("Next piece ready · "+candidate.sceneName+" · transitions on the beat");
       }
       break;
     }catch(e){console.warn("Human Radio: next piece skipped",e)}
   }
   if(!next&&playing){
     nextRetryTime=Date.now()+8000;
     status("Keeping the current groove while the next piece loads…");
   }
 }finally{loadingNext=false}
}
function pruneSampleCache(){
 const protect=new Set([current,next].filter(Boolean)
   .flatMap(piece=>uniqueSamples(piece).map(sample=>sample.url)));
 for(const url of recommendedCacheEvictions(sampleCache,protect))sampleCache.delete(url);
 if(failures.size>80)for(const url of [...failures.keys()].slice(0,failures.size-80))failures.delete(url);
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
 recentPieces.unshift(prev);
 if(recentPieces.length>8)recentPieces.length=8;
 current=next;next=null;loops=0;targetLoops=current.targetLoops;
 segments++;
 changeVisual();
 gainFor(current);
 // Crossfade across a musically meaningful bar rather than an abrupt
 // 400 ms cut. The old pad gives the next piece a short harmonic bridge.
 const blend=Math.min(5,Math.max(2,240/current.bpm));
 current.bus.gain.setValueAtTime(0,at);
 current.bus.gain.linearRampToValueAtTime(.82,at+blend);
 prev.bus.gain.cancelScheduledValues(at);
 prev.bus.gain.setValueAtTime(.82,at);
 prev.bus.gain.linearRampToValueAtTime(.0001,at+blend);
 for(const note of prev.eventsByStep[0]||[])
   if(note.track==="pad")playNote(prev,note,at);
 setTimeout(()=>{try{prev.bus.disconnect()}catch{}},Math.ceil((blend+1)*1000));
 pruneSampleCache();
 $("track").textContent=current.key+" "+current.mode+" · "+current.bpm+" BPM";
 $("phase").textContent=current.sceneName+" · "+current.change;
 status("Now playing · "+current.sceneName+" · music developing over successive loops");
 void queueNext();
}
function pump(){
  if(!playing||!ctx||!current)return;
  const now=ctx.currentTime;
  let count=0;
  while(stepTime<now+.23&&count++<64){
    if(step===0&&loops>=targetLoops)switchPiece(stepTime);
    const scheduled=current,localStep=step;
    for(const e of scheduled.eventsByStep[localStep])
      if(arrangeRadioNote(e,loops))playNote(scheduled,e,stepTime);
    step++;
    stepTime+=60/scheduled.bpm/4;
    if(step===128){step=0;loops++;if(loops%2===0)changeVisual()}
  }
  // If the tab was suspended, realign rather than playing a backlog of stale notes.
  if(stepTime<now-.5)stepTime=now+.04;
  if(!next&&!loadingNext&&loops>=1)void queueNext();
}
async function start(){
  $("start").disabled=true;$("play").disabled=true;
  try{
    if(paused&&current?.ready&&ctx){
      await ctx.resume();
      if(ctx.state!=="running")throw Error("Audio cannot resume");
      paused=false;playing=true;epoch++;
      $("play").textContent="Ⅱ Pause";$("skip").disabled=false;
      clearInterval(timer);timer=setInterval(pump,25);
      status("Resumed · continuing the same piece and position");
      pump();if(!next)void queueNext();
      return;
    }
    if(!ctx){ctx=new AudioContext();master=ctx.createGain();master.gain.value=.83;const safety=ctx.createDynamicsCompressor();safety.threshold.value=-12;safety.knee.value=18;safety.ratio.value=3;safety.attack.value=.005;safety.release.value=.2;master.connect(safety);safety.connect(ctx.destination)}
    await ctx.resume();
    if(!current||!current.ready){
      status("Preparing the first eight bars and decoding the recorded instruments…");
      if(!current)current=planNext();
      await prepare(current);
      gainFor(current);
      changeVisual();
      current.bus.gain.value=.82;
      $("track").textContent=current.key+" "+current.mode+" · "+current.bpm+" BPM";
      $("phase").textContent=current.sceneName+" · opening scene";
    }
    playing=true;paused=false;epoch++;
    step=0;loops=0;targetLoops=current.targetLoops;
    stepTime=ctx.currentTime+.09;
    $("intro").hidden=true;$("play").textContent="Ⅱ Pause";$("skip").disabled=false;
    status("Live · "+current.sceneName+" · an evolving eight-bar arrangement");
    timer=setInterval(pump,25);pump();void queueNext();
  }catch(error){
    status("Radio could not start: "+error.message);
    $("intro").hidden=false;
  }finally{$("start").disabled=false;$("play").disabled=false}
}
async function pause(){
  playing=false;paused=true;epoch++;
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
