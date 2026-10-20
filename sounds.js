import {VOCAL_VOICES} from "./vocal-samples.js";
import {EXTRA_VOICES} from "./extra-samples.js";
import {INSTRUMENT_UPGRADES} from "./instrument-maps.js?v=0.6.1";
import {VCSL_REF,VCSL_VOICES,VCSL_DRUMS} from "./vcsl-samples.js?v=0.6.2";
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
// Additional CC0 drum one-shots, sourced directly from the published Octal manifest.
// Git revision is pinned so labels, URLs and sound content are reproducible.
const HOUSE_DRUMS={
 "kick": [
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/kicks/sub-01.wav",
   "label": "House · deep, sub",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/kicks/sub-02.wav",
   "label": "House · deep, sub",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/kicks/sub-03.wav",
   "label": "House · deep, round",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/kicks/punch-01.wav",
   "label": "House · punchy, solid",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/kicks/punch-02.wav",
   "label": "House · punchy, solid",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/kicks/punch-03.wav",
   "label": "House · punchy, bright",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/kicks/punch-04.wav",
   "label": "House · punchy, bright",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/kicks/deep-01.wav",
   "label": "House · warm, round",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/kicks/deep-02.wav",
   "label": "House · warm, round",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/kicks/tight-01.wav",
   "label": "House · tight, short",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/kicks/tight-02.wav",
   "label": "House · tight, short",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/kicks/tight-03.wav",
   "label": "House · tight, clicky",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  }
 ],
 "snare": [
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/snares/snap-01.wav",
   "label": "House · snappy, short",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/snares/body-01.wav",
   "label": "House · full, warm",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  }
 ],
 "clap": [
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/claps/classic-01.wav",
   "label": "House · tight, dry",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/claps/classic-02.wav",
   "label": "House · wide, roomy",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/claps/classic-03.wav",
   "label": "House · snappy, bright",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  }
 ],
 "hat": [
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/hats/closed-01.wav",
   "label": "House · tight, crisp",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/hats/closed-02.wav",
   "label": "House · crisp, bright",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/hats/closed-03.wav",
   "label": "House · bright, sizzly",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/hats/closed-04.wav",
   "label": "House · short, clicky",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/hats/closed-05.wav",
   "label": "House · loose, airy",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/hats/closed-06.wav",
   "label": "House · dark, tight",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/hats/closed-07.wav",
   "label": "House · crunchy, tight",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/hats/closed-08.wav",
   "label": "House · crunchy, bright",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/hats/closed-09.wav",
   "label": "House · airy, soft",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  }
 ],
 "openhat": [
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/hats/open-01.wav",
   "label": "House · washy, open",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/hats/open-02.wav",
   "label": "House · long, bright",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/hats/open-03.wav",
   "label": "House · airy, long",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/hats/open-04.wav",
   "label": "House · crunchy, open",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  }
 ],
 "perc": [
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/percs/tom-01.wav",
   "label": "House · low, round",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/percs/tom-02.wav",
   "label": "House · mid, round",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/percs/tom-03.wav",
   "label": "House · high, round",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/percs/blip-01.wav",
   "label": "House · melodic, short",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/percs/blip-02.wav",
   "label": "House · bright, short",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/percs/blip-03.wav",
   "label": "House · glassy, short",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/percs/tick-01.wav",
   "label": "House · dry, tight",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/percs/tick-02.wav",
   "label": "House · woody, tight",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/percs/shaker-01.wav",
   "label": "House · loose, airy",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/percs/shaker-02.wav",
   "label": "House · driving, tight",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/cymbals/crash-01.wav",
   "label": "House · washy, long",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  },
  {
   "url": "https://raw.githubusercontent.com/octalmusic/octal-samples/22d222ce36e290ba3792c776811aa9c69dcc8776/samples/cymbals/ride-01.wav",
   "label": "House · metallic, bright",
   "license": "CC0 1.0",
   "source": "Octal house-core"
  }
 ]
};
for(const [track,recordings] of Object.entries(HOUSE_DRUMS))DRUMS[track].push(...recordings);
// Additional *recorded* acoustic drum and percussion one-shots (CC0).
const vcslUrl=path=>"https://raw.githubusercontent.com/sgossner/VCSL/"+VCSL_REF+"/"+path.split("/").map(encodeURIComponent).join("/");
for(const [track,samples] of Object.entries(VCSL_DRUMS))
 DRUMS[track==="openHat"?"openhat":track].push(...samples.map(([path,label])=>({url:vcslUrl(path),label:"Recorded · "+label,license:"CC0 1.0",source:"Versilian Community Sample Library"})));
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
 cello:toneVoice("cello",[[36,"C2"],[45,"A2"],[51,"Ds3"],[58,"As3"],[64,"E4"],[72,"C5"]]),
 horn:toneVoice("french-horn",[[33,"A1"],[39,"Ds2"],[50,"D3"],[53,"F3"],[60,"C4"],[77,"F5"]]),
 acousticGuitar:toneVoice("guitar-acoustic",[[38,"D2"],[45,"A2"],[52,"E3"],[59,"B3"],[67,"G4"],[74,"D5"]]),
 electricGuitar:toneVoice("guitar-electric",[[37,"Cs2"],[45,"A2"],[54,"Fs3"],[66,"Fs4"],[75,"Ds5"],[84,"C6"]]),
 classicalGuitar:toneVoice("guitar-nylon",[[35,"B1"],[45,"A2"],[55,"G3"],[64,"E4"],[74,"D5"],[82,"As5"]]),
 harmonium:toneVoice("harmonium",[[36,"C2"],[43,"G2"],[51,"Ds3"],[57,"A3"],[65,"F4"],[74,"D5"]]),
 harp:toneVoice("harp",[[28,"E1"],[41,"F2"],[59,"B3"],[72,"C5"],[89,"F6"],[101,"F7"]]),
 organ:toneVoice("organ",[[24,"C1"],[36,"C2"],[48,"C3"],[60,"C4"],[72,"C5"],[84,"C6"]]),
 concertPiano:toneVoice("piano",[[24,"C1"],[41,"F2"],[57,"A3"],[74,"D5"],[90,"Fs6"],[107,"B7"]]),
 trombone:toneVoice("trombone",[[34,"As1"],[41,"F2"],[48,"C3"],[56,"Gs3"],[61,"Cs4"],[65,"F4"]]),
 trumpet:toneVoice("trumpet",[[53,"F3"],[60,"C4"],[65,"F4"],[70,"As4"],[77,"F5"],[84,"C6"]]),
 tuba:toneVoice("tuba",[[29,"F1"],[39,"Ds2"],[41,"F2"],[50,"D3"],[53,"F3"],[62,"D4"]]),
 violin:toneVoice("violin",[[57,"A3"],[67,"G4"],[72,"C5"],[81,"A5"],[88,"E6"],[96,"C7"]]),
 xylophone:toneVoice("xylophone",[[67,"G4"],[72,"C5"],[84,"C6"],[91,"G6"],[103,"G7"],[108,"C8"]]),
};
// Expand pitch coverage without adding duplicate instrument labels or presets.
for(const [id,entry] of Object.entries(INSTRUMENT_UPGRADES)){
 if(!Object.hasOwn(VOICES,id))throw new Error("Unknown instrument map "+id);
 VOICES[id]=entry.type==="meta"?metaVoice(entry.folder,entry.notes):
   toneVoice(entry.folder,entry.notes);
}
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
  "cello": "Cello",
  "horn": "French horn",
  "acousticGuitar": "Acoustic guitar",
  "electricGuitar": "Electric guitar",
  "classicalGuitar": "Classical guitar",
  "harmonium": "Harmonium",
  "harp": "Harp",
  "organ": "Organ",
  "concertPiano": "Concert piano",
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
  "Mallets": [
    "xylophone"
  ]
};
// Independent recorded acoustic instruments, with multiple genuine roots and dynamics.
for(const [id,definition] of Object.entries(VCSL_VOICES)){
 VOICES[id]=definition.files.map(([root,path,vel])=>({url:vcslUrl(path),root,vel,
   license:"CC0 1.0",source:"Versilian Community Sample Library"}));
 VOICE_NAMES[id]=definition.name;
 (VOICE_FAMILIES[definition.family]??=[]).push(id);
}
for(const [id,definition] of Object.entries(EXTRA_VOICES)){
 VOICES[id]=definition.files.map(([root,path,vel])=>({url:vcslUrl(path),root,vel,license:"CC0 1.0",source:"Versilian Community Sample Library"}));
 VOICE_NAMES[id]=definition.name;
 (VOICE_FAMILIES[definition.family]??=[]).push(id);
}
// Short CC0 vocal chops are real recorded sounds, not pitch-labelled instruments.
// Keep their spoken/vocal speed intact until sung samples have measured pitch.
VOICE_FAMILIES["Vocal chops"]=[];
for(const [id,definition] of Object.entries(VOCAL_VOICES)){
 VOICES[id]=definition.files;
 VOICE_NAMES[id]=definition.name;
 VOICE_FAMILIES["Vocal chops"].push(id);
}
export const DEFAULT_VOICES={bass:"electricBass",chords:"pianoSoft",arp:"steel",lead:"nylon",counter:"violin",pad:"harmonium"};
export const DRUM_VARIATIONS=["Mixed"]; // legacy compatibility
export function nearestSample(voice,note,velocity=.65){
 const list=VOICES[voice]||VOICES.piano;
 const distance=Math.min(...list.map(s=>Math.abs(s.root-note)));
 const candidates=list.filter(s=>Math.abs(s.root-note)===distance);
 // Prefer a real sample recorded near the event's dynamic, rather than
 // mistaking one repitched note for an alternative recording.
 const requested=Math.max(0,Math.min(100,Math.round(velocity*100)));
 return candidates.reduce((best,s)=>Math.abs((s.vel??65)-requested)<Math.abs((best.vel??65)-requested)?s:best,candidates[0]);
}
export function inventory(){
 return [...new Map([...Object.values(DRUMS).flat(),...Object.values(VOICES).flat()].map(s=>[s.url,s])).values()];
}


