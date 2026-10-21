import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {RADIO_CHANNELS,RADIO_CHANNEL_IDS,validRadioChannel,applyChannelGroove} from "../radio-channels.js";
import {chooseRadioProfile} from "../radio-planner.js";
import {composeWithEngine} from "../music-engines.js";
import {phraseBlueprint} from "../music-engines.js";

const page=readFileSync(new URL("../humanradio.html",import.meta.url),"utf8");
const radio=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
const composer=readFileSync(new URL("../composer.js",import.meta.url),"utf8");
const drums=new Set(["kick","snare","clap","hat","openhat","perc"]);

test("Human Radio provides Mixed, Hip-hop, Drum & Bass and Pop stations",()=>{
 assert.deepEqual(RADIO_CHANNEL_IDS,["mixed","hiphop","dnb","pop"]);
 for(const id of RADIO_CHANNEL_IDS){
   assert.match(page,new RegExp('value="'+id+'"'));
   assert.ok(RADIO_CHANNELS[id].name.length>=3);
 }
 assert.match(page,/id="channel"/);
 assert.match(page,/id="introChannel"/);
 assert.equal(validRadioChannel("nonexistent"),"mixed");
 assert.equal(validRadioChannel("dnb"),"dnb");
 assert.match(radio,/function changeStation\(value\)/);
 assert.match(radio,/if\(playing\)/);
 assert.match(radio,/channelVersion/);
 assert.match(radio,/candidate\.channel===selectedChannel/);
 assert.match(radio,/history\.replaceState/);
});
test("Channel selects a bounded tempo, allowed engine and scene, including actual DnB speeds",()=>{
 for(const channel of ["hiphop","dnb","pop"]){
   let previous=null;
   for(let i=0;i<80;i++){
     const a=(i*37%101)/101;
     let cursor=0;
     const random=()=>((a+cursor++*.1743)%1);
     const profile=chooseRadioProfile(previous,random,channel);
     const scene=RADIO_CHANNELS[channel].scenes.find(s=>s.id===profile.scene);
     assert.ok(scene);
     assert.equal(profile.channel,channel);
     assert.ok(scene.engines.includes(profile.engine),profile.engine);
     assert.ok(scene.styles.includes(profile.style),profile.style);
     assert.ok(profile.bpm>=scene.bpm[0]&&profile.bpm<=scene.bpm[1],profile.bpm);
     assert.ok(profile.density>=.15&&profile.density<=1);
     assert.ok(profile.swing>=0&&profile.swing<=.65);
     if(previous)assert.ok(Math.abs(profile.bpm-previous.bpm)<=12);
     previous=profile;
   }
 }
 const dnb=chooseRadioProfile(null,()=>.5,"dnb");
 assert.ok(dnb.bpm>=168&&dnb.bpm<=176);
 assert.match(composer,/Math\.min\(b,185\)|,60,185\)/);
});
test("Changing channels immediately chooses a tempo in the newly selected band",()=>{
 const prior=chooseRadioProfile(null,()=>.25,"hiphop");
 const next=chooseRadioProfile(prior,()=>.5,"dnb");
 assert.ok(next.bpm>=168);
 assert.equal(next.channel,"dnb");
 assert.notEqual(next.scene,prior.scene);
});
test("Channel-specific drums are seeded, valid and distinguish the three station genres",()=>{
 const base=composeWithEngine({seed:"grooves",engine:"pattern",style:"breakbeat",bpm:96}).events;
 const profiles={};
 for(const channel of ["hiphop","dnb","pop"]){
   const a=applyChannelGroove(base,channel,"one","statement");
   const b=applyChannelGroove(base,channel,"one","statement");
   assert.deepEqual(a,b);
   assert.ok(a.every(e=>Number.isInteger(e.step)&&e.step>=0&&e.step<128));
   assert.ok(a.filter(e=>drums.has(e.track)).every(e=>e.note===undefined));
   assert.deepEqual(a.filter(e=>!drums.has(e.track)),base.filter(e=>!drums.has(e.track)));
   assert.ok(a.filter(e=>e.track==="snare").length>=16);
   profiles[channel]=a.filter(e=>drums.has(e.track)).map(e=>e.track+":"+e.step).join("|");
 }
 assert.equal(new Set(Object.values(profiles)).size,3);
 assert.strictEqual(applyChannelGroove(base,"mixed","one"),base);
});
test("Different channel sections vary their drum arrangements while keeping the musical genre",()=>{
 for(const channel of ["hiphop","dnb","pop"]){
   const a=applyChannelGroove([],channel,"test","opening");
   const b=applyChannelGroove([],channel,"test","lift");
   assert.notDeepEqual(a,b,channel);
   for(const events of [a,b]){
     for(let bar=0;bar<8;bar++){
       const snare=events.filter(e=>e.track==="snare"&&e.step>=bar*16&&e.step<(bar+1)*16);
       assert.ok(snare.some(e=>e.step%16===4)&&snare.some(e=>e.step%16===12));
     }
   }
 }
});
test("Melodic songs use genuinely different lead contours, rhythms and chord attacks across seeds",()=>{
 const signatures=new Set(),rhythms=new Set(),harmonies=new Set(),leadVariations=new Set();
 for(let i=0;i<32;i++){
   const piece=composeWithEngine({engine:"melodic",seed:"distinct-"+i,
     key:"C",mode:"major",style:"downtempo",density:.63,bpm:95});
   const lead=piece.events.filter(e=>e.track==="lead");
   const chords=piece.events.filter(e=>e.track==="chords");
   signatures.add(lead.map(e=>e.step+":"+e.note).join("|"));
   rhythms.add(lead.map(e=>e.step).join("|"));
   harmonies.add(chords.map(e=>e.step+":"+e.note).join("|"));
   leadVariations.add(lead.map(e=>e.note).join("|"));
   assert.ok(lead.length>=24&&lead.length<=80);
   assert.ok(chords.length>=12);
 }
 assert.ok(signatures.size>=27,"The composer should rarely repeat the same full tune");
 assert.ok(rhythms.size>=12,"Melody rhythm cannot be a single fixed template");
 assert.ok(leadVariations.size>=22,"Melody pitch movement needs independent variety");
 assert.ok(harmonies.size>=20,"Chord accompaniment must vary with more than timbre");
});
test("All independent engines vary lead and chords across multiple song seeds",()=>{
 for(const engine of ["pattern","melodic","ambient","process","ecology"]){
   const leads=new Set(),chords=new Set();
   for(let i=0;i<16;i++){
     const piece=composeWithEngine({engine,seed:engine+"-diversity-"+i,
       key:"A",mode:"minor",style:"downtempo",density:.7,bpm:96});
     leads.add(piece.events.filter(e=>e.track==="lead").map(e=>e.step+":"+e.note).join(","));
     chords.add(piece.events.filter(e=>e.track==="chords").map(e=>e.step+":"+e.note).join(","));
   }
   assert.ok(leads.size>=10,engine+" lead variation collapsed");
   assert.ok(chords.size>=10,engine+" chord variation collapsed");
 }
});
test("Phrase grammar is deterministic for a seed but produces diverse actual phrase designs",()=>{
 const a=phraseBlueprint((()=>{let x=0;return ()=>((x++*7+3)%19)/19})());
 const b=phraseBlueprint((()=>{let x=0;return ()=>((x++*7+3)%19)/19})());
 assert.deepEqual(a,b);
 const shapes=new Set(),attacks=new Set();
 for(let i=0;i<32;i++){
   let n=0;const blueprint=phraseBlueprint(()=>((i*17+(n++*23))%107)/107);
   shapes.add(blueprint.contour.join(","));
   attacks.add(blueprint.rhythm.join(","));
   assert.ok(blueprint.contour.length>=4&&blueprint.contour.length<=7);
   assert.ok(blueprint.rhythm.length>=4&&blueprint.rhythm.length<=6);
   assert.ok(blueprint.rhythm.every(p=>p>=0&&p<=15));
 }
 assert.ok(shapes.size>=16);
 assert.ok(attacks.size>=14);
});
