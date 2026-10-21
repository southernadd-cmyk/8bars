import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DNB_BREAK_KIT,dnbDrumSample} from "../dnb-break-kit.js";
import {ELECTRONIC_BASS_VOICES} from "../electronic-bass.js";
import {createRadioVisual} from "../radio-visual.js";
import {planGenreHarmony,arrangeGenreMusic} from "../genre-arrangement.js";
import {composeWithEngine} from "../music-engines.js";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const page=read("humanradio.html"),radio=read("humanradio.js");
const workflow=read(".github/workflows/pages.yml"),mirror=read("scripts/mirror-samples.mjs");

test("Acoustic break uses identifiable real-recorded CC0 drumkit strikes",()=>{
 assert.deepEqual(Object.keys(DNB_BREAK_KIT),["kick","snare","ghost","hat","openhat"]);
 for(const [group,samples] of Object.entries(DNB_BREAK_KIT)){
   assert.equal(samples.length,2,group);
   assert.notEqual(samples[0].url,samples[1].url);
   for(const sample of samples){
     assert.equal(sample.license,"CC0 1.0");
     assert.match(sample.source,/Virtuosity Drums/);
     assert.match(sample.url,/adewale\/keyboardia\/869d3f5095084003e1251aa3ebf2eab8f65f62fe/);
     assert.match(sample.url,/\/source-\d+\.m4a$/);
   }
 }
 for(const step of [4,12,28,36]){
   const loud=dnbDrumSample("snare",.9,step,"song");
   const ghost=dnbDrumSample("snare",.2,step,"song");
   assert.ok(DNB_BREAK_KIT.snare.includes(loud));
   assert.ok(DNB_BREAK_KIT.ghost.includes(ghost));
   assert.notEqual(loud.url,ghost.url);
 }
 assert.ok(DNB_BREAK_KIT.kick.includes(dnbDrumSample("kick",.9,0)));
 assert.ok(DNB_BREAK_KIT.hat.includes(dnbDrumSample("hat",.24,2)));
 assert.equal(dnbDrumSample("clap",.6,12),null);
 assert.match(mirror,/DNB_BREAK_KIT/);
 assert.match(mirror,/Object\.values\(DNB_BREAK_KIT\)/);
 assert.match(workflow,/dnb-break-kit\.js/);
});

test("808 stays available but cannot be main DnB bass; octave-aligned sub floor",()=>{
 assert.equal(ELECTRONIC_BASS_VOICES.dnb808[0].root,24);
 assert.match(radio,/voices\.bass=choice\(\["dnbReese","dnbReese","dnbWobble","dnbFm"\]\)/);
 const settings={seed:"range-probe",engine:"pattern",key:"A",mode:"minor",
   bpm:174,style:"breakbeat",density:.64,swing:0,channel:"dnb",scene:"roller"};
 const harmonyOverrides=planGenreHarmony(settings);
 const piece=composeWithEngine({...settings,harmonyOverrides});
 for(const role of ["opening","statement","lift","breakdown","reprise"]){
   const events=arrangeGenreMusic({...piece,scene:"roller"},"dnb",settings.seed,role);
   const sub=events.filter(e=>e.sampleVoice==="dnbSub");
   const main=events.filter(e=>e.track==="bass"&&!e.sampleVoice);
   assert.ok(sub.length>=8);
   for(const e of sub){
     assert.ok(e.note>=28,"Sub dropped under MIDI 28: "+e.note);
     assert.ok(e.velocity<=.23);
     assert.ok(main.some(m=>m.step===e.step&&
       (m.note===e.note||m.note===e.note+12)), "Sub must reinforce the same pitch class");
   }
 }
});

test("Liquid DnB honours the strings-inclusive channel palette",()=>{
 assert.match(radio,/paletteFor\(profile\.engine,"lead",/);
 assert.match(radio,/\["violin","cello","concertPiano","electricGuitar"\]/);
 assert.match(radio,/profile\.scene==="liquid"/);
 assert.match(radio,/dnbDrumSample\(e\.track,e\.velocity,e\.step,piece\.seed\)/);
});

test("Adult Swim footage and third-party GIF fallback are not bundled or hotlinked",()=>{
 assert.match(page,/<canvas id="radio-art" aria-hidden="true"><\/canvas>/);
 assert.doesNotMatch(page,/kym-cdn|\.gif|<img/i);
 assert.doesNotMatch(workflow,/kym-cdn|curl --fail.*gif/i);
 assert.match(workflow,/test ! -e dist\/humanradio\.gif/);
 assert.match(radio,/createRadioVisual/);
 assert.doesNotMatch(radio,/visualPresets|hue-rotate/);
 assert.match(radio,/visual\.attach\(analyser\)/);
 assert.match(radio,/visual\.start\(\)/);
 assert.match(radio,/visual\.stop\(\)/);
});

test("Visual draws the spectrum and beats with no audio synthesis",()=>{
 const source=read("radio-visual.js");
 assert.match(source,/getByteFrequencyData/);
 assert.match(source,/onNote\(note\)/);
 assert.match(source,/prefers-reduced-motion/);
 assert.doesNotMatch(source,/createOscillator|fetch\(|\.gif/);
 // Exercise fallback without a canvas rendering context; controls remain safe.
 const art=createRadioVisual({getContext:()=>null});
 for(const method of ["start","stop","onNote","changePhase","setStation","attach"])
   assert.equal(typeof art[method],"function");
 art.start();art.stop();art.onNote({track:"kick",velocity:.8});
});
