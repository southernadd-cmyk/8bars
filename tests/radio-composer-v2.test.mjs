import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {COMPOSER_STRATEGIES,planComposerV2,planV2Degrees,
 scoreMelodicPhrase} from "../radio-composer-v2.js";
import {planWholeRadioSong,sliceWholeRadioSong} from "../radio-whole-song.js";
import {planPhiSong,slicePhiSong} from "../phi-song-planner.js";
import {radioSignature,radioNoveltyScore} from "../radio-planner.js";
import {GOLDEN_LARGE} from "../phi-dynamics.js";
const genres=[
 {channel:"pop",scene:"indie",engine:"melodic",style:"downtempo"},
 {channel:"hiphop",scene:"boom-bap",engine:"pattern",style:"breakbeat"},
 {channel:"dnb",scene:"liquid",engine:"melodic",style:"breakbeat"},
 {channel:"mixed",scene:"motion",engine:"process",style:"house"}];
const song=(g,seed="v2-testing",loops=6,version=2)=>
 planWholeRadioSong({...g,seed,key:"A",mode:"minor",density:.66,
  bpm:116,targetLoops:loops,composerVersion:version});
const pc=n=>(n+1200)%12;

test("distinct genre-sensitive strategies and forms emerge across seeds",()=>{
 for(const g of [...genres,{channel:"classical",scene:"chamber",engine:"melodic"}]){
  const strategies=new Set(),forms=new Set();
  for(let n=0;n<90;n++){
   const config={...g,seed:"composer-v2-"+n,loops:6};
   const intent=planComposerV2(config);
   assert.ok(COMPOSER_STRATEGIES.includes(intent.strategy));
   assert.equal(intent.version,2);
   assert.deepEqual(intent,planComposerV2(config));
   strategies.add(intent.strategy);
   if(intent.formRoles){
    assert.equal(intent.formRoles.length,6);
    assert.equal(intent.formRoles[0],"opening");
    assert.equal(intent.formRoles.at(-1),"return");
    forms.add(intent.formRoles.join(","));
   }
  }
  assert.ok(strategies.size>=4,g.channel+" should explore multiple musical intentions");
  if(g.channel!=="classical")assert.ok(forms.size>=3,g.channel+" should not reuse one form");
 }
});

test("complete harmony has tonal direction without reverting to one repeated four-bar loop",()=>{
 for(const g of genres){
  const patterns=new Set();
  for(const seed of ["route-a","route-b","route-c","route-d","route-e","route-f"]){
   const p=song(g,seed);
   assert.equal(p.harmony.length,p.totalBars);
   assert.equal(p.harmony[0].degree,0);
   assert.equal(p.harmony[p.turnBar-1].degree,4);
   assert.equal(p.harmony[p.turnBar].degree,0);
   assert.equal(p.harmony[p.climaxBar-1].degree,4);
   assert.equal(p.harmony[p.climaxBar].degree,0);
   assert.deepEqual(p.harmony.slice(-2).map(x=>x.degree),[4,0]);
   const degrees=p.harmony.map(x=>x.degree);
   patterns.add(degrees.join(","));
   assert.ok(new Set(degrees).size>=4,g.channel+" should explore functional harmony");
   const cycles=degrees.slice(4,20);
   assert.notDeepEqual(cycles.slice(0,4),cycles.slice(4,8),
    "Harmonic story should not mechanically reloop every four bars");
  }
  assert.ok(patterns.size>=5,"Different pieces need different harmonic plans");
 }
});

test("V2 commits the best of multiple musical phrase drafts before scoring instruments",()=>{
 for(const g of genres)for(const loops of [5,6,7]){
  const p=song(g,"quality-"+loops,loops);
  assert.equal(p.composerV2.version,2);
  assert.equal(p.composerV2.review.length,p.phrases.length);
  assert.ok(p.composerV2.review.every(q=>q.revisions>=4));
  for(const q of p.composerV2.review){
   assert.ok(Number.isFinite(q.acceptedScore));
   assert.ok(q.acceptedScore<=q.firstDraftScore+1e-9,
    "A revision must never score worse than the first candidate");
  }
  assert.ok(p.events.some(e=>e.track==="lead"&&e.step<128));
  assert.ok(p.events.some(e=>e.track==="lead"&&e.step>=256));
  const melodic=p.events.filter(e=>e.track==="lead"&&e.phraseId!==undefined);
  assert.ok(melodic.length>=10,g.channel+" must have a theme");
  for(const e of melodic){
   assert.ok(e.step>=0&&e.step<p.totalSteps);
   assert.ok(e.note>=56&&e.note<=92);
   if(e.step%16%4===0){
    const chord=p.harmony[Math.floor(e.step/16)];
    assert.ok(chord.notes.some(n=>pc(n)===pc(e.note)),
     "Strong beats must harmonically relate to the whole song");
   }
  }
  const units=sliceWholeRadioSong(p);
  assert.deepEqual(units.flatMap((u,i)=>u.events.map(e=>({...e,step:e.step+i*128}))),p.events);
  assert.deepEqual(p,song(g,"quality-"+loops,loops));
 }
});

