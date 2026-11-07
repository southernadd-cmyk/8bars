// Whole-song Classical phi planner for Human Radio.
// One symbolic score is planned before playback. The eight-bar units are
// transport slices ONLY; no composition or motif is restarted at their edges.
import {PHI,GOLDEN_LARGE,GOLDEN_SMALL,GOLDEN_ANGLE_TURNS} from "./phi-dynamics.js";
import {CHORD_ROOTS} from "./harmony.js";
import {planEnsembleParts,coordinateEnsemble} from "./radio-ensemble.js";

const MAJOR=[0,2,4,5,7,9,11],MINOR=[0,2,3,5,7,8,10];
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const pc=n=>((n%12)+12)%12;
function randomSeed(seed){
 let n=2166136261;
 for(const ch of String(seed))n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;
 return ()=>{
  n=(n+0x6d2b79f5)>>>0;
  let v=n;v=Math.imul(v^(v>>>15),v|1);v^=v+Math.imul(v^(v>>>7),v|61);
  return ((v^(v>>>14))>>>0)/4294967296;
 };
}
function addGoldenLeaves(start,length,depth,out=[]){
 if(depth===0){out.push(start);return out;}
 addGoldenLeaves(start,length*GOLDEN_LARGE,depth-1,out);
 addGoldenLeaves(start+length*GOLDEN_LARGE,length*GOLDEN_SMALL,depth-1,out);
 return out;
}
function nearestChordTone(target,chord,min=55,max=96){
 const pcs=new Set(chord.notes.map(pc));let winner=min,score=Infinity;
 for(let n=min;n<=max;n++)if(pcs.has(pc(n))&&Math.abs(n-target)<score){
  winner=n;score=Math.abs(n-target);
 }
 return winner;
}
function splitPhrases(totalBars,turnBar,climaxBar,random){
 const intervals=[[0,turnBar],[turnBar,climaxBar],[climaxBar,totalBars]];
 const phrases=[];
 for(const [a,b] of intervals){
  let at=a;
  while(at<b){
   const remain=b-at;
   // Phrase lengths are Fibonacci numbers and can cross any 8-bar transport edge.
   const options=[8,5,3,2].filter(x=>x<=remain&&remain-x!==1);
   const length=options.length?options[Math.floor(random()*options.length)]:remain;
   const phase=a===0?"exposition":a===turnBar?"development":"resolution";
   phrases.push({id:phrases.length,startBar:at,lengthBars:length,endBar:at+length,
     startStep:at*16,endStep:(at+length)*16,phase,
     motif:phrases.length%3===1?"B":"A",
     transform:phrases.length%4===0?"original":phrases.length%4===1?"inversion":
       phrases.length%4===2?"sequence":"retrograde"});
   at+=length;
  }
 }
 // A recognizable A theme returns at the climax and in the final phrase.
 const climaxPhrase=phrases.find(p=>p.startBar===climaxBar);
 if(climaxPhrase){climaxPhrase.motif="A";climaxPhrase.transform="arrival";}
 const last=phrases.at(-1);last.motif="A";last.transform="coda";
 return phrases;
}
function chordFor(keyIndex,mode,degree,bar){
 const scale=mode==="minor"?MINOR:MAJOR;
 const n=scale[degree],third=scale[(degree+2)%7]+(degree+2>=7?12:0);
 const fifth=scale[(degree+4)%7]+(degree+4>=7?12:0);
 const root=48+keyIndex+n;
 const majorDominant=mode==="minor"&&degree===4;
 return {bar,degree,notes:[
  root,majorDominant?root+4:48+keyIndex+third,majorDominant?root+7:48+keyIndex+fifth
 ]};
}
function planHarmony({keyIndex,mode,totalBars,turnBar,climaxBar,random}){
 // Functional harmony is planned as a connected path across the WHOLE piece,
 // not as eight-bar repeated chords with ad-hoc section replacements.
 // The degree graph is diatonic (I -> predominant -> dominant -> tonic).
 const successors=[
  [0,3,5,1], // I: prolongation / movement toward predominant
  [4,6,3],   // ii: dominant / leading tone / IV
  [5,3,4],   // iii: relative / predominant / dominant
  [4,1,0],   // IV: V, ii, or plagal resolution
  [0,5],     // V: authentic or deceptive cadence
  [1,3,4],   // vi: ii, IV or V
  [0,4]      // viio: tonic or dominant
 ];
 const forced=new Map([
  [0,0],[turnBar-1,4],[turnBar,0],
  [climaxBar-1,4],[climaxBar,0],
  [totalBars-3,3],[totalBars-2,4],[totalBars-1,0]
 ]);
 const harmony=[];let prior=0;
 for(let bar=0;bar<totalBars;bar++){
  let degree;
  if(forced.has(bar))degree=forced.get(bar);
  else if(bar%2===1&&random()<.48)degree=prior; // harmonic breathing room
  else{
   let choices=successors[prior];
   const progress=bar/totalBars;
   // Development spends longer away from the tonic; resolution gravitates
   // home. Degree selection still obeys the harmonic transition graph.
   if(progress>=GOLDEN_SMALL&&progress<GOLDEN_LARGE){
    const away=choices.filter(d=>d!==0);
    if(away.length&&random()<.74)choices=away;
   }else if(progress>=GOLDEN_LARGE&&random()<.55){
    const home=choices.filter(d=>[0,3,4].includes(d));
    if(home.length)choices=home;
   }
   degree=choices[Math.floor(random()*choices.length)];
  }
  harmony.push(chordFor(keyIndex,mode,degree,bar+1));
  prior=degree;
 }
 return harmony;
}
function motifFrom(random){
 const motif=[0];let degree=0;
 for(let i=1;i<8;i++){
  degree=clamp(degree+[-2,-1,1,2][Math.floor(random()*4)],-2,5);
  motif.push(degree);
 }
 // Structural identity is fixed for all returns, not re-rolled each eight bars.
 motif[7]=0;
 return motif;
}
function motifDegree(motif,phrase,i){
 const src=phrase.motif==="B"?motif.slice().reverse().map(v=>-v):motif;
 const degree=src[i%src.length];
 if(phrase.transform==="inversion")return -degree;
 if(phrase.transform==="sequence")return degree+1;
 if(phrase.transform==="retrograde")return src[(src.length-1-i%src.length)];
 return degree;
}
function melodicPitch(keyIndex,mode,degree,previous,chord,anchor=false){
 const scale=mode==="minor"?MINOR:MAJOR;
 const wrapped=((degree%7)+7)%7,oct=Math.floor(degree/7);
 let note=60+keyIndex+scale[wrapped]+12*oct;
 if(previous!==null){
  while(note-previous>9)note-=12;
  while(previous-note>9)note+=12;
 }
 note=clamp(note,56,91);
 return anchor?nearestChordTone(note,chord,56,91):note;
}
function scoreEvents(plan){
 const {harmony,phrases,seed,mode,totalSteps,totalBars,turnBar,climaxBar,keyIndex,motif}=plan;
 const rand=randomSeed(seed+"|orchestration");
 const events=[];
 const add=(track,step,duration,velocity,note,tag)=>{
  step=Math.round(step);
  if(step<0||step>=totalSteps||!Number.isInteger(note)||note<28||note>108)return;
  duration=clamp(Math.round(duration*100)/100,0.25,48);
  events.push({track,step,duration,velocity:clamp(Math.round(velocity*100)/100,.06,1),note,tag});
 };
 const chordAt=step=>harmony[clamp(Math.floor(step/16),0,totalBars-1)];
 let previous=null,leadIndex=0;
 for(const phrase of phrases){
  const duration=phrase.endStep-phrase.startStep;
  const onsets=[...new Set(addGoldenLeaves(0,duration,3).map(x=>Math.round(x)))].sort((a,b)=>a-b);
  const centre=(phrase.startBar+phrase.endBar)/2;
  const distance=Math.abs(centre-climaxBar)/totalBars;
  const energy=clamp(1-distance/GOLDEN_LARGE,.34,1);
  const quiet=phrase.phase==="exposition";
  for(let i=0;i<onsets.length;i++){
   if(quiet&&i===1&&phrase.id===0)continue;
   const step=phrase.startStep+onsets[i];
   const chord=chordAt(step);
   const degree=motifDegree(motif,phrase,i);
   const note=melodicPitch(keyIndex,mode,degree,previous,chord,i===0||i===onsets.length-1);
   const toNext=i+1<onsets.length?onsets[i+1]-onsets[i]:duration-onsets[i];
   add("lead",step,clamp(toNext*.79,2,21),.35+.17*energy,note,phrase.motif);
   previous=note;leadIndex++;
   if(phrase.phase!=="exposition"&&i%3===1){
    const at=step+Math.max(1,Math.round(toNext*GOLDEN_SMALL));
    if(at<totalSteps){
     const target=clamp(note-(phrase.phase==="resolution"?5:7),55,84);
     add("counter",at,clamp(toNext*.58,2,12),.15+.09*energy,
       nearestChordTone(target,chord,55,84),"answer");
    }
   }
  }
 }
 // Accompaniment follows the whole-song harmony, leaving room for recurring themes.
 for(let bar=0;bar<totalBars;bar++){
  const at=bar*16,chord=harmony[bar],previousChord=harmony[bar-1];
  const root=chord.notes[0],stage=bar/totalBars;
  const energy=clamp(1-Math.abs(stage-GOLDEN_LARGE)/GOLDEN_LARGE,.3,1);
  let bass=root-12;while(bass>52)bass-=12;while(bass<32)bass+=12;
  add("bass",at,Math.min(17,totalSteps-at),.29+.08*energy,bass,"foundation");
  const changed=!previousChord||previousChord.degree!==chord.degree;
  if(changed||bar%3===0)
   for(const n of chord.notes)
    add("chords",at,Math.min(16,totalSteps-at),.11+.07*energy,n+12,"harmony");
  if(bar%3===0||bar===climaxBar||bar===turnBar)
   for(const n of chord.notes)
    add("pad",at,Math.min(32,totalSteps-at),.08+.045*energy,n+12,"sustain");
  // φ governs instrument entrances: rotation across a chord rather than
  // a repeating 8-bar arpeggio. The complete bar index is used.
  const angle=((bar+1)*GOLDEN_ANGLE_TURNS)%1;
  const tone=Math.floor(angle*3);
  const point=at+Math.round(16*GOLDEN_LARGE);
  if(point<totalSteps&&stage>GOLDEN_SMALL/2&&stage<.91&&rand()<.37+energy*.24)
   add("arp",point,Math.min(5,totalSteps-point),.14+.05*energy,chord.notes[tone]+12,"golden angle");
 }
 // The arrival is explicitly at the global golden cut, not each eighth bar.
 const climaxStep=clamp(Math.round(totalSteps*GOLDEN_LARGE),0,totalSteps-1);
 const climaxChord=chordAt(climaxStep);
 add("lead",climaxStep,Math.min(25,totalSteps-climaxStep),.68,
   nearestChordTone(79,climaxChord,68,91),"climax");
 // Final authentic cadence: IV–V–I with a deliberately sustained tonic ending.
 const final=totalSteps-16,tonic=harmony.at(-1);
 add("lead",final,Math.min(15,totalSteps-final),.43,
   nearestChordTone(72,tonic,60,85),"resolution");
 for(const n of tonic.notes)add("chords",final,16,.18,n+12,"resolution");
 return events.sort((a,b)=>a.step-b.step||a.track.localeCompare(b.track)||a.note-b.note);
}
export function planPhiSong({seed="618033",key="C",mode="major",targetLoops=6}={}){
 if(!CHORD_ROOTS.includes(key)||!["major","minor"].includes(mode))
  throw new RangeError("Unknown key or mode");
 const loops=clamp(Math.round(Number(targetLoops)||6),5,7);
 const totalBars=loops*8,totalSteps=totalBars*16;
 const turnBar=Math.round(totalBars*GOLDEN_SMALL);
 const climaxBar=Math.round(totalBars*GOLDEN_LARGE);
 const random=randomSeed(seed+"|phi-plan");
 const keyIndex=CHORD_ROOTS.indexOf(key);
 const phrases=splitPhrases(totalBars,turnBar,climaxBar,random);
 const harmony=planHarmony({keyIndex,mode,totalBars,turnBar,climaxBar,random});
 const motif=motifFrom(random);
 const plan={seed,key,mode,keyIndex,totalBars,totalSteps,turnBar,climaxBar,
  turnStep:Math.round(totalSteps*GOLDEN_SMALL),
  climaxStep:Math.round(totalSteps*GOLDEN_LARGE),phrases,harmony,motif};
 plan.ensemble=planEnsembleParts({channel:"classical",scene:"chamber",engine:"melodic",
   seed,sections:[{role:"opening",startBar:0,endBar:8},
   ...Array.from({length:loops-2},(_,i)=>({role:i%2?"answer":"statement",startBar:(i+1)*8,endBar:(i+2)*8})),
   {role:"return",startBar:(loops-1)*8,endBar:totalBars}],phrases,totalBars,climaxBar});
 plan.events=coordinateEnsemble(scoreEvents(plan),plan.ensemble,harmony);
 return plan;
}
// After the whole score exists, adapt it to the legacy transport's eight-bar
// buffers. There is deliberately no composition function in this adapter.
export function slicePhiSong(plan){
 if(!plan||!Array.isArray(plan.events)||plan.totalSteps%128!==0)
  throw new TypeError("Expected a complete phi song in eight-bar transport units");
 return Array.from({length:plan.totalSteps/128},(_,i)=>{
  const start=i*128;
  const events=plan.events.filter(e=>e.step>=start&&e.step<start+128)
   .map(e=>({...e,step:e.step-start}));
  const progression=plan.harmony.slice(i*8,(i+1)*8)
   .map((h,j)=>({...h,bar:j+1}));
  const t=(i+.5)/(plan.totalSteps/128);
  const role=t<GOLDEN_SMALL?"statement":t<GOLDEN_LARGE?"answer":"return";
  const eventsByStep=Array.from({length:128},()=>[]);
  for(const e of events)eventsByStep[e.step].push(e);
  return {role,name:"Movement "+(i+1),number:i+1,startStep:start,
   progression,events,eventsByStep,ready:false};
 });
}
