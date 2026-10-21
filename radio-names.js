// Deterministic track titles for the radio; the word data ships as
// a simple, human-editable dictionary in radio-words.txt. No DOM dependency.
const FALLBACK=["blue","aardvark","only","super","achievement","silver",
  "midnight","echo","velvet","orbit","dream","ocean","violet","signal"];
const hash=s=>{let h=2166136261;for(const c of String(s))
 h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h>>>0};
const random=seed=>{
 let n=hash(seed);
 return ()=>{n=(n+0x6d2b79f5)>>>0;let x=n;
 x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);
 return ((x^(x>>>14))>>>0)/4294967296};
};
export function parseRadioDictionary(text){
 const unique=new Set();
 for(const raw of String(text).split(/\r?\n/)){
   const word=raw.trim().toLowerCase();
   if(/^[a-z]{3,14}$/.test(word))unique.add(word);
 }
 return [...unique];
}
export function radioTitleForSeed(seed,words=FALLBACK){
 const list=words?.length>=10?words:FALLBACK;
 const r=random(String(seed)+"|track-title");
 const used=new Set();
 function make(){
   const size=1+Math.floor(r()*3);
   const parts=[];
   for(let i=0;i<size;i++){
     let index=Math.floor(r()*list.length),attempts=0;
     while(used.has(list[index])&&attempts++<list.length)index=(index+1)%list.length;
     const word=list[index];used.add(word);
     parts.push(word[0].toUpperCase()+word.slice(1));
   }
   return parts.join(" ");
 }
 return make();
}

// Backwards-compatible title-object export for existing integrations.
export function radioNameForSeed(seed,words=FALLBACK){
 return {title:radioTitleForSeed(seed,words)};
}
