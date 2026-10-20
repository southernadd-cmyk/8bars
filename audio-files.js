// Browser-only user sound storage. No uploads or external API calls.
// Files are stored as Blobs in IndexedDB; a memory fallback is session-only.
const DB="8bars-user-audio", STORE="samples";
const LIMIT=25*1024*1024, TOTAL=150*1024*1024;
const memory=new Map();
let connection;
export const ACCEPT_AUDIO=".wav,.mp3,.ogg,.oga,.flac,.aif,.aiff,.m4a,.aac,.webm";
export function validateAudioFile(file){
 if(!file||typeof file.name!=="string"||typeof file.size!=="number")return "Invalid file.";
 const ext=file.name.split(".").pop()?.toLowerCase();
 if(!["wav","mp3","ogg","oga","flac","aif","aiff","m4a","aac","webm"].includes(ext))return "Unsupported format: "+file.name;
 if(file.size<=0)return "Empty audio file: "+file.name;
 if(file.size>LIMIT)return "File exceeds the 25 MB limit: "+file.name;
 return null;
}
function openDb(){
 if(connection)return connection;
 connection=new Promise(resolve=>{
  if(typeof indexedDB==="undefined"){resolve(null);return}
  let request;
  try{request=indexedDB.open(DB,1)}catch{resolve(null);return}
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"});
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>resolve(null);
  request.onblocked=()=>resolve(null);
 });
 return connection;
}
async function readStore(mode,work){
 const db=await openDb();
 if(!db)return {persistent:false,value:null};
 return new Promise(resolve=>{
  try{
   const tx=db.transaction(STORE,mode),req=work(tx.objectStore(STORE));
   req.onsuccess=()=>resolve({persistent:true,value:req.result});
   req.onerror=()=>resolve({persistent:false,value:null});
   tx.onabort=()=>resolve({persistent:false,value:null});
  }catch{resolve({persistent:false,value:null})}
 });
}
export const localSource=record=>({
 url:"local:"+record.id,root:record.root??60,label:record.name,
 license:record.license||"User supplied",source:record.source||"Local browser library",sourceUrl:record.sourceUrl||null,author:record.author||null
});
export function sourceId(url){return typeof url==="string"&&url.startsWith("local:")?url.slice(6):null}
export async function allSamples(){
 const result=await readStore("readonly",s=>s.getAll());
 const merged=new Map();
 if(result.value)for(const record of result.value)merged.set(record.id,record);
 for(const record of memory.values())merged.set(record.id,record);
 return {items:[...merged.values()].map(({id,name,root,track,size,type,license,source,sourceUrl,author})=>({id,name,root,track,size,type,license,source,sourceUrl,author})),persistent:result.persistent};
}
export async function saveSample(file,{root=60,track="lead",license="User supplied",source="Local browser library",sourceUrl=null,author=null}={}){
 const error=validateAudioFile(file);if(error)throw Error(error);
 const catalog=await allSamples();
 const total=catalog.items.reduce((sum,x)=>sum+x.size,0);
 if(total+file.size>TOTAL)throw Error("Local library limit is 150 MB; remove unused files first.");
 const id=(typeof crypto!=="undefined"&&crypto.randomUUID)?crypto.randomUUID():
  "import-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
 const record={id,name:file.name,root:Number(root),track,size:file.size,type:file.type,license,source,sourceUrl,author,blob:file};
 const r=await readStore("readwrite",s=>s.put(record));
 if(!r.persistent)memory.set(id,record);
 return {item:{id,name:file.name,root:Number(root),track,size:file.size,type:file.type,license,source,sourceUrl,author},persistent:r.persistent};
}
export async function getSample(id){
 if(memory.has(id))return memory.get(id);
 const r=await readStore("readonly",s=>s.get(id));
 return r.value||null;
}
export async function removeSample(id){
 memory.delete(id);
 const r=await readStore("readwrite",s=>s.delete(id));
 return r.persistent;
}
