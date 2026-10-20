import {compose,ENGINE_VERSION} from "./composer.js";

const $=id=>document.getElementById(id);
const tracks=["kick","snare","hat","bass","melody"];
const groups=[{name:"Drums",tracks:["kick","snare","hat"]},{name:"Bass",tracks:["bass"]},{name:"Melody",tracks:["melody"]}];
// Fixed upstream revisions, not mutable /main URLs. Both publishers specify CC0.
// Entries deliberately stay external in v0.1 to keep the repository small.
const SOURCES={
  kick:{url:"https://raw.githubusercontent.com/tidalcycles/sounds-tr808-fischer/85fbecf1bec32553395625ea659e2a56dfd7c0e1/bd8/BD5050.WAV"},
  snare:{url:"https://raw.githubusercontent.com/tidalcycles/sounds-tr808-fischer/85fbecf1bec32553395625ea659e2a56dfd7c0e1/sd8/SD5050.WAV"},
  hat:{url:"https://raw.githubusercontent.com/tidalcycles/sounds-tr808-fischer/85fbecf1bec32553395625ea659e2a56dfd7c0e1/ch8/CH.WAV"},
  bass:{url:"https://raw.githubusercontent.com/facebookincubator/Meta-open-sound/e2ff154845994fe4135becc4d5b857c19f172784/systems/instruments/meta-piano/ogg/INSPiano_Vel03_C3_01.ogg",rootMidi:48},
  melody:{url:"https://raw.githubusercontent.com/facebookincubator/Meta-open-sound/e2ff154845994fe4135becc4d5b857c19f172784/systems/instruments/meta-piano/ogg/INSPiano_Vel03_C4_01.ogg",rootMidi:60}
};
let audio=null,buffers={},composition=null,timer=null,playing=false,nextStep=0,nextTime=0;
let nodes=[],muted=new Set();
function message(text){$("status").textContent=text}
function opts(){return {seed:$("seed").value.trim()||"618033",bpm:+$("bpm").value,density:+$("density").value/100,key:$("key").value,mode:$("mode").value}}
function configureFromUrl(){
  const p=new URLSearchParams(location.search);
  if(p.has("seed"))$("seed").value=p.get("seed").slice(0,60);
  if(p.has("bpm")&&Number.isFinite(+p.get("bpm")))$("bpm").value=p.get("bpm");
  if(p.has("density")&&Number.isFinite(+p.get("density")))$("density").value=p.get("density");
  if(["A","C","D","E","G"].includes(p.get("key")))$("key").value=p.get("key");
  if(["minor","major"].includes(p.get("mode")))$("mode").value=p.get("mode");
}
function permalink(){
  const o=opts(),url=new URL(location.href);
  url.search=new URLSearchParams({seed:o.seed,bpm:o.bpm,density:Math.round(o.density*100),key:o.key,mode:o.mode}).toString();
  return url.href;
}
function build(){
  if(playing)stop();
  const o=opts();
  composition=compose(o);
  $("bpmValue").textContent=o.bpm;
  $("densityValue").textContent=Math.round(o.density*100)+"%";
  history.replaceState(null,"",permalink());
  const labels=$("barLabels");labels.textContent="";
  const space=document.createElement("span");labels.append(space);
  for(let i=1;i<=8;i++){
    const s=document.createElement("span");s.textContent=i<10?"0"+i:i;s.className=i===6?"turn":"";labels.append(s);
  }
  const grid=$("grid");grid.textContent="";
  groups.forEach(g=>{
    const row=document.createElement("div");row.className="track"+(muted.has(g.name)?" muted":"");
    const label=document.createElement("label");
    const box=document.createElement("input");box.type="checkbox";box.checked=!muted.has(g.name);
    box.setAttribute("aria-label","Enable "+g.name);
    box.addEventListener("change",()=>{
      box.checked?muted.delete(g.name):muted.add(g.name);
      row.classList.toggle("muted",!box.checked);
    });
    label.append(box,document.createTextNode(g.name));row.append(label);
    for(let bar=0;bar<8;bar++){
      const b=document.createElement("div");b.className="bar"+(bar===5?" turn":"");
      b.title="Bar "+(bar+1);
      for(let s=0;s<16;s++){
        const hits=composition.events.filter(e=>e.step===bar*16+s&&g.tracks.includes(e.track));
        const cell=document.createElement("div");cell.className="hit";
        if(hits.length){
          cell.classList.add("on",g.name.toLowerCase()==="drums"?"kick":g.name.toLowerCase());
          cell.style.opacity=String(Math.min(1,.56+hits.length*.14));
          cell.title=hits.map(e=>e.track+" ("+e.velocity+")").join(", ");
        }
        cell.dataset.step=String(bar*16+s);b.append(cell);
      }
      row.append(b);
    }
    grid.append(row);
  });
  const explain=$("explanation");explain.textContent="";
  const list=document.createElement("ol");
  composition.explanation.forEach(s=>{const li=document.createElement("li");li.textContent=s;list.append(li)});
  explain.append(list);
  message("Composition ready · "+composition.events.length+" deterministic events · engine "+ENGINE_VERSION);
}
function stop(){
  playing=false;if(timer!==null){clearInterval(timer);timer=null}
  nodes.forEach(n=>{try{n.stop(0)}catch{}});nodes=[];
  $("play").textContent="▶ Play loop";
  document.querySelectorAll(".hit.current").forEach(e=>e.classList.remove("current"));
}
function waveform(kind,when,velocity,note,duration){
  const t=when;
  if(kind==="kick"){
    const o=audio.createOscillator(),g=audio.createGain();
    o.type="sine";o.frequency.setValueAtTime(145,t);o.frequency.exponentialRampToValueAtTime(46,t+.16);
    g.gain.setValueAtTime(velocity*.75,t);g.gain.exponentialRampToValueAtTime(.001,t+.32);
    o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.33);nodes.push(o);return;
  }
  if(kind==="snare"||kind==="hat"){
    const size=Math.round(audio.sampleRate*(kind==="hat"?.07:.15));
    const buf=audio.createBuffer(1,size,audio.sampleRate),a=buf.getChannelData(0);
    // Fallback timbre is not part of the deterministic sample guarantee.
    let x=kind==="hat"?9182:3271;
    for(let i=0;i<size;i++){x=(Math.imul(x,1664525)+1013904223)>>>0;a[i]=(x/2147483648-1)}
    const src=audio.createBufferSource(),f=audio.createBiquadFilter(),g=audio.createGain();
    src.buffer=buf;f.type="highpass";f.frequency.value=kind==="hat"?6500:1300;
    g.gain.setValueAtTime(velocity*.38,t);g.gain.exponentialRampToValueAtTime(.001,t+(kind==="hat"?.07:.15));
    src.connect(f).connect(g).connect(audio.destination);src.start(t);src.stop(t+(kind==="hat"?.07:.15));nodes.push(src);return;
  }
  const o=audio.createOscillator(),g=audio.createGain();
  o.type=kind==="bass"?"triangle":"sine";
  o.frequency.setValueAtTime(440*Math.pow(2,(note-69)/12),t);
  g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(velocity*(kind==="bass"?.22:.12),t+.009);
  g.gain.exponentialRampToValueAtTime(.001,t+duration);
  o.connect(g).connect(audio.destination);o.start(t);o.stop(t+duration+.03);nodes.push(o);
}
function schedule(e,when,stepDuration){
  const grp=e.track==="bass"?"Bass":e.track==="melody"?"Melody":"Drums";
  if(muted.has(grp))return;
  const buf=buffers[e.track];
  const dur=Math.max(.04,e.duration*stepDuration);
  if(!buf){waveform(e.track,when,e.velocity,e.note,dur);return}
  const src=audio.createBufferSource(),g=audio.createGain();
  src.buffer=buf;src.playbackRate.value=e.note==null?1:Math.pow(2,(e.note-SOURCES[e.track].rootMidi)/12);
  if(e.track==="bass"){
    const filter=audio.createBiquadFilter();filter.type="lowpass";filter.frequency.value=500;
    src.connect(filter).connect(g);
  }else src.connect(g);
  g.connect(audio.destination);
  const amplitude=e.track==="hat"?.36:e.track==="kick"?.85:e.track==="bass"?.55:e.track==="melody"?.55:.62;
  g.gain.setValueAtTime(Math.max(.001,e.velocity*amplitude),when);
  const length=Math.min(buf.duration/src.playbackRate.value,dur);
  const tail=Math.min(.09,length*.3);
  g.gain.setValueAtTime(e.velocity*amplitude,when+Math.max(.003,length-tail));
  g.gain.linearRampToValueAtTime(.001,when+length);
  src.start(when);
  src.stop(when+length+.01);
  nodes.push(src);
}
async function ensureAudio(){
  if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();
  await audio.resume();
  if(Object.keys(buffers).length===0){
    message("Loading verified CC0 instruments…");
    const results=await Promise.all(Object.entries(SOURCES).map(async([id,source])=>{
      try{const response=await fetch(source.url);if(!response.ok)throw new Error(response.status);
        const buf=await audio.decodeAudioData(await response.arrayBuffer());buffers[id]=buf;return true;
      }catch(e){console.warn("Sample unavailable:",id,e);return false}
    }));
    const found=results.filter(Boolean).length;
    message(found===5?"CC0 sample bank loaded.":found+" / 5 CC0 samples loaded; local synthesis used for unavailable samples.");
  }
}
function tick(){
  if(!playing||!audio)return;
  const stepDuration=60/composition.bpm/4;
  while(nextTime<audio.currentTime+.12){
    const step=nextStep;
    for(const e of composition.events){if(e.step===step)schedule(e,nextTime,stepDuration)}
    nextStep=(nextStep+1)%128;nextTime+=stepDuration;
  }
  // Visual step uses the audio clock, not the scheduler's early queue.
  const since=(audio.currentTime-loopStart)/stepDuration;
  const step=((Math.floor(since)%128)+128)%128;
  document.querySelectorAll(".hit.current").forEach(el=>el.classList.remove("current"));
  document.querySelectorAll('.hit[data-step="'+step+'"]').forEach(el=>el.classList.add("current"));
}
let loopStart=0;
async function togglePlay(){
  if(playing){stop();return}
  const button=$("play");button.disabled=true;button.textContent="Loading…";
  try{
    await ensureAudio();
    playing=true;nextStep=0;nextTime=audio.currentTime+.065;loopStart=nextTime;
    button.textContent="■ Stop";timer=setInterval(tick,25);tick();
  }catch(e){message("Could not start audio: "+e.message);stop()}
  finally{button.disabled=false}
}
function downloadJson(){
  const data={...composition,samples:Object.fromEntries(Object.entries(SOURCES).map(([k,v])=>[k,v.url]))};
  const a=document.createElement("a"),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
  a.href=url;a.download="8bars-"+composition.seed.replace(/[^a-z0-9-]/gi,"-")+".json";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
configureFromUrl();build();
["seed","bpm","density","key","mode"].forEach(id=>$(id).addEventListener(id==="seed"?"change":"input",build));
$("play").addEventListener("click",togglePlay);
$("another").addEventListener("click",()=>{
  const a=new Uint32Array(1);crypto.getRandomValues(a);$("seed").value=String(a[0]);build();
});
$("copy").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(permalink());message("Composition link copied.")}
  catch{message("Copy unavailable. Use the address bar to share this composition.")}
});
$("download").addEventListener("click",downloadJson);
window.addEventListener("pagehide",stop);
