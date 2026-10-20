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
