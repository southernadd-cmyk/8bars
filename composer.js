// 8bars v0.2 — deterministic symbolic composer; no audio/DOM dependencies.
export const ENGINE_VERSION="0.2.0";
export const GOLDEN=(1+Math.sqrt(5))/2;
export const TRACKS=[
 {id:"kick",name:"Kick",type:"drum",color:"#e6ac74"},
 {id:"snare",name:"Snare",type:"drum",color:"#efb98e"},
 {id:"clap",name:"Clap",type:"drum",color:"#d98c79"},
 {id:"hat",name:"Closed hat",type:"drum",color:"#cba98d"},
 {id:"openhat",name:"Open hat",type:"drum",color:"#f0c7a2"},
 {id:"perc",name:"Percussion",type:"drum",color:"#c6926d"},
 {id:"bass",name:"Bass",type:"pitched",color:"#afd28e"},
 {id:"chords",name:"Chords",type:"pitched",color:"#81bbad"},
 {id:"arp",name:"Arpeggio",type:"pitched",color:"#82b0ba"},
 {id:"lead",name:"Lead",type:"pitched",color:"#91ade6"},
 {id:"counter",name:"Countermelody",type:"pitched",color:"#bc9fe2"},
 {id:"pad",name:"Pad",type:"pitched",color:"#c89ed1"}
];
export const STYLES=["downtempo","house","breakbeat","ambient"];
const SCALE={minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11]};
const ROOTS={C:48,"C#":49,D:50,"D#":51,E:52,F:53,"F#":54,G:55,"G#":56,A:57,"A#":58,B:59};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hash(s){let n=2166136261;for(const c of String(s)){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0}
export function rng(seed,part,salt=0){let n=hash(ENGINE_VERSION+"|"+seed+"|"+part+"|"+salt);return ()=>{n=(n+0x6D2B79F5)>>>0;let x=n;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296}}
const choose=(r,a)=>a[Math.floor(r()*a.length)];
export function euclidean(k,n,rotation=0){k=clamp(Math.floor(k),0,n);return Array.from({length:n},(_,i)=>((i-rotation+n)*k)%n<k)}
export function compose(input={}){
 const seed=String(input.seed??"618033");
 const key=ROOTS[input.key]===undefined?"A":input.key,mode=input.mode==="major"?"major":"minor";
 const style=STYLES.includes(input.style)?input.style:"downtempo";
 const density=clamp(Number(input.density??.65)||.65,.15,1);
 const bpm=clamp(Number(input.bpm)||96,60,170);
 const swing=clamp(Number(input.swing??0)||0,0,.65);
 const variants=input.variations||{};
 const stream=id=>rng(seed,id,Math.trunc(Number(variants[id])||0));
 const scale=SCALE[mode],tonic=ROOTS[key],rForm=stream("form");
 // Degree progression deliberately gives each musical bar a functional identity.
 const sets=mode==="minor"?[[0,5,3,4],[0,3,5,4],[0,5,4,3]]:[[0,3,1,4],[0,1,3,4],[0,3,4,1]];
 const selected=choose(rForm,sets);
 const degrees=[selected[0],selected[0],selected[1],selected[1],selected[2],selected[3],selected[3],selected[0]];
 function diatonic(degree,oct=0){return tonic+12*oct+scale[((degree%7)+7)%7]+12*Math.floor(degree/7)}
 const progression=degrees.map((deg,bar)=>{
   const root=diatonic(deg),third=diatonic(deg+2),fifth=diatonic(deg+4);
   // Harmonic-minor dominant, introducing the raised seventh on V.
   return {bar:bar+1,degree:deg,notes:(mode==="minor"&&deg===4)?[root,root+4,root+7]:[root,third,fifth]};
 });
 const events=[];
 function add(track,step,duration,velocity,note,extra={}){
   if(step<0||step>=128)return;
   events.push({track,step,duration,velocity:Math.round(clamp(velocity,.05,1)*100)/100,
     ...(note===undefined?{}:{note}),...extra});
 }
 // Each channel receives a separate RNG. Mutating one channel cannot alter any other.
 const kit=style==="house"?"straight":style==="breakbeat"?"broken":style==="ambient"?"soft":"laidback";
 const drum=(id,create)=>{const r=stream(id);for(let bar=0;bar<8;bar++)create(r,bar,bar*16,bar===5,bar===7)};
 drum("kick",(r,b,o,climax,last)=>{
   const pulses=euclidean(Math.round(3+density*2),16,b%2===0?0:1);
   for(let i=0;i<16;i++){
     const primary=kit==="straight"?(i%4===0):kit==="soft"?(i===0||i===8):(i===0||i===8||pulses[i]&&r()<.37);
     if(primary && (!last||i<15))add("kick",o+i,1,i===0?.98:.70,undefined,{variant:Math.floor(r()*3)});
   }
 });
 drum("snare",(r,b,o,climax,last)=>{
   const anchors=kit==="soft"?[12]:kit==="broken"?[4,11]:[4,12];
   for(const i of anchors)add("snare",o+i,1,i===4?.82:.76,undefined,{variant:Math.floor(r()*3)});
   if((climax||last)&&style!=="ambient"){for(let i=14;i<=15;i++)if(r()<.6)add("snare",o+i,.5,.4,undefined,{variant:Math.floor(r()*3)});}
 });
 drum("clap",(r,b,o,climax)=>{
   if(style==="ambient")return;
   if(b%2===1||climax){for(const i of (style==="house"?[4,12]:[12]))if(r()<.92)add("clap",o+i,1,.52,undefined,{variant:0});}
 });
 drum("hat",(r,b,o,climax)=>{
   const count=style==="ambient"?3:Math.round(5+5*density);
   const pattern=euclidean(count,16,b%2);
   for(let i=0;i<16;i++)if(pattern[i]&&r()<.94)add("hat",o+i,.5,i%4===0?.51:.31,undefined,{variant:Math.floor(r()*2)});
 });
 drum("openhat",(r,b,o,climax)=>{
   const positions=style==="house"?[2,6,10,14]:[6,14];
   for(const i of positions)if(r()<(style==="ambient"?.1:.23+(climax?.22:0)))add("openhat",o+i,2,.48,undefined,{variant:Math.floor(r()*2)});
 });
 drum("perc",(r,b,o,climax,last)=>{
   const count=style==="ambient"?2:Math.round(2+density*3);
   const pattern=euclidean(count,16,(b*3)%16);
   for(let i=0;i<16;i++)if(pattern[i]&&r()<(climax?.78:.4))add("perc",o+i,1,.35,undefined,{variant:Math.floor(r()*3)});
   if(last&&style!=="ambient")for(const i of [13,14,15])add("perc",o+i,.5,.37,undefined,{variant:2});
 });
 const rb=stream("bass");
 for(let b=0;b<8;b++){
   const root=progression[b].notes[0]-24,notes=progression[b].notes.map(n=>n-24);
   const positions=style==="house"?[0,6,8,14]:style==="ambient"?[0,10]:[0,7,10,14];
   for(const i of positions)if(i===0||rb()<density*.8){
     const n=i===14&&b!==7?notes[2]:root;
     add("bass",b*16+i,i===0?7:3,i===0?.89:.60,n);
   }
 }
 const rc=stream("chords");
 for(let b=0;b<8;b++){
   // Rhythm is harmonic comping, with short rests before phrase transitions.
   const start=style==="house"?[4,12]:style==="ambient"?[0]:[0,10];
   for(const s of start)if(s===0||rc()<.82)for(const n of progression[b].notes)
     add("chords",b*16+s,style==="ambient"?13:style==="house"?3:5,.23+(b===5?.07:0),n+12);
 }
 const ra=stream("arp");
 for(let b=0;b<8;b++){
   const notes=progression[b].notes;
   const pattern=euclidean(Math.round(4+density*4),16,b%4);
   let i=0;
   for(let s=0;s<16;s++)if(pattern[s]&&ra()<(style==="ambient"?.62:.9)){
     const index=i++%4;
     add("arp",b*16+s,Math.min(3,16-s),.27+(b===5?.13:0),notes[[0,1,2,1][index]]+12);
   }
 }
 // Short five-note motif, reused and transformed; strong beats target chord tones.
 const rm=stream("lead"),motif=[0,2,4,3,1].map((v,i)=>clamp(v+(i===0?0:Math.floor(rm()*3)-1),0,6));
 const slots=[0,3,6,10,13];
 for(let b=0;b<8;b++){
   const r=rm;
   const count=b===5?5:b===7?3:clamp(Math.round(2+density*3),2,5);
   for(let i=0;i<count;i++){
     let degree=motif[i];
     if(b===3||b===4)degree=clamp(degree+(i===2?1:0),0,6);
     if(b===5)degree=clamp(degree+(i%2===0?2:1),0,6);
     if(b===6)degree=motif[(i+2)%5];
     const onStrong=[0,8].includes(slots[i]);
     let pitch=diatonic(degree,2);
     if(onStrong||b===7&&i===count-1){
       const target=progression[b].notes.map(n=>n+24);
       pitch=target.reduce((best,n)=>Math.abs(n-pitch)<Math.abs(best-pitch)?n:best,target[0]);
     }
     if(b===5)pitch+=12;
     const dur=i===count-1?Math.max(1,16-slots[i]):2;
     add("lead",b*16+slots[i],dur,b===5?.83:.61,pitch);
   }
 }
 const rCounter=stream("counter");
 for(let b=0;b<8;b++){
   if(b<2 && style!=="ambient")continue; // leave space for main motif
   const starts=[2,8,13];
   const tones=progression[b].notes;
   for(const i of starts)if(rCounter()<(style==="ambient"?.46:.35+density*.34))
     add("counter",b*16+i,Math.min(4,16-i),.32,tones[Math.floor(rCounter()*3)]+24);
 }
 const rPad=stream("pad");
 for(let b=0;b<8;b++){
   if(b%2!==0&&b!==5)continue;
   if(style==="breakbeat"&&rPad()<.5)continue;
   const notes=progression[b].notes;
   for(const n of notes)add("pad",b*16,style==="ambient"?30:b===4?16:Math.min(24,128-b*16),
     style==="ambient"?.22:.14,n+12);
 }
 events.sort((a,b)=>a.step-b.step||TRACKS.findIndex(t=>t.id===a.track)-TRACKS.findIndex(t=>t.id===b.track));
 return {version:ENGINE_VERSION,seed,bpm,density,swing,style,key,mode,variations:Object.fromEntries(TRACKS.map(t=>[t.id,Math.trunc(Number(variants[t.id])||0)])),bars:8,stepsPerBar:16,goldenStep:80,progression,motif,events,
 structure:[{bars:"1–3",role:"Statement"},{bars:"4–5",role:"Answer"},{bars:"6–7",role:"Golden turn"},{bars:"8",role:"Return"}],
 explanation:[
  "5 + 3 bars form the large phrase; the main lift falls at bar 6.",
  "Each channel has an independent seeded random stream, allowing a single part to be regenerated.",
  "Four functional chords are selected, repeated and resolved; bass and harmonic voices share these chord tones.",
  "Euclidean patterns provide distributed accents while a conventional backbeat maintains the pulse.",
  "The lead inherits one five-note motif, modifies it at phrase boundaries, and targets chord tones on strong beats.",
  "At the golden point, the melody moves up an octave; the final bar prepares the loop back into bar 1."
 ]};
}
