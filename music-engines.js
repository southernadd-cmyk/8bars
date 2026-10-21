// Independent rule-based composition systems for 8bars.
// All produce the same symbolic event format and use the same *recorded*
// instruments at playback; there is no oscillator, synthesized fallback,
// audio dependency or DOM dependency in these composition engines.
import {compose,rng,euclidean,TRACKS} from "./composer.js";

export const COMPOSITION_ENGINES=[
 {id:"classic",name:"Original",description:"The original eight-bar composer"},
 {id:"pattern",name:"Pattern",description:"Bass hooks, repeated grooves and rhythmic transformations"},
 {id:"melodic",name:"Melodic",description:"Call-and-response phrases with voice leading"},
 {id:"ambient",name:"Ambient",description:"Long tones, silence and slow harmonic drift"},
 {id:"process",name:"Process",description:"Gradual probability and phase-driven change"}
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
 const hook=pick(()=>r("lead"),[[0,2,4,7],[0,3,5,7],[0,4,7,4],[0,2,5,3]]);
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
   for(let i=0;i<hook.length;i++){
     const beat=[0,3,7,11][i]+(b%2===1?1:0);
     const note=chord[hook[i]%3]+24+(hook[i]>=5?12:0);
     add("lead",b*16+beat,2.5,.52,note);
   }
   if(b%2===1)for(const i of [4,12])
     add("counter",b*16+i,3,.28,chord[(i/4+1)%3]+12);
   if(b%4===0)for(const n of chord)
     add("pad",b*16,Math.min(27,128-b*16),.12,n+12);
 }
 percussion(c,"pattern");
}
function melodic(c){
 const {add,r,triad,melodyDegree,closestChord,bassNote}=c;
 // In this system the phrase is primary. Four two-bar questions are answered
 // by related two-bar phrases with controlled interval movement and rests.
 const outline=[0,1,2,4,3,2,1,0];
 const motion=[0,2,4,7,9,12,14];
 const phase=round(r("lead")*3);
 for(let b=0;b<8;b++){
   const response=b%2===1,starts=response?[2,6,10,14]:[0,4,7,12];
   let last=null;
   starts.forEach((step,i)=>{
     const source=outline[(b*2+i+phase)%outline.length];
     let target=melodyDegree(source+(response?2:0),1)+(b>=4?12:0);
     if(i===0||i===3)target=closestChord(target,b,62,96);
     if(last!==null&&Math.abs(target-last)>12)
       target+=target>last?-12:12;
     target=clamp(target,55,100);
     add("lead",b*16+step,response?3.2:2.7,.56+(response?.04:0),target);
     last=target;
   });
   const chord=triad(b);
   add("bass",b*16,11,.59,bassNote(b));
   if(b%2===1)add("bass",b*16+12,3,.36,bassNote(b,7));
   for(const n of chord)add("chords",b*16,11,.23,n+12);
   if(b%2===1)for(const n of chord)add("pad",b*16,14,.12,n+12);
   for(const i of [3,9]){
     if(r("counter")<.57)
       add("counter",b*16+i,4,.26,chord[(i+b)%3]+12);
   }
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
const SYSTEMS={pattern,melodic,ambient,process};
export function composeWithEngine(input={}){
 const engine=ENGINE_IDS.includes(input.engine)?input.engine:"classic";
 const base=compose(input);
 if(engine==="classic")return {...base,engine};
 const c=createContext(input,base,engine);
 SYSTEMS[engine](c);
 const events=c.events.sort((a,b)=>a.step-b.step||
   TRACKS.findIndex(t=>t.id===a.track)-TRACKS.findIndex(t=>t.id===b.track));
 return {...base,engine,events,identity:{...base.identity,system:engine},
   explanation:[
     COMPOSITION_ENGINES.find(x=>x.id===engine).description+".",
     "The harmony and key guide independently generated parts; sound comes exclusively from recorded samples.",
     "The "+engine+" system has its own note selection, phrase durations and rhythmic behaviour."
   ]};
}
