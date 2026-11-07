import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {GOLDEN_LARGE,GOLDEN_SMALL,phiDynamicGain} from "../phi-dynamics.js";
import {planPhiSong,slicePhiSong} from "../phi-song-planner.js";
import {radioSignature,radioNoveltyScore} from "../radio-planner.js";

test("all Classical phi songs are composed in full before any eight-bar slice",()=>{
 for(const loops of [5,6,7]){
  for(const seed of ["golden-work","counterpoint-7","change-the-seed"]){
   const plan=planPhiSong({seed,key:"D",mode:"minor",targetLoops:loops});
   assert.equal(plan.totalBars,loops*8);
   assert.equal(plan.totalSteps,plan.totalBars*16);
   assert.ok(Math.abs(plan.turnStep-plan.totalSteps*GOLDEN_SMALL)<.6);
   assert.ok(Math.abs(plan.climaxStep-plan.totalSteps*GOLDEN_LARGE)<.6);
   assert.ok(plan.events.length>150,"Complete score should contain substantial melodic and harmonic material");
   assert.equal(plan.harmony.length,plan.totalBars);
   assert.equal(plan.harmony[0].degree,0);
   assert.equal(plan.harmony[plan.turnBar-1].degree,4);
   assert.equal(plan.harmony[plan.turnBar].degree,0);
   assert.equal(plan.harmony[plan.climaxBar-1].degree,4);
   assert.equal(plan.harmony[plan.climaxBar].degree,0);
   assert.deepEqual(plan.harmony.slice(-3).map(h=>h.degree),[3,4,0],"the ending resolves IV-V-I");
   assert.equal(plan.phrases[0].startBar,0);
   assert.equal(plan.phrases.at(-1).endBar,plan.totalBars);
   assert.ok(plan.phrases.some(p=>p.startBar===plan.climaxBar&&p.motif==="A"));
   assert.equal(plan.phrases.at(-1).motif,"A");
   assert.ok(plan.phrases.some(p=>p.startBar%8+p.lengthBars>8),
    "Whole-work phrases must be allowed to cross transport boundaries");
   for(let i=1;i<plan.phrases.length;i++)
    assert.equal(plan.phrases[i].startBar,plan.phrases[i-1].endBar);
   for(const e of plan.events){
    assert.ok(Number.isInteger(e.step)&&e.step>=0&&e.step<plan.totalSteps);
    assert.ok(Number.isInteger(e.note)&&e.note>=28&&e.note<=108);
    assert.ok(Number.isFinite(e.duration)&&e.duration>0);
    assert.ok(e.velocity>=.06&&e.velocity<=1);
   }
   const pieces=slicePhiSong(plan);
   assert.equal(pieces.length,loops);
   assert.ok(pieces.every(part=>part.progression.length===8&&part.eventsByStep.length===128));
   assert.ok(pieces.every(part=>part.events.every(e=>Number.isInteger(e.step)&&e.step>=0&&e.step<128)));
   const recovered=pieces.flatMap((part,i)=>part.events.map(e=>({...e,step:e.step+i*128})));
   assert.deepEqual(recovered,plan.events,"slicing must never invent, replace or discard a note");
   assert.ok(pieces.every((part,i)=>part.progression[0].degree===plan.harmony[i*8].degree));
   assert.deepEqual(plan,planPhiSong({seed,key:"D",mode:"minor",targetLoops:loops}));
  }
 }
});

test("different seeds and modes produce different complete thematic and harmonic scores",()=>{
 const a=planPhiSong({seed:"A",key:"C",mode:"major"});
 const b=planPhiSong({seed:"B",key:"C",mode:"major"});
 const c=planPhiSong({seed:"A",key:"C",mode:"minor"});
 assert.notDeepEqual(a.motif,b.motif);
 assert.notDeepEqual(a.events,b.events);
 assert.notDeepEqual(a.harmony,c.harmony);
 assert.ok(a.events.some(e=>e.tag==="climax"&&e.step===a.climaxStep));
 assert.ok(a.events.some(e=>e.tag==="resolution"&&e.step===a.totalSteps-16));
 assert.ok(a.events.filter(e=>e.track==="lead").length>55);
 assert.ok(a.events.filter(e=>e.track==="counter").length>5);
});

test("Classical phi score comparisons see whole-song form, not only its first 8 bars",()=>{
 const a=planPhiSong({seed:"song-a"});
 const b=planPhiSong({seed:"song-b"});
 const sA=radioSignature({phiScore:a,events:[]});
 const sB=radioSignature({phiScore:b,events:[]});
 assert.equal(sA.harmonicPath.length,a.totalBars);
 assert.ok(sA.phiForm);
 assert.ok(sA.phiMotif);
 assert.notEqual(sA.lead,sB.lead);
 assert.ok(Number.isFinite(radioNoveltyScore({phiScore:b},[{phiScore:a}])));
});

test("Human Radio uses a planned whole score for Classical phi only; expression is global",()=>{
 const js=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
 assert.match(js,/if\(profile\.channel==="classical"\)/);
 assert.match(js,/const phiScore=planPhiSong\(/);
 assert.match(js,/const sections=slicePhiSong\(candidate\.phiScore\)/);
 assert.doesNotMatch(js,/phiClassicalEvents\(/);
 assert.match(js,/piece\.channel==="classical"&&piece\.phiScore\?/);
 assert.match(js,/phiDynamicGain\(128\*absoluteStep\/piece\.phiScore\.totalSteps\)/);
 assert.match(js,/scheduled\.channel==="classical"\|\|scheduled\.songScore\|\|sectionAllowsNote/);
 assert.match(js,/piece\.channel==="classical"\|\|piece\.songScore\|\|!section\|\|sectionAllowsNote/);
 assert.ok(Math.abs(phiDynamicGain(128*GOLDEN_LARGE)-1)<1e-12);
 // Explicit whole-song climax would have been missed by a local 8-bar curve.
 const plan=planPhiSong({targetLoops:6});
 assert.ok(Math.abs(phiDynamicGain(128*plan.climaxStep/plan.totalSteps)-1)<.001);
});
