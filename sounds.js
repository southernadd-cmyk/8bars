// CC0 catalogue — sampled instruments and TR-808 source files pinned to immutable commits.
// The manifest declares choices; audio is fetched only when a choice is used.
const TR="https://raw.githubusercontent.com/tidalcycles/sounds-tr808-fischer/85fbecf1bec32553395625ea659e2a56dfd7c0e1/";
const META="https://raw.githubusercontent.com/facebookincubator/Meta-open-sound/e2ff154845994fe4135becc4d5b857c19f172784/systems/instruments/";
const drum=(path,label)=>({url:TR+path,label,license:"CC0 1.0",source:"Michael Fischer TR-808"});
const inst=(collection,file,root)=>({url:META+collection+"/ogg/"+file+".ogg",root,license:"CC0 1.0",source:"Meta Open Sound"});
const variants=(prefix,names,label)=>names.map((name,i)=>drum(prefix+"/"+name+".WAV",label+" · "+(i+1)));
export const DRUMS={
 kick:variants("bd8",["BD0000","BD0010","BD0050","BD1000","BD1025","BD2500","BD2510","BD2550","BD5000","BD5050","BD7500","BD7550"],"TR-808 kick"),
 snare:variants("sd8",["SD0000","SD0010","SD0050","SD1000","SD1025","SD2500","SD2510","SD2550","SD5000","SD5050","SD7500","SD7550"],"TR-808 snare"),
 clap:[drum("cp8/CP.WAV","808 clap"),drum("rs8/RS.WAV","808 rim shot"),drum("cl8/CL.WAV","808 claves")],
 hat:[drum("ch8/CH.WAV","Closed hi-hat"),drum("hc8/HC00.WAV","Hi conga"),drum("ma8/MA.WAV","Maraca")],
 openhat:variants("oh8",["OH00","OH10","OH25","OH50","OH75"],"Open hi-hat"),
 perc:[
  ...variants("lt8",["LT00","LT10","LT25","LT50","LT75"],"Low tom"),
  ...variants("mt8",["MT00","MT10","MT25","MT50","MT75"],"Mid tom"),
  ...variants("ht8",["HT00","HT10","HT25","HT50","HT75"],"High tom"),
  drum("cb8/CB.WAV","Cowbell"),drum("ma8/MA.WAV","Maraca"),drum("cl8/CL.WAV","Claves"),
  ...variants("cy8",["CY0000","CY0010","CY0025","CY0050","CY1000","CY2500","CY5000","CY7500"],"Cymbal")
 ]
};
const piano=(vel)=>[2,3,4,5,6].map(oct=>inst("meta-piano","INSPiano_Vel"+vel+"_C"+oct+"_01",12*(oct+1)));
const nylon=(vel)=>[
 ["StringLowE","C3",48],["StringG","C4",60],["StringG","C5",72]
].map(([str,n,root])=>inst("meta-nylon-guitar","INSGuitarNylon_"+str+"_"+vel+"_"+n+"_01",root));
const steel=(vel)=>[
 ["StringA","C3",48],["StringA","C4",60],["StringB","C5",72],["StringHighE","C6",84]
].map(([str,n,root])=>inst("meta-steel-guitar","INSGuitarSteel_"+str+"_"+vel+"_"+n+"_01",root));
export const VOICES={
 piano:piano("03"),
 pianoSoft:piano("02"),
 pianoBright:piano("04"),
 nylon:nylon("Vel02Pick"),
 nylonFinger:nylon("Vel01Finger"),
 nylonBright:nylon("Vel03Pick"),
 steel:steel("Vel02"),
 steelSoft:steel("Vel01"),
 steelBright:steel("Vel03")
};
export const DEFAULT_VOICES={bass:"piano",chords:"pianoSoft",arp:"steel",lead:"nylon",counter:"steelSoft",pad:"pianoSoft"};
export const VOICE_NAMES={
 piano:"Upright piano",pianoSoft:"Soft piano",pianoBright:"Bright piano",
 nylon:"Nylon guitar",nylonFinger:"Fingerstyle nylon",nylonBright:"Bright nylon",
 steel:"Steel guitar",steelSoft:"Soft steel guitar",steelBright:"Bright steel guitar"
};
export const DRUM_VARIATIONS=["Mixed"]; // legacy export; individual sample choices live in DRUMS
export function nearestSample(voice,note){
 const list=VOICES[voice]||VOICES.piano;
 return list.reduce((best,s)=>Math.abs(s.root-note)<Math.abs(best.root-note)?s:best,list[0]);
}
export function inventory(){
 // The same recording may be offered on different channels; count it only once.
 return [...new Map([...Object.values(DRUMS).flat(),...Object.values(VOICES).flat()].map(s=>[s.url,s])).values()];
}
