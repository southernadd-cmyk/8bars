import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parseRadioDictionary,radioNameForSeed} from "../radio-names.js";
import {ELECTRONIC_BASS_NAMES,ELECTRONIC_BASS_VOICES} from "../electronic-bass.js";
import {VOICES,VOICE_NAMES} from "../sounds.js";
import {composeWithEngine} from "../music-engines.js";
import {planGenreHarmony,arrangeGenreMusic} from "../genre-arrangement.js";

const dictionary=readFileSync(new URL("../radio-words.txt",import.meta.url),"utf8");
const page=readFileSync(new URL("../humanradio.html",import.meta.url),"utf8");
const radio=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
const mirror=readFileSync(new URL("../scripts/mirror-samples.mjs",import.meta.url),"utf8");
const license=readFileSync(new URL("../ELECTRONIC-BASS-LICENSE.txt",import.meta.url),"utf8");
test("Local dictionary is clean, substantial, alphabetic and contains example words",()=>{
 const words=parseRadioDictionary(dictionary);
 assert.ok(words.length>=500,words.length);
 assert.ok(words.includes("aardvark")&&words.includes("blue"));
 assert.ok(words.includes("only")&&words.includes("super")&&words.includes("achievement"));
 assert.ok(words.every(x=>/^[a-z]{3,14}$/.test(x)));
 assert.equal(new Set(words).size,words.length);
});
test("Artist and title each have 1–3 capitalised dictionary words, with distinct words",()=>{
 const words=parseRadioDictionary(dictionary),set=new Set(words);
 const signatures=new Set(),counts=new Set();
 for(let i=0;i<300;i++){
   const seed="song-"+i;
   const name=radioNameForSeed(seed,words);
   assert.deepEqual(name,radioNameForSeed(seed,words));
   const artist=name.artist.split(" "),title=name.title.split(" ");
   counts.add(artist.length);counts.add(title.length);
   assert.ok(artist.length>=1&&artist.length<=3);
   assert.ok(title.length>=1&&title.length<=3);
   assert.ok([...artist,...title].every(x=>set.has(x.toLowerCase())&&/^[A-Z][a-z]+$/.test(x)));
   assert.equal(new Set([...artist,...title]).size,artist.length+title.length);
   signatures.add(name.artist+" — "+name.title);
 }
 assert.deepEqual(counts,new Set([1,2,3]));
 assert.ok(signatures.size>=295);
});
test("Radio shows names instead of technical composition metadata and removes section line/capsules",()=>{
 assert.match(page,/id="artist"/);
 assert.match(page,/id="track"/);
 assert.doesNotMatch(page,/id="phase"/);
 assert.doesNotMatch(page,/class="pill"/);
 assert.doesNotMatch(page,/class="meta"/);
 assert.match(radio,/function showSongIdentity\(piece\)/);
 assert.match(radio,/radioNameForSeed\(seed,radioWords\)/);
 assert.match(radio,/fetch\("\.\/radio-words\.txt\?v=1"\)/);
 assert.match(radio,/showSongIdentity\(current\)/);
 assert.doesNotMatch(radio,/\$\("phase"\)/);
 assert.doesNotMatch(radio,/\$\("track"\)\.textContent=current\.key/);
});
test("Five genuine labelled, licensed synth-bass recordings have pinned pitch roots",()=>{
 const expected={
  dnbReese:36,dnbWobble:36,dnbFm:36,dnbSub:24,dnb808:24
 };
 assert.deepEqual(new Set(Object.keys(ELECTRONIC_BASS_VOICES)),new Set(Object.keys(expected)));
 for(const [id,root] of Object.entries(expected)){
   const samples=ELECTRONIC_BASS_VOICES[id];
   assert.equal(samples.length,1);
   assert.equal(samples[0].root,root);
   assert.equal(samples[0].license,"MIT");
   assert.ok(samples[0].url.endsWith(".wav"));
   assert.ok(samples[0].url.includes("/3067d2d1e242e60571386cec87e0183dab6e9c9e/"));
   assert.deepEqual(VOICES[id],samples);
   assert.equal(VOICE_NAMES[id],ELECTRONIC_BASS_NAMES[id]);
 }
 assert.match(license,/Copyright \(c\) 2026 Martin Pfeffer/);
 assert.match(license,/MIT License/);
 assert.match(mirror,/Object\.values\(VOICES\)/);
});
test("DnB generates real sub-layer events in the same root pitch class as Reese and 808",()=>{
 const settings={seed:"bass-layer",key:"A",mode:"minor",style:"breakbeat",
    bpm:172,engine:"pattern",density:.68,swing:0,scene:"roller"};
 const harmonyOverrides=planGenreHarmony({...settings,channel:"dnb"});
 const score=composeWithEngine({...settings,harmonyOverrides});
 const events=arrangeGenreMusic({...score,scene:"roller"},"dnb",settings.seed,"lift");
 const mains=events.filter(e=>e.track==="bass"&&!e.sampleVoice);
 const subs=events.filter(e=>e.sampleVoice==="dnbSub");
 assert.ok(mains.length>=16);
 assert.ok(subs.length>=8);
 assert.ok(subs.every(e=>mains.some(main=>main.step===e.step&&
   (main.note-e.note===12||main.note===e.note))));
 assert.ok(subs.every(e=>e.velocity<=.23&&e.note>=28));
 assert.match(radio,/e\.track==="bass"&&e\.sampleVoice\?e\.sampleVoice:piece\.voices\[e\.track\]/);
 assert.match(radio,/voices\.bass=choice\(\["dnbReese"/);
});
