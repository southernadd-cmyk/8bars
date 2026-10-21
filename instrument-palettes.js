// Song-level orchestration shared by the editor and Human Radio.
// A genre defines a *range* of believable instruments, not one fixed band.
// Every choice refers to a real recorded sample bank in sounds.js.
import {VOICES,VOICE_FAMILIES,REGEN_VOICE_POOLS} from "./sounds.js";

const ALL_ROLES=["bass","chords","arp","lead","counter","pad"];
const ORDER=["lead","chords","bass","arp","pad","counter"];
const FAMILIES={
 pop:{
  lead:["Guitars","Plucked strings","Keys & organs","Vocal melodies","Bowed strings","Mallets & bells","Brass"],
  chords:["Guitars","Plucked strings","Keys & organs"],
  arp:["Guitars","Plucked strings","Keys & organs","Mallets & bells"],
  counter:["Bowed strings","Strings","Keys & organs","Vocal melodies","Brass","Winds"],
  pad:["Keys & organs","Bowed strings","Strings","Vocal melodies","Winds"]
 },
 hiphop:{
  lead:["Keys & organs","Plucked strings","Guitars","Mallets & bells","Winds","Brass","Vocal melodies"],
  chords:["Keys & organs","Plucked strings","Guitars"],
  arp:["Keys & organs","Plucked strings","Mallets & bells","Guitars"],
  counter:["Keys & organs","Plucked strings","Mallets & bells","Brass","Winds","Vocal melodies"],
  pad:["Keys & organs","Bowed strings","Strings","Vocal melodies","Winds"]
 },
 dnb:{
  lead:["Keys & organs","Bowed strings","Strings","Plucked strings","Mallets & bells","Vocal melodies","Winds"],
  chords:["Keys & organs","Plucked strings","Bowed strings","Strings"],
  arp:["Keys & organs","Mallets & bells","Plucked strings","Guitars"],
  counter:["Bowed strings","Strings","Winds","Keys & organs","Vocal melodies"],
  pad:["Keys & organs","Bowed strings","Strings","Winds","Vocal melodies"]
 },
 electronic:{
  lead:["Keys & organs","Plucked strings","Mallets & bells","Guitars","Bowed strings","Vocal melodies","Winds"],
  chords:["Keys & organs","Plucked strings","Guitars","Mallets & bells"],
  arp:["Keys & organs","Mallets & bells","Plucked strings","Guitars"],
  counter:["Keys & organs","Mallets & bells","Bowed strings","Strings","Winds","Vocal melodies"],
  pad:["Keys & organs","Bowed strings","Strings","Winds","Vocal melodies"]
 }
};
const BASS={
 pop:["electricBass","uprightBass","vcClavisynth","vcBassRecorderVib","vcFMPiano","organ"],
 hiphop:["electricBass","uprightBass","dnbSub","dnb808","vcClavisynth","vcBassRecorderVib","vcFMPiano"],
 dnb:["dnbReese","dnbWobble","dnbFm","dnbSub","electricBass"],
 electronic:["dnbReese","dnbWobble","dnbFm","dnbSub","dnb808","electricBass","uprightBass","vcClavisynth","vcFMPiano"]
};
const TUNING={
 "pop/indie":{lead:["Guitars","Plucked strings","Bowed strings","Vocal melodies","Keys & organs"]},
 "pop/bright":{lead:["Keys & organs","Guitars","Vocal melodies","Mallets & bells","Brass","Plucked strings"]},
 "hiphop/lofi":{lead:["Keys & organs","Plucked strings","Mallets & bells","Guitars"],pad:["Keys & organs","Bowed strings","Strings"]},
 "hiphop/trap":{lead:["Keys & organs","Mallets & bells","Plucked strings","Vocal melodies"]},
 "hiphop/west-coast":{lead:["Keys & organs","Guitars","Brass","Winds","Plucked strings"]},
 "dnb/liquid":{lead:["Bowed strings","Strings","Keys & organs","Plucked strings","Vocal melodies","Winds"]},
 "dnb/techstep":{lead:["Keys & organs","Mallets & bells","Plucked strings","Winds"]},
 "electronic/ambient":{lead:["Keys & organs","Bowed strings","Strings","Winds","Vocal melodies","Mallets & bells"],pad:["Keys & organs","Bowed strings","Strings","Winds","Vocal melodies"]}
};
const VOWEL_PREFIX="vocalSung";
const valid=id=>!!VOICES[id]?.length;
const familyOf=id=>Object.entries(VOICE_FAMILIES).find(([,ids])=>ids.includes(id))?.[0]||"";
const filtered=ids=>[...new Set(ids.filter(valid))];
function randomFor(seed){
 let x=2166136261;
 for(const char of String(seed))x=Math.imul(x^char.charCodeAt(0),16777619)>>>0;
 return ()=>{x=(x+0x6d2b79f5)>>>0;let z=x;z=Math.imul(z^(z>>>15),z|1);
  z^=z+Math.imul(z^(z>>>7),z|61);return((z^(z>>>14))>>>0)/4294967296;};
}
const pick=(random,choices)=>choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
function bassVoices(genre,subgenre){
 let ids=BASS[genre]||BASS.electronic;
 if(genre==="hiphop"&&subgenre==="trap")ids=["dnb808","dnbSub","dnbFm","vcClavisynth","electricBass"];
 if(genre==="hiphop"&&subgenre==="lofi")ids=["uprightBass","electricBass","vcBassRecorderVib","vcFMPiano","dnbSub"];
 if(genre==="dnb"&&subgenre==="liquid")ids=["dnbSub","dnbFm","dnbReese","electricBass","dnbWobble"];
 return filtered(ids);
}
export function genreRolePools(genre,subgenre){
 const g=Object.hasOwn(FAMILIES,genre)?genre:"electronic";
 const override=TUNING[g+"/"+subgenre]||{};
 const result={bass:bassVoices(g,subgenre)};
 for(const role of ALL_ROLES.filter(r=>r!=="bass")){
  const families=override[role]||FAMILIES[g][role];
  // Existing REGEN pools already vet playable pitch range and track role.
  // Avoid dozens of nearly identical sung-vowel variants dominating results.
  const verified=REGEN_VOICE_POOLS[role].filter(id=>
   valid(id)&&(!id.startsWith(VOWEL_PREFIX)||
    ["vocalSungNotes","vocalSungAh","vocalSungOh"].includes(id)));
  result[role]=filtered(verified.filter(id=>families.includes(familyOf(id))));
  if(result[role].length<3)result[role]=filtered(verified);
 }
 return result;
}
export function planInstrumentPalette(genre,subgenre,seed,previousVoices=null){
 const pools=genreRolePools(genre,subgenre),r=randomFor(seed+"|"+genre+"|"+subgenre+"|orchestration");
 const previous=previousVoices||{},voices={};
 for(const role of ORDER){
  const pool=pools[role];
  if(!pool.length)throw Error("No recorded instrument samples for "+role);
  const already=new Set(Object.values(voices));
  // New songs must sound different from the *previous* song, not merely
  // produce a different seed. Preserve internal palette variety as well.
  let choices=pool.filter(id=>id!==previous[role]&&!already.has(id));
  if(!choices.length)choices=pool.filter(id=>id!==previous[role]);
  if(!choices.length)choices=pool;
  // Pick a timbre family first, rather than letting enormous piano sample
  // libraries drown out guitars, strings, plucked instruments and voices.
  let families=[...new Set(choices.map(familyOf))];
  const oldFamily=familyOf(previous[role]);
  if(previous[role]&&families.length>1&&r()<.88)
   families=families.filter(f=>f!==oldFamily);
  const foreground=role==="chords"?familyOf(voices.lead):null;
  if(foreground&&families.length>1&&r()<.8)
   families=families.filter(f=>f!==foreground);
  const family=pick(r,families);
  voices[role]=pick(r,choices.filter(id=>familyOf(id)===family));
 }
 return voices;
}
