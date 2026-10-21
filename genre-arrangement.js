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
export function planGenreHarmony({channel,seed,key,mode,scene=""}){
 if(!["pop","dnb","hiphop"].includes(channel))return null;
 const r=random(seed+"|genre-harmony"),diatonic=chordsInKey(key,mode);
 const pop=mode==="minor"?
  [[0,5,3,4],[0,3,5,4],[5,3,0,4],[0,5,6,3],[0,3,4,5]]:
  [[0,4,5,3],[5,3,0,4],[0,5,3,4],[0,3,4,3],[0,4,3,4],[5,4,0,3]];
 const dnb=mode==="minor"?
  [[0,5,3,4],[0,3,5,4],[0,6,5,3],[0,3,0,5],[0,5,0,3]]:
  [[5,3,0,4],[0,5,3,4],[0,3,5,4]];
 const hiphop=mode==="minor"?[[0,5,3,4],[0,3,0,5],[0,6,5,3],[0,3,5,3]]:[[0,5,3,4],[0,3,4,3],[0,4,5,3],[0,5,0,3]];
 const degrees=[...choose(r,channel==="pop"?pop:channel==="hiphop"?hiphop:dnb)];
 // Controlled harmonic grammar: the genre decides what is plausible,
 // but each seed independently chooses substitutions inside that grammar.
 // Repetition happens WITHIN a song, not across every newly generated song.
 const middle=channel==="dnb"?[0,3,5,6]:channel==="hiphop"?[0,2,3,5,6]:[0,3,4,5,6];
 for(const index of [1,2,3]){
   const chance=index===3?.38:.61;
   if(r()<chance){
     const pool=middle.filter(n=>n!==degrees[index]&&
       (index===1||n!==degrees[index-1]));
     degrees[index]=choose(r,pool);
   }
 }
 if(channel==="pop"&&degrees[0]!==0&&r()<.25)degrees[0]=0;
 // Pop: a familiar four-bar cycle returning twice.
 // DnB: each harmony lasts two bars; bass can breathe at 170-176 BPM.
 return channel==="pop"||channel==="hiphop"?
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
// Build an actual seed-specific phrase rather than choosing a canned melody.
// Rhythmic placements, note count, contour and register are independent
// dimensions. The same seed recreates the same hook in each reprise.
function phraseBlueprint(r,minNotes,maxNotes,options={}){
 const count=minNotes+Math.floor(r()*(maxNotes-minNotes+1));
 const {sparse=false,firstOnBeat=false}=options;
 const pool=sparse?[0,2,4,6,8,10,12,14]:[0,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
 const steps=new Set([firstOnBeat?0:(r()<.68?0:pool[Math.floor(r()*4)])]);
 while(steps.size<count)steps.add(choose(r,pool));
 const rhythm=[...steps].sort((a,b)=>a-b);
 const contour=[];
 let height=Math.floor(r()*5)-2;
 const direction=r()<.5?-1:1;
 const leaps=[-3,-2,-1,-1,0,1,1,2,3];
 for(let i=0;i<rhythm.length;i++){
   if(i>0)height=clamp(height+choose(r,leaps)+(r()<.16?direction:0),-5,5);
   contour.push(height);
 }
 return {rhythm,contour,centre:choose(r,[-8,-5,-2,0,3,5,8]),
   articulation:choose(r,[.68,.82,.95]),shape:choose(r,[0,1,2])};
}
const KEY_PCS=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
function nearestDiatonic(source,target,low,high){
 const tonic=KEY_PCS.indexOf(source.key);
 if(tonic<0)return target;
 const scale=source.mode==="minor"?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11];
 const pitchClasses=new Set(scale.map(n=>(tonic+n)%12));
 const candidates=[];
 for(let n=low;n<=high;n++)if(pitchClasses.has(PC(n)))candidates.push(n);
 return candidates.reduce((best,n)=>Math.abs(n-target)<Math.abs(best-target)?n:best,candidates[0]??target);
}
function phrasePitch(source,chord,target,step,r,low=60,high=89){
 // Phrase anchors stay in the harmony. Short weak notes may become diatonic
 // passing tones, giving the tune melodic motion without random chromatics.
 const chordPitch=chordToneNear(target,chord,low,high);
 if(step%4===0||r()>.27)return chordPitch;
 const passing=nearestDiatonic(source,target+(r()<.5?-2:2),low,high);
 return Math.abs(passing-chordPitch)<=5?passing:chordPitch;
}
function popMusic(source,seed,role){
 const r=random(seed+"|pop-music"),out=[];
 const chorus=["lift","reprise","return"].includes(role);
 const intro=role==="opening",bridge=role==="breakdown",answer=role==="answer";
 const roots=source.progression;
 // Song-level hook identity: 3–7 notes, chosen rhythmic subdivisions,
 // independently shaped pitch motion and register. Reprises use this same hook.
 const hook=phraseBlueprint(r,3,7,{firstOnBeat:source.scene!=="indie"});
 const shift=choose(r,[-5,-3,-1,0,2,4,6]);
 const chordBeats=choose(r,[[0,8],[0,4,8,12],[0,8,12],[2,10],[0,6,12],[0,12],[0,4,10]]);
 const verseBass=choose(r,[[0,7,10],[0,8,13],[0,6,10,14],[0,9,12]]);
 const chorusBass=choose(r,[[0,4,8,10,12],[0,3,7,10,13],[0,4,7,11,14],[0,5,8,11,14],[0,4,8,12,15]]);
 const bassAccent=choose(r,[0,5,7,12]);
 for(let bar=0;bar<8;bar++){
   const chord=roots[bar],next=roots[Math.min(7,bar+1)];
   // Pop bass changes with the chords, retaining a singable, bouncy motif.
   const bass=bassRoot(chord);
   const bassBeats=chorus?chorusBass:bridge?[0,8]:verseBass;
   for(let i=0;i<bassBeats.length;i++){
     const step=bassBeats[i];
     const fifth=i>0&&i===bassBeats.length-2&&r()<.62?bassAccent:0;
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
     const beats=hook.rhythm;
     const centre=71+shift+hook.centre;
     for(let i=0;i<beats.length;i++){
       if(bridge&&i%2===1)continue;
       const pos=beats[i];
       const contour=hook.contour[i];
       const motion=phraseAnswer?-contour:contour;
       let pitch=phrasePitch(source,chord,centre+motion*3,pos,r,62,89);
       if(bar===7&&i===beats.length-1)pitch=chordToneNear(centre,chord,62,89);
       const nextPos=beats[i+1]??16;
       out.push(event("lead",bar,pos,pitch,
         Math.min(6,Math.max(.75,(nextPos-pos-.2)*hook.articulation)),
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
 const bassFigures=source.scene==="jungle"?[[0,7,10],[0,10,14],[0,6,11]]:
   source.scene==="techstep"?[[0,10],[0,9],[0,10,15]]:
   source.scene==="jump-up"?[[0,6,10],[0,10,14],[0,7,10]]:
   [[0,10],[0,7,10],[0,10,14],[0,6,10],[0,10,15]];
 const figure=choose(r,bassFigures);
 const turnaround=choose(r,[[0,10,14],[0,7,10],[0,9,14],[0,6,11]]);
 const bassMovement=choose(r,[[0,0,7],[0,7,0],[0,12,7],[0,-5,0],[0,0,12]]);
 const leadHook=phraseBlueprint(r,liquid?3:2,liquid?4:3,
   {sparse:source.scene==="techstep",firstOnBeat:liquid});
 const leadCentre=choose(r,[-6,-3,0,3,6]);
 for(let bar=0;bar<8;bar++){
   const chord=source.progression[bar],next=source.progression[Math.min(7,bar+1)];
   const bass=bassRoot(chord);
   // Bass uses *half-time* phrases against the fast two-step drums.
   // Leave the snare backbeats at 4/12 free of new bass attacks.
   let steps=intro?[0]:breakdown?[0,10]:figure;
   if(drop&&bar%4===3)steps=turnaround;
   for(let i=0;i<steps.length;i++){
     const pos=steps[i];
     const phraseMove=bassMovement[(i+bar%2)%bassMovement.length];
     let note=i===steps.length-1&&bar%4===3&&r()<.43?
       bassRoot(next):bass+phraseMove;
     // Keep real sample transpositions in an appropriate audible bass range.
     while(note>52)note-=12;
     while(note<33)note+=12;
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
     const steps=drop?leadHook.rhythm:
       bar%2===0?leadHook.rhythm.slice(0,2):leadHook.rhythm.slice(-2);
     for(let i=0;i<steps.length;i++){
       if(!liquid&&!drop&&i>0)continue;
       const pos=steps[i],motion=leadHook.contour[i%leadHook.contour.length];
       // Cello recordings have a lower melodic register than violin/keys.
       const celloLead=liquid&&source.leadVoice==="cello";
       const low=celloLead?55:66,high=celloLead?74:90;
       const target=phrasePitch(source,chord,
         (celloLead?65:74)+leadCentre+leadHook.centre+motion*3,
         pos,r,low,high);
       out.push(event("lead",bar,pos,target,Math.min(liquid?7:4,16-pos),
         liquid?.31:.39));
     }
   }
 }
 return out.sort((a,b)=>a.step-b.step);
}

function hiphopMusic(source,seed,role){
 const r=random(seed+"|hiphop-arrangement"),out=[];
 const scene=source.scene||"boom-bap";
 const trap=scene==="trap",west=scene==="west-coast";
 const lofi=scene==="lofi",headnod=scene==="head-nod";
 const lift=["lift","reprise","return"].includes(role);
 const quiet=["opening","breakdown"].includes(role);
 const answering=role==="answer";
 const leadFigures=trap?[[2,10],[0,11],[6,14]]:
   west?[[2,6,10,14],[0,7,11],[3,8,13]]:
   lofi?[[0,9],[2,10,14],[0,7]]:
   [[0,6,10],[2,8,14],[0,7,12],[3,10]];
 const figure=choose(r,leadFigures);
 // Seed independent rhythm displacement, motif register and bass pickups;
 // a new chapter must not merely replay one of three canned phrases.
 const motifOffset=choose(r,[-2,-1,0,1,2]);
 const centreOffset=choose(r,[-7,-4,0,4,7]);
 const bassPickup=choose(r,[-1,0,1]);
 const motion=choose(r,[[0,2,1,-1],[0,-2,1,2],[1,0,-1,2],[0,1,3,1]]);
 const bassSteps=trap?[0,7,11]:west?[0,3,7,11]:
   lofi?[0,10]:headnod?[0,9,13]:[0,7,10,14];
 const chordSteps=trap?[0]:west?[0,8]:lofi?[0]:[0,8];
 for(let bar=0;bar<8;bar++){
   const chord=source.progression[bar],next=source.progression[Math.min(7,bar+1)];
   const root=bassRoot(chord),tones=voicedTriad(chord,lofi?66:west?72:68);
   const bassPositions=quiet?bassSteps.slice(0,1):bassSteps;
   for(let i=0;i<bassPositions.length;i++){
     const pos=i===0?0:clamp(bassPositions[i]+bassPickup,1,15);
     const nextPos=bassPositions[i+1]===undefined?16:
       Math.max(pos+1,clamp(bassPositions[i+1]+bassPickup,1,16));
     const walk=i===bassPositions.length-1&&bar%4===3;
     const pitch=walk?bassRoot(next):root+(west&&i%2===1?7:0);
     out.push(event("bass",bar,pos,clamp(pitch,33,52),
       Math.max(1.5,Math.min(trap?7:lofi?8:5,nextPos-pos-.3)),
       quiet?.45:trap?.8:west?.76:.64));
   }
   if(!quiet||bar%2===0){
     for(const pos of chordSteps){
       if(trap&&bar%2===1)continue;
       for(const n of tones)out.push(event("chords",bar,pos,n,
         Math.min(lofi?12:trap?8:west?3.5:6,16-pos),
         quiet?.11:lofi?.18:trap?.12:.23));
     }
   }
   if(lofi&&bar%2===0)for(const n of tones)
     out.push(event("pad",bar,0,n,15,.095));
   // Recognisable two-bar phrase with contrast between sparse verses and hooks.
   if(!quiet||(!trap&&!lofi&&bar>=4)){
     const phraseBar=bar%2,active=lift||!trap||bar%2===0;
     if(active){
       for(let i=0;i<figure.length;i++){
         if(quiet&&i>0)continue;
         if(!lift&&trap&&i>1)continue;
         if(!lift&&lofi&&i>1)continue;
         const pos=clamp(figure[i]+motifOffset,0,15);
         const last=figure[i+1]===undefined?16:
           Math.max(pos+1,clamp(figure[i+1]+motifOffset,0,16));
         const shift=motion[(i+phraseBar)%motion.length]*(answering?-1:1);
         const pitch=chordToneNear((west?73:lofi?68:71)+centreOffset+shift*2,chord,60,84);
         out.push(event("lead",bar,pos,pitch,
           Math.min(trap?3.5:lofi?6:4.5,Math.max(1,last-pos-.35)),
           lift?.47:trap?.24:lofi?.25:.34));
       }
     }
   }
   if(west&&lift&&bar%2===1)for(const pos of [4,12]){
     out.push(event("arp",bar,pos,chordToneNear(77,chord,68,86),1.7,.18));
   }
 }
 return out.sort((a,b)=>a.step-b.step);
}
export function arrangeGenreMusic(source,channel,seed,role){
 if(channel==="pop")return popMusic(source,seed,role);
 if(channel==="hiphop")return hiphopMusic(source,seed,role);
 if(channel==="dnb")return drumBassMusic(source,seed,role);
 return source.events;
}
