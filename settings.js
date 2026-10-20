// 8bars: defensive URL mixer decoding, including v0.2 legacy silent links.
export function restoreVolumes(queryValue,defaults,ids){
 const volumes={...defaults};
 if(queryValue===null||queryValue===undefined||String(queryValue).trim()==="")return volumes;
 const values=String(queryValue).split(",");
 // v0.2 accidentally wrote 12 zero volumes when the URL omitted them.
 const legacySilent=values.length===ids.length && values.every(v=>v.trim()!=="" && Number(v)===0);
 if(legacySilent)return volumes;
 for(const [i,id] of ids.entries()){
   const text=values[i];
   if(text===undefined||text.trim()==="")continue;
   const parsed=Number(text);
   if(Number.isFinite(parsed))volumes[id]=Math.max(0,Math.min(1,parsed));
 }
 return volumes;
}
