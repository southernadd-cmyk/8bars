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
- Live sample playback using **278 curated recordings**, plus on-demand Creative Commons audio discovery, with 29 pitched-instrument presets (including real electric bass, strings, brass, winds, organs and guitars), with synthesis fallback reported when samples are unavailable.
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
- **Search results are not part of the bundled 278 sample bank**, and no claim is made about the number of live results or their ongoing availability.

For a larger catalogue, the next provider is **Freesound**. Its API requires credentials and has terms for commercial applications, so integration must not expose secret API keys in GitHub Pages. See [Freesound API](https://freesound.org/docs/api/).

## Sound bank

Sound sources are declared in [sounds.js](sounds.js). File URLs point to immutable Git commit revisions:

- **Fischer TR-808 sample collection, CC0** — [TidalCycles repository](https://github.com/tidalcycles/sounds-tr808-fischer): 15 kicks, snares, clap/rim, closed/open hats, toms and cowbell variants in the manifest.
- **Octal house-core, CC0 1.0** — [project, sound provenance and license](https://github.com/octalmusic/octal-samples): additional house kicks, snares, claps, closed/open hats, shaker, tom, crash, ride and percussion hits. Manifest pinned to commit 22d222ce36e290ba3792c776811aa9c69dcc8776.
- **Meta Open Sound, CC0 1.0** — [Meta repository](https://github.com/facebookincubator/Meta-open-sound): multi-sampled upright piano, nylon guitar and steel guitar. Each selection is verified against its published manifest.

**tonejs-instruments, CC BY 3.0** — [source and attribution](https://github.com/nbrosowsky/tonejs-instruments/blob/master/sample-source-info.txt): 20 sampled instruments including electric bass, contrabass, electric guitar, cello, violin, harp, organ, brass, winds and xylophone. Audio is offered under [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/). Credit: the original performers and creators identified in the upstream source inventory (Karoryfer, Versilian Studios / VSCO2, University of Iowa and Freesound contributors), and Nicholaus Brosowsky for the edited distribution. The source URLs are pinned to commit 622c2f1c32c8cfce4158ddc3eb26e518ddef37e5.

The catalogue contains **29 pitched-instrument presets**, plus alternate TR-808 and house-kit drum hits. Several acoustic presets are velocity-layer variations of the same instrument, rather than different physical instruments. Some recordings can be selected from more than one channel. Browsers fetch only the files required by the current mixer configuration. Sample downloads can fail due to network restrictions, in which case a simple generated fallback tone is used and a warning is shown. The fallback is explicitly **not** a CC0 recording.

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
