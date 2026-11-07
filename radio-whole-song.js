// Human Radio: genre-aware, full-song composer. Nothing is composed in the
// eight-bar transport adapter. The entire 40–56 bar musical score exists first.
// The existing recorded-instrument sampler and mastering chain are unchanged.
import {GOLDEN_LARGE,GOLDEN_SMALL,GOLDEN_ANGLE_TURNS} from "./phi-dynamics.js";
import {CHORD_ROOTS,chordsInKey,chordFromSymbol} from "./harmony.js";
import {harmonicDegrees,phraseBlueprint,developPhrase,smoothVoicing,chooseMelodyNote} from "./musical-grammar.js";
import {applyWholeSongGroove} from "./radio-channels.js";
import {planEnsembleParts,coordinateEnsemble} from "./radio-ensemble.js?v=2";
import {performWholeScore} from "./radio-performance.js?v=1";
import {planComposerV2,planV2Degrees,composeV2Lead} from "./radio-composer-v2.js?v=2";
import {planComposerV3,planV3Degrees,composeV3Lead,developV3Ensemble} from "./radio-composer-v3.js?v=1";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const clamp01=n=>clamp(n,0,1);
const pitchClass=n=>((n%12)+12)%12;
const FORMS={
  pop:{5:["opening","statement","lift","answer","return"],
       6:["opening","statement","lift","answer","reprise","return"],
       7:["opening","statement","lift","answer","breakdown","reprise","return"]},
  hiphop:{5:["opening","statement","lift","answer","return"],
          6:["opening","statement","lift","answer","reprise","return"],
          7:["opening","statement","lift","answer","breakdown","reprise","return"]},
  dnb:{5:["opening","statement","lift","breakdown","return"],
       6:["opening","statement","lift","breakdown","reprise","return"],
       7:["opening","statement","answer","lift","breakdown","reprise","return"]},
  mixed:{5:["opening","statement","answer","lift","return"],
         6:["opening","statement","answer","lift","reprise","return"],
         7:["opening","statement","answer","lift","breakdown","reprise","return"]}
};
const NAMES={
  pop:{opening:"Intro",statement:"Verse",answer:"Second verse",lift:"Chorus",breakdown:"Bridge",reprise:"Final chorus",return:"Outro"},
  hiphop:{opening:"Intro",statement:"Verse",answer:"Second verse",lift:"Hook",breakdown:"Bridge",reprise:"Final hook",return:"Outro"},
  dnb:{opening:"Intro",statement:"Build",answer:"Riser",lift:"First drop",breakdown:"Breakdown",reprise:"Final drop",return:"Outro"},
  mixed:{opening:"Opening",statement:"Statement",answer:"Variation",lift:"Arrival",breakdown:"Contrast",reprise:"Return",return:"Coda"}
};
function seeded(seed){
 let x=2166136261;
 for(const ch of String(seed))x=Math.imul(x^ch.charCodeAt(0),16777619)>>>0;
 return ()=>{x=(x+0x6d2b79f5)>>>0;let z=x;
   z=Math.imul(z^(z>>>15),z|1);z^=z+Math.imul(z^(z>>>7),z|61);
   return ((z^(z>>>14))>>>0)/4294967296;};
}
function take(r,items){return items[Math.min(items.length-1,Math.floor(r()*items.length))]}
function toneNear(target,chord,low=59,high=88){
 const pcs=new Set(chord.notes.slice(0,3).map(pitchClass));
 let note=low,dist=Infinity;
 for(let n=low;n<=high;n++)if(pcs.has(pitchClass(n))&&Math.abs(n-target)<dist){note=n;dist=Math.abs(n-target)}
 return note;
}
function bassRoot(chord){
 let note=chord.notes[0]-12;
 while(note>51)note-=12;
 while(note<33)note+=12;
 return note;
}
function planSections(channel,loops,turnBar,climaxBar,formRoles=null){
 const roles=formRoles||FORMS[channel][loops];
 const sections=roles.map((role,i)=>({
  role,name:NAMES[channel][role],number:i+1,startBar:i*8,endBar:(i+1)*8,
  startStep:i*128,endStep:(i+1)*128,
  // The form is known before even the first note is placed.
  phase:i*8<turnBar?"exposition":i*8<climaxBar?"development":"resolution"
 }));
 return sections;
}
function planPhrases(totalBars,turnBar,climaxBar,r){
 // Musical phrases are planned independently from the eight-bar renderer.
 // Fibonacci span lengths allow a theme to start in one transport chunk and
 // resolve in the next. Global golden cut/turn are hard boundary anchors.
 const ranges=[[0,turnBar,"exposition"],[turnBar,climaxBar,"development"],
   [climaxBar,totalBars,"resolution"]];
 const phrases=[];
 for(const [from,to,phase] of ranges){
  let at=from;
  while(at<to){
   const remain=to-at;
   let choices=[13,8,5,3,2].filter(n=>n<=remain&&remain-n!==1);
   // Establish cross-boundary phrasing before any eight-bar sectioning.
   let length=from===0&&at===0&&remain>=8?5:
     choices.length?take(r,choices):remain;
   if(length>remain)length=remain;
   const index=phrases.length;
   phrases.push({id:index,startBar:at,endBar:at+length,lengthBars:length,phase,
     motif:index%3===1?"B":"A",
     transform:index%4===0?"original":index%4===1?"answer":
       index%4===2?"sequence":"inversion"});
   at+=length;
  }
 }
 const arrival=phrases.find(p=>p.startBar===climaxBar);
 if(arrival){arrival.motif="A";arrival.transform="arrival"}
 const final=phrases.at(-1);
 final.motif="A";final.transform="coda";
 return phrases;
}
function planHarmony(config,r,sections,totalBars,turnBar,climaxBar,phrases=[]){
 const {channel,key,mode,scene}=config;
 const choices=chordsInKey(key,mode);
 const theme=harmonicDegrees(r,channel,mode);
 const answer=theme.map((d,i)=>i===0?d:i===3?4:(d+([0,2,4,1][i]))%7);
 const degreePlan={seed:config.seed,channel,scene,
   strategy:config.composerV2?.strategy,totalBars,turnBar,climaxBar,sections,phrases};
 const v2Degrees=config.composerV2?
   config.composerV2.version===3?planV3Degrees(degreePlan):
     planV2Degrees(degreePlan):null;
 const harmony=[];
 for(let bar=0;bar<totalBars;bar++){
  const part=sections[Math.floor(bar/8)],role=part.role;
  let degree=v2Degrees?v2Degrees[bar]:theme[Math.floor(channel==="dnb"?bar/2:bar)%4];
  if(!v2Degrees&&(role==="answer"||role==="breakdown"))degree=answer[Math.floor(channel==="dnb"?bar/2:bar)%4];
  if(!v2Degrees&&role==="return"&&bar>=totalBars-4)degree=[3,1,4,0][bar-(totalBars-4)];
  if(!v2Degrees&&channel==="hiphop"&&(scene==="lofi"||scene==="trap")&&bar%2===1&&role!=="return")
    degree=harmony[bar-1]?.degree??degree;
  if(!v2Degrees&&channel==="mixed"&&config.engine==="ambient"&&bar%3!==0&&bar>0)
    degree=harmony[bar-1]?.degree??degree;
  // Structural harmonic departures and arrivals are chosen globally.
  if(bar===turnBar-1||bar===climaxBar-1)degree=4;
  if(bar===turnBar||bar===climaxBar)degree=0;
  if(bar===totalBars-2)degree=4;
  if(bar===totalBars-1)degree=0;
  const h=chordFromSymbol(choices[degree],bar%8+1);
  harmony.push({...h,bar:bar+1,degree});
 }
 return {harmony,theme,answer};
}
function sceneEnergy(channel,role,t,engine){
 const quiet=role==="opening"||role==="breakdown";
 const bold=role==="lift"||role==="reprise";
 const shape=clamp01(1-Math.abs(t-GOLDEN_LARGE)/GOLDEN_LARGE);
 let result=(quiet?.43:bold?.95:.73)*(.77+.23*shape);
 if(channel==="dnb")result*=1.06;
 if(channel==="mixed"&&engine==="ambient")result*=.65;
 return clamp(result,.26,1);
}
function planThemes(config,r){
 const {channel,scene}=config;
 const sparse=channel==="dnb"&&scene!=="liquid";
 const [min,max]=channel==="pop"?[4,6]:channel==="hiphop"?[3,5]:
   channel==="dnb"?scene==="liquid"?[3,5]:[2,3]:[3,5];
 const motif=phraseBlueprint(r,min,max,{sparse,firstOnBeat:channel!=="hiphop"});
 const answer={
  ...motif,rhythm:motif.rhythm.slice(),
  contour:motif.contour.map((n,i)=>clamp(motif.contour[0]-n+(i%2===0?0:1),-5,5)),
  centre:motif.centre+take(r,[-3,2,3,5])
 };
 return {motif,answer};
}
function composeNotes(plan,r){
 const {config,sections,phrases,harmony,themes,totalBars,totalSteps,turnBar,climaxBar,climaxStep}=plan;
 const {channel,scene,key,mode,engine,density}=config;
 const events=[];
 const add=(track,step,duration,velocity,note,tag,sampleVoice)=>{
  step=Math.round(step);
  if(step<0||step>=totalSteps||!Number.isInteger(note)||note<28||note>=128)return;
  const e={track,step,duration:clamp(Number(duration),.25,48),
    velocity:Math.round(clamp(Number(velocity),.07,.98)*100)/100,note,tag};
  if(sampleVoice)e.sampleVoice=sampleVoice;
  events.push(e);
 };
 let previousLead=null,previousVoicing=null;
 // V2 writes complete, evaluated phrase candidates BEFORE accompaniments.
 // The old bar-by-bar melody remains available for baseline comparisons.
 if(plan.composerV2){
  const written=plan.composerV2.version===3?composeV3Lead(plan):composeV2Lead(plan);
  events.push(...written.events);
  plan.composerV2.review=written.review;
 }
 const motifPerBar=[]; // Every bar derives from globally planned themes.
 for(let bar=0;bar<totalBars;bar++){
  const part=sections[Math.floor(bar/8)],role=part.role;
  const phrase=phrases.find(p=>bar>=p.startBar&&bar<p.endBar);
  const phraseBar=bar-phrase.startBar;
  const parts=plan.ensemble.bars[bar].parts;
  const t=(bar+.5)/totalBars,energy=sceneEnergy(channel,role,t,engine);
  const chord=harmony[bar],next=harmony[Math.min(totalBars-1,bar+1)];
  const start=bar*16,low=channel==="dnb"?33:35;
  // Same bass figure throughout the composition, transformed at the globally
  // planned arrival and in each form part. No per-eight-bar random resets.
  const bass=plan.composerV2?.strategy==="bass-led"?
    plan.composerV2.bassRhythm:
    channel==="pop"?role==="lift"||role==="reprise"?[0,4,8,12]:[0,7,10]:
    channel==="hiphop"?scene==="trap"?[0,8,14]:[0,7,10]:
    channel==="dnb"?scene==="jungle"?[0,7,10]:[0,10]:
    config.style==="ambient"?[0]:[0,8];
  const bassNotes=bassRoot(chord);
  if(parts.bass)for(let i=0;i<bass.length;i++){
   if(role==="opening"&&i>0&&bar<2)continue;
   if(role==="breakdown"&&i>0&&i%2===1)continue;
   const pos=bass[i],follow=bass[i+1]??16;
   const pickup=i===bass.length-1&&bar%4===3&&bar<totalBars-1;
   const figure=plan.composerV2?.strategy==="bass-led"?
     plan.composerV2.bassFigure[i%plan.composerV2.bassFigure.length]:0;
   const note=pickup?bassRoot(next):bassNotes+figure;
   add("bass",start+pos,clamp(follow-pos-.4,1.2,13.6),
      (channel==="dnb"?.70:.62)*energy+.08,note,"bass motif");
   if(channel==="dnb"&&role!=="opening"&&role!=="breakdown"&&i===0){
    const sub=note-12>=28?note-12:note;
    add("bass",start+pos,clamp(follow-pos-.5,1,14),.20*energy+.06,sub,"sub motif","dnbSub");
   }
  }
  const target=channel==="dnb"?64:channel==="hiphop"?66:69;
  const voicing=smoothVoicing(chord,target,previousVoicing);
  previousVoicing=voicing;
  const chordBeats=channel==="pop"?(role==="lift"||role==="reprise"?[0,8]:[0]):
    channel==="hiphop"?(role==="breakdown"?[0]:[0,10]):
    channel==="dnb"?(role==="lift"||role==="reprise"?[2]:bar%2===0?[0]:[]):
    engine==="ambient"?bar%2===0?[0]:[]:[0,8];
  if(parts.chords)for(const pos of chordBeats)for(const note of voicing)
   add("chords",start+pos,Math.min(channel==="dnb"?6:channel==="pop"?8:12,16-pos),
      (channel==="pop"?.24:.17)*energy+.06,note,"harmonic route");
  const padInterval=engine==="ambient"?1:channel==="dnb"?2:4;
  if(parts.pad&&(bar%padInterval===0||bar===turnBar||bar===climaxBar||bar===phrase.startBar||
    plan.composerV2?.strategy==="harmony-led"&&phraseBar%2===0||
    plan.composerV2?.strategy==="process-led"&&phraseBar%3===0)){
   for(const note of voicing)if(channel!=="hiphop"||role!=="lift")
    add("pad",start,Math.min(channel==="dnb"?17:29,totalSteps-start),
       .12*energy+.04,note,"long-range texture");
  }
  const withMelody=parts.lead&&(channel==="pop"?role!=="opening"||bar>=2:
    channel==="hiphop"?role!=="opening"||bar>=3:
    channel==="dnb"?scene==="liquid"?bar>=2:role==="lift"||role==="reprise"||bar===climaxBar||role==="opening"&&bar===4||role==="statement"&&bar%4===2:
    engine==="ambient"?bar%2===0:bar>=2);
  // Theme identity is inherited from a pre-planned Fibonacci phrase, not
  // recalculated when the playback counter reaches bar 8/16/24.
  const motifChoice=phrase.motif;
  const theme=motifChoice==="B"?themes.answer:themes.motif;
  motifPerBar.push(motifChoice);
  if(withMelody&&!plan.composerV2){
   const melodicPhrase=developPhrase(theme,phraseBar,{
    answer:phrase.transform==="answer"||role==="breakdown",
    closing:bar===phrase.endBar-1
   });
   const rhythm=melodicPhrase.rhythm;
   const use=channel==="dnb"&&scene!=="liquid"?rhythm.slice(0,2):
     channel==="hiphop"?rhythm.slice(0,role==="lift"?4:3):
     engine==="ambient"?rhythm.slice(0,2):rhythm;
   for(let i=0;i<use.length;i++){
    const pos=use[i];
    if(pos<0||pos>15)continue;
    // Melodic target comes from the same theme, but chromatic positions are
    // selected against the *planned* chord and previous voice-leading state.
    let motion=melodicPhrase.contour[i%melodicPhrase.contour.length];
    if(bar>=turnBar&&bar<climaxBar)motion=clamp(motion+(i%2?1:-1),-5,5);
    if(bar>=climaxBar&&role!=="breakdown")motion=clamp(motion-1,-5,5);
    const goal=(channel==="dnb"&&scene==="liquid"?69:channel==="hiphop"?70:74)
      +theme.centre+motion*2.1;
    const cadence=((bar===phrase.endBar-1||bar===totalBars-1)&&i===use.length-1);
    const note=chooseMelodyNote({key,mode},chord,goal,previousLead,pos,r,
       channel==="dnb"?57:61,channel==="dnb"?86:91,{cadence});
    previousLead=note;
    const nextPos=use[i+1]??16;
    const duration=clamp((nextPos-pos-.3)*melodicPhrase.articulation,.75,
      channel==="dnb"?8:12);
    const vel=(channel==="dnb"?.34:channel==="pop"?.63:.52)*energy+.09;
    add("lead",start+pos,duration,vel,note,motifChoice);
    // Counter responses are written as complete, lead-derived phrases
    // by coordinateEnsemble(), using notes this composer actually chose.
   }
  }
  if(parts.arp&&(role==="lift"||role==="reprise"||engine==="process"||plan.composerV2?.strategy==="process-led")&&
     channel!=="hiphop"&&channel!=="dnb"&&bar%2===1){
   // Golden angle changes the inner chord tone without restarting each loop.
   const fraction=((bar+1)*GOLDEN_ANGLE_TURNS)%1;
   const note=voicing[Math.floor(fraction*voicing.length)]+12;
   const offset=clamp(Math.round(16*GOLDEN_LARGE),1,15);
   add("arp",start+offset,Math.min(4,16-offset),.16*energy+.03,note,"golden angle");
  }
 }
 // A unique global climax and a resolved ending (not a climax every 8 bars).
 const anchor=harmony[Math.floor(climaxStep/16)];
 add("lead",climaxStep,Math.min(13,totalSteps-climaxStep),.76,
   toneNear(channel==="dnb"?78:82,anchor,70,92),"golden climax");
 const final=harmony.at(-1),lastBar=totalSteps-16;
 const finalNote=toneNear(72,final,62,86);
 add("lead",lastBar,15,.53,finalNote,"final tonic");
 for(const note of smoothVoicing(final,68,previousVoicing))
  add("chords",lastBar,16,.20,note,"final cadence");
 plan.motifPerBar=motifPerBar;
 return events.sort((a,b)=>a.step-b.step||a.track.localeCompare(b.track)||((a.note??0)-(b.note??0)));
}
function planMixedDrums(plan){
 const {config,sections,totalBars}=plan,{style,engine,seed}=config;
 if(engine==="ambient"||style==="ambient")return [];
 const r=seeded(seed+"|whole-mixed-groove");
 const out=[];
 const add=(track,bar,pos,velocity,duration=1)=>{
  out.push({track,step:bar*16+pos,duration,velocity:Math.round(velocity*100)/100,tag:"mixed groove"})
 };
 for(let bar=0;bar<totalBars;bar++){
  const role=sections[Math.floor(bar/8)].role,quiet=role==="opening"||role==="breakdown";
  const four=style==="house",energy=sceneEnergy("mixed",role,(bar+.5)/totalBars,engine);
  const kicks=four?[0,4,8,12]:[0,8];
  for(const pos of kicks)if(pos===0||(!quiet&&r()<.87))add("kick",bar,pos,.70*energy+.11);
  for(const pos of [4,12])add("snare",bar,pos,.62*energy+.11);
  if(!quiet)for(let pos=0;pos<16;pos+=2)if(r()<.53+.2*energy)
    add("hat",bar,pos,.25*energy+.08,.5);
  if(bar%4===3&&!quiet&&r()<.4)add("perc",bar,15,.27*energy+.05,.5);
 }
 return out;
}
export function planWholeRadioSong(input={}){
 const {seed="human-radio",channel="mixed",scene="",engine="melodic",
   key="C",mode="major",style="downtempo",density=.6,bpm=100,targetLoops=6,composerVersion=2,performanceVersion=2}=input;
 if(!FORMS[channel])throw new RangeError("Unsupported radio channel: "+channel);
 if(!CHORD_ROOTS.includes(key)||!["major","minor"].includes(mode))
  throw new RangeError("Unknown key/mode");
 const loops=clamp(Math.round(Number(targetLoops)||6),5,7);
 const totalBars=loops*8,totalSteps=totalBars*16;
 const turnBar=Math.round(totalBars*GOLDEN_SMALL);
 const climaxBar=Math.round(totalBars*GOLDEN_LARGE);
 const climaxStep=Math.round(totalSteps*GOLDEN_LARGE);
 const random=seeded(seed+"|"+channel+"|"+scene+"|whole-song");
 const composerV2=composerVersion===1?null:
   composerVersion===3?planComposerV3({seed,channel,scene,engine,loops}):
     planComposerV2({seed,channel,scene,engine,loops});
 const config={seed,channel,scene,engine,key,mode,style,density,bpm,
   targetLoops:loops,composerVersion,composerV2};
 const sections=planSections(channel,loops,turnBar,climaxBar,composerV2?.formRoles);
 const phrases=planPhrases(totalBars,turnBar,climaxBar,random);
 const {harmony,theme,answer}=planHarmony(config,random,sections,totalBars,turnBar,climaxBar,phrases);
 const themes=planThemes(config,random);
 const plan={config,seed,channel,totalBars,totalSteps,turnBar,climaxBar,
  turnStep:Math.round(totalSteps*GOLDEN_SMALL),climaxStep,sections,phrases,
  harmony,harmonicTheme:theme,harmonicAnswer:answer,themes,composerV2,events:[]};
 const ensemble=planEnsembleParts({channel,scene,engine,seed,sections,phrases,totalBars,climaxBar,composerV2});
 plan.ensemble=ensemble;
 const pitched=composeNotes(plan,random);
 const drums=channel==="mixed"?planMixedDrums(plan):
   applyWholeSongGroove([],channel,seed,sections,scene,totalBars);
 const scored=composerVersion===3?
   developV3Ensemble([...pitched,...drums],plan):[...pitched,...drums];
 const written=coordinateEnsemble(scored,ensemble,harmony);
 const performed=performWholeScore(written,
  {seed,channel,bpm,totalSteps,phrases,ensemble,climaxStep},
  {performanceVersion});
 plan.events=performed.events;
 plan.performance=performed.performance;
 return plan;
}
// Compatibility only: actual transport still requires indexed 128-step buffers.
// No rhythm, harmony or melody generation is permitted in this adapter.
export function sliceWholeRadioSong(plan){
 if(!plan||!Array.isArray(plan.events)||!Number.isInteger(plan.totalBars)||
    plan.totalBars%8!==0||!Array.isArray(plan.harmony)||
    plan.harmony.length!==plan.totalBars)
   throw new TypeError("Expected a complete whole-song radio score");
 return plan.sections.map((form,index)=>{
  const start=form.startStep,end=form.endStep;
  const events=plan.events.filter(e=>e.step>=start&&e.step<end)
    .map(e=>({...e,step:e.step-start}));
  const progression=plan.harmony.slice(index*8,(index+1)*8)
    .map((c,j)=>({...c,bar:j+1}));
  const eventsByStep=Array.from({length:128},()=>[]);
  for(const e of events)eventsByStep[e.step].push(e);
  return {role:form.role,name:form.name,number:index+1,startStep:start,
    progression,events,eventsByStep,ready:false};
 });
}