test("Classical V2 retains phi timing, phrase-level evaluation and actual orchestration",()=>{
 for(const loops of [5,6,7]){
  const p=planPhiSong({seed:"chamber-v2",key:"D",mode:"minor",targetLoops:loops});
  assert.equal(p.composerV2.version,2);
  assert.equal(p.composerV2.review.length,p.phrases.length);
  for(const q of p.composerV2.review){
   assert.ok(q.acceptedScore<=q.firstDraftScore+1e-9);
   assert.equal(q.revisions,5);
  }
  assert.ok(Math.abs(p.climaxStep-p.totalSteps*GOLDEN_LARGE)<=.51);
  assert.equal(p.events.filter(e=>e.tag==="climax").length,1);
  assert.ok(p.events.some(e=>e.tag==="resolution"));
  const units=slicePhiSong(p);
  assert.deepEqual(units.flatMap((u,i)=>u.events.map(e=>({...e,step:e.step+i*128}))),p.events);
  assert.deepEqual(p,planPhiSong({seed:"chamber-v2",key:"D",mode:"minor",targetLoops:loops}));
 }
});

test("V1 remains available for A/B listening, without changing real radio mastering",()=>{
 for(const g of genres){
  const v1=song(g,"compare-same-seed",6,1);
  const v2=song(g,"compare-same-seed",6,2);
  assert.equal(v1.composerV2,null);
  assert.equal(v2.composerV2.version,2);
  assert.notDeepEqual(v1.events,v2.events);
  assert.ok(v1.events.length>0&&v2.events.length>0);
  assert.ok(v1.harmony.length===v2.harmony.length);
  const sig=radioSignature({songScore:v2,channel:g.channel});
  assert.equal(sig.composerStrategy,v2.composerV2.strategy);
  assert.ok(sig.wholeForm);
  assert.ok(Number.isFinite(radioNoveltyScore({songScore:v2},[{songScore:v1}])));
 }
 const p1=planPhiSong({seed:"compare-phi",composerVersion:1});
 const p2=planPhiSong({seed:"compare-phi",composerVersion:2});
 assert.equal(p1.composerV2,null);
 assert.notDeepEqual(p1.events,p2.events);
 const src=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
 assert.match(src,/composerVersion=new URLSearchParams\(location\.search\)/);
 assert.match(src,/planWholeRadioSong\(\{\.\.\.profile,seed,composerVersion,performanceVersion\}\)/);
 assert.match(src,/targetLoops:profile\.targetLoops,composerVersion/);
 assert.match(src,/master\.gain\.value=\.83/);
 assert.match(src,/const safety=ctx\.createDynamicsCompressor/);
});

test("listener vocabulary uses piece and section, not song/chapter/arrangement",()=>{
 const src=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
 const page=readFileSync(new URL("../humanradio.html",import.meta.url),"utf8");
 assert.doesNotMatch(src,/status\("[^"]*(?:song|chapter|arrangement)[^"]*"\)/i);
 assert.doesNotMatch(page,/Each chapter moves|Next arrangement ready/i);
 assert.match(src,/status\("Next piece ready"\)/);
 assert.match(src,/status\("Next section ready"\)/);
 assert.match(page,/Complete piece/);
});

// This scorer is a soft preference, not a rigid gate: distinctive leaps and
// purposeful repetitions remain possible when they serve a musical idea.
test("musical evaluation penalises monotonous lines without forbidding movement",()=>{
 const phrase={startBar:0,endBar:4,phase:"exposition"};
 const harmony=Array.from({length:4},()=>({notes:[60,64,67]}));
 const stable=[
  {step:0,note:60},{step:4,note:62},{step:8,note:64},
  {step:16,note:67},{step:20,note:65},{step:24,note:64},
  {step:32,note:60}
 ];
 const stuck=stable.map(e=>({...e,note:60}));
 assert.ok(scoreMelodicPhrase(stable,{phrase,harmony,strategy:"hook-led"})<
   scoreMelodicPhrase(stuck,{phrase,harmony,strategy:"hook-led"}));
});
