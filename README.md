# 8bars

**8bars** is an eight-bar rule-based music composer. It uses symbolic musical rules, seeded randomness, Euclidean rhythms, and the golden ratio to produce repeatable arrangements with **twelve channels**.

**Live site:** https://southernadd-cmyk.github.io/8bars/

## What's in v0.5

- **Theory-aware composition:** functional cadences, leading-tone resolution, chord-tone emphasis on accented melody notes, stepwise recovery after leaps, and independently moving countermelodies.
- **Six percussion channels:** kick, snare, clap, closed hat, open hat, and auxiliary percussion.
- **Six pitched channels:** bass, chords, arpeggio, lead, countermelody and pad. Imported audio can be used on any channel, regardless of its original assignment.
- **Four composition styles:** downtempo, house, breakbeat and ambient.
- **Twelve keys**, major and minor mode, tempo, density and swing.
- Individual channel **mute, solo, level, instrument selection**, and **↻ regenerate this channel**.
- Live sample playback with **more than 2,000 declared source recordings**, plus on-demand Creative Commons audio discovery, with more than 70 pitched-instrument and articulation choices (including real electric bass, strings, brass, organs and guitars), with unavailable recordings left silent rather than synthesised imitation.
- Export a multitrack **Standard MIDI File**, **stereo WAV** and structured **JSON**.
- Shareable URL preserves seed, settings, voice/kit selections, volume, mute/solo and per-channel variations.
- No browser installs: static HTML/CSS/JavaScript and Web Audio API.

## The rulebook (v0.5)

1. **Functional harmony:** Choose one of twelve progressions per mode and one of seven harmonic rhythms. The same four-chord path can move through eight bars differently, with optional extensions and minor-key dominant alterations.
2. **Voice leading:** Chord comping selects inversions that tend to minimise motion between neighbouring voiced chords, rather than always playing root-position triads.
3. **Rhythmic identity:** Each song picks a style-appropriate groove family. Kick, snare, hats and percussion have their own rhythmic transformations, Euclidean rotations and fills.
4. **Bass conversations:** Bass chooses one rhythmic figure and a contrasting response for the second half. Pitches follow chord roots, fifths, octaves and occasionally the next harmonic root.
5. **Theory-aware melodic motion:** Scale and chord membership, strong-beat resolution, and leap-recovery scoring guide the melody without eliminating syncopation or passing notes.
6. **Cadence plans:** Five ending types—authentic (V–I), plagal (IV–I), deceptive (V–VI), half (ii–V), and modal (VII–I)—control the final two harmonies and the melodic finish. Minor V chords raise the leading tone.
7. **Counterpoint:** Counternotes use consonance and contrary movement relative to the harmonic guide, while remaining independent of lead-only regeneration.
8. **Motif development:** Lead melodies choose a contour and phrase rhythm, then develop those by transposition, reversal, inversion and cadence. The sixth-bar golden turn can have different treatments rather than an automatic octave leap.
9. **Five form shapes:** Crescendo, call-and-response, waves, breakdown and suspension influence event density and when supporting instruments enter; bar six remains the golden-section turn.
10. **Coordinated instruments:** Bass, chords, arpeggio, countermelody and pad all use the shared harmonic map rather than unrelated pitch choices.
11. **Deterministic regeneration:** A given engine version, seed and musical settings reproduces the event sequence. Each track uses an independent seeded stream; regenerating one track must not change another. Full Regenerate changes seed and instrument choices.

These are explicit, rule-driven decisions rather than an LLM or a trained music generation model. [Composition research and remaining work](docs/composition-research.md) describes relevant open-source approaches and next steps.



## Searchable Creative Commons catalogue

The Sound Library now supports live search and preview of freely reusable **Wikimedia Commons audio**. Results carry licence and creator metadata. Importing a result saves the recording locally in IndexedDB for use on any mixer channel, without uploading it to 8bars. Source and attribution are retained in the library and in arrangement JSON exports.

- The search is paginated; browsing does not preload recordings.
- CC0, public-domain and CC BY audio are eligible. NC, ND, SA and ambiguous licences are intentionally excluded from automatic import pending appropriate usage guidance.
- Files above 25 MB can be viewed at their source but are not imported (local library remains capped at 150 MB).
- A source file may be unavailable, blocked by CORS, or not decode in every browser; import reports the error instead of storing a broken sample.
- **Search results are not part of the built-in sample bank**, and no claim is made about the number of live results or their ongoing availability.

