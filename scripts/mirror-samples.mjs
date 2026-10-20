// Mirrors a bounded selection of licensed recordings into the Pages artifact.
// Downloads happen at build time, NEVER in the visitor's browser on other origins.
// Unmirrored catalogue items still use their original URLs.
// Built-in sources are pinned to upstream commits; this script caches exact bytes.
import {DRUMS,VOICES,DEFAULT_VOICES} from "../sounds.js";
import {createHash} from "node:crypto";
import {mkdir,writeFile,copyFile,stat,unlink,rm} from "node:fs/promises";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {join,extname} from "node:path";

const output=process.argv[2]||"dist";
const cache=process.env.SAMPLE_CACHE||".sample-cache";
const limit=Number(process.env.SAMPLE_MIRROR_BUDGET_MB||400)*1_000_000;
const encode=promisify(execFile);
const concurrency=5;
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
// Keep the first deployment bounded; later expand in quality-reviewed batches.
const candidates=pick;
let cursor=0;
async function retrieve(item){
 const hash=createHash("sha256").update(item.url).digest("hex").slice(0,24);
 const file=hash+".mp3",converted=join(cache,file);
 const temp=join(cache,hash+".source");
 try{
   let cached=await stat(converted).catch(()=>null);
   if(!cached?.size){
     const response=await fetch(item.url.split("#")[0],{signal:AbortSignal.timeout(30000)});
     if(!response.ok)throw Error("HTTP "+response.status);
     const body=Buffer.from(await response.arrayBuffer());
     if(!body.length||body.length>25_000_000)throw Error("Empty or oversized source recording");
     await writeFile(temp,body);
     try{
       // Encode ACTUAL upstream recordings, never generated oscillator sounds.
       // MP3 is broadly supported by mobile and desktop browsers.
       await encode("ffmpeg",[
         "-hide_banner","-loglevel","error","-nostdin","-y",
         "-i",temp,...(item.crop?["-ss",String(item.crop.start),"-t",String(item.crop.duration)]:[]),...(item.crop?.removeLeadingSilence?["-af","silenceremove=start_periods=1:start_duration=0.02:start_threshold=-42dB"]:[]),"-vn","-map","0:a:0","-map_metadata","-1",
         "-codec:a","libmp3lame","-b:a","96k","-ar","44100",converted
       ],{timeout:45000,maxBuffer:1024*1024});
     }finally{await unlink(temp).catch(()=>{})}
     cached=await stat(converted);
   }
   if(item.crop?.removeLeadingSilence){
     // A valid MP3 may contain only digital silence. Reject it before deployment.
     const check=await encode("ffmpeg",["-hide_banner","-i",converted,"-af","volumedetect","-f","null","-"],{timeout:20000,maxBuffer:1024*1024});
     const peak=Number(check.stderr.match(/max_volume:\\s*(-?[0-9.]+) dB/)?.[1]??-Infinity);
     if(!Number.isFinite(peak)||peak < -36)throw Error("Spoken clip is silent after trimming ("+peak+" dB)");
   }
   if(!cached?.size)throw Error("Encoded recording is empty");
   if(bytes+cached.size>limit){skipped++;return}
   bytes+=cached.size;
   await copyFile(converted,join(output,"samples",file));
   map[item.url]="./samples/"+file;
   copied++;
 }catch(error){
   failed.push({url:item.url,error:String(error.message||error).slice(0,180)});
   await unlink(temp).catch(()=>{});
   await unlink(converted).catch(()=>{});
 }
}
async function worker(){
 while(cursor<candidates.length){
   const item=candidates[cursor++];
   await retrieve(item);
   done++;
   if(done%100===0)console.log("Mirror progress",done,"/",candidates.length,"stored",copied,"files");
 }
}
await Promise.all(Array.from({length:concurrency},worker));
await writeFile(join(output,"sample-map.js"),
 "// Generated during the site build. Only verified local recordings appear here.\n"+
 "export const LOCAL_SAMPLES="+JSON.stringify(map)+";\n");
await writeFile(join(output,"sample-mirror-report.json"),JSON.stringify({
 eligible:candidates.length,totalCatalogCandidates:pick.length,format:"mp3",bitrateKbps:96,mirrored:copied,bytes,skippedBudget:skipped,
 failed:failed.length,failures:failed.slice(0,40)
},null,2));
console.log("Mirrored",copied,"of",candidates.length,"declared samples,",(bytes/1e6).toFixed(1),"MB; errors",failed.length);
if(copied!==candidates.length)throw Error("Incomplete local library: "+copied+"/"+candidates.length+" copied; "+failed.length+" failures, "+skipped+" over budget");
