// Human Radio Release 2: multi-section forms, derived from the same underlying
// musical idea and genuine recorded instrument bank. No audio or browser APIs.
import {chordSymbol} from "./harmony.js";

export const RADIO_FORMS={
  5:["opening","statement","answer","lift","return"],
  6:["opening","statement","answer","lift","breakdown","return"],
  7:["opening","statement","answer","lift","breakdown","reprise","return"]
};
export const RADIO_SECTION_NAMES={
 opening:"Opening",statement:"Statement",answer:"Answer",
 lift:"Lift",breakdown:"Breakdown",reprise:"Reprise",return:"Return"
};
const SECTION_VARIATIONS={
 opening:{},statement:{},answer:{lead:1,counter:1,arp:1},
 lift:{lead:2,chords:1,arp:2,hat:1,perc:1,counter:2},
 breakdown:{lead:1,arp:1,pad:1},
 reprise:{lead:3,arp:1,counter:3,hat:2},
 return:{lead:0,counter:0,hat:0}
};
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(n,hi));

function harmonyVariation(base,role){
 const chords=base.progression;
 // A genre-specific song keeps its recognizable cycle across verse, chorus
 // and drop, rather than receiving unrelated substitutions every section.
 if(["pop","dnb"].includes(base.radioChannel))
   return chords.map(chord=>chordSymbol({...chord,notes:chord.notes.slice(0,3)}));
 const overrides=base.ecologyGenome?base.ecologyGenome.harmonyOverrides.slice():Array(8).fill(null);
 const triad=index=>chordSymbol({...chords[index],notes:chords[index].notes.slice(0,3)});
 // Phrase-level chord substitutions come from the original eight-bar
 // progression, keeping each chapter's tonal identity recognisable.
 if(role==="answer")overrides[3]=triad(4);
 if(role==="lift"){
   overrides[0]=triad(2);
   overrides[4]=triad(5);
 }
 if(role==="breakdown")overrides[3]=triad(1);
 if(role==="reprise")overrides[4]=triad(2);
 // The return deliberately restores the unmodified progression/cadence.
 return overrides;
}
export function buildRadioForm(config,first,composeFn){
 if(typeof composeFn!=="function"||!first?.progression||first.progression.length!==8)
   throw new TypeError("A source composition and composer function are required");
 const count=clamp(Math.round(config.targetLoops||6),5,7);
 first.radioChannel=config.channel;
 return RADIO_FORMS[count].map((role,index)=>{
   const composition=index===0?first:composeFn({
     seed:config.seed,key:config.key,mode:config.mode,style:config.style,engine:config.engine,
     bpm:config.bpm,density:config.density,swing:config.swing,
     variations:SECTION_VARIATIONS[role],
     harmonyOverrides:harmonyVariation(first,role),
     ecologyGenome:config.ecologyGenome
   });
   const events=composition.events;
   const eventsByStep=Array.from({length:128},()=>[]);
   for(const event of events)eventsByStep[event.step].push(event);
   return {role,name:RADIO_SECTION_NAMES[role],number:index+1,
     progression:composition.progression,events,eventsByStep,ready:false};
 });
}
export function sectionAllowsNote(event,role){
 const bar=Math.floor(event.step/16);
 const beat=event.step%16;
 switch(role){
 case "opening":
   if(event.track==="counter"||event.track==="arp")return false;
   if(event.track==="lead"&&bar<2)return false;
   if(event.track==="snare"&&beat!==4&&beat!==12)return false;
   return event.track!=="hat"||beat%4===0;
 case "statement":
   if(event.track==="counter"&&bar<4)return false;
   return event.track!=="arp"||beat%4===0;
 case "answer":
   if(event.track==="pad"&&bar>=4&&bar<=5)return false;
   return true;
 case "lift":
   return true;
 case "breakdown":
   if(["kick","clap","openhat","perc"].includes(event.track))return false;
   if(event.track==="hat")return beat%4===0;
   return event.track!=="lead"||bar>=4;
 case "reprise":
   if(event.track==="counter"&&bar===0)return false;
   return true;
 case "return":
   if(event.track==="counter"&&bar>=5)return false;
   if(["hat","openhat","perc"].includes(event.track)&&bar===7)return false;
   return true;
 default:return true;
 }
}
export function sectionVelocity(role,track){
 const levels={
 opening:{kick:.7,snare:.65,hat:.48,bass:.73,chords:.77,lead:.65,pad:.85},
 statement:{kick:.89,hat:.68,arp:.71},
 answer:{lead:1.08,counter:1.08,arp:.86},
 lift:{kick:1.12,snare:1.12,hat:1.13,bass:1.09,lead:1.09,chords:1.12,arp:1.16},
 breakdown:{bass:.72,chords:.77,pad:.92,lead:.63,snare:.52},
 reprise:{lead:1.06,counter:.95,arp:1.08},
 return:{bass:.9,chords:.91,pad:.83,hat:.6}
 };
 return levels[role]?.[track]??1;
}
const noteClasses=chord=>new Set((chord?.notes||[]).map(n=>((n%12)+12)%12));
const lastSection=piece=>piece?.sections?.at(-1);
const firstSection=piece=>piece?.sections?.[0];
export function transitionHarmonyScore(from,to){
 const a=lastSection(from)?.progression?.at(-1)||from?.progression?.at(-1);
 const b=firstSection(to)?.progression?.[0]||to?.progression?.[0];
 if(!a||!b)return 0;
 const outgoing=noteClasses(a),incoming=noteClasses(b);
 const shared=[...outgoing].filter(pc=>incoming.has(pc)).length;
 // Minimum semitone distance from each outgoing pitch class to the new harmony.
 const motion=[...outgoing].reduce((sum,pc)=>sum+
   Math.min(...[...incoming].map(q=>Math.min(Math.abs(q-pc),12-Math.abs(q-pc)))),0);
 return shared*6-motion*1.5;
}
export function sharedToneBridge(from,to){
 const fromEnd=lastSection(from)||from;
 const toStart=firstSection(to)||to;
 const outgoing=fromEnd?.progression?.at(-1),incoming=toStart?.progression?.[0];
 if(!outgoing||!incoming)return [];
 const shared=new Set([...noteClasses(outgoing)].filter(pc=>noteClasses(incoming).has(pc)));
 // Only actual outgoing recorded notes can sustain the bridge: never synthesize
 // a note or introduce an un-preloaded recording at the transition.
 const notes=(fromEnd.events||[]).filter(e=>
   Number.isInteger(e.note)&&e.step>=96&&["pad","chords"].includes(e.track)&&
   shared.has(((e.note%12)+12)%12));
 const byPitch=new Map();
 for(const e of notes)if(!byPitch.has(e.note%12))byPitch.set(e.note%12,{
   ...e,step:0,duration:12,velocity:Math.min(.23,e.velocity)
 });
 return [...byPitch.values()].slice(0,3);
}
