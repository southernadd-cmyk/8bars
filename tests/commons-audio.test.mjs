import test from "node:test";
import assert from "node:assert/strict";
import {parseLicense,normalizeCommonsItem,commonsSearchUrl,searchCommonsAudio} from "../commons-audio.js";

function entry(license="CC BY 4.0",mime="audio/ogg",size=1280){
 return {pageid:123,title:"File:Rain recording.ogg",imageinfo:[{
  url:"https://upload.wikimedia.org/commons/example.ogg",descriptionurl:"https://commons.wikimedia.org/wiki/File:Rain_recording.ogg",
  mime,size,extmetadata:{LicenseShortName:{value:license},Artist:{value:"<span>Example Author</span>"}}
 }]};
}
test("restricts imports to documented re-usable licences",()=>{
 assert.equal(parseLicense("CC0 1.0"),"CC0");
 assert.equal(parseLicense("CC BY 4.0"),"CC BY");
 assert.equal(parseLicense("Public domain"),"Public domain");
 for(const name of ["CC BY-SA 4.0","CC BY-NC 4.0","CC BY-ND 4.0","All rights reserved",""]){
  assert.equal(parseLicense(name),null,name);
 }
});
test("keeps credits and filters unsupported or excessively large files",()=>{
 const item=normalizeCommonsItem(entry());
 assert.equal(item.license,"CC BY");assert.equal(item.author,"Example Author");
 assert.ok(item.canImport);assert.ok(item.descriptionUrl.startsWith("https://"));
 assert.equal(normalizeCommonsItem(entry("CC BY-SA 4.0")),null);
 assert.equal(normalizeCommonsItem(entry("CC0 1.0","image/png")),null);
 assert.equal(normalizeCommonsItem(entry("CC0 1.0","audio/ogg",26000000)).canImport,false);
});
test("builds paginated, media-only searches and never embeds credentials",()=>{
 const url=new URL(commonsSearchUrl("acoustic snare",{gsrcontinue:"next token",continue:"gsroffset||"}));
 assert.equal(url.searchParams.get("gsrsearch"),"acoustic snare filetype:audio");
 assert.equal(url.searchParams.get("gsrnamespace"),"6");
 assert.equal(url.searchParams.get("gsrcontinue"),"next token");
 assert.equal(url.searchParams.get("origin"),"*");
 assert.ok(!url.searchParams.has("token"));
});
test("search accepts API pagination and excludes non-CC audio",async()=>{
 const out=await searchCommonsAudio("rain",{fetcher:async()=>({ok:true,json:async()=>({
  query:{pages:[entry(),entry("CC BY-NC 4.0"),entry("CC0 1.0","image/jpeg")]},
  continue:{gsrcontinue:"more",continue:"-||"}
 })})});
 assert.equal(out.items.length,1);assert.equal(out.next.gsrcontinue,"more");
});
