import {planInstrumentPalette} from "./instrument-palettes.js";
import {TRACKS} from "./composer.js?v=0.5.5";
import {planPhiSong,slicePhiSong} from "./phi-song-planner.js";
import {planWholeRadioSong,sliceWholeRadioSong} from "./radio-whole-song.js";
import {phiDynamicGain} from "./phi-dynamics.js";
import {composeWithEngine} from "./music-engines.js?v=0.7.10";
import {DRUMS,VOICES,DEFAULT_VOICES,REGEN_VOICE_POOLS,VOICE_FAMILIES,nearestSample} from "./sounds.js";
import {LOCAL_SAMPLES} from "./sample-map.js";
import {sampleGain,samplePeakGain} from "./sample-levels.js?v=2";
import {chooseRadioProfile,radioNoveltyScore,recommendedCacheEvictions} from "./radio-planner.js";
import {buildRadioForm,sectionAllowsNote,sectionVelocity,transitionHarmonyScore,sharedToneBridge} from "./radio-form.js?v=2";
import {planEcology} from "./music-ecology.js";
import {parseRadioDictionary,radioTitleForSeed} from "./radio-names.js";
import {RADIO_CHANNELS,validRadioChannel,CHANNEL_TIMBRES,applyChannelGroove} from "./radio-channels.js?v=4";
import {planGenreHarmony,arrangeGenreMusic} from "./genre-arrangement.js?v=3";
import {dnbDrumSample} from "./dnb-break-kit.js?v=3";
import {hiphopDrumSample} from "./hiphop-drum-kit.js?v=1";
import {createRadioVisual} from "./radio-visual.js?v=3";
import {audibleSongStep,radioNowPlaying,stableSongStep} from "./radio-now-playing.js";

const $=id=>document.getElementById(id);
let selectedChannel=validRadioChannel(new URLSearchParams(location.search).get("channel"));
let radioWords=null,wordsPromise=null;
function loadRadioWords(){
 if(radioWords)return Promise.resolve(radioWords);
 if(!wordsPromise)wordsPromise=fetch("./radio-words.txt?v=1")
   .then(response=>{if(!response.ok)throw Error("Dictionary HTTP "+response.status);return response.text()})
   .then(text=>{radioWords=parseRadioDictionary(text);if(radioWords.length<50)
     throw Error("Dictionary is unexpectedly empty");return radioWords})
   .catch(error=>{console.warn("Human Radio: using title fallback",error);
     radioWords=parseRadioDictionary("blue\naardvark\nonly\nsuper\nachievement\nsilver\nmidnight\necho\nvelvet\norbit\ndream\nocean\nviolet\nsignal");return radioWords});
 return wordsPromise;
}
function showSongIdentity(piece){
 if(!piece)return;
 const title=piece.title||radioTitleForSeed(piece.seed,radioWords);
 $("track").textContent=title;
 document.title=title+" · Human Radio";
 syncNowPlaying(true);
}
let channelVersion=0;
function updateStationDisplay(){
 $("channel").value=selectedChannel;
 $("introChannel").value=selectedChannel;
 $("channelDescription").textContent=RADIO_CHANNELS[selectedChannel].description;
}
const roles=["bass","chords","arp","lead","counter","pad"];
const drums=TRACKS.filter(x=>x.type==="drum").map(x=>x.id);
const sampleCache=new Map();
const failures=new Map();
const choice=a=>a[Math.floor(Math.random()*a.length)];
let ctx,master,buses=[],current=null,next=null,loadingNext=false;
let playing=false,paused=false,timer=null,step=0,stepTime=0,loops=0,targetLoops=6,segments=0;
let displayedSection=-1,skipRequested=false;
const pendingSamples=new Map();
const recentPieces=[]; // Previous musical identities, oldest discarded after eight pieces.
let livingGenome=null; // Musical memory survives non-Ecology chapters.
let lastText="";
let epoch=0,nextRetryTime=0;
let lastProgressPaint=0,displayedProgressPiece=null,displayedProgressStep=0;
// UI progress follows the audible Web Audio clock, not the scheduler's
// look-ahead. It spans the whole song rather than an eight-bar buffer.
function syncNowPlaying(force=false){
 if(!current)return;
 const now=performance.now();
 if(!force&&now-lastProgressPaint<160)return;
 lastProgressPaint=now;
 const totalSteps=(current.sections?.length||0)*128;
 if(current!==displayedProgressPiece){
   displayedProgressPiece=current;displayedProgressStep=0;
 }
 const audible=playing||paused?
   audibleSongStep({loops,step,stepTime,audioTime:ctx?.currentTime||0,
     bpm:current.bpm,totalSteps}):0;
 // Sections may be replayed while samples load: hold the displayed timeline,
 // but continue to derive every advance from the actual audible clock.
 displayedProgressStep=stableSongStep(displayedProgressStep,audible,totalSteps);
 const display=radioNowPlaying(current,displayedProgressStep);
 if(!display)return;
 $("trackChannel").textContent=RADIO_CHANNELS[display.channel]?.name||display.channel;
 const scene=display.scene.replace(/-/g," ");
 const style=display.style.replace(/-/g," ");
 $("trackStyle").textContent=[scene,style].filter(Boolean).join(" · ");
 $("trackBpm").textContent=display.bpm+" BPM";
 $("trackKey").textContent=[display.key,display.mode].filter(Boolean).join(" ");
 $("sectionTag").textContent=display.sectionName;
 $("sectionName").textContent="Section "+(display.sectionIndex+1)+" of "+display.sectionCount;
 $("barPosition").textContent="Bar "+display.bar+" / "+display.totalBars;
 $("songProgress").value=display.progress;
 $("songProgress").setAttribute("aria-valuetext","Bar "+display.bar+" of "+
   display.totalBars+", "+display.sectionName);
 $("elapsed").textContent=display.elapsed;
 $("duration").textContent=display.total;
}
const retiringBuses=[];
// Entirely original, event- and spectrum-reactive artwork; no licensed video.
const visual=createRadioVisual($("radio-art"));
visual.setStation(selectedChannel);
function changeVisual(){visual.changePhase()}

