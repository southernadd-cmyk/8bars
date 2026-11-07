import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {planWholeRadioSong,sliceWholeRadioSong} from "../radio-whole-song.js";
import {RADIO_CHANNELS,applyChannelGroove,applyWholeSongGroove} from "../radio-channels.js";
import {planInstrumentPalette} from "../instrument-palettes.js";
import {VOICES,nearestSample} from "../sounds.js";
import {radioSignature,radioNoveltyScore} from "../radio-planner.js";
import {GOLDEN_LARGE,GOLDEN_SMALL} from "../phi-dynamics.js";

const options={
 pop:{scene:"bright",engine:"melodic",bpm:116,style:"house"},
 hiphop:{scene:"boom-bap",engine:"pattern",bpm:92,style:"breakbeat"},
 dnb:{scene:"roller",engine:"pattern",bpm:174,style:"breakbeat"},
 mixed:{scene:"motion",engine:"process",bpm:116,style:"house"}
};
const tracks=new Set(["kick","snare","clap","hat","openhat","perc","bass","chords","arp","lead","counter","pad"]);
const drums=new Set(["kick","snare","clap","hat","openhat","perc"]);
const channels=Object.keys(options);
const plan=(channel,seed="whole-song",targetLoops=6)=>planWholeRadioSong({
 seed,key:"C",mode:"minor",density:.64,targetLoops,channel,...options[channel]
});
test("Every Human Radio channel plans a complete, continuous score before playback",()=>{
 for(const channel of channels)for(const loops of [5,6,7]){
  const song=plan(channel,channel+"|"+loops,loops);
  assert.equal(song.totalBars,8*loops);
  assert.equal(song.totalSteps,128*loops);
  assert.equal(song.harmony.length,8*loops);
  assert.equal(song.sections.length,loops);
  assert.equal(song.sections[0].startBar,0);
  assert.equal(song.sections.at(-1).endBar,song.totalBars);
  assert.ok(Math.abs(song.turnStep-song.totalSteps*GOLDEN_SMALL)<=.51);
  assert.ok(Math.abs(song.climaxStep-song.totalSteps*GOLDEN_LARGE)<=.51);
  assert.ok(song.events.length>90,channel+" score must be substantial");
  assert.equal(song.events.filter(e=>e.tag==="golden climax").length,1,
   "There must be one global climax, not one for each eight bars");
  assert.ok(song.events.some(e=>e.tag==="golden climax"&&e.step===song.climaxStep));
  assert.deepEqual(song.harmony.slice(-2).map(h=>h.degree),[4,0],"V-I final cadence");
  assert.ok(song.events.some(e=>e.tag==="final tonic"&&e.step===song.totalSteps-16));
  for(const e of song.events){
   assert.ok(tracks.has(e.track),e.track);
   assert.ok(Number.isInteger(e.step)&&e.step>=0&&e.step<song.totalSteps,channel+" step");
   assert.ok(Number.isFinite(e.duration)&&e.duration>0&&e.duration<=48);
   assert.ok(Number.isFinite(e.velocity)&&e.velocity>=.06&&e.velocity<=1);
   if(drums.has(e.track))assert.equal(e.note,undefined);
   else assert.ok(Number.isInteger(e.note)&&e.note>=28&&e.note<=108,e.note);
  }
  const sections=sliceWholeRadioSong(song);
  assert.equal(sections.length,loops);
  assert.ok(sections.every(s=>s.eventsByStep.length===128));
  assert.ok(sections.every(s=>s.progression.length===8));
  assert.ok(sections.every(s=>s.events.every(e=>e.step>=0&&e.step<128)));
  const flattened=sections.flatMap((s,i)=>s.events.map(e=>({...e,step:e.step+i*128})));
  assert.deepEqual(flattened,song.events,
   "Eight-bar transport must not create, change or discard a note: "+channel);
  assert.deepEqual(song,plan(channel,channel+"|"+loops,loops),"seeded whole score must reproduce");
 }
});

test("Each style has distinctive full-length drum behaviour",()=>{
 const songs=Object.fromEntries(channels.map(ch=>[ch,plan(ch)]));
 const signature=ch=>songs[ch].events.filter(e=>drums.has(e.track)&&e.step<128)
   .map(e=>e.track+":"+e.step).join("|");
 assert.equal(new Set(["pop","hiphop","dnb"].map(signature)).size,3);
 for(const ch of ["pop","hiphop","dnb"]){
  const snare=songs[ch].events.filter(e=>e.track==="snare");
  assert.ok(snare.length>=songs[ch].totalBars,ch+" needs continuing backbeats");
  assert.ok(snare.some(e=>e.step>=256),"Drum clock cannot reset at eight bars");
 }
 const dnb=songs.dnb.events.filter(e=>e.track==="bass");
 assert.ok(dnb.some(e=>e.sampleVoice==="dnbSub"),"DnB retains dedicated sampled sub");
 const hiphop=planWholeRadioSong({seed:"trap",channel:"hiphop",scene:"trap",engine:"pattern",
  key:"C",mode:"minor",style:"breakbeat",targetLoops:6});
 const trapSnare=hiphop.events.filter(e=>e.track==="snare");
 assert.ok(trapSnare.some(e=>e.step%16===8),"Trap retains its half-time snare");
 const ambient=planWholeRadioSong({seed:"a",channel:"mixed",scene:"drift",engine:"ambient",
  style:"ambient",key:"D",mode:"major",targetLoops:5});
 assert.equal(ambient.events.filter(e=>drums.has(e.track)).length,0,
  "Ambient does not inherit an inappropriate beat");
});

