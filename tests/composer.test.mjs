import test from "node:test";
import assert from "node:assert/strict";
import {compose,euclidean,GOLDEN,ENGINE_VERSION} from "../composer.js";

test("same seed and settings yield identical events",()=>{
  const config={seed:"618033",bpm:96,density:0.65,key:"A",mode:"minor"};
  assert.deepEqual(compose(config),compose(config));
});
test("different seeds change the notes or rhythm",()=>{
  assert.notDeepEqual(compose({seed:"a"}).events,compose({seed:"b"}).events);
});
test("all notes lie inside the eight-bar grid",()=>{
  const c=compose({seed:"618033"});
  assert.equal(c.bars,8);
  assert.ok(c.events.length>100);
  assert.ok(c.events.every(e=>e.step>=0&&e.step<128&&e.duration>0));
});
test("drums, bass and melody are represented",()=>{
  const set=new Set(compose().events.map(e=>e.track));
  for(const k of ["kick","snare","hat","bass","melody"])assert.ok(set.has(k));
});
test("golden turn begins at the sixth bar",()=>{
  const c=compose();
  assert.equal(c.goldenStep,80);
  assert.ok(Math.abs(c.goldenStep-128/GOLDEN)<2);
  assert.ok(c.events.some(e=>e.track==="melody"&&e.step>=80&&e.step<96));
});
test("Euclidean generator produces exactly k onsets",()=>{
  for(let k=0;k<=16;k++){
    const hits=euclidean(k,16);
    assert.equal(hits.length,16);
    assert.equal(hits.filter(Boolean).length,k);
  }
});
test("key, mode and tempo change composition deterministically",()=>{
  const a=compose({key:"A",mode:"minor",bpm:90});
  const b=compose({key:"C",mode:"major",bpm:120});
  assert.notDeepEqual(a.events,b.events);
  assert.equal(a.bpm,90);
  assert.equal(b.bpm,120);
  assert.equal(typeof ENGINE_VERSION,"string");
});
