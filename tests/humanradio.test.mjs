import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync(new URL("../humanradio.html",import.meta.url),"utf8");
const radio=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
test("Human Radio page includes full screen animation and start control",()=>{
 assert.match(page,/humanradio\.gif/);
 assert.match(page,/id="start"/);
 assert.match(page,/role="status"/);
 assert.match(page,/humanradio\.js/);
});
test("Human Radio uses real samples and preloads a next arrangement",()=>{
 assert.match(radio,/compose\(/);
 assert.match(radio,/LOCAL_SAMPLES\[s\.url\]/);
 assert.match(radio,/await prepare\(candidate\)/);
 assert.match(radio,/if\(step===0&&loops>=targetLoops\)/);
});
test("drum parts evolve while retaining rhythm across transitions",()=>{
 assert.match(radio,/const keep=old\?choice/);
 assert.match(radio,/generated\.filter\(e=>!keep\.includes\(e\.track\)\)/);
 assert.match(radio,/oldPercussion\.filter\(e=>keep\.includes\(e\.track\)\)/);
 assert.match(radio,/drumSounds:chosenDrums/);
});
test("radio modulates related keys and limits tempo changes to boundaries",()=>{
 assert.match(radio,/kind==="relative"/);
 assert.match(radio,/kind==="fifth"/);
 assert.match(radio,/changeIn=choice/);
 assert.match(radio,/bpm\+delta/);
});
