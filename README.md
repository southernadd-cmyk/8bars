# 8bars

A browser-based **symbolic AI** that composes reproducible eight-bar music from a seed. It plans rhythmic, melodic and harmonic material using explicit musical rules, then plays the result with CC0 samples.

**Project site (once GitHub Pages is enabled):** https://southernadd-cmyk.github.io/8bars/

## Rulebook v0.1

1. **Form:** eight measures of 4/4; structural subdivision 5 + 3. Sections 1–3 are the statement, 4–5 are the answer, 6–7 the golden-section development, and 8 the return.
2. **Golden turn:** at the beginning of bar 6 (step 80 of 128), change the melody's register. This is the closest whole-bar boundary to 61.8% of the total duration (79.1 sixteenth-note steps).
3. **Rhythm:** distribute optional kick and hi-hat onsets over a sixteen-step grid using the Euclidean algorithm; retain familiar kick and snare anchors.
4. **Harmony:** an eight-bar minor or major progression defines bass roots and the underlying tonal centre. This is currently a fixed template, to be replaced with candidate progression selection and evaluation.
5. **Motif:** generate a small motif, repeat it, and apply systematic transformations at phrase boundaries. The final bar returns to the opening.
6. **Instrument relationship:** bass roots follow the harmonic plan. Melodic notes use the selected scale and are shaped by phrase role. Strong-beat chord-tone validation and kick/bass interaction scoring are planned, not yet implemented.
7. **Determinism:** versioned seed streams control independent subsystems. Identical engine version, seed, controls and sample files yield identical event data.

## Sound sources (all CC0)

- **TR-808:** the Michael Fischer recordings in [tidalcycles/sounds-tr808-fischer](https://github.com/tidalcycles/sounds-tr808-fischer), used for kick, snare and closed hi-hat.
- **Meta Piano:** [facebookincubator/Meta-open-sound](https://github.com/facebookincubator/Meta-open-sound), used for a C3 bass-register sample and C4 melody-register sample, pitch-shifted to the written notes.

Both sources specify CC0 1.0. Sample URLs are pinned to upstream commit identifiers in app.js. Audio is fetched directly by the browser; if it cannot be fetched or decoded, the player uses an audible synthesis fallback and reports the number of successful sample loads. This is an explicit **first prototype**, not yet a production-grade sample bank. Later we should vendor and hash selected assets to avoid a runtime network dependency, improve timbre and ensure byte-for-byte archival reproduction.

## Running

This is a static site. Serve the repository directory with any static HTTP server (for example python -m http.server 8000) and visit localhost:8000. The page imports an ES module, so opening index.html directly as file:// is not supported in all browsers.

GitHub Pages is configured to deploy with **GitHub Actions**. The workflow `.github/workflows/pages.yml` runs `npm test`, packages the static files, and deploys to the `github-pages` environment on every push to `main` (or manually via `workflow_dispatch`). In Settings → Pages, select **GitHub Actions** as the publishing source.

## Development checks

Run \`npm test\` (Node 20+); no external dependencies.

## Current scope / next work

- Working eight-bar note-event generation and playback; click Play to unlock browser audio.
- Adjustable tempo, seed, note density, key and major/minor mode.
- Track mute, JSON composition export, and a permalink encoding settings.
- Does **not** yet support WAV/MIDI export, rendering offline, editing notes, instrument selection, full harmonic search/backtracking, or sample provenance hashes.
- The sound of browser playback can vary slightly by device. **Compositional determinism** covers the notes and scheduling data; bit-identical rendered WAV exports require a fixed offline render pipeline.

## Guiding question

*How far can the golden ratio govern musical form while the result still sounds deliberately composed?*
