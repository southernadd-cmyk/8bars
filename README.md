# 8bars

Deterministic eight-bar rule-based music composition with 12 channels. [Open the live site](https://southernadd-cmyk.github.io/8bars/).

## Current features

- Six percussion tracks (kick, snare, clap, closed hat, open hat, auxiliary percussion) and six pitched tracks (bass, chords, arpeggio, lead, countermelody, pad).
- **Genre → Subgenre** controls in the generator: Pop (Bright, Indie), Hip-hop (Boom-bap, Head-nod, Lo-fi, West Coast, Trap), Drum & Bass (Roller, Liquid, Jungle, Techstep, Jump-up) and Electronic (Downtempo, House, Breakbeat, Ambient). Twelve keys, major/minor, tempo, density, swing and independent channel regeneration remain available.
- Five functional cadence types, inversion-aware chord voicing, Euclidean rhythm, motif transformations, contramotion and a sixth-bar golden-section turn.
- Euclidean rotation is normalised. Bass events stay in MIDI register 28–52. Notes cannot extend beyond step 128. On minor dominant chords, the melody avoids the natural seventh against the raised leading tone.
- The **New song** button changes the seed and sound choices; each channel's ↻ regenerates only that channel. Mute, solo, level and instrument selection are per channel.
- Grouped, real-recording sample selection; moderate RMS/peak-aware level matching; recorded pitched singing instruments, and no unpitched vocal-chop presets.
- Browser-only imported audio from files or eligible Wikimedia Commons recordings, exported MIDI/WAV/JSON and shareable settings URLs.
- The Harmony strip is now editable: choose a major, minor or diminished chord per bar. Each change rebuilds the six pitched tracks against the selected progression without changing drums. Reset chords returns to automatic harmony; selections persist in a share link and all composition exports. New song or a key/mode change starts fresh harmony.

## Human Radio: track titles and electronic DnB samples

Human Radio displays **only a generated track title** for each new composition, made from **1–3 title-cased English words**. There are no fictional artist credits. The 800+ word local dictionary is `radio-words.txt`, a filtered/curated subset of the [1000 common English words list](https://github.com/powerlanguage/word-lists/blob/master/1000-most-common-words.txt), supplemented with creative nouns. The title generator in `radio-names.js` is deterministic for the song seed, excludes duplicate words within a title, and changes only when the composition changes. The technical key/BPM/engine and current song section line have been removed from Human Radio's visual display.

The Drum & Bass station now uses **five purpose-built pre-rendered synthesizer samples (MIT)** (rather than acoustic/electric bass only), registered as sampled instruments in `electronic-bass.js`: Reese, wobble, FM growl, clean sub and 808 bass. The Reese/wobble/FM recordings are rooted at C2 (MIDI 36), and the sub/808 at C1 (MIDI 24), matching their upstream pitch metadata. The main DnB bass pool uses Reese, wobble and FM growl (root C2); the C1 808 remains in the catalogue but is not used as a main bass because high transpositions would make its tail unnaturally short. Low notes are reinforced by a quieter pre-rendered sub at the same pitch class, one octave down when this stays at or above MIDI 28. These WAV files are mirrored to the Pages build as MP3 files with the other pinned recordings. Human Radio uses ordinary audio-buffer playback and Web Audio filtering, **not live oscillator synthesis**.

**Source and redistribution:** [Martin Pfeffer — sound-effects](https://github.com/pepperonas/sound-effects/tree/3067d2d1e242e60571386cec87e0183dab6e9c9e/output/music/bass), released under the MIT License; copyright (c) 2026 Martin Pfeffer. Full licence is retained in `ELECTRONIC-BASS-LICENSE.txt` and distributed with the site. These are professionally useful *pre-rendered synthesizer samples*, not acoustic field recordings. The source project produced them using synthesis, which is appropriate to Reese/sub-bass timbres. Source files and their recorded MIDI root pitches are pinned and attributed in the catalogue.

## Drum & Bass acoustic breaks and original visuals

The fast break retains the established kick/snare step pattern but **DNB kick, snare, ghost snare, closed hat and open hat now use distinct acoustic drum-kit strikes** from [Virtuosity Drums](https://github.com/sfzinstruments/virtuosity_drums), performed by drummer Austin McMahon (Versilian Studios / Karoryfer Samples), CC0. Pinned compact AAC-LC delivery is distributed by [Keyboardia](https://github.com/adewale/keyboardia/tree/869d3f5095084003e1251aa3ebf2eab8f65f62fe/app/public/instruments), also documenting the original CC0 source. `dnb-break-kit.js` now includes **60 distinct acoustic recordings** (16 kicks, 12 main snares, four soft snare ghosts, 16 closed hats and 12 open hats). It selects genuine source-labelled velocity layers (MIDI 0–31, 32–63, 64–95 and 96–127), rather than simply reducing the volume of a hard snare. It retains louder main backbeats and quiet ghost-specific recordings. Variation depends on the full seed and the actual note onset, rather than the seed length or half-bar index; consecutive ghost hits at steps 3/7 and 11/15 alternate between available takes. The browser never plays AAC directly: the build downloads the pinned `.m4a` sources, converts them with ffmpeg to **44.1 kHz, 96 kbps MP3**, and maps their original URLs to same-origin MP3 files. This avoids relying on AAC browser decoder support. The official [Versilian Studios Virtuosity Drums release](https://versilian-studios.com/virtuosity-drums/) and the [original CC0 licence](https://github.com/sfzinstruments/virtuosity_drums/blob/9f04cf9a734527edfbb0a4eee1f674e45bbf71bc/LICENSE) establish provenance independently of Keyboardia's attribution. The website distributes `DNB-BREAK-CREDITS.txt` with those links. Liquid DnB lead voices now use instrument-sensitive melodic registers: cello parts stay between MIDI 55–74 near the cello's highest recorded C5, while violin and other leads keep their higher melodic range. The original drum sample choices remain for Pop and Mixed; Hip-hop now has its own recorded specialty kits.

The old **Rick and Morty GIF** and its external fallback are not used. `radio-visual.js` instead renders an original full-screen dimensional landscape: an oversized, layered, liquid-light vortex, translucent nebula, stars, moving filaments, deep foreground silhouettes and musical glimmers. The music analyser and scheduled notes gently shape the atmosphere rather than producing a conventional ring equaliser. Pausing or hiding the tab stops animation; reduced-motion preferences freeze the scene's spatial movement and suppress moving glimmers. There is no external imagery, copyrighted footage, CDN dependency or extra sound synthesis.

**Dynamics and performance refinement:** Acoustic DnB kit takes now retain their own recorded relative loudness (with peak-only attenuation for excessive sample peaks), rather than receiving RMS makeup gain. If a velocity zone is missing, the nearest labelled take is used; if an entire role has no samples, Human Radio falls back to the ordinary recorded kit instead of throwing. DnB hi-hats gain occasional stronger offbeat accents that select the MIDI 64–95 source tier; other hats and breakdowns remain restrained. On narrow screens the original animated visual uses fewer stars, contour points, arms and folds while preserving the same scene and a capped device pixel ratio.

## Musical diversity: generator and Human Radio

The genre arrangers no longer select their hooks from a few canned note sequences. Each song seed produces its own melodic contour, rhythm, register, controlled passing notes, bass figures and functional chord substitutions; recurring sections retain the same hook within that song. The generator also varies Pop/Hip-hop song fullness between verses/answers and choruses, rather than always starting at peak density. **New song** changes key by default and selects a genre-appropriate mode, unless the listener explicitly set those controls. The user's settings, selected instruments and per-track regeneration remain supported. The regression test `tests/generator-genres.test.mjs` examines 36 seeded songs **per Pop, Hip-hop and Drum & Bass subgenre** for distinct lead phrases, attack rhythms, bass, harmonic paths and percussion; passing numerical tests does not replace critical listening.

## Human Radio: distinct genre scenes and sound libraries

Pop keeps its previous drum catalogue and hook-led arrangement. Drum & Bass and Hip-hop now have more than one rhythmic identity, with repeatable chapter-level hooks rather than a single fixed pattern for an entire station.

- **Pop:** a four-chord diatonic progression repeats across all eight bars and recurs through the song's verses and choruses. The same seeded hook (melody and attack rhythm) returns in the lift, reprise, and final section; verse answers transform it. Bass follows the progression, with fewer attacks in the verse and a fuller groove, chord accompaniment, and backing parts in the chorus.
- **Drum & Bass:** five scenes: **roller** (familiar two-step), **liquid** (melodic space), **jungle** (syncopated breaks and ghosts), **techstep** (sparser, darker and partly electronic kit) and **jump-up** (busier kicks and energetic fills). Recorded acoustic break hits, alternating velocity-layer performances and selected recorded electronic one-shots give those styles different percussion timbres. Reese, wobble, FM and sub recordings remain the bass backbone. Songs move through intros, breakdowns and drops.
- Existing real recorded samples are the only audio sources; no oscillator substitutions are introduced. The same genre harmonic cycle persists across a full multi-section chapter.
- The regression suite checks Pop's recurring melody, harmony, verse/chorus contrast, DnB's exact kick/snare placement, sparse halftime bass and each genre's deterministic event safety. Listening assessment is still required.

## Human Radio channels and genuine compositional variety

Choose **Mixed**, **Hip-hop**, **Drum & Bass** or **Pop** from the Human Radio channel dropdown (also available before the first play). The channel can be bookmarked via `?channel=hiphop`, `?channel=dnb` or `?channel=pop`. Switching while listening preloads the new station and transitions at an eight-bar boundary; it does not splice tracks midway through a bar.

- **Hip-hop:** five scenes: **boom-bap**, **head-nod**, **lo-fi**, **West Coast bounce**, and **trap**, with separate drum sequences, backbeat placement, instrument palettes, repeating chord cycles and bass/melody phrases. Trap uses half-time snare on beat three and a pre-rendered 808 bass instrument; other styles use more natural swung backbeats. The three source-verified CC0 kits are vintage, bounce and trap; Pop does not use them.
- **Drum & Bass:** approximately 164–178 BPM across its scenes, with different breakbeat families, fills and sampled drum-kit combinations.
- **Pop:** 94–125 BPM, clear backbeats, variable four-on-the-floor motifs, hook-led composition and section development.
- **Mixed:** retains the existing evolving radio with all musical scenes. All stations use genuine recorded samples only.

**Hip-hop source and build:** Specialist one-shots come from [Boochi44's CC0 hip-hop drum library](https://github.com/Boochi44/free-drum-samples/tree/77ba31428a079dd8f17c8e144c1e649ea0a198b3), pinned to an exact upstream revision. All 24 used source WAV paths were individually verified and the Pages build mirrors them as local MP3 alongside the existing acoustic and pitched samples. These are processed drum-machine one-shots, not falsely described as acoustic performances; they are appropriate to the respective genres. See `hiphop-drum-kit.js` for each source and its CC0 metadata.

**Variation fix:** the Melodic composition engine previously reused a single hard-coded outline and four-note rhythmic pattern. It now generates a seeded musical phrase (4–7 degrees and variable attack placements), develops answers and variations, and shapes cadence over eight bars. Pattern hooks are seeded rather than picked from just four fixed options. All non-classic engines now generate seed-dependent chord attack rhythms and independently voiced accompaniment. Chord-only variation and lead-only variation remain separate. The multi-seed tests check both melodic and harmonic diversity across every independent engine; passing these tests does not alone establish whether the results sound musical.

## Human Radio

Human Radio now evolves through four musical scenes covering ambient, downtempo, breakbeat and house. It varies tempo, density and swing in coherent ranges and compares five prospective arrangements against the preceding eight pieces before preloading the best candidate. A song develops over its repeated loops through instrument entrances, fullness and short breakdowns. Musical transitions use bar-length crossfades and carry a brief pad bridge; some drum motifs and instruments are retained across related-key changes.

Playback resumes at the actual paused musical position. Scheduler events are indexed by step and decoded recordings are pruned from the cache as the session progresses. No generated-oscillator audio is used.

### Human Radio: connected forms (Release 2)

Each station chapter is now **five to seven related eight-bar sections** (40–56 bars) with an opening, statement, melodic answer, lift, optional breakdown and reprise, and final return. The composer varies lead/countermelody/arp and selected percussion between sections while retaining the chapter’s tonal centre, instrument palette and recurring phrase. A few middle-section chord substitutions use triads taken from the chapter’s existing harmony; the last section returns to its original chord sequence.

Preload the *next* section's actual recordings while the current one plays; if they are not ready, keep playing the current section instead of starting silent notes. Chord-aware candidate ranking balances novelty with smooth harmonic movement. At a chapter boundary, a gentle crossfade sustains only shared pitches drawn from real, already loaded recordings; no synthesized bridge or incompatible chord is inserted. The status shows the current musical section.

## Composition systems

8bars offers five composition modes. **Original** preserves the existing eight-bar rule engine. The four new independently implemented systems are **Pattern** (fixed groove families, bass hooks, rhythmic repetition), **Melodic** (two-bar question-and-answer phrases and controlled melodic motion), **Ambient** (sustained harmonic textures, sparse notes and deliberate silence), and **Process** (phase-shifting Euclidean pulses, melodic random walks and gradual change). These systems generate their own symbolic note events rather than filtering or simply re-voicing the original song.

The regular editor now exposes **Genre** and **Subgenre**, rather than Composition and Style. Each subgenre chooses musical methods, tempo and characteristic recorded instruments, along with genre-specific harmony and drum patterns. An automatic kit uses the pinned acoustic Drum & Bass breaks or specialised CC0 hip-hop samples where appropriate; users can still choose any individual recording, adjust settings and regenerate individual tracks. These choices survive share links and exports. Technical `engine` and `style` URL parameters remain readable so old saved links work. The original composition engines remain inside the generator rather than being removed. Human Radio also continues selecting these systems by scene, retaining a method across linked sections and scoring musical novelty. All methods play exclusively recorded samples.

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
