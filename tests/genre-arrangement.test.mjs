import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {composeWithEngine} from "../music-engines.js";
import {buildRadioForm} from "../radio-form.js";
import {applyChannelGroove} from "../radio-channels.js";
import {planGenreHarmony,arrangeGenreMusic} from "../genre-arrangement.js";

const DRUMS=new Set(["kick","snare","clap","hat","openhat","perc"]);
const config={seed:"arrangement-test",key:"A",mode:"minor",style:"breakbeat",engine:"ecology",
 bpm:174,density:.75,swing:.02,targetLoops:6,channel:"dnb",scene:"roller"};
function song(channel,seed="arrangement-test"){
 const source={...config,channel,seed,bpm:channel==="dnb"?174:116,scene:channel==="dnb"?"roller":"bright"};
 const harmonyOverrides=planGenreHarmony(source);
 const composition=composeWithEngine({...source,harmonyOverrides});
 return {...source,composition,harmonyOverrides};
}
function section(source,role){
 const composition=composeWithEngine({...source,harmonyOverrides:source.harmonyOverrides});
 const music=arrangeGenreMusic({...composition,scene:source.scene},source.channel,source.seed,role);
 return applyChannelGroove(music,source.channel,source.seed,role);
}
const tracks=(events,track)=>events.filter(x=>x.track===track);
test("Pop has repeated four-bar functional harmony, DnB has two-bar harmonic motion",()=>{
 for(let i=0;i<36;i++){
  for(const mode of ["major","minor"]){
   const pop=planGenreHarmony({channel:"pop",seed:"pop-"+i,key:"D",mode});
   const dnb=planGenreHarmony({channel:"dnb",seed:"dnb-"+i,key:"A",mode});
   assert.equal(pop.length,8);assert.equal(dnb.length,8);
   assert.deepEqual(pop.slice(0,4),pop.slice(4));
   for(let bar=0;bar<8;bar+=2)assert.equal(dnb[bar],dnb[bar+1]);
  }
 }
 const hiphop=planGenreHarmony({channel:"hiphop",seed:"x",key:"C",mode:"major",scene:"boom-bap"});
 assert.equal(hiphop.length,8);
 assert.deepEqual(hiphop.slice(0,4),hiphop.slice(4));
});
test("Pop choruses repeat melodic hooks and intensify bass and chord attacks",()=>{
 const a=song("pop");
 const verse=section(a,"statement"),chorus=section(a,"lift"),returnPart=section(a,"return");
 const vLead=tracks(verse,"lead"),cLead=tracks(chorus,"lead"),rLead=tracks(returnPart,"lead");
 assert.ok(vLead.length>=26&&cLead.length>=26);
 assert.deepEqual(cLead.map(e=>e.step+":"+e.note),rLead.map(e=>e.step+":"+e.note));
 assert.ok(tracks(chorus,"bass").length>tracks(verse,"bass").length);
 assert.ok(tracks(chorus,"chords").length>=tracks(verse,"chords").length);
 assert.ok(tracks(chorus,"clap").length>tracks(verse,"clap").length);
 assert.ok(tracks(chorus,"kick").length>=tracks(verse,"kick").length);
 assert.notDeepEqual(vLead.map(e=>e.note),cLead.map(e=>e.note));
});
test("Pop avoids eight independent new chord ideas and has distinctive motifs per seed",()=>{
 const motifs=new Set(),chordCycles=new Set();
 for(let i=0;i<30;i++){
   const a=song("pop","pop-genre-"+i);
   const events=section(a,"lift");
   motifs.add(tracks(events,"lead").slice(0,12).map(e=>e.step+":"+e.note).join(","));
   chordCycles.add(a.harmonyOverrides.slice(0,4).join(","));
 }
 assert.ok(motifs.size>=22);
 assert.ok(chordCycles.size>=3);
});
test("DnB kick and snare establish true two-step, with quieter syncopated ghost snares",()=>{
 const a=song("dnb");
 const drums=section(a,"lift");
 for(let bar=0;bar<8;bar++){
   const kick=tracks(drums,"kick").filter(e=>Math.floor(e.step/16)===bar);
   const snare=tracks(drums,"snare").filter(e=>Math.floor(e.step/16)===bar);
   assert.ok(kick.some(e=>e.step%16===0),bar);
   assert.ok(kick.some(e=>e.step%16===10),bar);
   assert.ok(snare.some(e=>e.step%16===4&&e.velocity>=.8),bar);
   assert.ok(snare.some(e=>e.step%16===12&&e.velocity>=.8),bar);
   assert.ok(snare.every(e=>[4,12].includes(e.step%16)||e.velocity<.3));
 }
});
test("DnB bass does not attack on snare backbeats and leaves harmonic space",()=>{
 const a=song("dnb");
 const lift=section(a,"lift");
 const bass=tracks(lift,"bass"),chords=tracks(lift,"chords");
 const mainBass=bass.filter(e=>!e.sampleVoice);
 const subBass=bass.filter(e=>e.sampleVoice==="dnbSub");
 assert.ok(mainBass.length>=16&&mainBass.length<=32);
 assert.ok(subBass.length>=8);
 assert.ok(bass.every(e=>![4,12].includes(e.step%16)));
 assert.ok(mainBass.every(e=>e.note>=33&&e.note<=52&&e.duration>=1.5));
 assert.ok(subBass.every(e=>e.note>=28&&e.note<=52&&e.duration>=1.5&&e.velocity<=.23));
 assert.ok(subBass.every(e=>mainBass.some(m=>m.step===e.step&&
   (m.note===e.note+12||m.note===e.note))));
 assert.ok(chords.length<80);
 assert.ok(tracks(lift,"lead").length<35);
 assert.ok(tracks(lift,"hat").length>=48);
 const opening=section(a,"opening");
 assert.ok(tracks(opening,"lead").length===0);
 assert.ok(tracks(opening,"bass").filter(e=>!e.sampleVoice).length<=8);
});
test("Genre arrangements are deterministic, bounded and preserve all event types",()=>{
 for(const channel of ["pop","dnb"]){
   const a=song(channel);
   for(const role of ["opening","statement","answer","lift","breakdown","return"]){
     const result=section(a,role);
     assert.deepEqual(result,section(a,role));
     assert.ok(result.every(e=>Number.isInteger(e.step)&&e.step>=0&&e.step<128
       &&e.duration>0&&e.step+e.duration<=128+.00001
       &&e.velocity>=.06&&e.velocity<=1));
     assert.ok(result.filter(e=>!DRUMS.has(e.track)).every(e=>Number.isInteger(e.note)
       &&e.note>=0&&e.note<=127));
     assert.ok(result.filter(e=>DRUMS.has(e.track)).every(e=>e.note===undefined));
   }
 }
});
test("Chorus and drop sections preserve a chapter's chord cycle throughout",()=>{
 for(const channel of ["pop","dnb"]){
   const a=song(channel);
   const first=composeWithEngine({...a,harmonyOverrides:a.harmonyOverrides});
   const parts=buildRadioForm({...a,channel,ecologyGenome:first.ecologyGenome},first,composeWithEngine);
   assert.equal(parts.length,6);
   for(const part of parts)
     assert.deepEqual(part.progression.map(c=>c.notes.slice(0,3).map(n=>n%12)),
       first.progression.map(c=>c.notes.slice(0,3).map(n=>n%12)));
 }
});
test("Both genre composers override pitched arrangements, rather than only replacing drums",()=>{
 for(const channel of ["pop","dnb"]){
   const a=song(channel);
   const produced=arrangeGenreMusic({...a.composition,scene:a.scene},channel,a.seed,"lift");
   assert.notDeepEqual(produced.filter(e=>!DRUMS.has(e.track)),
     a.composition.events.filter(e=>!DRUMS.has(e.track)));
 }
});