function status(text){if(text!==lastText){$("message").textContent=text;lastText=text}const hint=$("startFeedback");if(hint&&!$("intro").hidden)hint.textContent=text}
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
function finishRadioForm(candidate){
 // The full genre-specific score is complete before any transport slicing.
 if(candidate.songScore){
  const sections=sliceWholeRadioSong(candidate.songScore);
  return {...candidate,sections,events:sections[0].events,
   eventsByStep:sections[0].eventsByStep,progression:sections[0].progression};
 }
 // A complete Classical phi composition comes FIRST; eight-bar slices are
 // only transport buffers. No new notes are invented by this adapter.
 if(candidate.channel==="classical"){
  const sections=slicePhiSong(candidate.phiScore);
  return {...candidate,sections,events:sections[0].events,
   eventsByStep:sections[0].eventsByStep,progression:sections[0].progression};
 }
 const {baseComposition,keep,oldPercussion,...profile}=candidate;
 const sections=buildRadioForm(candidate,baseComposition,composeWithEngine);
 for(const section of sections){
   const percussion=section.events.filter(e=>drums.includes(e.track)&&!keep.includes(e.track))
     .concat(oldPercussion.filter(e=>keep.includes(e.track)));
   const combined=[...percussion,...section.events.filter(e=>!drums.includes(e.track))]
     .sort((a,b)=>a.step-b.step);
   const genreEvents=arrangeGenreMusic({...section,events:combined,scene:candidate.scene,
     leadVoice:candidate.voices.lead},
     candidate.channel,candidate.seed,section.role,candidate.scene);
   section.events=applyChannelGroove(genreEvents,
     candidate.channel,candidate.seed,section.role);
   indexEvents(section);
 }
 return {...profile,sections,events:sections[0].events,
   eventsByStep:sections[0].eventsByStep,progression:sections[0].progression};
}
// Each compositional system also gets a coherent *recorded instrument* palette.
// Filter through the existing role-safe bank; never substitute artificial sound.
const ENGINE_TIMBRES={
 pattern:{bass:["Bass","Plucked strings"],chords:["Keys & organs","Guitars"],
   arp:["Guitars","Mallets","Mallets & bells","Plucked strings"],
   lead:["Guitars","Plucked strings","Mallets","Mallets & bells"],
   counter:["Strings","Bowed strings"],pad:["Keys & organs"]},
 melodic:{bass:["Bass","Strings"],chords:["Keys & organs","Guitars"],
   arp:["Plucked strings","Guitars"],lead:["Strings","Bowed strings","Winds","Vocal melodies"],
   counter:["Strings","Bowed strings","Winds","Vocal melodies"],
   pad:["Keys & organs","Strings","Bowed strings"]},
 ambient:{bass:["Bass","Keys & organs"],chords:["Keys & organs","Bowed strings"],
   arp:["Mallets","Mallets & bells","Plucked strings"],
   lead:["Mallets","Mallets & bells","Plucked strings","Strings"],
   counter:["Bowed strings","Winds"],pad:["Keys & organs","Bowed strings","Winds"]},
 process:{bass:["Bass","Keys & organs"],chords:["Keys & organs","Mallets & bells"],
   arp:["Mallets","Mallets & bells","Plucked strings"],
   lead:["Mallets","Mallets & bells","Plucked strings","Vocal melodies"],
   counter:["Strings","Bowed strings","Winds"],pad:["Keys & organs","Bowed strings"]},
 ecology:{bass:["Bass","Plucked strings"],chords:["Keys & organs","Guitars"],
   arp:["Mallets","Mallets & bells","Plucked strings"],
   lead:["Strings","Bowed strings","Guitars","Winds","Mallets & bells"],
   counter:["Strings","Bowed strings","Winds"],pad:["Keys & organs","Strings"]}};
