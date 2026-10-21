// Human Radio DnB: CC0 acoustic kit strikes, performed by Austin McMahon.
// Original release and primary licence:
// https://versilian-studios.com/virtuosity-drums/
// https://github.com/sfzinstruments/virtuosity_drums/blob/9f04cf9a734527edfbb0a4eee1f674e45bbf71bc/LICENSE
// Keyboardia independently adapts the original kit into pinned AAC-LC files.
// Build-time ffmpeg converts the input AAC to same-origin MP3; the browser
// loads the mirrored MP3, never the source AAC. No copyrighted break loops.
const ROOT="https://raw.githubusercontent.com/adewale/keyboardia/869d3f5095084003e1251aa3ebf2eab8f65f62fe/app/public/instruments/";
const sample=(instrument,file,label)=>({
 url:ROOT+instrument+"/"+file+".m4a",label,
 license:"CC0 1.0",source:"Virtuosity Drums · Versilian Studios / Karoryfer; Keyboardia AAC delivery",
 originalRelease:"https://versilian-studios.com/virtuosity-drums/",
 originalLicense:"https://github.com/sfzinstruments/virtuosity_drums/blob/9f04cf9a734527edfbb0a4eee1f674e45bbf71bc/LICENSE"
});
export const DNB_BREAK_KIT={
 kick:[
  sample("acoustic-kick","source-0010","Acoustic kit kick · mid-strong"),
  sample("acoustic-kick","source-0014","Acoustic kit kick · strong")
 ],
 snare:[
  sample("acoustic-snare","source-0028","Acoustic kit snare · loud"),
  sample("acoustic-snare","source-0026","Acoustic kit snare · loud variation")
 ],
 ghost:[
  sample("acoustic-snare","source-0023","Acoustic kit snare · soft ghost"),
  sample("acoustic-snare","source-0032","Acoustic kit snare · soft ghost variation")
 ],
 hat:[
  sample("acoustic-hihat-closed","source-0010","Acoustic closed hat · mid"),
  sample("acoustic-hihat-closed","source-0011","Acoustic closed hat · mid variation")
 ],
 openhat:[
  sample("acoustic-hihat-open","source-0008","Acoustic open hat · mid"),
  sample("acoustic-hihat-open","source-0009","Acoustic open hat · mid variation")
 ]
};
export function dnbDrumSample(track,velocity,step,seed=0){
 const role=track==="snare"&&velocity<.34?"ghost":track;
 const options=DNB_BREAK_KIT[role];
 if(!options)return null;
 // A per-piece hash sets the starting variation; the actual onset decides
 // the hit. Quarter-note and eighth-note position together ensure ghosts
 // on 3/7 and 11/15 alternate despite sharing a half-bar. Unlike seed
 // length, the word content changes the starting variation between songs.
 let hash=2166136261;
 for(const char of String(seed)+"|"+role)
   hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 hash^=hash>>>16;
 hash=Math.imul(hash,0x7feb352d)>>>0;
 hash^=hash>>>15;
 const hit=Math.floor(step/2)+Math.floor(step/4);
 const selection=((hash>>>0)+hit)%options.length;
 return options[selection];
}
