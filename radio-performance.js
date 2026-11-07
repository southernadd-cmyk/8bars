// Human Radio: PERFORMANCE BEFORE PLAYBACK.
// Read the complete written score, its instrument roles and Fibonacci phrases,
// and annotate phrasing, articulation, dynamics and shared rhythmic pocket.
// No regenerated notes, altered bar positions, sample assets or master levels.
const DRUMS=new Set(["kick","snare","clap","hat","openhat","perc"]);
const MELODIC=new Set(["lead","counter","arp","chords","pad","bass"]);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round=(n,d=2)=>Math.round(n*10**d)/10**d;
function seeded(seed){
 let s=2166136261;
 for(const c of String(seed))s=Math.imul(s^c.charCodeAt(0),16777619)>>>0;
 return ()=>{
  s=(s+0x6d2b79f5)>>>0;
  let v=s;v=Math.imul(v^(v>>>15),v|1);v^=v+Math.imul(v^(v>>>7),v|61);
  return ((v^(v>>>14))>>>0)/4294967296;
 };
}
const GROOVES={
 pop:["gentle-push","relaxed","steady","open"],
 hiphop:["laid-back","laid-back","pocket","forward"],
 dnb:["driving","tight","rolling","driving"],
 mixed:["relaxed","open","steady","gentle-push","laid-back"],
 classical:["breathing","breathing","lyrical","measured"]
};
const getPhrase=(phrases,step)=>phrases?.find(p=>
  step>=p.startBar*16&&step<p.endBar*16)||null;
const getPhrasePosition=(phrase,step)=>{
 if(!phrase)return .5;
 return clamp((step-phrase.startBar*16)/Math.max(16,(phrase.endBar-phrase.startBar)*16),0,1);
};
const structuralEvent=e=>["golden climax","climax","resolution","final tonic","final cadence"].includes(e.tag);
function partsInBar(ensemble,step){
 return ensemble?.bars?.[Math.floor(step/16)]||null;
}
function groupSignature(track,step,phraseId){
 return track+"|"+step+"|"+phraseId;
}
function pocketMs({channel,groove,track,step,phrasePhase,climax,barStep,limit,phrasePos,accent}){
 const pos=step%16;
 // Every instrument shares a section-wide pulse. Do not apply independent
 // random 'humanise' jitter to simultaneous chord tones.
 let amount=0;
 if(track==="kick")amount=0; // downbeat is the shared timing reference
 else if(track==="snare"||track==="clap"){
  amount=channel==="hiphop"?8:channel==="dnb"?2:3;
 }else if(track==="hat"||track==="openhat"||track==="perc"){
  amount=channel==="hiphop"?(pos%4===2?6:2):
    channel==="dnb"?(pos%4===2?-3:2):pos%4===2?4:1;
 }else if(track==="bass"){
  amount=groove==="laid-back"?5:groove==="driving"?-3:1;
 }else if(track==="chords"||track==="pad"){
  amount=groove==="gentle-push"?-4:groove==="laid-back"?9:3;
 }else if(track==="lead"||track==="counter"||track==="arp"){
  amount=groove==="laid-back"?10:groove==="driving"?-6:
    groove==="gentle-push"?-6:groove==="breathing"?0:2;
  // Preparations lean forward, cadences settle, without moving the bar clock.
  if(channel==="classical"||groove==="breathing"||groove==="lyrical")
   amount+=Math.sin(phrasePos*Math.PI*2)*9+Math.max(0,phrasePos-.73)*36;
  else {
   // The same phrase has a gentle lean towards its midpoint and relaxation
   // at the close. This applies across pop/hip-hop/mixed too, but the fast DnB
   // pulse remains tighter so breaks don't lose their precision.
   amount+=Math.sin(phrasePos*Math.PI*2)*(channel==="dnb"?3:6);
   amount+=Math.max(0,phrasePos-.82)*(channel==="dnb"?9:19);
   if(pos===14||pos===15)amount-=3;
  }
 }
 if(phrasePhase==="resolution"&&track==="lead"&&phrasePos>.72)amount+=4;
 if(accent==="pickup"&&track==="lead")amount-=5;
 if(climax)amount=0; // exact φ location is a structural musical anchor
 return clamp(amount,-limit,limit);
}
function shapeDynamics({channel,track,step,phrase,phrasePos,ensemble,groove,climax}){
 // A phrase is a played sentence, not a row of identical velocities. A
 // repeat of the same motif shares its contour even across buffer edges.
 const arc=Math.sin(Math.PI*Math.pow(phrasePos,.83));
 const resolution=phrase?.phase==="resolution"&&phrasePos>.82;
 const beat=step%16;
 const accent=beat===0?1.055:beat%4===0?1.025:
   beat%2===0?.985:.955;
 const solo=partsInBar(ensemble,step)?.foreground==="lead";
 if(DRUMS.has(track)){
  if(track==="kick")return beat===0?1.02:.95;
  if(track==="snare"||track==="clap")return beat===4||beat===12?1.025:.86;
  // Hat patterns have a repeating accent *shape*, not per-hit random noise.
  return clamp(beat%4===0?1.02:beat%2===0?.90:.82,.78,1.07);
 }
 let express=1;
 if(track==="lead"||track==="counter"){
  express=0.925+0.125*arc;
  express*=accent;
  if(solo&&track==="lead")express*=1.025;
  if(resolution)express*=.94;
 }else if(track==="arp"){
  express=(.94+.10*arc)*(.97+.03*Math.cos(beat*Math.PI/4));
 }else if(track==="bass"){
  express=beat===0?1.055:beat%4===0?1.015:.94;
 }else if(track==="chords"){
  express=.945+.09*arc;
 }else if(track==="pad")express=.965+.055*arc;
 if(climax&&track==="lead")express=1;
 // Preserve the existing master/gain structure: these are restrained playing
 // accents, not gain normalisation or a new mastering stage.
 return clamp(express,.80,1.10);
}
function endingBreath(e,phrase,channel){
 if(!phrase||e.track!=="lead")return false;
 const end=phrase.endBar*16;
 return e.step>=end-16&&e.step<end;
}
function releaseShape(e,{phrase,groove,nextNote,channel}){
 const drum=DRUMS.has(e.track);
 if(drum)return {lengthScale:1,attackMs:0,releaseMs:12};
 const breath=endingBreath(e,phrase,channel);
 const sourceLength=e.duration;
 const available=nextNote===undefined?null:nextNote-e.step;
 const melodic=e.track==="lead"||e.track==="counter";
 let scale=1,attack=0,release=45;
 if(melodic){
  // Connected notes (legato) within a thought; shorter, audible breaths at
  // phrase boundaries. Never smear a response over another player's entrance.
  scale=breath?.77:groove==="lyrical"||groove==="breathing"?1.06:1.015;
  attack=e.track==="lead"?(channel==="classical"?19:7):12;
  release=channel==="classical"?90:65;
  if(available!==null&&available>0)
    scale=Math.min(scale,(available*.97)/Math.max(.25,sourceLength));
 }else if(e.track==="bass"){
  scale=groove==="laid-back"?.96:1.035;
  release=40;
  attack=4;
 }else if(e.track==="chords"){
  scale=groove==="open"?1.03:.94;
  attack=10;release=95;
 }else if(e.track==="pad"){
  scale=1.02;attack=35;release=170;
 }else if(e.track==="arp"){
  scale=.91;attack=6;release=53;
 }
 return {
  lengthScale:round(clamp(scale,.48,1.12),3),
  attackMs:attack,
  releaseMs:release
 };
}
/**
 * A track's score events stay MIDI-grid-aligned. This stage annotates each
 * note with an intentionally performed position and envelope. The existing
 * eight-bar slices remain a lossless transport of this completed score.
 */
