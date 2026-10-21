// Independent rule-based composition systems for 8bars.
// All produce the same symbolic event format and use the same *recorded*
// instruments at playback; there is no oscillator, synthesized fallback,
// audio dependency or DOM dependency in these composition engines.
import {compose,rng,euclidean,TRACKS} from "./composer.js?v=0.5.5";
import {planEcology,euclideanPositions,livingMelody,nearestChordTone} from "./music-ecology.js";

export const COMPOSITION_ENGINES=[
 {id:"classic",name:"Original",description:"The original eight-bar composer"},
 {id:"pattern",name:"Pattern",description:"Bass hooks, repeated grooves and rhythmic transformations"},
 {id:"melodic",name:"Melodic",description:"Call-and-response phrases with voice leading"},
 {id:"ambient",name:"Ambient",description:"Long tones, silence and slow harmonic drift"},
 {id:"process",name:"Process",description:"Gradual probability and phase-driven change"},
 {id:"ecology",name:"Ecology",description:"Tonnetz harmony, inherited motifs and an evolving surprise budget"}
];
export const ENGINE_IDS=COMPOSITION_ENGINES.map(x=>x.id);
const DRUMS=new Set(TRACKS.filter(t=>t.type==="drum").map(t=>t.id));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const semitone=n=>((n%12)+12)%12;
const round=n=>Math.round(n);
const isNote=e=>Number.isInteger(e.note);
const scales={major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10]};
const roots=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const pick=(r,list)=>list[Math.min(list.length-1,Math.floor(r()*list.length))];

