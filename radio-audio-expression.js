// Keep all envelope maths independently testable from Web Audio, so the
// sound engine receives continuous, click-free note schedules, not ad-hoc
// randomized gain changes inside a real-time callback.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function performedTiming(event,{when,stepSeconds,bufferSeconds,playbackRate=1}){
 const perf=event?.performance||{};
 if(!Number.isFinite(when)||!Number.isFinite(stepSeconds)||
   !Number.isFinite(bufferSeconds)||stepSeconds<=0||
   bufferSeconds<=0||playbackRate<=0)
  throw new RangeError("Invalid playback timing");
 const shift=clamp(Number(perf.offsetMs)||0,-25,25)/1000;
 const attackAt=when+shift;
 const scale=clamp(Number(perf.lengthScale)||1,.40,1.15);
 const duration=Math.min(bufferSeconds/playbackRate,
   Math.max(.04,(Number(event.duration)||1)*stepSeconds*scale));
 const attack=clamp((Number(perf.attackMs)||0)/1000,0,duration*.30);
 const release=perf.releaseMs==null?Math.min(.075,duration*.35):
  clamp((Number(perf.releaseMs)||0)/1000,0,duration*.4);
 return {attackAt,duration,attack,release,
  hold:Math.max(0,duration-attack-release),
  gainScale:clamp(Number(perf.velocityScale)||1,.75,1.12)};
}
export function setPerformedEnvelope(gain,param){
 const {attackAt,duration,attack,release,amp}=param;
 if(!Number.isFinite(amp)||amp<=0)throw new RangeError("Expected positive note amplitude");
 const initial=Math.max(.0001,amp*.002);
 if(attack>0){
  gain.setValueAtTime(initial,attackAt);
  gain.linearRampToValueAtTime(amp,attackAt+attack);
 }else gain.setValueAtTime(amp,attackAt);
 gain.setValueAtTime(amp,attackAt+Math.max(attack,duration-release));
 gain.linearRampToValueAtTime(.0001,attackAt+duration);
 return attackAt+duration;
}
