// Mirrors a bounded selection of licensed recordings into the Pages artifact.
// Downloads happen at build time, NEVER in the visitor's browser on other origins.
// Unmirrored catalogue items still use their original URLs.
// Built-in sources are pinned to upstream commits; this script caches exact bytes.
import {DRUMS,VOICES,DEFAULT_VOICES} from "../sounds.js";
import {createHash} from "node:crypto";
import {mkdir,readFile,writeFile,copyFile,stat} from "node:fs/promises";
import {join,extname} from "node:path";

const output=process.argv[2]||"dist";
const cache=process.env.SAMPLE_CACHE||".sample-cache";
const limit=Number(process.env.SAMPLE_MIRROR_BUDGET_MB||180)*1_000_000;
const concurrency=8;
const pick=[];
const seen=new Set();
function add(s){
 if(!s?.url||!s.url.startsWith("https://")||seen.has(s.url))return;
 if(!["CC0 1.0","CC BY 3.0"].includes(s.license))return;
 seen.add(s.url);pick.push(s);
}
// Prioritise the default voices because first playback must work quickly.
for(const voice of Object.values(DEFAULT_VOICES)){
 const roots=VOICES[voice];
 for(const target of [36,48,60,72,84,96]){
   add(roots.reduce((best,s)=>Math.abs(s.root-target)<Math.abs(best.root-target)?s:best,roots[0]));
 }
}
// Give every drum track a starter library, then wider choices.
for(const options of Object.values(DRUMS))for(const s of options.slice(0,10))add(s);
// Cover every instrument family with real samples spread across its register.
for(const options of Object.values(VOICES)){
 for(const target of [48,60,72,84]){
   add(options.reduce((best,s)=>Math.abs(s.root-target)<Math.abs(best.root-target)?s:best,options[0]));
 }
}
for(const options of Object.values(DRUMS))for(const s of options.slice(10,22))add(s);
// Broaden root coverage as storage permits. Large source banks need not be bundled in full.
for(const options of Object.values(VOICES))for(const s of options)add(s);
for(const options of Object.values(DRUMS))for(const s of options)add(s);

await mkdir(join(output,"samples"),{recursive:true});
await mkdir(cache,{recursive:true});
const map={},failed=[];
let bytes=0,copied=0,skipped=0,done=0;
let cursor=0;
async function retrieve(item){
 const hash=createHash("sha256").update(item.url).digest("hex").slice(0,24);
 const ext=extname(new URL(item.url).pathname).toLowerCase()||".wav";
 const file=hash+ext,path=join(cache,file);
 let buffer;
 try{
   const info=await stat(path).catch(()=>null);
   if(info?.size>0)buffer=await readFile(path);
   else{
     const response=await fetch(item.url,{signal:AbortSignal.timeout(20000)});
     if(!response.ok)throw Error("HTTP "+response.status);
     buffer=Buffer.from(await response.arrayBuffer());
     if(!buffer.length||buffer.length>15_000_000)throw Error("Invalid or oversized sample");
     await writeFile(path,buffer);
   }
   if(bytes+buffer.byteLength>limit){skipped++;return}
   // Reserve budget synchronously after awaited I/O: a single JS turn is atomic.
   bytes+=buffer.byteLength;
   await copyFile(path,join(output,"samples",file));
   map[item.url]="./samples/"+file;
   copied++;
 }catch(error){failed.push({url:item.url,error:String(error.message||error)})}
}
async function worker(){
 while(cursor<pick.length){
   const item=pick[cursor++];
   await retrieve(item);
   done++;
   if(done%100===0)console.log("Mirror progress",done,"/",pick.length,"stored",copied,"files");
 }
}
await Promise.all(Array.from({length:concurrency},worker));
await writeFile(join(output,"sample-map.js"),
 "// Generated during the site build. Only verified local recordings appear here.\n"+
 "export const LOCAL_SAMPLES="+JSON.stringify(map)+";\n");
await writeFile(join(output,"sample-mirror-report.json"),JSON.stringify({
 eligible:pick.length,mirrored:copied,bytes,skippedBudget:skipped,
 failed:failed.length,failures:failed.slice(0,40)
},null,2));
console.log("Mirrored",copied,"of",pick.length,"declared samples,",(bytes/1e6).toFixed(1),"MB; errors",failed.length);
if(copied<80)throw Error("Too few working source samples to publish a useful mirror");
