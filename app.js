import {compose,TRACKS,STYLES,ENGINE_VERSION} from "./composer.js";
import {restoreVolumes} from "./settings.js";
import {createTransport} from "./transport.js";
import {allSamples,saveSample,getSample,removeSample,localSource,sourceId,ACCEPT_AUDIO} from "./audio-files.js";
import {DRUMS,VOICES,DEFAULT_VOICES,DRUM_VARIATIONS,VOICE_NAMES,nearestSample,inventory} from "./sounds.js";
const $=id=>document.getElementById(id);
const isDrum=id=>TRACKS.find(t=>t.id===id)?.type==="drum";
const tones=TRACKS.filter(t=>t.type==="pitched").map(t=>t.id);
let userLibrary=[];
const userAssignments=new Map();
const USER_SELECTIONS="8bars:sample-assignments";
const state={
  seed:"618033",bpm:96,density:65,swing:12,key:"A",mode:"minor",style:"downtempo",
  variations:Object.fromEntries(TRACKS.map(t=>[t.id,0])),
  voices:{...DEFAULT_VOICES},drumSounds:Object.fromEntries(TRACKS.filter(t=>t.type==="drum").map(t=>[t.id,0])),
  volumes:Object.fromEntries(TRACKS.map(t=>[t.id,t.id==="pad"?.5:t.id==="counter"?.65:.85])),
  muted:new Set(),solo:new Set()
};
let composition=null, audio=null, master=null, buses={}, buffers=new Map(), failures=new Set();
let playing=false,transport=null,startTime=0,activeNodes=[],rendering=false,loading=false;
let eventsByStep=Array.from({length:128},()=>[]), lastDisplayedStep=-1, lastDisplayedBar=-1, schedulingErrors=0;
const SIXTEENTHS=128, STEPS=16;
const PITCH={kick:36,snare:38,clap:39,hat:42,openhat:46,perc:45};
function say(message){$("status").textContent=message}
const savedNum=(v,defaultVal,min,max)=>v!==null && v!==undefined && String(v).trim()!=="" && Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):defaultVal;
function loadLink(){
 const p=new URLSearchParams(location.search);
 state.seed=(p.get("seed")||state.seed).slice(0,64);
 state.bpm=savedNum(p.get("bpm"),96,60,170);
 state.density=savedNum(p.get("density"),65,15,100);
 state.swing=savedNum(p.get("swing"),12,0,65);
 if(["major","minor"].includes(p.get("mode")))state.mode=p.get("mode");
 if(STYLES.includes(p.get("style")))state.style=p.get("style");
 if(["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"].includes(p.get("key")))state.key=p.get("key");
 const v=(p.get("variations")||"").split(",");
 TRACKS.forEach((t,i)=>state.variations[t.id]=savedNum(v[i],0,0,99999));
 const inst=(p.get("voices")||"").split(",");
 tones.forEach((id,i)=>{if(VOICES[inst[i]])state.voices[id]=inst[i]});
 const drum=(p.get("drums")||"").split(",");
 TRACKS.filter(t=>t.type==="drum").forEach((t,i)=>state.drumSounds[t.id]=savedNum(drum[i],0,0,DRUMS[t.id].length-1));
 state.volumes=restoreVolumes(p.get("volumes"),state.volumes,TRACKS.map(t=>t.id));
 for(const id of (p.get("muted")||"").split(","))if(TRACKS.some(t=>t.id===id))state.muted.add(id);
 for(const id of (p.get("solo")||"").split(","))if(TRACKS.some(t=>t.id===id))state.solo.add(id);
}
function permalink(){
 const u=new URL(location.href),q=new URLSearchParams();
 for(const id of ["seed","bpm","density","swing","key","mode","style"])q.set(id,state[id]);
 q.set("variations",TRACKS.map(t=>state.variations[t.id]).join(","));
 q.set("voices",tones.map(id=>state.voices[id]).join(","));
 q.set("drums",TRACKS.filter(t=>t.type==="drum").map(t=>state.drumSounds[t.id]).join(","));
 q.set("volumes",TRACKS.map(t=>state.volumes[t.id].toFixed(2)).join(","));
 if(state.muted.size)q.set("muted",[...state.muted].join(","));
 if(state.solo.size)q.set("solo",[...state.solo].join(","));
 u.search=q.toString();return u.href;
}
function syncUrl(){history.replaceState(null,"",permalink())}
function syncControls(){
 for(const id of ["seed","bpm","density","swing","key","mode","style"])$(id).value=state[id];
 $("bpmValue").textContent=state.bpm;
 $("densityValue").textContent=state.density+"%";
 $("swingValue").textContent=state.swing+"%";
}
function updateBuses(){
 for(const t of TRACKS){
   if(!buses[t.id])continue;
   const audible=!state.muted.has(t.id)&&(state.solo.size===0||state.solo.has(t.id));
   buses[t.id].gain.setTargetAtTime(audible?state.volumes[t.id]:0,audio.currentTime,.01);
 }
}
function rerender(){
 if(playing)stop();
 composition=compose({...state,density:state.density/100,swing:state.swing/100});
 eventsByStep=Array.from({length:128},()=>[]);
 for(const event of composition.events)eventsByStep[event.step].push(event);
 syncControls();syncUrl();paint();
 say("Arrangement ready.");
}
function el(tag,cls,text){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=text;
 return node;
}
function makeButton(text,cls,title,fn){
 const b=el("button",cls,text);b.type="button";b.title=title;b.addEventListener("click",fn);return b;
}
function paint(){
 const grid=$("grid"),labels=$("barLabels");grid.replaceChildren();labels.replaceChildren(el("span","track-heading","Tracks"));
 for(let i=1;i<=8;i++)labels.append(el("span",i===6?"turn":"",String(i)));
 const byTrack=new Map(TRACKS.map(t=>[t.id,Array.from({length:128},()=>[])]));
 for(const e of composition.events)byTrack.get(e.track)[e.step].push(e);
 for(const t of TRACKS){
   const row=el("div","track-row"),ctrl=el("div","track-ctrl"),head=el("div","track-id");
   head.append(el("span","track-dot"),el("span","track-name",t.name));
   head.querySelector(".track-dot").style.background=t.color;
   ctrl.append(head);
   const mix=el("div","track-mix");
   const mute=makeButton("M","micro"+(state.muted.has(t.id)?" selected":""),"Mute "+t.name,()=>{
     state.muted.has(t.id)?state.muted.delete(t.id):state.muted.add(t.id);updateBuses();paint();syncUrl();
   });
   mute.setAttribute("aria-pressed",String(state.muted.has(t.id)));
   const solo=makeButton("S","micro"+(state.solo.has(t.id)?" selected solo":""),"Solo "+t.name,()=>{
     state.solo.has(t.id)?state.solo.delete(t.id):state.solo.add(t.id);updateBuses();paint();syncUrl();
   });
   solo.setAttribute("aria-pressed",String(state.solo.has(t.id)));
   const select=el("select","instrument");
   select.setAttribute("aria-label",t.name+" sample or instrument");
   if(t.type==="drum"){
     const choices=el("optgroup");choices.label="CC0 recordings";
     DRUMS[t.id].forEach((item,i)=>choices.append(new Option(item.label||("Variation "+(i+1)),String(i))));
     select.append(choices);
   }else{
     const choices=el("optgroup");choices.label="CC0 instruments";
     Object.entries(VOICE_NAMES).forEach(([k,label])=>choices.append(new Option(label,k)));
     select.append(choices);
   }
   const owned=userLibrary; // Any imported sound may be used on any channel.
   if(owned.length){
     const custom=el("optgroup");custom.label="Your samples (this browser)";
     for(const item of owned)custom.append(new Option(item.name,"local:"+item.id));
     select.append(custom);
   }
   select.value=userAssignments.has(t.id)?"local:"+userAssignments.get(t.id):
     String(t.type==="drum"?state.drumSounds[t.id]:state.voices[t.id]);
   select.addEventListener("change",()=>{
     if(playing)stop();
     if(select.value.startsWith("local:"))userAssignments.set(t.id,select.value.slice(6));
     else{
       userAssignments.delete(t.id);
       if(t.type==="drum")state.drumSounds[t.id]=Number(select.value);
       else state.voices[t.id]=select.value;
     }
     persistAssignments();
     syncUrl();
     say(userAssignments.has(t.id)?"Imported sample selected for "+t.name:"CC0 sample selected for "+t.name);
   });
   const volume=el("input","volume");volume.type="range";volume.min="0";volume.max="100";volume.step="1";
   volume.value=String(Math.round(state.volumes[t.id]*100));volume.title="Volume for "+t.name;
   volume.setAttribute("aria-label",t.name+" volume");
   volume.addEventListener("input",()=>{state.volumes[t.id]=+volume.value/100;updateBuses();syncUrl()});
   const mutate=makeButton("↻","micro regen","Regenerate "+t.name+" only",()=>{
     state.variations[t.id]++;rerender();
   });
   mix.append(mute,solo,select,volume,mutate);ctrl.append(mix);row.append(ctrl);
   const lane=el("div","track-lane");
   const steps=byTrack.get(t.id);
   for(let b=0;b<8;b++){
     const segment=el("div","bar"+(b===5?" turn":""));
     segment.title="Bar "+(b+1)+" — "+t.name;
     for(let i=0;i<16;i++){
       const hits=steps[b*16+i],cell=el("div","hit"+(hits.length?" on":""));
       cell.style.setProperty("--hit-color",t.color);cell.dataset.step=b*16+i;
       if(hits.length)cell.title=hits.map(h=>h.track+(h.note===undefined?"":" MIDI "+h.note)).join(", ");
       segment.append(cell);
     }
     lane.append(segment);
   }
   row.append(lane);grid.append(row);
 }
 $("eventCount").textContent=composition.events.length+" EVENTS · "+TRACKS.length+" CHANNELS";
 const description=$("explanation");description.replaceChildren();
 const ol=el("ol");
 for(const item of composition.explanation)ol.append(el("li",null,item));
 description.append(ol);
 const harmony=$("harmony");harmony.replaceChildren();
 for(const chord of composition.progression){
   const cell=el("div","chord");
   cell.append(el("span",null,String(chord.bar)),el("strong",null,chordName(chord)));
   harmony.append(cell);
 }
}
function chordName(chord){
 const root=chord.notes[0]%12;
 const names=["C","C♯","D","E♭","E","F","F♯","G","A♭","A","B♭","B"];
 return names[root]+(chord.notes[1]-chord.notes[0]===3?"m":"");
}
async function audioStart(){
 if(!audio){
   audio=new (window.AudioContext||window.webkitAudioContext)();
   const limiter=audio.createDynamicsCompressor();
   limiter.threshold.value=-12;limiter.knee.value=9;limiter.ratio.value=4;
   master=audio.createGain();master.gain.value=.84;master.connect(limiter).connect(audio.destination);
   for(const t of TRACKS){const g=audio.createGain();g.connect(master);buses[t.id]=g}
 }
 await audio.resume();updateBuses();
}
function selectedLocal(track){
 const id=userAssignments.get(track);
 const record=id&&userLibrary.find(item=>item.id===id);
 return record?localSource(record):null;
}
function neededSamples(){
 const sources=new Map();
 for(const track of TRACKS){
   const own=selectedLocal(track.id);
   if(own){sources.set(own.url,own);continue}
   if(track.type==="drum"){
     const list=DRUMS[track.id],choice=state.drumSounds[track.id]||0;
     const item=list[Math.min(Math.max(choice,0),list.length-1)];
     sources.set(item.url,item);
   }else for(const item of (VOICES[state.voices[track.id]]||VOICES.piano))sources.set(item.url,item);
 }
 return [...sources.values()];
}
async function loadSamples(){
 if(loading)return;
 const items=neededSamples().filter(s=>!buffers.has(s.url)&&!failures.has(s.url));
 if(!items.length)return;
 loading=true;
 let cursor=0,failed=0;
 try{
   async function worker(){
     while(cursor<items.length){
       const item=items[cursor++],id=sourceId(item.url);
       const controller=id?null:new AbortController();
       const tid=controller?setTimeout(()=>controller.abort(),12000):null;
       try{
         let data;
         if(id){
           const record=await getSample(id);
           if(!record)throw Error("Imported sample unavailable in this browser");
           data=await record.blob.arrayBuffer();
         }else{
           const response=await fetch(item.url,{signal:controller.signal});
           if(!response.ok)throw Error("HTTP "+response.status);
           data=await response.arrayBuffer();
         }
         buffers.set(item.url,await audio.decodeAudioData(data));
       }catch(error){
         failed++;failures.add(item.url);
         console.warn("8bars could not decode sample",item.label||item.url,error);
       }finally{if(tid!==null)clearTimeout(tid)}
     }
   }
   await Promise.all(Array.from({length:Math.min(5,items.length)},worker));
 }finally{loading=false}
 if(!playing)say(failed?failed+" sound files unavailable; synthesizer fallback enabled":
     "Sound library ready");
}
function sampleFor(event){
 const own=selectedLocal(event.track);
 if(own)return own;
 if(isDrum(event.track)){
   const options=DRUMS[event.track],choice=state.drumSounds[event.track]||0;
   return options[Math.min(Math.max(choice,0),options.length-1)];
 }
 return nearestSample(state.voices[event.track],event.note);
}
function fallback(ctx,event,when,output,duration){
 // Synthesized contingency sound, not a CC0 sample.
 const osc=ctx.createOscillator(),amp=ctx.createGain();
 osc.type=event.track==="bass"?"triangle":isDrum(event.track)?"square":"sine";
 const hz=event.note===undefined?(event.track==="kick"?70:event.track==="hat"?4300:190):
  440*Math.pow(2,(event.note-69)/12);
 osc.frequency.setValueAtTime(hz,when);
 if(event.track==="kick")osc.frequency.exponentialRampToValueAtTime(45,when+.12);
 const length=Math.max(.02,Math.min(duration,isDrum(event.track)?.19:.75));
 amp.gain.setValueAtTime(Math.max(.001,event.velocity*.14),when);
 amp.gain.exponentialRampToValueAtTime(.001,when+length);
 osc.connect(amp).connect(output);osc.start(when);osc.stop(when+length+.008);
 return osc;
}
function playEvent(ctx,event,when,output){
 const sample=sampleFor(event),buffer=buffers.get(sample.url);
 const duration=Math.max(.04,event.duration*(60/composition.bpm/4));
 if(!buffer)return fallback(ctx,event,when,output,duration);
 const src=ctx.createBufferSource(),gain=ctx.createGain();
 src.buffer=buffer;
 src.connect(gain);
 const playback=event.note===undefined?1:Math.pow(2,(event.note-sample.root)/12);
 src.playbackRate.value=playback;
 const amp=event.velocity*(event.track==="pad"?.35:isDrum(event.track)?.7:event.track==="bass"?.72:.52);
 let outputNode=gain;
 if(event.track==="bass"||event.track==="pad"){
   const filter=ctx.createBiquadFilter();filter.type="lowpass";filter.frequency.value=event.track==="bass"?750:1150;
   gain.connect(filter);outputNode=filter;
 }
 outputNode.connect(output);
 const length=Math.max(.012,Math.min(buffer.duration/playback,duration,event.track==="pad"?2.6:5));
 const fade=Math.min(.13,length*.33);
 gain.gain.setValueAtTime(Math.max(.001,amp),when);
 gain.gain.setValueAtTime(Math.max(.001,amp),when+Math.max(.001,length-fade));
 gain.gain.linearRampToValueAtTime(.001,when+length);
 src.start(when);
 src.stop(when+length+.005);
 return src;
}
function audible(id){return !state.muted.has(id)&&(state.solo.size===0||state.solo.has(id))}
function swingDelay(step,stepDuration){return step%2===1?stepDuration*(state.swing/100)*.5:0}
function stop(){
 playing=false;
 if(transport){transport.stop();transport=null}
 for(const n of activeNodes){try{n.stop()}catch{}}
 activeNodes=[];
 lastDisplayedStep=-1;lastDisplayedBar=-1;
 $("play").textContent="▶ Play";
 document.querySelectorAll(".hit.current").forEach(e=>e.classList.remove("current"));
}
function showStep(){
 if(!playing||!audio||!transport)return;
 const interval=60/composition.bpm/4;
 const now=Math.max(0,Math.floor((audio.currentTime-startTime)/interval)%SIXTEENTHS);
 if(now!==lastDisplayedStep){
   document.querySelectorAll(".hit.current").forEach(e=>e.classList.remove("current"));
   for(const e of document.querySelectorAll('.hit[data-step="'+now+'"]'))e.classList.add("current");
   lastDisplayedStep=now;
 }
 const bar=Math.floor(now/16)+1;
 if(bar!==lastDisplayedBar){
   lastDisplayedBar=bar;
   const count=transport.snapshot();
   say("Playing · bar "+bar+" of 8"+(schedulingErrors?" · Audio error (see console)":""));
 }
}
function scheduleStep(step,when,interval){
 for(const event of eventsByStep[step]){
   if(!audible(event.track))continue;
   try{
     const node=playEvent(audio,event,when+swingDelay(step,interval),buses[event.track]);
     activeNodes.push(node);
     node.onended=()=>{const i=activeNodes.indexOf(node);if(i>=0)activeNodes.splice(i,1)};
   }catch(err){
     schedulingErrors++;
     console.error("8bars audio scheduling failed",event,err);
     // A corrupted/undecodable sample must not silence the entire composition.
     const sample=sampleFor(event);
     if(sample)buffers.delete(sample.url);
     try{
       const node=fallback(audio,event,when,buses[event.track],Math.max(.05,event.duration*interval));
       activeNodes.push(node);
       node.onended=()=>{const i=activeNodes.indexOf(node);if(i>=0)activeNodes.splice(i,1)};
     }catch(fallbackError){
       console.error("8bars synthesis also failed",fallbackError);
     }
   }
 }
}
async function toggle(){
 if(playing){stop();return}
 const b=$("play");b.disabled=true;b.textContent="Starting…";
 try{
   await audioStart();
   if(audio.state!=="running")throw new Error("Audio context is "+audio.state+"; browser playback may be blocked");
   schedulingErrors=0;
   transport=createTransport({
     onStep:scheduleStep,
     onError:(err,step)=>{schedulingErrors++;console.error("8bars transport step "+step+" failed:",err);say("Playback scheduling error; continuing. "+err.message)},
     onProgress:()=>showStep()
   });
   playing=true;
   const init=transport.start(audio,composition.bpm);
   startTime=init.origin;
   b.textContent="■ Stop";
   say("Playing · live synth while samples load");
   if(!loading)void loadSamples().catch(err=>{
     loading=false;console.error("CC0 bank failed",err);
     say("Playing with synthesized fallback: sample library unavailable");
   });
 }catch(err){stop();say("Audio error: "+err.message);console.error("8bars audio startup:",err)}
 finally{b.disabled=false}
}
async function testAudio(){
 try{
   await audioStart();
   if(audio.state!=="running")throw new Error("Web Audio context is "+audio.state);
   const now=audio.currentTime+.03;
   const tone=audio.createOscillator(),gain=audio.createGain();
   tone.type="sine";tone.frequency.setValueAtTime(440,now);
   gain.gain.setValueAtTime(.001,now);
   gain.gain.linearRampToValueAtTime(.18,now+.03);
   gain.gain.exponentialRampToValueAtTime(.001,now+.38);
   tone.connect(gain).connect(master);
   tone.start(now);tone.stop(now+.40);
   say("Audio diagnostic: 440 Hz test tone scheduled. "+(playing?"Loop is running.":"Loop is stopped."));
 }catch(error){
   console.error("8bars audio diagnostic failed",error);
   say("Audio diagnostic failed: "+error.message);
 }
}
function save(blob,filename){
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function stem(){return "8bars-"+state.seed.replace(/[^a-z0-9-_]/gi,"-").slice(0,40)}
function downloadJson(){
 save(new Blob([JSON.stringify({...composition,mixer:{
 voices:state.voices,drumSounds:state.drumSounds,volumes:state.volumes,muted:[...state.muted],solo:[...state.solo]
 },sampleSources:inventory().map(s=>({url:s.url,license:s.license}))},null,2)],{type:"application/json"}),stem()+".json");
}
function vlen(num){
 let value=Math.max(0,Math.floor(num)),bytes=[value&127];value>>>=7;
 while(value){bytes.unshift((value&127)|128);value>>>=7}
 return bytes;
}
function write32(n){return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]}
function chunk(label,bytes){return [...label.split("").map(s=>s.charCodeAt(0)),...write32(bytes.length),...bytes]}
function downloadMidi(){
 const TPQ=480,units=120,tracks=[],tempo=Math.round(60000000/composition.bpm);
 const header=[0,1,0,TRACKS.length+1,1,224];
 const masterEvents=[
 {tick:0,data:[0xff,0x51,3,(tempo>>16)&255,(tempo>>8)&255,tempo&255]},
 {tick:0,data:[0xff,0x58,4,4,2,24,8]}
 ];
 function encode(items){
   let last=0,bytes=[];
   for(const e of items.sort((a,b)=>a.tick-b.tick||a.order-b.order)){
     bytes.push(...vlen(e.tick-last),...e.data);last=e.tick;
   }
   bytes.push(0,0xff,0x2f,0);
   return chunk("MTrk",bytes);
 }
 tracks.push(...encode(masterEvents.map(e=>({...e,order:0}))));
 let pitchChannel=0;
 for(const t of TRACKS){
   const drum=t.type==="drum";
   const channel=drum?9:(pitchChannel>=9?++pitchChannel:pitchChannel++);
   const midiChannel=channel===9&&!drum?10:channel;
   const inst=state.voices[t.id]||"piano",program=inst==="nylon"?24:inst==="steel"?25:0;
   const items=[];
   if(!drum)items.push({tick:0,order:0,data:[0xc0|midiChannel,program]});
   for(const e of composition.events.filter(e=>e.track===t.id)){
     const note=drum?PITCH[t.id]:Math.max(0,Math.min(127,e.note));
     const tick=Math.round(e.step*units + swingDelay(e.step,units)*1);
     const velocity=Math.max(1,Math.min(127,Math.round(e.velocity*110)));
     const length=Math.max(15,Math.round(e.duration*units));
     items.push({tick,order:1,data:[0x90|midiChannel,note,velocity]});
     items.push({tick:tick+length,order:0,data:[0x80|midiChannel,note,0]});
   }
   tracks.push(...encode(items));
 }
 save(new Blob([new Uint8Array([...chunk("MThd",header),...tracks])],{type:"audio/midi"}),stem()+".mid");
 say("MIDI exported with "+TRACKS.length+" separate tracks.");
}
function wavBlob(buffer){
 const frames=buffer.length,channels=2,pcm=new ArrayBuffer(44+frames*channels*2),v=new DataView(pcm);
 const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
 str(0,"RIFF");v.setUint32(4,36+frames*4,true);str(8,"WAVE");str(12,"fmt ");
 v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);
 v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*4,true);
 v.setUint16(32,4,true);v.setUint16(34,16,true);str(36,"data");v.setUint32(40,frames*4,true);
 const L=buffer.getChannelData(0),R=buffer.getChannelData(1);let pos=44;
 for(let i=0;i<frames;i++)for(const val of [L[i],R[i]]){
   const n=Math.max(-1,Math.min(1,val));v.setInt16(pos,n<0?n*32768:n*32767,true);pos+=2;
 }
 return new Blob([pcm],{type:"audio/wav"});
}
async function exportWav(){
 if(rendering||loading)return;
 rendering=true;const b=$("wav");b.disabled=true;b.textContent="Rendering…";
 try{
   await audioStart();await loadSamples();
   const duration=8*4*60/composition.bpm+3,sampleRate=44100;
   const offline=new OfflineAudioContext(2,Math.ceil(duration*sampleRate),sampleRate);
   const sum=offline.createGain();sum.gain.value=.7;sum.connect(offline.destination);
   const trackGains=new Map();
   for(const t of TRACKS){
     const gain=offline.createGain();gain.gain.value=audible(t.id)?state.volumes[t.id]:0;
     gain.connect(sum);trackGains.set(t.id,gain);
   }
   const interval=60/composition.bpm/4;
   for(const e of composition.events)if(audible(e.track))
     playEvent(offline,e,.05+e.step*interval+swingDelay(e.step,interval),trackGains.get(e.track));
   say("Rendering "+duration.toFixed(1)+" seconds of audio…");
   const result=await offline.startRendering();
   save(wavBlob(result),stem()+".wav");say("WAV export ready ("+Math.round(result.duration)+" seconds).");
 }catch(err){say("WAV export failed: "+err.message)}
 finally{rendering=false;b.disabled=false;b.textContent="↓ WAV"}
}
function persistAssignments(){
 try{localStorage.setItem(USER_SELECTIONS,JSON.stringify(Object.fromEntries(userAssignments)))}catch{}
}
async function refreshLibrary(){
 const result=await allSamples();
 userLibrary=result.items;
 for(const [track,id] of [...userAssignments]){
   if(!userLibrary.some(item=>item.id===id))userAssignments.delete(track);
 }
 persistAssignments();
 const items=$("libraryItems");items.replaceChildren();
 if(!userLibrary.length){items.append(el("p",null,"No samples imported yet."));return}
 for(const item of userLibrary){
   const row=el("div","library-entry"),detail=el("div"),actions=el("div","entry-actions");
   detail.append(el("strong",null,item.name),
     el("small",null,(TRACKS.find(t=>t.id===item.track)?.name||item.track)+" · "+(item.size/1048576).toFixed(1)+" MB"));
   const listen=makeButton("▶","preview","Preview imported sound",async()=>{
     try{
       await audioStart();
       const source=localSource(item);
       if(!buffers.has(source.url)){
         const record=await getSample(item.id);
         if(!record)throw Error("File not available");
         buffers.set(source.url,await audio.decodeAudioData(await record.blob.arrayBuffer()));
       }
       const src=audio.createBufferSource(),g=audio.createGain();
       src.buffer=buffers.get(source.url);g.gain.value=.65;src.connect(g).connect(master);src.start();
     }catch(e){$("libraryStatus").textContent="Preview failed: "+e.message}
   });
   const use=makeButton("Use","preview","Assign this audio to the selected channel",()=>{
      const track=$("importChannel").value;
      userAssignments.set(track,item.id);persistAssignments();paint();
      $("libraryStatus").textContent="Assigned "+item.name+" to "+(TRACKS.find(t=>t.id===track)?.name||track)+".";
    });
   const remove=makeButton("Remove","preview","Remove locally stored audio",async()=>{
     await removeSample(item.id);buffers.delete("local:"+item.id);
     await refreshLibrary();paint();
     $("libraryStatus").textContent="Removed "+item.name;
   });
   actions.append(listen,use,remove);row.append(detail,actions);items.append(row);
 }
 const assigned=userLibrary.filter(item=>userAssignments.get(item.track)===item.id).length;
 $("libraryStatus").textContent=userLibrary.length+" imported files"+(result.persistent?" saved in this browser.": " (session only: persistent storage unavailable).")+
   (assigned?" "+assigned+" assigned.":"");
}
async function importAudio(event){
 const files=[...event.target.files||[]];
 if(!files.length)return;
 const track=$("importChannel").value,root=Number($("importRoot").value);
 $("libraryStatus").textContent="Checking audio files…";
 let imported=0;
 try{
   await audioStart();
   for(const file of files){
     try{
       // Reject undecodable files before keeping them in browser storage.
       const buffer=await audio.decodeAudioData(await file.arrayBuffer());
       if(!buffer.duration||!Number.isFinite(buffer.duration))throw Error("No playable audio");
       const {item,persistent}=await saveSample(file,{track,root:isDrum(track)?60:root});
       buffers.set("local:"+item.id,buffer);
       userAssignments.set(track,item.id);
       imported++;
       if(!persistent)console.warn("8bars: persistent browser storage unavailable; file is held for this session only");
     }catch(e){$("libraryStatus").textContent="Could not import "+file.name+": "+e.message;console.warn("Import rejected:",file.name,e)}
   }
   persistAssignments();
   await refreshLibrary();paint();
   if(imported)$("libraryStatus").textContent="Imported "+imported+" file"+(imported===1?"":"s")+" and assigned the latest to "+track+".";
 }catch(e){$("libraryStatus").textContent="Audio import error: "+e.message}
 finally{event.target.value=""}
}
function wireLibrary(){
 const dlg=$("sampleDialog");
 $("openLibrary").addEventListener("click",()=>dlg.showModal());
 $("closeLibrary").addEventListener("click",()=>dlg.close());
 for(const track of TRACKS)$("importChannel").append(new Option(track.name,track.id));
 $("importChannel").value="lead";
 $("importChannel").addEventListener("change",()=>{
   $("rootWrap").hidden=isDrum($("importChannel").value);
 });
 $("importFiles").addEventListener("change",importAudio);
 try{
   const stored=JSON.parse(localStorage.getItem(USER_SELECTIONS)||"{}");
   for(const [track,id] of Object.entries(stored))
     if(TRACKS.some(t=>t.id===track)&&typeof id==="string")userAssignments.set(track,id);
 }catch{}
 void refreshLibrary().then(()=>paint()).catch(e=>console.error("Local library unavailable",e));
}
function wire(){
 for(const id of ["seed","bpm","density","swing","key","mode","style"]){
   $(id).addEventListener(id==="seed"?"change":"input",()=>{
     state[id]=["bpm","density","swing"].includes(id)?+$(id).value:$(id).value;rerender();
   });
 }
 $("play").addEventListener("click",toggle);
 $("audioTest").addEventListener("click",testAudio);
 $("another").addEventListener("click",()=>{
   const a=new Uint32Array(1);crypto.getRandomValues(a);state.seed=String(a[0]);
   state.variations=Object.fromEntries(TRACKS.map(t=>[t.id,0]));rerender();
 });
 $("copy").addEventListener("click",async()=>{
   try{await navigator.clipboard.writeText(permalink());say("Link copied — includes every instrument, level and channel variation.")}
   catch{say("Copy unavailable; use the URL in your browser.")}
 });
 $("download").addEventListener("click",downloadJson);
 $("midi").addEventListener("click",downloadMidi);
 $("wav").addEventListener("click",exportWav);
 window.addEventListener("pagehide",stop);
}
loadLink();wire();wireLibrary();rerender();
