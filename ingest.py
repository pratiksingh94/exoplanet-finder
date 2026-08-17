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
lc = search_lightcurve(star, mission=args.mission, cadence="long").download_all().stitch()

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
