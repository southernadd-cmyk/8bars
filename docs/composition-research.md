# Composition engine research · October 2026

## Why v0.2 sounded like the same song

Changing the seed mostly altered small events. The composer retained a fixed bass rhythm per style, three four-chord templates per mode, one five-note melodic contour, identical percussion foundations and an unconditional bar-six register lift. Selecting different sound samples made the timbre different but did not solve the underlying compositional repetition.

## Open-source reference projects

| Project | Relevant technique | What 8bars adopts |
| --- | --- | --- |
| [Tonal.js](https://github.com/tonaljs/tonal) (MIT) | Functional scales, chords, inversions and voice-leading functions | Functional chord paths, optional extensions and near-neighbour chord voicings; implemented natively without an npm dependency |
| [Strudel](https://github.com/tidalcycles/strudel) (AGPL-3.0 project; consult source-file licences before reusing code) | Pattern transformations, repetition/rotation, Euclidean rhythms and polymeter | Style-appropriate groove families, per-track beat variations, alternate accents and rotated Euclidean figures |
| [music21](https://github.com/cuthbertLab/music21) (BSD) | Roman numeral harmony, contextual chord function and music analysis | Degree-relative chord progression plans and minor-key dominant alterations, without porting Python |
| [Magenta MusicVAE](https://github.com/magenta/magenta/tree/main/magenta/models/music_vae) | Hierarchical structure; generation, variation and interpolation across phrases and multiple instruments | Conceptual inspiration for shared eight-bar plans, motif development and coordinated tracks; **no ML model or model weights integrated** |

No code from these projects was copied. The rule engine remains a dependency-free ES module.

## Implemented in v0.3

- 12 functional chord paths in each major/minor mode, varied by seven eight-bar harmonic-change shapes; occasional seventh extensions.
- Chord voicing candidates selected for minimal change from the preceding chord.
- Groove families selected from a style-specific pool; many kick/snare foundations and individual seeded drum transformations.
- Ten bass figures, with a contrasting rhythmic answer and chord-aware root, fifth, octave and passing-note options.
- Eight melodic contours, nine phrase rhythms and transformations across the eight-bar form (transposition, inversion, reversal, different golden-turn treatments).
- Five eight-bar form energy arcs altering activity in several parts; all 12 mixer channels continue to produce events.
- Identical seed, settings and version still reproduce the same event data, and track-local mutations leave other tracks unchanged.

## Acceptance / measurement

The checked-in `tests/variety.test.mjs` exercises forty seeds in each style, at fixed key, mode and density. It checks diversity of harmonic movements, bass patterns, lead melodies, kick/snare timing, chord voicings and form; it also tests the presence of every track and a lead event during the golden turn. The ordinary test suite continues to validate regeneration independence and event bounds.

These structural signatures are only proxies for *perceived* musical distinctness. A listening test is still necessary. In particular, a similar sound bank patch, identical tempo and uninterrupted level can make very different MIDI sound closer than intended.

## Proposed next steps

1. **Listening matrix**: render 6-10 pieces per style to WAV and run human A/B comparisons, marking repeated grooves, similarities and compositional failures.
2. **Adaptive tension model**: explicit target curves for harmonic tension, rest/silence, registers, intensity and instrument entrances, scored before selecting a plan.
3. **Longer-range motif constraints**: preserve motifs across verses and variations while allowing instrument-specific phrasing and counterpoint.
4. **Editing and locking**: let a listener lock harmony, groove, rhythm or selected tracks, and regenerate the remaining material without losing good material.
5. **Perceptual novelty guard**: score candidate outputs against recent compositions using beat accents, chord-degree rhythm, melody interval contour and texture, with a limited deterministic retry budget.

Do **not** pursue random notes or instrument presets as substitutes for musical variation; variation must alter the harmonic, rhythmic and formal plans.