export function performWholeScore(events,plan,{performanceVersion=2}={}){
 if(!Array.isArray(events)||!Number.isFinite(plan?.bpm)||plan.bpm<=0||
    !Number.isInteger(plan?.totalSteps)||plan.totalSteps<=0)
  throw new TypeError("A completed piece with tempo and grid is required");
 if(performanceVersion===1)return {events:events.map(e=>({...e})),
  performance:{version:1,groove:"original",phrases:plan.phrases?.length||0}};
 const {channel,seed,ensemble,phrases=[],climaxStep,totalSteps,bpm}=plan;
 if(!GROOVES[channel])throw new RangeError("Unsupported performance channel");
 const r=seeded(seed+"|"+channel+"|performed-score");
 const options=GROOVES[channel];
 const groove=options[Math.floor(r()*options.length)];
 const stepMs=60/bpm/4*1000;
 const timeCap=round(Math.min(23,stepMs*.17),2);
 const nextMap=new Map();
 const byTrack=new Map();
 for(const e of events)if(MELODIC.has(e.track)){
  if(!byTrack.has(e.track))byTrack.set(e.track,[]);
  byTrack.get(e.track).push(e);
 }
 for(const [track,notes] of byTrack){
  notes.sort((a,b)=>a.step-b.step||a.note-b.note);
  const steps=[...new Set(notes.map(e=>e.step))].sort((a,b)=>a-b);
  for(let i=0;i<steps.length;i++)nextMap.set(track+"|"+steps[i],steps[i+1]);
 }
 // A formal cadence or climax is a single attack, not separate detuned
 // timing for its individual chord voices. Pre-mark every affected chord group
 // before adding expressive timing to any note in that group.
 const structuralGroups=new Set(events.filter(e=>
   structuralEvent(e)||e.step===climaxStep&&
     (e.track==="lead"||e.track==="chords")).map(e=>
     groupSignature(e.track,e.step,getPhrase(phrases,e.step)?.id??-1)));
 const groups=new Map();
 const rendered=events.map(e=>{
  if(e.step<0||e.step>=totalSteps||!Number.isInteger(e.step))
   throw new RangeError("Event outside score");
  const phrase=getPhrase(phrases,e.step);
  const pos=getPhrasePosition(phrase,e.step);
  const group=groupSignature(e.track,e.step,phrase?.id??-1);
  const climax=structuralGroups.has(group);
  if(!groups.has(group)){
   // One choice per attack group; all voices of a chord remain together.
   const barStep=e.step%16;
   const accent=barStep>=14?"pickup":barStep===0?"downbeat":"regular";
   groups.set(group,pocketMs({channel,groove,track:e.track,step:e.step,
     phrasePhase:phrase?.phase,climax,barStep,limit:timeCap,
     phrasePos:pos,accent}));
  }
  const offsetMs=climax?0:groups.get(group);
  const velocityScale=shapeDynamics({channel,track:e.track,step:e.step,
    phrase,phrasePos:pos,ensemble,groove,climax});
  const nextNote=nextMap.get(e.track+"|"+e.step);
  const shape=releaseShape(e,{phrase,groove,nextNote,channel});
  return {...e,performance:{
    offsetMs:round(offsetMs,2),
    velocityScale:round(velocityScale,3),
    ...shape
  }};
 });
 return {events:rendered,
  performance:{version:2,groove,maxOffsetMs:timeCap,
    phrases:phrases.length,channel,bpm}};
}
