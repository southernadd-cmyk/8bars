// Purpose-built MIT-licensed, pre-rendered synth WAV samples (Reese, sub,
// wobble and FM). Source project synthesised these WAVs from Python DSP;
// Human Radio simply triggers the files, never generating synth tones live.
// Source: Martin Pfeffer, sound-effects, MIT License, pinned revision.
// Root MIDI pitches are documented in generators/music/bass.py upstream.
const BASE="https://raw.githubusercontent.com/pepperonas/sound-effects/3067d2d1e242e60571386cec87e0183dab6e9c9e/output/music/bass/";
const note=(file,root)=>[{
 url:BASE+file+".wav",root,vel:70,license:"MIT",
 source:"Martin Pfeffer — sound-effects (MIT), 3067d2d",
 attribution:"Copyright (c) 2026 Martin Pfeffer"
}];
export const ELECTRONIC_BASS_VOICES={
 dnbReese:note("reese",36),         // Detuned C2 Reese saw stack
 dnbWobble:note("wobble_bass",36),  // C2 filtered/modulated wobble
 dnbFm:note("fm_bass",36),         // C2 FM growl
 dnbSub:note("sub_bass",24),       // Clean C1 sub foundation
 dnb808:note("bass_808",24)        // C1 pitch-glide 808
};
export const ELECTRONIC_BASS_NAMES={
 dnbReese:"Reese bass · detuned saws",
 dnbWobble:"Wobble bass · pre-rendered modulation",
 dnbFm:"FM growl bass",
 dnbSub:"Clean sub bass",
 dnb808:"808 sub bass"
};
