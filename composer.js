// 8bars v0.5 — deterministic symbolic composer; no audio/DOM dependencies.
import {planCadence,voiceLedPitch,counterpointPitch} from "./theory.js";
import {normalizeHarmonyOverrides,chordFromSymbol} from "./harmony.js";
export const ENGINE_VERSION="0.5.3";
export const GOLDEN=(1+Math.sqrt(5))/2;
export const TRACKS=[
 {id:"kick",name:"Kick",type:"drum",color:"#e6ac74"},
 {id:"snare",name:"Snare",type:"drum",color:"#efb98e"},
 {id:"clap",name:"Clap",type:"drum",color:"#d98c79"},
 {id:"hat",name:"Closed hat",type:"drum",color:"#cba98d"},
 {id:"openhat",name:"Open hat",type:"drum",color:"#f0c7a2"},
 {id:"perc",name:"Percussion",type:"drum",color:"#c6926d"},
 {id:"bass",name:"Bass",type:"pitched",color:"#afd28e"},
 {id:"chords",name:"Chords",type:"pitched",color:"#81bbad"},
 {id:"arp",name:"Arpeggio",type:"pitched",color:"#82b0ba"},
 {id:"lead",name:"Lead",type:"pitched",color:"#91ade6"},
 {id:"counter",name:"Countermelody",type:"pitched",color:"#bc9fe2"},
 {id:"pad",name:"Pad",type:"pitched",color:"#c89ed1"}
];
export const STYLES=["downtempo","house","breakbeat","ambient"];
const SCALE={minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11]};
const ROOTS={C:48,"C#":49,D:50,"D#":51,E:52,F:53,"F#":54,G:55,"G#":56,A:57,"A#":58,B:59};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hash(s){let n=2166136261;for(const c of String(s)){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0}
export function rng(seed,part,salt=0){let n=hash(ENGINE_VERSION+"|"+seed+"|"+part+"|"+salt);return ()=>{n=(n+0x6D2B79F5)>>>0;let x=n;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296}}
const choose=(r,a)=>a[Math.floor(r()*a.length)];
export function euclidean(k,n,rotation=0){k=clamp(Math.floor(k),0,n);rotation=((Math.floor(rotation)%n)+n)%n;return Array.from({length:n},(_,i)=>((i-rotation+n)*k)%n<k)}
export function compose(input={}){
 const seed=String(input.seed??"618033");
 const key=ROOTS[input.key]===undefined?"A":input.key,mode=input.mode==="major"?"major":"minor";
 const style=STYLES.includes(input.style)?input.style:"downtempo";
 const density=clamp(Number(input.density??.65)||.65,.15,1);
 const bpm=clamp(Number(input.bpm)||96,60,170);
 const swing=clamp(Number(input.swing??0)||0,0,.65);
 const variants=input.variations||{};
 const harmonyOverrides=normalizeHarmonyOverrides(input.harmonyOverrides);
 const hasEditedHarmony=harmonyOverrides.some(Boolean);
 const stream=id=>rng(seed,id,Math.trunc(Number(variants[id])||0));
 const scale=SCALE[mode],tonic=ROOTS[key],rForm=stream("form");

 // Shared musical identity: chords are chosen from functional paths and varied
 // harmonic rhythms, rather than the old three locked four-chord templates.
 const harmonicPaths={
 major:[[0,4,5,3],[0,5,1,4],[0,3,4,0],[0,1,4,0],[0,2,5,4],[0,4,0,3],[0,5,3,4],[0,2,3,4],[0,3,1,4],[0,1,3,4],[0,4,1,0],[0,6,5,4]],
 minor:[[0,5,3,4],[0,3,5,4],[0,1,4,0],[0,5,1,4],[0,6,5,4],[0,3,4,0],[0,2,5,4],[0,5,4,3],[0,1,5,4],[0,6,3,4],[0,3,1,4],[0,5,3,0]]
 };
 const rhythms={
 spacious:[0,0,1,1,2,2,3,0],moving:[0,1,2,3,0,1,2,0],
 question:[0,0,1,2,0,1,3,0],arrival:[0,1,1,2,2,3,3,0],
 drifting:[0,1,2,2,0,1,3,0],rising:[0,1,2,3,1,2,3,0],
 suspended:[0,0,1,2,2,3,0,0]
 };
 const harmonyPath=choose(rForm,harmonicPaths[mode]);
 const harmonyRhythm=choose(rForm,Object.keys(rhythms));
 const candidateDegrees=rhythms[harmonyRhythm].map(index=>harmonyPath[index]);
 const cadential=planCadence(candidateDegrees,style,rForm);
 const degrees=cadential.degrees;
 function diatonic(degree,oct=0){return tonic+12*oct+scale[((degree%7)+7)%7]+12*Math.floor(degree/7)}
 const progression=degrees.map((deg,bar)=>{
   const root=diatonic(deg),third=diatonic(deg+2),fifth=diatonic(deg+4);
   const notes=(mode==="minor"&&deg===4)?[root,root+4,root+7]:[root,third,fifth];
   if(rForm()<(deg===4&&bar===6?.65:.28))notes.push(diatonic(deg+6));
   return {bar:bar+1,degree:deg,notes};
 });
 for(let bar=0;bar<8;bar++)if(harmonyOverrides[bar])
   progression[bar]=chordFromSymbol(harmonyOverrides[bar],bar+1);
 const cadenceName=harmonyOverrides[6]||harmonyOverrides[7]?"custom":cadential.name;
 const identity={
  cadence:cadenceName,
  groove:choose(rForm,style==="house"?["straight","disco","two-step","syncopated"]:style==="breakbeat"?["broken","syncopated","jungle","half-time"]:style==="ambient"?["soft","floating","half-time","minimal"]:["laidback","half-time","broken","syncopated"]),
  harmonyRhythm,
  form:choose(rForm,["crescendo","call-response","waves","breakdown","suspension"]),
  turn:choose(rForm,["register","rhythm","contrast","break","answer"])
 };
 const ENERGY={
  crescendo:[.65,.75,.87,.93,.98,1.3,1.13,.78],
  "call-response":[.94,.79,1.07,.68,.9,1.27,.91,.77],
  waves:[.73,1.08,.7,1.06,.8,1.32,.94,.84],
  breakdown:[1,.96,.88,.76,.68,1.31,1.08,.8],
  suspension:[.68,.72,.84,.7,.78,1.2,.88,.68]
 };
 const energy=ENERGY[identity.form];
 // Euclidean interlock is a shared rhythm plan: the same 16-step bar hosts
 // distinct pulse counts and phase offsets for bass, chords, arp and melody.
 // At the 5+3 turn, phase changes and pulse counts can rise or fall.
 const pulsePlan={
   bass:2+Math.floor(rForm()*4),
   chords:2+Math.floor(rForm()*4),
   melody:3+Math.floor(rForm()*5),
   arp:4+Math.floor(rForm()*5),
   phase:Math.floor(rForm()*16),
   coupling:choose(rForm,["interlock","unison","cross-rhythm"])
 };
 identity.euclidean={...pulsePlan};
 const euclidSteps=(pulses,rotation)=>euclidean(clamp(Math.round(pulses),1,15),16,((rotation%16)+16)%16)
   .flatMap((hit,step)=>hit?[step]:[]);
 const bassRhythms=[
 [0,8],[0,6,10,14],[0,4,8,12],[0,3,7,10,13],[0,7,11,14],
 [0,10],[0,4,7,10,13],[0,2,6,9,12],[2,6,10,14],[0,5,12]
 ];

  const events=[];
 function add(track,step,duration,velocity,note,extra={}){
   if(step<0||step>=128)return;
   const boundedDuration=Math.min(duration,128-step);
   if(!(boundedDuration>0))return;
   events.push({track,step,duration:boundedDuration,velocity:Math.round(clamp(velocity,.05,1)*100)/100,
     ...(note===undefined?{}:{note}),...extra});
 }
 // Each channel receives a separate RNG. Mutating one channel cannot alter any other.

 // Groove families have different kick/snare foundations, not one fixed
 // beat per genre. Each track adds its own seeded bar-to-bar transformation.
 const KICKS={
 straight:[[0,4,8,12],[0,4,8,12,14]],
 disco:[[0,4,8,12],[0,4,8,12,15]],
 "two-step":[[0,7,10,14],[0,6,11],[0,3,10,13]],
 syncopated:[[0,3,7,10,14],[0,6,9,13],[0,5,8,11,14]],
 broken:[[0,6,10],[0,3,8,11],[0,7,10,14]],
 jungle:[[0,3,6,10,13],[0,4,7,11,14],[0,2,7,10,15]],
 "half-time":[[0,8],[0,7,10],[0,10,14]],
 laidback:[[0,8],[0,7,10],[0,10,14]],
 soft:[[0],[0,8],[0,10]],
 floating:[[0],[0,11],[0,8]],
 minimal:[[0,8],[0,10],[0,6,12]]
 };
 const SNARES={
 straight:[[4,12]],disco:[[4,12]],
 "two-step":[[4,12],[4,11]],
 syncopated:[[4,12],[3,12],[4,11]],
 broken:[[4,11],[5,12],[4,10,14]],
 jungle:[[4,10,12],[4,11,14]],
 "half-time":[[8],[8,15]],
 laidback:[[4,12],[8,12]],
 soft:[[12]],floating:[[12],[10]],minimal:[[12],[8]]
 };
 const drum=(id,create)=>{const r=stream(id);for(let b=0;b<8;b++)create(r,b,b*16,b===5,b===7)};
 drum("kick",(r,b,o,turn,last)=>{
   for(const i of choose(r,KICKS[identity.groove])){
     if(i!==0&&r()>.72+density*.19+(energy[b]-.8)*.15)continue;
     add("kick",o+i,1,i===0?.97:.62+r()*.2,undefined,{variant:Math.floor(r()*3)});
   }
   if((turn||last)&&r()<.6)add("kick",o+15,.5,.4);
 });
 drum("snare",(r,b,o,turn,last)=>{
   for(const i of choose(r,SNARES[identity.groove]))
     add("snare",o+i,1,.68+r()*.2,undefined,{variant:Math.floor(r()*3)});
   if(turn||last)for(const i of [13,14,15])if(r()<.4+density*.25)
     add("snare",o+i,.5,.3+r()*.2,undefined,{variant:Math.floor(r()*3)});
 });
 drum("clap",(r,b,o)=>{
   if(style==="ambient"&&r()<.55)return;
   const hits=choose(r,[[4,12],[12],[4],[8,12]]);
   if(b%2===1||r()<.45)for(const i of hits)if(r()<.75)
     add("clap",o+i,1,.46);
 });
 drum("hat",(r,b,o)=>{
   const count=style==="ambient"?Math.round(2+r()*3*energy[b]):Math.round((4+density*6+r()*3)*energy[b]);
   const pattern=euclidean(count,16,Math.floor(r()*16));
   for(let i=0;i<16;i++)if(pattern[i]&&r()<.9)
     add("hat",o+i,.5,i%4===0?.49:.25+r()*.13);
 });
 drum("openhat",(r,b,o,turn)=>{
   for(const i of choose(r,[[2,6,10,14],[6,14],[3,11],[7,15],[2,10]]))
     if(r()<(style==="ambient"?.2:.3+(turn?.18:0)))add("openhat",o+i,2,.45);
 });
 drum("perc",(r,b,o,turn,last)=>{
   const count=Math.round((2+density*5*r())*energy[b]);
   const pattern=euclidean(count,16,Math.floor(r()*16));
   for(let i=0;i<16;i++)if(pattern[i]&&r()<.55+(turn?.2:0))
     add("perc",o+i,.75,.3+r()*.17);
   if(last&&style!=="ambient")for(const i of [12,14,15])if(r()<.7)
     add("perc",o+i,.5,.38);
 });

 const rb=stream("bass"),bassFigure=choose(rb,bassRhythms);
 const bassAnswer=choose(rb,bassRhythms.filter(fig=>fig!==bassFigure));
 const bassEuclid=rb()<.82;
 for(let b=0;b<8;b++){
   const chord=progression[b],root=chord.notes[0]-24;
   const lattice=euclidSteps(pulsePlan.bass+(b===5?1:0),
     pulsePlan.phase+(pulsePlan.coupling==="unison"?0:4)+(b>=5?3:0));
   // Phrase repetition with small transformations feels more intentional than
   // re-rolling every bar. Some bars still use explicit syncopated figures.
   const figure=b<5?bassFigure:bassAnswer;
   const selected=bassEuclid?(b%4===3&&rb()<.45?figure:lattice):figure;
   const positions=selected.map(pos=>b%2&&rb()<.22?Math.min(15,pos+1):pos);
   for(const i of new Set(positions)){
     if(i!==positions[0]&&rb()>.65+density*.25+(energy[b]-.8)*.14)continue;
     const roll=rb(),next=progression[Math.min(b+1,7)].notes[0]-24;
     let note=roll<.60?root:roll<.82?root+7:roll<.94?root+12:next;
     while(note<28)note+=12;
     while(note>52)note-=12;
     add("bass",b*16+i,Math.min(7,16-i),i===0?.87:.55+rb()*.24,note);
   }
 }

 
 const rc=stream("chords");
 const chordFigures=style==="ambient"?[[0],[0,8]]:style==="house"?[[2,6,10,14],[4,12],[0,8],[6,14]]:
   [[0,8],[0,10],[3,11],[0],[4,12],[0,6,12]];
 const chordFigure=choose(rc,chordFigures);
 const chordEuclid=rc()<.78;
 let lastVoicing=null;
 for(let b=0;b<8;b++){
   const original=progression[b].notes.map(n=>n+12),candidates=[];
   for(let inversion=0;inversion<original.length;inversion++){
     const order=original.slice(inversion).concat(original.slice(0,inversion).map(n=>n+12));
     for(const octave of [-12,0,12]){
       const notes=order.map(n=>n+octave);
       if(notes[0]<48||notes.at(-1)>94)continue;
       const movement=lastVoicing?notes.slice(0,3).reduce((sum,n,i)=>sum+Math.abs(n-lastVoicing[Math.min(i,lastVoicing.length-1)]),0):Math.abs(notes[0]-62);
       candidates.push({notes,score:movement+rc()*.6});
     }
   }
   const chosen=candidates.sort((a,b)=>a.score-b.score)[0]?.notes||original;
   lastVoicing=chosen;
   const phase=pulsePlan.phase+(pulsePlan.coupling==="interlock"?8:0)+(b>=5?2:0);
   const rhythmicCycle=euclidSteps(pulsePlan.chords+(b===5?1:0),phase);
   const rhythm=chordEuclid?(b%4===3&&rc()<.45?chordFigure:rhythmicCycle):
     (b<4?chordFigure:choose(rc,[chordFigure,...chordFigures]));
   for(const i of rhythm)if(i===0||rc()<.69+energy[b]*.13)
     for(const n of chosen)add("chords",b*16+i,style==="ambient"?Math.min(15,16-i):Math.min(6,16-i),.2+rc()*.13,n);
 }

 const ra=stream("arp");
 for(let b=0;b<8;b++){
   const notes=progression[b].notes;
   const pattern=euclidean(
     clamp(pulsePlan.arp+(b===5?2:0),2,13),16,
     pulsePlan.phase+(pulsePlan.coupling==="cross-rhythm"?5:0)+(b>=5?3:0));
   let i=0;
   for(let s=0;s<16;s++)if(pattern[s]&&ra()<(style==="ambient"?.62:.9)){
     const index=i++%4;
     add("arp",b*16+s,Math.min(3,16-s),.27+(b===5?.13:0),notes[[0,1,2,1][index]]+12);
   }
 }

 // Develop a seeded musical idea rather than always playing the same contour.
 // Phrase rules include inversion, sequence, reversal, changing register and cadence.
 const contours=[
  [0,1,2,4,3,5],[6,5,4,2,3,1],[1,3,5,6,4,2],
  [5,3,1,0,2,4],[1,4,2,5,3,6],[2,2,4,2,5,3],
  [0,4,1,5,2,6],[1,3,2,4,3,5]
 ];
 const leadRhythms=[
  [0,3,6,10,13],[0,2,4,8,12,14],[2,6,9,13],
  [0,4,8,11,14],[0,5,7,10,15],[1,3,7,10,12],
  [0,6,8,12],[0,2,7,8,13],[0,3,8,11]
 ];
 const rm=stream("lead"),contour=choose(rm,contours);
 let previousLead=null,previousLeadLeap=0;
 const leadFigure=choose(rm,leadRhythms);
 const leadEuclid=rm()<.85;
 const shift=Math.floor(rm()*3)-1;
 const motif=contour.map(n=>clamp(n+shift,0,6));
 for(let b=0;b<8;b++){
   const chord=progression[b];
   const rotation=pulsePlan.phase+(pulsePlan.coupling==="interlock"?11:0)+(b>=5?5:0);
   const melodicCycle=euclidSteps(pulsePlan.melody+(b===5?1:0),rotation);
   const rhythm=leadEuclid?(b===3||b===7?leadFigure:melodicCycle):
     (b<4?leadFigure:choose(rm,[leadFigure,...leadRhythms]));
   let notes=motif.slice();
   if(b===2||b===3)notes=notes.map(n=>clamp(n+(b===3?1:-1),0,6));
   if(b===4)notes=notes.map(n=>6-n);
   if(b===5)notes=identity.turn==="answer"?notes.reverse():notes.map(n=>clamp(n+1,0,6));
   if(b===6)notes=notes.reverse();
   if(b===7)notes=notes.map(n=>clamp(n-1,0,6));
   const count=clamp(Math.round((2+density*4)*energy[b])+(b===5?1:0),2,7);
   const positions=rhythm.slice(0,count);
   for(let j=0;j<positions.length;j++){
     const pos=positions[j];
     if(b===5&&identity.turn==="break"&&j>1&&rm()<.65)continue;
     let pitch=diatonic(notes[j%notes.length],2);
     const raised=b===5&&(identity.turn==="register"||identity.turn==="contrast");
     if(raised)pitch+=12;
     if(pos===0||pos===8||b===7&&j===positions.length-1){
       const chordTones=chord.notes.map(n=>n+24+(raised?12:0));
       pitch=chordTones.reduce((best,n)=>Math.abs(n-pitch)<Math.abs(best-pitch)?n:best,chordTones[0]);
     }
     const closing=b===7&&j===positions.length-1;
     let fitted=voiceLedPitch({
       target:pitch,chord:chord.notes.map(n=>n+24+(raised?12:0)),
       scale,tonic,previous:previousLead,previousLeap:previousLeadLeap,
       strong:pos%4===0||closing,final:closing,cadence:cadenceName,
       avoidPitchClasses:mode==="minor"&&chord.degree===4?[(tonic+10)%12]:[]
     });
     // An edited final chord must resolve to one of *its* real chord tones,
     // not the original automatically planned tonic.
     if(closing&&harmonyOverrides[7]){
       const candidates=chord.notes.slice(0,3).flatMap(n=>[-12,0,12,24,36].map(o=>n+o))
         .filter(n=>n>=62&&n<=101);
       if(candidates.length)fitted=candidates.reduce((best,n)=>{
         const score=x=>Math.abs(x-pitch)+(previousLead===null?0:Math.abs(x-previousLead)*.4);
         return score(n)<score(best)?n:best;
       },candidates[0]);
     }
     previousLeadLeap=previousLead===null?0:fitted-previousLead;
     previousLead=fitted;
     const next=positions[j+1]??16;
     add("lead",b*16+pos,Math.max(.75,Math.min(6,next-pos-.3)),.54+rm()*.2+(b===5?.1:0),fitted);
   }
   if(b===5&&identity.turn==="rhythm")add("lead",b*16+15,.75,.65,chord.notes[0]+36);
   if(b===5&&!events.some(e=>e.track==="lead"&&e.step>=80&&e.step<96))
     add("lead",80,4,.73,chord.notes[0]+24);
 }

  const rCounter=stream("counter");
 let lastCounter=null,previousGuide=null;
 for(let b=0;b<8;b++){
   // Stable harmonic guide keeps lead-only regeneration independent of counter.
   const tones=progression[b].notes,guide=tones[1]+24;
   const motion=previousGuide===null?0:guide-previousGuide;
   previousGuide=guide;
   if(b===0&&style!=="ambient"&&rCounter()<.8)continue;
   const starts=rCounter()<.65?euclidSteps(
     2+Math.floor(rCounter()*3),pulsePlan.phase+7+(b>=5?4:0)):
     choose(rCounter,[[2,8,13],[4,10],[6,12],[1,7,11],[0,8]]);
   for(const i of starts)if(rCounter()<(style==="ambient"?.44:.28+density*.29)*energy[b]){
     const note=counterpointPitch({chord:tones,lead:guide,previous:lastCounter,leadMotion:motion});
     add("counter",b*16+i,Math.min(4,16-i),.27+rCounter()*.11,note);
     lastCounter=note;
   }
 }
 const rPad=stream("pad");
 for(let b=0;b<8;b++){
   if(b!==0&&b!==5&&rPad()>.4*energy[b])continue;
   if(style==="breakbeat"&&rPad()<.24)continue;
   const notes=progression[b].notes;
   for(const n of notes)add("pad",b*16,hasEditedHarmony?16:style==="ambient"?30:b===4?16:Math.min(24,128-b*16),
     style==="ambient"?.22:.14,n+12);
 }
 // Keep sparse forms sparse, but never produce a completely absent mixer channel.
 for(const t of TRACKS)if(!events.some(e=>e.track===t.id)){
   const note=t.type==="pitched"?progression[0].notes[0]+(t.id==="bass"?-24:12):undefined;
   add(t.id,0,Math.min(4,128),t.type==="drum"?.36:.23,note);
 }
 events.sort((a,b)=>a.step-b.step||TRACKS.findIndex(t=>t.id===a.track)-TRACKS.findIndex(t=>t.id===b.track));
 return {version:ENGINE_VERSION,seed,bpm,density,swing,style,key,mode,variations:Object.fromEntries(TRACKS.map(t=>[t.id,Math.trunc(Number(variants[t.id])||0)])),bars:8,stepsPerBar:16,goldenStep:80,progression,harmonyOverrides,motif,identity,events,
 structure:[{bars:"1–3",role:"Statement"},{bars:"4–5",role:"Answer"},{bars:"6–7",role:"Golden turn"},{bars:"8",role:"Return"}],
 explanation:[
  "Eight-bar "+identity.form+" form, with 5 + 3 phrasing and a sixth-bar turn.",
  "Individual tracks retain independent seeds; the countermelody uses contrary motion and consonant harmonic intervals.",
  hasEditedHarmony?"Custom chord progression: pitched parts rebuilt from the edited harmony.":
    "Harmonic function: "+cadential.description+" cadence, with varied chord-change rhythms and inversion choices.",
  "The "+identity.groove+" groove uses interlocking Euclidean "+pulsePlan.bass+"/"+pulsePlan.chords+"/"+pulsePlan.melody+"/"+pulsePlan.arp+" pulses, with phase shifts after bar five.",
  "Melodic voice leading favours chord tones at accented notes, stepwise motion and recovery after leaps.",
  "The "+identity.turn+" treatment shapes the golden turn at bar six; the final bar prepares the return."
 ]};
}
