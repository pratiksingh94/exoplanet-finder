# Exoplanet Finder

Find a periodic transit signal in a star (possible exoplanet) :3 

Enter id like `KIC 8191672` and the app gets the Kepler light curve data from MAST, detrends it, runs a Box Least Squares search, and shows the folded transit with an estimated planet radius.

## How it works

```
-> POST /api/search { star, mission, periodMin, periodMax }
    -> pipeline/ingest.py    (lightkurve: download + stitch + normalize)
    -> pipeline/detrend.py   (5-sigma cut + rolling-median window 50)
    -> pipeline/analysis.py  (custom vectorized BLS + alias + duration refine)
  <- AnalysisResult JSON
-> yo browser
```

### Pipeline stages

1. **Ingest (`pipeline/ingest.py`)**: `lightkurve.search_lightcurve(star, mission, author)`, saves `time`, `flux`, `meta {RADIUS, TEFF, LOGG}`.
2. **Detrend (`pipeline/detrend.py`)**: removes `|z| > 5` outliers, divides by rolling median (`window=50`). Keeps both the cleaned series (for search) and the outlier-inclusive detrended series (for depth/fold display).
3. **Analysis (`pipeline/analysis.py`)**: custom NumPy BLS T_T:
   - two-pass period grid (coarse 2000 + fine zoom around best),
   - alias check (`P/n`, `P*2`, `P*3`),
   - duration grid `0.01-0.08` in phase (30 steps),
   - score `depth * sqrt(n_in)`, SNR `depth / (noise / sqrt(n_in))`,
   - coverage ratio (unique transit cycles / expected cycles),
   - confidence: `weak` if `n_expected < 5` or `coverage < 0.3`, else `strong` (SNR >= 7), `moderate` (SNR >= 4), else `weak`,
   - radius `sqrt(depth) * R_star * 109.2 = R_earth`, 500-bin folded curve (for display in chartt too).


## Run locally

```bash
pnpm install
# python env for the pipeline (any venv path works locally, the API defaults to pipeline/venv/bin/python or $PYTHON_BIN)
python3 -m venv pipeline/venv
pipeline/venv/bin/pip install -r pipeline/requirements.txt
pnpm dev   # http://localhost:3000
```

## Not yet supported / roadmap

- **TESS**: disabled in the UI. TESS light curves need different systematics treatment (shorter baseline, scattered light, CBV/biweight detrending via e.g. `wotan`). Current rolling-median `window=50` was tuned for Kepler
- **K2**: disabled in the UI. K2 has ~6h thruster-firing stuff the current detrending cannot remove, producing fake periods
- **Single-planet only**: reports the single strongest periodic signal. Multi-planet requires iterative masking + re-search, too lazy rn
- **No vetting yet**: no odd-even depth test, secondary-eclipse veto, or false-alarm probability. Eclipsing binaries and stellar rotation can mimic planets at `weak/moderate` confidence, again thats for future
