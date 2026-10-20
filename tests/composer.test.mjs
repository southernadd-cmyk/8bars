import test from "node:test";
import assert from "node:assert/strict";
import {compose,euclidean,GOLDEN,ENGINE_VERSION,TRACKS,STYLES} from "../composer.js";
import {DRUMS,VOICES,DEFAULT_VOICES,nearestSample,inventory} from "../sounds.js";

test("same seed and settings reproduce every event",()=>{
  const config={seed:"618033",bpm:96,density:0.65,key:"A",mode:"minor",style:"downtempo"};
  assert.deepEqual(compose(config),compose(config));
});
test("different seeds change the notes or rhythm",()=>{
  assert.notDeepEqual(compose({seed:"a"}).events,compose({seed:"b"}).events);
});
test("twelve independent channels generate useful material",()=>{
  const c=compose({seed:"618033"});
  assert.equal(TRACKS.length,12);
  assert.equal(c.bars,8);
  assert.ok(c.events.length>200);
  const set=new Set(c.events.map(e=>e.track));
  for(const t of TRACKS)assert.ok(set.has(t.id),t.id);
});
test("channel regeneration does not alter any other track",()=>{
  const a=compose({seed:"618033"}),b=compose({seed:"618033",variations:{kick:1}});
  assert.deepEqual(a.events.filter(e=>e.track!=="kick"),b.events.filter(e=>e.track!=="kick"));
  assert.notDeepEqual(a.events.filter(e=>e.track==="kick"),b.events.filter(e=>e.track==="kick"));
});
test("no events start outside eight bars or have invalid notes",()=>{
  for(const style of STYLES)for(const mode of ["major","minor"]){
    const c=compose({style,mode,key:"F#",seed:"49291"});
    assert.ok(c.events.every(e=>e.step>=0&&e.step<128&&e.duration>0&&e.velocity>0&&e.velocity<=1));
    assert.ok(c.events.filter(e=>e.note!==undefined).every(e=>Number.isInteger(e.note)&&e.note>=0&&e.note<128));
  }
});
test("the golden turn falls at the sixth bar",()=>{
  const c=compose();
  assert.equal(c.goldenStep,80);
  assert.ok(Math.abs(c.goldenStep-128/GOLDEN)<2);
  assert.ok(c.events.some(e=>e.track==="lead"&&e.step>=80&&e.step<96));
});
test("Euclidean generator has exactly k hits",()=>{
  for(let k=0;k<=16;k++)assert.equal(euclidean(k,16).filter(Boolean).length,k);
});
test("all 12 keys and four styles are supported",()=>{
  const keys=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  for(const key of keys)for(const style of STYLES){
    const c=compose({key,style,seed:"same"});
    assert.equal(c.key,key);assert.equal(c.style,style);
    assert.equal(c.progression.length,8);
  }
  assert.equal(typeof ENGINE_VERSION,"string");
});
test("sample bank contains independently sourced CC0 sample choices",()=>{
  assert.ok(inventory().length>=25);
  assert.equal(new Set(inventory().map(s=>s.url)).size,inventory().length);
  assert.ok(inventory().every(s=>s.license==="CC0 1.0"&&s.url.startsWith("https://")));
  assert.ok(Object.keys(DRUMS).length>=6);
  assert.ok(Object.keys(VOICES).length>=3);
  for(const voice of Object.keys(VOICES))for(const note of [40,60,75,90]){
    const s=nearestSample(voice,note);
    assert.ok(Number.isInteger(s.root));
    assert.ok(s.url.includes(".ogg"));
  }
  for(const track of TRACKS.filter(t=>t.type==="pitched"))assert.ok(VOICES[DEFAULT_VOICES[track.id]]);
});
