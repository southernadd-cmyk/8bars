import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {compose,TRACKS} from "../composer.js";
import {composeWithEngine,ENGINE_IDS,COMPOSITION_ENGINES} from "../music-engines.js";
import {buildRadioForm} from "../radio-form.js";
import {chooseRadioProfile,radioNoveltyScore} from "../radio-planner.js";
const config={seed:"four-music-systems",bpm:99,key:"F#",mode:"minor",style:"breakbeat",density:.64,swing:.12};
const pitched=new Set(TRACKS.filter(t=>t.type==="pitched").map(t=>t.id));
const drums=new Set(TRACKS.filter(t=>t.type==="drum").map(t=>t.id));
const music=id=>composeWithEngine({...config,engine:id});

test("Six selectable modes include original plus five independent composers",()=>{
 assert.deepEqual(ENGINE_IDS,["classic","pattern","melodic","ambient","process","ecology"]);
 assert.equal(COMPOSITION_ENGINES.length,6);
 assert.deepEqual(music("classic").events,compose(config).events);
 assert.equal(music("does-not-exist").engine,"classic");
});
test("All four new systems are deterministic, eight bars and export-safe",()=>{
 for(const id of ENGINE_IDS){
   const a=music(id);
   assert.deepEqual(a,music(id),"repeatable seed: "+id);
   assert.equal(a.engine,id);
   assert.equal(a.bars,8);
   assert.equal(a.progression.length,8);
   assert.ok(a.events.length>20,"Must generate actual music: "+id);
   assert.ok(a.events.every(e=>TRACKS.some(t=>t.id===e.track)),id);
   assert.ok(a.events.every(e=>Number.isInteger(e.step)&&e.step>=0&&e.step<128&&
     Number.isFinite(e.duration)&&e.duration>0&&e.step+e.duration<=128+1e-6&&
     e.velocity>.05&&e.velocity<=1),id);
   assert.ok(a.events.filter(e=>pitched.has(e.track)).every(e=>
     Number.isInteger(e.note)&&e.note>=0&&e.note<128),id);
   assert.ok(a.events.filter(e=>drums.has(e.track)).every(e=>e.note===undefined),id);
   assert.ok(a.events.some(e=>e.track==="lead"),id);
   assert.ok(a.events.some(e=>e.track==="bass"),id);
 }
});
test("The four musical systems generate markedly different rhythmic structures",()=>{
 const pieces=Object.fromEntries(ENGINE_IDS.slice(1).map(id=>[id,music(id)]));
 const byTrack=(id,t)=>pieces[id].events.filter(e=>e.track===t);
 const patKick=byTrack("pattern","kick").length;
 const ambientKick=byTrack("ambient","kick").length;
 assert.ok(patKick>=15,"Pattern maintains a regular driving pulse");
 assert.equal(ambientKick,0,"Ambient deliberately avoids a drumbeat");
 const longAmbient=pieces.ambient.events.filter(e=>e.duration>=18).length;
 const longPattern=pieces.pattern.events.filter(e=>e.duration>=18).length;
 assert.ok(longAmbient>longPattern+4,"Ambient is built on sustained acoustic tones");
 const melodicLead=byTrack("melodic","lead");
 assert.ok(melodicLead.length>=25,"Melodic engine develops call-and-response phrases");
 const processRhythm=byTrack("process","hat").map(e=>e.step%16);
 const patternRhythm=byTrack("pattern","hat").map(e=>e.step%16);
 assert.notDeepEqual(processRhythm,patternRhythm,"Process uses phase-shifting rhythms");
 for(const a of ENGINE_IDS.slice(1))for(const b of ENGINE_IDS.slice(1))
   if(a!==b)assert.notDeepEqual(pieces[a].events,pieces[b].events,a+" vs "+b);
});
test("Every new system uses edited harmony and independently seeded channel variations",()=>{
 for(const engine of ENGINE_IDS.slice(1)){
   const original=music(engine);
   const overrides=Array(8).fill(null);overrides[2]="D#m";overrides[5]="Gdim";
   const changed=composeWithEngine({...config,engine,harmonyOverrides:overrides});
   assert.equal(changed.progression[2].edited,true);
   assert.equal(changed.progression[5].edited,true);
   assert.notDeepEqual(
     original.events.filter(e=>e.track==="chords"),
     changed.events.filter(e=>e.track==="chords"),engine+" must harmonize to manual chords");
   const mutated=composeWithEngine({...config,engine,variations:{lead:3}});
   assert.notDeepEqual(mutated.events.filter(e=>e.track==="lead"),
     original.events.filter(e=>e.track==="lead"),engine+" lead regeneration should change");
   for(const track of TRACKS.filter(t=>t.id!=="lead"))
     assert.deepEqual(mutated.events.filter(e=>e.track===track.id),
       original.events.filter(e=>e.track===track.id),engine+" mutation affected "+track.id);
 }
});
test("Radio scene planning selects different systems and preserves engine through its musical chapters",()=>{
 let previous=null;const found=new Set();
 for(let i=0;i<200;i++){
   const n=i;
   const next=chooseRadioProfile(previous,(()=>{let k=0;return ()=>((n*37+(k++*19))%101)/101})());
   found.add(next.engine);
   assert.ok(ENGINE_IDS.includes(next.engine),next.engine);
   previous=next;
 }
 assert.ok(found.size>=3,"Station must explore genuinely different methods of composing");
 for(const engine of ENGINE_IDS.slice(1)){
   const input={...config,engine,targetLoops:6};
   const first=composeWithEngine(input);
   const sections=buildRadioForm(input,first,composeWithEngine);
   assert.equal(sections.length,6);
   assert.ok(sections.every(s=>s.events.length>10));
   assert.deepEqual(sections[0].events,first.events);
   assert.notDeepEqual(sections[1].events,sections[2].events);
 }
 const a={...music("ambient"),scene:"drift",voices:{lead:"piano"}};
 const b={...music("pattern"),scene:"drift",voices:{lead:"piano"}};
 assert.ok(radioNoveltyScore(b,[a])>=radioNoveltyScore(a,[a]));
});
test("Browser interfaces connect audio-safe engines, sharing and downloaded outputs",()=>{
 const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
 const page=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const radio=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
 assert.match(page,/id="engine"/);
 for(const id of ENGINE_IDS)assert.match(page,new RegExp('value="'+id+'"'));
 assert.match(app,/composition=composeWithEngine\(/);
 assert.match(app,/ENGINE_IDS\.includes\(p\.get\("engine"\)\)/);
 assert.match(app,/q\.set\(id,state\[id\]\)/);
 assert.match(radio,/const piece=composeWithEngine\(/);
 assert.match(radio,/buildRadioForm\(candidate,baseComposition,composeWithEngine\)/);
 assert.match(radio,/paletteFor\(profile\.engine,role,suitable\)/);
 assert.match(radio,/VOICE_FAMILIES\[name\]/);
 assert.doesNotMatch(radio,/createOscillator/);
});
