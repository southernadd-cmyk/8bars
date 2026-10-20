# 8bars

**8bars** is an eight-bar rule-based music composer. It uses symbolic musical rules, seeded randomness, Euclidean rhythms, and the golden ratio to produce repeatable arrangements with **twelve channels**.

**Live site:** https://southernadd-cmyk.github.io/8bars/

## What's in v0.2

- **Six percussion channels:** kick, snare, clap, closed hat, open hat, and auxiliary percussion.
- **Six pitched channels:** bass, chords, arpeggio, lead, countermelody and pad. Imported audio can be used on any channel, regardless of its original assignment.
- **Four composition styles:** downtempo, house, breakbeat and ambient.
- **Twelve keys**, major and minor mode, tempo, density and swing.
- Individual channel **mute, solo, level, instrument selection**, and **↻ regenerate this channel**.
- Live sample playback using a curated bank of **over 200 distinct recorded sound files**, with 29 pitched-instrument presets (including real electric bass, strings, brass, winds, organs and guitars), with synthesis fallback reported when samples are unavailable.
- Export a multitrack **Standard MIDI File**, **stereo WAV** and structured **JSON**.
- Shareable URL preserves seed, settings, voice/kit selections, volume, mute/solo and per-channel variations.
- No browser installs: static HTML/CSS/JavaScript and Web Audio API.

## The rulebook

1. **Golden form:** Eight bars are organised as 5 + 3, with 1–3 (statement), 4–5 (answer), 6–7 (golden turn), and 8 (return).
2. **Golden turn:** A major change in melodic register begins at bar 6, close to the golden-section timestamp.
3. **Euclidean groove:** Kick, hat, arp and percussion incorporate evenly distributed attacks, while anchor beats preserve a recognisable pulse.
4. **Harmonic first:** Select a functional four-chord palette, then build an eight-bar progression. Minor-key dominants borrow the raised seventh from harmonic minor.
5. **Motif inheritance:** The lead builds a five-note motif and alters its contour at phrase boundaries, with important notes drawn to chord tones.
6. **Coordinated instruments:** Bass, chords, arpeggio, countermelody and pad derive pitch material from the shared harmonic plan. Their rhythmic jobs differ to reduce doubling.
7. **Deterministic channels:** Each channel has a dedicated seeded stream; regenerating one part increments its own variation number without affecting the others.
8. **Reproducibility:** An identical engine version, seed, musical settings and source sample files results in the same composition events. Browser output can vary by audio device and sample-decoder implementation.

These are explicit *symbolic AI* rules. We do not use an LLM to invent musical notes. The current engine is a rule-driven planner; it does not yet use a full search/backtracking optimiser or score candidate compositions.

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

Run \`npm test\` using Node 20+ to check composition integrity, deterministic channels, multiple genres, key coverage and sample catalogue.

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
