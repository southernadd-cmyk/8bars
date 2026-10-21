import test from "node:test";
import assert from "node:assert/strict";
import {
 triadPitches,tonnetzMoves,tonnetzDistance,chordToSymbol,
 planEcology,evolveMotif,ecologyRandom,euclideanPositions,livingMelody
} from "../music-ecology.js";
import {composeWithEngine} from "../music-engines.js";
import {buildRadioForm} from "../radio-form.js";

const pctSet=chord=>new Set(triadPitches(chord));
const shared=(a,b)=>[...pctSet(a)].filter(n=>pctSet(b).has(n)).length;
test("All 24 triads have three P/L/R neighbours with precisely two common tones",()=>{
 const ids=new Set();
 for(let root=0;root<12;root++)for(const quality of ["major","minor"]){
   const chord={root,quality};
   ids.add(chordToSymbol(chord));
   const neighbours=tonnetzMoves(chord);
   assert.deepEqual(new Set(neighbours.map(n=>n.move)),new Set(["P","L","R"]));
   for(const neighbour of neighbours){
     assert.equal(shared(chord,neighbour.chord),2);
     assert.equal(tonnetzDistance(chord,neighbour.chord),1);
     assert.equal(tonnetzMoves(neighbour.chord).find(x=>x.move===neighbour.move)?.chord.root,root);
     assert.equal(tonnetzMoves(neighbour.chord).find(x=>x.move===neighbour.move)?.chord.quality,quality);
   }
 }
 assert.equal(ids.size,24);
});
test("Tonnetz distances are symmetric and every triad is reachable",()=>{
 for(let a=0;a<12;a+=3)for(const mode of ["major","minor"])
 for(let b=0;b<12;b+=2)for(const quality of ["major","minor"]){
   const x={root:a,quality:mode},y={root:b,quality};
   const d=tonnetzDistance(x,y);
   assert.ok(Number.isInteger(d)&&d>=0&&d<=12);
   assert.equal(d,tonnetzDistance(y,x));
 }
});
test("Rhythms use sixteen positions with proper modulo-16 wrapping",()=>{
 for(const r of [-32,-17,-1,0,1,13,15,16,17,31,48]){
   const xs=euclideanPositions(5,r);
   assert.equal(xs.length,5);
   assert.ok(xs.every(n=>n>=0&&n<16));
   assert.deepEqual(xs,euclideanPositions(5,r+16));
 }
 assert.notDeepEqual(euclideanPositions(5,0),euclideanPositions(5,3));
});
test("Songs retain a coherent eight-chord path with a tonic return and Tonnetz movement",()=>{
 let distinct=new Set(),near=0,total=0;
 for(let i=0;i<70;i++){
   const genome=planEcology({seed:"walk-"+i,key:["A","C","F#"][i%3],mode:i%2?"major":"minor"});
   assert.equal(genome.path.length,8);
   assert.equal(genome.harmonyOverrides.length,8);
   assert.deepEqual(genome.path[0],genome.home);
   assert.deepEqual(genome.path[7],genome.home);
   assert.equal(genome.distances[0],0);assert.equal(genome.distances[7],0);
   for(let j=1;j<genome.path.length;j++){
     assert.ok(shared(genome.path[j-1],genome.path[j])>=0);
     if(shared(genome.path[j-1],genome.path[j])>=2)near++;
     total++;
   }
   distinct.add(genome.harmonyOverrides.join(","));
 }
 assert.ok(distinct.size>=15,"Different seeds should visit different harmonic routes");
 assert.ok(near/total>.74,"Most harmonic moves should keep two common tones");
});
test("A motif mutates only one degree while retaining the established rhythmic identity",()=>{
 const first=planEcology({seed:"a",key:"C",mode:"major"});
 const second=planEcology({seed:"b",key:"D",mode:"minor",previous:first});
 assert.deepEqual(second.motif.steps,first.motif.steps);
 assert.equal(second.motif.degrees.filter((n,i)=>n!==first.motif.degrees[i]).length,1);
 assert.notDeepEqual(second.motif.degrees,first.motif.degrees);
 assert.ok(second.motif.degrees.every(n=>n>=-3&&n<=6));
 assert.notEqual(second.path[0].root,first.path[0].root);
 assert.ok(ecologyRandom("fixed")()===ecologyRandom("fixed")());
 const copy=evolveMotif(first.motif,ecologyRandom("mutate"));
 assert.notStrictEqual(copy.steps,first.motif.steps);
});
test("Living melodic events belong to a valid pitch range and real 128-step score",()=>{
 const genome=planEcology({seed:"lead",key:"A",mode:"minor"});
 const steps=[];
 for(let bar=0;bar<8;bar++)for(const note of livingMelody(genome,bar,bar%2?"answer":"statement")){
   assert.ok(note.step>=bar*16&&note.step<(bar+1)*16);
   assert.ok(note.note>=63&&note.note<=93);
   steps.push(note.step);
 }
 assert.ok(steps.length>=32);
});
test("Ecology composes reproducible audio-safe events and distinct answers",()=>{
 const input={seed:"eco-test",key:"A",mode:"minor",style:"downtempo",
   bpm:100,density:.61,swing:.12,engine:"ecology"};
 const a=composeWithEngine(input);
 assert.deepEqual(a,composeWithEngine(input));
 assert.equal(a.progression.length,8);
 assert.ok(a.events.length>120);
 assert.deepEqual(a.harmonyOverrides,a.ecologyGenome.harmonyOverrides);
 assert.ok(a.events.filter(e=>e.track==="lead").length>=30);
 assert.ok(a.events.filter(e=>e.track==="bass").length>=15);
 assert.ok(a.events.every(e=>e.step>=0&&e.step<128&&e.duration>0&&e.step+e.duration<=128));
 const mutated=composeWithEngine({...input,variations:{lead:3}});
 assert.notDeepEqual(
   a.events.filter(e=>e.track==="lead"),
   mutated.events.filter(e=>e.track==="lead"));
 assert.deepEqual(
   a.events.filter(e=>e.track==="bass"),
   mutated.events.filter(e=>e.track==="bass"));
});
test("Human Radio sections inherit the same harmonic walk; variations return to home",()=>{
 const input={seed:"eco-form",key:"D",mode:"minor",engine:"ecology",
   style:"downtempo",bpm:94,density:.6,swing:.13,targetLoops:6};
 const first=composeWithEngine(input);
 const sections=buildRadioForm({...input,ecologyGenome:first.ecologyGenome},first,composeWithEngine);
 assert.equal(sections.length,6);
 assert.deepEqual(sections[0].progression,first.progression);
 assert.deepEqual(sections.at(-1).progression,first.progression);
 assert.notDeepEqual(sections[2].events,sections[1].events);
 assert.equal(sections[3].progression[2].notes.join(","),first.progression[2].notes.join(","));
});