function createContext(input,base,engine){
 const events=[],variants=input.variations||{};
 const random=Object.fromEntries(TRACKS.map(t=>
   [t.id,rng(base.seed,"system-"+engine+"-"+t.id,Number(variants[t.id])||0)]));
 const r=id=>random[id]();
 const chord=bar=>base.progression[clamp(bar,0,7)];
 const scale=scales[base.mode],tonic=roots.indexOf(base.key);
 const density=base.density;
 function add(track,step,duration,velocity,note){
   const position=round(step);
   if(position<0||position>=128||duration<=0)return;
   const event={track,step:position,duration:Math.min(128-position,Math.max(.25,duration)),
     velocity:round(clamp(velocity,.06,1)*100)/100};
   if(note!==undefined){
     if(!Number.isInteger(note)||note<0||note>127)return;
     event.note=note;
   }
   events.push(event);
 }
 function triad(bar,offset=0){return chord(bar).notes.slice(0,3).map(n=>n+offset)}
 function root(bar,offset=0){return chord(bar).notes[0]+offset}
 function melodyDegree(degree,octave=1){
   const diatonicIndex=((degree%7)+7)%7;
   const wraps=Math.floor(degree/7);
   return 48+tonic+scale[diatonicIndex]+12*(octave+wraps);
 }
 function closestChord(note,bar,minimum=55,maximum=96){
   const candidates=triad(bar).flatMap(n=>[-12,0,12,24,36].map(offset=>n+offset))
     .filter(n=>n>=minimum&&n<=maximum);
   return candidates.reduce((best,n)=>Math.abs(n-note)<Math.abs(best-note)?n:best,candidates[0]);
 }
 function bassNote(bar,interval=0){
   let n=root(bar,-24)+interval;
   while(n<28)n+=12;
   while(n>52)n-=12;
   return n;
 }
 function rhythm(track,bar,steps,probability=1,velocity=.55,duration=1){
   for(const step of steps)if(r(track)<probability)
     add(track,bar*16+step,duration,velocity+(r(track)-.5)*.15);
 }
 return {events,add,r,pick:(track,items)=>pick(random[track],items),chord,triad,root,
   melodyDegree,closestChord,bassNote,rhythm,density,base};
}
function percussion(c,engine){
 const {add,r,rhythm,density}=c;
 for(let b=0;b<8;b++){
   if(engine==="pattern"){
     rhythm("kick",b,[0,4,8,12],.93,.79);
     rhythm("snare",b,[4,12],.95,.77);
     rhythm("clap",b,[12],.55,.44);
     rhythm("hat",b,b%2===0?[0,2,4,6,8,10,12,14]:[0,2,4,6,9,10,12,14],.77,.35,.5);
     rhythm("openhat",b,[6,14],.35,.33,2);
     rhythm("perc",b,[3,11,15],.2+density*.31,.36,.6);
   }else if(engine==="melodic"){
     rhythm("kick",b,[0,8],.88,.72);
     rhythm("snare",b,[4,12],.77,.62);
     rhythm("hat",b,[0,4,8,12],.56,.28,.5);
     if(b%2===1)rhythm("clap",b,[12],.5,.37);
     if(b===3||b===7){
       rhythm("perc",b,[10,13,15],.43,.28);
       rhythm("openhat",b,[14],.6,.25,2);
     }
   }else if(engine==="ambient"){
     // Silence is intentional; there is no regular beat in this system.
     if(b===0||b===4)rhythm("perc",b,[0],.32,.15,3);
     if(b===5)rhythm("hat",b,[8],.3,.14,.5);
   }else if(engine==="process"){
     // Slowly phase-shifting Euclidean layers; adjacent bars share the same
     // pulse family but a different rotation and gradual likelihood.
     const amount=Math.max(1,Math.round((2+density*4)*(0.35+b/10)));
     const drumSteps=Array.from({length:16},(_,i)=>i);
     const parts=[["kick",Math.max(1,Math.floor(amount*.75)),.79],
       ["snare",2,.55],["hat",Math.min(13,amount+3),.33],
       ["perc",Math.max(1,Math.floor(amount*.6)),.33]];
     for(const [track,count,level] of parts){
       const rotation=(b+Math.floor(r(track)*3))%16;
       const pattern=euclidean(count,16,rotation);
       for(const i of drumSteps)if(pattern[i]&&r(track)<.65+density*.24)
         add(track,b*16+i,track==="hat"?.5:1,level+(r(track)-.5)*.12);
     }
     if(b%2)rhythm("clap",b,[(b*3)%16],.46,.32);
     if(b%3===2)rhythm("openhat",b,[14],.56,.33,2);
   }
 }
}
function pattern(c){
 const {add,r,triad,root,bassNote,density}=c;
 const pr=()=>r("lead"),phrase=phraseBlueprint(pr);
 const hook=phrase.contour.slice(0,Math.min(phrase.contour.length,6));
 const hookBeats=phrase.rhythm.slice(0,hook.length);
 const hits=pick(()=>r("bass"),[[0,7,10],[0,4,8,12],[0,6,10,14]]);
 for(let b=0;b<8;b++){
   const chord=triad(b),change=b>=4;
   for(const step of hits){
     const interval=step===hits[0]?0:r("bass")<.7?0:7;
     add("bass",b*16+step,Math.min(5,16-step),.64,bassNote(b,interval));
   }
   for(const step of (b===5?[0,6,10,14]:[0,8])){
     for(const n of chord)add("chords",b*16+step,Math.min(7,16-step),.25,n+12);
   }
   for(let i=0;i<8;i++){
     const pos=i*2+(b%2);
     if(r("arp")<.55+density*.2)
       add("arp",b*16+pos,1.5,.26,chord[(i+(change?1:0))%3]+12);
   }
   for(let i=0;i<hookBeats.length;i++){
     const beat=clamp(hookBeats[i]+(b%2===1?1:0),0,15);
     const degree=hook[(i+(b>=4?1:0))%hook.length];
     const note=chord[((degree%3)+3)%3]+24+(degree>=5?12:0);
     add("lead",b*16+beat,Math.min(3,16-beat),.48+pr()*.12,note);
   }
   if(b%2===1)for(const i of [4,12])
     add("counter",b*16+i,3,.28,chord[(i/4+1)%3]+12);
   if(b%4===0)for(const n of chord)
     add("pad",b*16,Math.min(27,128-b*16),.12,n+12);
 }
 percussion(c,"pattern");
}
// Seeded phrase grammar: each song creates its own contour and attack pattern.
// Question -> answer -> variation -> cadence, not one fixed outline for all seeds.
// Only the lead RNG is consumed: a lead regeneration cannot affect other parts.
export function phraseBlueprint(random){
 const r=random, contourLength=4+Math.floor(r()*4);
 const contour=[Math.floor(r()*4)+1];
 for(let i=1;i<contourLength;i++){
   const jumps=[-3,-2,-1,0,1,1,2,3];
   const interval=jumps[Math.floor(r()*jumps.length)];
   contour.push(clamp(contour.at(-1)+interval,0,8));
 }
 // Force a meaningful contour range; not every tune collapses to repeated notes.
 if(Math.max(...contour)-Math.min(...contour)<2)
   contour[Math.floor(r()*(contourLength-1))+1]=clamp(contour[0]+(r()<.5?3:-3),0,8);
 const choices=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14];
 const number=4+Math.floor(r()*3);
 const starts=new Set([r()<.82?0:2]);
 while(starts.size<number)starts.add(choices[Math.floor(r()*choices.length)]);
 const rhythm=[...starts].sort((a,b)=>a-b);
 return {
   contour,rhythm,
   response:Math.floor(r()*4), // answer, invert, retrograde, sequence
   direction:r()<.5?-1:1,
   register:Math.floor(r()*3)-1,
   pivot:1+Math.floor(r()*4),
   answerShift:1+Math.floor(r()*2)
 };
}
function melodic(c){
 const {add,r,triad,melodyDegree,closestChord,bassNote}=c;
 const leadRandom=()=>r("lead");
 const phrase=phraseBlueprint(leadRandom);
 let last=null;
 for(let b=0;b<8;b++){
   const response=b%2===1;
   const turn=b>=4,closing=b===7;
   let shape=phrase.contour.slice();
   if(response){
     if(phrase.response===0)shape=shape.map(degree=>clamp(degree+phrase.answerShift,0,8));
     else if(phrase.response===1)shape=shape.map(degree=>clamp(2*phrase.pivot-degree,0,8));
     else if(phrase.response===2)shape.reverse();
     else shape=shape.map((degree,i)=>clamp(degree+(i%2?1:-1)*phrase.direction,0,8));
   }
   if(turn&&b<7)shape=shape.map((degree,i)=>
     clamp(degree+(i%3===0?phrase.direction:0),0,8));
   let starts=phrase.rhythm.map(step=>clamp(step+(response?1:0),0,15));
   if(b===3||b===5)starts=starts.map((step,i)=>clamp(step+(i%2?1:0),0,15));
   starts=[...new Set(starts)].sort((a,b)=>a-b);
   for(let i=0;i<starts.length;i++){
     const step=starts[i],degree=shape[(i+(b>=4?1:0))%shape.length];
     let target=melodyDegree(degree,2)+phrase.register*5;
     if(last!==null)while(target-last>10)target-=12;
     if(last!==null)while(last-target>10)target+=12;
     target=clamp(target,62,94);
     if(step%4===0||i===0||closing&&i===starts.length-1)
       target=closestChord(target,b,62,94);
     if(closing&&i===starts.length-1){
       target=closestChord(target,b,62,94);
     }
     const next=starts[i+1]??16;
     add("lead",b*16+step,Math.min(5,Math.max(.75,next-step-.3)),
       .49+(response?.06:0)+(turn?.04:0)+leadRandom()*.11,target);
     last=target;
   }
   const chord=triad(b);
   add("bass",b*16,11,.59,bassNote(b));
   if(b%2===1)add("bass",b*16+12,3,.36,bassNote(b,7));
   if(b%2===1)for(const n of chord)add("pad",b*16,14,.12,n+12);
   for(const i of [3,9])if(r("counter")<.57)
     add("counter",b*16+i,4,.26,chord[(i+b)%3]+12);
   if(b%2===1)for(const i of [5,11])if(r("arp")<.63)
     add("arp",b*16+i,3,.22,chord[(b+i)%3]+12);
 }
 percussion(c,"melodic");
}
function ambient(c){
 const {add,r,triad,root,bassNote,closestChord}=c;
 // Non-percussive orchestration, long resonances, sparse independent bells.
 // Voice selection is left to the real recording library.
 for(let b=0;b<8;b++){
   const chord=triad(b);
   if(b%2===0){
     for(const n of chord)
       add("pad",b*16,Math.min(30,128-b*16),.17,n+12);
     add("bass",b*16,Math.min(29,128-b*16),.29,bassNote(b));
     if(r("chords")<.7)for(const n of chord)
       add("chords",b*16+Math.round(r("chords")*4),Math.min(24,128-b*16-4),.15,n+12);
   }
   if(r("lead")<.5){
     const position=b*16+Math.round(r("lead")*12);
     add("lead",position,Math.min(10,128-position),.25,
       closestChord(root(b,24)+(r("lead")<.5?0:7),b,62,96));
   }
   if(b%2===1&&r("arp")<.75){
     const step=2+Math.floor(r("arp")*11);
     add("arp",b*16+step,6,.18,chord[Math.floor(r("arp")*3)]+24);
   }
   if(b===5||b===7)for(const n of chord.slice(0,2))
     add("counter",b*16+Math.floor(r("counter")*5),7,.17,n+24);
 }
 percussion(c,"ambient");
}
function process(c){
 const {add,r,triad,bassNote,density,melodyDegree,closestChord}=c;
 // Distinct from fixed arrangements: interacting rhythmic phases and
 // a bounded melodic random walk drift across all eight bars.
 let walk=2+Math.floor(r("lead")*3),direction=r("lead")<.5?-1:1;
 const division=[5,7,9][Math.floor(r("arp")*3)];
 for(let b=0;b<8;b++){
   const chord=triad(b);
   const pulse=(b*3+Math.floor(r("bass")*4))%16;
   const bassSteps=euclidean(2+Math.floor(b/3),16,pulse);
   for(let i=0;i<16;i++)if(bassSteps[i]){
     add("bass",b*16+i,Math.min(6,16-i),.53,bassNote(b,i%4===0?7:0));
   }
   const chordStep=(b*3)%12;
   for(const n of chord)add("chords",b*16+chordStep,Math.min(10,16-chordStep),.2,n+12);
   for(let i=0;i<16;i++)if((i+b*2)%division===0&&r("arp")<.56+density*.3){
     add("arp",b*16+i,Math.min(3,16-i),.24,
       chord[(b+i)%3]+12);
   }
   const cadence=3+((b+Math.floor(r("lead")*3))%3);
   for(let i=0;i<16;i+=cadence){
     const step=b*16+i;
     if(r("lead")>.76)continue;
     const change=pick(()=>r("lead"),[-2,-1,0,1,2]);
     walk=clamp(walk+change*direction,0,8);
     if(r("lead")<.18)direction*=-1;
     let note=melodyDegree(walk,1);
     if(i===0||b===7&&i+cadence>=16)note=closestChord(note,b,60,96);
     add("lead",step,Math.min(4,16-i),.43+(r("lead")-.5)*.17,note);
   }
   if(b%2===0&&r("pad")<.86)for(const n of chord)
     add("pad",b*16,Math.min(30,128-b*16),.13,n+12);
   if(b%2===1)for(const i of [4,11])if(r("counter")<.55)
     add("counter",b*16+i,Math.min(4,16-i),.19,
       chord[(i+b)%3]+24);
 }
 percussion(c,"process");
}

