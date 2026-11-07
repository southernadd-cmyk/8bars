// Presentation-only song timeline for Human Radio. The player schedules
// sixteen 16th-note steps per bar, and eight bars per transport buffer.
// The song's true duration is its completed planned form, not a single buffer.
export const STEPS_PER_BAR=16;
export const STEPS_PER_SECTION=128;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function formatRadioTime(seconds){
 const s=Math.max(0,Math.floor(Number(seconds)||0));
 return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");
}
export function audibleSongStep({loops=0,step=0,stepTime=0,audioTime=0,bpm=100,totalSteps=0}={}){
 if(!Number.isFinite(bpm)||bpm<=0||!Number.isFinite(totalSteps)||totalSteps<=0)return 0;
 const secondsPerStep=60/bpm/4;
 // The sequencer schedules roughly .23 seconds *ahead* of audible output.
 // Subtract that look-ahead so the timeline follows what listeners hear.
 const pending=(Number(stepTime)-Number(audioTime))/secondsPerStep;
 return clamp((Number(loops)*STEPS_PER_SECTION+Number(step))-pending,0,totalSteps);
}
export function radioNowPlaying(piece,absoluteStep=0){
 if(!piece||!Number.isFinite(piece.bpm)||piece.bpm<=0)return null;
 const totalSections=piece.sections?.length||piece.targetLoops||0;
 if(!totalSections)return null;
 const totalSteps=totalSections*STEPS_PER_SECTION;
 const position=clamp(Number(absoluteStep)||0,0,totalSteps);
 const sectionIndex=clamp(Math.floor(position/STEPS_PER_SECTION),0,totalSections-1);
 const section=piece.sections?.[sectionIndex];
 const totalBars=totalSections*8;
 const bar=clamp(Math.floor(position/STEPS_PER_BAR)+1,1,totalBars);
 const secondsPerStep=60/piece.bpm/4;
 const elapsed=Math.min(position,totalSteps)*secondsPerStep;
 const total=totalSteps*secondsPerStep;
 return {
  progress:position/totalSteps*100,
  elapsed:formatRadioTime(elapsed),
  total:formatRadioTime(total),
  bar,totalBars,
  sectionIndex,
  sectionCount:totalSections,
  sectionName:section?.name||"Movement "+(sectionIndex+1),
  channel:piece.channel||"mixed",
  bpm:Math.round(piece.bpm),
  scene:piece.sceneName||piece.scene||"",
  style:piece.style||"",
  key:piece.key||"",
  mode:piece.mode||""
 };
}
