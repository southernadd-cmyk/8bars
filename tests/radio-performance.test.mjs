import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {performWholeScore} from "../radio-performance.js";
import {performedTiming,setPerformedEnvelope} from "../radio-audio-expression.js";
import {planWholeRadioSong,sliceWholeRadioSong} from "../radio-whole-song.js";
import {planPhiSong,slicePhiSong} from "../phi-song-planner.js";

const genreSettings=[
 {channel:"pop",scene:"indie",engine:"melodic",style:"downtempo",bpm:110},
 {channel:"hiphop",scene:"boom-bap",engine:"pattern",style:"breakbeat",bpm:92},
 {channel:"dnb",scene:"liquid",engine:"melodic",style:"breakbeat",bpm:172},
 {channel:"mixed",scene:"motion",engine:"process",style:"house",bpm:120}
];
const plan=(settings,seed="performed-piece",loops=6,performanceVersion=2)=>
 planWholeRadioSong({...settings,seed,key:"D",mode:"minor",
  density:.66,targetLoops:loops,performanceVersion});
const omitPerformance=({performance,...rest})=>rest;

test("performed scores change sound expression without changing any written notes",()=>{
 for(const settings of genreSettings)for(const loops of [5,6,7]){
  const seed=settings.channel+"|"+loops;
  const expressive=plan(settings,seed,loops,2);
  const original=plan(settings,seed,loops,1);
  assert.equal(expressive.performance.version,2);
  assert.equal(original.performance.version,1);
  assert.equal(expressive.events.length,original.events.length);
  assert.deepEqual(expressive.events.map(omitPerformance),original.events);
  assert.equal(expressive.harmony.length,original.harmony.length);
  assert.deepEqual(expressive,plan(settings,seed,loops,2));
  const distinct=new Set();
  for(const e of expressive.events){
   const x=e.performance;
   assert.ok(x,"Every complete-score note should have performance expression");
   assert.ok(Number.isFinite(x.offsetMs)&&Math.abs(x.offsetMs)<=expressive.performance.maxOffsetMs+1e-9);
   assert.ok(x.velocityScale>=.75&&x.velocityScale<=1.12);
   assert.ok(x.lengthScale>=.4&&x.lengthScale<=1.15);
   assert.ok(x.attackMs>=0&&x.releaseMs>=0);
   distinct.add(x.velocityScale);
  }
  assert.ok(distinct.size>=4,"Phrase expression should not be constant");
  assert.ok(expressive.events.some(e=>Math.abs(e.performance.offsetMs)>=2),
   "Groove should actually move some notes");
  const slices=sliceWholeRadioSong(expressive);
  assert.deepEqual(slices.flatMap((s,i)=>s.events.map(e=>({...e,step:e.step+i*128}))),
   expressive.events,"Complete performance metadata must survive chunking");
 }
});

test("shared chord tones move together and strong drum attacks keep their groove",()=>{
 for(const settings of genreSettings){
  const piece=plan(settings,"shared-pocket");
  const chords=new Map();
  for(const e of piece.events.filter(e=>e.track==="chords")){
   const key=e.step;
   if(!chords.has(key))chords.set(key,[]);
   chords.get(key).push(e.performance.offsetMs);
  }
  assert.ok([...chords.values()].some(v=>v.length>=3),"Need actual polyphonic chords");
  for(const times of chords.values())assert.equal(new Set(times).size,1,
   "Chord tones may not be randomized separately");
  const kicks=piece.events.filter(e=>e.track==="kick");
  assert.ok(kicks.length>=15);
  assert.ok(kicks.every(e=>e.performance.offsetMs===0),"Kick is the groove clock");
  const simultaneous=new Set(kicks.map(e=>e.step));
  const bass=piece.events.filter(e=>e.track==="bass"&&simultaneous.has(e.step));
  assert.ok(bass.length>5,"Bassline should play with the kick");
  assert.ok(bass.every(e=>Math.abs(e.performance.offsetMs)<=12));
 }
});

test("golden section and cadence are not shifted by the expressive timing",()=>{
 for(const settings of genreSettings){
  const piece=plan(settings,"golden-anchor");
  const arrival=piece.events.find(e=>e.tag==="golden climax");
  assert.ok(arrival);
  assert.equal(arrival.step,piece.climaxStep);
  assert.equal(arrival.performance.offsetMs,0);
  for(const e of piece.events.filter(e=>["final tonic","final cadence"].includes(e.tag)))
   assert.equal(e.performance.offsetMs,0);
 }
 for(const loops of [5,6,7]){
  const p=planPhiSong({seed:"phi-performer",key:"C",mode:"major",
   targetLoops:loops,bpm:82});
  assert.equal(p.performance.version,2);
  assert.equal(p.performance.channel,"classical");
  assert.ok(p.events.some(e=>e.tag==="climax"&&e.performance.offsetMs===0));
  assert.deepEqual(slicePhiSong(p).flatMap((s,i)=>
   s.events.map(e=>({...e,step:e.step+i*128}))),p.events);
  const old=planPhiSong({seed:"phi-performer",key:"C",mode:"major",
   targetLoops:loops,bpm:82,performanceVersion:1});
  assert.deepEqual(p.events.map(omitPerformance),old.events);
 }
});

