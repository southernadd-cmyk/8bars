// Mathematical dynamics for the Classical phi radio station.
//
// These gains shape the *musical* loudness contour. They are not a substitute
// for output mastering: final loudness/true peak must be audited on recordings.
export const PHI=(1+Math.sqrt(5))/2;
export const GOLDEN_SMALL=1/(PHI*PHI); // 0.38196601125...
export const GOLDEN_LARGE=1/PHI;       // 0.61803398875...
export const GOLDEN_ANGLE_TURNS=GOLDEN_SMALL;
const MID=Math.sqrt(GOLDEN_LARGE);      // 0.78615137775...
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const smooth=x=>x*x*(3-2*x);
// The 8-bar phrase is 128 sixteenth-note steps.
// 0..38.2%: build; 38.2%..61.8%: arrival; 61.8%..end: release.
// The landmarks and the linear amplitude levels are all powers of phi.
// The main climax is at step 79.108..., not a hardcoded "bar six" flourish.
export function phiDynamicGain(step){
 const t=clamp((Number(step)||0)/128,0,1);
 if(t<=GOLDEN_SMALL)return GOLDEN_LARGE+(MID-GOLDEN_LARGE)*smooth(t/GOLDEN_SMALL);
 if(t<=GOLDEN_LARGE)return MID+(1-MID)*smooth((t-GOLDEN_SMALL)/(GOLDEN_LARGE-GOLDEN_SMALL));
 return 1-(1-GOLDEN_LARGE)*smooth((t-GOLDEN_LARGE)/(1-GOLDEN_LARGE));
}
// Used only as a per-note expression scalar in Classical phi. All other
// radio stations retain their current dynamics and sample-level matching.
export function phiExpressionAtStep(step,velocity=1){
 return clamp(Number(velocity)||0,0,1)*phiDynamicGain(step);
}
