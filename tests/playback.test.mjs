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
test("audio transport starts before network-dependent sample loading",async()=>{
 const {readFileSync}=await import("node:fs");
 const source=readFileSync(new URL("../app.js",import.meta.url),"utf8");
 const transport=source.indexOf("transport.start(audio,composition.bpm)");
 const request=source.indexOf("void loadSamples()",transport);
 assert.ok(transport>0&&request>transport,"Audio playback must start before samples download");
 assert.ok(!source.slice(transport,request).includes("await loadSamples()"));
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
   const makePlayer=new Function("sampleFor","buffers","composition","fallback","isDrum",
     segment+"\nreturn playEvent;");
   const player=makePlayer(
     ()=>({url:"local.wav",root:69}),samples,{bpm:96},
     ()=>{throw Error("Should use loaded samples")},id=>["kick","snare","hat"].includes(id)
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
