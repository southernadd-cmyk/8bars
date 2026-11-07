import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {formatRadioTime,audibleSongStep,radioNowPlaying,stableSongStep} from "../radio-now-playing.js";

const makeSong=(channel="pop",loops=6)=>({
 title:"Testing Title",channel,bpm:96,style:"downtempo",scene:"indie",
 sceneName:"Indie",key:"F#",mode:"minor",
 sections:Array.from({length:loops},(_,i)=>({name:["Intro","Verse","Chorus","Bridge","Reprise","Outro"][i]||"Outro"}))
});
test("time formatting handles complete songs and invalid inputs",()=>{
 assert.equal(formatRadioTime(0),"0:00");
 assert.equal(formatRadioTime(8.9),"0:08");
 assert.equal(formatRadioTime(63),"1:03");
 assert.equal(formatRadioTime(600.4),"10:00");
 assert.equal(formatRadioTime(-20),"0:00");
});
test("progress uses all eight-bar transport sections, not an eight-bar loop",()=>{
 for(const loops of [5,6,7]){
  const piece=makeSong("pop",loops);
  const start=radioNowPlaying(piece,0);
  assert.equal(start.sectionCount,loops);
  assert.equal(start.totalBars,loops*8);
  assert.equal(start.bar,1);
  assert.equal(start.progress,0);
  assert.equal(start.total,formatRadioTime(loops*8*4*60/96));
  const halfway=radioNowPlaying(piece,loops*128/2);
  assert.equal(halfway.progress,50);
  assert.ok(halfway.bar>8,"Position must not reset at each eight-bar chunk");
  assert.ok(halfway.sectionIndex>=2);
  const end=radioNowPlaying(piece,loops*128);
  assert.equal(end.progress,100);
  assert.equal(end.bar,loops*8);
  assert.equal(end.sectionIndex,loops-1);
 }
});
test("position tracks the audible clock, compensating for look-ahead scheduling",()=>{
 const bpm=120,secsPerStep=60/bpm/4;
 const sample=audibleSongStep({
  loops:2,step:40,stepTime:55+secsPerStep*2,audioTime:55,
  bpm,totalSteps:6*128
 });
 assert.ok(Math.abs(sample-(2*128+38))<1e-9);
 assert.equal(audibleSongStep({loops:0,step:0,stepTime:1,audioTime:0,bpm,totalSteps:768}),0);
 assert.equal(audibleSongStep({loops:999,step:0,stepTime:1,audioTime:1,bpm,totalSteps:768}),768);
 assert.equal(audibleSongStep({loops:4,step:1,stepTime:1,audioTime:1,bpm:0,totalSteps:768}),0);
});
test("preloading repeats hold progress instead of moving the UI backwards",()=>{
 assert.equal(stableSongStep(270,250,768),270);
 assert.equal(stableSongStep(270,290,768),290);
 assert.equal(stableSongStep(760,9999,768),768);
 assert.equal(stableSongStep(270,0,0),0);
 // The UI resets its hold only when the current song object changes.
 const script=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
 assert.match(script,/if\(current!==displayedProgressPiece\)/);
 assert.match(script,/stableSongStep\(displayedProgressStep,audible,totalSteps\)/);
});
test("piece metadata matches actual section, genre, BPM and key",()=>{
 const playing=radioNowPlaying(makeSong("hiphop"),3*128+32);
 assert.equal(playing.channel,"hiphop");
 assert.equal(playing.bpm,96);
 assert.equal(playing.style,"downtempo");
 assert.equal(playing.scene,"Indie");
 assert.equal(playing.key,"F#");
 assert.equal(playing.mode,"minor");
 assert.equal(playing.sectionName,"Bridge");
 assert.equal(playing.sectionIndex,3);
 assert.equal(playing.bar,27);
 assert.equal(radioNowPlaying(null),null);
});
test("Human Radio has accessible, responsive non-seekable progress and does not alter mastering",()=>{
 const html=readFileSync(new URL("../humanradio.html",import.meta.url),"utf8");
 const script=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
 for(const id of ["track","trackChannel","trackStyle","trackBpm","trackKey",
  "sectionTag","sectionName","barPosition","songProgress","elapsed","duration"]){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/<progress id="songProgress" max="100" value="0"/);
 assert.match(html,/aria-label="Progress through the complete piece"/);
 assert.match(html,/@media\(max-width:780px\)/);
 assert.match(html,/phi-marker/);
 assert.match(script,/function syncNowPlaying\(force=false\)/);
 assert.match(script,/audibleSongStep\(/);
 assert.match(script,/radioNowPlaying\(current,displayedProgressStep\)/);
 assert.match(script,/syncNowPlaying\(true\)/);
 assert.match(script,/master\.gain\.value=\.83/);
 assert.match(script,/const safety=ctx\.createDynamicsCompressor/);
});
