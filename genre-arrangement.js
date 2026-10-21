// Genre-specific symbolic music for Human Radio. NOT the regular editor.
// DnB: two-step break + slower, sparse bass phrase + restrained chord atmosphere.
// Pop: diatonic four-chord cycle + recurring chorus hook + verse/chorus arrangement.
// Uses existing real recorded instrument samples; no generated audio or synth.
import {chordsInKey,chordSymbol} from "./harmony.js";
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const PC=x=>((x%12)+12)%12;
function random(seed){
 let x=2166136261;
 for(const ch of String(seed))x=Math.imul(x^ch.charCodeAt(0),16777619)>>>0;
 return ()=>{x=(x+0x6d2b79f5)>>>0;let z=x;z=Math.imul(z^(z>>>15),z|1);z^=z+Math.imul(z^(z>>>7),z|61);return((z^(z>>>14))>>>0)/4294967296;};
}
const choose=(r,list)=>list[Math.floor(r()*list.length)];
export function planGenreHarmony({channel,seed,key,mode}){
 if(channel!=="pop"&&channel!=="dnb")return null;
 const r=random(seed+"|genre-harmony"),diatonic=chordsInKey(key,mode);
 const pop=mode==="minor"?
  [[0,5,3,4],[0,3,5,4],[5,3,0,4],[0,5,6,3],[0,3,4,5]]:
  [[0,4,5,3],[5,3,0,4],[0,5,3,4],[0,3,4,3],[0,4,3,4],[5,4,0,3]];
 const dnb=mode==="minor"?
  [[0,5,3,4],[0,3,5,4],[0,6,5,3],[0,3,0,5],[0,5,0,3]]:
  [[5,3,0,4],[0,5,3,4],[0,3,5,4]];
 const degrees=choose(r,channel==="pop"?pop:dnb);
 // Pop: a familiar four-bar cycle returning twice.
 // DnB: each harmony lasts two bars; bass can breathe at 170-176 BPM.
 return channel==="pop"?
   [...degrees,...degrees].map(d=>diatonic[d]):
   degrees.flatMap(d=>[diatonic[d],diatonic[d]]);
}
function voicedTriad(chord,target=68){
 const base=chord.notes.slice(0,3);
 const candidate=[];
 for(let inversion=0;inversion<3;inversion++){
   const shifted=base.slice(inversion).concat(base.slice(0,inversion).map(x=>x+12));
   for(const octave of [-12,0,12]){
     const notes=shifted.map(n=>n+12+octave);
     if(notes[0]>=53&&notes[2]<=92)
       candidate.push({notes,cost:Math.abs((notes[0]+notes[2])/2-target)});
   }
 }
 return candidate.sort((a,b)=>a.cost-b.cost)[0]?.notes||base.map(x=>x+12);
}
function chordToneNear(target,chord,low=61,high=90){
 const pcs=new Set(chord.notes.slice(0,3).map(PC)),candidates=[];
 for(let n=low;n<=high;n++)if(pcs.has(PC(n)))candidates.push(n);
 return candidates.reduce((best,n)=>Math.abs(n-target)<Math.abs(best-target)?n:best,candidates[0]);
}
function bassRoot(chord){
 let note=chord.notes[0]-24;
 while(note<33)note+=12;
 while(note>46)note-=12;
 return note;
}
function event(track,bar,step,note,duration,velocity){
 return {track,step:bar*16+step,note,duration:Math.min(duration,16-step),
   velocity:Math.round(clamp(velocity,.06,.95)*100)/100};
}
function popMusic(source,seed,role){
 const r=random(seed+"|pop-music"),out=[];
 const chorus=["lift","reprise","return"].includes(role);
 const intro=role==="opening",bridge=role==="breakdown",answer=role==="answer";
 const roots=source.progression;
 const patterns=[
   {steps:[0,3,6,10,13],contour:[0,2,1,4,2]},
   {steps:[0,4,7,10,12,14],contour:[0,1,3,2,4,2]},
   {steps:[2,5,8,11,14],contour:[0,3,2,1,4]},
   {steps:[0,3,7,9,12,14],contour:[0,2,4,3,1,2]},
   {steps:[0,2,6,10,13,15],contour:[0,1,3,1,4,2]}
 ];
 const hook=choose(r,patterns);
 const baseDegree=Math.floor(r()*3),shift=choose(r,[-2,-1,0,0,1,2]);
 const chordBeats=choose(r,[[0,8],[0,4,8,12],[0,8,12],[2,10]]);
 for(let bar=0;bar<8;bar++){
   const chord=roots[bar],next=roots[Math.min(7,bar+1)];
   // Pop bass changes with the chords, retaining a singable, bouncy motif.
   const bass=bassRoot(chord);
   const bassBeats=chorus?[0,4,8,10,12]:bridge?[0,8]:[0,7,10,14];
   for(let i=0;i<bassBeats.length;i++){
     const step=bassBeats[i];
     const fifth=(i===bassBeats.length-2&&r()<.76)?7:0;
     const target=i===bassBeats.length-1&&bar%4===3?
       bassRoot(next):bass+fifth;
     out.push(event("bass",bar,step,clamp(target,33,55),
       chorus?Math.min(3.5,16-step):Math.min(6,16-step),
       chorus?.71:.62));
   }
   const notes=voicedTriad(chord,chorus?72:66);
   const chordTimes=chorus?chordBeats:bridge?[0]:[0,8];
   for(const pos of chordTimes){
     const level=chorus?.27:bridge?.12:.19;
     for(const n of notes)out.push(event("chords",bar,pos,n,
       chorus?Math.min(3.5,16-pos):Math.min(7.5,16-pos),level));
   }
   if(bar%2===0&&!chorus){
     // One quiet texture is sufficient: avoid a generic constant arpeggio.
     for(const n of notes)out.push(event("pad",bar,0,n,15,.1));
   }
   if(chorus&&bar%2===1)for(let i=0;i<4;i++){
     const pos=[2,6,10,14][i];
     out.push(event("arp",bar,pos,notes[i%3]+(i===3?12:0),1.8,.19));
   }
   // Hook is reintroduced during chorus/reprise, with controlled answer phrases
   // during verses. Contour is rooted on the current chord, not rolled per note.
   if(!intro||bar>=2){
     const phraseAnswer=!chorus&&(bar%4>=2||answer);
     const beats=hook.steps;
     const centre=chordToneNear(71+shift*2,chord,64,84);
     for(let i=0;i<beats.length;i++){
       if(bridge&&i%2===1)continue;
       const pos=beats[i];
       const contour=hook.contour[i%hook.contour.length];
       const motion=phraseAnswer?(i%2?-1:1)*(contour-baseDegree):contour-baseDegree;
       let pitch=chordToneNear(centre+motion*2,chord,64,89);
       if(i!==0&&pos%4!==0&&r()<.3){
         // Small diatonic neighbour on an unaccented passing note.
         const neighbour=pitch+(r()<.5?-2:2);
         if(neighbour>=64&&neighbour<=89)pitch=neighbour;
       }
       if(bar===7&&i===beats.length-1)pitch=chordToneNear(centre,chord,64,89);
       const nextPos=beats[i+1]??16;
       out.push(event("lead",bar,pos,pitch,Math.min(5.5,Math.max(1,nextPos-pos-.25)),
         chorus?.76:bridge?.38:.59));
     }
   }
   if(chorus&&bar%2===1){
     for(const pos of [0,8])out.push(event("counter",bar,pos,
       chordToneNear(78,chord,68,89),Math.min(5,16-pos),.17));
   }
 }
 return out.sort((a,b)=>a.step-b.step);
}
function drumBassMusic(source,seed,role){
 const r=random(seed+"|dnb-music"),out=[];
 const drop=["lift","reprise","return"].includes(role);
 const intro=role==="opening",breakdown=role==="breakdown";
 const liquid=source.scene==="liquid";
 const bassFigures=[[0,10],[0,7,10],[0,10,14],[0,6,10],[0,10,15]];
 const figure=choose(r,bassFigures);
 const leadShapes=[[0,2,3,1],[0,1,3,2],[0,3,2,4],[0,2,4,2]];
 const leadShape=choose(r,leadShapes);
 const leadSteps=liquid?[0,6,10,14]:[2,8,12];
 for(let bar=0;bar<8;bar++){
   const chord=source.progression[bar],next=source.progression[Math.min(7,bar+1)];
   const bass=bassRoot(chord);
   // Bass uses *half-time* phrases against the fast two-step drums.
   // Leave the snare backbeats at 4/12 free of new bass attacks.
   let steps=intro?[0]:breakdown?[0,10]:figure;
   if(drop&&bar%4===3)steps=[0,10,14];
   for(let i=0;i<steps.length;i++){
     const pos=steps[i];
     const note=i===steps.length-1&&pos===14&&bar%2===1?
       bassRoot(next):bass+(i===1&&pos!==10&&r()<.24?12:0);
     const length=i===0?(steps[1]??16)-.6:
       (steps[i+1]??16)-pos-.7;
     const main=event("bass",bar,pos,clamp(note,33,52),Math.max(1.5,length),
       drop?.86:intro?.49:.72);
     out.push(main);
     // Use the rendered C1 sub as a low-frequency foundation. Drop an
     // octave where playable; on low notes stay on the same pitch class rather
     // than generating inaudible A0/D1 fundamentals below MIDI 28.
     if(drop||i===0){
       const octaveBelow=main.note-12;
       const subNote=octaveBelow>=28?octaveBelow:main.note;
       out.push({...main,note:subNote,sampleVoice:"dnbSub",
         velocity:drop?.23:.17});
     }
   }
   // Chords don't fire as 16th-note EDM arpeggios: restrained stabs/long
   // liquid pads leave room for bass and the break.
   const tones=voicedTriad(chord,liquid?70:64);
   if(bar%2===0||drop&&bar%2===1){
     const pos=drop&&!liquid?2:0;
     for(const tone of tones){
       if(liquid)out.push(event("pad",bar,0,tone,15,.15));
       if(!breakdown&&!intro)
         out.push(event("chords",bar,pos,tone,liquid?10:3.5,drop?.2:.14));
     }
   }
   if(!drop&&!intro&&liquid&&bar%2===1&&r()<.5)
     for(const tone of tones.slice(0,2))
       out.push(event("arp",bar,8,tone+12,Math.min(4,8),.14));
   // DnB must not sound like a randomly busy lead synth over a break.
   // The drop hook is sparse; liquid builds longer, lyrical phrases.
   if((drop||liquid&&!intro)&&!breakdown){
     const steps=drop?leadSteps:bar%2===0?[0,8]:[6,13];
     for(let i=0;i<steps.length;i++){
       if(!liquid&&!drop&&i>0)continue;
       const pos=steps[i],motion=leadShape[(i+bar%2)%leadShape.length]-2;
       const target=chordToneNear(74+motion*3,chord,66,90);
       out.push(event("lead",bar,pos,target,Math.min(liquid?6:3,16-pos),
         liquid?.31:.39));
     }
   }
 }
 return out.sort((a,b)=>a.step-b.step);
}
export function arrangeGenreMusic(source,channel,seed,role){
 if(channel==="pop")return popMusic(source,seed,role);
 if(channel==="dnb")return drumBassMusic(source,seed,role);
 return source.events;
}
