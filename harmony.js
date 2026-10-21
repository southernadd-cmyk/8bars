// Pure, validated harmony choices shared by the composer and browser UI.
// Only real chord tones are generated here; audio remains recorded-sample playback.
export const CHORD_ROOTS=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
export const CHORD_QUALITIES=["","m","dim"];
const INTERVALS={"":[0,4,7],m:[0,3,7],dim:[0,3,6]};
const SCALES={major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10]};

export function validChordSymbol(symbol){
 if(typeof symbol!=="string"||symbol.length>5)return false;
 return CHORD_ROOTS.some(root=>CHORD_QUALITIES.some(quality=>symbol===root+quality));
}
export function normalizeHarmonyOverrides(input){
 const values=Array.isArray(input)?input:[];
 return Array.from({length:8},(_,index)=>validChordSymbol(values[index])?values[index]:null);
}
export function readHarmonyParam(value){
 if(typeof value!=="string"||value.length>80)return normalizeHarmonyOverrides(null);
 const parts=value.split(",");
 if(parts.length!==8)return normalizeHarmonyOverrides(null);
 return normalizeHarmonyOverrides(parts);
}
export function chordFromSymbol(symbol,bar){
 if(!validChordSymbol(symbol)||!Number.isInteger(bar)||bar<1||bar>8)
  throw new RangeError("Invalid chord or bar");
 const rootName=CHORD_ROOTS.find(root=>symbol===root||CHORD_QUALITIES.slice(1).some(q=>symbol===root+q));
 const quality=symbol.slice(rootName.length);
 const root=48+CHORD_ROOTS.indexOf(rootName);
 return {bar,degree:null,notes:INTERVALS[quality].map(interval=>root+interval),edited:true};
}
export function chordSymbol(chord){
 if(!chord?.notes||chord.notes.length<3)return "?";
 const [root,third,fifth,seventh]=chord.notes;
 const pitch=CHORD_ROOTS[((root%12)+12)%12];
 const thirdInterval=((third-root)%12+12)%12;
 const fifthInterval=((fifth-root)%12+12)%12;
 const seventhInterval=seventh===undefined?null:((seventh-root)%12+12)%12;
 const quality=thirdInterval===3&&fifthInterval===6?"dim":thirdInterval===3?"m":"";
 if(seventhInterval===null)return pitch+quality;
 if(quality==="dim"&&seventhInterval===10)return pitch+"m7♭5";
 if(quality==="dim"&&seventhInterval===9)return pitch+"dim7";
 if(!quality&&seventhInterval===11)return pitch+"maj7";
 if(seventhInterval===10)return pitch+quality+"7";
 return pitch+quality;
}
export const ALL_CHORDS=CHORD_ROOTS.flatMap(root=>CHORD_QUALITIES.map(quality=>root+quality));
export function chordsInKey(key,mode){
 const tonic=CHORD_ROOTS.indexOf(key),scale=SCALES[mode];
 if(tonic<0||!scale)return [];
 const pc=degree=>scale[degree%7]+12*Math.floor(degree/7);
 return Array.from({length:7},(_,degree)=>{
   const root=pc(degree),third=pc(degree+2),fifth=pc(degree+4);
   const quality=mode==="minor"&&degree===4?"":third-root===3?(fifth-root===6?"dim":"m"):"";
   return CHORD_ROOTS[(tonic+root)%12]+quality;
 });
}
