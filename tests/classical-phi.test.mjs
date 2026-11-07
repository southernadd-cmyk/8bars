import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PHI,GOLDEN_LARGE,GOLDEN_SMALL,GOLDEN_ANGLE_TURNS,phiDynamicGain,phiExpressionAtStep} from "../phi-dynamics.js";
import {phiClassicalEvents} from "../phi-classical.js";
import {composeWithEngine} from "../music-engines.js";
import {RADIO_CHANNELS,validRadioChannel} from "../radio-channels.js";
import {chooseRadioProfile} from "../radio-planner.js";
import {planInstrumentPalette} from "../instrument-palettes.js";
import {VOICES} from "../sounds.js";

const base=composeWithEngine({seed:"golden-work",engine:"melodic",bpm:80,style:"ambient",key:"C",mode:"major"});
test("Classical phi is its own station with legitimate 8bars sample palette",()=>{
 assert.equal(validRadioChannel("classical"),"classical");
 assert.equal(RADIO_CHANNELS.classical.scenes.length,3);
 for(const scene of RADIO_CHANNELS.classical.scenes)for(let i=0;i<8;i++){
  const voices=planInstrumentPalette("classical",scene.id,"phi-"+scene.id+i);
  for(const id of Object.values(voices))assert.ok(VOICES[id]?.length,id);
 }
 const profile=chooseRadioProfile(null,()=>.45,"classical");
 assert.equal(profile.channel,"classical");
 assert.ok(profile.bpm>=60&&profile.bpm<=94);
});

test("Phi divisions and expression are exact and moderate",()=>{
 assert.ok(Math.abs(PHI*PHI-PHI-1)<1e-12);
 assert.ok(Math.abs(GOLDEN_LARGE-GOLDEN_SMALL-PHI**-3)<1e-12);
 assert.ok(Math.abs(GOLDEN_ANGLE_TURNS*360-137.50776405)<1e-6);
 assert.ok(Math.abs(phiDynamicGain(0)-GOLDEN_LARGE)<1e-12);
 assert.ok(Math.abs(phiDynamicGain(128*GOLDEN_LARGE)-1)<1e-12);
 assert.ok(Math.abs(phiDynamicGain(128)-GOLDEN_LARGE)<1e-12);
 assert.ok(phiDynamicGain(128*GOLDEN_SMALL)>phiDynamicGain(0));
 for(let step=0;step<=128;step++){
  assert.ok(phiDynamicGain(step)>=GOLDEN_LARGE-1e-12&&phiDynamicGain(step)<=1+1e-12);
  assert.equal(phiExpressionAtStep(step,0),0);
 }
});

test("Original Classical phi events deterministically govern all pitched instruments",()=>{
 const a=phiClassicalEvents(base.progression,"golden-work","statement");
 const b=phiClassicalEvents(base.progression,"golden-work","statement");
 assert.deepEqual(a,b);
 assert.ok(a.length>80);
 assert.ok(a.some(e=>e.track==="lead"));
 assert.ok(a.some(e=>e.track==="bass"));
 assert.ok(a.some(e=>e.track==="counter"));
 assert.ok(a.some(e=>e.track==="chords"));
 assert.ok(a.some(e=>e.track==="pad"));
 assert.ok(a.some(e=>e.track==="arp"));
 for(const e of a){
  assert.ok(["lead","bass","counter","chords","pad","arp"].includes(e.track),e.track);
  assert.ok(Number.isInteger(e.step)&&e.step>=0&&e.step<128,e.step);
  assert.ok(e.duration>0&&e.step+e.duration<=128,e.duration);
  assert.ok(e.velocity>.05&&e.velocity<=1,e.velocity);
  assert.ok(Number.isInteger(e.note)&&e.note>=28&&e.note<=108,e.note);
 }
 assert.notDeepEqual(a,phiClassicalEvents(base.progression,"another-seed","statement"));
 const quiet=phiClassicalEvents(base.progression,"golden-work","opening");
 assert.ok(quiet.filter(e=>e.track==="lead").length<a.filter(e=>e.track==="lead").length);
 assert.throws(()=>phiClassicalEvents([]),TypeError);
});

test("Only Classical phi applies the expression curve to the playback mix",()=>{
 const s=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
 const page=readFileSync(new URL("../humanradio.html",import.meta.url),"utf8");
 assert.match(s,/piece\.channel==="classical"\?phiDynamicGain\(e\.step\):1/);
 assert.match(s,/section\.events=phiClassicalEvents\(/);
 assert.match(page,/value="classical">Classical φ/);
 assert.match(s,/const safety=ctx\.createDynamicsCompressor/);
 assert.match(s,/master\.connect\(safety\)/);
});
