import test from "node:test";
import assert from "node:assert/strict";
import {compose,euclidean,GOLDEN,ENGINE_VERSION,TRACKS,STYLES} from "../composer.js";
import {DRUMS,VOICES,DEFAULT_VOICES,nearestSample,inventory,regenerateSelections,REGEN_VOICE_POOLS} from "../sounds.js";

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
  assert.ok(inventory().every(s=>["CC0 1.0","CC BY 3.0"].includes(s.license)&&s.url.startsWith("https://")));
  assert.ok(inventory().length>=200);
  assert.ok(Object.keys(VOICES).length>=75,"Expect expanded real instrument and articulation choices");
  for(const id of ["bassoon","clarinet","flute","sax"])assert.ok(!Object.hasOwn(VOICES,id),id+" should be withdrawn");
  assert.ok(VOICES.electricBass.every(s=>s.url.includes("/bass-electric/")));
  assert.ok(Object.keys(DRUMS).length>=6);
  assert.ok(Object.keys(VOICES).length>=3);
  for(const voice of Object.keys(VOICES))for(const note of [40,60,75,90]){
    const s=nearestSample(voice,note);
    assert.ok(Number.isInteger(s.root));
    assert.ok(/\.(ogg|mp3|wav)$/.test(s.url.split("#")[0]));
  }
  for(const track of TRACKS.filter(t=>t.type==="pitched"))assert.ok(VOICES[DEFAULT_VOICES[track.id]]);
});

test("main regeneration changes sounds across all twelve tracks without repeating selections",()=>{
  const drums=Object.fromEntries(Object.entries(DRUMS).map(([id])=>[id,0]));
  const oldVoices={...DEFAULT_VOICES};
  const next=regenerateSelections(oldVoices,drums,()=>0);
  for(const [track,choices] of Object.entries(REGEN_VOICE_POOLS)){
    assert.notEqual(next.voices[track],oldVoices[track],track+" must change instrument");
    assert.ok(choices.includes(next.voices[track]),track+" must use a suitable instrument");
  }
  for(const [track,choices] of Object.entries(DRUMS)){
    assert.notEqual(next.drumSounds[track],drums[track],track+" must change sample");
    assert.ok(next.drumSounds[track]>=0&&next.drumSounds[track]<choices.length);
  }
  assert.deepEqual(oldVoices,DEFAULT_VOICES,"do not mutate original selections");
  assert.ok(Object.values(drums).every(index=>index===0),"do not mutate drum selections");
});
test("main regeneration remains fresh on consecutive clicks",()=>{
  const drums=Object.fromEntries(Object.entries(DRUMS).map(([id])=>[id,0]));
  const a=regenerateSelections(DEFAULT_VOICES,drums,n=>n-1);
  const b=regenerateSelections(a.voices,a.drumSounds,()=>0);
  for(const id of Object.keys(REGEN_VOICE_POOLS))assert.notEqual(a.voices[id],b.voices[id]);
  for(const id of Object.keys(DRUMS))assert.notEqual(a.drumSounds[id],b.drumSounds[id]);
});
test("main Regenerate button actually uses instrument randomisation",async()=>{
  const {readFileSync}=await import("node:fs");
  const source=readFileSync(new URL("../app.js",import.meta.url),"utf8");
  const start=source.indexOf('$("another").addEventListener');
  assert.ok(start>=0);
  const next=source.indexOf('$("copy").addEventListener',start);
  const handler=source.slice(start,next);
  assert.match(handler,/regenerateSelections\(state\.voices,state\.drumSounds,randomIndex\)/);
  assert.match(handler,/state\.seed=String\(value\[0\]\)/);
  assert.match(handler,/userAssignments\.clear\(\)/);
  assert.match(handler,/rerender\(\)/);
});

test("new pitched and bass sample banks use verified recording paths",()=>{
 for(const id of ["vcStrumstickFinger","vcClavisynth","vcFMPiano","vcFMPiano1","vcBassRecorderVib"]){
  assert.ok(VOICES[id]?.length>=8,id);
  assert.ok(VOICES[id].every(x=>Number.isInteger(x.root)&&x.source==="Versilian Community Sample Library"));
 }
});

test("Vocal sample bank uses locally mirrorable, licensed, short recorded chunks",()=>{
 for(const id of ["vocalOpenAh","vocalSyllable","vocalMelisma","vocalEffects"]){
  const sounds=VOICES[id];assert.ok(sounds.length>=(id==="vocalSyllable"?1:4),id);
  assert.ok(sounds.every(s=>s.oneShot===true&&s.license==="CC0 1.0"&&s.crop.duration>0&&s.crop.duration<=1.6&&s.url.startsWith("https://raw.githubusercontent.com/")));
 }
});

test("spoken Hola uses a single voiced-onset recording rather than arbitrary silent offsets",()=>{
 const sample=VOICES.vocalSyllable;
 assert.equal(sample.length,1);
 assert.equal(sample[0].crop.removeLeadingSilence,true);
 assert.ok(sample[0].crop.duration>=1.2);
});

test("sung melodic voices use real note-labelled recordings, distinct from spoken chops",()=>{
 for(const id of ["vocalSungNotes","vocalSungAh","vocalSungEh","vocalSungEe","vocalSungOh","vocalSungOo","vocalSungU"]){
  const bank=VOICES[id];assert.ok(bank.length>=4,id);
  assert.ok(bank.every(s=>Number.isInteger(s.root)&&s.license==="MIT"&&s.source==="Human Voice Dataset · Vocobox"&&s.url.endsWith(".wav")&&!s.oneShot),id);
 }
 assert.ok(new Set(VOICES.vocalSungNotes.map(x=>x.root)).size>=20,"Sung notes need broad pitch coverage");
 for(const role of ["lead","counter","pad"])assert.ok(REGEN_VOICE_POOLS[role].includes("vocalSungNotes"));
});
