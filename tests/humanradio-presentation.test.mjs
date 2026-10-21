import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parseRadioDictionary,radioTitleForSeed,radioNameForSeed} from "../radio-names.js";

test("Human Radio only displays a deterministic title, never a fictional artist",()=>{
  const html=readFileSync(new URL("../humanradio.html",import.meta.url),"utf8");
  const radio=readFileSync(new URL("../humanradio.js",import.meta.url),"utf8");
  assert.doesNotMatch(html,/id="artist"/);
  assert.doesNotMatch(radio,/\$\("artist"\)/);
  assert.match(html,/id="track"/);
  const words=parseRadioDictionary(readFileSync(new URL("../radio-words.txt",import.meta.url),"utf8"));
  assert.ok(words.length>=100);
  const titles=new Set();
  for(let n=0;n<200;n++){
    const seed="human-radio-"+n;
    const title=radioTitleForSeed(seed,words);
    titles.add(title);
    assert.equal(radioTitleForSeed(seed,words),title);
    assert.deepEqual(radioNameForSeed(seed,words),{title});
    const parts=title.split(" ");
    assert.ok(parts.length>=1&&parts.length<=3);
    assert.equal(new Set(parts).size,parts.length);
    assert.ok(parts.every(word=>/^[A-Z][a-z]+$/.test(word)));
  }
  assert.ok(titles.size>160,"seed changes should visibly change track titles");
});

test("The replacement radio scene retains sound, motion, and station lifecycle",async()=>{
  const {createRadioVisual}=await import("../radio-visual.js");
  const ctx=new Proxy({},{
    get(target,key){
      if(key in target)return target[key];
      if(key==="createLinearGradient"||key==="createRadialGradient")
        return ()=>({addColorStop(){}});
      return ()=>{};
    },
    set(target,key,value){target[key]=value;return true}
  });
  const canvas={
    width:0,height:0,clientWidth:900,clientHeight:580,
    getContext(){return ctx},
    getBoundingClientRect(){return {width:900,height:580}}
  };
  const previousWindow=globalThis.window;
  const previousRAF=globalThis.requestAnimationFrame;
  const previousCancel=globalThis.cancelAnimationFrame;
  try{
    let frame=null,cancelled=false;
    globalThis.window={devicePixelRatio:1.5,innerWidth:900,matchMedia:()=>({matches:false})};
    globalThis.requestAnimationFrame=cb=>{frame=cb;return 1};
    globalThis.cancelAnimationFrame=()=>{cancelled=true};
    const visual=createRadioVisual(canvas);
    visual.setStation("pop");
    visual.changePhase();
    visual.attach({frequencyBinCount:64,getByteFrequencyData(target){target.fill(44)}});
    visual.start();
    for(const time of [40,80,120]){
      visual.onNote({track:"kick",step:4,velocity:.8});
      frame(time);
    }
    visual.stop();
    assert.ok(cancelled);
    assert.ok(canvas.width>900);
    globalThis.window.matchMedia=()=>({matches:true});
    const still=createRadioVisual(canvas);
    still.setStation("dnb");
    still.start();
    still.onNote({track:"snare",step:11,velocity:1});
    frame(200);
    still.stop();
  }finally{
    if(previousWindow===undefined)delete globalThis.window;
    else globalThis.window=previousWindow;
    if(previousRAF===undefined)delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame=previousRAF;
    if(previousCancel===undefined)delete globalThis.cancelAnimationFrame;
    else globalThis.cancelAnimationFrame=previousCancel;
  }
});
