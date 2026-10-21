// Human Radio's original, sound-reactive dimensional landscape.
// Full-frame atmospheric artwork, not a traditional equaliser or a licensed video.
const TAU=Math.PI*2;
const THEMES={
  mixed:{hue:179,second:274,flare:49},
  hiphop:{hue:22,second:336,flare:48},
  dnb:{hue:185,second:266,flare:311},
  pop:{hue:321,second:197,flare:43}
};
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const ink=(h,s,l,a=1)=>"hsla("+((h%360+360)%360)+","+s+"%,"+l+"%,"+a+")";
function starMap(){
  let seed=249861;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  return Array.from({length:175},()=>({
    x:rand(),y:rand(),size:.4+rand()*1.7,phase:rand()*TAU,depth:.18+rand()*.8
  }));
}
const STARS=starMap();

export function createRadioVisual(canvas){
  const ctx=canvas.getContext("2d",{alpha:false});
  if(!ctx)return {start(){},stop(){},onNote(){},changePhase(){},setStation(){},attach(){},paint(){}};
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  let analyser=null,bins=null,station="mixed",chapter=0;
  let width=1,height=1,active=false,raf=0,lastFrame=0,visualTime=0;
  let bass=0,mid=0,treble=0,kick=0,snare=0;
  let glints=[];
  function resize(){
    const rect=canvas.getBoundingClientRect();
    const w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
    const dpr=Math.min(window.devicePixelRatio||1,window.innerWidth<700?1.4:1.7);
    const cw=Math.round(w*dpr),ch=Math.round(h*dpr);
    width=w;height=h;
    if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function spectrum(){
    if(!analyser||!bins)return;
    analyser.getByteFrequencyData(bins);
    // Most musical energy lies in the bottom half of the logarithmic FFT display.
    const band=(a,b)=>{
      const from=Math.floor(a*bins.length),to=Math.max(from+1,Math.floor(b*bins.length));
      let sum=0;
      for(let i=from;i<to;i++)sum+=bins[i];
      return sum/Math.max(1,to-from)/255;
    };
    bass=bass*.82+band(0,.10)*.18;
    mid=mid*.83+band(.10,.43)*.17;
    treble=treble*.85+band(.43,1)*.15;
  }
  function radial(x,y,r,stops){
    const gradient=ctx.createRadialGradient(x,y,0,x,y,r);
    for(const [at,color] of stops)gradient.addColorStop(at,color);
    return gradient;
  }
  function sky(t,theme){
    const w=width,h=height,base=theme.hue;
    const wash=ctx.createLinearGradient(0,0,w,h);
    wash.addColorStop(0,ink(base-26,47,5));
    wash.addColorStop(.43,ink(base+42,44,8));
    wash.addColorStop(1,ink(theme.second,42,4));
    ctx.fillStyle=wash;ctx.fillRect(0,0,w,h);

    // Oversized, translucent nebula clouds supply the atmosphere missing
    // from the old outline-only visual.
    ctx.globalCompositeOperation="screen";
    const clouds=[
      [.15,.20,.48,theme.second, .12],
      [.82,.72,.54,theme.hue, .12],
      [.63,.08,.36,theme.flare, .075],
      [.10,.82,.50,theme.hue, .065]
    ];
    for(const [x,y,r,hue,opacity] of clouds){
      ctx.fillStyle=radial(x*w,y*h,Math.max(w,h)*r,[
        [0,ink(hue,76,30,opacity+.03*mid)],
        [.36,ink(hue,63,18,opacity*.55)],
        [1,ink(hue,70,12,0)]
      ]);
      ctx.fillRect(0,0,w,h);
    }
    ctx.globalCompositeOperation="source-over";
    for(const star of STARS){
      const drift=reduced.matches?0:t*.003*star.depth;
      const x=((star.x+drift)%1)*w,y=(star.y+Math.sin(t*.13+star.phase)*.0018*star.depth)*h;
      const shimmer=reduced.matches?.68:.58+.28*Math.sin(t*(.6+star.depth)+star.phase);
      ctx.fillStyle=ink(star.depth>.75?theme.flare:theme.hue,43,87,
        (star.depth*.52+.16)*shimmer);
      ctx.beginPath();ctx.arc(x,y,star.size*(.6+star.depth*.45),0,TAU);ctx.fill();
    }
  }
  function contour(r,t,seed=0){
    ctx.beginPath();
    for(let n=0;n<=140;n++){
      const a=n/140*TAU;
      const distortion=1+
        .06*Math.sin(a*5-t*.23+seed)+
        .037*Math.sin(a*9+t*.17-seed*1.6)+
        .024*Math.sin(a*14-t*.31+seed*.4);
      const x=Math.cos(a)*r*distortion,y=Math.sin(a)*r*distortion;
      if(n===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.closePath();
  }
  function portal(t,theme){
    const w=width,h=height;
    const cx=w*(w<700?.51:.55),cy=h*(h<700?.38:.45);
    const R=Math.min(w*.52,h*.62);
    const pulse=clamp(bass*.48+kick*.15);
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-.12);ctx.scale(1.19,.90);
    ctx.globalCompositeOperation="screen";

    // Massive soft rim, which continues well beyond the inner vortex.
    ctx.fillStyle=radial(0,0,R*1.5,[
      [0,ink(theme.second,80,25,.08)],
      [.29,ink(theme.hue,90,32,.17)],
      [.55,ink(theme.hue,89,34,.17+pulse*.11)],
      [.73,ink(theme.second,85,35,.09)],
      [1,ink(theme.hue,72,22,0)]
    ]);
    ctx.fillRect(-R*1.5,-R*1.5,R*3,R*3);

    // Broad overlapping translucent liquid membranes, not wireframe circles.
    for(let layer=11;layer>=0;layer--){
      const r=R*(.23+layer*.073)+pulse*R*.025;
      contour(r,t,chapter*.72+layer*.3);
      const hue=layer%3===0?theme.flare:layer%2?theme.second:theme.hue;
      ctx.fillStyle=ink(hue,82,34+layer%3*7,layer%3===0?.055:.095);
      ctx.fill();
      ctx.strokeStyle=ink(hue,90,51+layer%3*5,.08+mid*.14);
      ctx.lineWidth=R*(.015+layer*.001);
      ctx.stroke();
    }

    // Twisting ribbons make the image feel like a living, animated location.
    // Both colour and shape evolve slowly; actual notes steer the motion.
    for(let arm=0;arm<32;arm++){
      const start=arm/32*TAU+chapter*.19;
      const outward=arm%2===0;
      const hue=arm%5===0?theme.flare:arm%3===0?theme.second:theme.hue;
      ctx.beginPath();
      for(let i=0;i<=80;i++){
        const u=i/80;
        const p=outward?u:1-u;
        const a=start+u*(3.3+arm%5*.18)+t*(.10+(arm%4)*.015);
        const r=R*(.12+p*.94+.034*Math.sin(u*19+arm*1.9+t*.25))
          *(1+.038*mid*Math.sin(u*TAU*3+arm));
        const x=Math.cos(a)*r,y=Math.sin(a)*r;
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.lineCap="round";
      ctx.strokeStyle=ink(hue,93,39,.055+.035*mid);
      ctx.lineWidth=R*(.020+(arm%4)*.008);
      ctx.stroke();
      ctx.strokeStyle=ink(hue,94,72,.16+.10*treble);
      ctx.lineWidth=.7+(arm%4)*.36;
      ctx.stroke();
    }
    // Folds of luminous organic tissue shift independently from the spiral arms.
    for(let fold=0;fold<15;fold++){
      const radius=R*(.29+fold*.051);
      ctx.beginPath();
      for(let n=0;n<=100;n++){
        const a=n/100*TAU;
        const curl=.068*Math.sin(6*a+t*.25+fold*.66)+.043*Math.cos(11*a-t*.19+fold*.3);
        const rr=radius*(1+curl);
        const x=Math.cos(a)*rr,y=Math.sin(a)*rr;
        if(!n)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.closePath();
      ctx.lineWidth=.8+fold%4*.6;
      ctx.strokeStyle=ink(fold%3?theme.hue:theme.flare,87,60,
        .13+.06*Math.sin(t*.37+fold)+.08*treble);
      ctx.stroke();
    }
    // Opaque alpha compositing is essential here: screen blending would
    // make the dark tunnel core disappear against the bright membranes.
    ctx.globalCompositeOperation="source-over";
    // Dark heart adds strong depth and a focal point for the swirling tunnel.
    ctx.fillStyle=radial(0,0,R*.5,[
      [0,ink(theme.second,53,3,.94)],
      [.27,ink(theme.hue,65,5,.88)],
      [.70,ink(theme.second,79,12,.35)],
      [1,ink(theme.hue,80,35,0)]
    ]);
    ctx.beginPath();ctx.arc(0,0,R*.5,0,TAU);ctx.fill();

    // Internal ribbons continue into the centre rather than leaving a flat disk.
    ctx.globalCompositeOperation="screen";
    for(let strand=0;strand<12;strand++){
      ctx.beginPath();
      for(let n=0;n<=65;n++){
        const u=n/65;
        const a=strand/12*TAU+u*5.8-t*.2;
        const rr=R*(.045+.37*u);
        if(!n)ctx.moveTo(rr*Math.cos(a),rr*Math.sin(a));
        else ctx.lineTo(rr*Math.cos(a),rr*Math.sin(a));
      }
      ctx.strokeStyle=ink(strand%2?theme.flare:theme.hue,93,70,.16+treble*.12);
      ctx.lineWidth=1.2+strand%3*.65;ctx.stroke();
    }
    ctx.globalCompositeOperation="source-over";ctx.restore();

    // Occasional note-triggered glimmers, not full-screen strobes.
    if(!reduced.matches){
      for(const spark of glints){
        const radius=R*(.24+spark.r*.9);
        const a=spark.angle+t*.12;
        const x=cx+Math.cos(a)*radius*1.19,y=cy+Math.sin(a)*radius*.91;
        const life=1-spark.age/34;
        ctx.fillStyle=ink(theme.flare,90,83,.62*life);
        ctx.beginPath();ctx.arc(x,y,1.1+spark.size*life,0,TAU);ctx.fill();
        ctx.strokeStyle=ink(theme.hue,95,77,.25*life);
        ctx.lineWidth=1;ctx.beginPath();
        ctx.moveTo(x-7*life,y);ctx.lineTo(x+7*life,y);ctx.stroke();
        spark.age++;
      }
      glints=glints.filter(x=>x.age<34);
    }else glints=[];
  }
  function foreground(theme){
    // Foreground shadow shapes and vignette give the scene scale and depth.
    const w=width,h=height;
    const shade=ctx.createLinearGradient(0,h*.66,0,h);
    shade.addColorStop(0,ink(theme.hue,32,5,0));
    shade.addColorStop(1,ink(theme.hue,42,3,.68));
    ctx.fillStyle=shade;ctx.fillRect(0,h*.66,w,h*.34);
    ctx.fillStyle=ink(theme.hue,35,3,.40);
    ctx.beginPath();ctx.moveTo(0,h*.73);
    ctx.bezierCurveTo(w*.09,h*.70,w*.15,h*.86,w*.30,h*.89);
    ctx.lineTo(0,h);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(w,h*.72);
    ctx.bezierCurveTo(w*.9,h*.78,w*.83,h*.90,w*.71,h*.93);
    ctx.lineTo(w,h);ctx.closePath();ctx.fill();
    ctx.fillStyle=radial(w*.52,h*.44,Math.max(w,h)*.76,[
      [0,"rgba(0,0,0,0)"],[.65,"rgba(0,0,0,.03)"],[1,"rgba(0,0,0,.67)"]
    ]);
    ctx.fillRect(0,0,w,h);
  }
  function paint(time=visualTime){
    const t=reduced.matches?0:time*.001;
    const theme=THEMES[station];
    sky(t,theme);portal(t,theme);foreground(theme);
  }
  function render(time){
    if(!active)return;
    raf=requestAnimationFrame(render);
    if(time-lastFrame<(reduced.matches?180:32))return;
    lastFrame=time;visualTime=time;
    if(width!==canvas.clientWidth||height!==canvas.clientHeight)resize();
    spectrum();
    kick*=.89;snare*=.86;
    paint(time);
  }
  return {
    attach(node){analyser=node;bins=new Uint8Array(node.frequencyBinCount)},
    setStation(id){station=Object.hasOwn(THEMES,id)?id:"mixed";chapter++;resize();paint()},
    changePhase(){chapter++;resize();paint()},
    onNote(note){
      if(reduced.matches)return;
      if(note.track==="kick")kick=clamp(kick+(note.velocity||.7)*.36);
      if(note.track==="snare")snare=clamp(snare+(note.velocity||.7)*.3);
      if(["kick","snare","hat","lead","counter"].includes(note.track)&&glints.length<36){
        const n=note.step*43+(note.note||0)*17+chapter*13;
        glints.push({angle:(n%360)*Math.PI/180,r:(n%29)/29,
          age:0,size:note.track==="kick"?2.5:1.2});
      }
    },
    start(){if(active)return;resize();paint();active=true;lastFrame=0;raf=requestAnimationFrame(render)},
    stop(){active=false;if(raf)cancelAnimationFrame(raf);raf=0;paint()},
    paint(){resize();paint()}
  };
}
