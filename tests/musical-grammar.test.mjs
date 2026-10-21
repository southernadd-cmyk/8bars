import test from "node:test";
import assert from "node:assert/strict";
import {phraseBlueprint,developPhrase,smoothVoicing,harmonicDegrees} from "../musical-grammar.js";
import {composeGenreSong,genrePreset,GENERATOR_GENRES} from "../generator-genres.js";
import {chordsInKey} from "../harmony.js";

function rand(seed){
 let x=seed*1664525+1013904223;
 return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296};
}
function make(genre,subgenre,seed){
 const preset=genrePreset(genre,subgenre,seed);
 return composeGenreSong({...preset,seed,key:"A",mode:"minor",
  bpm:preset.bpm,density:preset.density/100,swing:preset.swing/100,
  harmonyOverrides:Array(8).fill(null)});
}
test("Motifs develop through echo, answer and cadence rather than looping the same bar",()=>{
 let developed=0;
 for(let seed=0;seed<120;seed++){
  const a=phraseBlueprint(rand(seed),4,7);
  const bars=Array.from({length:8},(_,bar)=>developPhrase(a,bar));
  assert.deepEqual(bars[0].rhythm,a.rhythm);
  assert.deepEqual(bars[0].contour,a.contour);
  assert.deepEqual(bars[0],developPhrase(a,0));
  assert.ok(bars[3].cadence&&bars[7].cadence&&bars[7].finalCadence);
  assert.equal(bars[7].contour.at(-1),0);
  assert.ok(bars.every(bar=>bar.rhythm.every((s,i)=>
    s>=0&&s<16&&(i===0||s>bar.rhythm[i-1]))));
  const phrases=new Set(bars.map(b=>b.rhythm.join(",")+"|"+b.contour.join(",")));
  if(phrases.size>=4)developed++;
 }
 assert.ok(developed>=115,"Expect genuine phrase development across most seeded motifs");
});
test("Chord inversions minimise travel and remain in a playable keyboard range",()=>{
 const chords=chordsInKey("A","minor");
 let previous=null;
 for(const chord of [chords[0],chords[3],chords[4],chords[0],chords[5]]){
  const notes=smoothVoicing(chord,68,previous);
  assert.equal(notes.length,3);
  assert.ok(notes.every(n=>n>=53&&n<=92));
  assert.ok(notes.every((n,i)=>i===0||n>notes[i-1]));
  assert.ok(notes.every(n=>chord.notes.slice(0,3).some(m=>n%12===m%12)));
  previous=notes;
 }
});
test("Harmonic routes are deterministic, functional, and varied across songs",()=>{
 const seen=new Set();
 for(let i=0;i<100;i++){
  const first=harmonicDegrees(rand(i),"pop","major");
  assert.deepEqual(first,harmonicDegrees(rand(i),"pop","major"));
  assert.equal(first.length,4);
  assert.ok(first.every(d=>d>=0&&d<=6));
  assert.ok(first.some((d,j)=>j===0||d!==first[j-1]));
  seen.add(first.join(","));
 }
 assert.ok(seen.size>=35,"The grammar needs many plausible harmonic routes");
});
test("Pop, hip-hop and DnB songs have recognisable phrase development inside each seed",()=>{
 for(const genre of ["pop","hiphop","dnb"]){
  for(const {id:scene} of GENERATOR_GENRES[genre].subgenres){
   let developed=0,stable=0;
   for(let i=0;i<16;i++){
    const seed=genre+scene+"-grammar-"+i;
    const song=make(genre,scene,seed);
    const replay=make(genre,scene,seed);
    assert.deepEqual(song.events,replay.events);
    const bars=Array.from({length:8},(_,bar)=>song.events
      .filter(e=>e.track==="lead"&&e.step>=bar*16&&e.step<(bar+1)*16)
      .map(e=>e.step%16+":"+e.note).join("|"));
    if(new Set(bars).size>=4)developed++;
    if(song.events.filter(e=>e.track==="chords").length>=8)stable++;
   }
   assert.ok(developed>=12,genre+"/"+scene+" should develop melodies, not replay bars");
   assert.ok(stable>=13,genre+"/"+scene+" should keep its harmonic foundation");
  }
 }
});
