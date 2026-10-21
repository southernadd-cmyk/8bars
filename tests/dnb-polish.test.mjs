import test from "node:test";
import assert from "node:assert/strict";
import {sampleGain,samplePeakGain} from "../sample-levels.js";
import {DNB_BREAK_KIT,dnbDrumSample,dnbVelocityChoices} from "../dnb-break-kit.js";
import {applyChannelGroove} from "../radio-channels.js";
import {createRadioVisual} from "../radio-visual.js";

function bufferFrom(samples){
 const data=Float32Array.from(samples);
 return {sampleRate:44100,length:data.length,numberOfChannels:1,
   getChannelData(){return data}};
}
test("Acoustic DnB sample levels preserve source dynamics without boosting soft hits",()=>{
 const quiet=bufferFrom(Array(128).fill(.018));
 const strong=bufferFrom(Array(128).fill(.98));
 assert.equal(samplePeakGain(quiet),1);
 assert.ok(sampleGain(quiet)>1,"normal RMS matching would boost this take");
 assert.ok(samplePeakGain(strong)<1,"very loud takes should be peak-protected");
 assert.ok(Math.abs(samplePeakGain(strong)-.92/.98)<1e-4);
 assert.equal(samplePeakGain(strong),samplePeakGain(strong),"peak matching is stable");
 assert.equal(samplePeakGain(null),1);
});

test("Missing acoustic performance tiers select nearest genuine sample instead of throwing",()=>{
 const samples=[{velocityMin:0,velocityMax:31,id:"soft"},
   {velocityMin:64,velocityMax:95,id:"accent"}];
 assert.deepEqual(dnbVelocityChoices(samples,18).map(s=>s.id),["soft"]);
 assert.deepEqual(dnbVelocityChoices(samples,51).map(s=>s.id),["accent"]);
 assert.deepEqual(dnbVelocityChoices(samples,110).map(s=>s.id),["accent"]);
 assert.deepEqual(dnbVelocityChoices([],51),[]);
 const hats=DNB_BREAK_KIT.hat,backup=[...hats];
 try{
   hats.splice(0,hats.length,...backup.filter(s=>s.velocityMin!==32));
   const near=dnbDrumSample("hat",.4,10,"gap-seed");
   assert.ok(near&&near.velocityMin===64,"nearest playable tier should be selected");
   hats.splice(0,hats.length);
   assert.equal(dnbDrumSample("hat",.4,10,"gap-seed"),null,
     "missing entire kit must allow the existing recorded fallback");
 }finally{hats.splice(0,hats.length,...backup)}
 assert.equal(dnbDrumSample("unknown",.5,0),null);
});

test("DnB hats include distinct stronger offbeat accents but retain quiet groove",()=>{
 const seeds=["accent-a","accent-b","accent-c"];
 for(const seed of seeds){
   const strong=applyChannelGroove([],"dnb",seed,"lift")
     .filter(x=>x.track==="hat");
   assert.ok(strong.some(e=>e.velocity>=.56),"lift needs real medium-velocity hat strikes");
   assert.ok(strong.some(e=>e.velocity<.3),"the main hats must remain quieter");
   assert.ok(strong.every(e=>e.velocity<=.72),"the hats should not dominate the mix");
   assert.ok(strong.filter(e=>e.velocity>=.56).every(e=>
     [2,10].includes(e.step%16)),"strong accents should stay offbeat");
   const breakdown=applyChannelGroove([],"dnb",seed,"breakdown")
     .filter(x=>x.track==="hat");
   assert.ok(breakdown.every(e=>e.velocity<.5),
     "breakdowns should not contain hard hat accents");
 }
});

test("The radio visual draws substantially fewer geometry points on narrow screens",()=>{
 const previousWindow=globalThis.window;
 try{
   globalThis.window={devicePixelRatio:2,innerWidth:1024,matchMedia:()=>({matches:false})};
   function lineCount(w,h){
     let lines=0;
     const ctx=new Proxy({},{
       get(target,key){
         if(key in target)return target[key];
         if(key==="lineTo")return ()=>{lines++};
         if(key==="createLinearGradient"||key==="createRadialGradient")
           return ()=>({addColorStop(){}});
         return ()=>{};
       },
       set(target,key,value){target[key]=value;return true}
     });
     const canvas={width:0,height:0,clientWidth:w,clientHeight:h,
       getContext(){return ctx},getBoundingClientRect(){return {width:w,height:h}}};
     const visual=createRadioVisual(canvas);
     visual.setStation("dnb");
     return {lines,canvas};
   }
   const desktop=lineCount(1000,700),mobile=lineCount(390,780);
   assert.ok(desktop.lines>5000);
   assert.ok(mobile.lines<desktop.lines*.5,
     "mobile geometry must be less than half the desktop path work");
   assert.ok(mobile.canvas.width<=390*1.4+1,
     "device pixel ratio cap still applies on mobile");
 }finally{
   if(previousWindow===undefined)delete globalThis.window;
   else globalThis.window=previousWindow;
 }
});
