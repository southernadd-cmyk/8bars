import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {planWholeRadioSong,sliceWholeRadioSong} from "../radio-whole-song.js";
import {planPhiSong,slicePhiSong} from "../phi-song-planner.js";
import {planEnsembleParts,coordinateEnsemble} from "../radio-ensemble.js";
const scenarios=[
 {channel:"pop",scene:"indie",engine:"melodic",style:"downtempo",bpm:108},
 {channel:"hiphop",scene:"boom-bap",engine:"pattern",style:"breakbeat",bpm:91},
 {channel:"dnb",scene:"liquid",engine:"melodic",style:"breakbeat",bpm:172},
 {channel:"mixed",scene:"motion",engine:"process",style:"house",bpm:120}
];
function song(opts,seed="ensemble-one",targetLoops=6){
 return planWholeRadioSong({...opts,seed,key:"G",mode:"minor",density:.67,targetLoops});
}
test("instrument entries and exits are planned for every bar, across all stations",()=>{
 for(const targetLoops of [5,6,7]){
  for(const opts of scenarios){
   const p=song(opts,"arrangement-"+targetLoops,targetLoops);
   const {ensemble}=p;
   assert.equal(ensemble.bars.length,p.totalBars);
   assert.equal(ensemble.channel,opts.channel);
   for(let bar=0;bar<p.totalBars;bar++){
    const state=ensemble.bars[bar];
    assert.equal(state.bar,bar);
    assert.equal(state.parts.bass,true);
    assert.ok(["lead","counter","texture"].includes(state.foreground));
    assert.ok(!(state.parts.lead&&state.parts.counter),"No competing main lines in same bar");
    assert.ok(!(state.parts.arp&&state.parts.lead),"Arpeggio must make room for lead");
    assert.ok(!(state.parts.arp&&state.parts.chords&&state.parts.pad),
      "No simultaneous harmonic clutter");
   }
   assert.ok(ensemble.bars.some(s=>s.parts.counter),"At least one phrase answer per song");
   assert.ok(ensemble.bars.some(s=>s.parts.lead),"A central melody persists");
   assert.ok(ensemble.bars.some(s=>s.parts.pad||s.parts.chords),"Harmonic support persists");
   assert.ok(ensemble.bars.some(s=>s.parts.arp)||!["pop","mixed"].includes(opts.channel));
   assert.deepEqual(p,song(opts,"arrangement-"+targetLoops,targetLoops));
   const sections=sliceWholeRadioSong(p);
   assert.deepEqual(sections.flatMap((s,i)=>s.events.map(e=>({...e,step:e.step+i*128}))),p.events);
  }
 }
});
test("the counter-melody is a literal answer to earlier notes, not an independent random tune",()=>{
 for(const opts of scenarios){
  const p=song(opts,"test-answers");
  const answers=p.events.filter(e=>e.track==="counter"&&e.tag?.startsWith("answer to "));
  assert.ok(answers.length>=2,opts.channel+" must contain actual replies");
  for(const e of answers){
   assert.ok(Number.isInteger(e.sourceStep));
   assert.ok(e.sourceStep<e.step,opts.channel+" response must follow its stimulus");
   assert.ok(p.events.some(v=>v.track==="lead"&&v.step===e.sourceStep),
     opts.channel+" answer source must be a heard lead note");
   assert.equal(p.ensemble.bars[Math.floor(e.step/16)].foreground,"counter");
   assert.ok(!p.events.some(v=>v.track==="lead"&&v.step<=e.step&&v.step+v.duration>e.step),
     opts.channel+" reply must not talk over the lead");
  }
 }
});
test("bass and recorded drums are rhythmically related, keeping genre distinction",()=>{
 for(const opts of scenarios.filter(s=>s.channel!=="mixed")){
  const p=song(opts,"lock-kick");
  const kicks=new Set(p.events.filter(e=>e.track==="kick").map(e=>e.step));
  const bass=p.events.filter(e=>e.track==="bass"&&!e.sampleVoice);
  assert.ok(kicks.size>p.totalBars,opts.channel+" should retain percussion");
  assert.ok(bass.some(e=>kicks.has(e.step)),"Bass should anchor some genuine kicks");
  if(opts.channel==="dnb")assert.ok(p.events.some(e=>e.sampleVoice==="dnbSub"),
    "Keep the genuine sampled sub");
 }
});
test("classical also has a complete, explicit ensemble plan and coherent responses",()=>{
 for(const targetLoops of [5,6,7]){
  const p=planPhiSong({seed:"chamber-ensemble",key:"D",mode:"minor",targetLoops});
  assert.equal(p.ensemble.channel,"classical");
  assert.equal(p.ensemble.bars.length,p.totalBars);
  assert.ok(p.ensemble.bars.some(s=>s.parts.counter));
  assert.ok(p.events.some(e=>e.track==="counter"&&e.tag?.startsWith("answer to ")));
  assert.equal(slicePhiSong(p).length,targetLoops);
 }
});
test("whole-song coordination preserves global climax, cadence and original mastering",()=>{
 for(const opts of scenarios){
  const p=song(opts,"cadence-check");
  assert.equal(p.events.filter(e=>e.tag==="golden climax").length,1);
  assert.ok(p.events.some(e=>e.tag==="final tonic"&&e.step===p.totalSteps-16));
  assert.ok(p.events.some(e=>e.tag==="final cadence"&&e.step===p.totalSteps-16));
 }
 const src=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
 assert.match(src,/master\.gain\.value=\.83/);
 assert.match(src,/const safety=ctx\.createDynamicsCompressor/);
 const modules=["radio-whole-song.js","phi-song-planner.js"];
 for(const file of modules){
  const source=readFileSync(new URL("../"+file,import.meta.url),"utf8");
  assert.match(source,/planEnsembleParts\(/);
  assert.match(source,/coordinateEnsemble\(/);
 }
});
