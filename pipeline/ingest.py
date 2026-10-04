import json
import argparse
import sys
import numpy as np
from lightkurve import search_lightcurve

parser = argparse.ArgumentParser()

parser.add_argument("--star", type=str, required=True)
parser.add_argument("--output", type=str, required=True)
parser.add_argument("--mission", type=str, default="Kepler", choices=["Kepler", "K2", "TESS"])

args = parser.parse_args()


star = args.star

author_map = {
    "Kepler": "Kepler",
    "K2": "K2",
    "TESS": "SPOC"
}

STAR_NOT_FOUND_EXIT = 10

try:
    search = search_lightcurve(star, mission=args.mission, author=author_map.get(args.mission))
except Exception as e:
    print(f"INGEST_FAILED: search failed for {star!r}: {e}", file=sys.stderr)
    sys.exit(1)

if search is None or len(search) == 0:
    print(f"STAR_NOT_FOUND: no {args.mission} data found for {star!r}", file=sys.stderr)
    sys.exit(STAR_NOT_FOUND_EXIT)

try:
    downloaded = search.download_all()
except Exception as e:
    print(f"INGEST_FAILED: download failed for {star!r}: {e}", file=sys.stderr)
    sys.exit(1)

if downloaded is None or len(downloaded) == 0:
    print(f"STAR_NOT_FOUND: no {args.mission} data found for {star!r}", file=sys.stderr)
    sys.exit(STAR_NOT_FOUND_EXIT)

try:
    lc = downloaded.stitch()
except Exception as e:
    print(f"INGEST_FAILED: stitch failed for {star!r}: {e}", file=sys.stderr)
    sys.exit(1)

if lc is None or len(lc) == 0:
    print(f"STAR_NOT_FOUND: no {args.mission} data found for {star!r}", file=sys.stderr)
    sys.exit(STAR_NOT_FOUND_EXIT)

normalised = lc.remove_nans().normalize()

# for k, v in lc.meta.items():
#     print(k, "=", v)

metadata = {
    "radius": lc.meta.get("RADIUS"),
    "temperature": lc.meta.get("TEFF"),
    "gravity": lc.meta.get("LOGG"),
}

output = {
    "meta": metadata,
    "star": star,
    "time": normalised.time.value.tolist(),
    "flux": normalised.flux.value.tolist()
}

json_output = json.dumps(output)

if args.output == "json":
    print(json_output)
else:
    with open(args.output, "w") as f:
        f.write(json_output)
    print(f"got {len(normalised.time)} values")
