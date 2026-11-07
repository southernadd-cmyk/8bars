// Composer V2: musical intent FIRST, then multiple scored phrase candidates.
// Pure symbolic music: recorded sample instruments and the radio audio chain are
// deliberately out of scope. All random choices are seed-stable.
import {chooseMelodyNote} from "./musical-grammar.js";
import {GOLDEN_LARGE,GOLDEN_SMALL} from "./phi-dynamics.js";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pc=n=>(n%12+12)%12;
function seeded(seed){
 let x=2166136261;
 for(const c of String(seed))x=Math.imul(x^c.charCodeAt(0),16777619)>>>0;
 return ()=>{x=(x+0x6d2b79f5)>>>0;let z=x;
  z=Math.imul(z^(z>>>15),z|1);z^=z+Math.imul(z^(z>>>7),z|61);
  return ((z^(z>>>14))>>>0)/4294967296;
 };
}
const pick=(r,items)=>items[Math.min(items.length-1,Math.floor(r()*items.length))];
export const COMPOSER_STRATEGIES=Object.freeze(["hook-led","bass-led","harmony-led","dialogue-led","process-led"]);
const WEIGHTS={
 pop:["hook-led","hook-led","dialogue-led","harmony-led","bass-led","process-led"],
 hiphop:["bass-led","bass-led","hook-led","dialogue-led","harmony-led","process-led"],
 dnb:["bass-led","bass-led","process-led","hook-led","dialogue-led","harmony-led"],
 mixed:["hook-led","bass-led","harmony-led","dialogue-led","process-led","process-led"],
 classical:["harmony-led","harmony-led","dialogue-led","process-led","hook-led","bass-led"]
};
const FRAMES={
 pop:{
  5:[["opening","statement","lift","answer","return"],["opening","answer","statement","lift","return"],
     ["opening","lift","answer","reprise","return"],["opening","statement","answer","lift","return"]],
  6:[["opening","statement","lift","answer","reprise","return"],
     ["opening","answer","statement","lift","reprise","return"],
     ["opening","statement","answer","lift","breakdown","return"],
     ["opening","lift","statement","answer","reprise","return"]],
  7:[["opening","statement","lift","answer","breakdown","reprise","return"],
     ["opening","answer","statement","lift","breakdown","reprise","return"],
     ["opening","statement","answer","lift","statement","reprise","return"],
     ["opening","lift","statement","answer","breakdown","reprise","return"]]},
 hiphop:{
  5:[["opening","statement","lift","answer","return"],
     ["opening","statement","answer","lift","return"],["opening","lift","statement","answer","return"],
     ["opening","statement","breakdown","lift","return"]],
  6:[["opening","statement","lift","answer","reprise","return"],
     ["opening","answer","statement","lift","reprise","return"],
     ["opening","statement","answer","breakdown","lift","return"],
     ["opening","statement","lift","breakdown","reprise","return"]],
  7:[["opening","statement","lift","answer","breakdown","reprise","return"],
     ["opening","statement","answer","lift","breakdown","reprise","return"],
     ["opening","answer","statement","breakdown","lift","reprise","return"],
     ["opening","statement","lift","answer","statement","reprise","return"]]},
 dnb:{
  5:[["opening","statement","lift","breakdown","return"],
     ["opening","answer","lift","reprise","return"],["opening","lift","statement","breakdown","return"],
     ["opening","statement","breakdown","lift","return"]],
  6:[["opening","statement","lift","breakdown","reprise","return"],
     ["opening","statement","answer","lift","breakdown","return"],
     ["opening","lift","statement","breakdown","reprise","return"],
     ["opening","statement","lift","answer","reprise","return"]],
  7:[["opening","statement","answer","lift","breakdown","reprise","return"],
     ["opening","lift","statement","answer","breakdown","reprise","return"],
     ["opening","statement","lift","answer","statement","reprise","return"],
     ["opening","statement","answer","breakdown","lift","reprise","return"]]},
 mixed:{
  5:[["opening","statement","answer","lift","return"],
     ["opening","answer","statement","lift","return"],["opening","statement","lift","breakdown","return"],
     ["opening","lift","statement","answer","return"]],
  6:[["opening","statement","answer","lift","reprise","return"],
     ["opening","statement","lift","answer","reprise","return"],
     ["opening","answer","statement","breakdown","lift","return"],
     ["opening","statement","lift","breakdown","reprise","return"]],
  7:[["opening","statement","answer","lift","breakdown","reprise","return"],
     ["opening","answer","statement","lift","breakdown","reprise","return"],
     ["opening","statement","lift","answer","statement","reprise","return"],
     ["opening","statement","answer","breakdown","lift","reprise","return"]]}
};
const PATTERN_TRANSFORMS=["statement","echo","sequence","inversion","fragment","answer","sustain","return"];
export function planComposerV2({seed,channel,scene="",engine="",loops=6}={}){
 if(!WEIGHTS[channel])throw new RangeError("Unknown Composer V2 channel");
 if(!Number.isInteger(loops)||loops<5||loops>7)throw new RangeError("5–7 sections required");
 const r=seeded(String(seed)+"|"+channel+"|"+scene+"|"+engine+"|composer-v2");
 const strategy=pick(r,WEIGHTS[channel]);
 // Role permutations are an intentional part of the piece's identity.
 // Eight bars remains a buffer size, not a universal verse/chorus formula.
 const frame=FRAMES[channel]?.[loops];
 let formRoles=frame?pick(r,frame).slice():null;
 const timbreFocus=strategy==="bass-led"?"bass":
   strategy==="harmony-led"?"chords":
   strategy==="dialogue-led"?"counter":
   strategy==="process-led"?"arp":"lead";
 return {version:2,strategy,timbreFocus,formRoles,
  motifTurn:pick(r,[-2,-1,1,2]),
  register:pick(r,[-3,0,2,5]),
  rhythmicPush:pick(r,[-2,-1,0,1,2]),
  bassRhythm:pick(r,[[0,4,7,12],[0,6,10,14],[0,3,8,11],[0,7,10,13]]),
  bassFigure:pick(r,[[0,7,0,12],[0,0,7,0],[0,-5,0,7],[0,12,7,0]]),
  harmonicMotion:pick(r,[2,2,3,4]),
  densityShape:pick(r,["arc","rising","contrast","breathing"]),
  phraseVariation:pick(r,[.17,.23,.31,.39]),
  // deterministic seeds prevent one instrument's random draws changing others
  melodySeed:String(seed)+"|"+channel+"|"+strategy+"|melody"
 };
}
// Candidate harmonic plans use tonal functions (tonic, predominant, dominant),
// but do NOT repeat the same four-chord loop through every piece.
const TRANSITIONS={
 0:[0,0,5,3,1,2,4], 1:[4,4,6,3,5],
 2:[5,3,4,1], 3:[4,1,0,0,5],
 4:[0,0,5,5], 5:[1,3,4,0,2], 6:[0,4]
};
export function planV2Degrees({seed,channel,scene,strategy,totalBars,turnBar,climaxBar,sections}){
 const r=seeded(String(seed)+"|"+channel+"|"+scene+"|"+strategy+"|harmony");
 const degrees=[],hold=channel==="hiphop"?2:channel==="dnb"?2:1;
 for(let bar=0;bar<totalBars;bar++){
  const section=sections[Math.floor(bar/8)];
  const role=section.role;
  let degree=0;
  const deliberate=bar===0?0:bar===turnBar||bar===climaxBar||bar===totalBars-1?0:
    bar===turnBar-1||bar===climaxBar-1||bar===totalBars-2?4:null;
  if(deliberate!==null)degree=deliberate;
  else if(role==="return"&&bar>=totalBars-4)
   degree=[3,1,4,0][bar-(totalBars-4)];
  else if(bar>0&&bar%hold!==0&&r()<.78)degree=degrees[bar-1];
  else{
   const prior=degrees[bar-1]??0;
   const pool=TRANSITIONS[prior].slice();
   // Form and strategy influence which kind of musical journey is plausible.
   const away=role==="answer"||role==="breakdown"||
     (bar>=turnBar&&bar<climaxBar);
   if(away)pool.push(1,3,5,2);
   if(strategy==="harmony-led")pool.push(1,3,5,4);
   if(strategy==="bass-led")pool.push(prior,prior);
   if(role==="reprise"||role==="lift")pool.push(0,4,5);
   if(strategy==="process-led"&&bar%3===1)pool.push(prior,prior);
   degree=pick(r,pool);
  }
  degrees.push(degree);
 }
 return degrees;
}
function phraseVariant(plan,phrase){
 const r=seeded(plan.melodySeed+"|phrase|"+phrase.id);
 const strategy=plan.strategy;
 let transform=phrase.transform==="arrival"?"arrival":
   phrase.transform==="coda"?"cadence":
   phrase.motif==="A"&&r()<.33?"statement":
   pick(r,PATTERN_TRANSFORMS);
 if(strategy==="hook-led"&&phrase.motif==="A"&&r()<.67)transform="echo";
 if(strategy==="dialogue-led"&&phrase.motif==="B")transform="answer";
 if(strategy==="process-led"&&r()<.65)transform="sequence";
 return {transform,delay:pick(r,[0,0,1,2]),
   shift:pick(r,[-2,-1,0,0,1,2]),
   thin:strategy==="bass-led"||strategy==="process-led"||r()<.22,
   echoStrength:strategy==="hook-led"?.76:strategy==="dialogue-led"?.52:.36};
}
function motionOf(blueprint,index,variant,phrase,bar){
 const contour=blueprint.contour,base=contour[index%contour.length]||0;
 const anchor=contour[0]||0;
 const {transform}=variant;
 if(transform==="inversion"||transform==="answer")
  return clamp(anchor-(base-anchor)+variant.shift,-5,5);
 if(transform==="sequence")
  return clamp(base+Math.floor((bar-phrase.startBar)/2)+variant.shift,-5,5);
 if(transform==="fragment")
  return clamp(contour[index%Math.max(2,Math.ceil(contour.length/2))]+variant.shift,-5,5);
 if(transform==="arrival")return clamp(base+2,-5,5);
 if(transform==="cadence")return clamp(base-2,-5,5);
 return clamp(base+variant.shift,-5,5);
}
function buildProposedPhrase(plan,phrase,variant,candidate,previous){
 const {config,harmony,ensemble,themes,composerV2}=plan;
 const {channel,scene,engine,key,mode,density}=config;
 const r=seeded(composerV2.melodySeed+"|"+phrase.id+"|candidate|"+candidate);
 const blueprint=phrase.motif==="B"?themes.answer:themes.motif;
 const events=[],stepPerBar=16;
 let prior=previous??null;
 const allow=bar=>{
  const part=ensemble.bars[bar];
  if(!part?.parts?.lead)return false;
  const role=part.role;
  if(channel==="dnb"&&scene!=="liquid")
   return role==="lift"||role==="reprise"||bar===plan.climaxBar||
    role==="opening"&&bar===4||role==="statement"&&bar%4===2;
  if(channel==="mixed"&&engine==="ambient")return bar%2===0;
  if(role==="opening"&&bar<2)return false;
  if(channel==="hiphop"&&role==="opening"&&bar<3)return false;
  return true;
 };
 for(let bar=phrase.startBar;bar<phrase.endBar;bar++){
  if(!allow(bar))continue;
  const chord=harmony[bar],lastBar=bar===phrase.endBar-1;
  const at=bar*stepPerBar;
  const isFinal=bar===plan.totalBars-1;
  const active=r()<.88||bar===phrase.startBar||lastBar;
  if(!active)continue;
  const base=blueprint.rhythm.slice();
  const expected=channel==="dnb"?scene==="liquid"?3:2:
    channel==="hiphop"?3:engine==="ambient"?2:
    composerV2.strategy==="bass-led"?2:composerV2.strategy==="hook-led"?4:3;
  const maximum=clamp(expected+(density>.72?1:0)+
    (variant.thin?-1:0),1,6);
  let onsets=base.slice(0,maximum);
  if(variant.transform==="sustain")onsets=onsets.slice(0,2);
  if(variant.transform==="fragment")onsets=onsets.slice(0,Math.max(2,onsets.length-1));
  if(composerV2.strategy==="process-led"&&candidate%2===1)
   onsets=onsets.map(x=>x+Math.round((bar-phrase.startBar)*GOLDEN_SMALL)%3);
  if(candidate%3===2)onsets=onsets.map((x,i)=>x+(i===1?1:0));
  onsets=[...new Set(onsets.map(x=>clamp(x+(candidate%3===1?variant.delay:0),0,14)))].sort((a,b)=>a-b);
  if(!onsets.length)continue;
  const goalRegister=(channel==="dnb"?70:channel==="hiphop"?69:73)+composerV2.register+
     (composerV2.strategy==="harmony-led"?-2:0);
  for(let i=0;i<onsets.length;i++){
   const pos=onsets[i],motion=motionOf(blueprint,i,variant,phrase,bar);
   const towardClimax=Math.abs(bar-plan.climaxBar)/plan.totalBars;
   const lift=(1-towardClimax)*(composerV2.strategy==="process-led"?4:2);
   const target=goalRegister+motion*2.15+lift+
       (phrase.phase==="resolution"?-2:0)+
       (candidate%2?composerV2.motifTurn:0);
   const cadence=lastBar&&i===onsets.length-1;
   const note=chooseMelodyNote({key,mode},chord,target,prior,pos,r,
      channel==="dnb"?57:60,channel==="dnb"?86:90,{cadence});
   const toNext=onsets[i+1]??16;
   const duration=clamp((toNext-pos-.35)*(blueprint.articulation||.8),.65,12);
   const vel=clamp(channel==="dnb"?.36:channel==="pop"?.59:.48,.19,.83);
   // Single global climax and final cadence remain special composed events.
   if(bar===plan.climaxBar&&at+pos===plan.climaxStep)continue;
   if(isFinal&&pos===0)continue;
   events.push({track:"lead",step:at+pos,duration,velocity:vel,
    note,tag:phrase.motif,phraseId:phrase.id});
   prior=note;
  }
 }
 return events;
}
const mean=a=>a.reduce((s,x)=>s+x,0)/(a.length||1);
export function scoreMelodicPhrase(notes,{previous=null,phrase,harmony,strategy="hook-led"}={}){
 if(!notes.length)return 24; // a rest can be legitimate, not automatically bad
 const pitches=notes.map(e=>e.note);
 const gaps=pitches.map((p,i)=>i===0?previous===null?0:Math.abs(p-previous):Math.abs(p-pitches[i-1]));
 let cost=0;
 for(let i=0;i<gaps.length;i++){
  const gap=gaps[i];
  cost+=Math.max(0,gap-7)*2.8;
  if(gap===0&&i>0)cost+=.7;
  if(i>1&&pitches[i]===pitches[i-1]&&pitches[i]===pitches[i-2])cost+=4;
 }
 const strong=notes.filter(e=>e.step%16%4===0);
 for(const e of strong){
  const chord=harmony[Math.floor(e.step/16)];
  if(chord&&!chord.notes.some(n=>pc(n)===pc(e.note)))cost+=9;
 }
 const perBar=notes.length/Math.max(1,phrase.endBar-phrase.startBar);
 const goal=strategy==="bass-led"||strategy==="process-led"?1.7:
  strategy==="hook-led"?3.5:2.7;
 cost+=Math.abs(perBar-goal)*1.7;
 // A mid-phrase cadence that lands near a chord root can be satisfying,
 // but an obligatory tonic on every phrase would be too restrictive.
 const last=notes.at(-1),lastChord=harmony[Math.floor(last.step/16)];
 if(lastChord&&phrase.phase==="resolution"&&
    !lastChord.notes.some(n=>pc(n)===pc(last.note)))cost+=2.7;
 if(gaps.every(g=>g<2)&&gaps.length>3)cost+=3;
 if(mean(gaps)>6.5)cost+=3;
 return Math.round(cost*100)/100;
}
export function composeV2Lead(plan){
 const composer=plan.composerV2;
 if(!composer)throw new TypeError("No complete Composer V2 intent on song plan");
 const events=[],review=[];
 let previous=null,previousMotif=null;
 for(const phrase of plan.phrases){
  const variant=phraseVariant(composer,phrase);
  const candidates=Array.from({length:7},(_,i)=>{
   const notes=buildProposedPhrase(plan,phrase,variant,i,previous);
   const score=scoreMelodicPhrase(notes,{previous,phrase,
     harmony:plan.harmony,strategy:composer.strategy});
   // Lighter preferences: avoid excessive literal copying of a nearby phrase,
   // while retaining repeated hooks when repetition carries an identity.
   const motif=notes.map(e=>e.note).slice(0,5).join(",");
   const repeated=motif&&motif===previousMotif?composer.strategy==="hook-led"?-.4:2:0;
   return {notes,score:score+repeated,i,motif};
  });
  candidates.sort((a,b)=>a.score-b.score||a.i-b.i);
  const chosen=candidates[0];
  review.push({phraseId:phrase.id,transform:variant.transform,
    acceptedScore:chosen.score,firstDraftScore:candidates.find(c=>c.i===0).score,
    revisions:6,notes:chosen.notes.length});
  events.push(...chosen.notes);
  if(chosen.notes.length)previous=chosen.notes.at(-1).note;
  if(chosen.motif)previousMotif=chosen.motif;
 }
 return {events,review};
}
// Classical keeps the recursively golden phrase ONSETS, but the notes form
// candidates evaluated as whole musical phrases before they are committed.
// Unlike patching a finished score, this participates in the composition.
export function composePhiPhraseV2(plan,phrase,onsets,{degreeAt,chordAt}){
 const {seed,mode,key,composerV2,ensemble}=plan;
 if(!composerV2)throw new TypeError("No Classical V2 plan");
 const candidates=[];
 for(let version=0;version<6;version++){
  const r=seeded(seed+"|phi-phrase|"+phrase.id+"|"+version);
  const notes=[];
  let prior=null;
  for(let i=0;i<onsets.length;i++){
   if(phrase.phase==="exposition"&&i===1&&phrase.id===0)continue;
   const step=phrase.startStep+onsets[i];
   if(step>=plan.totalSteps||!ensemble.bars[Math.floor(step/16)]?.parts.lead)continue;
   const chord=chordAt(step);
   const originalDegree=degreeAt(phrase,i);
   const shift=composerV2.strategy==="process-led"?Math.floor(i*GOLDEN_SMALL):
     composerV2.strategy==="harmony-led"?0:version%3-1;
   const target=72+composerV2.register+(originalDegree+shift)*1.7+
     (version%2&&i%3===1?2:0);
   const cadence=i===onsets.length-1;
   const note=chooseMelodyNote({key,mode},chord,target,prior,step%16,r,56,91,{cadence});
   const end=i+1<onsets.length?onsets[i+1]:phrase.endStep-phrase.startStep;
   const duration=clamp((end-onsets[i])*(.68+version%3*.045),2,21);
   notes.push({track:"lead",step,duration,velocity:.35+.10*GOLDEN_LARGE,
     note,tag:phrase.motif,phraseId:phrase.id});
   prior=note;
  }
  const score=scoreMelodicPhrase(notes,{phrase,harmony:plan.harmony,
   strategy:composerV2.strategy});
  candidates.push({notes,score,version});
 }
 candidates.sort((a,b)=>a.score-b.score||a.version-b.version);
 const best=candidates[0];
 return {events:best.notes,review:{phraseId:phrase.id,acceptedScore:best.score,
  firstDraftScore:candidates.find(x=>x.version===0).score,revisions:5,notes:best.notes.length}};
}
