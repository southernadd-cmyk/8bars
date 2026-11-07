import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PIECE_FORMS,choosePieceForm,developMotifProgram,renderDevelopedPhrase,motifForPhrase}
 from "../radio-songcraft.js";
import {planWholeRadioSong,sliceWholeRadioSong} from "../radio-whole-song.js";
import {evaluatePieceQuality} from "../radio-piece-quality.js";
import {developPhrase} from "../musical-grammar.js";
import {radioSignature} from "../radio-planner.js";
const opts={
 pop:{scene:"bright",engine:"melodic",bpm:110,style:"downtempo"},
 hiphop:{scene:"boom-bap",engine:"pattern",bpm:91,style:"breakbeat"},
 dnb:{scene:"roller",engine:"pattern",bpm:173,style:"breakbeat"},
 mixed:{scene:"motion",engine:"process",bpm:123,style:"house"}
};
function song(channel,seed,targetLoops=6){
 return planWholeRadioSong({...opts[channel],channel,seed,targetLoops,key:"A",mode:"minor"});
}
const seedR=seed=>{let x=seed|0;return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296)};
test("Each channel has several coherent whole-piece forms at every length",()=>{
 for(const channel of Object.keys(opts))for(const length of [5,6,7]){
  const forms=PIECE_FORMS[channel][length];
  assert.ok(forms.length>=3);
  assert.equal(new Set(forms.map(a=>a.join(","))).size,forms.length);
  for(const form of forms){
   assert.equal(form.length,length);
   assert.equal(form[0],"opening");
   assert.equal(form.at(-1),"return");
   assert.ok(form.includes("lift")||form.includes("reprise"));
  }
  const drawn=new Set(Array.from({length:60},(_,i)=>
    choosePieceForm(channel,length,()=>i/60).join(",")));
  assert.ok(drawn.size>=3,channel+length+" must not use one fixed form");
 }
});
test("Different seeds vary sections, harmonic routes and motif transformations",()=>{
 for(const channel of Object.keys(opts)){
  const pieces=Array.from({length:35},(_,i)=>song(channel,channel+"-seed-"+i));
  assert.ok(new Set(pieces.map(p=>p.sections.map(s=>s.role).join("|"))).size>=3,
    channel+" should have multiple distinct arrangements");
  assert.ok(new Set(pieces.map(p=>p.harmony.map(h=>h.degree).join(""))).size>=15,
    channel+" should have genuinely different harmonic journeys");
  assert.ok(new Set(pieces.map(p=>p.phrases.map(q=>q.motif+":"+q.transform).join("|"))).size>=18,
    channel+" should develop motifs differently across pieces");
  for(const p of pieces){
   assert.equal(p.phrases[0].motif,"A");
   assert.equal(p.phrases.at(-1).motif,"A");
   assert.ok(p.phrases.some(q=>q.startBar===p.climaxBar&&q.transform==="arrival"));
   assert.deepEqual(p.harmony.slice(-2).map(h=>h.degree),[4,0]);
   assert.equal(p.events.filter(e=>e.tag==="golden climax").length,1);
   assert.equal(p.events.filter(e=>e.tag==="final tonic").length,1);
   assert.equal(p.events.filter(e=>e.tag==="final cadence").length,3);
   // The score is written once and transport merely divides it.
   assert.deepEqual(sliceWholeRadioSong(p).flatMap((section,i)=>
     section.events.map(e=>({...e,step:e.step+i*128}))),p.events);
  }
 }
});
test("Motivic transformation is related to the original and keeps playable rhythms",()=>{
 const original={rhythm:[0,3,6,8,12],contour:[0,1,3,2,0],articulation:.8,variation:1,response:2,shift:0};
 const themes={motif:original,answer:{...original,contour:[0,-1,-3,-2,0]},
   bridge:{...original,contour:[0,2,0],rhythm:[0,6,12]}};
 assert.equal(motifForPhrase(themes,{motif:"C"}),themes.bridge);
 const originals=JSON.stringify(original);
 for(const transform of ["original","echo","sequence","inversion","fragment",
  "suspension","arrival","coda","augmentation","answer"]){
  const p={transform,motif:"A",transpose:1,displacement:1,articulation:1.08};
  const base=developPhrase(original,2,{cadenceEveryFour:false});
  const rendered=renderDevelopedPhrase(base,p,2,"hiphop");
  assert.equal(rendered.rhythm.length,rendered.contour.length);
  assert.ok(rendered.rhythm.every(v=>Number.isInteger(v)&&v>=0&&v<=15));
  assert.ok(rendered.rhythm.every((v,i)=>i===0||v>rendered.rhythm[i-1]));
  assert.ok(rendered.contour.every(v=>v>=-5&&v<=5));
  assert.ok(rendered.articulation>=.45&&rendered.articulation<=1.25);
 }
 assert.equal(JSON.stringify(original),originals,"developing must not mutate original theme");
});
test("Four-bar phrase grammar can defer a cadence until true phrase ending",()=>{
 const hook={rhythm:[0,4,8,12],contour:[0,1,2,-1],articulation:.8,
   variation:1,response:2,shift:0};
 const old=developPhrase(hook,3);
 const extended=developPhrase(hook,3,{cadenceEveryFour:false});
 assert.equal(old.cadence,true);
 assert.equal(extended.cadence,false);
 assert.ok(extended.rhythm.length>=old.rhythm.length);
});
test("Coherence evaluator penalises disconnected melodies without defining a single good genre",()=>{
 const healthy=song("pop","quality-random");
 const q=evaluatePieceQuality(healthy);
 assert.ok(q.score>0&&q.score<=100);
 assert.ok(Number.isFinite(q.metrics.leadCoverage));
 const broken={...healthy,events:[
  {track:"lead",step:0,note:50,duration:1},
  {track:"lead",step:16,note:93,duration:1},
  {track:"lead",step:32,note:50,duration:1},
  {track:"lead",step:48,note:93,duration:1}
 ],harmony:healthy.harmony};
 assert.ok(evaluatePieceQuality(broken).score<q.score,
   "A largely empty, wildly leaping score should lose against a composed piece");
 const score=radioSignature({songScore:healthy,...opts.pop,channel:"pop"});
 assert.ok(score.phiForm.includes(" / "),"Diversity should consider phrase-level transformations");
});
test("First piece and subsequent pieces select on quality plus musical novelty",()=>{
 const src=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
 assert.match(src,/function chooseOpeningPiece\(\)/);
 assert.match(src,/evaluatePieceQuality\(b\)\.score-evaluatePieceQuality\(a\)\.score/);
 assert.match(src,/radioNoveltyScore\(b,\[current,\.\.\.recentPieces\]\)/);
 assert.match(src,/\.35\*evaluatePieceQuality\(b\)\.score/);
});
test("Human Radio consistently calls the listening unit a piece",()=>{
 const js=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
 const html=readFileSync(new URL("../humanradio.html",import.meta.url),"utf8");
 const statuses=[...js.matchAll(/status\("([^"]+)"/g)].map(m=>m[1]);
 assert.ok(statuses.some(s=>s==="Next piece ready"));
 assert.ok(statuses.some(s=>s==="Next section ready"));
 assert.ok(!statuses.some(s=>/\b(arrangement|song|chapter)\b/i.test(s)),
   "Status labels should use piece, with section for parts within a piece");
 assert.match(html,/Next piece/);
 assert.doesNotMatch(html,/Each chapter|Complete composition/i);
});
