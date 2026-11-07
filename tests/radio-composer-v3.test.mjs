import test from "node:test";
import assert from "node:assert/strict";
import {planWholeRadioSong,sliceWholeRadioSong} from "../radio-whole-song.js";
import {planPhiSong,slicePhiSong} from "../phi-song-planner.js";

const scenes={pop:"indie",hiphop:"boom-bap",dnb:"liquid",mixed:""};
function pitched(events,track="lead"){
 return events.filter(e=>e.track===track&&
   !["golden climax","final tonic","climax","resolution"].includes(e.tag));
}
function checkEvents(score){
 assert.ok(score.events.length>0,"nonempty score");
 for(const e of score.events){
  assert.ok(Number.isInteger(e.step)&&e.step>=0&&e.step<score.totalSteps,
    "onset in full song");
  assert.ok(Number.isFinite(e.duration)&&e.duration>0,"positive duration");
  assert.ok(Number.isFinite(e.velocity)&&e.velocity>0&&e.velocity<=1,
    "bounded note velocity");
  if(e.note!==undefined)assert.ok(Number.isInteger(e.note)&&e.note>=28&&e.note<=127);
 }
}
for(const channel of ["pop","hiphop","dnb","mixed"]){
 test("V3 "+channel+" creates a deterministic, differently developed complete piece",()=>{
  const args={seed:"v3-regression-"+channel,channel,
   scene:scenes[channel],composerVersion:3,bpm:channel==="dnb"?174:99,
   targetLoops:6};
  const v3=planWholeRadioSong(args);
  const v2=planWholeRadioSong({...args,composerVersion:2});
  const repeat=planWholeRadioSong(args);
  checkEvents(v3);
  assert.deepEqual(v3.events,repeat.events,"same seed, same complete score");
  assert.notDeepEqual(pitched(v3.events),pitched(v2.events),
    "changes the notes, not just playback expression");
  assert.equal(v3.composerV2.version,3);
  assert.equal(v2.composerV2.version,2);
  assert.ok(v3.composerV2.review.length>0);
  assert.ok(v3.composerV2.review.some(r=>r.v3));
  const parts=sliceWholeRadioSong(v3);
  assert.equal(parts.length,6);
  assert.equal(parts.reduce((n,part)=>n+part.events.length,0),v3.events.length);
  assert.ok(parts.every(part=>part.events.every(e=>e.step>=0&&e.step<128)));
  for(const bar of [v3.turnBar,v3.climaxBar,v3.totalBars-1])
   assert.equal(v3.harmony[bar].degree,0,"structural tonic remains");
 });
}
test("V3 writes more than cosmetic changes to accompaniment in pop",()=>{
 const args={seed:"v3-accompaniment",channel:"pop",scene:"bright",
  composerVersion:3,targetLoops:6};
 const score=planWholeRadioSong(args),base=planWholeRadioSong({...args,composerVersion:2});
 const v3Bass=score.events.filter(e=>e.track==="bass");
 const v2Bass=base.events.filter(e=>e.track==="bass");
 assert.notDeepEqual(v3Bass,v2Bass,"bass conversation changes");
 assert.ok(score.events.some(e=>e.tag==="v3 harmonic pickup"));
});
test("Classical V3 keeps φ onsets, golden structural anchors and deterministic output",()=>{
 const args={seed:"v3-classical",composerVersion:3,targetLoops:6,bpm:78};
 const v3=planPhiSong(args),v2=planPhiSong({...args,composerVersion:2});
 checkEvents(v3);
 assert.deepEqual(v3.events,planPhiSong(args).events);
 assert.deepEqual(pitched(v3.events).map(e=>e.step),pitched(v2.events).map(e=>e.step));
 assert.notDeepEqual(pitched(v3.events).map(e=>e.note),pitched(v2.events).map(e=>e.note));
 assert.equal(v3.harmony[v3.climaxBar].degree,0);
 assert.equal(slicePhiSong(v3).length,6);
});
test("V2 composer stays the default and its V3 option is explicit",()=>{
 const args={seed:"stable-v2",channel:"hiphop",scene:"lofi",targetLoops:5};
 assert.deepEqual(planWholeRadioSong(args).events,
   planWholeRadioSong({...args,composerVersion:2}).events);
 const phi={seed:"stable-phi",targetLoops:5};
 assert.deepEqual(planPhiSong(phi).events,planPhiSong({...phi,composerVersion:2}).events);
});