test("Long-range musical themes and form are predetermined, not random per chunk",()=>{
 for(const ch of channels){
  const a=plan(ch,"theme-one"),b=plan(ch,"theme-two");
  assert.notDeepEqual(a.themes.motif.contour,b.themes.motif.contour,ch+" must explore themes");
  assert.notDeepEqual(a.events,b.events,ch+" must generate different songs");
  assert.ok(a.sections.some(s=>s.name==="Outro"||s.name==="Coda"),ch+" has an ending");
  assert.equal(a.phrases[0].startBar,0);
  assert.equal(a.phrases.at(-1).endBar,a.totalBars);
  for(let i=1;i<a.phrases.length;i++)assert.equal(a.phrases[i-1].endBar,a.phrases[i].startBar);
  assert.ok(a.phrases.some(p=>p.startBar%8+p.lengthBars>8),
    ch+" must have at least one phrase spanning a transport boundary");
  assert.ok(a.phrases.some(p=>p.startBar===a.climaxBar&&p.transform==="arrival"));
  assert.equal(a.phrases.at(-1).motif,"A");
  const full=a.events.filter(e=>e.track==="lead");
  assert.ok(full.some(e=>e.step<128)&&full.some(e=>e.step>=256));
  const scored=radioSignature({songScore:a,channel:ch,events:[]});
  assert.equal(scored.harmonicPath.length,a.totalBars);
  assert.ok(scored.phiMotif&&scored.phiForm);
  assert.ok(Number.isFinite(radioNoveltyScore({songScore:b},[{songScore:a}])));
 }
});
test("All planned pitched parts can use actual recorded instruments",()=>{
 for(const ch of channels){
  const score=plan(ch),voices=ch==="mixed"?
   planInstrumentPalette("electronic","ambient","mixed-palette"):
   planInstrumentPalette(ch,options[ch].scene,"whole-song-palette");
  for(const e of score.events.filter(e=>!drums.has(e.track)).slice(0,90)){
   const voice=e.sampleVoice||voices[e.track];
   assert.ok(VOICES[voice]?.length,ch+" "+voice);
   const sample=nearestSample(voice,e.note,e.velocity);
   assert.ok(sample.url.startsWith("https://"),ch+" instrument source");
   assert.ok(sample.license,ch+" instrument must be licensed");
  }
 }
});
test("Whole-song genre groove is deterministic while original eight-bar API stays compatible",()=>{
 const sections=[
  {role:"opening",startBar:0,endBar:8},
  {role:"statement",startBar:8,endBar:16},
  {role:"lift",startBar:16,endBar:24},
  {role:"return",startBar:24,endBar:32}
 ];
 for(const channel of ["hiphop","pop","dnb"]){
  const a=applyWholeSongGroove([],channel,"live-engine",sections,options[channel].scene,32);
  assert.deepEqual(a,applyWholeSongGroove([],channel,"live-engine",sections,options[channel].scene,32));
  assert.ok(a.some(e=>e.step>=256));
  assert.ok(a.filter(e=>e.track==="snare").length>=64);
  assert.ok(applyChannelGroove([],channel,"legacy-seed").length>0);
 }
});

test("Every selectable channel uses whole-song scoring without altering the master chain",()=>{
 const src=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
 assert.match(src,/const songScore=planWholeRadioSong\(\{\.\.\.profile,seed\}\)/);
 assert.match(src,/const sections=sliceWholeRadioSong\(candidate\.songScore\)/);
 assert.match(src,/if\(candidate\.songScore\)/);
 assert.match(src,/scheduled\.songScore\|\|sectionAllowsNote/);
 assert.match(src,/piece\.channel==="classical"\|\|piece\.songScore\|\|/);
 const workflow=readFileSync(new URL("../.github/workflows/pages.yml",import.meta.url),"utf8");
 assert.match(workflow,/test -s dist\/radio-whole-song\.js/);
 assert.match(workflow,/test -s dist\/phi-song-planner\.js/);
 assert.match(src,/master\.gain\.value=\.83/);
 assert.match(src,/const safety=ctx\.createDynamicsCompressor/);
});
