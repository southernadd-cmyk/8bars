// Human Radio channels: musical constraints and recorded-drum arrangements.
// All events are MIDI-like instructions, never generated audio or fake samples.
export const RADIO_CHANNELS={
 mixed:{name:"Mixed",description:"All musical scenes and composition systems",scenes:[]},
 hiphop:{name:"Hip-hop",description:"Boom-bap, lo-fi, West Coast bounce and modern trap, with dedicated recorded drum kits",scenes:[
   {id:"boom-bap",name:"Boom bap",styles:["downtempo","breakbeat"],engines:["pattern","melodic","ecology"],bpm:[82,98],density:[.47,.73],swing:[.15,.30],loops:[5,6,6]},
   {id:"head-nod",name:"Head nod",styles:["downtempo","breakbeat"],engines:["melodic","process","ecology"],bpm:[78,96],density:[.40,.67],swing:[.10,.24],loops:[5,6,7]},
   {id:"lofi",name:"Lo-fi",styles:["downtempo"],engines:["melodic","ecology","process"],bpm:[76,92],density:[.34,.57],swing:[.09,.20],loops:[5,6,7]},
   {id:"west-coast",name:"West Coast",styles:["breakbeat","downtempo"],engines:["pattern","melodic","ecology"],bpm:[88,104],density:[.55,.78],swing:[.08,.20],loops:[5,6,7]},
   {id:"trap",name:"Trap",styles:["breakbeat","downtempo"],engines:["pattern","process","ecology"],bpm:[74,90],density:[.48,.77],swing:[0,.045],loops:[5,6,7]}
 ]},
 dnb:{name:"Drum & Bass",description:"Jungle breaks, rollers, liquid, techstep and jump-up basslines",scenes:[
   {id:"roller",name:"Roller",styles:["breakbeat"],engines:["pattern","process","ecology"],bpm:[170,176],density:[.69,.9],swing:[0,.07],loops:[5,6,7]},
   {id:"liquid",name:"Liquid",styles:["breakbeat"],engines:["melodic","ecology","process"],bpm:[168,174],density:[.55,.78],swing:[.01,.08],loops:[5,6,6]},
   {id:"jungle",name:"Jungle",styles:["breakbeat"],engines:["pattern","process","ecology"],bpm:[164,174],density:[.70,.92],swing:[.02,.11],loops:[5,6,7]},
   {id:"techstep",name:"Techstep",styles:["breakbeat"],engines:["process","pattern","ecology"],bpm:[168,176],density:[.54,.8],swing:[0,.045],loops:[5,6,7]},
   {id:"jump-up",name:"Jump-up",styles:["breakbeat"],engines:["pattern","ecology","process"],bpm:[172,178],density:[.65,.88],swing:[0,.065],loops:[5,6,7]}
 ]},
 pop:{name:"Pop",description:"Hook-led melodies, clear backbeats and dynamic sections",scenes:[
   {id:"bright",name:"Bright",styles:["house","downtempo"],engines:["melodic","pattern","ecology"],bpm:[104,125],density:[.59,.82],swing:[0,.09],loops:[5,6,7]},
   {id:"indie",name:"Indie",styles:["downtempo","breakbeat"],engines:["melodic","ecology","pattern"],bpm:[94,116],density:[.46,.72],swing:[.01,.14],loops:[5,6,6]}
 ]}
};
export const RADIO_CHANNEL_IDS=Object.keys(RADIO_CHANNELS);
export function validRadioChannel(value){
 return Object.hasOwn(RADIO_CHANNELS,value)?value:"mixed";
}
export const CHANNEL_TIMBRES={
 hiphop:{bass:["Bass","Plucked strings"],chords:["Keys & organs","Guitars"],
   arp:["Mallets","Mallets & bells","Plucked strings"],lead:["Keys & organs","Guitars","Mallets","Mallets & bells","Vocal melodies"],
   counter:["Keys & organs","Strings","Winds"],pad:["Keys & organs","Strings"]},
 dnb:{bass:["Bass","Plucked strings"],chords:["Keys & organs","Strings"],
   arp:["Mallets","Mallets & bells","Plucked strings"],lead:["Strings","Bowed strings","Keys & organs","Mallets","Vocal melodies"],
   counter:["Strings","Bowed strings","Winds"],pad:["Keys & organs","Strings","Bowed strings"]},
 pop:{bass:["Bass","Plucked strings"],chords:["Keys & organs","Guitars"],
   arp:["Guitars","Plucked strings","Mallets & bells"],lead:["Guitars","Keys & organs","Strings","Vocal melodies","Mallets"],
   counter:["Strings","Bowed strings","Vocal melodies"],pad:["Keys & organs","Strings","Bowed strings"]}
};
const DRUM_TRACKS=new Set(["kick","snare","clap","hat","openhat","perc"]);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function randomFrom(seed){
 let v=2166136261;
 for(const c of String(seed))v=Math.imul(v^c.charCodeAt(0),16777619)>>>0;
 return ()=>{v=(v+0x6D2B79F5)>>>0;let x=v;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);
   return ((x^(x>>>14))>>>0)/4294967296};
}
// Replace only percussion instructions. Sample selection stays entirely in
// sounds.js; these patterns always use the established real recordings.
export function applyChannelGroove(events,channel,seed,section="statement",scene=""){
 if(validRadioChannel(channel)==="mixed")return events;
 const r=randomFrom(seed+"|"+channel+"|"+section+(channel==="pop"?"":"|"+scene));
 const created=[];
 const add=(track,bar,step,velocity,duration=1)=>{
   if(step<0||step>15)return;
   created.push({track,step:bar*16+step,duration,
     velocity:Math.round(clamp(velocity,.09,1)*100)/100});
 };
 for(let bar=0;bar<8;bar++){
   const fill=bar%4===3,main=section==="lift"||section==="reprise";
   const quiet=section==="opening"||section==="breakdown";
   if(channel==="hiphop"){
     const kind=scene||"boom-bap",trap=kind==="trap",west=kind==="west-coast";
     const lofi=kind==="lofi",nod=kind==="head-nod";
     // Keep a recognizable two-bar break; accents, ghost notes and fills evolve.
     const kickPairs=trap?[[0,6,11],[0,7,14],[0,5,10,15]]:
       west?[[0,6,10],[0,7,11],[0,6,12]]:
       lofi?[[0,9],[0,7,11],[0,10,14]]:
       nod?[[0,10],[0,7,11],[0,6,10]]:
       [[0,7,10],[0,6,11],[0,9,14]];
     const figure=kickPairs[(Math.floor(bar/2)+Math.floor(r()*2))%kickPairs.length];
     for(const step of figure)if(step===0||r()<(quiet?.45:lofi?.72:.91))
       add("kick",bar,step,step===0?.82:.46+r()*.23);
     const backbeats=trap?[8]:[4,12];
     for(const step of backbeats)add("snare",bar,step,lofi?.55:trap?.79:.72+r()*.13);
     if(trap&&main&&r()<.72)add("clap",bar,8,.36);
     if(!trap&&west&&r()<.7)add("clap",bar,12,.42);
     if(!quiet&&!trap&&r()<.44)add("snare",bar,11,.12+r()*.1,.4);
     if(trap){
       // Sixteenths and occasional short rolls distinguish half-time trap.
       for(let step=0;step<16;step+=2)
         if(r()<(quiet?.45:.91))add("hat",bar,step,.19+r()*.16,.32);
       if(!quiet)for(const step of (fill?[11,12,13,14,15]:[5,6,7]))
         if(r()<(fill?.87:.43))add("hat",bar,step,.13+r()*.15,.24);
     }else{
       const eighthChance=quiet?.46:lofi?.62:west?.94:.84;
       for(let step=0;step<16;step+=2)
         if(r()<eighthChance)add("hat",bar,step,
           (step%4===2?.30:.19)+(r()-.5)*.09,.5);
       if(!quiet&&west&&r()<.6)add("openhat",bar,14,.23,.8);
       if(!quiet&&lofi&&r()<.35)add("perc",bar,6,.2,.5);
     }
     if((main||fill)&&r()<.56)add("perc",bar,fill?15:3,.2+r()*.1,.5);
   }else if(channel==="dnb"){
     const kind=scene||"roller",drop=["lift","reprise","return"].includes(section);
     const jungle=kind==="jungle",tech=kind==="techstep",jump=kind==="jump-up",liquid=kind==="liquid";
     // The familiar 0/10 two-step remains one groove, not the entire station.
     const kickFigures=jungle?[[0,7,10],[0,6,11,14],[0,10,15]]:
       tech?[[0,9],[0,8,11],[0,10]]:
       jump?[[0,6,10,14],[0,10],[0,7,10,15]]:
       liquid?[[0,10],[0,8,10],[0,10,14]]:
       [[0,10],[0,10],[0,10]];
     const kicks=kickFigures[(bar%2+Math.floor(r()*2))%kickFigures.length];
     for(const step of kicks)if(step===0||!quiet||r()<.58)
       add("kick",bar,step,step===0?.93:step===10?.78:.48+r()*.2);
     if(kind==="roller"&&!quiet&&bar%2===1&&r()<.5)add("kick",bar,r()<.5?6:14,.3,.5);
     // Heavy main backbeats, with genuinely quieter acoustic ghost strikes.
     for(const step of [4,12])add("snare",bar,step,.83+r()*.12);
     if(!quiet){
       const ghosts=jungle?(bar%2?[2,7,11,15]:[3,6,10,15]):
         tech?[7,15]:liquid?[7,15]:jump?[3,11,15]:
         (bar%2?[3,11,15]:[7,15]);
       for(const step of ghosts)if(r()<(jungle?.88:drop?.72:.49))
         add("snare",bar,step,.13+r()*.12,.35);
     }
     const hatSpacing=jungle?1:tech?4:2;
     for(let step=0;step<16;step+=hatSpacing){
       if(r()<(quiet?.53:tech?.86:.94)){
         const accented=!quiet&&(step===2||step===10)&&r()<(drop?.7:.41);
         add("hat",bar,step,accented?.57+r()*.13:.16+r()*.22,.32);
       }
     }
     if((drop||fill)&&r()<(tech?.35:.75))add("openhat",bar,14,.28+r()*.13,1);
     if(fill||jungle&&drop){
       for(const step of (jungle?[3,7,11,15]:[11,15]))
         if(r()<(jungle?.64:.44))add("perc",bar,step,.18+r()*.1,.4);
     }
   }else if(channel==="pop"){
     const chorus=["lift","reprise","return"].includes(section);
     // Pop verse is uncluttered; fuller choruses get a stable four-on-floor
     // or backbeat-with-syncopation kick pattern.
     const fourFloor=chorus&&r()<.63;
     const kicks=fourFloor?[0,4,8,12]:chorus?[0,8,10]:[0,8];
     for(const step of kicks)if(step===0||r()<(quiet?.64:.94))
       add("kick",bar,step,step===0?.88:.69);
     for(const step of [4,12])add("snare",bar,step,.72+r()*.08);
     if(chorus)add("clap",bar,12,.42);
     for(let step=0;step<16;step+=2)
       if(r()<(quiet?.5:chorus?.91:.7))
         add("hat",bar,step,.22+(step%4===2?.12:.04),.5);
     if(chorus&&r()<.64)add("openhat",bar,14,.3,1);
     if(fill)for(const step of [13,15])if(r()<.48)
       add("perc",bar,step,.23,.5);
   }
 }
 const pitched=events.filter(event=>!DRUM_TRACKS.has(event.track));
 return [...pitched,...created].sort((a,b)=>a.step-b.step);
}
