import test from "node:test";
import assert from "node:assert/strict";
import {restoreVolumes} from "../settings.js";
import {TRACKS} from "../composer.js";
const ids=TRACKS.map(t=>t.id);
const defaults=Object.fromEntries(ids.map(id=>[id,id==="pad"?.5:id==="counter"?.65:.85]));
test("an ordinary first visit keeps all 12 channels audible",()=>{
 for(const param of [null,undefined,""]){
   const output=restoreVolumes(param,defaults,ids);
   assert.deepEqual(output,defaults);
   assert.ok(Object.values(output).every(level=>level>0));
 }
});
test("links corrupted by previous 12-zero bug recover full default mixer",()=>{
 const broken=ids.map(()=>"0.00").join(",");
 assert.deepEqual(restoreVolumes(broken,defaults,ids),defaults);
});
test("valid shared links preserve user-set channel levels",()=>{
 const saved=ids.map((id,i)=>i===0?"0.25":i===1?"0":"0.8").join(",");
 const output=restoreVolumes(saved,defaults,ids);
 assert.equal(output[ids[0]],.25);
 assert.equal(output[ids[1]],0);
 assert.equal(output[ids[2]],.8);
});
test("missing or invalid individual channel values leave sensible defaults",()=>{
 const result=restoreVolumes(",,NaN,2,-9",defaults,ids);
 assert.equal(result[ids[0]],defaults[ids[0]]);
 assert.equal(result[ids[1]],defaults[ids[1]]);
 assert.equal(result[ids[2]],defaults[ids[2]]);
 assert.equal(result[ids[3]],1);
 assert.equal(result[ids[4]],0);
});
test("playback waits for recordings and refuses a partial, silent arrangement",async()=>{
 const {readFileSync}=await import("node:fs");
 const source=readFileSync(new URL("../app.js",import.meta.url),"utf8");
 const start=source.indexOf("async function toggle(){");
 const end=source.indexOf("\nfunction save(blob",start);
 const handler=source.slice(start,end);
 const load=handler.indexOf("await loadSamples()");
 const check=handler.indexOf("const missing=neededSamples().filter");
 const transport=handler.indexOf("transport.start(audio,composition.bpm)");
 assert.ok(load>=0 && check>load && transport>check,"Transport must start only after all required samples are available");
 assert.match(handler,/failures\.clear\(\)/,"A retry must clear previous transient failures");
 assert.match(handler,/if\(missing\.length\)throw Error/);
});

test("recorded samples are connected to the output for ordinary, bass and pad notes",async()=>{
 // Execute the real player function against a small Web Audio graph mock.
 // This catches graph errors that transport-only tests can never detect.
 const {readFileSync}=await import("node:fs");
 const source=readFileSync(new URL("../app.js",import.meta.url),"utf8");
 const start=source.indexOf("function playEvent(");
 const end=source.indexOf("\nfunction audible(",start);
 assert.ok(start>=0&&end>start);
 const segment=source.slice(start,end);
 for(const track of ["lead","bass","pad"]){
   const created=[];
   function node(kind){
     const item={kind,connections:[],connect(other){this.connections.push(other);return other}};
     if(kind==="source"){
       item.playbackRate={value:1};
       item.start=t=>{item.started=t};
       item.stop=t=>{item.stopped=t};
     }
     if(kind==="filter")item.frequency={value:0};
     if(kind==="gain"){
       item.gain={setValueAtTime(){},linearRampToValueAtTime(){}};
     }
     created.push(item);
     return item;
   }
   const context={
     createBufferSource:()=>node("source"),
     createGain:()=>node("gain"),
     createBiquadFilter:()=>node("filter")
   };
   const destination=node("destination");
   const samples=new Map([["local.wav",{duration:2}]]);
   const makePlayer=new Function("sampleFor","buffers","composition","isDrum",
     segment+"\nreturn playEvent;");
   const player=makePlayer(
     ()=>({url:"local.wav",root:69}),samples,{bpm:96},
     id=>["kick","snare","hat"].includes(id)
   );
   const result=player(context,{track,note:69,duration:2,velocity:.75},.1,destination);
   const src=created.find(n=>n.kind==="source");
   const gain=created.find(n=>n.kind==="gain");
   assert.equal(result,src);
   assert.deepEqual(src.connections,[gain],track+" sample source must connect to gain");
   assert.ok(src.started!==undefined&&src.stopped>src.started);
   const filter=created.find(n=>n.kind==="filter");
   if(filter){
     assert.deepEqual(gain.connections,[filter]);
     assert.deepEqual(filter.connections,[destination]);
   }else assert.deepEqual(gain.connections,[destination]);
 }
});

test("switching sounds during a download queues the newly selected recording",async()=>{
 const {readFileSync}=await import("node:fs");
 const source=readFileSync(new URL("../app.js",import.meta.url),"utf8");
 const start=source.indexOf("async function loadSamples(){");
 const end=source.indexOf("\nfunction sampleFor(event){",start);
 assert.ok(start>=0&&end>start);
 const segment=source.slice(start,end);
 let selected="first",releaseFirst;
 const requested=[],buffers=new Map(),failures=new Set();
 const fetchSample=url=>{
   requested.push(url);
   if(url==="first")return new Promise(resolve=>{releaseFirst=resolve});
   return Promise.resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});
 };
 const loader=new Function("neededSamples","buffers","failures","sourceId","getSample","audio","fetch","say","LOCAL_SAMPLES",
   "let loading=false,loadAgain=false,playing=true,loadPromise=null;\n"+segment+"\nreturn loadSamples;"
 )(
   ()=>[{url:selected}],buffers,failures,()=>null,async()=>null,
   {decodeAudioData:async()=>({duration:1})},fetchSample,()=>{},{}
 );
 const pending=loader();
 selected="second";
 const queued=loader();
 assert.equal(typeof releaseFirst,"function");
 releaseFirst({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});
 await Promise.all([pending,queued]);
 assert.deepEqual(requested,["first","second"]);
 assert.equal(buffers.size,2);
 assert.equal(failures.size,0);
});

test("missing instrument recordings do not trigger synthetic imitations",async()=>{
 const {readFileSync}=await import("node:fs");
 const source=readFileSync(new URL("../app.js",import.meta.url),"utf8");
 assert.doesNotMatch(source,/function fallback\(/);
 assert.doesNotMatch(source,/createOscillator\s*\(/,"Entire app must use recorded samples, not synthesized tones");
 assert.doesNotMatch(source,/testAudio|audioTest/,"Synthetic diagnostic should not remain in app");
 const start=source.indexOf("function playEvent("),end=source.indexOf("\nfunction audible(",start);
 assert.ok(start>=0&&end>start);
 const player=new Function("sampleFor","buffers","composition","isDrum",source.slice(start,end)+"\nreturn playEvent;")(
  ()=>({url:"missing.wav",root:60}),new Map(),{bpm:96},()=>false);
 let oscillators=0;
 const context={createOscillator(){oscillators++;throw Error("No oscillator fallback allowed")}};
 assert.equal(player(context,{track:"lead",note:60,duration:2,velocity:.6},.1,{}),null);
 assert.equal(oscillators,0);
});

test("WAV export rejects unavailable recordings",async()=>{
 const {readFileSync}=await import("node:fs");
 const source=readFileSync(new URL("../app.js",import.meta.url),"utf8");
 assert.match(source,/const missing=neededSamples\(\)\.filter\(sound=>!buffers\.has\(sound\.url\)\)/);
 assert.match(source,/if\(missing\.length\)throw Error/);
});
