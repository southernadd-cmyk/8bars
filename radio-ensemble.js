// An ensemble-level arrangement plan: decide who plays, who listens, and where
// the next phrase answers before generating a full Human Radio score.
// No samples, browser APIs or master-volume changes live in this module.
const DRUMS=new Set(["kick","snare","clap","hat","openhat","perc"]);
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const pc=n=>(n%12+12)%12;
const foreground=new Set(["lead","counter","arp"]);
function partFor(bar,parts){return parts.bars[Math.floor(bar)];}
function phraseAt(bar,phrases){return phrases.find(p=>bar>=p.startBar&&bar<p.endBar);}
function roleAt(bar,sections){return sections.find(s=>bar>=s.startBar&&bar<s.endBar)?.role;}
function chordToneNear(target,chord,lo=56,hi=84){
 const choices=new Set(chord.notes.slice(0,3).map(pc));let best=lo,dist=Infinity;
 for(let n=lo;n<=hi;n++)if(choices.has(pc(n))&&Math.abs(n-target)<dist){
  best=n;dist=Math.abs(n-target);
 }
 return best;
}
export function planEnsembleParts({channel,scene="",engine="",seed="",sections,phrases,totalBars,climaxBar}){
 if(!["classical","mixed","hiphop","dnb","pop"].includes(channel))
  throw new RangeError("Unsupported channel for ensemble: "+channel);
 if(!Number.isInteger(totalBars)||totalBars<8||
    !Array.isArray(sections)||!Array.isArray(phrases)||
    sections[0]?.startBar!==0||sections.at(-1)?.endBar!==totalBars||
    phrases[0]?.startBar!==0||phrases.at(-1)?.endBar!==totalBars)
  throw new TypeError("Ensemble needs complete musical form and phrase plan");
 const bars=[];
 for(let bar=0;bar<totalBars;bar++){
  const phrase=phraseAt(bar,phrases),role=roleAt(bar,sections);
  if(!phrase||!role)throw Error("Unplanned bar "+bar);
  const within=bar-phrase.startBar,atEnd=within===phrase.lengthBars-1;
  const opening=role==="opening",breakdown=role==="breakdown";
  const arrival=bar===climaxBar;
  const closing=role==="return"&&bar>=totalBars-3;
  const strong=role==="lift"||role==="reprise";
  // This decision is phrase-level. A phrase may straddle transport chunk edges.
  const answer=atEnd&&phrase.lengthBars>=3&&within>=2&&
    !arrival&&!closing&&channel!=="dnb" || (
      channel==="dnb"&&atEnd&&phrase.lengthBars>=3&&
      (role==="statement"||role==="lift"||role==="reprise")&&!arrival);
  const foregroundRole=closing||arrival?"lead":answer?"counter":
    channel==="dnb"&&scene!=="liquid"&&opening?"texture":
    channel==="mixed"&&engine==="ambient"&&within%3===1?"texture":
    strong&&(channel==="pop"||channel==="mixed")&&within%5===3?"texture":
    "lead";
  // Chords and pads are arranged to support a foreground player. They should
  // not compete with each other or an active arpeggio on every bar.
  const lead=foregroundRole==="lead";
  const counter=foregroundRole==="counter";
  const arp=!lead&&!counter&&strong&&channel!=="dnb"&&channel!=="hiphop";
  const pad=opening||breakdown||channel==="classical"&&within===0||
    channel==="mixed"&&engine==="ambient"||
    channel==="dnb"&&scene==="liquid"&&within===0;
  const chords=(!pad||strong||closing)&&!arp&&
    (bar===0||bar%2===0||lead&&strong||counter&&bar%3===0);
  // A held pad and short chord accents coexist at arrivals, but not on each
  // bar of a verse or during a countermelody.
  const parts={
   bass:true,lead,counter,arp,
   pad:pad&&!chords||arrival||closing,
   chords:chords||arrival||closing
  };
  bars.push({
    bar,phraseId:phrase.id,role,motif:phrase.motif,
    foreground:foregroundRole,parts,arrival,closing,
    reason:answer?"answer previous phrase":arrival?"global climax":
      closing?"cadence":opening?"establish texture":"develop motif"
  });
 }
 return {channel,seed,totalBars,bars};
}
// A bass line should anchor a recognisable rhythm section. Keep deliberate
// pickups, but align nearby bass attacks to real kick events when available.
function lockBassToKick(events,totalBars){
 const kicks=Array.from({length:totalBars},()=>[]);
 for(const e of events)if(e.track==="kick"&&e.step>=0){
  const bar=Math.floor(e.step/16);
  if(bar<totalBars)kicks[bar].push(e.step%16);
 }
 return events.map(e=>{
  if(e.track!=="bass")return e;
  const bar=Math.floor(e.step/16),pos=e.step%16,at=kicks[bar]||[];
  if(!at.length||pos===0||e.tag==="final tonic")return e;
  const closest=at.reduce((a,b)=>Math.abs(b-pos)<Math.abs(a-pos)?b:a,at[0]);
  const delta=closest-pos;
  if(Math.abs(delta)>2||closest<0||closest>=16)return e;
  return {...e,step:e.step+delta,duration:Math.max(.3,e.duration-delta)};
 });
}
function composeAnswers(events,ensemble,harmony){
 const added=[],lead=events.filter(e=>e.track==="lead"&&Number.isInteger(e.note));
 const {bars}=ensemble;
 for(const state of bars){
  if(!state.parts.counter)continue;
  const {bar}=state;
  const at=bar*16;
  const context=lead.filter(e=>e.step>=Math.max(0,at-64)&&e.step<at).slice(-4);
  if(context.length===0)continue;
  const chord=harmony[bar];
  // Derive intervals from an actual preceding theme, not a random second
  // melody. An answer takes place while the original lead rests.
  const tail=context.slice(-2);
  let previous=null;
  for(let i=0;i<tail.length;i++){
   const src=tail[i],pos=i===0?0:8;
   const target=src.note-(ensemble.channel==="classical"?3:5);
   let note=chordToneNear(target,chord,
     ensemble.channel==="dnb"?56:58,ensemble.channel==="classical"?87:83);
   if(previous!==null&&Math.abs(note-previous)>7)
    note=chordToneNear(previous+(note>previous?3:-3),chord,58,83);
   previous=note;
   const atStep=at+pos;
   const overlaps=lead.some(e=>e.step<=atStep&&e.step+e.duration>atStep);
   if(overlaps)continue; // Explicit handoff, never an accidental second lead.
   added.push({track:"counter",step:atStep,duration:i===0?6:7,
     velocity:ensemble.channel==="classical"?.24:.21,note,
     tag:"answer to "+(state.motif||"theme"),sourceStep:src.step});
  }
 }
 return added;
}
// The event compiler consumes the pre-planned part map; only the appropriate
// parts survive and their responses are derived from the existing lead line.
// Recorded instruments and the audio/mastering pipeline are not modified.
export function coordinateEnsemble(events,ensemble,harmony){
 if(!Array.isArray(events)||!Array.isArray(harmony)||
   harmony.length!==ensemble?.totalBars)throw new TypeError("Complete score required");
 const total=ensemble.totalBars;
 const chosen=[];
 for(const e of events){
  const bar=Math.floor(e.step/16),state=partFor(bar,ensemble);
  if(!state)throw Error("Note outside the planned form");
  if(DRUMS.has(e.track)||e.sampleVoice==="dnbSub"){chosen.push(e);continue}
  // Global arrival, resolution and climax were explicitly pre-composed.
  if(["golden climax","final tonic","final cadence","climax","resolution"].includes(e.tag)){
   chosen.push(e);continue;
  }
  if(!e.track||!(e.track in state.parts)||state.parts[e.track])chosen.push(e);
 }
 // Old generic counter-voices are discarded; response lines derive from the
 // actual lead melody and its phrase relationship instead.
 const withoutCounter=chosen.filter(e=>e.track!=="counter"||
   ["resolution","climax"].includes(e.tag));
 const responses=composeAnswers(withoutCounter,ensemble,harmony);
 const merged=lockBassToKick([...withoutCounter,...responses],total);
 return merged.sort((a,b)=>a.step-b.step||
   a.track.localeCompare(b.track)||((a.note??0)-(b.note??0)));
}
