// Musical form and motivic development for 8bars Human Radio.
//
// Song-level decisions are constrained by genre and golden-ratio structural
// landmarks, but sampled rather than fixed. The same seed always reproduces
// the same piece; different seeds can have genuinely different forms.
//
// Eight-bar transport chunks are not musical phrase boundaries.
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const choose=(r,arr)=>arr[Math.min(arr.length-1,Math.floor(r()*arr.length))];

// Different musical routes with stable opening, a main return and a real ending.
// No variant adds or removes playback buffers: these are abstract score parts.
export const PIECE_FORMS={
 pop:{
  5:[
   ["opening","statement","answer","lift","return"],
   ["opening","statement","lift","reprise","return"],
   ["opening","answer","statement","lift","return"]
  ],6:[
   ["opening","statement","answer","lift","reprise","return"],
   ["opening","statement","lift","answer","reprise","return"],
   ["opening","answer","statement","lift","breakdown","return"],
   ["opening","statement","answer","breakdown","reprise","return"]
  ],7:[
   ["opening","statement","answer","breakdown","lift","reprise","return"],
   ["opening","statement","lift","answer","breakdown","reprise","return"],
   ["opening","answer","statement","lift","answer","reprise","return"],
   ["opening","statement","answer","lift","breakdown","reprise","return"]
  ]
 },
 hiphop:{
  5:[
   ["opening","statement","answer","lift","return"],
   ["opening","statement","lift","reprise","return"],
   ["opening","statement","breakdown","lift","return"]
  ],6:[
   ["opening","statement","answer","lift","reprise","return"],
   ["opening","statement","lift","answer","reprise","return"],
   ["opening","statement","answer","breakdown","lift","return"],
   ["opening","statement","breakdown","lift","reprise","return"]
  ],7:[
   ["opening","statement","answer","breakdown","lift","reprise","return"],
   ["opening","statement","lift","answer","breakdown","reprise","return"],
   ["opening","statement","answer","lift","answer","reprise","return"],
   ["opening","statement","lift","breakdown","answer","reprise","return"]
  ]
 },
 dnb:{
  5:[
   ["opening","statement","answer","lift","return"],
   ["opening","statement","breakdown","lift","return"],
   ["opening","statement","lift","reprise","return"]
  ],6:[
   ["opening","statement","answer","lift","reprise","return"],
   ["opening","statement","lift","breakdown","reprise","return"],
   ["opening","statement","breakdown","lift","reprise","return"],
   ["opening","statement","answer","lift","breakdown","return"]
  ],7:[
   ["opening","statement","answer","breakdown","lift","reprise","return"],
   ["opening","statement","lift","answer","breakdown","reprise","return"],
   ["opening","statement","answer","lift","breakdown","reprise","return"],
   ["opening","statement","lift","breakdown","answer","reprise","return"]
  ]
 },
 mixed:{
  5:[
   ["opening","statement","answer","lift","return"],
   ["opening","answer","statement","lift","return"],
   ["opening","statement","lift","reprise","return"]
  ],6:[
   ["opening","statement","answer","lift","reprise","return"],
   ["opening","statement","lift","answer","reprise","return"],
   ["opening","answer","statement","breakdown","lift","return"],
   ["opening","statement","answer","breakdown","reprise","return"]
  ],7:[
   ["opening","statement","answer","breakdown","lift","reprise","return"],
   ["opening","answer","statement","lift","breakdown","reprise","return"],
   ["opening","statement","lift","answer","breakdown","reprise","return"],
   ["opening","statement","answer","lift","answer","reprise","return"]
  ]
 }
};
export function choosePieceForm(channel,totalSections,r){
 const options=PIECE_FORMS[channel]?.[totalSections];
 if(!options?.length)throw new RangeError("No form for channel/length");
 const picked=choose(r,options);
 return [...picked];
}
const TRANSFORMS=["echo","sequence","inversion","fragment","suspension"];
const DEVELOPMENT=["sequence","inversion","fragment","answer","suspension"];
// Phrase identity is chosen against its musical function, not phraseId % 3.
// C is a fragment of A, not a third unrelated theme. The seed can explore
// the development, but the listener can still recognise a theme at return.
export function developMotifProgram(phrases,sections,climaxBar,r){
 const result=phrases.map((p,i)=>{
  const section=sections.find(s=>p.startBar>=s.startBar&&p.startBar<s.endBar)||
    sections.find(s=>p.startBar<s.endBar);
  const role=section?.role||"statement";
  const first=i===0,arrive=p.startBar===climaxBar,last=i===phrases.length-1;
  const phase=p.phase;
  let motif,transform;
  if(first){motif="A";transform="original";}
  else if(arrive){motif="A";transform="arrival";}
  else if(last){motif="A";transform="coda";}
  else if(role==="lift"||role==="reprise"){
   motif=r()<.79?"A":"B";
   transform=choose(r,["return","sequence","echo","augmentation"]);
  }else if(role==="breakdown"){
   motif=r()<.64?"C":"B";
   transform=choose(r,["fragment","suspension","inversion"]);
  }else if(role==="answer"){
   motif=r()<.78?"B":"C";
   transform=choose(r,["answer","inversion","fragment"]);
  }else if(phase==="development"){
   motif=choose(r,["A","B","B","C"]);
   transform=choose(r,DEVELOPMENT);
  }else{
   motif=r()<.68?"A":"B";
   transform=choose(r,TRANSFORMS);
  }
  const transpose=choose(r,[-2,-1,0,0,1,2]);
  const displacement=choose(r,[-1,0,0,0,1]);
  const articulation=choose(r,[.84,.95,1.08,1.16]);
  return {...p,motif,transform,transpose,displacement,articulation};
 });
 // Avoid erasing the work's identity with two unrelated entrances in a row.
 for(let i=1;i<result.length-1;i++){
  if(result[i].motif==="C"&&result[i-1].motif==="C"){
   result[i].motif="A";result[i].transform="echo";
  }
 }
 return result;
}
export function motifForPhrase(themes,phrase){
 return phrase.motif==="B"?themes.answer:phrase.motif==="C"?themes.bridge:themes.motif;
}
// Rhythm/contour changes must remain a recognisable derivation of the source
// motif. Never invent an unrelated melody at a section boundary.
export function renderDevelopedPhrase(base,phrase,phraseBar,channel){
 const rhythm=[...base.rhythm],contour=[...base.contour];
 const kind=phrase.transform;
 const last=contour.length-1;
 if(kind==="inversion"){
  const centre=contour[0];
  for(let i=1;i<contour.length;i++)contour[i]=clamp(centre-(contour[i]-centre),-5,5);
 }else if(kind==="sequence"){
  for(let i=0;i<contour.length;i++)contour[i]=clamp(contour[i]+phrase.transpose,-5,5);
 }else if(kind==="fragment"||kind==="augmentation"){
  // Sparse motifs give other players space, and can be recognised on return.
  if(rhythm.length>3){
   const kept=rhythm.map((_,i)=>i).filter(i=>i===0||i===last||i%2===0);
   const newRhythm=kept.map(i=>rhythm[i]);
   const newContour=kept.map(i=>contour[i]);
   rhythm.splice(0,rhythm.length,...newRhythm);
   contour.splice(0,contour.length,...newContour);
  }
 }else if(kind==="echo"){
  if(contour.length>1)contour[contour.length-1]=clamp(contour.at(-1)+phrase.transpose,-5,5);
 }else if(kind==="suspension"){
  // Hold the first attack while retaining its melodic destination.
  if(rhythm.length>2)rhythm.splice(1,1),contour.splice(1,1);
 }else if(kind==="arrival"||kind==="coda"||kind==="return"){
  // Bring the original motif home with a simplified, stable cadence.
  if(kind==="coda"&&rhythm.length>3)
   rhythm.splice(-2,1),contour.splice(-2,1);
  if(kind==="coda"||kind==="arrival")contour[contour.length-1]=0;
 }
 // Small variations between bars are articulated as phrasing, not
 // completely new note sequences. Keep all onsets inside one bar.
 if(phraseBar>0&&kind!=="coda"&&kind!=="arrival"&&phraseBar%3===2){
  for(let i=1;i<contour.length-1;i++)
   contour[i]=clamp(contour[i]+(i%2?phrase.transpose:0),-5,5);
 }
 const shift=phrase.displacement||0;
 if(shift!==0&&["hiphop","dnb","mixed"].includes(channel)&&
    kind!=="coda"&&kind!=="arrival"){
  for(let i=1;i<rhythm.length-1;i++){
   const lo=rhythm[i-1]+1,hi=rhythm[i+1]-1;
   if(lo<=hi)rhythm[i]=clamp(rhythm[i]+shift,lo,hi);
  }
 }
 return {rhythm,contour:contour.map(n=>clamp(n,-5,5)),articulation:clamp(base.articulation*
   (phrase.articulation||1),.45,1.25)};
}
