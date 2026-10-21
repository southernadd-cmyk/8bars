// Human Radio's musical memory and scene planning. Pure functions, no Web Audio
// or DOM dependencies. The music itself is composed in composer.js from real recordings.
export const RADIO_SCENES=[
 {id:"drift",name:"Drift",styles:["ambient","downtempo"],bpm:[68,94],density:[.29,.53],swing:[.02,.13],loops:[5,6,7]},
 {id:"headnod",name:"Head-nod",styles:["downtempo","breakbeat"],bpm:[82,112],density:[.47,.74],swing:[.07,.26],loops:[5,6,6]},
 {id:"motion",name:"Motion",styles:["house","breakbeat"],bpm:[104,132],density:[.56,.87],swing:[0,.16],loops:[5,5,6]},
 {id:"afterhours",name:"After hours",styles:["ambient","house","downtempo"],bpm:[78,115],density:[.34,.7],swing:[.02,.2],loops:[5,6,7]}
];
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const choose=(values,random)=>values[Math.min(values.length-1,Math.floor(random()*values.length))];
export const PITCH_NAMES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const quant=(value,step)=>Math.round(value/step)*step;
// Each station scene favours compatible ways of composing while keeping the
// engine independent of the sample/genre choices.
const SCENE_ENGINES={
 drift:["ambient","ambient","process","melodic","ecology"],
 headnod:["melodic","pattern","melodic","process","ecology","ecology"],
 motion:["pattern","pattern","process","melodic","ecology"],
 afterhours:["ambient","process","melodic","pattern","ecology","ecology"]
};

