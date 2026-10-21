import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {GENERATOR_GENRES,GENRE_IDS,validGeneratorGenre,validSubgenre,genrePreset,
  composeGenreSong,genreDrumSample} from "../generator-genres.js";
import {DRUMS,VOICES} from "../sounds.js";

const page=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const drums=new Set(["kick","snare","clap","hat","openhat","perc"]);
test("Genre/Subgenre replace technical composition and style dropdowns",()=>{
 assert.match(page,/id="genre"/);
 assert.match(page,/id="subgenre"/);
 assert.doesNotMatch(page,/id="engine"|id="style"/);
 assert.deepEqual(GENRE_IDS,["pop","hiphop","dnb","electronic"]);
 assert.deepEqual(GENERATOR_GENRES.hiphop.subgenres.map(x=>x.id),
  ["boom-bap","head-nod","lofi","west-coast","trap"]);
 assert.deepEqual(GENERATOR_GENRES.dnb.subgenres.map(x=>x.id),
  ["roller","liquid","jungle","techstep","jump-up"]);
 assert.equal(validGeneratorGenre("bogus"),"electronic");
 assert.equal(validSubgenre("dnb","bogus"),"roller");
});
test("Each subgenre produces valid engine, tempo, density, swing and recorded voices",()=>{
 for(const genre of GENRE_IDS){
  for(const scene of GENERATOR_GENRES[genre].subgenres){
   const x=genrePreset(genre,scene.id,"genre-settings");
   assert.deepEqual(x,genrePreset(genre,scene.id,"genre-settings"));
   assert.equal(x.genre,genre);
   assert.equal(x.subgenre,scene.id);
   assert.ok(scene.engines.includes(x.engine));
   assert.ok(scene.styles.includes(x.style));
   assert.ok(x.bpm>=scene.bpm[0]&&x.bpm<=scene.bpm[1]);
   assert.ok(x.density>=Math.floor(scene.density[0]*100)&&x.density<=Math.ceil(scene.density[1]*100));
   assert.ok(x.swing>=0&&x.swing<=65);
   for(const id of Object.values(x.voices||{}))assert.ok(VOICES[id]?.length,id);
  }
 }
});
const compose=(genre,subgenre,seed="song-test")=>{
 const p=genrePreset(genre,subgenre,seed);
 return composeGenreSong({...p,seed,key:"A",mode:"minor",
  bpm:p.bpm,density:p.density/100,swing:p.swing/100,
  variations:{},harmonyOverrides:Array(8).fill(null)});
};
test("All subgenres yield real eight-bar genre arrangements, not metadata-only settings",()=>{
 const silhouettes=new Set();
 for(const genre of GENRE_IDS)for(const {id} of GENERATOR_GENRES[genre].subgenres){
  const p=compose(genre,id),repeat=compose(genre,id);
  assert.deepEqual(p.events,repeat.events);
  assert.equal(p.genre,genre);
  assert.equal(p.subgenre,id);
  assert.equal(p.bars,8);
  assert.ok(p.events.every(e=>e.step>=0&&e.step<128&&e.step+e.duration<=128+.00001));
  const rhythm=p.events.filter(e=>drums.has(e.track)).map(e=>e.track+":"+e.step).join("|");
  silhouettes.add(rhythm);
  assert.ok(p.events.some(e=>e.track==="bass"));
  assert.ok(p.events.some(e=>e.track==="kick"));
 }
 assert.ok(silhouettes.size>=11,"Genre presets must affect actual percussion rather than only labels");
});
test("Hip-hop and DnB kit routing uses real CC0/labelled samples",()=>{
 for(const genre of ["hiphop","dnb"])for(const {id} of GENERATOR_GENRES[genre].subgenres){
  const events=compose(genre,id).events.filter(e=>drums.has(e.track));
  const selected=events.map(e=>genreDrumSample(genre,id,e,"sample-test")).filter(Boolean);
  assert.ok(selected.length>0);
  assert.ok(selected.every(s=>s.url.startsWith("https://")&&s.license==="CC0 1.0"));
 }
 assert.equal(genreDrumSample("pop","bright",{track:"kick",velocity:.9,step:0},"s"),null);
 assert.ok(DRUMS.kick.length>0);
});
test("Genre metadata, manual drum overrides, links and real samples survive the editor",()=>{
 assert.match(app,/composeGenreSong\(/);
 assert.match(app,/genreDrumSample\(/);
 assert.match(app,/select.value==="auto"/);
 assert.match(app,/neededSamples\(\)/);
 assert.match(app,/sampleFor\(event\)/);
 assert.match(app,/p\.get\("genre"\)/);
 assert.match(app,/p\.get\("style"\)/);
 assert.match(app,/for\(const id of \["seed","bpm","density","swing","key","mode","style","engine","genre","subgenre"\]\)/);
 assert.match(app,/if\(preset.voices\)/);
 assert.match(app,/state\.genre=validGeneratorGenre\(\$\("genre"\)\.value\)/);
 assert.match(app,/event\.sampleVoice/);
 assert.match(app,/samplePeakGain\(buffer\)/);
 const workflow=readFileSync(new URL("../.github/workflows/pages.yml",import.meta.url),"utf8");
 assert.match(workflow,/generator-genres\.js/);
});

test("Regenerating one genre track changes only that track",()=>{
 for(const [genre,scene,track] of [
  ["dnb","jungle","kick"],["hiphop","trap","hat"],
  ["pop","indie","lead"],["hiphop","boom-bap","bass"]]){
  const seed="variation-independent-"+genre+"-"+track;
  const p=genrePreset(genre,scene,seed);
  const settings={...p,seed,key:"A",mode:"minor",bpm:p.bpm,
   density:p.density/100,swing:p.swing/100,harmonyOverrides:Array(8).fill(null)};
  const original=composeGenreSong(settings);
  const revised=composeGenreSong({...settings,variations:{[track]:3}});
  const untouched=events=>events.filter(e=>e.track!==track);
  const changed=events=>events.filter(e=>e.track===track);
  assert.deepEqual(untouched(original.events),untouched(revised.events),
    genre+" "+track+" must not affect other tracks");
  assert.notDeepEqual(changed(original.events),changed(revised.events),
    genre+" "+track+" should change");
 }
});

test("Songs within EACH subgenre have different musical identities, not just different sample selections",()=>{
 const signatures=events=>({
  lead:events.filter(e=>e.track==="lead").map(e=>e.step+":"+e.note).join("|"),
  leadRhythm:events.filter(e=>e.track==="lead").map(e=>e.step).join("|"),
  bass:events.filter(e=>e.track==="bass"&&!e.sampleVoice).map(e=>e.step+":"+e.note).join("|"),
  percussion:events.filter(e=>e.track==="kick"||e.track==="snare").map(e=>e.track+":"+e.step).join("|")
 });
 for(const genre of ["pop","hiphop","dnb"]){
  for(const {id:subgenre} of GENERATOR_GENRES[genre].subgenres){
   const seen={lead:new Set(),leadRhythm:new Set(),bass:new Set(),percussion:new Set(),harmony:new Set()};
   for(let i=0;i<36;i++){
    const seed=genre+"|"+subgenre+"|variety-audit-"+i;
    const p=genrePreset(genre,subgenre,seed);
    const song=composeGenreSong({...p,seed,key:"A",mode:"minor",
      bpm:p.bpm,density:p.density/100,swing:p.swing/100,variations:{},
      harmonyOverrides:Array(8).fill(null)});
    const signature=signatures(song.events);
    for(const [name,value] of Object.entries(signature))seen[name].add(value);
    seen.harmony.add(song.progression.map(chord=>chord.notes[0]%12).join(","));
   }
   assert.ok(seen.lead.size>=27,genre+"/"+subgenre+" has repeated complete melodies: "+seen.lead.size);
   assert.ok(seen.leadRhythm.size>=12,genre+"/"+subgenre+" has canned note attacks: "+seen.leadRhythm.size);
   assert.ok(seen.bass.size>=20,genre+"/"+subgenre+" has repeated bass parts: "+seen.bass.size);
   assert.ok(seen.harmony.size>=10,genre+"/"+subgenre+" has overly narrow harmony: "+seen.harmony.size);
   assert.ok(seen.percussion.size>=8,genre+"/"+subgenre+" repeats its drum structure: "+seen.percussion.size);
  }
 }
});
