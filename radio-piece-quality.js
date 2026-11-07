// Lightweight, soft quality checks for comparing complete symbolic pieces.
// This is not a music-aesthetic classifier. It only rejects clear mechanical
// failure modes (empty hooks, broken voice leading, relentless repetition).
// Diversity is scored SEPARATELY, so the evaluator does not force one style.
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const activeRatio=(events,totalBars)=>new Set(events.map(e=>Math.floor(e.step/16))).size/totalBars;
export function evaluatePieceQuality(piece){
 const score=piece.songScore||piece.phiScore||piece;
 const events=score?.events||[];
 const totalBars=score?.totalBars||Math.ceil((score?.totalSteps||0)/16);
 const channel=piece.channel||score?.channel||"mixed";
 if(!totalBars||!events.length)return {score:0,issues:["empty score"],metrics:{}};
 const notes=id=>events.filter(e=>e.track===id&&Number.isInteger(e.note))
   .sort((a,b)=>a.step-b.step||a.note-b.note);
 const lead=notes("lead"),counter=notes("counter"),bass=notes("bass");
 const leaps=lead.slice(1).map((e,i)=>Math.abs(e.note-lead[i].note));
 let repeated=0,streak=1,maximumStreak=1;
 for(let i=1;i<lead.length;i++){
  streak=lead[i].note===lead[i-1].note?streak+1:1;
  maximumStreak=Math.max(maximumStreak,streak);
  if(streak>=4)repeated++;
 }
 const runawayLeaps=leaps.filter(l=>l>12).length/Math.max(1,leaps.length);
 const hugeLeaps=leaps.filter(l=>l>19).length;
 const ratio=activeRatio(lead,totalBars);
 const melodyTarget=channel==="dnb"?[.13,.80]:channel==="mixed"?[.23,.95]:
   channel==="classical"?[.45,.98]:[.3,.96];
 const density=lead.length/totalBars;
 const chordChanges=score.harmony?
   score.harmony.slice(1).filter((h,i)=>h.degree!==score.harmony[i].degree).length/
     Math.max(1,totalBars-1):.45;
 const nearUnison=counter.filter(e=>lead.some(n=>
   n.step<=e.step&&n.step+n.duration>e.step)).length;
 const phraseMotifs=score.phrases?.map(p=>p.motif)||[];
 const hasReturn=phraseMotifs.length<2||phraseMotifs.at(0)===phraseMotifs.at(-1);
 const issues=[];let penalty=0;
 function penalize(value,label){
  if(value>0){penalty+=value;issues.push(label);}
 }
 penalize(Math.max(0,(melodyTarget[0]-ratio)*36),"lead is absent for too much of the piece");
 penalize(Math.max(0,(ratio-melodyTarget[1])*30),"lead leaves too little silence");
 penalize(Math.max(0,(runawayLeaps-.065)*35)+hugeLeaps*.85,
   "too many disconnected melodic leaps");
 penalize(Math.max(0,maximumStreak-4)*2.2+Math.max(0,repeated-5)*.7,
   "excessive repeated pitches");
 penalize(Math.max(0,density-(channel==="dnb"?3:channel==="classical"?4.5:5))*1.6,
   "foreground is overcrowded");
 penalize(Math.max(0,(channel==="hiphop"?.09:.16)-chordChanges)*28,
   "harmony is too static");
 penalize(Math.max(0,chordChanges-.86)*28,"harmony changes too rapidly");
 penalize(nearUnison*1.2,"counterline competes with the lead");
 penalize(!hasReturn?4:0,"primary theme never returns");
 // A small genuine ensemble bonus, capped to avoid forcing every channel to
 // have a countermelody or other unsuitable orchestral features.
 const groove=events.some(e=>e.track==="kick")&&bass.some(e=>
   events.some(k=>k.track==="kick"&&k.step===e.step));
 const bonus=groove?2:0;
 return {score:clamp(Math.round((100-penalty+bonus)*100)/100,0,100),
   issues,metrics:{leadCoverage:ratio,melodicDensity:density,largeLeapRate:runawayLeaps,
     chordChangeRate:chordChanges,hasThemeReturn:hasReturn,leadCount:lead.length}};
}
