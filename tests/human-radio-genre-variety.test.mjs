import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {RADIO_CHANNELS,applyChannelGroove} from "../radio-channels.js";
import {HIPHOP_KITS,hiphopKitForScene,hiphopDrumSample} from "../hiphop-drum-kit.js";
import {planGenreHarmony,arrangeGenreMusic} from "../genre-arrangement.js";
import {composeWithEngine} from "../music-engines.js";

const tracks=(events,track)=>events.filter(event=>event.track===track);
const signature=events=>events.map(e=>e.track+":"+e.step).join("|");
test("Human Radio has meaningful, separately selected genre scenes",()=>{
 assert.deepEqual(RADIO_CHANNELS.hiphop.scenes.map(x=>x.id),
   ["boom-bap","head-nod","lofi","west-coast","trap"]);
 assert.deepEqual(RADIO_CHANNELS.dnb.scenes.map(x=>x.id),
   ["roller","liquid","jungle","techstep","jump-up"]);
});
test("DnB's five subgenres have different drum skeletons, not identical two-step loops",()=>{
 const patterns=new Set();
 for(const {id} of RADIO_CHANNELS.dnb.scenes){
   const events=applyChannelGroove([],"dnb","genre-test","lift",id);
   assert.deepEqual(events,applyChannelGroove([],"dnb","genre-test","lift",id));
   assert.equal(tracks(events,"snare").filter(e=>e.velocity>=.8).length,16);
   for(let bar=0;bar<8;bar++){
     assert.ok(events.some(e=>e.track==="kick"&&e.step===bar*16));
     assert.ok(events.some(e=>e.track==="snare"&&e.step===bar*16+4));
     assert.ok(events.some(e=>e.track==="snare"&&e.step===bar*16+12));
   }
   patterns.add(signature(events.filter(e=>["kick","snare","hat"].includes(e.track))));
 }
 assert.equal(patterns.size,5);
});
test("Hip-hop genres include true half-time trap and different drum placements",()=>{
 const patterns=new Set();
 for(const {id} of RADIO_CHANNELS.hiphop.scenes){
   const events=applyChannelGroove([],"hiphop","hip-hop-test","lift",id);
   const snares=tracks(events,"snare").filter(e=>e.velocity>=.5);
   assert.equal(snares.length,id==="trap"?8:16);
   assert.ok(snares.every(e=>id==="trap"?e.step%16===8:[4,12].includes(e.step%16)));
   patterns.add(signature(events));
 }
 assert.equal(patterns.size,5);
});
test("Hip-hop drum libraries are verified pinned CC0 samples, separate from pop",()=>{
 const all=new Set();
 for(const [style,kit] of Object.entries(HIPHOP_KITS)){
   for(const track of ["kick","snare","clap","hat","openhat","perc"]){
     assert.ok(kit[track].length,style+" "+track);
     for(const sample of kit[track]){
       assert.equal(sample.license,"CC0 1.0");
       assert.match(sample.url,/77ba31428a079dd8f17c8e144c1e649ea0a198b3\/drum-samples\//);
       assert.ok(sample.url.endsWith(".wav"));
       all.add(sample.url);
     }
   }
 }
 assert.ok(all.size>=24);
 assert.equal(hiphopKitForScene("trap"),"trap");
 assert.equal(hiphopKitForScene("west-coast"),"bounce");
 assert.equal(hiphopKitForScene("lofi"),"vintage");
 assert.deepEqual(hiphopDrumSample("trap","kick",0,"seed"),
   hiphopDrumSample("trap","kick",0,"seed"));
 const build=readFileSync(new URL("../scripts/mirror-samples.mjs",import.meta.url),"utf8");
 const playback=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
 assert.match(build,/HIPHOP_KITS/);
 assert.match(playback,/hiphopDrumSample\(piece.scene/);
});
test("Hip-hop harmony and pitched arrangements vary without drowning drums",()=>{
 const signatures=new Set(),harmonies=new Set();
 for(const scene of RADIO_CHANNELS.hiphop.scenes.map(x=>x.id)){
  for(let i=0;i<8;i++){
   const seed=scene+"-"+i;
   const harmonyOverrides=planGenreHarmony({channel:"hiphop",seed,key:"A",mode:"minor",scene});
   harmonies.add(harmonyOverrides.join("|"));
   assert.deepEqual(harmonyOverrides.slice(0,4),harmonyOverrides.slice(4));
   const composition=composeWithEngine({
     seed,key:"A",mode:"minor",engine:"pattern",style:"downtempo",density:.65,
     bpm:88,swing:.12,harmonyOverrides
   });
   const source={...composition,scene};
   const events=arrangeGenreMusic(source,"hiphop",seed,"lift");
   assert.ok(tracks(events,"bass").length>=8);
   assert.ok(tracks(events,"lead").length<=36);
   assert.ok(events.every(e=>e.step>=0&&e.step<128&&e.step+e.duration<=128+.00001
     &&e.velocity>=.06&&e.velocity<=1));
   signatures.add(signature(events.filter(e=>e.track==="bass"||e.track==="lead")));
  }
 }
 assert.ok(signatures.size>=32);
 assert.ok(harmonies.size>=3);
});
