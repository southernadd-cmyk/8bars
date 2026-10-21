import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {compose} from "../composer.js";
import {buildRadioForm,RADIO_FORMS,sectionAllowsNote,sectionVelocity,
  transitionHarmonyScore,sharedToneBridge} from "../radio-form.js";
import {chooseRadioProfile} from "../radio-planner.js";
const app=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
const page=readFileSync(new URL("../humanradio.html",import.meta.url),"utf8");
const make=(targetLoops=6)=>({
 seed:"radio-618033",key:"A",mode:"minor",style:"downtempo",
 bpm:94,density:.59,swing:.13,targetLoops,scene:"headnod"
});
const chapter=targetLoops=>{
 const profile=make(targetLoops);
 const first=compose(profile);
 const sections=buildRadioForm(profile,first,compose);
 return {...profile,sections,events:sections[0].events,progression:sections[0].progression};
};

test("Human Radio now develops songs through five to seven eight-bar sections",()=>{
 for(const n of [5,6,7]){
   const piece=chapter(n);
   assert.equal(piece.sections.length,n);
   assert.deepEqual(piece.sections.map(s=>s.role),RADIO_FORMS[n]);
   assert.equal(piece.sections.at(0).role,"opening");
   assert.equal(piece.sections.at(-1).role,"return");
   for(const s of piece.sections){
     assert.equal(s.progression.length,8);
     assert.ok(s.events.length>120,"Each section should retain substantial source music");
     assert.equal(s.eventsByStep.length,128);
     assert.equal(s.eventsByStep.flat().length,s.events.length);
     assert.ok(s.events.every(e=>e.step>=0&&e.step<128&&e.duration>0&&e.step+e.duration<=128));
   }
 }
});
test("Musical development changes actual notes and harmony but returns to the theme",()=>{
 const p=chapter(7),ss=p.sections;
 const notes=section=>section.events.filter(e=>e.track==="lead").map(e=>[e.step,e.note]);
 const percussion=section=>section.events.filter(e=>e.track==="hat").map(e=>[e.step,e.velocity]);
 assert.deepEqual(ss[0].progression,ss.at(-1).progression,"Return to source harmonic cadence");
 assert.deepEqual(notes(ss[0]),notes(ss.at(-1)),"Return to recognizable lead melody");
 assert.notDeepEqual(notes(ss[1]),notes(ss[2]),"Answer must change lead motif");
 assert.notDeepEqual(notes(ss[2]),notes(ss[3]),"Lift develops the motif further");
 assert.notDeepEqual(ss[0].progression,ss[3].progression,"Lift has a real chord substitution");
 assert.notDeepEqual(percussion(ss[0]),percussion(ss[3]),"Lift changes some percussion");
});
test("Section orchestrations coordinate entrances, breaks and return",()=>{
 const e=(track,step)=>({track,step});
 assert.equal(sectionAllowsNote(e("counter",0),"opening"),false);
 assert.equal(sectionAllowsNote(e("arp",0),"opening"),false);
 assert.equal(sectionAllowsNote(e("lead",0),"opening"),false);
 assert.equal(sectionAllowsNote(e("lead",48),"opening"),true);
 assert.equal(sectionAllowsNote(e("kick",64),"breakdown"),false);
 assert.equal(sectionAllowsNote(e("hat",66),"breakdown"),false);
 assert.equal(sectionAllowsNote(e("lead",48),"breakdown"),false);
 assert.equal(sectionAllowsNote(e("lead",80),"breakdown"),true);
 assert.equal(sectionAllowsNote(e("lead",80),"lift"),true);
 assert.equal(sectionAllowsNote(e("openhat",118),"return"),false);
 assert.ok(sectionVelocity("lift","kick")>sectionVelocity("opening","kick"));
 assert.ok(sectionVelocity("lift","lead")>sectionVelocity("breakdown","lead"));
});
test("Harmony-aware transitions prefer actual shared chord tones and avoid invented notes",()=>{
 const from=chapter(5),to=chapter(5);
 assert.equal(transitionHarmonyScore(from,to),transitionHarmonyScore(from,to));
 const outgoing=from.sections.at(-1);
 const incoming=to.sections[0];
 outgoing.progression[7]={notes:[60,64,67]}; // C major
 incoming.progression[0]={notes:[60,64,67]}; // common C/E/G
 const recorded={track:"pad",step:112,duration:12,velocity:.4,note:72};
 outgoing.events.push(recorded);
 assert.ok(transitionHarmonyScore(from,to)>0);
 const bridge=sharedToneBridge(from,to);
 assert.ok(bridge.some(e=>e.note===72));
 assert.ok(bridge.every(e=>e.velocity<=.23&&e.duration<=12));
 assert.ok(bridge.every(e=>outgoing.events.some(source=>source.note===e.note&&source.track===e.track)));
 incoming.progression[0]={notes:[61,65,68]}; // no shared C chord pitch classes
 assert.deepEqual(sharedToneBridge(from,to),[],"No unrecorded dissonant bridge should be created");
});
test("Long-form sample preloading and boundaries preserve seamless continuous playback",()=>{
 assert.match(app,/buildRadioForm\(\{\.\.\.profile,seed\},piece,compose\)/);
 assert.match(app,/async function warmNextSection\(piece\)/);
 assert.match(app,/await prepare\(piece,index\)/);
 assert.match(app,/sectionAllowsNote\(e,section\.role\)/);
 assert.match(app,/sectionVelocity\(section\.role,e\.track\)/);
 assert.match(app,/if\(loops<targetLoops&&!current\.sections\[loops\]\?\.ready\)/);
 assert.match(app,/loops=Math\.max\(0,loops-1\)/);
 assert.match(app,/sharedToneBridge\(prev,current\)/);
 assert.match(app,/transitionHarmonyScore\(current,b\)/);
 assert.match(app,/pendingSamples\.has\(s\.url\)/);
 assert.match(app,/function pruneSampleCache\(/);
 assert.doesNotMatch(app,/createOscillator/);
 assert.match(page,/humanradio\.gif/);
});
test("Random scene targets at least five distinct long-form sections",()=>{
 let profile=chooseRadioProfile(null,()=>.4);
 assert.ok(profile.targetLoops>=5&&profile.targetLoops<=7);
 for(let i=0;i<100;i++){
   profile=chooseRadioProfile(profile,()=>i%9/9);
   assert.ok(profile.targetLoops>=5&&profile.targetLoops<=7);
 }
});
