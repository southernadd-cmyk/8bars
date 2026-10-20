import test from "node:test";
import assert from "node:assert/strict";
import {createTransport} from "../transport.js";
import {compose} from "../composer.js";

test("scheduler reaches every step and repeats the complete eight-bar loop",()=>{
 const events=compose({seed:"618033"}).events;
 const grouped=Array.from({length:128},()=>[]);
 for(const event of events)grouped[event.step].push(event);
 const delivered=[];
 const ctx={currentTime:0};
 const transport=createTransport({onStep:(step,time)=>{
   for(const event of grouped[step])delivered.push({step,track:event.track,time});
 }});
 transport.start(ctx,120,{timerEnabled:false});
 for(let i=1;i<=2200;i++){
   ctx.currentTime=i*.01;
   transport.pump();
 }
 const snapshot=transport.snapshot();
 assert.ok(snapshot.total>=128, "transport must get to eighth bar");
 assert.ok(delivered.some(e=>e.step===127), "must schedule the final sixteenth note");
 assert.ok(delivered.some(e=>e.step>=112), "must schedule events from bar eight");
 assert.ok(delivered.filter(e=>e.step===0).length>grouped[0].length, "must repeat loop");
 assert.equal(snapshot.failures,0);
 transport.stop();
});
test("an exception in one step must not halt subsequent notes",()=>{
 const ctx={currentTime:0},scheduled=[],failures=[];
 const transport=createTransport({
   onStep:(step)=>{if(step===1)throw Error("damaged note");scheduled.push(step)},
   onError:(err,step)=>failures.push(step)
 });
 transport.start(ctx,96,{timerEnabled:false});
 for(let i=1;i<=70;i++){ctx.currentTime=i*.03;transport.pump()}
 assert.ok(scheduled.includes(12));
 assert.deepEqual(failures,[1]);
 assert.equal(transport.snapshot().active,true);
 transport.stop();
});
test("scheduler resumes after a long inactive tab interval",()=>{
 const ctx={currentTime:0},played=[];
 const t=createTransport({onStep:(step)=>played.push(step)});
 t.start(ctx,100,{timerEnabled:false});
 ctx.currentTime=7;
 t.pump();
 assert.ok(t.snapshot().skipped>0);
 assert.ok(t.snapshot().total>1);
 ctx.currentTime=7.5;t.pump();
 assert.ok(t.snapshot().total>2);
 t.stop();
});
