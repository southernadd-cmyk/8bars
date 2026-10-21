// Human Radio's musical ecology: a deterministic, *symbolic* experiment.
// Mathematics: neo-Riemannian P/L/R triad transformations (two shared pitch
// classes), shortest Tonnetz paths, adaptive transition information,
// and persistent rhythmic/melodic motif inheritance. No audio synthesis.
const PC=n=>(n%12+12)%12;
const ROOTS=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const NOTE_INTERVALS={major:[0,4,7],minor:[0,3,7]};
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const hash=s=>{let v=2166136261;for(const c of String(s)){v=Math.imul(v^c.charCodeAt(0),16777619)}return v>>>0};
export function ecologyRandom(seed){
 let n=hash(seed);
 return ()=>{n=(n+0x6d2b79f5)>>>0;let x=n;x=Math.imul(x^(x>>>15),x|1);
 x^=x+Math.imul(x^(x>>>7),x|61);return((x^(x>>>14))>>>0)/4294967296};
}
export function triadPitches(chord){return NOTE_INTERVALS[chord.quality].map(i=>PC(chord.root+i))}
export function tonnetzMoves(chord){
 if(!chord||!NOTE_INTERVALS[chord.quality])throw Error("Expected major or minor triad");
 const root=PC(chord.root),major=chord.quality==="major";
 return [
  {move:"P",chord:{root,quality:major?"minor":"major"}},
  {move:"L",chord:{root:PC(root+(major?4:-4)),quality:major?"minor":"major"}},
  {move:"R",chord:{root:PC(root+(major?-3:3)),quality:major?"minor":"major"}}
 ];
}
export const chordId=chord=>chord.root+":"+chord.quality;
export function tonnetzDistance(from,to){
 if(chordId(from)===chordId(to))return 0;
 const visited=new Set([chordId(from)]);
 let frontier=[from];
 for(let depth=1;depth<=24;depth++){
   const next=[];
   for(const current of frontier)for(const {chord} of tonnetzMoves(current)){
     if(chordId(chord)===chordId(to))return depth;
     if(!visited.has(chordId(chord))){visited.add(chordId(chord));next.push(chord)}
   }
   frontier=next;
 }
 return Infinity;
}
export function chordToSymbol(chord){return ROOTS[PC(chord.root)]+(chord.quality==="minor"?"m":"")}
function motifFromRandom(r){
 const contours=[
   [0,2,4,3,1,0],[0,3,2,5,4,2],[0,-1,2,4,3,1],
   [0,2,1,4,2,3],[0,4,2,3,1,-1],[0,-2,0,3,1,2],
   [0,1,3,5,2,0],[0,3,4,2,1,-1]
 ];
 const rhythms=[
   [0,2,5,8,12,15],[0,3,6,9,12,14],[0,4,6,10,13,15],
   [0,2,7,9,11,14],[0,3,7,8,12,15],[0,4,7,11,13,15]
 ];
 return {steps:[...rhythms[Math.floor(r()*rhythms.length)]],
   degrees:[...contours[Math.floor(r()*contours.length)]],
   phase:Math.floor(r()*16),bassPulses:2+Math.floor(r()*3),
   leadPulses:4+Math.floor(r()*3)};
}
export function evolveMotif(previous,r){
 if(!previous)return motifFromRandom(r);
 const copy={...previous,steps:[...previous.steps],degrees:[...previous.degrees]};
 // Mutation is heritable: exactly one small edit; other five degrees survive.
 const mutation=Math.floor(r()*copy.degrees.length);
 copy.degrees[mutation]=clamp(copy.degrees[mutation]+(r()<.5?-1:1),-3,6);
 if(r()<.36)copy.phase=(copy.phase+(r()<.5?1:15))%16;
 return copy;
}
const targetDistance=[0,1,2,2,3,3,1,0];
const surpriseGoal=[0,.7,1.4,1.4,1.9,2.4,1.1,0];
function chooseChord(current,home,step,transitionCounts,r){
 const options=tonnetzMoves(current);
 // Avoid arbitrary harmonic leaps at the turn: when necessary choose the
 // closest neighbour of home for the penultimate bar and resolve to home.
 if(step===6){
   const candidates=tonnetzMoves(home).map(x=>x.chord);
   return candidates.map(chord=>({
     chord,move:"return",score:tonnetzDistance(current,chord)*2.4+r()*.6
   })).sort((a,b)=>a.score-b.score)[0];
 }
 const total=Object.values(transitionCounts).reduce((a,b)=>a+b,0);
 return options.map(({chord,move})=>{
   const distance=tonnetzDistance(chord,home);
   const surprisal=-Math.log2(((transitionCounts[move]||0)+1)/(total+3));
   const remaining=7-step;
   const unreachable=Math.max(0,distance-remaining);
   const score=Math.abs(distance-targetDistance[step])*1.5+
     Math.abs(surprisal-surpriseGoal[step])*.45+
     unreachable*5+Math.max(0,distance-4)*2+r()*.9;
   return {chord,move,score,surprisal,distance};
 }).sort((a,b)=>a.score-b.score)[0];
}
export function planEcology({seed="ecology",key="C",mode="major",previous=null}={}){
 const random=ecologyRandom(seed+"|ecology");
 const home={root:Math.max(0,ROOTS.indexOf(key)),quality:mode==="minor"?"minor":"major"};
 const motif=evolveMotif(previous?.motif,random);
 const transitionCounts={P:previous?.transitionCounts?.P||0,
   L:previous?.transitionCounts?.L||0,R:previous?.transitionCounts?.R||0};
 const path=[home],moves=[],surprises=[],distances=[0];
 for(let bar=1;bar<7;bar++){
   const picked=chooseChord(path.at(-1),home,bar,transitionCounts,random);
   const total=Object.values(transitionCounts).reduce((a,b)=>a+b,0);
   const surprise=picked.move==="return"?0:-Math.log2(
     ((transitionCounts[picked.move]||0)+1)/(total+3));
   path.push(picked.chord);
   moves.push(picked.move);surprises.push(surprise);
   distances.push(tonnetzDistance(picked.chord,home));
   if(picked.move!=="return")transitionCounts[picked.move]++;
 }
 path.push(home);moves.push("home");surprises.push(0);distances.push(0);
 // Preserve a bounded recent memory rather than letting lifetime transition
 // statistics overwhelm new material after hours of listening.
 for(const move of ["P","L","R"])
   if(transitionCounts[move]>25)transitionCounts[move]=Math.ceil(transitionCounts[move]/2);
 return {
   name:"Musical ecology",motif,home,path,moves,surprises,distances,
   transitionCounts, harmonyOverrides:path.map(chordToSymbol),
   theory:"A recurrent motif explores major/minor triads through the Tonnetz. "+
      "Transition surprise follows an arc and the last chord returns home."
 };
}
export function euclideanPositions(pulses,rotation=0){
 const n=16,k=clamp(Math.floor(pulses),1,15),phase=((Math.floor(rotation)%16)+16)%16;
 return Array.from({length:16},(_,i)=>i).filter(i=>((i-phase+16)*k)%n<k);
}
export function nearestChordTone(target,chord,lower=63,upper=93){
 const tones=triadPitches(chord),choices=[];
 for(let n=lower;n<=upper;n++)if(tones.includes(PC(n)))choices.push(n);
 return choices.reduce((best,n)=>Math.abs(n-target)<Math.abs(best-target)?n:best,choices[0]);
}
// Identity is a relative contour, NOT a fixed pitch sequence. Reappearance
// across modulation preserves the contour while adapting to each new chord.
export function livingMelody(genome,bar,variant=0){
 const {motif,path}=genome,chord=path[bar];
 const degrees=motif.degrees;
 const rotation=variant==="answer"?1:variant==="lift"?2:variant==="reprise"?3:0;
 const rhythmicGuide=euclideanPositions(motif.leadPulses,motif.phase+bar*2+rotation);
 // Inherited six-note attack pattern is the recognizable rhythmic signature.
 // Euclidean phase rotation supplies a second, slowly drifting pulse layer.
 const phraseShift=(bar%2===1?1:0)+(bar>=4?1:0)+(rotation?1:0);
 const inherited=motif.steps.map(step=>(step+phraseShift)%16);
 const positions=[...new Set([...inherited.slice(0,motif.leadPulses),
   ...rhythmicGuide.slice(0,2)])].sort((a,b)=>a-b).slice(0,7);
 const notes=[];let previous=72+PC(chord.root);
 for(let index=0;index<positions.length;index++){
   const degree=degrees[(index+(bar%2?1:0))%degrees.length];
   const reflected=(variant==="answer"&&bar%2===1)?-degree:degree;
   const target=previous+clamp(reflected,-4,6)*2;
   const strong=positions[index]%4===0||index===positions.length-1&&bar===7;
   let note=nearestChordTone(target,chord,63,93);
   if(!strong){
     // Passing tones can neighbour the harmony but don't drift outside a
     // controlled melodic register or force large leaps.
     const passing=clamp(Math.round(target),63,93);
     if(Math.abs(passing-note)<=2)note=passing;
   }
   if(Math.abs(note-previous)>9)note=nearestChordTone(previous+Math.sign(note-previous)*5,chord,63,93);
   previous=note;
   notes.push({step:bar*16+positions[index],note,duration:Math.min(3.5,16-positions[index]),
     velocity:strong?.57:.43});
 }
 return notes;
}