For a larger catalogue, the next provider is **Freesound**. Its API requires credentials and has terms for commercial applications, so integration must not expose secret API keys in GitHub Pages. See [Freesound API](https://freesound.org/docs/api/).

## Sound bank

Sound sources are declared in [sounds.js](sounds.js). File URLs point to immutable Git commit revisions:

- **Fischer TR-808 sample collection, CC0** — [TidalCycles repository](https://github.com/tidalcycles/sounds-tr808-fischer): 15 kicks, snares, clap/rim, closed/open hats, toms and cowbell variants in the manifest.
- **Octal house-core, CC0 1.0** — [project, sound provenance and license](https://github.com/octalmusic/octal-samples): additional house kicks, snares, claps, closed/open hats, shaker, tom, crash, ride and percussion hits. Manifest pinned to commit 22d222ce36e290ba3792c776811aa9c69dcc8776.
- **Meta Open Sound, CC0 1.0** — [Meta repository](https://github.com/facebookincubator/Meta-open-sound): multi-sampled upright piano, nylon guitar and steel guitar. Each selection is verified against its published manifest.

**tonejs-instruments, CC BY 3.0** — [source and attribution](https://github.com/nbrosowsky/tonejs-instruments/blob/master/sample-source-info.txt): 20 sampled instruments including electric bass, contrabass, electric guitar, cello, violin, harp, organ, brass and xylophone. Audio is offered under [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/). Credit: the original performers and creators identified in the upstream source inventory (Karoryfer, Versilian Studios / VSCO2, University of Iowa and Freesound contributors), and Nicholaus Brosowsky for the edited distribution. The source URLs are pinned to commit 622c2f1c32c8cfce4158ddc3eb26e518ddef37e5.

The catalogue includes **51 additional playable acoustic instrument/articulation choices** and **1,342 individually recorded pitched notes**, plus **472 newly mapped acoustic percussion selections** from the [Versilian Community Sample Library](https://github.com/sgossner/VCSL) (CC0 1.0, pinned to source revision `c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e`). The catalogue's total exceeds 2,000 source-file references. Some acoustic hits may be offered on more than one drum channel; those are not separate files. The manifest is in [vcsl-samples.js](vcsl-samples.js), extracted from actual upstream GitHub files. No audio was synthesized to generate these additions. The original 25 pitched-instrument presets remain, along with alternate TR-808 and house-kit drum hits. Several acoustic presets are velocity-layer variations of the same instrument, rather than different physical instruments. Some recordings can be selected from more than one channel. Browsers fetch only the files required by the current mixer configuration. Sample downloads can fail due to network restrictions, in which case affected notes remain silent, and a warning is shown. WAV export reports missing sources instead of generating substitute sounds.

The next sound-library milestone is to commit the actual curated audio assets (with SHA-256 checksums) instead of runtime-loading them from GitHub, to improve reliability and reproducibility, plus more instruments and velocity layers.

## Run and develop

Any static HTTP server works, e.g. \`python -m http.server 8000\` and visit http://localhost:8000 . Opening the files directly with \`file://\` will not support module imports in every browser.

Run \`npm test\` using Node 20+ to check composition integrity, deterministic channels, multiple genres, key coverage, sample catalogue and cross-seed musical diversity.

GitHub Pages **deploys through GitHub Actions**. The [Pages workflow](.github/workflows/pages.yml) tests on every push to \`main\`, packages the static modules and publishes to the \`github-pages\` environment. PRs have separate test checks.

## Planned work

- True offline (bundled) CC0 sample library, hashes, more varied instruments and velocity layers.
- Pattern/note editor; per-channel locks and arrangement editing rather than only mutations.
- Harmonic voice-leading evaluation and search-based rule refinement.
- Choke groups for closed/open hi-hats, sidechain/dynamics, per-track pan and effects.
- Humanization that remains exactly reproducible, more genres, longer arrangements and stems.
- Browser playback and export QA across devices; MIDI/WAV comparisons.

### Guiding question

*How far can the golden ratio govern musical form while the result still sounds deliberately composed?*

### Authenticity and listening quality

The former bassoon, clarinet, flute and saxophone presets were withdrawn after listening feedback identified poor sound quality. Upstream lists them as sampled instruments, but 8bars' repitching and playback did not reproduce them satisfactorily. A missing or undecodable instrument recording is **never replaced with a synthesised imitation** during composition playback or WAV export. WAV export instead reports unavailable files. The former oscillator-based test tone and its interface were removed, leaving no synthesised audio-generation path in the app. Synthesised drum-machine *recordings* in the drum library remain intentionally available.

## Local playback sample mirror

The Pages build now downloads a **bounded, cached selection** of the existing pinned,
licensed recording catalogue and deploys those audio bytes under the site's own
`samples/` directory. The generated `sample-map.js` lists only files actually copied
into the deployment. Playback preferentially uses those same-origin URLs, with the
original pinned upstream URL retained for catalogue items not yet mirrored. User-imported
files stay in the browser's IndexedDB and are never uploaded.

The initial deployment budget is 180 MB for recorded source files, prioritising
default instrument patches, drum choices, and register coverage across the expanded
library. Full VCSL audio alone exceeds 1.7 GB, so claiming it is all mirrored would
be misleading. Each build caches successful recordings through GitHub Actions.
The build generates `sample-mirror-report.json` with actual file counts and failures;
it refuses to publish an almost-empty mirror.

**No synthesized replacement instruments** are created. Recordings retain their
source attribution and licenses in the original manifest. In a future change, the
rest of the catalogue can be mirrored in compressed formats after checking audible
quality, bandwidth and deployment size.

### Complete local-sample requirement

The mirror includes every declared licensed source recording, not a fixed-count subset. The build refuses to deploy if any declared file fails download, conversion, or inclusion. Playback waits until all samples needed for the current composition have finished loading, and explicitly refuses to start when a recording remains unavailable. Pressing Play retries transient failures instead of permanently marking that sample unavailable. No synthesised audio is substituted.

## Expanded recorded sounds and loudness

Instrument selectors group sources by instrument family and recording provider. Percussion selectors group source recordings without changing index values in shared links. Seven additional CC0 recorded patches from Versilian Community Sample Library add 286 pitch-labelled samples, including low strumstick and sampled FM keyboard sounds useful for bass and melody. Every built-in sound is mirrored to this site's static audio bank. A non-destructive peak-aware RMS sample-gain calculation moderates differences in recorded levels, respecting individual note velocity and mixer volume; WAV export uses the same adjustment. Vocal chops are being evaluated separately for suitable licensing and pitch behaviour.

## Local vocal chops (CC0)

A first bank of 23 short vocal edits from 14 individually recorded source files is included in the **Vocal chops** instrument group, selectable on lead, countermelody and pad tracks. Original source: [The Libre Sample Pack](https://github.com/TheSmallTeaBoi/the-libre-sample-pack), CC0, pinned to commit `23c02341707128162fc875e622f41b6af921fed3`. The build cuts each original WAV into short MP3 one-shots, caches and hosts those edits with the other local samples. Source file names are preserved in the manifest. These clips play at their original recorded speed rather than being falsely treated as pitched notes; the composition controls their rhythmic timing. This is a starter collection, not a finished VocalSet-derived melodic vocal library. The VocalSet archive is large and is not downloaded as part of the website build.

## Note-labelled sung vocals

The **Vocal melodies** instrument group adds 97 individually recorded mono WAV takes: 68 sung notes spanning 21 recorded pitches, plus 29 vowel recordings (Ah/Eh/Ee/Oh/Oo/U) recorded at C3. These are from [Vocobox Human Voice Dataset](https://github.com/vocobox/human-voice-dataset), pinned to revision `77248fc69fd93c40a69d49c0cade4144c5d7a9f4`, under the project's MIT licence; credit the dataset and singer Martin. The build hosts compressed audio locally; the app's `nearestSample` picks the nearest recorded root note and pitch-shifts only when necessary. Vowel takes were recorded at one root note, and large transpositions may sound less natural. These are human singing recordings, not synthetic voice generation and not yet the larger Northwestern VocalSet archive.

## Vocal sample policy

Unpitched vocal chops are withdrawn from the built-in catalogue and automatic instrument regeneration. The melodic roles now offer only note-labelled recorded vocal voices. Previous shared links referring to withdrawn chops fall back to their normal pitched instrument defaults. The removed chop source assets are no longer copied into the published sample mirror.

## Current icon and composition logic

The Pages build generates an actual multi-size favicon.ico and Apple touch icon from the SVG source. Composer revision 0.5.2 fixes Euclidean rotations and folds bass events into MIDI 28–52. The footer credits VCSL and the MIT-licensed Vocobox singing dataset.
