/**
 * Stable Web Audio step transport. Playback isn't dependent on sample fetches,
 * UI paint time, or interval callbacks firing at exactly the requested time.
 */
export function createTransport({onStep,onError=()=>{},onProgress=()=>{},steps=128,lookAhead=.20}){
 if(typeof onStep!=="function")throw new TypeError("onStep required");
 let timer=null,ctx=null,period=0,step=0,nextTime=0,total=0,skipped=0,failures=0,active=false;
 const snapshot=()=>({active,step,total,skipped,failures,nextTime});
 function pump(){
  if(!active||!ctx)return snapshot();
  const now=ctx.currentTime;
  if(!Number.isFinite(now))return snapshot();
  // If an overwhelmed tab falls behind, skip missed steps rather than sending
  // dozens of stale notes at once and blocking the next musical phrase.
  if(nextTime<now-.025){
   const missed=Math.ceil((now-.025-nextTime)/period);
   if(missed>0){step=(step+missed)%steps;nextTime+=missed*period;skipped+=missed;}
  }
  let iterations=0;
  while(active&&nextTime<now+lookAhead&&iterations<Math.max(steps,64)){
   const current=step,when=nextTime;
   try{onStep(current,when,period)}catch(error){
    failures++;try{onError(error,current)}catch{}
   }
   total++;iterations++;step=(step+1)%steps;nextTime+=period;
  }
  try{onProgress(snapshot())}catch{}
  return snapshot();
 }
 function start(context,bpm,{timerEnabled=true}={}){
  if(active)stop();
  if(!context||!Number.isFinite(context.currentTime))throw new Error("Valid audio context required");
  const rate=Number(bpm);if(!Number.isFinite(rate)||rate<=0)throw new Error("BPM must be positive");
  ctx=context;period=60/rate/4;step=0;nextTime=ctx.currentTime+.08;
  total=0;skipped=0;failures=0;active=true;
  pump();
  if(timerEnabled)timer=setInterval(pump,25);
  return snapshot();
 }
 function stop(){active=false;if(timer!==null){clearInterval(timer);timer=null}return snapshot()}
 return {start,stop,pump,snapshot};
}
