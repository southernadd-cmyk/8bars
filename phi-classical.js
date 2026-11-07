// An original rule-based composition for 8bars' Classical phi station.
// The constraints (phrase boundaries, motif rotation and density of events)
// are computed from phi, not assigned retrospectively to generated notes.
// Events are ordinary MIDI-like notes played by 8bars' existing licensed samples.
import {PHI,GOLDEN_LARGE,GOLDEN_ANGLE_TURNS} from "./phi-dynamics.js";

const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
const ROLES=new Set(["opening","statement","answer","lift","breakdown","reprise","return"]);
const pick=(array,t)=>array[Math.floor(t*array.length)%array.length];
function hash(value){
 let n=2166136261;
 for(const c of String(value))n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;
 return n/4294967296;
}
function goldenSplits(start,size,depth){
 if(depth===0)return [start];
 const bigger=size*GOLDEN_LARGE;
 return goldenSplits(start,bigger,depth-1)
   .concat(goldenSplits(start+bigger,size-bigger,depth-1));
}
function uniqueGrid(positions){
 return [...new Set(positions.map(v=>clamp(Math.round(v),0,127)))].sort((a,b)=>a-b);
}
const rounded=(step,duration,velocity,note,track)=>({
 track,step,duration:Math.min(duration,128-step),velocity,note
});
export function phiClassicalEvents(progression,seed="618033",role="statement"){
 if(!Array.isArray(progression)||progression.length!==8||
    progression.some(c=>!Array.isArray(c.notes)||c.notes.length<3))
    throw new TypeError("Classical phi requires an eight-bar chord progression");
 if(!ROLES.has(role))throw new RangeError("Unknown radio section");
 const events=[];
 const phrase=uniqueGrid(goldenSplits(0,128,5)); // 32 onset opportunities
 const ornaments=uniqueGrid(goldenSplits(0,128,4));
 const offset=hash(seed+"|golden-angle");
 const section=ROLES.has(role)?role:"statement";
 const sparse=section==="opening"||section==="breakdown";
 const exposed=section==="lift"||section==="reprise";
 function chordAt(step){return progression[clamp(Math.floor(step/16),0,7)].notes.slice(0,3);}
 function add(track,step,dur,vel,note){
  if(!Number.isInteger(step)||step<0||step>=128||
     !Number.isFinite(note)||note<28||note>108)return;
  events.push(rounded(step,dur,vel,note,track));
 }
 // Each successive phrase event rotates by the golden angle in pitch space.
 // Chord anchoring makes the generative structure musical, not a random scale.
 for(let i=0;i<phrase.length;i++){
  const step=phrase[i],fraction=(offset+i*GOLDEN_ANGLE_TURNS)%1;
  const chord=chordAt(step);
  const octave=12,octaveOffset=fraction<.22?-12:fraction>.82?12:0;
  const degree=Math.floor(fraction*3);
  const pitch=clamp(chord[degree]+octave+octaveOffset,55,96);
  if(!sparse||i%2===0)add("lead",step,Math.max(1,Math.min(7,phrase[i+1]===undefined?128-step:phrase[i+1]-step)),exposed?.55:.40,pitch);
  if(i%4===2&&section!=="opening"&&section!=="breakdown"){
   const delay=2+Math.floor(GOLDEN_LARGE*4);
   const at=step+delay;
   if(at<128)add("counter",at,Math.min(5,128-at),.20,chord[(degree+1)%3]+12);
  }
 }
 // Lower-velocity arpeggiation follows a shallower recursive golden split.
 for(let i=0;i<ornaments.length;i++){
  if(sparse&&i%2)continue;
  const step=ornaments[i];
  const chord=chordAt(step),degree=Math.floor(((offset+i*GOLDEN_ANGLE_TURNS)%1)*3);
  add("arp",step,Math.min(5,128-step),.20,chord[degree]+12);
 }
 // The underlying 8-bar harmony remains coherent while the foreground uses phi.
 for(let bar=0;bar<8;bar++){
  const start=bar*16,chord=chordAt(start);
  const accent=start+Math.round(16*GOLDEN_LARGE);
  // Dynamic marking at the golden cut inside each bar (61.8% of 16 steps).
  add("bass",start,Math.min(15,128-start),.38,chord[0]-12);
  if(bar%2===1&&section!=="opening")
   add("bass",accent,Math.min(5,128-accent),.20,chord[0]-12);
  if(bar%2===0||exposed)
   for(const p of chord)add("pad",start,Math.min(27,128-start),exposed?.14:.11,p+12);
  if(bar%2===0||section==="statement"||exposed)
   for(const p of chord)add("chords",start,Math.min(13,128-start),exposed?.24:.17,p+12);
 }
 return events.sort((a,b)=>a.step-b.step||a.note-b.note||a.track.localeCompare(b.track));
}
