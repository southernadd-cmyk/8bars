// Human Radio channels: musical constraints and recorded-drum arrangements.
// All events are MIDI-like instructions, never generated audio or fake samples.
export const RADIO_CHANNELS={
 mixed:{name:"Mixed",description:"All musical scenes and composition systems",scenes:[]},
 hiphop:{name:"Hip-hop",description:"Boom-bap drums, laid-back swing and bass-led phrases",scenes:[
   {id:"boom-bap",name:"Boom bap",styles:["downtempo","breakbeat"],engines:["pattern","melodic","ecology"],bpm:[82,98],density:[.47,.73],swing:[.15,.30],loops:[5,6,6]},
   {id:"head-nod",name:"Head nod",styles:["downtempo","breakbeat"],engines:["melodic","process","ecology"],bpm:[78,96],density:[.4,.67],swing:[.1,.24],loops:[5,6,7]}
 ]},
 dnb:{name:"Drum & Bass",description:"Fast breaks, rolling drums and bass-focused development",scenes:[
   {id:"roller",name:"Roller",styles:["breakbeat"],engines:["pattern","process","ecology"],bpm:[170,176],density:[.69,.9],swing:[0,.07],loops:[5,6,7]},
   {id:"liquid",name:"Liquid",styles:["breakbeat"],engines:["melodic","ecology","process"],bpm:[168,174],density:[.55,.78],swing:[.01,.08],loops:[5,6,6]}
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
export function applyChannelGroove(events,channel,seed,section="statement"){
 if(validRadioChannel(channel)==="mixed")return events;
 const r=randomFrom(seed+"|"+channel+"|"+section);
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
     const kicks=bar%2===0?[0,7,10]:[0,6,11];
     for(const step of kicks)if(step===0||r()<(quiet?.47:.76))
       add("kick",bar,step,step===0?.88:.58+(r()-.5)*.12);
     for(const step of [4,12])add("snare",bar,step,.68+(r()-.5)*.16);
     if(!quiet&&r()<.5)add("snare",bar,11,.21,.5);
     for(let step=0;step<16;step+=2)
       if(r()<(quiet?.57:.86))add("hat",bar,step,(step%4===0?.32:.22)+(r()-.5)*.12,.5);
     if(main||fill)for(const step of [3,14])if(r()<.38)
       add("perc",bar,step,.27,.5);
     if(main&&r()<.65)add("clap",bar,12,.38);
   }else if(channel==="dnb"){
     const kicks=bar%2===0?[0,7,10]:[0,9,14];
     for(const step of kicks)if(step===0||r()<(quiet?.55:.86))
       add("kick",bar,step,step===0?.92:.6+(r()-.5)*.13);
     for(const step of [4,12])add("snare",bar,step,.78+(r()-.5)*.13);
     if((fill||main)&&r()<.75)for(const step of [11,15])
       if(r()<.65)add("snare",bar,step,.22+(r()*.15),.5);
     for(let step=0;step<16;step+=2)
       if(r()<(quiet?.55:.94))add("hat",bar,step,.26+(step%4===0?.1:0)+r()*.15,.45);
     if(!quiet&&r()<.68)for(const step of [13,15])add("hat",bar,step,.19+r()*.1,.35);
     if(main||fill){
       add("openhat",bar,14,.28,1);
       for(const step of [3,11])if(r()<.54)add("perc",bar,step,.24,.5);
     }
   }else if(channel==="pop"){
     const fourFloor=(bar%4>=2||section==="lift")&&r()<.73;
     const kicks=fourFloor?[0,4,8,12]:[0,8,10];
     for(const step of kicks)if(step===0||r()<(quiet?.6:.88))
       add("kick",bar,step,step===0?.85:.65);
     for(const step of [4,12])add("snare",bar,step,.72);
     if(main||fill)add("clap",bar,12,.38);
     for(let step=0;step<16;step+=2)
       if(r()<(quiet?.58:.81))add("hat",bar,step,.27+(step%4===0?.09:0),.5);
     if(main&&r()<.63)add("openhat",bar,14,.29,1);
     if(fill)for(const step of [13,15])if(r()<.64)
       add("perc",bar,step,.28,.5);
   }
 }
 const pitched=events.filter(event=>!DRUM_TRACKS.has(event.track));
 return [...pitched,...created].sort((a,b)=>a.step-b.step);
}