export function chooseRadioProfile(previous=null,random=Math.random){
 const previousScene=RADIO_SCENES.find(x=>x.id===previous?.scene);
 const newScene=!previousScene||previous.sceneRemaining<=1;
 const choices=newScene?RADIO_SCENES.filter(x=>x.id!==previous?.scene):[previousScene];
 const scene=choose(choices,random);
 const sceneRemaining=newScene?choose([2,3,4,5],random):(previous.sceneRemaining-1);
 const targetBpm=quant(scene.bpm[0]+random()*(scene.bpm[1]-scene.bpm[0]),1);
 const bpm=previous?clamp(targetBpm,previous.bpm-12,previous.bpm+12):targetBpm;
 const targetDensity=scene.density[0]+random()*(scene.density[1]-scene.density[0]);
 const density=previous&&!newScene?clamp(targetDensity,previous.density-.13,previous.density+.13):targetDensity;
 const targetSwing=scene.swing[0]+random()*(scene.swing[1]-scene.swing[0]);
 const swing=previous&&!newScene?clamp(targetSwing,previous.swing-.08,previous.swing+.08):targetSwing;
 const style=newScene?choose(scene.styles,random):
   (random()<.68&&scene.styles.includes(previous.style)?previous.style:choose(scene.styles,random));
 let key=previous?.key??choose(PITCH_NAMES,random);
 let mode=previous?.mode??choose(["major","minor"],random);
 const engineOptions=SCENE_ENGINES[scene.id];
 const engine=previous&&!newScene&&random()<.64?
   previous.engine:
   choose(engineOptions.filter(id=>id!==previous?.engine).length?
     engineOptions.filter(id=>id!==previous?.engine):engineOptions,random);
 let change=newScene?(previous?"new scene":"opening scene"):"new variation";
 if(previous && random()<(newScene?.72:.24)){
   const kind=choose(["relative","fifth","fourth"],random);
   const root=PITCH_NAMES.indexOf(key);
   if(kind==="relative"){
     key=PITCH_NAMES[(root+(mode==="minor"?3:9))%12];
     mode=mode==="minor"?"major":"minor";
   }else key=PITCH_NAMES[(root+(kind==="fifth"?7:5))%12];
   change=(newScene?"new scene · ":"")+kind+" key";
 }
 return {scene:scene.id,sceneName:scene.name,sceneRemaining,style,key,mode,engine,
   bpm, density:Math.round(clamp(density,.15,1)*100)/100,
   swing:Math.round(clamp(swing,0,.65)*100)/100,
   targetLoops:choose(scene.loops,random),change};
}
export function radioSignature(piece){
 const events=piece.events||[];
 const notes=id=>events.filter(e=>e.track===id&&Number.isFinite(e.note));
 const lead=notes("lead"),bass=notes("bass");
 const roots=piece.progression?.map(c=>c.notes[0]%12)||[];
 const reference=roots[0]??0;
 const contour=lead.slice(0,14).map((e,i)=>i?
   Math.sign(e.note-lead[i-1].note):0).join("");
 const rhythm=arr=>arr.filter(e=>e.step<64).map(e=>e.step%16).join("-");
 return {style:piece.style,scene:piece.scene,engine:piece.engine,key:piece.key,mode:piece.mode,
   bpm:piece.bpm,density:piece.density,
   harmonicPath:roots.map(x=>(x-reference+12)%12),
   lead:lead.map(e=>e.step+":"+e.note).join("|"),
   leadRhythm:rhythm(lead),leadContour:contour,
   bass:bass.map(e=>e.step+":"+e.note).join("|"),
   bassRhythm:rhythm(bass),
   drums:events.filter(e=>["kick","snare"].includes(e.track)&&e.step<64)
     .map(e=>e.track+":"+e.step%16).join("|"),
   voices:Object.values(piece.voices||{}).join("|")};
}
export function radioNoveltyScore(piece,history=[]){
 const sig=radioSignature(piece);
 let score=100;
 for(let i=0;i<Math.min(8,history.length);i++){
   const other=radioSignature(history[i]);
   const weight=i===0?1:i===1?.6:.22;
   const overlap=sig.harmonicPath.filter((degree,index)=>degree===other.harmonicPath[index]).length;
   if(overlap>=5)score-=(overlap-4)*5*weight;
   if(sig.lead===other.lead)score-=25*weight;
   else{
     if(sig.leadRhythm===other.leadRhythm)score-=8*weight;
     if(sig.leadContour===other.leadContour)score-=8*weight;
   }
   if(sig.bass===other.bass)score-=18*weight;
   else if(sig.bassRhythm===other.bassRhythm)score-=8*weight;
   if(sig.drums===other.drums)score-=9*weight;
   if(sig.voices===other.voices)score-=12*weight;
   if(sig.style===other.style)score-=4*weight;
   if(sig.engine===other.engine)score-=6*weight;
   if(sig.scene===other.scene)score-=1*weight;
   if(Number.isFinite(sig.bpm)&&Number.isFinite(other.bpm)&&
      Math.abs(sig.bpm-other.bpm)<5)score-=5*weight;
   if(Number.isFinite(sig.density)&&Number.isFinite(other.density)&&
      Math.abs(sig.density-other.density)<.08)score-=3*weight;
 }
 return score;
}
export function arrangeRadioNote(event,loopIndex=0){
 const bar=Math.floor(event.step/16);
 // A section evolves by withholding and returning recorded instrument parts,
 // without randomly altering the composer's original pitches.
 if(loopIndex===0){
   if(event.track==="counter")return false;
   if(event.track==="arp"&&event.step%4>=2)return false;
   if(event.track==="pad"&&bar!==0&&bar!==5)return false;
 }else if(loopIndex===2){
   if(bar===4&&(event.track==="kick"||event.track==="hat"))return false;
   if(bar===4&&event.track==="chords"&&event.step%8!==0)return false;
 }else if(loopIndex>=3){
   if(event.track==="counter"&&bar<4)return false;
 }
 return true;
}
export function recommendedCacheEvictions(cache,protectedUrls,maximumItems=150,maximumBytes=180*1024*1024){
 const bytes=buffer=>(buffer?.length||0)*(buffer?.numberOfChannels||2)*4;
 let total=[...cache.values()].reduce((sum,buffer)=>sum+bytes(buffer),0);
 const remove=[];
 for(const [url,buffer] of cache){
   if(cache.size-remove.length<=maximumItems&&total<=maximumBytes)break;
   if(protectedUrls.has(url))continue;
   remove.push(url);
   total-=bytes(buffer);
 }
 return remove;
}
