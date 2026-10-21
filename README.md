# 8bars

Deterministic eight-bar rule-based music composition with 12 channels. [Open the live site](https://southernadd-cmyk.github.io/8bars/).

## Current features

- Six percussion tracks (kick, snare, clap, closed hat, open hat, auxiliary percussion) and six pitched tracks (bass, chords, arpeggio, lead, countermelody, pad).
- Four styles: downtempo, house, breakbeat, ambient. Twelve keys, major/minor, tempo, density, swing and independently seeded channel variation.
- Five functional cadence types, inversion-aware chord voicing, Euclidean rhythm, motif transformations, contramotion and a sixth-bar golden-section turn.
- Euclidean rotation is normalised. Bass events stay in MIDI register 28–52. Notes cannot extend beyond step 128. On minor dominant chords, the melody avoids the natural seventh against the raised leading tone.
- The **New song** button changes the seed and sound choices; each channel's ↻ regenerates only that channel. Mute, solo, level and instrument selection are per channel.
- Grouped, real-recording sample selection; moderate RMS/peak-aware level matching; recorded pitched singing instruments, and no unpitched vocal-chop presets.
- Browser-only imported audio from files or eligible Wikimedia Commons recordings, exported MIDI/WAV/JSON and shareable settings URLs.
- The Harmony strip is now editable: choose a major, minor or diminished chord per bar. Each change rebuilds the six pitched tracks against the selected progression without changing drums. Reset chords returns to automatic harmony; selections persist in a share link and all composition exports. New song or a key/mode change starts fresh harmony.

## Human Radio

Human Radio now evolves through four musical scenes covering ambient, downtempo, breakbeat and house. It varies tempo, density and swing in coherent ranges and compares five prospective arrangements against the preceding eight pieces before preloading the best candidate. A song develops over its repeated loops through instrument entrances, fullness and short breakdowns. Musical transitions use bar-length crossfades and carry a brief pad bridge; some drum motifs and instruments are retained across related-key changes.

Playback resumes at the actual paused musical position. Scheduler events are indexed by step and decoded recordings are pruned from the cache as the session progresses. No generated-oscillator audio is used.

### Human Radio: connected forms (Release 2)

Each station chapter is now **five to seven related eight-bar sections** (40–56 bars) with an opening, statement, melodic answer, lift, optional breakdown and reprise, and final return. The composer varies lead/countermelody/arp and selected percussion between sections while retaining the chapter’s tonal centre, instrument palette and recurring phrase. A few middle-section chord substitutions use triads taken from the chapter’s existing harmony; the last section returns to its original chord sequence.

Preload the *next* section's actual recordings while the current one plays; if they are not ready, keep playing the current section instead of starting silent notes. Chord-aware candidate ranking balances novelty with smooth harmonic movement. At a chapter boundary, a gentle crossfade sustains only shared pitches drawn from real, already loaded recordings; no synthesized bridge or incompatible chord is inserted. The status shows the current musical section.

## Composition systems

8bars offers five composition modes. **Original** preserves the existing eight-bar rule engine. The four new independently implemented systems are **Pattern** (fixed groove families, bass hooks, rhythmic repetition), **Melodic** (two-bar question-and-answer phrases and controlled melodic motion), **Ambient** (sustained harmonic textures, sparse notes and deliberate silence), and **Process** (phase-shifting Euclidean pulses, melodic random walks and gradual change). These systems generate their own symbolic note events rather than filtering or simply re-voicing the original song.

The regular editor exposes the Composition selector; the choice survives share URLs and JSON/MIDI/WAV outputs. Human Radio selects among the four new systems according to scene, retains a composition method across linked sections, scores novelty, and avoids imposing a carried drum groove when a new ambient passage begins. All methods play exclusively with the existing genuine recorded instrument samples.

## Experimental engine: Musical ecology

**Ecology** is a sixth composition choice in the editor and a possible Human Radio scene engine. This experiment is distinct from the existing pattern, melodic, ambient and phase-process systems. It does **not** claim the underlying mathematics is new or that musical quality has been established by testing.

- **Harmonic network:** Every major/minor triad is one of 24 vertices in a Tonnetz-derived graph. Parallel (P), leading-tone (L), and relative (R) moves usually keep two chord tones. An eight-bar walk is pulled away from and back towards its home triad, with resolution at the final bar. The approach is inspired by mathematical chord geometry and neo-Riemannian transformations.
- **Predictive tension:** The relative frequency of each transformation is remembered and gives it an information-content estimate `-log2((count+1)/(total+3))`. Harmonic choice balances a time-varying surprise target, distance from home, and smooth movement. This is a tiny hand-built expectancy heuristic, **not** a reimplementation of IDyOM or a learned model of human preferences.
- **Inherited motif:** A six-degree melodic contour, attack pattern and coupled Euclidean pulse phases are retained as a musical 'genome'. New chapters change one contour step, optionally nudge the rhythm phase, and adapt pitches to each newly reached chord. Other composition engines can play between Ecology chapters without erasing the inherited material.
- **Linked layers:** Melody, countermelody, bass, arpeggio and parts of the percussion all derive their rhythms or notes from that common motif and Tonnetz path. Eight-bar sections retain chapter identity, can develop and then reprise it, and keep the same real-sample-only audio playback.
- **Verification:** `tests/music-ecology.test.mjs` checks all 24 triads, reversibility and shared-tone transforms, graph reachability, modulation-safe motifs, deterministic songs, rhythmic bounds and section return. These objective checks do **not** substitute for listening evaluation.

Research grounding:

1. Dmitri Tymoczko, *The geometry of musical chords*, *Science* (2006), https://doi.org/10.1126/science.1126287
2. Neo-Riemannian P/L/R transformations, [Open Music Theory](https://pressbooks.nebraska.edu/openmusictheory/chapter/neo-riemannian-triadic-progressions/)
3. Marcus T. Pearce and Geraint A. Wiggins, *Auditory Expectation: The Information Dynamics of Music Perception and Cognition*, *Topics in Cognitive Science* (2012), https://doi.org/10.1111/j.1756-8765.2012.01214.x
4. Darrell Conklin and Ian H. Witten, *Multiple viewpoint systems for music prediction*, *Journal of New Music Research* (1995), https://doi.org/10.1080/09298219508570672
5. Benjamin P. Gold et al., *Predictability and Uncertainty in the Pleasure of Music*, *J. Neuroscience* (2019), https://doi.org/10.1523/JNEUROSCI.0428-19.2019

**Next research question:** Does inherited harmonic/rhythmic identity, guided by a surprise budget, create more compelling long-form music than independent composition? The experiment is answerable with blinded listening comparisons and repeated sessions; no empirical preference result is asserted yet.

## Sample bank and playback

Current built-in samples are **all mirrored at build time** into the site's own compressed MP3 assets, using pinned upstream recordings. The Pages build creates sample-map.js and sample-mirror-report.json, and fails if any declared recording cannot be mirrored. The last verified deployment before this engine update contained 2,605 distinct recorded samples; use the latest build report for the current count. Browsers download only the selected song's required sounds, not the full library.

Playback waits until selected recordings finish loading, refusing to start a partially silent song. WAV export also rejects missing samples. Download failures can be retried with Play. Imported personal samples remain in browser IndexedDB, subject to 25 MB per file and a 150 MB local-library budget; shared URLs do not contain imported audio. No oscillator-generated replacement instruments are used.

### Audio sources and licences

- [Michael Fischer TR-808 / TidalCycles](https://github.com/tidalcycles/sounds-tr808-fischer) — CC0.
- [Octal house-core](https://github.com/octalmusic/octal-samples) — CC0.
- [Meta Open Sound](https://github.com/facebookincubator/Meta-open-sound) — CC0.
- [tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments) — CC BY 3.0, edited distribution by Nicholaus Brosowsky; see its [sample source attribution](https://github.com/nbrosowsky/tonejs-instruments/blob/master/sample-source-info.txt).
- [Versilian Community Sample Library](https://github.com/sgossner/VCSL) — CC0, pinned at c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e.
- [Vocobox Human Voice Dataset](https://github.com/vocobox/human-voice-dataset) — MIT; vocalist Martin, pinned at 77248fc69fd93c40a69d49c0cade4144c5d7a9f4. Sung notes use genuine source pitch labels; some vowel samples are recorded at one pitch and must be transposed.

Sound files and credits are defined in sounds.js, extra-samples.js, pitched-vocals.js, instrument-maps.js and vcsl-samples.js. Earlier poor-sounding wind presets and unpitched vocal chops are intentionally withdrawn. User-imported recordings have individual licensing and source metadata; eligible Commons sources include CC0, public domain and CC BY.

## Composer and versioning

The composition engine is a pure function in composer.js with theory helpers in theory.js. The **composition engine version and package version are 0.5.3**. A version change can alter output for older saved seeds; shared URLs preserve controls but do not bundle old composer code. Query versions on JavaScript and CSS links are **cache-revision identifiers**, not different music-engine versions.

The eight-bar loop is 128 sixteenth-note steps. Generated event durations are bounded to the remaining loop length, including ambient pads. The melodic scorer penalises the natural minor seventh over the major dominant chord in minor mode. Those are deliberate changes from the previous engine version.

For the research and reasoning behind the composer, see [composition research](docs/composition-research.md).

## Development and deployment

Run `npm test` in Node.js 22+ and serve the directory over HTTP (for example `python -m http.server 8000`). The [GitHub Pages workflow](.github/workflows/pages.yml) checks tests and JavaScript syntax, creates the favicon and Apple touch icon, mirrors all licensed audio, and deploys from main only after successful checks.

Future work includes audible and browser QA, a pattern editor, editable arrangements, stems, improved dynamics, hi-hat choke behaviour and more musical voice-leading tests.

**Guiding question:** *How far can the golden ratio govern musical form while the result still sounds deliberately composed?*

## Human Radio

[Human Radio](humanradio.html) is an endless, full-screen stream built from the real eight-bar composer. Each composition repeats two or three times while the next is generated and its required real recordings are preloaded. The drum groove evolves: selected kick, snare or hi-hat patterns and drum sounds persist across adjacent pieces, while other drums and pitched parts change. A new groove is possible at every piece boundary. Every two to four pieces, the harmony may modulate to a related key and the tempo may move slightly, with a shared rhythmic anchor on larger transitions. Piece boundaries receive a short audio-bus crossfade. If audio cannot be preloaded, the current piece continues repeating rather than going silent. Browsers require a listener click to start audio.
