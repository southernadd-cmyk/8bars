// Modest, non-destructive level matching for recorded samples.
const cache=new WeakMap();
export function sampleGain(buffer){
 if(!buffer||typeof buffer.getChannelData!=="function"||!Number.isFinite(buffer.numberOfChannels)||buffer.numberOfChannels<1)return 1;
 if(cache.has(buffer))return cache.get(buffer);
 const length=Math.min(buffer.length,Math.round((buffer.sampleRate||44100)*2));
 const stride=Math.max(1,Math.ceil(length/24000));
 let energy=0,peak=0,count=0;
 for(let c=0;c<buffer.numberOfChannels;c++){
  const data=buffer.getChannelData(c);
  for(let i=0;i<length;i+=stride){const x=data[i];if(!Number.isFinite(x))continue;energy+=x*x;peak=Math.max(peak,Math.abs(x));count++}
 }
 const rms=Math.sqrt(energy/Math.max(1,count));
 const gain=rms<0.001?1:Math.max(0.35,Math.min(2.5,0.12/rms,peak>0?0.92/peak:2.5));
 cache.set(buffer,gain);return gain;
}

// Keep the original dynamics of velocity-layered acoustic drum takes.
// No loudness matching or makeup gain; attenuate peaks only when necessary.
const peakCache=new WeakMap();
export function samplePeakGain(buffer){
 if(!buffer||typeof buffer.getChannelData!=="function"||
    !Number.isFinite(buffer.numberOfChannels)||buffer.numberOfChannels<1)return 1;
 if(peakCache.has(buffer))return peakCache.get(buffer);
 const length=Math.min(buffer.length,Math.round((buffer.sampleRate||44100)*2));
 let peak=0;
 for(let c=0;c<buffer.numberOfChannels;c++){
  const data=buffer.getChannelData(c);
  for(let i=0;i<length;i++){
   if(Number.isFinite(data[i]))peak=Math.max(peak,Math.abs(data[i]));
  }
 }
 const gain=peak>.92?.92/peak:1;
 peakCache.set(buffer,gain);return gain;
}