// Ecology is a fifth, genuinely distinct symbolic composer. Unlike the four
// earlier modes it inherits a motif across chapters and plans harmony through
// a major/minor triad graph. Both rhythm and melody express the same genome.
function ecology(c,input){
 const {add,triad,root,bassNote,r,density}=c;
 const prior=input.ecologyGenome;
 const planned=prior||planEcology({seed:c.base.seed,key:c.base.key,mode:c.base.mode});
 const path=c.base.progression.map(chord=>{
   const [a,b]=chord.notes;
   return {root:((a%12)+12)%12,quality:((b-a+12)%12)===3?"minor":"major"};
 });
 const genome={...planned,path};
 const phase=genome.motif.phase;
 const variant=(input.variations?.lead||0)%4;
 const kind=["statement","answer","lift","reprise"][variant];
 let leadPrev=null;
 for(let bar=0;bar<8;bar++){
   const chord=path[bar],harmonic=triad(bar);
   const lead=livingMelody(genome,bar,kind);
   for(const e of lead){
     const note=leadPrev===null?e.note:
       Math.abs(e.note-leadPrev)>9?
         nearestChordTone(leadPrev+Math.sign(e.note-leadPrev)*5,chord,63,93):e.note;
     add("lead",e.step,e.duration,e.velocity+(kind==="lift"?.07:0),note);
     leadPrev=note;
   }
   const bassRhythm=euclideanPositions(genome.motif.bassPulses,phase+bar*2);
   for(let index=0;index<bassRhythm.length;index++){
     const step=bassRhythm[index];
     add("bass",bar*16+step,Math.min(6,16-step),index===0?.68:.51,
       bassNote(bar,index===bassRhythm.length-1&&bar%2===1?7:0));
   }
   // Smooth-register chord voicings stay anchored to the Tonnetz plan.
   const rhythm=bar%2===0?[0,8]:[0,10];
   for(const step of rhythm)if(step===0||r("chords")<.63)
     for(const note of harmonic)add("chords",bar*16+step,Math.min(8,16-step),.2,note+12);
   const arpRhythm=euclideanPositions(5+Math.round(density*3),phase+bar*5);
   for(let i=0;i<arpRhythm.length;i++){
     const step=arpRhythm[i];
     if(r("arp")>.59+density*.22)continue;
     add("arp",bar*16+step,Math.min(2,16-step),.22,
       harmonic[(i+bar)%3]+12);
   }
   if(bar%2===0)for(const note of harmonic)
     add("pad",bar*16,Math.min(25,128-bar*16),.12,note+12);
   if(bar%2===1){
     for(const step of [5,13]){
       if(r("counter")>.59)continue;
       // A response drawn from the *same* melodic genome rather than an
       // unrelated random melody, offset against the principal phrase.
       const answer=genome.motif.degrees[(bar+step)%genome.motif.degrees.length];
       const guess=77-answer*2;
       const note=nearestChordTone(guess,chord,64,91);
       add("counter",bar*16+step,Math.min(3.5,16-step),.24,note);
     }
   }
   const drums=euclideanPositions(6,phase+bar*3);
   for(const step of [0,8])if(r("kick")<.94)add("kick",bar*16+step,1,.72);
   for(const step of [4,12])if(r("snare")<.93)add("snare",bar*16+step,1,.65);
   for(const step of drums)if(r("hat")<.84)
     add("hat",bar*16+step,.5,.26);
   if(bar%2===1&&r("clap")<.5)add("clap",bar*16+12,.6,.31);
   if(bar%3===2)add("openhat",bar*16+14,1.5,.28);
   // Percussion shares the inherited rhythmic *genome*, not the currently
   // regenerated lead events: mutating lead alone never changes another track.
   const leadBeats=new Set(genome.motif.steps.map(step=>
     (step+(bar%2===1?1:0)+(bar>=4?1:0))%16));
   for(const step of euclideanPositions(3,phase+bar*7))
     if(!leadBeats.has(step)&&r("perc")<.36)
       add("perc",bar*16+step,.5,.27);
 }
}
// A seeded accompaniment grammar, independent of the lead regeneration.
// Preserve each engine's character but vary voicing, attack placement and
// density. The existing engine-specific chord loops are replaced by this.
function articulateChords(c,engine){
 c.events.splice(0,c.events.length,...c.events.filter(e=>e.track!=="chords"));
 const {r,triad,add}=c;
 const options={
   pattern:[[0,8],[2,6,10,14],[0,7,11],[4,12],[0,4,10,14]],
   melodic:[[0],[0,8],[2,10],[0,6,12],[4,12]],
   ambient:[[0],[0,8],[2],[4],[0,10]],
   process:[[0,5,10],[0,7,13],[3,11],[0,4,8,12],[2,9,14]],
   ecology:[[0,8],[0,10],[3,11],[0,6,12],[2,6,10,14]]
 };
 const length=engine==="ambient"?24:engine==="melodic"?10:engine==="process"?8:6;
 const rhythmA=pick(()=>r("chords"),options[engine]);
 const rhythmB=pick(()=>r("chords"),options[engine]);
 const register=pick(()=>r("chords"),[0,0,12]);
 let previous=null;
 for(let bar=0;bar<8;bar++){
   const triadNotes=triad(bar);
   const candidates=[];
   for(let inversion=0;inversion<3;inversion++){
     const rotated=triadNotes.slice(inversion).concat(triadNotes.slice(0,inversion).map(n=>n+12));
     for(const shift of [0,12]){
       const notes=rotated.map(n=>n+shift);
       if(notes[0]<52||notes.at(-1)>94)continue;
       const movement=previous?notes.reduce((sum,n,i)=>sum+Math.abs(n-previous[i]),0):
         Math.abs(notes[0]-(65+register));
       candidates.push({notes,cost:movement+(r("chords")-.5)*7});
     }
   }
   const picked=candidates.sort((a,b)=>a.cost-b.cost)[0]?.notes||triadNotes.map(n=>n+12);
   previous=picked;
   const pattern=bar===5?rhythmB:bar>=4&&bar!==7?rhythmB:rhythmA;
   for(const beat of pattern){
     if(engine==="ambient"&&beat>0&&r("chords")<.45)continue;
     if(engine!=="ambient"&&beat>0&&r("chords")<.12)continue;
     const duration=Math.min(16-beat,engine==="ambient"?length:
       engine==="melodic"?length:length+(r("chords")<.3?2:0));
     for(const pitch of picked)
       add("chords",bar*16+beat,duration,.17+r("chords")*.13,pitch);
   }
 }
}
const SYSTEMS={pattern,melodic,ambient,process,ecology};
export function composeWithEngine(input={}){
 const engine=ENGINE_IDS.includes(input.engine)?input.engine:"classic";
 const ecologyGenome=engine==="ecology"?(input.ecologyGenome||
   planEcology({seed:input.seed,key:input.key,mode:input.mode})):null;
 // The editor always supplies eight null override slots. Merge only actual
 // user edits over the Tonnetz walk; an empty slot means "generated chord".
 const source=ecologyGenome?{...input,
   harmonyOverrides:ecologyGenome.harmonyOverrides.map((generated,i)=>
     input.harmonyOverrides?.[i]||generated)}:input;
 const base=compose(source);
 if(engine==="classic")return {...base,engine};
 const c=createContext(source,base,engine);
 SYSTEMS[engine](c,{...source,ecologyGenome});
 articulateChords(c,engine);
 const events=c.events.sort((a,b)=>a.step-b.step||
   TRACKS.findIndex(t=>t.id===a.track)-TRACKS.findIndex(t=>t.id===b.track));
 return {...base,engine,events,ecologyGenome,identity:{...base.identity,system:engine},
   explanation:[
     COMPOSITION_ENGINES.find(x=>x.id===engine).description+".",
     "The harmony and key guide independently generated parts; sound comes exclusively from recorded samples.",
     "The "+engine+" system has its own note selection, phrase durations and rhythmic behaviour."
   ]};
}
