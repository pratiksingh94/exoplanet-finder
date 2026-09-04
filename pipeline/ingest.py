import json
import argparse
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

lc = search_lightcurve(star, mission=args.mission, author=author_map.get(args.mission)).download_all().stitch()

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
