import test from "node:test";
import assert from "node:assert/strict";
import {compose,TRACKS,STYLES} from "../composer.js";

// Distinct signatures in the SAME key/style: a different seed must change
// harmonic movement, the bass figure and the melody, not just velocities.
test("regeneration produces different song identities, not cosmetic differences",()=>{
 for(const style of STYLES){
  const signatures={
   harmony:new Set(),bass:new Set(),melody:new Set(),
   percussion:new Set(),forms:new Set(),voicings:new Set()
  };
  for(let n=0;n<40;n++){
   const config={seed:"diversity-audit-"+n,style,key:"A",mode:"minor",density:.65};
   const song=compose(config);
   const filtered=(id)=>song.events.filter(e=>e.track===id);
   signatures.harmony.add(song.progression.map(chord=>chord.degree).join(","));
   signatures.bass.add(filtered("bass").map(e=>e.step+":"+e.note).join(","));
   signatures.melody.add(filtered("lead").map(e=>e.step+":"+e.note).join(","));
   signatures.percussion.add(["kick","snare"].map(id=>filtered(id).map(e=>e.step).join(",")).join("|"));
   signatures.voicings.add(filtered("chords").map(e=>e.step+":"+e.note).join(","));
   signatures.forms.add(song.identity.form);
   assert.equal(song.goldenStep,80);
   assert.ok(filtered("lead").some(e=>e.step>=80&&e.step<96));
   assert.ok(song.events.every(e=>e.step>=0&&e.step<128&&e.duration>0&&e.velocity>0&&e.velocity<=1));
   for(const track of TRACKS)assert.ok(filtered(track.id).length>0,style+": missing "+track.id);
  }
  assert.ok(signatures.harmony.size>=20,style+": too few harmonic paths");
  assert.ok(signatures.bass.size>=32,style+": repetitive bass patterns");
  assert.ok(signatures.melody.size>=32,style+": repetitive melodic material");
  assert.ok(signatures.percussion.size>=32,style+": repetitive grooves");
  assert.ok(signatures.voicings.size>=32,style+": repetitive chord textures");
  assert.ok(signatures.forms.size>=4,style+": too few forms");
 }
});

test("reproducible results and track-only regeneration survive rule expansion",()=>{
 for(const style of STYLES){
  const settings={seed:"repeatability-check",style,key:"D",mode:"major"};
  const a=compose(settings);
  assert.deepEqual(a,compose(settings));
  for(const track of ["kick","snare","bass","lead","chords","pad"]){
   const changed=compose({...settings,variations:{[track]:1}});
   assert.deepEqual(
    a.events.filter(e=>e.track!==track),
    changed.events.filter(e=>e.track!==track),
    "Regenerating "+track+" must not change other channels"
   );
  }
 }
});
