// Genre-first interface for the eight-bar editor. Underlying composition
// algorithms remain implementation details rather than visible musical genres.
import {RADIO_CHANNELS,applyChannelGroove} from "./radio-channels.js";
import {planGenreHarmony,arrangeGenreMusic} from "./genre-arrangement.js?v=2";
import {composeWithEngine} from "./music-engines.js";
import {hiphopDrumSample} from "./hiphop-drum-kit.js";
import {dnbDrumSample} from "./dnb-break-kit.js";

const electronic=[
 {id:"downtempo",name:"Downtempo",styles:["downtempo"],engines:["classic","melodic","pattern","ecology"],bpm:[76,104],density:[.43,.72],swing:[.08,.2]},
 {id:"house",name:"House",styles:["house"],engines:["classic","pattern","process","ecology"],bpm:[116,132],density:[.62,.85],swing:[0,.07]},
 {id:"breakbeat",name:"Breakbeat",styles:["breakbeat"],engines:["classic","pattern","process","ecology"],bpm:[105,135],density:[.6,.85],swing:[.04,.2]},
 {id:"ambient",name:"Ambient",styles:["ambient"],engines:["ambient","process","ecology"],bpm:[64,90],density:[.25,.55],swing:[0,.09]}
];
export const GENERATOR_GENRES={
 pop:{name:"Pop",subgenres:RADIO_CHANNELS.pop.scenes},
 hiphop:{name:"Hip-hop",subgenres:RADIO_CHANNELS.hiphop.scenes},
 dnb:{name:"Drum & Bass",subgenres:RADIO_CHANNELS.dnb.scenes},
 electronic:{name:"Electronic",subgenres:electronic}
};
export const GENRE_IDS=Object.keys(GENERATOR_GENRES);
export function defaultSubgenre(genre){
 return GENERATOR_GENRES[genre]?.subgenres[0]?.id||"downtempo";
}
export function validGeneratorGenre(genre){
 return Object.hasOwn(GENERATOR_GENRES,genre)?genre:"electronic";
}
export function validSubgenre(genre,subgenre){
 const correct=validGeneratorGenre(genre);
 return GENERATOR_GENRES[correct].subgenres.some(s=>s.id===subgenre)?
   subgenre:defaultSubgenre(correct);
}
function rng(seed){
 let x=2166136261;
 for(const ch of String(seed))x=Math.imul(x^ch.charCodeAt(0),16777619)>>>0;
 return ()=>{x=(x+0x6D2B79F5)>>>0;let z=x;
  z=Math.imul(z^(z>>>15),z|1);z^=z+Math.imul(z^(z>>>7),z|61);
  return ((z^(z>>>14))>>>0)/4294967296;};
}
const choose=(random,options)=>options[Math.min(options.length-1,Math.floor(random()*options.length))];
function voicePreset(genre,scene,random){
 const pick=options=>choose(random,options);
 if(genre==="dnb")return {
  bass:pick(["dnbReese","dnbWobble","dnbFm"]),
  chords:pick(["pianoSoft","pianoBright","organ"]),
  arp:"pianoSoft",
  lead:scene==="liquid"?pick(["violin","cello","concertPiano"]):pick(["electricGuitar","concertPiano"]),
  counter:scene==="liquid"?"violin":"electricGuitar",
  pad:pick(["harmonium","organ","pianoSoft"])
 };
 if(genre==="hiphop")return {
  bass:scene==="trap"?"dnb808":pick(["electricBass","uprightBass","dnbSub"]),
  chords:scene==="west-coast"?pick(["organ","pianoBright","steelBright"]):pick(["pianoSoft","concertPiano","organ"]),
  arp:scene==="west-coast"?"steelBright":"pianoSoft",
  lead:scene==="trap"?pick(["pianoSoft","organ","steelBright"]):
    pick(["pianoSoft","concertPiano","steelBright","electricGuitar"]),
  counter:pick(["organ","concertPiano","electricGuitar"]),
  pad:pick(["pianoSoft","harmonium","organ"])
 };
 if(genre==="pop")return {
  bass:pick(["electricBass","uprightBass"]),
  chords:pick(["pianoBright","concertPiano","steelBright","electricGuitar"]),
  arp:pick(["steelBright","concertPiano","electricGuitar"]),
  lead:pick(["electricGuitar","concertPiano","steelBright","vocalSungNotes"]),
  counter:pick(["violin","electricGuitar","concertPiano"]),
  pad:pick(["pianoSoft","harmonium","organ"])
 };
 return null;
}
export function genrePreset(genre,subgenre,seed){
 const g=validGeneratorGenre(genre),s=validSubgenre(g,subgenre);
 const scene=GENERATOR_GENRES[g].subgenres.find(item=>item.id===s);
 const random=rng(seed+"|"+g+"|"+s+"|generator");
 const range=(bounds)=>bounds[0]+random()*(bounds[1]-bounds[0]);
 return {
  genre:g,subgenre:s,
  bpm:Math.round(range(scene.bpm)),
  density:Math.round(range(scene.density)*100),
  swing:Math.round(range(scene.swing)*100),
  style:choose(random,scene.styles),
  engine:choose(random,scene.engines),
  voices:voicePreset(g,s,random)
 };
}
export function composeGenreSong(settings){
 const genre=validGeneratorGenre(settings.genre);
 const subgenre=validSubgenre(genre,settings.subgenre);
 const preset=genrePreset(genre,subgenre,settings.seed);
 const channel=genre==="electronic"?"mixed":genre;
 const userChords=settings.harmonyOverrides||Array(8).fill(null);
 const generated=channel==="mixed"?null:planGenreHarmony({
  channel,seed:settings.seed,key:settings.key,mode:settings.mode,scene:subgenre
 });
 const harmonyOverrides=generated?generated.map((value,i)=>userChords[i]||value):userChords;
 const base=composeWithEngine({...settings,style:settings.style||preset.style,
  engine:settings.engine||preset.engine,harmonyOverrides});
 if(channel==="mixed")return {...base,genre,subgenre};
 // An editor piece need not always be a full chorus/drop. Give each
 // seed its own density/phrasing role while keeping DnB's driving foundation.
 const formRoll=rng(settings.seed+"|"+genre+"|"+subgenre+"|form")();
 const role=genre==="dnb"?"lift":
   formRoll<.34?"statement":formRoll<.48?"answer":"lift";
 const source={...base,scene:subgenre,leadVoice:settings.voices?.lead};
 const variation=settings.variations||{};
 const pitchedTracks=["bass","chords","arp","lead","counter","pad"];
 let pitched=arrangeGenreMusic(source,channel,settings.seed,role);
 // Each ↻ regeneration must change only its own channel, even after the
 // genre arranger replaces generic composer events.
 for(const track of pitchedTracks){
  if(!variation[track])continue;
  const alternative=arrangeGenreMusic(source,channel,
    settings.seed+"|"+track+"|"+variation[track],role).filter(e=>e.track===track);
  pitched=pitched.filter(e=>e.track!==track).concat(alternative);
 }
 let events=applyChannelGroove(pitched,channel,settings.seed,role,subgenre);
 for(const track of ["kick","snare","clap","hat","openhat","perc"]){
  if(!variation[track])continue;
  const alternative=applyChannelGroove([],channel,
    settings.seed+"|"+track+"|"+variation[track],role,subgenre)
    .filter(e=>e.track===track);
  events=events.filter(e=>e.track!==track).concat(alternative);
 }
 events.sort((a,b)=>a.step-b.step);
 return {...base,genre,subgenre,events};
}
export function genreDrumSample(genre,subgenre,event,seed){
 if(genre==="hiphop")return hiphopDrumSample(subgenre,event.track,event.step,seed);
 if(genre!=="dnb")return null;
 const hybrid=subgenre==="techstep"||subgenre==="jump-up";
 const electronic=hybrid&&(event.track==="kick"||
   subgenre==="techstep"&&event.track==="hat"||
   subgenre==="techstep"&&event.track==="snare"&&event.velocity>=.34);
 return electronic?null:dnbDrumSample(event.track,event.velocity,event.step,seed);
}
