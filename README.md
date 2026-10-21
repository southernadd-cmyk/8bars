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
