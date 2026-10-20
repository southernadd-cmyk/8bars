// Public, no-key Commons audio discovery for the browser-based library.
// Search results are remote catalogue entries, not sounds loaded at startup.
const API="https://commons.wikimedia.org/w/api.php";
const MAX_IMPORT=25*1000*1000;
export const CC_PROVIDER="Wikimedia Commons";
export function parseLicense(value){
  const name=String(value||"").replace(/<[^>]*>/g,"").trim();
  if(/^(?:CC\s*0|CC0|Creative Commons Zero)(?:\b|\s|$)/i.test(name))return "CC0";
  if(/^(?:Public domain|PD(?:-old|-US)?\b|PDM\b)/i.test(name))return "Public domain";
  // BY-SA, BY-NC and BY-ND are intentionally excluded for initial imports.
  if(/^(?:CC[ -]?BY|Attribution)\b/i.test(name) && !/(?:\bSA\b|\bNC\b|\bND\b|ShareAlike|NonCommercial|NoDerivatives)/i.test(name))return "CC BY";
  return null;
}
export function normalizeCommonsItem(page){
  const info=page?.imageinfo?.[0];
  if(!info?.url||!/^audio\//.test(info.mime||""))return null;
  const licenseRaw=info.extmetadata?.LicenseShortName?.value||"";
  const license=parseLicense(licenseRaw);
  if(!license)return null;
  const url=info.url;
  const filename=String(page.title||"").replace(/^File:/,"");
  const ext=filename.split(".").pop().toLowerCase();
  if(!["wav","mp3","ogg","oga","flac","m4a","aac","aif","aiff","webm"].includes(ext))return null;
  const meta=info.extmetadata||{};
  const asText=v=>String(v?.value||"").replace(/<[^>]*>/g," ").replace(/&amp;/g,"&")
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim();
  const author=asText(meta.Attribution)||asText(meta.Artist)||asText(meta.Credit)||"See original file page";
  return {
    id:String(page.pageid||filename),name:filename.replace(/\.[^.]+$/,"").replace(/[_]+/g," "),
    filename,url,descriptionUrl:info.descriptionurl||"https://commons.wikimedia.org/wiki/"+encodeURIComponent(page.title),
    author,license,licenseName:asText(meta.LicenseShortName),licenseUrl:asText(meta.LicenseUrl),
    size:Number(info.size)||0,mime:info.mime,
    canImport:!!info.size&&info.size<=MAX_IMPORT,
    source:CC_PROVIDER
  };
}
export function commonsSearchUrl(query,continuation=null){
  const q=String(query||"").trim().slice(0,120);
  if(!q)throw new Error("Enter a sound to search for.");
  const params=new URLSearchParams({
    action:"query",format:"json",formatversion:"2",generator:"search",
    gsrsearch:q+" filetype:audio",gsrnamespace:"6",gsrlimit:"24",
    prop:"imageinfo",iiprop:"url|mime|size|extmetadata",
    iiextmetadatafilter:"LicenseShortName|LicenseUrl|Artist|Attribution|Credit",
    maxlag:"5",origin:"*"
  });
  if(continuation?.gsrcontinue)params.set("gsrcontinue",continuation.gsrcontinue);
  if(continuation?.gsroffset!==undefined)params.set("gsroffset",String(continuation.gsroffset));
  if(continuation?.continue)params.set("continue",continuation.continue);
  return API+"?"+params.toString();
}
export async function searchCommonsAudio(query,{continuation=null,fetcher=fetch,signal}={}){
  const response=await fetcher(commonsSearchUrl(query,continuation),{signal});
  if(!response.ok)throw new Error("Commons search returned HTTP "+response.status);
  const data=await response.json();
  if(data.error)throw new Error(data.error.info||"Commons search unavailable");
  const items=(data.query?.pages||[]).map(normalizeCommonsItem).filter(Boolean);
  return {items,next:data.continue||null};
}