function paletteFor(engine,role,voices,channel="mixed"){
 const categories=ENGINE_TIMBRES[engine]?.[role]||[];
 const preferred=new Set(categories.flatMap(name=>VOICE_FAMILIES[name]||[]));
 const enginePool=voices.filter(voice=>preferred.has(voice));
 const stationCategories=CHANNEL_TIMBRES[channel]?.[role];
 if(!stationCategories)return enginePool.length>=2?enginePool:voices;
 const stationAllowed=new Set(stationCategories.flatMap(name=>VOICE_FAMILIES[name]||[]));
 const both=enginePool.filter(voice=>stationAllowed.has(voice));
 const stationPool=voices.filter(voice=>stationAllowed.has(voice));
 return both.length>=2?both:stationPool.length>=2?stationPool:
   enginePool.length>=2?enginePool:voices;
}
function planNext(expand=true){
 const old=current;
 const profile=chooseRadioProfile(old,Math.random,selectedChannel);
 const sameChannel=old?.channel===profile.channel;
 const seed=rngToken();
 // Genre programmes share the editor's broad recorded-voice palettes.
 // Mixed still follows engine-specific timbres and station-independent logic.
 const voices=profile.channel==="mixed"?{...DEFAULT_VOICES}:
   planInstrumentPalette(profile.channel,profile.scene,seed,sameChannel?old.voices:null);
 if(profile.channel==="mixed")for(const role of roles){
   const suitable=REGEN_VOICE_POOLS[role].filter(v=>VOICES[v]?.length &&
     (!v.startsWith("vocalSung")||v==="vocalSungNotes"));
   const pool=paletteFor(profile.engine,role,suitable,profile.channel);
   const previous=sameChannel?old.voices[role]:undefined;
   if(previous&&Math.random()<.43&&pool.includes(previous))voices[role]=previous;
   else{
     const options=pool.filter(id=>id!==previous);
     voices[role]=choice(options.length?options:pool);
   }
 }
 const oldDrums=sameChannel?old.drumSounds:null;
 const drumSounds=Object.fromEntries(drums.map(id=>
   [id,oldDrums&&Math.random()<.7?oldDrums[id]:selectDrum(id)]));
 if(profile.channel==="dnb"){
   // The acoustic kit is chosen per event by soundFor(), including dynamic
   // layers and round robins for ghosts. There are no generic 808 overrides.
 }else if(profile.channel==="pop"){
   for(const [id,matcher] of Object.entries({
     kick:/punchy|warm|round/i,snare:/snappy|full/i,
     clap:/clap|wide/i,hat:/hat|crisp/i
   })){
     const candidates=DRUMS[id].map((s,i)=>({i,label:s.label||""}))
       .filter(s=>matcher.test(s.label));
     if(candidates.length)drumSounds[id]=choice(candidates).i;
   }
 }
 if(profile.channel==="classical"){
  // Plan the ENTIRE song now, even for lightweight novelty comparisons.
  const phiScore=planPhiSong({seed,key:profile.key,mode:profile.mode,
    targetLoops:profile.targetLoops});
  const candidate={...profile,seed,voices,drumSounds,phiScore,
    title:radioTitleForSeed(seed,radioWords),events:phiScore.events,
    progression:phiScore.harmony,ready:false,missing:0};
  return expand?finishRadioForm(candidate):candidate;
 }
 // Every non-Classical station uses the same whole-first architecture,
 // with a distinct melodic/harmonic/groove grammar per channel.
 if(profile.channel!=="classical"){
  const songScore=planWholeRadioSong({...profile,seed});
  const candidate={...profile,seed,voices,drumSounds,songScore,
    title:radioTitleForSeed(seed,radioWords),events:songScore.events,
    progression:songScore.harmony,ready:false,missing:0};
  return expand?finishRadioForm(candidate):candidate;
 }
 const genreHarmony=planGenreHarmony({channel:profile.channel,seed,key:profile.key,mode:profile.mode,scene:profile.scene});
 const ecologyGenome=profile.engine==="ecology"?
   planEcology({seed,key:profile.key,mode:profile.mode,
     previous:sameChannel?(old.ecologyGenome||livingGenome):null}):undefined;
 const piece=composeWithEngine({seed,key:profile.key,mode:profile.mode,style:profile.style,engine:profile.engine,
   bpm:profile.bpm,density:profile.density,swing:profile.swing,ecologyGenome,
   harmonyOverrides:genreHarmony});
 const oldPercussion=sameChannel?old.sections?.at(-1)?.events.filter(e=>drums.includes(e.track))??[]:[];
 const keep=sameChannel&&profile.channel==="mixed"?choice([
   ["kick","hat"],["kick","snare"],["hat","openhat"],["kick"],["snare","hat"],[]
 ]):[];
 if(sameChannel&&profile.engine!=="ambient"&&profile.change!=="new variation"&&keep.length===0)keep.push("kick");
 if(profile.engine==="ambient")keep.length=0;
 for(const id of keep)drumSounds[id]=old.drumSounds[id];
 const percussion=piece.events.filter(e=>drums.includes(e.track)&&!keep.includes(e.track))
   .concat(oldPercussion.filter(e=>keep.includes(e.track)));
 const candidate={...profile,seed,voices,drumSounds,genreHarmony,ecologyGenome:piece.ecologyGenome,baseComposition:piece,
   keep,oldPercussion,title:radioTitleForSeed(seed,radioWords),events:[...percussion,...piece.events.filter(e=>!drums.includes(e.track))],
   progression:piece.progression,ready:false,missing:0};
 // Five candidates are compared by their first phrase. The remaining four to
 // six sections are only composed for the winner, not on the audio hot path.
 return expand?finishRadioForm(candidate):candidate;
}
function soundFor(piece,e){
  if(piece.channel==="hiphop"&&drums.includes(e.track)){
    const recorded=hiphopDrumSample(piece.scene,e.track,e.step,piece.seed);
    if(recorded)return recorded;
  }
  if(piece.channel==="dnb"&&drums.includes(e.track)){
    // Jungle/roller/liquid use acoustic breaks; techstep and jump-up use hybrids.
    const hybrid=piece.scene==="techstep"||piece.scene==="jump-up";
    const electronic=hybrid&&(e.track==="kick"||
      piece.scene==="techstep"&&e.track==="hat"||
      piece.scene==="techstep"&&e.track==="snare"&&e.velocity>=.34);
    if(!electronic){
      const recorded=dnbDrumSample(e.track,e.velocity,e.step,piece.seed);
      if(recorded)return recorded;
    }
  }
  if(drums.includes(e.track)){
    const choices=DRUMS[e.track];
    return choices[Math.max(0,Math.min(piece.drumSounds[e.track]??0,choices.length-1))];
  }
  return nearestSample(e.track==="bass"&&e.sampleVoice?e.sampleVoice:piece.voices[e.track],e.note,e.velocity);
}
function uniqueSamples(piece,sectionIndex=0){
 const section=piece.sections?.[sectionIndex];
 const events=section?.events??piece.events;
 return [...new Map(events.filter(e=>piece.channel==="classical"||piece.songScore||!section||sectionAllowsNote(e,section.role))
   .map(e=>{const s=soundFor(piece,e);return [s.url,s]})).values()];
}
async function loadSound(s){
 if(sampleCache.has(s.url))return sampleCache.get(s.url);
 if(pendingSamples.has(s.url))return pendingSamples.get(s.url);
 const promise=(async()=>{
   const url=LOCAL_SAMPLES[s.url];
   // A broken catalogue entry must never be replaced with generated audio.
   if(!url)throw Error("Built-in recording missing from the site's audio map");
   const response=await fetch(url,{cache:"force-cache"});
   if(!response.ok)throw Error("Audio HTTP "+response.status);
   const buffer=await ctx.decodeAudioData(await response.arrayBuffer());
   if(!buffer.duration||!buffer.length)throw Error("Empty audio recording");
   sampleCache.set(s.url,buffer);failures.delete(s.url);
   return buffer;
 })();
 pendingSamples.set(s.url,promise);
 try{return await promise}finally{pendingSamples.delete(s.url)}
}
async function prepare(piece,sectionIndex=0){
 const part=piece.sections?.[sectionIndex]??piece;
 const list=uniqueSamples(piece,sectionIndex).filter(s=>!sampleCache.has(s.url));
 let index=0;const errors=[];
 await Promise.all(Array.from({length:5},async()=>{
   while(index<list.length){
     const sample=list[index++];
     try{await loadSound(sample)}
     catch(error){errors.push(error.message);failures.set(sample.url,error.message)}
   }
 }));
 part.missing=errors.length;
 part.ready=errors.length===0;
 if(sectionIndex===0){piece.missing=errors.length;piece.ready=part.ready}
 if(!part.ready)throw Error(errors[0]||"Recordings unavailable");
 return piece;
}
async function warmNextSection(piece){
 if(piece!==current||!playing||piece.loadingSection)return;
 const index=Math.min(loops+1,piece.sections.length-1);
 if(piece.sections[index]?.ready)return;
 piece.loadingSection=true;
 try{
   await prepare(piece,index);
   if(piece===current&&playing)status("Next section ready");
 }catch(error){
   if(piece===current&&playing)status("Continuing the current section while recordings load");
   console.warn("Human Radio: section preload failed",error);
 }finally{piece.loadingSection=false}
}
async function queueNext(){
 if(loadingNext||next||!current||!playing||Date.now()<nextRetryTime)return;
 loadingNext=true;
 const forVersion=channelVersion;
 try{
   // Several complete *symbolic* pieces are cheap to score. Only download the
   // winning recorded-sample set, avoiding needless network requests.
   const alternatives=Array.from({length:5},()=>planNext(false))
     .sort((a,b)=>
       radioNoveltyScore(b,[current,...recentPieces])+transitionHarmonyScore(current,b)-
       radioNoveltyScore(a,[current,...recentPieces])-transitionHarmonyScore(current,a));
   for(const lightweight of alternatives){
     if(!playing||next||forVersion!==channelVersion)break;
     try{
       const candidate=finishRadioForm(lightweight);
       await prepare(candidate);
       if(playing&&forVersion===channelVersion&&candidate.channel===selectedChannel){
         next=candidate;
         if(skipRequested){
           targetLoops=loops+1;
           skipRequested=false;
           status("Next piece ready · switching at the next eight-bar boundary");
         }else status("Next piece ready");
       }
       break;
     }catch(e){console.warn("Human Radio: next piece skipped",e)}
   }
   if(!next&&playing&&forVersion===channelVersion){
     nextRetryTime=Date.now()+8000;
     status("Continuing this piece while the next piece loads…");
   }
 }finally{
   loadingNext=false;
   if(playing&&!next&&forVersion!==channelVersion)void queueNext();
 }
}
function pruneSampleCache(){
 const keep=[
   [current,Math.min(loops,current?.sections?.length-1||0)],
   [current,Math.min(loops+1,current?.sections?.length-1||0)],
   [next,0]
 ];
 const protect=new Set(keep.filter(([piece])=>piece)
   .flatMap(([piece,index])=>uniqueSamples(piece,index).map(sample=>sample.url)));
 for(const url of recommendedCacheEvictions(sampleCache,protect))sampleCache.delete(url);
 if(failures.size>80)for(const url of [...failures.keys()].slice(0,failures.size-80))failures.delete(url);
}
function gainFor(piece){
  const bus=ctx.createGain();bus.gain.value=0;bus.connect(master);
  piece.bus=bus;return bus;
}
function playNote(piece,e,when,sectionLevel=1,absoluteStep=e.step){
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
  // Keep the original loud/quiet contrast in source-recorded DnB velocity layers.
  const genreDrum=(piece.channel==="dnb"||piece.channel==="hiphop")&&drums.includes(e.track);
   const level=genreDrum?samplePeakGain(buffer):sampleGain(buffer);
  // Phi governs Classical expression only; normal mastering chain stays intact.
  // Musical shape is evaluated against the complete work, never per slice.
  const phiExpression=piece.channel==="classical"&&piece.phiScore?
    phiDynamicGain(128*absoluteStep/piece.phiScore.totalSteps):1;
  const amp=Math.max(.0001,e.velocity*role*level*sectionLevel*phiExpression);
  envelope.gain.setValueAtTime(amp,when);
  envelope.gain.setValueAtTime(amp,when+Math.max(.001,noteLength-fade));
  envelope.gain.linearRampToValueAtTime(.0001,when+noteLength);
  src.connect(envelope);
  if(e.track==="bass"||e.track==="pad"){
    const filter=ctx.createBiquadFilter();filter.type="lowpass";
    filter.frequency.value=e.track==="bass"?(e.sampleVoice==="dnbSub"?160:
       piece.channel==="dnb"?2200:950):1550;
    envelope.connect(filter);filter.connect(piece.bus);
  }else envelope.connect(piece.bus);
  src.start(when);src.stop(when+noteLength+.004);
  visual.onNote(e);
  src.onended=()=>{try{src.disconnect();envelope.disconnect()}catch{}};
}
function switchPiece(at){
 if(!next?.ready){loops=current.sections.length-1;targetLoops=current.sections.length;void queueNext();return}
 const prev=current;
 if(prev.ecologyGenome)livingGenome=prev.ecologyGenome;
 recentPieces.unshift(prev);
 if(recentPieces.length>8)recentPieces.length=8;
 current=next;next=null;loops=0;targetLoops=current.sections.length;
 if(current.ecologyGenome)livingGenome=current.ecologyGenome;
 skipRequested=false;
 displayedSection=-1;segments++;
 changeVisual();
 gainFor(current);
 const blend=Math.min(5,Math.max(2,240/current.bpm));
 current.bus.gain.setValueAtTime(0,at);
 current.bus.gain.linearRampToValueAtTime(.82,at+blend);
 prev.bus.gain.cancelScheduledValues(at);
 prev.bus.gain.setValueAtTime(.82,at);
 prev.bus.gain.linearRampToValueAtTime(.0001,at+blend);
 // Shared actual chord tones connect the outgoing and incoming harmonies.
 // Where there is no common tone, avoid a forced, dissonant pad bridge.
 for(const note of sharedToneBridge(prev,current))playNote(prev,note,at);
 retiringBuses.push({bus:prev.bus,until:at+blend+.5});
 pruneSampleCache();
 showSongIdentity(current);
 status("Now playing");
 syncNowPlaying(true);
 void warmNextSection(current);
}function pump(){
  if(!playing||!ctx||!current)return;
  const now=ctx.currentTime;
  // A suspended/throttled browser may miss scheduling windows. Advance the
  // musical clock without dispatching a pile of notes scheduled in the past.
  if(stepTime<now-.12){
    const duration=60/current.bpm/4;
    const missed=Math.ceil((now-stepTime)/duration);
    loops+=Math.floor((step+missed)/128);
    step=(step+missed)%128;
    stepTime=now+.04;
  }
  for(let i=retiringBuses.length-1;i>=0;i--){
    if(now>=retiringBuses[i].until){
      try{retiringBuses[i].bus.disconnect()}catch{}
      retiringBuses.splice(i,1);
    }
  }
  let count=0;
  while(stepTime<now+.23&&count++<64){
    if(step===0){
      if(loops>=targetLoops)switchPiece(stepTime);
      // Never advance into a section whose real recordings are not ready.
      if(loops<targetLoops&&!current.sections[loops]?.ready){
        loops=Math.max(0,loops-1);
        void warmNextSection(current);
      }
      if(displayedSection!==loops){
        displayedSection=loops;
        const part=current.sections[loops];
        // Keep the piece title stable throughout its musical sections.
        if(loops>0)pruneSampleCache();
        void warmNextSection(current);
      }
    }
    const scheduled=current,localStep=step,section=scheduled.sections[Math.min(loops,targetLoops-1)];
    const eighth=60/scheduled.bpm/4;
    const swingDelay=localStep%2?eighth*scheduled.swing*.5:0;
    for(const e of section.eventsByStep[localStep])
      if(scheduled.channel==="classical"||scheduled.songScore||sectionAllowsNote(e,section.role))
        playNote(scheduled,e,stepTime+swingDelay,
          (scheduled.channel==="classical"||scheduled.songScore)?1:sectionVelocity(section.role,e.track),
          loops*128+localStep);
    step++;
    stepTime+=60/scheduled.bpm/4;
    if(step===128){step=0;loops++;if(loops%2===0)changeVisual()}
  }
  if(!next&&!loadingNext&&loops>=targetLoops-2)void queueNext();
 syncNowPlaying();
}
async function start(){
  $("start").disabled=true;$("play").disabled=true;
  status("Starting audio engine…");
  try{
    if(paused&&current?.ready&&ctx){
      await ctx.resume();
      if(ctx.state!=="running")throw Error("Audio cannot resume");
      paused=false;playing=true;epoch++;
      visual.start();
      $("play").textContent="Ⅱ Pause";$("skip").disabled=false;
      clearInterval(timer);timer=setInterval(pump,25);
      status("Resumed · continuing the same piece and position");
      pump();void warmNextSection(current);
      if(!next&&loops>=targetLoops-2)void queueNext();
      return;
    }
    if(!ctx){
      ctx=new AudioContext();master=ctx.createGain();master.gain.value=.83;
      const safety=ctx.createDynamicsCompressor();
      safety.threshold.value=-12;safety.knee.value=18;safety.ratio.value=3;
      safety.attack.value=.005;safety.release.value=.2;
      const analyser=ctx.createAnalyser();analyser.fftSize=512;analyser.smoothingTimeConstant=.82;
      master.connect(safety);safety.connect(analyser);analyser.connect(ctx.destination);
      visual.attach(analyser);
    }
    // Request audio synchronously within the click gesture, but do not block
    // composition/sample preparation on browsers where resume() stays pending.
    // A pending resume used to make the Start button appear completely inert.
    const audioReady=ctx.state==="running"?Promise.resolve(true):
      ctx.resume().then(()=>true,()=>false);
    status("Composing a complete piece…");
    await loadRadioWords();
    if(!current||!current.ready){
      status("Preparing the first eight bars and decoding the recorded instruments…");
      if(!current)current=planNext();
      await prepare(current);
      // The pre-start selector can change while recordings download.
      // Never start an already superseded station's music.
      if(current.channel!==selectedChannel){
        current=planNext();
        await prepare(current);
      }
      gainFor(current);
      changeVisual();
      current.bus.gain.value=.82;
      showSongIdentity(current);
    }
    if(ctx.state!=="running"){
      status("Piece ready · requesting sound permission…");
      await Promise.race([audioReady,new Promise(resolve=>setTimeout(resolve,3000))]);
    }
    if(ctx.state!=="running"){
      $("start").textContent="▶ Enable sound / retry";
      throw Error("Sound is suspended. Click Enable sound / retry, or allow audio for this site.");
    }
    $("start").textContent="▶ Start listening";
    playing=true;paused=false;epoch++;
    visual.start();
    step=0;loops=0;targetLoops=current.sections.length;displayedSection=-1;
    stepTime=ctx.currentTime+.09;
    $("intro").hidden=true;$("play").textContent="Ⅱ Pause";$("skip").disabled=false;
    status("Now playing");
    timer=setInterval(pump,25);pump();syncNowPlaying(true);void warmNextSection(current);
  }catch(error){
    console.error("Human Radio start failed",error);
    status("Radio could not start: "+error.message);
    $("intro").hidden=false;
  }finally{$("start").disabled=false;$("play").disabled=false}
}
async function pause(){
  playing=false;paused=true;epoch++;
  visual.stop();
  clearInterval(timer);timer=null;
  if(ctx)await ctx.suspend();
  $("play").textContent="▶ Resume";
  $("skip").disabled=true;
  status("Paused · press Resume to continue");
  syncNowPlaying(true);
}
function changeStation(value){
 const channel=validRadioChannel(value);
 if(channel===selectedChannel){updateStationDisplay();return}
 selectedChannel=channel;
 channelVersion++;
 next=null;nextRetryTime=0;
 skipRequested=false;
 livingGenome=null;
 recentPieces.length=0;
 const url=new URL(location.href);
 if(channel==="mixed")url.searchParams.delete("channel");
 else url.searchParams.set("channel",channel);
 history.replaceState(null,"",url.pathname+url.search+url.hash);
 updateStationDisplay();
 visual.setStation(channel);
 if(playing){
   skipRequested=true;
   status("Tuning to "+RADIO_CHANNELS[channel].name+" · preparing recordings for the next bar boundary");
   if(!loadingNext)void queueNext();
 }else if(!paused){
   current=null;
   status("Selected "+RADIO_CHANNELS[channel].name+" · press Start listening");
 }else{
   // Clear any already-scheduled notes from the paused station's bus
   // before the audio context resumes with the new channel.
   if(current?.bus){try{current.bus.disconnect()}catch{}}
   current=null;
   paused=false;
   status("Selected "+RADIO_CHANNELS[channel].name+" · press Play");
 }
}
$("channel").addEventListener("change",()=>changeStation($("channel").value));
$("introChannel").addEventListener("change",()=>changeStation($("introChannel").value));
updateStationDisplay();
$("start").addEventListener("click",start);
$("play").addEventListener("click",()=>playing?pause():start());
$("skip").addEventListener("click",()=>{
  if(!playing)return;
  if(next?.ready){targetLoops=loops+1;status("Switching at the next eight-bar boundary")}
  else{skipRequested=true;status("Preparing the next piece · current loop will continue");void queueNext()}
});
document.addEventListener("visibilitychange",()=>{
 if(document.hidden)visual.stop();
 else if(playing){visual.start();pump()}
});
