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
// Real, pitch-labelled samples. Every filename below is taken from the pinned upstream
// instrument manifest or Tonejs-Instruments.js map, never inferred from note patterns.
const TONE="https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/622c2f1c32c8cfce4158ddc3eb26e518ddef37e5/samples/";
const metaVoice=(collection,notes)=>notes.map(([root,file])=>({url:META+collection+"/ogg/"+file+".ogg",root,license:"CC0 1.0",source:"Meta Open Sound"}));
const toneVoice=(collection,notes)=>notes.map(([root,file])=>({url:TONE+collection+"/"+file+".mp3",root,license:"CC BY 3.0",source:"tonejs-instruments; original creators credited in sample-source-info.txt"}));
export const VOICES={
 piano:metaVoice("meta-piano",[[36,"INSPiano_Vel03_C2_01"],[48,"INSPiano_Vel03_C3_01"],[60,"INSPiano_Vel03_C4_01"],[72,"INSPiano_Vel03_C5_01"],[84,"INSPiano_Vel03_C6_01"]]),
 pianoSoft:metaVoice("meta-piano",[[36,"INSPiano_Vel02_C2_01"],[48,"INSPiano_Vel02_C3_01"],[60,"INSPiano_Vel02_C4_01"],[72,"INSPiano_Vel02_C5_01"],[84,"INSPiano_Vel02_C6_01"]]),
 pianoBright:metaVoice("meta-piano",[[36,"INSPiano_Vel04_C2_01"],[48,"INSPiano_Vel04_C3_01"],[60,"INSPiano_Vel04_C4_01"],[72,"INSPiano_Vel04_C5_01"],[84,"INSPiano_Vel04_C6_01"]]),
 nylon:metaVoice("meta-nylon-guitar",[[40,"INSGuitarNylon_StringLowE_Vel02Pick_E2_01"],[48,"INSGuitarNylon_StringA_Vel02Pick_C3_01"],[55,"INSGuitarNylon_StringA_Vel02Pick_G3_01"],[60,"INSGuitarNylon_StringA_Vel02Pick_C4_01"],[67,"INSGuitarNylon_StringB_Vel02Pick_G4_01"],[72,"INSGuitarNylon_StringB_Vel02Pick_C5_01"],[76,"INSGuitarNylon_StringB_Vel02Pick_E5_01"]]),
 nylonFinger:metaVoice("meta-nylon-guitar",[[40,"INSGuitarNylon_StringLowE_Vel01Finger_E2_01"],[48,"INSGuitarNylon_StringA_Vel01Finger_C3_01"],[55,"INSGuitarNylon_StringA_Vel01Finger_G3_01"],[60,"INSGuitarNylon_StringA_Vel01Finger_C4_01"],[67,"INSGuitarNylon_StringB_Vel01Finger_G4_01"],[72,"INSGuitarNylon_StringB_Vel01Finger_C5_01"],[76,"INSGuitarNylon_StringB_Vel01Finger_E5_01"]]),
 nylonBright:metaVoice("meta-nylon-guitar",[[40,"INSGuitarNylon_StringLowE_Vel03Pick_E2_01"],[48,"INSGuitarNylon_StringA_Vel03Pick_C3_01"],[55,"INSGuitarNylon_StringA_Vel03Pick_G3_01"],[60,"INSGuitarNylon_StringA_Vel03Pick_C4_01"],[67,"INSGuitarNylon_StringB_Vel03Pick_G4_01"],[72,"INSGuitarNylon_StringB_Vel03Pick_C5_01"],[76,"INSGuitarNylon_StringB_Vel03Pick_E5_01"]]),
 steel:metaVoice("meta-steel-guitar",[[40,"INSGuitarSteel_StringLowE_Vel02_E2_01"],[48,"INSGuitarSteel_StringA_Vel02_C3_01"],[55,"INSGuitarSteel_StringA_Vel02_G3_01"],[60,"INSGuitarSteel_StringA_Vel02_C4_01"],[67,"INSGuitarSteel_StringB_Vel02_G4_01"],[72,"INSGuitarSteel_StringB_Vel02_C5_01"],[76,"INSGuitarSteel_StringB_Vel02_E5_01"]]),
 steelSoft:metaVoice("meta-steel-guitar",[[40,"INSGuitarSteel_StringLowE_Vel01_E2_01"],[48,"INSGuitarSteel_StringA_Vel01_C3_01"],[55,"INSGuitarSteel_StringA_Vel01_G3_01"],[60,"INSGuitarSteel_StringA_Vel01_C4_01"],[67,"INSGuitarSteel_StringB_Vel01_G4_01"],[72,"INSGuitarSteel_StringB_Vel01_C5_01"],[76,"INSGuitarSteel_StringB_Vel01_E5_01"]]),
 steelBright:metaVoice("meta-steel-guitar",[[40,"INSGuitarSteel_StringLowE_Vel03_E2_01"],[48,"INSGuitarSteel_StringA_Vel03_C3_01"],[55,"INSGuitarSteel_StringA_Vel03_G3_01"],[60,"INSGuitarSteel_StringA_Vel03_C4_01"],[67,"INSGuitarSteel_StringB_Vel03_G4_01"],[72,"INSGuitarSteel_StringB_Vel03_C5_01"],[76,"INSGuitarSteel_StringB_Vel03_E5_01"]]),
 electricBass:toneVoice("bass-electric",[[25,"Cs1"],[34,"As1"],[43,"G2"],[52,"E3"],[61,"Cs4"],[70,"As4"]]),
 uprightBass:toneVoice("contrabass",[[30,"Fs1"],[34,"As1"],[40,"E2"],[44,"Gs2"],[52,"E3"],[59,"B3"]]),
 bassoon:toneVoice("bassoon",[[43,"G2"],[48,"C3"],[57,"A3"],[60,"C4"],[67,"G4"],[72,"C5"]]),
 cello:toneVoice("cello",[[36,"C2"],[45,"A2"],[51,"Ds3"],[58,"As3"],[64,"E4"],[72,"C5"]]),
 clarinet:toneVoice("clarinet",[[50,"D3"],[58,"As3"],[65,"F4"],[74,"D5"],[82,"As5"],[90,"Fs6"]]),
 flute:toneVoice("flute",[[60,"C4"],[69,"A4"],[76,"E5"],[81,"A5"],[88,"E6"],[96,"C7"]]),
 horn:toneVoice("french-horn",[[33,"A1"],[39,"Ds2"],[50,"D3"],[53,"F3"],[60,"C4"],[77,"F5"]]),
 acousticGuitar:toneVoice("guitar-acoustic",[[38,"D2"],[45,"A2"],[52,"E3"],[59,"B3"],[67,"G4"],[74,"D5"]]),
 electricGuitar:toneVoice("guitar-electric",[[37,"Cs2"],[45,"A2"],[54,"Fs3"],[66,"Fs4"],[75,"Ds5"],[84,"C6"]]),
 classicalGuitar:toneVoice("guitar-nylon",[[35,"B1"],[45,"A2"],[55,"G3"],[64,"E4"],[74,"D5"],[82,"As5"]]),
 harmonium:toneVoice("harmonium",[[36,"C2"],[43,"G2"],[51,"Ds3"],[57,"A3"],[65,"F4"],[74,"D5"]]),
 harp:toneVoice("harp",[[28,"E1"],[41,"F2"],[59,"B3"],[72,"C5"],[89,"F6"],[101,"F7"]]),
 organ:toneVoice("organ",[[24,"C1"],[36,"C2"],[48,"C3"],[60,"C4"],[72,"C5"],[84,"C6"]]),
 concertPiano:toneVoice("piano",[[24,"C1"],[41,"F2"],[57,"A3"],[74,"D5"],[90,"Fs6"],[107,"B7"]]),
 sax:toneVoice("saxophone",[[49,"Cs3"],[55,"G3"],[62,"D4"],[69,"A4"],[75,"Ds5"],[81,"A5"]]),
 trombone:toneVoice("trombone",[[34,"As1"],[41,"F2"],[48,"C3"],[56,"Gs3"],[61,"Cs4"],[65,"F4"]]),
 trumpet:toneVoice("trumpet",[[53,"F3"],[60,"C4"],[65,"F4"],[70,"As4"],[77,"F5"],[84,"C6"]]),
 tuba:toneVoice("tuba",[[29,"F1"],[39,"Ds2"],[41,"F2"],[50,"D3"],[53,"F3"],[62,"D4"]]),
 violin:toneVoice("violin",[[57,"A3"],[67,"G4"],[72,"C5"],[81,"A5"],[88,"E6"],[96,"C7"]]),
 xylophone:toneVoice("xylophone",[[67,"G4"],[72,"C5"],[84,"C6"],[91,"G6"],[103,"G7"],[108,"C8"]]),
};
export const VOICE_NAMES={
  "piano": "Upright piano",
  "pianoSoft": "Soft upright piano",
  "pianoBright": "Bright upright piano",
  "nylon": "Nylon guitar · picked",
  "nylonFinger": "Nylon guitar · fingerstyle",
  "nylonBright": "Nylon guitar · strong attack",
  "steel": "Steel-string guitar",
  "steelSoft": "Soft steel-string guitar",
  "steelBright": "Bright steel-string guitar",
  "electricBass": "Electric bass",
  "uprightBass": "Double bass",
  "bassoon": "Bassoon",
  "cello": "Cello",
  "clarinet": "Clarinet",
  "flute": "Flute",
  "horn": "French horn",
  "acousticGuitar": "Acoustic guitar",
  "electricGuitar": "Electric guitar",
  "classicalGuitar": "Classical guitar",
  "harmonium": "Harmonium",
  "harp": "Harp",
  "organ": "Organ",
  "concertPiano": "Concert piano",
  "sax": "Saxophone",
  "trombone": "Trombone",
  "trumpet": "Trumpet",
  "tuba": "Tuba",
  "violin": "Violin",
  "xylophone": "Xylophone"
};
export const VOICE_FAMILIES={
  "Bass": [
    "electricBass",
    "uprightBass"
  ],
  "Keys & organs": [
    "piano",
    "pianoSoft",
    "pianoBright",
    "concertPiano",
    "organ",
    "harmonium"
  ],
  "Guitars": [
    "nylon",
    "nylonFinger",
    "nylonBright",
    "steel",
    "steelSoft",
    "steelBright",
    "acousticGuitar",
    "electricGuitar",
    "classicalGuitar"
  ],
  "Strings": [
    "cello",
    "violin",
    "harp"
  ],
  "Brass": [
    "horn",
    "trombone",
    "trumpet",
    "tuba"
  ],
  "Winds": [
    "bassoon",
    "clarinet",
    "flute",
    "sax"
  ],
  "Mallets": [
    "xylophone"
  ]
};
export const DEFAULT_VOICES={bass:"electricBass",chords:"pianoSoft",arp:"steel",lead:"nylon",counter:"violin",pad:"harmonium"};
export const DRUM_VARIATIONS=["Mixed"]; // legacy compatibility
export function nearestSample(voice,note){
 const list=VOICES[voice]||VOICES.piano;
 return list.reduce((best,s)=>Math.abs(s.root-note)<Math.abs(best.root-note)?s:best,list[0]);
}
export function inventory(){
 return [...new Map([...Object.values(DRUMS).flat(),...Object.values(VOICES).flat()].map(s=>[s.url,s])).values()];
}
