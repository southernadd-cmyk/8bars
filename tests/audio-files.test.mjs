import test from "node:test";
import assert from "node:assert/strict";
import {
  validateAudioFile,saveSample,getSample,allSamples,removeSample,localSource,sourceId
} from "../audio-files.js";

function audioFile(name, bytes=44) {
  const file=new Blob([new Uint8Array(bytes)],{type:"audio/wav"});
  Object.defineProperty(file,"name",{value:name});
  return file;
}

test("audio import validates extensions and file limits",()=>{
  assert.equal(validateAudioFile(audioFile("drum.wav")),null);
  assert.match(validateAudioFile(audioFile("script.exe")),/Unsupported format/);
  assert.match(validateAudioFile({name:"empty.wav",size:0}),/Empty audio/);
  assert.match(validateAudioFile({name:"large.wav",size:26*1024*1024}),/25 MB/);
});

test("saved samples keep their audio, root note and original channel metadata",async()=>{
  const sound=audioFile("my-kick.wav");
  const {item}=await saveSample(sound,{track:"kick",root:64});
  try {
    assert.equal(item.track,"kick");
    assert.equal(item.root,64);
    const record=await getSample(item.id);
    assert.ok(record);
    assert.equal(record.blob.size,sound.size);
    assert.equal(record.name,"my-kick.wav");
    const source=localSource(item);
    assert.equal(sourceId(source.url),item.id);
    assert.equal(source.root,64);
    // The source itself is not restricted to the channel selected at import.
    assert.ok(!Object.hasOwn(source,"track"));
    assert.ok((await allSamples()).items.some(s=>s.id===item.id));
  } finally {
    await removeSample(item.id);
  }
  assert.equal(await getSample(item.id),null);
});
