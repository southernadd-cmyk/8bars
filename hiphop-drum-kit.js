// Verified CC0 hip-hop one-shots: genre-specific kits, distinct from the pop drum bank.
// Fixed upstream revision; the Pages build transcodes these WAVs to local MP3.
// https://github.com/Boochi44/free-drum-samples/blob/77ba31428a079dd8f17c8e144c1e649ea0a198b3/README.md
const BASE="https://raw.githubusercontent.com/Boochi44/free-drum-samples/77ba31428a079dd8f17c8e144c1e649ea0a198b3/drum-samples/";
const sound=(pack,path,label)=>({
 url:BASE+pack+"/"+path+".wav",label,oneShot:true,license:"CC0 1.0",
 source:"Boochi44 free-drum-samples · "+pack+" (CC0)"
});
const vintage="03-soulful-vintage",bounce="02-bounce",trap="01-hard-trap";
export const HIPHOP_KITS={
 vintage:{
  kick:[sound(vintage,"kicks/vintage-kick-01","Vintage kick 1"),sound(vintage,"kicks/vintage-kick-02","Vintage kick 2")],
  snare:[sound(vintage,"snares/vintage-snare-01","Vintage snare 1"),sound(vintage,"snares/vintage-snare-02","Vintage snare 2")],
  clap:[sound(vintage,"claps/vintage-clap-01","Vintage clap")],
  hat:[sound(vintage,"hi-hats/ch-lofi","Lo-fi hat")],
  openhat:[sound(vintage,"open-hats/oh00-lofi","Lo-fi open hat")],
  perc:[sound(vintage,"percs/perc-maraca","Vintage maraca")]
 },
 bounce:{
  kick:[sound(bounce,"kicks/bounce-kick-01","Bounce kick 1"),sound(bounce,"kicks/bounce-kick-02","Bounce kick 2")],
  snare:[sound(bounce,"snares/bounce-snare-01","Bounce snare 1"),sound(bounce,"snares/bounce-snare-02","Bounce snare 2")],
  clap:[sound(bounce,"claps/clap-01","Bounce clap")],
  hat:[sound(bounce,"hi-hats/hi-hat-closed-01","Bounce hat")],
  openhat:[sound(bounce,"open-hats/open-hat-01","Bounce open hat")],
  perc:[sound(bounce,"percs/perc-high-tom","Bounce tom")]
 },
 trap:{
  kick:[sound(trap,"kicks/hard-kick-01","Trap kick 1"),sound(trap,"kicks/hard-kick-02","Trap kick 2")],
  snare:[sound(trap,"snares/hard-snare-01","Trap snare 1"),sound(trap,"snares/hard-snare-02","Trap snare 2")],
  clap:[sound(trap,"claps/clap-01","Trap clap")],
  hat:[sound(trap,"hi-hats/hi-hat-closed-01","Trap hat")],
  openhat:[sound(trap,"open-hats/open-hat-01","Trap open hat")],
  perc:[sound(trap,"percs/perc-rimshot","Trap rimshot")]
 }
};
export function hiphopKitForScene(scene){
 return scene==="trap"?"trap":scene==="west-coast"?"bounce":"vintage";
}
function hash(value){
 let n=2166136261;
 for(const ch of String(value))n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;
 return n>>>0;
}
export function hiphopDrumSample(scene,track,step,seed){
 const samples=HIPHOP_KITS[hiphopKitForScene(scene)][track];
 if(!samples?.length)return null;
 // Keep one recognizable kit per chapter while alternating recorded takes
 // at musical phrase boundaries, not randomly replacing each note.
 const phrase=Math.floor(step/32);
 return samples[(hash(seed+"|"+track)+phrase)%samples.length];
}
