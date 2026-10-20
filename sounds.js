// Verified CC0 sample inventory. Revisions are pinned; source files remain upstream in v0.2.
// Names are from the original TR-808 soundmeta and Meta Open Sound instrument manifests.
const TR="https://raw.githubusercontent.com/tidalcycles/sounds-tr808-fischer/85fbecf1bec32553395625ea659e2a56dfd7c0e1/";
const META="https://raw.githubusercontent.com/facebookincubator/Meta-open-sound/e2ff154845994fe4135becc4d5b857c19f172784/systems/instruments/";
const tr=(path)=>({url:TR+path,license:"CC0 1.0",source:"TidalCycles / Michael Fischer"});
const meta=(collection,file,root)=>({url:META+collection+"/ogg/"+file+".ogg",root,license:"CC0 1.0",source:"Meta Open Sound"});
export const DRUMS={
 kick:[tr("bd8/BD5050.WAV"),tr("bd8/BD0050.WAV"),tr("bd8/BD1000.WAV")],
 snare:[tr("sd8/SD5050.WAV"),tr("sd8/SD0010.WAV"),tr("sd8/SD1000.WAV")],
 clap:[tr("cp8/CP.WAV"),tr("rs8/RS.WAV")],
 hat:[tr("ch8/CH.WAV")],
 openhat:[tr("oh8/OH00.WAV"),tr("oh8/OH25.WAV"),tr("oh8/OH50.WAV")],
 perc:[tr("mt8/MT25.WAV"),tr("lt8/LT25.WAV"),tr("cb8/CB.WAV")]
};
export const VOICES={
 piano:[
  meta("meta-piano","INSPiano_Vel03_C2_01",36),
  meta("meta-piano","INSPiano_Vel03_C3_01",48),
  meta("meta-piano","INSPiano_Vel03_C4_01",60),
  meta("meta-piano","INSPiano_Vel03_C5_01",72),
  meta("meta-piano","INSPiano_Vel03_C6_01",84)],
 nylon:[
  meta("meta-nylon-guitar","INSGuitarNylon_StringLowE_Vel02Pick_C3_01",48),
  meta("meta-nylon-guitar","INSGuitarNylon_StringG_Vel02Pick_C4_01",60),
  meta("meta-nylon-guitar","INSGuitarNylon_StringG_Vel02Pick_C5_01",72)],
 steel:[
  meta("meta-steel-guitar","INSGuitarSteel_StringA_Vel02_C3_01",48),
  meta("meta-steel-guitar","INSGuitarSteel_StringA_Vel02_C4_01",60),
  meta("meta-steel-guitar","INSGuitarSteel_StringB_Vel02_C5_01",72),
  meta("meta-steel-guitar","INSGuitarSteel_StringHighE_Vel02_C6_01",84)]
};
export const DEFAULT_VOICES={bass:"piano",chords:"piano",arp:"steel",lead:"nylon",counter:"steel",pad:"piano"};
export const DRUM_VARIATIONS=["Main","Alternate","Mixed"];
export const VOICE_NAMES={piano:"Upright piano",nylon:"Nylon guitar",steel:"Steel guitar"};
export function nearestSample(voice,note){
 const items=VOICES[voice]||VOICES.piano;
 return items.reduce((best,s)=>Math.abs(s.root-note)<Math.abs(best.root-note)?s:best,items[0]);
}
export function inventory(){return [...Object.values(DRUMS).flat(),...Object.values(VOICES).flat()]}
