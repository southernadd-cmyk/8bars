import test from "node:test";
import assert from "node:assert/strict";
import {VCSL_REF,VCSL_VOICES,VCSL_DRUMS} from "../vcsl-samples.js";
import {DRUMS,VOICES,VOICE_NAMES,VOICE_FAMILIES,REGEN_VOICE_POOLS,nearestSample} from "../sounds.js";

test("large CC0 recording catalogue uses genuine GitHub-source WAV paths",()=>{
 assert.match(VCSL_REF,/^[a-f0-9]{40}$/);
 const pitched=Object.entries(VCSL_VOICES);
 assert.ok(pitched.length>=50,"Expected fifty new playable instrument/articulation choices");
 const all=[];
 for(const [id,entry] of pitched){
   assert.ok(entry.files.length>=6,id+": insufficient recorded samples");
   assert.ok(new Set(entry.files.map(([root])=>root)).size>=5,id+": insufficient actual recorded pitches");
   assert.ok(VOICE_NAMES[id]&&VOICE_FAMILIES[entry.family].includes(id),id+": missing picker entry");
   assert.equal(VOICES[id].length,entry.files.length);
   for(const [root,path,velocity] of entry.files){
     assert.ok(root>=21&&root<=108,id+": invalid note");
     assert.ok(velocity>0&&velocity<=100,id+": invalid velocity layer");
     assert.ok(path.endsWith(".wav")&&!path.includes("Electrophones/"),id+": not a recorded acoustic WAV");
     all.push(path);
   }
 }
 assert.ok(all.length>=1300,"Too few authentic multi-pitch recordings");
 assert.equal(new Set(all).size,all.length,"No file counted twice as different pitched samples");
 for(const [track,entries] of Object.entries(VCSL_DRUMS)){
   assert.ok(entries.length>20,track+": too few acoustic drum hits");
   assert.ok(entries.every(([path])=>path.endsWith(".wav")),track+": non-WAV source");
   assert.ok(DRUMS[track==="openHat"?"openhat":track].length>entries.length);
 }
 assert.ok(REGEN_VOICE_POOLS.lead.some(id=>id.startsWith("vc")));
 const selected=nearestSample(pitched[0][0],72,.7);
 assert.ok(selected?.url.includes(VCSL_REF));
});
