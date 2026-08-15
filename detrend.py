import json
import argparse
import numpy as np
import matplotlib.pyplot as plt

parser = argparse.ArgumentParser()
parser.add_argument("--input", type=str, required=True)
parser.add_argument("--output", type=str, required=False)
parser.add_argument("--window", type=int, default=50)
args = parser.parse_args()

with open(args.input, "r") as f:
    data = json.loads(f.read())

# print(data)

# removing outliers
flux_values = np.array(data["flux"])
time_values = np.array(data["time"])
n = 3

z_scores = np.abs((flux_values - np.mean(flux_values)) / np.std(flux_values))
mask = z_scores <= n

filtered_flux_values = flux_values[mask]
filtered_time_values = time_values[mask]

# print("w/ outliers:", len(flux_values))
# print("w/o outliers:", len(filtered_flux_values))
# print("outliers:", np.sum(z_scores > n))

# plt.scatter(filtered_time_values, filtered_flux_values, s=1)
# plt.xlabel("Time")
# plt.ylabel("Flux")
# plt.title("Light Curve data w/o Detrending")

# plt.savefig("lightcurve_wo_detrending.png", dpi=200, bbox_inches="tight")
# plt.close()


def rolling_median(flux, window):
    half = window // 2
    trend = np.zeros(len(flux))
    for i in range(len(flux)):
        low = max(0, i - half)
        high = min(len(flux), i + half)
        trend[i] = np.median(flux[low:high])

    return trend

trend = rolling_median(filtered_flux_values, args.window)
detrended_flux = filtered_flux_values / trend

# plt.scatter(filtered_time_values, detrended_flux, s=1)
# plt.xlabel("Time")
# plt.ylabel("Flux")
# plt.title("Light Curve data w/ Detrending")

# plt.savefig("lightcurve_w_detrending.png", dpi=200, bbox_inches="tight")
# plt.close()

output = {
    "metadata": data["meta"],
    "star": data["star"],
    "time": filtered_time_values.tolist(),
    "flux": detrended_flux.tolist(),
    "window": args.window
}
json_output = json.dumps(output)

if args.output == "json":
    print(json_output)
else:
    with open(args.output, "w") as f:
        f.write(json_output)