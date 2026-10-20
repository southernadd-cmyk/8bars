// Lightweight tonal guidance, not strict classical harmonisation.
// Decisions are pure and deterministic for the supplied random stream.
export const CADENCES={
 authentic:{before:4,end:0,label:"Dominant → tonic"},
 plagal:{before:3,end:0,label:"Subdominant → tonic"},
 deceptive:{before:4,end:5,label:"Dominant → unexpected resolution"},
 half:{before:1,end:4,label:"Open dominant ending"},
 modal:{before:6,end:0,label:"Modal return"}
};
const CADENCE_WEIGHTS={
 house:["authentic","authentic","plagal","deceptive","half"],
 breakbeat:["authentic","deceptive","half","plagal","modal"],
 downtempo:["authentic","plagal","deceptive","half","modal"],
 ambient:["plagal","modal","half","deceptive","authentic"]
};
export function planCadence(degrees,style,random){
 if(!Array.isArray(degrees)||degrees.length!==8)throw new Error("Need an eight-bar plan");
 const pool=CADENCE_WEIGHTS[style]||CADENCE_WEIGHTS.downtempo;
 const name=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
 const cadence=CADENCES[name];
 const result=degrees.slice();
 result[6]=cadence.before;
 result[7]=cadence.end;
 return {degrees:result,name,description:cadence.label};
}
const pc=x=>((x%12)+12)%12;
export function pitchClassInChord(note,chord){return chord.some(n=>pc(n)===pc(note))}
export function voiceLedPitch({target,chord,scale,tonic,previous=null,previousLeap=0,strong=false,final=false,cadence="authentic"}){
 if(!chord?.length||!scale?.length)throw new Error("Chord and scale required");
 // Generate diatonic candidates in a broad melodic register, plus alterations
 // belonging to the current chord (e.g. harmonic-minor leading tones).
 const notes=new Set();
 for(let octave=0;octave<=4;octave++){
   for(const degree of scale){
     const note=tonic+octave*12+degree;
     if(note>=62&&note<=101)notes.add(note);
   }
 }
 for(const chordTone of chord)for(const octave of [-12,0,12,24]){
   const note=chordTone+octave;
   if(note>=62&&note<=101)notes.add(note);
 }
 if(!notes.size)return Math.round(target);
 const tonicPc=pc(tonic),endOnTonic=final&&["authentic","plagal","modal"].includes(cadence);
 let best=null,bestScore=Infinity;
 for(const note of notes){
   const chordTone=pitchClassInChord(note,chord);
   if(endOnTonic&&pc(note)!==tonicPc)continue;
   let score=Math.abs(note-target)*.62;
   if(strong&&!chordTone)score+=9;
   if(!strong&&!chordTone)score+=1.7; // passing tones allowed on weaker accents
   if(previous!==null){
     const step=note-previous,distance=Math.abs(step);
     score+=distance<=2?(distance===0?1.4:0):distance<=5?.55:distance<=7?2:2+(distance-7)*2.7;
     if(Math.abs(previousLeap)>=5){
       if(Math.sign(step)===Math.sign(previousLeap))score+=8;
       if(distance>3)score+=4;
     }
     if(pc(previous)===pc(tonic-1)&&pc(note)===tonicPc)score-=2; // leading tone → tonic
   }
   if(final&&cadence==="half"&&!chordTone)score+=12;
   if(final&&cadence==="deceptive"&&!chordTone)score+=12;
   if(score<bestScore||(score===bestScore&&(best===null||note<best))){bestScore=score;best=note}
 }
 return best??Math.round(target);
}
