import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {compose,TRACKS} from "../composer.js";
import {ALL_CHORDS,chordsInKey,chordFromSymbol,chordSymbol,normalizeHarmonyOverrides,readHarmonyParam,validChordSymbol} from "../harmony.js";

test("editable Harmony offers validated named major, minor and diminished chords",()=>{
 assert.equal(ALL_CHORDS.length,36);
 assert.deepEqual(chordsInKey("A","minor"),["Am","Bdim","C","Dm","E","F","G"]);
 assert.deepEqual(chordsInKey("C","major"),["C","Dm","Em","F","G","Am","Bdim"]);
 assert.ok(validChordSymbol("F#m")&&validChordSymbol("C#dim")&&validChordSymbol("G"));
 for(const bad of ["","H","C++","C7","<script>","G#m7",null])assert.equal(validChordSymbol(bad),false);
 assert.deepEqual(chordFromSymbol("C#dim",6).notes,[49,52,55]);
 assert.equal(chordSymbol(chordFromSymbol("C#dim",6)),"C#dim");
 assert.equal(chordSymbol({notes:[57,60,64,67]}),"Am7");
 assert.throws(()=>chordFromSymbol("C7",4));
});
test("links retain eight chord positions and discard invalid values safely",()=>{
 const overrides=["Am",null,"F",null,null,"G","E","Am"];
 const serialized=overrides.map(x=>x||"").join(",");
 assert.deepEqual(readHarmonyParam(serialized),overrides);
 assert.deepEqual(readHarmonyParam("Am,,,,,,,badscript"),["Am",null,null,null,null,null,null,null]);
 assert.deepEqual(readHarmonyParam("Am,F"),Array(8).fill(null));
 assert.deepEqual(normalizeHarmonyOverrides([]),Array(8).fill(null));
});
test("unmodified songs retain their original generated harmony",()=>{
 const args={seed:"backward-compatible",key:"A",mode:"minor",style:"ambient"};
 assert.deepEqual(compose(args),compose({...args,harmonyOverrides:Array(8).fill(null)}));
});
test("editing a bar reharmonizes pitched events without changing drums",()=>{
 const original=compose({seed:"editable-harmony",key:"A",mode:"minor",style:"house"});
 const overrides=Array(8).fill(null); overrides[5]="C#dim";
 const changed=compose({seed:"editable-harmony",key:"A",mode:"minor",style:"house",harmonyOverrides:overrides});
 assert.equal(changed.progression.length,8);
 assert.equal(changed.progression[5].edited,true);
 assert.equal(chordSymbol(changed.progression[5]),"C#dim");
 assert.deepEqual(changed.progression.filter((_,i)=>i!==5),original.progression.filter((_,i)=>i!==5));
 const drums=TRACKS.filter(t=>t.type==="drum").map(t=>t.id);
 for(const id of drums)assert.deepEqual(changed.events.filter(e=>e.track===id),original.events.filter(e=>e.track===id),id);
 for(const id of ["bass","chords","arp","lead","counter","pad"])
   assert.notDeepEqual(changed.events.filter(e=>e.track===id),original.events.filter(e=>e.track===id),id+" not reharmonized");
 assert.deepEqual(changed,compose({seed:"editable-harmony",key:"A",mode:"minor",style:"house",harmonyOverrides:overrides}));
 assert.ok(changed.events.every(e=>e.step>=0&&e.step+e.duration<=128&&e.velocity>0));
});
test("editing the ending resolves the melody to the selected final chord",()=>{
 const overrides=Array(8).fill(null);overrides[7]="D#dim";
 const piece=compose({seed:"edited-ending",key:"A",mode:"minor",harmonyOverrides:overrides});
 assert.equal(piece.identity.cadence,"custom");
 const lead=piece.events.filter(e=>e.track==="lead"&&e.step>=112).at(-1);
 assert.ok(lead,"There should be a final melody note");
 const allowed=new Set(piece.progression[7].notes.map(n=>((n%12)+12)%12));
 assert.ok(allowed.has(lead.note%12),"The ending must resolve to a manually selected chord tone");
});
test("the live app binds chord changes, resetting and permalink restoration",()=>{
 const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 assert.match(app,/state\.harmonyOverrides=readHarmonyParam\(p\.get\("harmony"\)\)/);
 assert.match(app,/q\.set\("harmony",state\.harmonyOverrides/);
 assert.match(app,/picker\.addEventListener\("change"/);
 assert.match(app,/state\.harmonyOverrides\[index\]=picker\.value\|\|null/);
 assert.match(app,/\$\("resetHarmony"\)\.addEventListener/);
 assert.match(html,/id="resetHarmony"/);
 assert.match(html,/id="harmony"/);
});
