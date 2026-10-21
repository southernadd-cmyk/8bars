import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {planInstrumentPalette,genreRolePools} from "../instrument-palettes.js";
import {GENERATOR_GENRES,genrePreset} from "../generator-genres.js";
import {VOICES,REGEN_VOICE_POOLS,nearestSample} from "../sounds.js";
const roles=["bass","chords","arp","lead","counter","pad"];
test("Every genre and subgenre can draw from a substantial range of real recorded instruments",()=>{
 for(const [genre,definition] of Object.entries(GENERATOR_GENRES)){
  for(const scene of definition.subgenres){
   const pools=genreRolePools(genre,scene.id);
   assert.ok(pools.lead.length>=8,genre+"/"+scene.id+" needs broad lead choices: "+pools.lead.length);
   assert.ok(pools.chords.length>=6,genre+"/"+scene.id+" needs broad harmony choices");
   assert.ok(pools.bass.length>=3,genre+"/"+scene.id+" needs more than a fixed bass");
   for(const role of roles){
    assert.ok(pools[role].length>=3,genre+"/"+scene.id+" "+role);
    for(const id of pools[role]){
     assert.ok(VOICES[id]?.length,genre+"/"+scene.id+" "+role+" "+id);
     assert.ok(VOICES[id].every(s=>s.url.startsWith("https://")&&s.license),
       id+" must use licensed recorded files");
     if(role!=="bass")assert.ok(REGEN_VOICE_POOLS[role].includes(id),
       "Instrument must be pitch/role suitable: "+role+" "+id);
    }
   }
  }
 }
});
test("The same seed recreates the complete palette, without duplicate instruments on a song",()=>{
 for(const [genre,definition] of Object.entries(GENERATOR_GENRES))for(const scene of definition.subgenres){
  for(let i=0;i<24;i++){
   const seed=genre+"|"+scene.id+"|palette-"+i;
   const a=planInstrumentPalette(genre,scene.id,seed);
   const b=planInstrumentPalette(genre,scene.id,seed);
   assert.deepEqual(a,b);
   assert.equal(Object.keys(a).length,6);
   assert.equal(new Set(Object.values(a)).size,6,
     genre+"/"+scene.id+" should not double the same recorded patch across pitched tracks");
   const preset=genrePreset(genre,scene.id,seed);
   assert.deepEqual(a,preset.voices);
   for(const [role,id] of Object.entries(a)){
    const note=role==="bass"?40:role==="pad"?66:role==="lead"?74:64;
    assert.ok(nearestSample(id,note).url.startsWith("https://"));
   }
  }
 }
});
test("Each subgenre varies actual instrument identities across 40 consecutive songs",()=>{
 for(const [genre,definition] of Object.entries(GENERATOR_GENRES))for(const scene of definition.subgenres){
  const observed=Object.fromEntries(roles.map(role=>[role,new Set()]));
  const signatures=new Set();let previous=null;
  for(let i=0;i<40;i++){
   const seed=genre+"|"+scene.id+"|next-"+i;
   const palette=planInstrumentPalette(genre,scene.id,seed,previous);
   if(previous){
    for(const role of ["lead","chords","bass"])
     assert.notEqual(palette[role],previous[role],
       genre+"/"+scene.id+" repeated "+role+" despite available options");
   }
   signatures.add(roles.map(role=>palette[role]).join("|"));
   for(const role of roles)observed[role].add(palette[role]);
   previous=palette;
  }
  assert.equal(signatures.size,40);
  assert.ok(observed.lead.size>=8,genre+"/"+scene.id+" same handful of leads: "+observed.lead.size);
  assert.ok(observed.chords.size>=6,genre+"/"+scene.id+" same few chord sounds: "+observed.chords.size);
  assert.ok(observed.bass.size>=3,genre+"/"+scene.id+" repeated bass sounds: "+observed.bass.size);
 }
});
test("New song preserves its newly chosen instruments, links preserve explicit selections, Radio uses shared palette",()=>{
 const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
 const radio=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 assert.match(app,/const previousVoices=\{\.\.\.state\.voices\}/);
 assert.match(app,/applyGenreDefaults\(previousVoices\)/);
 assert.match(app,/genrePreset\(state\.genre,state\.subgenre,state\.seed,previousVoices\)/);
 assert.match(app,/if\(VOICES\[inst\[i\]\]\)state\.voices\[id\]=inst\[i\]/);
 assert.match(radio,/planInstrumentPalette\(profile\.channel,profile\.scene,seed,sameChannel\?old\.voices:null\)/);
 assert.match(html,/app\.js\?v=0\.8\.3/);
 const workflow=readFileSync(new URL("../.github/workflows/pages.yml",import.meta.url),"utf8");
 assert.match(workflow,/cp index\.html[^\n]*instrument-palettes\.js/);
});
