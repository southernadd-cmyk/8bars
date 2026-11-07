// Human Radio Composer V3: phrase intention, motif memory and deliberate
// tension/release. This runs while writing the score, before the performance
// renderer. A fixed seed produces a fixed result; V1/V2 remain untouched.
import {planComposerV2,planV2Degrees,composeV2Lead,composePhiPhraseV2} from "./radio-composer-v2.js";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pc=n=>(n%12+12)%12;
const SCALES={major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10]};
const KEYS=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
function seeded(seed){
 let s=2166136261;
 for(const c of String(seed))s=Math.imul(s^c.charCodeAt(0),16777619)>>>0;
 return ()=>{
  s=(s+0x6d2b79f5)>>>0;
  let z=s;z=Math.imul(z^(z>>>15),z|1);z^=z+Math.imul(z^(z>>>7),z|61);
  return ((z^(z>>>14))>>>0)/4294967296;
 };
}
function pick(r,arr){return arr[Math.min(arr.length-1,Math.floor(r()*arr.length))]}
function roleAt(plan,bar){return plan.sections?.[Math.floor(bar/8)]?.role||"statement"}
function scaleSet(key,mode){
 const root=KEYS.indexOf(key);
 if(root<0||!SCALES[mode])throw new RangeError("Invalid key or mode");
 return new Set(SCALES[mode].map(n=>(n+root)%12));
}
function chordSet(chord){return new Set((chord?.notes||[]).map(pc))}
function nearestPitch(target,scale,chord,{strong=false,low=59,high=90}={}){
 let result=low,cost=Infinity;
 for(let note=low;note<=high;note++){
  if(!scale.has(pc(note)))continue;
  const isChord=chord.has(pc(note));
  const penalty=strong&&!isChord?4.5:0;
  const score=Math.abs(note-target)+penalty;
  if(score<cost){cost=score;result=note}
 }
 return result;
}
function derivedIntent(plan,phrase){
 const r=seeded(plan.composerV2.melodySeed+"|v3-intent|"+phrase.id);
 const role=roleAt(plan,phrase.startBar);
 const hasArrival=["lift","reprise"].includes(role)||phrase.transform==="arrival";
 const quiet=["opening","breakdown"].includes(role);
 return {role,
  crest:pick(r,[.38,.53,.68,.77]),
  reach:quiet?pick(r,[1,2,3]):hasArrival?pick(r,[4,5,7]):pick(r,[2,3,4,5]),
  breath:quiet?.70:hasArrival?.88:pick(r,[.65,.72,.80]),
  displacement:plan.channel==="hiphop"?pick(r,[-1,-1,0,1]):
    plan.channel==="pop"?pick(r,[-1,0,1]):
    plan.channel==="mixed"?pick(r,[-1,0,0,1]):0,
  tension:phrase.phase==="development"||hasArrival,
  returnTheme:phrase.motif==="A"&&
    (phrase.transform==="arrival"||phrase.transform==="coda"||hasArrival)
 };
}
export function planComposerV3(args={}){
 const base=planComposerV2(args);
 const r=seeded(String(args.seed)+"|"+args.channel+"|composer-v3");
 return {...base,version:3,development:{
  contour:pick(r,["rise-and-release","question-and-answer","slow-reveal","staggered"]),
  harmonicColour:pick(r,["predominant","relative","suspension"]),
  contrast:pick(r,["high","moderate","high"]),
  keepHook:args.channel==="pop"||args.channel==="hiphop"
 }};
}
// The main harmony still comes from V2's tonal graph. V3 occasionally
// prolongs an answer or diverts a mid-phrase resolution; it never overwrites
// the golden-cut arrival, turn, or last bars.
export function planV3Degrees(args){
 const degrees=planV2Degrees(args);
 const r=seeded(String(args.seed)+"|"+args.channel+"|v3-harmonic-intention");
 for(const phrase of args.phrases||[]){
  if(phrase.lengthBars<5||phrase.transform==="coda")continue;
  const middle=phrase.startBar+Math.floor(phrase.lengthBars*.56);
  if(middle<2||middle>=args.totalBars-3)continue;
  if([args.turnBar-1,args.turnBar,args.climaxBar-1,args.climaxBar].includes(middle))continue;
  const same=degrees[middle]===degrees[middle-1]&&degrees[middle]===degrees[middle-2];
  const answer=phrase.motif==="B"||phrase.phase==="development";
  if(same||answer&&r()<.56){
   // IV, vi or ii offer colour without random chromatic clashes.
   const options=phrase.phase==="development"?[1,3,5]:[3,5,1];
   degrees[middle]=options[Math.floor(r()*options.length)];
  }
 }
 return degrees;
}
function scoreCandidate(events,phrase,plan,intent,reference){
 if(events.length<2)return -100;
 const pitches=events.map(e=>e.note);
 const intervals=pitches.slice(1).map((p,i)=>p-pitches[i]);
 const range=Math.max(...pitches)-Math.min(...pitches);
 let score=0;
 // Reward a recognisable contour, but not restless leaps or a monotone.
 score+=Math.max(0,9-Math.abs(range-9))*.56;
 score-=intervals.filter(n=>Math.abs(n)>9).length*3;
 score-=intervals.filter(n=>n===0).length*.50;
 score+=intervals.slice(1).filter((n,i)=>
  Math.abs(intervals[i])>=5&&Math.sign(n)===-Math.sign(intervals[i])&&
  Math.abs(n)<=4).length*2.3;
 const strong=events.filter(e=>e.step%4===0);
 for(const e of strong){
  const chord=chordSet(plan.harmony[Math.floor(e.step/16)]);
  if(chord.has(pc(e.note)))score+=.35;
  else score-=2.6;
 }
 if(intent.returnTheme&&reference){
  const count=Math.min(reference.length,events.length,4);
  const a=events.slice(0,count).map(e=>e.note-events[0].note);
  for(let i=1;i<count;i++)score+=Math.max(0,2-Math.abs(a[i]-reference[i]))*.9;
 }
 // Favour intentional gaps and an answering contour, not maximal note count.
 const gaps=events.slice(1).map((e,i)=>e.step-events[i].step);
 score+=gaps.some(g=>g>=6)?1.0:0;
 score-=events.slice(1).filter((e,i)=>e.step-events[i].step<2).length*1.1;
 const last=events.at(-1),lastChord=chordSet(plan.harmony[Math.floor(last.step/16)]);
 score+=lastChord.has(pc(last.note))?1.5:-2;
 return score;
}
function developPhrase(draft,plan,phrase,intent,reference,variant,scale){
 if(!draft.length)return [];
 const r=seeded(plan.seed+"|v3-phrase|"+phrase.id+"|"+variant);
 const first=draft[0].note;
 const count=draft.length;
 const candidates=[];
 // A single deliberate dissonance only when it has time to resolve.
 const approach=intent.tension&&count>=4?count-2:-1;
 for(let i=0;i<count;i++){
  const original=draft[i];
  let step=original.step;
  const before=draft[i-1]?.step??phrase.startBar*16-1;
  const after=draft[i+1]?.step??phrase.endBar*16;
  if(i>0&&i<count-1&&intent.displacement!==0&&
    (i+variant)%3===1&&step%4===0){
   const candidate=step+intent.displacement;
   if(candidate>before+1&&candidate<after-1&&
      Math.floor(candidate/16)===Math.floor(step/16))step=candidate;
  }
  const position=i/Math.max(1,count-1);
  const crest=Math.max(0,1-Math.abs(position-intent.crest)/.52);
  const arc=Math.round(crest*intent.reach*(variant%3===0?1:.67));
  let target=original.note+arc;
  if(intent.returnTheme&&reference&&i>0&&i<Math.min(reference.length,4)){
   const memory=first+reference[i];
   target=memory+Math.round(arc*.35);
  }
  if(intent.role==="breakdown")target-=2;
  const chord=chordSet(plan.harmony[Math.floor(step/16)]);
  const strong=step%4===0||i===0||i===count-1;
  let note=nearestPitch(target,scale,chord,{strong,low:plan.channel==="dnb"?56:59});
  // Passing tension is diatonic, on a weak attack, and the next attack
  // resolves to a chord tone. No unprepared chromatic 'humanisation'.
  if(i===approach&&step%4!==0){
   const passing=[note-2,note+2,note-1,note+1]
     .filter(n=>scale.has(pc(n))&&!chord.has(pc(n))&&n>=59&&n<=89);
   if(passing.length)note=passing[variant%passing.length];
  }
  const dynamic=intent.role==="breakdown"?.78:
    ["lift","reprise"].includes(intent.role)?1.16:1;
  const swell=.72+.50*Math.sin(Math.PI*Math.pow(position,.82));
  const velocity=clamp(original.velocity*dynamic*swell*(i===0?1.07:1),.13,.94);
  candidates.push({...original,step,note,velocity:Math.round(velocity*1000)/1000,
   tag:original.tag,development:"v3"});
 }
 // Cadence must actually resolve; dissonances get their consequence.
 const last=candidates.at(-1);
 last.note=nearestPitch(last.note,scale,
  chordSet(plan.harmony[Math.floor(last.step/16)]),{strong:true,low:59});
 for(let i=0;i<candidates.length;i++){
  const current=candidates[i],next=candidates[i+1];
  const limit=next?next.step-current.step:phrase.endBar*16-current.step;
  current.duration=Math.round(clamp(
   Math.min(current.duration,limit*(next ? .91 : intent.breath)),.28,18)*100)/100;
 }
 return candidates;
}
export function composeV3Lead(plan){
 if(plan.composerV2?.version!==3)throw new TypeError("Composer V3 intent required");
 const baseline=composeV2Lead(plan);
 const byPhrase=new Map();
 for(const e of baseline.events){
  const id=e.phraseId??plan.phrases.find(p=>e.step>=p.startBar*16&&e.step<p.endBar*16)?.id;
  if(!byPhrase.has(id))byPhrase.set(id,[]);
  byPhrase.get(id).push(e);
 }
 const result=[],review=[],scale=scaleSet(plan.config.key,plan.config.mode);
 let reference=null;
 for(const phrase of plan.phrases){
  const draft=byPhrase.get(phrase.id)||[];
  if(!draft.length){review.push({phraseId:phrase.id,notes:0,v3:"rest"});continue}
  const intent=derivedIntent(plan,phrase);
  const variations=Array.from({length:5},(_,variant)=>{
   const notes=developPhrase(draft,plan,phrase,intent,reference,variant,scale);
   return {notes,variant,score:scoreCandidate(notes,phrase,plan,intent,reference)};
  });
  variations.sort((a,b)=>b.score-a.score||a.variant-b.variant);
  const chosen=variations[0];
  result.push(...chosen.notes);
  if(phrase.motif==="A"&&!reference&&chosen.notes.length>=4)
   reference=chosen.notes.slice(0,4).map(e=>e.note-chosen.notes[0].note);
  review.push({phraseId:phrase.id,notes:chosen.notes.length,
   v3:intent.returnTheme?"motif return":intent.tension?"tension and release":"development",
   candidate:chosen.variant,score:Math.round(chosen.score*100)/100,
   motifRecalled:Boolean(intent.returnTheme&&reference)});
 }
 return {events:result,review,baselineReview:baseline.review};
}
// Classical keeps exact golden onset positions and its original harmony.
// V3 only alters melodic contour, articulation and a heard phrase arc.
export function composePhiPhraseV3(plan,phrase,onsets,helpers){
 const base=composePhiPhraseV2(plan,phrase,onsets,helpers);
 const notes=base.events.map(e=>({...e}));
 const scale=scaleSet(plan.key,plan.mode);
 for(let i=0;i<notes.length;i++){
  const e=notes[i],progress=i/Math.max(1,notes.length-1);
  const shape=Math.sin(Math.PI*progress);
  const chord=chordSet(plan.harmony[Math.floor(e.step/16)]);
  const shift=Math.round(shape*(phrase.transform==="arrival"?5:3));
  e.note=nearestPitch(e.note+shift,scale,chord,
    {strong:e.step%4===0||i===notes.length-1,low:56,high:91});
  e.velocity=Math.round(clamp(e.velocity*(.72+.55*shape)*
    (phrase.transform==="arrival"?1.12:1),.15,.89)*1000)/1000;
  if(i===notes.length-1)e.duration=Math.max(1,Math.round(e.duration*.77*100)/100);
  e.development="v3";
 }
 return {events:notes,review:{...base.review,v3:"golden phrase arc"}};
}
// Accompaniments are written after the foreground has spoken. Preserve
// complete chord attacks; leave space for a busy lead; make a bass pickup
// answer a REAL impending chord change, not an arbitrary extra bass note.
export function developV3Ensemble(events,plan){
 const {channel,harmony,totalBars,sections}=plan;
 const leadByBar=Array.from({length:totalBars},()=>[]);
 for(const e of events)if(e.track==="lead"){
  const b=Math.floor(e.step/16);
  if(leadByBar[b])leadByBar[b].push(e);
 }
 const mutedChordGroups=new Set();
 for(let bar=0;bar<totalBars;bar++){
  if(leadByBar[bar].length<3)continue;
  for(const e of events)if(e.track==="chords"&&Math.floor(e.step/16)===bar&&e.step%16>=8){
   if(leadByBar[bar].some(lead=>Math.abs(lead.step-e.step)<=2))
    mutedChordGroups.add(e.step);
  }
 }
 const shaped=events.filter(e=>e.track!=="chords"||!mutedChordGroups.has(e.step))
   .map(e=>{
    if(e.track==="pad"&&leadByBar[Math.floor(e.step/16)]?.length>=3)
     return {...e,velocity:Math.round(e.velocity*.75*1000)/1000};
    return e;
   });
 if(channel!=="classical"&&channel!=="dnb"){
  for(let bar=3;bar<totalBars-2;bar+=4){
   const next=harmony[bar+1],here=harmony[bar];
   if(!next||!here||next.degree===here.degree)continue;
   const role=sections[Math.floor(bar/8)]?.role;
   if(role==="opening"||role==="breakdown")continue;
   const step=bar*16+14;
   if(shaped.some(e=>e.track==="bass"&&Math.abs(e.step-step)<2))continue;
   let note=next.notes[0]-12;
   while(note>51)note-=12;
   while(note<33)note+=12;
   shaped.push({track:"bass",step,duration:1.6,velocity:.28,
    note,tag:"v3 harmonic pickup",development:"v3"});
  }
 }
 return shaped.sort((a,b)=>a.step-b.step||a.track.localeCompare(b.track)||
   (a.note??0)-(b.note??0));
}
