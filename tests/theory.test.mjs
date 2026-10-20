import test from "node:test";
import assert from "node:assert/strict";
import {planCadence,voiceLedPitch,pitchClassInChord,CADENCES} from "../theory.js";
import {compose,STYLES,TRACKS} from "../composer.js";

test("functional cadences create intentional, distinct endings",()=>{
 const degrees=[0,0,3,4,5,3,6,0];
 for(const [name,plan] of Object.entries(CADENCES)){
  const styles={authentic:"house",plagal:"ambient",deceptive:"downtempo",half:"breakbeat",modal:"ambient"};
  // The picker is deterministic and the source progression is not mutated.
  const choice=planCadence(degrees,styles[name],()=>0);
  assert.equal(choice.degrees.length,8);
  assert.equal(choice.degrees[0],0);
  assert.deepEqual(degrees,[0,0,3,4,5,3,6,0]);
  assert.ok(typeof choice.description==="string");
 }
 const seen=new Set();
 for(const style of STYLES)for(let n=0;n<60;n++){
  const piece=compose({seed:"cadence-"+n,style});
  const plan=CADENCES[piece.identity.cadence];
  assert.ok(plan,"undefined cadence");
  assert.equal(piece.progression[6].degree,plan.before);
  assert.equal(piece.progression[7].degree,plan.end);
  seen.add(piece.identity.cadence);
 }
 assert.ok(seen.size>=5);
});

test("minor V chord raises the leading tone and resolves to minor tonic",()=>{
 for(let n=0;n<90;n++){
  const song=compose({seed:"minor-harmony-"+n,key:"A",mode:"minor"});
  const tonicPitch=57;
  for(const chord of song.progression.filter(x=>x.degree===4))
   assert.deepEqual(chord.notes.slice(0,3),[tonicPitch+7,tonicPitch+11,tonicPitch+14]);
 }
});

test("strong-beat melody candidates are chord tones, final tonic is resolved",()=>{
 const args={target:80,chord:[57,60,64].map(n=>n+24),scale:[0,2,3,5,7,8,10],tonic:57};
 const strong=voiceLedPitch({...args,strong:true});
 assert.ok(pitchClassInChord(strong,args.chord));
 for(const cadence of ["authentic","plagal","modal"]){
  const last=voiceLedPitch({...args,previous:81,previousLeap:-5,strong:true,final:true,cadence});
  assert.equal(((last-args.tonic)%12+12)%12,0);
 }
});

test("theory-aware generation keeps musical events valid and tracks isolated",()=>{
 for(const style of STYLES)for(const mode of ["minor","major"]){
  const types=new Set();
  for(let i=0;i<36;i++){
   const options={seed:"theory-integrity-"+i,style,mode,key:"D",density:.65};
   const composition=compose(options);
   types.add(composition.identity.cadence);
   assert.deepEqual(composition,compose(options));
   assert.ok(composition.events.some(e=>e.track==="lead"&&e.step>=80&&e.step<96));
   assert.ok(composition.events.every(e=>e.step>=0&&e.step<128&&e.duration>0&&e.velocity>0&&e.velocity<=1));
   for(const track of TRACKS)assert.ok(composition.events.some(e=>e.track===track.id));
  }
  assert.ok(types.size>=3);
 }
 const initial=compose({seed:"one-part"}),mutated=compose({seed:"one-part",variations:{lead:1}});
 assert.deepEqual(initial.events.filter(e=>e.track!=="lead"),mutated.events.filter(e=>e.track!=="lead"));
});

test("minor dominant avoids natural seventh melodic clash",()=>{
 const chord=[64,68,71],tonic=57,scale=[0,2,3,5,7,8,10];
 for(const target of [79,91,103]){
  const note=voiceLedPitch({target,chord,tonic,scale,avoidPitchClasses:[(tonic+10)%12]});
  assert.notEqual((note%12+12)%12,(tonic+10)%12);
 }
 for(let i=0;i<200;i++){
  const song=compose({seed:"v-clash-"+i,key:"A",mode:"minor"});
  for(const event of song.events.filter(e=>e.track==="lead"&&song.progression[Math.floor(e.step/16)].degree===4))
   assert.notEqual((event.note%12+12)%12,7);
 }
});
