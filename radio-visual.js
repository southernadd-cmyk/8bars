// Sound-reactive generative canvas for Human Radio.
// Draws only geometry driven by the real audio analyser and scheduled notes.
// No external GIF, third-party imagery, video, or independently playing audio.
const COLORS={
 mixed:[155,192,206],hiphop:[37,54,71],dnb:[178,164,202],pop:[316,335,22]
};
export function createRadioVisual(canvas){
 const context=canvas.getContext("2d",{alpha:false});
 if(!context)return {start(){},stop(){},onNote(){},changePhase(){},setStation(){},attach(){}};
 let analyser=null,bins=null,channel="mixed",phase=0,frame=0,raf=0,lastFrame=0,active=false;
 let width=1,height=1;
 let kick=0,snare=0,low=0,mid=0,high=0;
 let sparks=[];
 const reduced=matchMedia("(prefers-reduced-motion: reduce)");
 function resize(){
   const pixelRatio=Math.min(2,window.devicePixelRatio||1);
   const rect=canvas.getBoundingClientRect();
   width=Math.max(1,rect.width);height=Math.max(1,rect.height);
   const w=Math.max(1,Math.round(width*pixelRatio));
   const h=Math.max(1,Math.round(height*pixelRatio));
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
   context.setTransform(pixelRatio,0,0,pixelRatio,0,0);
 }
 function paint(){
   if(!context)return;
   const w=width,h=height,cx=w*.5,cy=h*.5;
   const hue=COLORS[channel][phase%3];
   const wash=context.createLinearGradient(0,0,w,h);
   wash.addColorStop(0,"hsl("+hue+",30%,8%)");
   wash.addColorStop(.55,"hsl("+(hue+17)+",25%,5%)");
   wash.addColorStop(1,"hsl("+(hue-13)+",24%,11%)");
   context.fillStyle=wash;context.fillRect(0,0,w,h);
   const scale=Math.min(w,h);
   const energy=Math.min(1,low*.85+mid*.4+kick*.35);
   // A broad diffused halo follows the bass instead of flashing the screen.
   const halo=context.createRadialGradient(cx,cy,scale*.07,cx,cy,scale*(.57+.09*energy));
   halo.addColorStop(0,"hsla("+hue+",52%,"+(17+energy*12)+"%,.43)");
   halo.addColorStop(1,"hsla("+hue+",35%,12%,0)");
   context.fillStyle=halo;context.fillRect(0,0,w,h);
   const R=scale*(.18+.07*low+.05*kick);
   const shape=72;
   // Concentric trajectories retain musical memory through phase and tempo.
   for(let ring=0;ring<4;ring++){
     context.beginPath();
     for(let i=0;i<=shape;i++){
       const angle=i/shape*Math.PI*2;
       const harmonic=Math.sin(angle*(3+ring)+phase*.7+frame*.006)*(8+28*mid);
       const shimmer=Math.sin(angle*7-phase+frame*.004)*(4+high*13);
       const radius=R+(ring-1.5)*scale*.07+harmonic+shimmer;
       const x=cx+Math.cos(angle)*radius*1.17,y=cy+Math.sin(angle)*radius*.8;
       if(!i)context.moveTo(x,y);else context.lineTo(x,y);
     }
     context.strokeStyle="hsla("+((hue+ring*13)%360)+",67%,"+(57+ring*3)+"%,"+(.16+low*.23+ring*.05)+")";
     context.lineWidth=1.2+ring*.36+energy*.9;
     context.stroke();
   }
   // Actual spectrum density provides a moving horizontal tonal fingerprint.
   const segments=48;
   for(let i=0;i<segments;i++){
     const frequency=bins?.[Math.min(bins.length-1,Math.floor(i/segments*bins.length))]/255||0;
     const angle=(i/segments)*Math.PI*2+phase*.15;
     const radius=R+scale*.19;
     const length=3+frequency*scale*.08+mid*scale*.024;
     context.beginPath();
     context.moveTo(cx+Math.cos(angle)*radius*1.17,cy+Math.sin(angle)*radius*.8);
     context.lineTo(cx+Math.cos(angle)*(radius+length)*1.17,cy+Math.sin(angle)*(radius+length)*.8);
     context.strokeStyle="hsla("+((hue+30)%360)+",70%,72%,"+(.15+frequency*.52)+")";
     context.lineWidth=1.2;
     context.stroke();
   }
   // Percussive transients create restrained, short-lived dots.
   if(!reduced.matches){
     for(const item of sparks){
       context.beginPath();
       const a=item.a+item.age*.01,p=R+item.age*1.8;
       context.arc(cx+Math.cos(a)*p*1.17,cy+Math.sin(a)*p*.8,item.size,0,2*Math.PI);
       context.fillStyle="hsla("+hue+",80%,80%,"+Math.max(0,(1-item.age/42)*.75)+")";
       context.fill();
       item.age++;
     }
     sparks=sparks.filter(x=>x.age<42);
   }else sparks=[];
 }
 function spectrum(){
   if(!analyser||!bins)return;
   analyser.getByteFrequencyData(bins);
   const average=(start,end)=>{
     let sum=0;
     for(let i=start;i<end;i++)sum+=bins[i];
     return sum/Math.max(1,end-start)/255;
   };
   const n=bins.length;
   low=low*.8+average(0,Math.max(2,Math.floor(n*.12)))*.2;
   mid=mid*.82+average(Math.floor(n*.12),Math.floor(n*.51))*.18;
   high=high*.83+average(Math.floor(n*.51),n)*.17;
 }
 function render(time){
   if(!active)return;
   raf=requestAnimationFrame(render);
   if(time-lastFrame<(reduced.matches?160:33))return;
   lastFrame=time;if(!reduced.matches)frame++;
   if(canvas.clientWidth!==width||canvas.clientHeight!==height)resize();
   spectrum();
   kick*=.88;snare*=.85;
   paint();
 }
 return {
   attach(node){analyser=node;bins=new Uint8Array(node.frequencyBinCount)},
   setStation(id){channel=Object.hasOwn(COLORS,id)?id:"mixed";phase++;paint()},
   changePhase(){phase++;paint()},
   onNote(note){
     if(reduced.matches)return;
     if(note.track==="kick")kick=Math.min(1,kick+note.velocity*.48);
     if(note.track==="snare")snare=Math.min(1,snare+note.velocity*.3);
     if(["kick","snare","hat","lead"].includes(note.track)&&sparks.length<50){
       const seed=note.step*11+(note.note||0)*7+frame*3;
       sparks.push({a:(seed%360)*Math.PI/180,age:0,size:note.track==="kick"?2.3:1.2});
     }
   },
   start(){if(active)return;resize();active=true;raf=requestAnimationFrame(render)},
   stop(){active=false;cancelAnimationFrame(raf);raf=0;paint()},
   paint(){resize();paint()}
 };
}
