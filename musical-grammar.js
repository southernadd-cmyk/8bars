// Seeded musical phrase grammar shared by Pop, Hip-hop and Drum & Bass.
// Repetition establishes a hook; contrasting answers and cadences develop it.
// This is symbolic composition only. All sounds remain recorded samples.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const choose=(r,a)=>a[Math.min(a.length-1,Math.floor(r()*a.length))];
const copy=a=>a.slice();

export function phraseBlueprint(r,minNotes,maxNotes,{sparse=false,firstOnBeat=false}={}){
 const count=minNotes+Math.floor(r()*(maxNotes-minNotes+1));
 const grid=sparse?[0,2,4,6,8,10,12,14]:[0,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
 const available=grid.filter(n=>n<15);
 const rhythm=new Set([firstOnBeat?0:r()<.68?0:choose(r,[0,2,3,4])]);
 // A rhythm has salient strong beats and a limited number of syncopations.
 const weighted=available.flatMap(n=>n%4===0?[n,n,n,n]:n%2===0?[n,n]:[n]);
 while(rhythm.size<count)rhythm.add(choose(r,weighted));
 const ordered=[...rhythm].sort((a,b)=>a-b);
 const contour=[];
 let degree=choose(r,[-2,-1,0,1,2]);
 let lastLeap=0;
 const direction=r()<.5?-1:1;
 const shape=choose(r,["arc","descent","wave","pedal","ascent"]);
 for(let i=0;i<count;i++){
  if(i>0){
   const movement=lastLeap?choose(r,[-2,-1,-1,0,1])*(-Math.sign(lastLeap)):
    choose(r,[-2,-1,-1,0,1,1,2]);
   const arc=shape==="arc"?(i<count/2?direction:-direction):
      shape==="ascent"?1:shape==="descent"?-1:
      shape==="wave"?(i%2?-1:1)*direction:0;
   const step=clamp(movement+arc,-3,3);
   degree=clamp(degree+step,-5,5);
   lastLeap=Math.abs(step)>=3?step:0;
  }
  contour.push(degree);
 }
 // Four bars are antecedent, echo, answering idea and cadence. The second
 // four-bar cycle returns the theme, develops it and then closes conclusively.
 return {rhythm:ordered,contour,centre:choose(r,[-7,-4,-2,0,2,4,7]),
  articulation:choose(r,[.68,.8,.92]),shape,
  variation:choose(r,[-2,-1,1,2]),
  response:choose(r,[-3,-2,2,3]),
  shift:choose(r,[-1,0,1]),
  opening:choose(r,["direct","pickup","rest"])};
}
export function developPhrase(hook,bar,{answer=false,closing=true}={}){
 const rhythm=copy(hook.rhythm),contour=copy(hook.contour);
 const phrase=bar%4,cycle=Math.floor(bar/4);
 if(phrase===1){
  // Echo the identity with a changed tail, not a brand new random phrase.
  contour[contour.length-1]=clamp(contour.at(-1)+hook.variation,-5,5);
  if(rhythm.length>2){
   const index=rhythm.length-2;
   rhythm[index]=clamp(rhythm[index]+hook.shift,rhythm[index-1]+1,rhythm[index+1]-1);
  }
 }
 if(phrase===2||answer){
  // Answer: inverted first motion, a sequence up/down, and a short rest.
  const anchor=contour[0];
  for(let i=0;i<contour.length;i++)
   contour[i]=clamp(anchor-(hook.contour[i]-hook.contour[0])+hook.response,-5,5);
  if(rhythm.length>3)rhythm.splice(1,1),contour.splice(1,1);
 }
 if(phrase===3){
  // Cadence: the final attack is early enough for a held resolution.
  if(rhythm.length>3){rhythm.splice(-2,1);contour.splice(-2,1);}
  rhythm[rhythm.length-1]=Math.min(12,rhythm.at(-1));
  contour[contour.length-1]=0;
 }
 if(cycle===1){
  if(phrase===0){
   // The recognisable first phrase returns with a restrained lift.
   if(contour.length>2)contour[1]=clamp(contour[1]+hook.variation,-5,5);
  }else if(phrase===1){
   contour[0]=clamp(contour[0]+hook.variation,-5,5);
  }else if(phrase===2){
   contour[contour.length-1]=clamp(contour.at(-1)-hook.response,-5,5);
  }
  if(phrase===3&&closing)contour[contour.length-1]=0;
 }
 // Avoid two notes on the same step after displacement.
 for(let i=1;i<rhythm.length;i++)rhythm[i]=Math.max(rhythm[i],rhythm[i-1]+1);
 return {rhythm,contour,articulation:hook.articulation,
  cadence:phrase===3,finalCadence:bar===7};
}

export function smoothVoicing(chord,target=68,previous=null){
 const base=chord.notes.slice(0,3),candidates=[];
 for(let inversion=0;inversion<3;inversion++){
  const rotated=base.slice(inversion).concat(base.slice(0,inversion).map(n=>n+12));
  for(const octave of [-12,0,12,24]){
   const tones=rotated.map(n=>n+12+octave);
   if(tones[0]<53||tones[2]>92)continue;
   const centre=(tones[0]+tones[2])/2;
   const travel=previous?tones.reduce((sum,n,i)=>sum+Math.abs(n-previous[i]),0):0;
   const spread=tones[2]-tones[0];
   const cost=Math.abs(centre-target)*.8+travel*.85+
    (previous&&tones.some((n,i)=>Math.abs(n-previous[i])>7)?5:0)+
    Math.abs(spread-14)*.16;
   candidates.push({tones,cost});
  }
 }
 return candidates.sort((a,b)=>a.cost-b.cost)[0]?.tones||base.map(x=>x+12);
}

// Probabilistic functional harmony: the seed chooses harmonic *routes*, not
// arbitrary independent chord replacements. Each role has a tonal purpose.
const HARMONIC_ROUTES=[
 ["T","P","D","T"],["T","T","P","D"],["T","P","T","D"],
 ["P","T","P","D"],["T","D","P","D"],["T","P","D","D"],
 ["T","P","P","D"],["T","T","D","T"]
];
export function harmonicDegrees(r,channel,mode){
 const route=choose(r,HARMONIC_ROUTES);
 const choices=channel==="dnb"?
   {T:[0,0,0,5,3],P:[3,3,5,1],D:[4,4,6,3]}:
  channel==="hiphop"?
   {T:[0,0,5,3,2],P:[3,5,1,1],D:[4,6,3,4]}:
   {T:[0,0,0,5,2],P:[3,3,1,5],D:[4,4,6,3]};
 const degrees=[];
 for(let i=0;i<route.length;i++){
  let pool=choices[route[i]];
  if(i===0&&r()<.72)pool=[0,0,0,5,3];
  if(i===3&&route[i]==="T"&&r()<.65)pool=[0,0,0,5];
  const alt=pool.filter(d=>i===0||d!==degrees[i-1]);
  degrees.push(choose(r,alt.length?alt:pool));
 }
 // Ensure a viable last-to-first turn, tonic or dominant approach.
 if(r()<.45)degrees[3]=r()<.63?4:0;
 return degrees;
}

const PITCH_NAMES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const pitchClass=n=>(n%12+12)%12;
// Musical candidate scoring instead of snapping every note to the nearest
// chord tone independently. Strong beats anchor harmony; weaker attacks can
// be diatonic neighbours. Continuity and stepwise motion beat random leaps.
export function chooseMelodyNote(source,chord,target,previous,step,r,
 low=60,high=89,{cadence=false}={}){
 const tonic=PITCH_NAMES.indexOf(source.key);
 const minor=source.mode==="minor";
 const scale=minor?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11];
 const diatonic=new Set(scale.map(degree=>(tonic+degree)%12));
 const chordTones=new Set(chord.notes.slice(0,3).map(pitchClass));
 const strong=step%4===0||cadence;
 const candidates=[];
 for(let note=low;note<=high;note++){
  const pc=pitchClass(note);
  if(strong?!chordTones.has(pc):!diatonic.has(pc))continue;
  const gap=previous===null?0:Math.abs(note-previous);
  const leap=Math.max(0,gap-7);
  const repeats=previous!==null&&note===previous?2:0;
  const harmonicCost=strong?0:chordTones.has(pc)?.1:0;
  const cadenceCost=cadence&&pc!==pitchClass(chord.notes[0])?1.1:0;
  const score=Math.abs(note-target)*.78+gap*.64+leap*2.6+
   repeats+harmonicCost+cadenceCost+(r()-.5)*.3;
  candidates.push({note,score});
 }
 if(!candidates.length)return Math.max(low,Math.min(high,Math.round(target)));
 candidates.sort((a,b)=>a.score-b.score);
 return candidates[0].note;
}