test("phrase ends breathe; connected lead notes stay shorter than the next entry",()=>{
 const e=[
  {track:"lead",step:0,duration:4,note:60,velocity:.6,tag:"A"},
  {track:"lead",step:4,duration:4,note:62,velocity:.6,tag:"A"},
  {track:"lead",step:8,duration:8,note:64,velocity:.6,tag:"A"},
  {track:"lead",step:16,duration:8,note:65,velocity:.6,tag:"A"},
  {track:"lead",step:24,duration:8,note:67,velocity:.6,tag:"A"},
  {track:"lead",step:32,duration:8,note:69,velocity:.6,tag:"A"},
  {track:"lead",step:40,duration:8,note:67,velocity:.6,tag:"A"},
  {track:"lead",step:48,duration:8,note:65,velocity:.6,tag:"A"},
  {track:"lead",step:56,duration:8,note:60,velocity:.6,tag:"A"}
 ];
 const phrases=[{id:0,startBar:0,endBar:4,phase:"exposition",lengthBars:4}];
 const ensemble={bars:Array.from({length:4},(_,bar)=>({bar,foreground:"lead"}))};
 const {events,performance}=performWholeScore(e,{
  seed:"phrasing",channel:"classical",bpm:78,totalSteps:64,
  climaxStep:39,phrases,ensemble
 });
 assert.equal(performance.phrases,1);
 assert.ok(events.at(-1).performance.lengthScale<events[0].performance.lengthScale,
  "Final note must articulate the phrase-ending breath");
 assert.ok(events[0].performance.attackMs>0);
 assert.ok(events[0].performance.releaseMs>0);
 for(let i=0;i<events.length-1;i++){
  const x=events[i],next=events[i+1];
  assert.ok(x.duration*x.performance.lengthScale<next.step-x.step+.01,
   "A lead handoff should not smear over its next note");
 }
});

test("performed timing and envelope are click-free, bounded, and keep original note fallback",()=>{
 const event={track:"lead",step:8,duration:3,
  performance:{offsetMs:-17,lengthScale:1.09,attackMs:16,
   releaseMs:70,velocityScale:1.07}};
 const played=performedTiming(event,{when:4,stepSeconds:.15,
   bufferSeconds:2,playbackRate:1});
 assert.ok(Math.abs(played.attackAt-3.983)<.00001);
 assert.ok(played.duration>.45&&played.duration<.50);
 assert.equal(played.attack,.016);
 assert.ok(played.release>.06);
 assert.equal(played.gainScale,1.07);
 const calls=[],node={
  setValueAtTime:(v,t)=>calls.push({kind:"set",v,t}),
  linearRampToValueAtTime:(v,t)=>calls.push({kind:"ramp",v,t})
 };
 const end=setPerformedEnvelope(node,{...played,amp:.5});
 assert.equal(calls.length,4);
 assert.equal(calls[0].kind,"set");
 assert.equal(calls[1].kind,"ramp");
 assert.equal(calls[2].kind,"set");
 assert.equal(calls[3].kind,"ramp");
 assert.ok(calls[0].v<.01&&calls[1].v===.5);
 assert.ok(calls[0].t<calls[1].t&&calls[1].t<calls[2].t&&calls[2].t<calls[3].t);
 assert.ok(Math.abs(end-(played.attackAt+played.duration))<1e-8);
 const original=performedTiming({duration:2},{when:3,stepSeconds:.125,
  bufferSeconds:1,playbackRate:1});
 assert.equal(original.attackAt,3);
 assert.equal(original.attack,0);
 assert.equal(original.duration,.25);
 assert.ok(Math.abs(original.release-.075)<1e-9,
  "Original non-performed notes keep their existing 75 ms release");
});

test("actual Human Radio scheduler uses performance timing, but not a different mastering chain",()=>{
 const src=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
 assert.match(src,/performedTiming\(e,\{when,stepSeconds/);
 assert.match(src,/setPerformedEnvelope\(envelope\.gain/);
 assert.match(src,/src\.start\(attackAt\);src\.stop\(attackAt\+noteLength/);
 assert.match(src,/performanceVersion=new URLSearchParams\(location\.search\)/);
 assert.match(src,/master\.gain\.value=\.83/);
 assert.match(src,/safety\.threshold\.value=-12/);
 assert.match(src,/safety\.ratio\.value=3/);
 const pages=readFileSync(new URL("../.github/workflows/pages.yml",import.meta.url),"utf8");
 assert.match(pages,/test -s dist\/radio-performance\.js/);
 assert.match(pages,/test -s dist\/radio-audio-expression\.js/);
});
