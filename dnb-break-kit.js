// Acoustic DnB kit from the CC0 Virtuosity Drums performances.
// Each listed file is a different real take in the *specified* MIDI velocity
// range. Keyboardia supplies pinned mid-mic AACs, which our Pages build mirrors
// as same-origin MP3 before visitors play anything. No synthesised drum hits.
// Primary source: https://versilian-studios.com/virtuosity-drums/
// Original CC0: https://github.com/sfzinstruments/virtuosity_drums/blob/9f04cf9a734527edfbb0a4eee1f674e45bbf71bc/LICENSE
const ROOT="https://raw.githubusercontent.com/adewale/keyboardia/869d3f5095084003e1251aa3ebf2eab8f65f62fe/app/public/instruments/";
const RELEASE="https://versilian-studios.com/virtuosity-drums/";
const LICENSE="https://github.com/sfzinstruments/virtuosity_drums/blob/9f04cf9a734527edfbb0a4eee1f674e45bbf71bc/LICENSE";
const takes=(instrument,entries,label)=>entries.map(([number,velocityMin,velocityMax],i)=>({
 url:ROOT+instrument+"/source-"+String(number).padStart(4,"0")+".m4a",
 label:label+" · velocity "+velocityMin+"–"+velocityMax+" · take "+(i+1),
 velocityMin,velocityMax,
 license:"CC0 1.0",
 source:"Virtuosity Drums · Versilian Studios / Karoryfer; Keyboardia AAC delivery",
 originalRelease:RELEASE,originalLicense:LICENSE
}));
// Velocity bounds below are taken directly from Keyboardia's curated
// Virtuosity Drums manifests, NOT guessed from a sample filename. All
// 16/16/16/12 source files are deliberately included: quiet to strong hits.
export const DNB_BREAK_KIT={
 kick:takes("acoustic-kick",[[1,0,31],[2,0,31],[3,0,31],[4,0,31],[5,32,63],[6,32,63],[7,32,63],[8,32,63],[9,64,95],[10,64,95],[11,64,95],[12,64,95],[13,96,127],[14,96,127],[15,96,127],[16,96,127]],"Acoustic kick"),
 snare:takes("acoustic-snare",[[5,32,63],[4,32,63],[9,32,63],[10,32,63],[16,64,95],[13,64,95],[17,64,95],[18,64,95],[28,96,127],[26,96,127],[24,96,127],[29,96,127]],"Acoustic snare"),
 ghost:takes("acoustic-snare",[[23,0,31],[32,0,31],[12,0,31],[34,0,31]],"Soft acoustic snare"),
 hat:takes("acoustic-hihat-closed",[[1,0,31],[2,0,31],[3,0,31],[4,0,31],[5,32,63],[6,32,63],[7,32,63],[8,32,63],[9,64,95],[10,64,95],[11,64,95],[12,64,95],[13,96,127],[14,96,127],[15,96,127],[16,96,127]],"Acoustic closed hi-hat"),
 openhat:takes("acoustic-hihat-open",[[1,0,31],[2,0,31],[3,0,31],[4,32,63],[5,32,63],[6,32,63],[7,64,95],[8,64,95],[9,64,95],[10,96,127],[11,96,127],[12,96,127]],"Acoustic open hi-hat")
};
function seedOffset(seed,role,zone){
 let hash=2166136261;
 for(const char of String(seed)+"|"+role+"|"+zone)
   hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d)>>>0;hash^=hash>>>15;
 return hash>>>0;
}
export function dnbDrumSample(track,velocity,step,seed=0){
 const role=track==="snare"&&velocity<.34?"ghost":track;
 const options=DNB_BREAK_KIT[role];
 if(!options)return null;
 // Select an actual performance layer. "Ghost" always uses the quietest
 // snare recordings; main snare/hats/kicks map 0..1 to MIDI 0..127.
 const midiVelocity=Math.max(0,Math.min(127,Math.round(velocity*127)));
 const choices=options.filter(s=>role==="ghost"||
   s.velocityMin<=midiVelocity&&midiVelocity<=s.velocityMax);
 // Every defined role covers its full playable MIDI range.
 if(!choices.length)throw Error("No acoustic velocity layer for "+role+": "+midiVelocity);
 const zone=choices[0].velocityMin;
 // Alternate distinct *performances*, not merely gain, at every kick/snare
 // quarter-note and each hi-hat eighth-note. Same-bar ghost pairs 3/7,
 // 11/15 receive adjacent takes. Whole-seed hash changes which take begins.
 const stride=track==="kick"||track==="snare"?4:2;
 const hit=Math.floor(step/stride)+Math.floor(step/16);
 return choices[(seedOffset(seed,role,zone)+hit)%choices.length];
}