/**
 * A new composition gets new sound choices as well as new musical events.
 * Pools keep the random combinations suitable for their musical roles.
 * Mixer dropdowns still offer the full catalogue for manual selection.
 */
export const REGEN_VOICE_POOLS={
  "bass": [
    "electricBass",
    "uprightBass",
    "cello",
    "tuba",
    "organ",
    "harmonium",
    "electricGuitar",
    "concertPiano",
    "piano"
  ],
  "chords": [
    "piano",
    "pianoSoft",
    "pianoBright",
    "concertPiano",
    "organ",
    "harmonium",
    "nylon",
    "steel",
    "acousticGuitar",
    "electricGuitar",
    "classicalGuitar",
    "harp"
  ],
  "arp": [
    "piano",
    "pianoBright",
    "concertPiano",
    "nylon",
    "steel",
    "acousticGuitar",
    "electricGuitar",
    "classicalGuitar",
    "harp",
    "xylophone",
    "harmonium"
  ],
  "lead": [
    "vocalOpenAh","vocalSyllable","vocalMelisma","vocalEffects",
    "nylon",
    "nylonBright",
    "steel",
    "steelBright",
    "acousticGuitar",
    "electricGuitar",
    "classicalGuitar",
    "violin",
    "cello",
    "trumpet",
    "horn",
    "xylophone",
    "harp",
    "concertPiano"
  ],
  "counter": [
    "vocalOpenAh","vocalSyllable","vocalMelisma","vocalEffects",
    "violin",
    "cello",
    "trumpet",
    "horn",
    "trombone",
    "harp",
    "organ",
    "concertPiano",
    "electricGuitar",
    "steelSoft"
  ],
  "pad": [
    "vocalOpenAh","vocalMelisma",
    "harmonium",
    "organ",
    "pianoSoft",
    "concertPiano",
    "violin",
    "cello",
    "horn",
    "trombone",
    "harp",
    "nylonFinger",
    "steelSoft"
  ]
};
// Extend role-specific generation with playable recorded timbres, not arbitrary
// substitutions (e.g. a glockenspiel on the bass channel).
const sampleRange=id=>{
 const roots=VOICES[id].map(s=>s.root);
 return [Math.min(...roots),Math.max(...roots)];
};
for(const [id,def] of Object.entries(VCSL_VOICES)){
 const [low,high]=sampleRange(id),family=def.family;
 for(const [role,pool] of Object.entries(REGEN_VOICE_POOLS)){
   const suitable=role==="bass"?low<=50&&high>=43&&["Keys & organs","Plucked strings","Winds"].includes(family):
     role==="chords"?low<=65&&high>=65&&["Keys & organs","Plucked strings","Mallets & bells"].includes(family):
     role==="arp"?low<=72&&high>=64&&family!=="Winds":
     role==="pad"?low<=72&&high>=65&&["Keys & organs","Bowed strings","Winds"].includes(family):
     low<=84&&high>=69;
   if(suitable)pool.push(id);
 }
}
export function regenerateSelections(currentVoices,currentDrums,randomIndex){
 if(typeof randomIndex!=="function")throw new TypeError("A random index function is required");
 const pick=(options,old)=>{
   const alternatives=options.filter(value=>value!==old);
   if(!alternatives.length)return old;
   const index=randomIndex(alternatives.length);
   if(!Number.isInteger(index)||index<0||index>=alternatives.length)throw new RangeError("Invalid random index");
   return alternatives[index];
 };
 const voices={...currentVoices},drumSounds={...currentDrums};
 for(const [track,ids] of Object.entries(REGEN_VOICE_POOLS))
   voices[track]=pick(ids.filter(id=>Object.hasOwn(VOICES,id)),currentVoices[track]);
 for(const [track,items] of Object.entries(DRUMS))
   drumSounds[track]=pick(items.map((_,index)=>index),currentDrums[track]);
 return {voices,drumSounds};
}
