import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {compose} from "../composer.js";
import {RADIO_SCENES,chooseRadioProfile,radioNoveltyScore,radioSignature,arrangeRadioNote,recommendedCacheEvictions} from "../radio-planner.js";
const radio=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
const page=readFileSync(new URL("../humanradio.html",import.meta.url),"utf8");

test("Human Radio preserves its visual identity and actual recorded-sample playback",()=>{
 assert.match(page,/humanradio\.gif/);
 assert.match(page,/id="start"/);
 assert.match(page,/role="status"/);
 assert.match(radio,/LOCAL_SAMPLES\[s\.url\]/);
 assert.match(radio,/await prepare\(candidate\)/);
 assert.doesNotMatch(radio,/createOscillator\(/);
});
test("four distinct scenes include all four genuine composer styles",()=>{
 assert.equal(RADIO_SCENES.length,4);
 assert.deepEqual(new Set(RADIO_SCENES.flatMap(s=>s.styles)),
   new Set(["ambient","downtempo","house","breakbeat"]));
 const tempos=RADIO_SCENES.flatMap(s=>s.bpm);
 assert.ok(Math.min(...tempos)<80&&Math.max(...tempos)>=130);
});
test("scene selection is bounded, develops, and does not jump more than 12 BPM",()=>{
 let profile=chooseRadioProfile(null,()=>.32);
 assert.ok(RADIO_SCENES.some(s=>s.id===profile.scene));
 let observed=new Set([profile.scene]),styles=new Set([profile.style]);
 for(let i=0;i<120;i++){
   const prev=profile;
   profile=chooseRadioProfile(prev,()=>((i*17)%101)/101);
   assert.ok(Math.abs(profile.bpm-prev.bpm)<=12);
   assert.ok(profile.targetLoops>=5&&profile.targetLoops<=7);
   assert.ok(profile.density>=.15&&profile.density<=1);
   assert.ok(profile.swing>=0&&profile.swing<=.65);
   assert.ok(["major","minor"].includes(profile.mode));
   if(prev.sceneRemaining>1)assert.equal(profile.scene,prev.scene);
   else assert.notEqual(profile.scene,prev.scene);
   observed.add(profile.scene);styles.add(profile.style);
 }
 assert.ok(observed.size>=3);
 assert.ok(styles.size>=3);
});
test("recent composition memory favours contrasting actual music rather than repeat signatures",()=>{
 const base=compose({seed:"radio-a",style:"downtempo",key:"A",mode:"minor"});
 const next=compose({seed:"radio-b",style:"breakbeat",key:"D",mode:"major"});
 const first={...base,scene:"drift",voices:{lead:"piano"},drumSounds:{kick:1}};
 const candidate={...next,scene:"headnod",voices:{lead:"guitar"},drumSounds:{kick:2}};
 assert.ok(radioNoveltyScore(candidate,[first])>radioNoveltyScore(first,[first]));
 assert.equal(radioSignature(first).style,"downtempo");
});
test("arrangements evolve without changing the generated notes or fabricating samples",()=>{
 const bass={track:"bass",step:0},counter={track:"counter",step:16};
 const arp={track:"arp",step:3},kick={track:"kick",step:64};
 assert.ok(arrangeRadioNote(bass,0));
 assert.equal(arrangeRadioNote(counter,0),false);
 assert.equal(arrangeRadioNote(arp,0),false);
 assert.ok(arrangeRadioNote(counter,1));
 assert.equal(arrangeRadioNote(kick,2),false);
 assert.ok(arrangeRadioNote(kick,1));
});
test("sample cache evicts old decoded buffers but keeps current and preloaded songs",()=>{
 const cache=new Map([["old1",{length:700,numberOfChannels:2}],["keep",{length:800,numberOfChannels:2}],["old2",{length:900,numberOfChannels:2}]]);
 assert.deepEqual(recommendedCacheEvictions(cache,new Set(["keep"]),2),["old1"]);
 assert.deepEqual(recommendedCacheEvictions(cache,new Set(["keep"]),10,1000),["old1","old2"]);
});
test("radio does not restart the composition or discard the beat on Resume",()=>{
 assert.match(radio,/if\(paused&&current\?\.ready&&ctx\)/);
 assert.match(radio,/status\("Resumed · continuing the same piece and position"\)/);
 assert.match(radio,/recommendedCacheEvictions/);
 assert.match(radio,/section\.eventsByStep\[localStep\]/);
 assert.match(radio,/radioNoveltyScore\(b,\[current,\.\.\.recentPieces\]\)/);
 assert.match(radio,/Math\.min\(5,Math\.max\(2,240\/current\.bpm\)\)/);
});
test("same GIF changes subtly and honours reduced-motion settings",()=>{
 assert.match(page,/prefers-reduced-motion:reduce/);
 assert.match(radio,/const visualPresets=\[/);
 assert.match(radio,/hue-rotate\(/);
 assert.match(radio,/if\(loops%2===0\)changeVisual\(\)/);
});
