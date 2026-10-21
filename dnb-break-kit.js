// Human Radio DnB: CC0 acoustic drum-kit samples performed by drummer Austin
// McMahon and published as Virtuosity Drums (Versilian / Karoryfer).
// AAC-LC delivery and dynamic layers by Keyboardia, pinned at a Git commit.
// NOT pre-recorded copyrighted break loops: individually licensed kit strikes.
const ROOT="https://raw.githubusercontent.com/adewale/keyboardia/869d3f5095084003e1251aa3ebf2eab8f65f62fe/app/public/instruments/";
const sample=(instrument,file,label)=>({
 url:ROOT+instrument+"/"+file+".m4a",label,
 license:"CC0 1.0",source:"Virtuosity Drums · Versilian Studios / Karoryfer; Keyboardia AAC delivery"
});
export const DNB_BREAK_KIT={
 kick:[
  sample("acoustic-kick","source-0010","Acoustic kit kick · mid-strong"),
  sample("acoustic-kick","source-0014","Acoustic kit kick · strong")
 ],
 snare:[
  sample("acoustic-snare","source-0028","Acoustic kit snare · loud"),
  sample("acoustic-snare","source-0026","Acoustic kit snare · loud variation")
 ],
 ghost:[
  sample("acoustic-snare","source-0023","Acoustic kit snare · soft ghost"),
  sample("acoustic-snare","source-0032","Acoustic kit snare · soft ghost variation")
 ],
 hat:[
  sample("acoustic-hihat-closed","source-0010","Acoustic closed hat · mid"),
  sample("acoustic-hihat-closed","source-0011","Acoustic closed hat · mid variation")
 ],
 openhat:[
  sample("acoustic-hihat-open","source-0008","Acoustic open hat · mid"),
  sample("acoustic-hihat-open","source-0009","Acoustic open hat · mid variation")
 ]
};
export function dnbDrumSample(track,velocity,step,seed=0){
 const role=track==="snare"&&velocity<.34?"ghost":track;
 const options=DNB_BREAK_KIT[role];
 if(!options)return null;
 // Deterministic alternation avoids a machine-gun identical one-shot, even
 // on adjacent snare ghost hits. The different source recordings are real.
 const selection=(Math.floor(step/8)+(String(seed).length%2))%options.length;
 return options[selection];
}
