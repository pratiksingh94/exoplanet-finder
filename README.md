# Exoplanet finder

Find a periodic transit signal (possible exoplanet) in a star :3

Enter star id like `KIC 8191672` and it gets the Kepler light curve data from MAST, detrends and cleans it, runs a Box Least Squares search algo, and shows the folded transit with an estimated planet radius and some more specs.

*note to reviewer:*
> last readme was NOT written by AI gng, except the "how it works" part, still gonna rewrite it but not gonna put that much efforts now, i am mad pissed 😭

# Pipeline stages
1. Ingest: gets data using lightkurve library
2. Detrend: removes `|z| > 5` (sigma cutting) outliers, divides by rolling median (`50`)
3. Analysis: using a custom BLS:
  - two-pass peroid grid
  - alias check (cuz it can produce a multiple of the period)
  - score for aliases and SNR also for confidence
  - radius relative to earth
  - since weak ahhh browser cant load 60k+ data points, binned it to 500 for loading on chart

# Run locally 
```sh
pnpm install
python -m venv pipeline/venv
pipeline/venv/bin/pip install -r pipeline/requirements.txt
pnpm dev
```

# Things that i am too lazy to work on right now
- TESS: TESS light curves need special treatment cuz it has shorter baseline and very weight detrending requirements, a fixed current rolling median wont work, i initially made it for Kepler.
- K2: it fires thrusters every 6 hours, so there is mechanical dips which the current detrending cannot remove.
- Multi-planet: it can detect the biggest transit, but it cant tell if its multiplanet or single-planet, that needs special masking and multiple searches within the result itself.


