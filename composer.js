// 8bars · composition engine v0.1
// Pure, deterministic, and independent of playback / sample loading.
export const ENGINE_VERSION = "0.1.0";
export const GOLDEN = (1 + Math.sqrt(5)) / 2;
const SCALES = {minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11]};
const ROOTS = {A:45,C:48,D:50,E:52,G:55};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hash(s) {
  let n=2166136261;
  for(const ch of String(s)){n^=ch.charCodeAt(0);n=Math.imul(n,16777619)}
  return n>>>0;
}
function random(seed,namespace) {
  let a=hash(ENGINE_VERSION+"|"+seed+"|"+namespace);
  return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296};
}
function pick(r,values){return values[Math.floor(r()*values.length)]}
export function euclidean(pulses,steps,rotation=0) {
  pulses=clamp(Math.trunc(pulses),0,steps);
  return Array.from({length:steps},(_,i)=>(((i-rotation+steps)*pulses)%steps)<pulses);
}
export function compose(input={}) {
  const seed=String(input.seed??"618033");
  const bpm=clamp(Number(input.bpm)||96,60,160);
  const density=clamp(Number(input.density??0.65),0.15,1);
  const key=ROOTS[input.key]?input.key:"A";
  const mode=input.mode==="major"?"major":"minor";
  const scale=SCALES[mode], tonic=ROOTS[key];
  const rhythm=random(seed,"rhythm");
  const harmony=random(seed,"harmony");
  const bassR=random(seed,"bass");
  const melodyR=random(seed,"melody");
  // Root offsets in semitones. Repeated sections inherit the same plan.
  // Minor: i - VI - iv - V - i. Major: I - IV - ii - V - I.
  const progression=mode==="minor"?[0,0,8,8,5,7,7,0]:[0,0,5,5,2,7,7,0];
  const events=[];
  const add=(track,step,duration,velocity,note=null)=>events.push({
    track,step,duration,velocity:Math.round(clamp(velocity,0.05,1)*100)/100,
    ...(note===null?{}:{note})
  });
  const motif=Array.from({length:5},()=>pick(melodyR,[0,1,2,2,3,4,4,5]));
  // Keep a recognizable first and last note, rather than making a random walk.
  motif[0]=0;motif[4]=2;
  const slots=[0,3,6,10,13];
  const densities=[3,3,4,4,4,5,4,3];
  for(let bar=0;bar<8;bar++){
    const offset=bar*16, climax=bar===5, cadence=bar===7;
    const kPhase=bar===5?1:bar===7?2:0;
    // Euclidean accents sit behind stable backbeat anchors.
    const kick=euclidean(clamp(Math.round(3+density*2),3,5),16,0);
    const hat=euclidean(clamp(Math.round(5+density*5),5,10),16,bar%2===0?0:1);
    for(let st=0;st<16;st++){
      if((st===0||st===8||kick[st]&&rhythm()<0.55)&&(!cadence||st<14))
        add("kick",offset+st,1,st===0?0.94:0.72);
      if(st===4||st===12||climax&&st===15)
        add("snare",offset+st,1,climax?0.85:0.77);
      if(hat[st]&&rhythm()<(0.82+density*0.16))
        add("hat",offset+st,0.5,st%4===0?0.45:0.29);
    }
    // Bass derives from chord roots, kick accents and cadential motion.
    const root=tonic+progression[bar]-12;
    const bassSlots=[0,8];
    if(density>.35&&bassR()<.85)bassSlots.push(6);
    if(density>.72&&bassR()<.75)bassSlots.push(12);
    bassSlots.sort((a,b)=>a-b);
    for(const st of bassSlots) {
      let pitch=root;
      if(st===12&&bar!==7&&bassR()<.6)pitch=root+7;
      add("bass",offset+st,st===0?6:3,st===0?0.86:0.66,pitch);
    }
    // Phrase ownership: 1–3 statement, 4–5 answer, 6–7 climax, 8 return.
    let notes=motif.slice();
    if(bar===3||bar===4)notes=[motif[0],motif[1],motif[2]+1,motif[3],motif[4]];
    if(bar===5)notes=[motif[2],motif[3]+1,motif[4]+1,motif[3]+2,motif[2]+1];
    if(bar===6)notes=[motif[2],motif[3],motif[4],motif[1],motif[0]];
    if(bar===7)notes=[motif[0],motif[1],motif[2],motif[1],motif[0]];
    const count=Math.min(5,Math.max(2,Math.round(densities[bar]*density+1)));
    for(let i=0;i<count;i++) {
      const degree=clamp(notes[i],0,9);
      let note=tonic+24+scale[degree%7]+12*Math.floor(degree/7);
      // Close each phrase with tonic; final cadence approaches the loop seam.
      if(cadence&&i===count-1)note=tonic+24;
      if(climax)note+=12; // golden-point register lift (start of bar 6)
      add("melody",offset+slots[i],i===count-1?3:2,climax?0.82:0.62,note);
    }
  }
  // Distinct random streams let future edits lock/mutate individual instruments.
  events.sort((a,b)=>a.step-b.step||a.track.localeCompare(b.track));
  const structure=[
    {bars:"1–3",role:"Statement"},
    {bars:"4–5",role:"Answer"},
    {bars:"6–7",role:"Golden-section variation"},
    {bars:"8",role:"Resolution"}
  ];
  return {
    version:ENGINE_VERSION,seed,bpm,density,key,mode,
    bars:8,stepsPerBar:16,goldenStep:80,
    structure,progression,events,
    explanation:[
      "Five-bar statement and three-bar response (5 + 3).",
      "Main register change at bar 6, nearest bar to 61.8% of the duration.",
      "Kick and hi-hat pulses derive from Euclidean distribution.",
      "Bass follows chord roots; melody inherits and transforms one motif.",
      "Independent seeded random streams make identical settings reproducible."
    ]
  };
}
