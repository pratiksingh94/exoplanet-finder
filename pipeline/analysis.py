import json
import argparse
import numpy as np
import time as timer

parser = argparse.ArgumentParser()
parser.add_argument("--input", type=str, required=True)
parser.add_argument("--output", type=str, required=True)
parser.add_argument("--period-min", type=float, required=True)
parser.add_argument("--period-max", type=float, required=True)
args = parser.parse_args()

with open(args.input, "r") as f:
    data = json.loads(f.read())

time_values = np.array(data["time"])
flux_values = np.array(data["flux"])


# print(len(time_values))

only_detrended_time = np.array(data["only_detrended_time"])
only_detrended_flux = np.array(data["only_detrended_flux"])


# def bin_for_search(time, flux, target_bin_mins=30):
#     median_cadence_days = np.median(np.diff(np.sort(time)))
#     median_cadence_mins = median_cadence_days * 24 * 60

#     if median_cadence_mins >= target_bin_mins:
#         return time, flux
    
#     bin_size_days = target_bin_mins / (60*24)
#     n_bins = int((time.max() - time.min()) / bin_size_days)
    
#     bin_edges = np.linspace(time.min(), time.max(), n_bins + 1)
#     bin_idx = np.digitize(time, bin_edges) - 1
#     bin_idx = np.clip(bin_idx, 0, n_bins - 1)

#     binned_time = []
#     binned_flux = []
#     for i in range(n_bins):
#         mask = bin_idx ==i
#         if np.sum(mask) > 0:
#             binned_time.append(np.mean(time[mask]))
#             binned_flux.append(np.mean(flux[mask]))

#     return np.array(binned_time), np.array(binned_flux)


def bls_search_vectorized(time, flux, period_min, period_max, n_period=2000, duration=0.04, n_phase=20):
    periods = np.linspace(period_min, period_max, n_period) # (P,)
    phase_starts = np.linspace(0, 1 - duration, n_phase) # (S,)

    best_score = -np.inf
    best_period = None
    best_phase_start = None
    best_depth = None
    best_snr_score = None
    
    for period in periods:
        phase = (time % period) / period # (N,)

        in_transit = (phase[None, :] >= phase_starts[:, None]) & (phase[None, :] < (phase_starts[:, None] + duration)) # (S, N) (?)

        n_in = in_transit.sum(axis=1)
        n_out = len(flux) - n_in
        valid = n_in >= 20

        sum_in = np.where(in_transit, flux[None, :], 0).sum(axis=1)
        mean_in = np.where(valid, sum_in / np.maximum(n_in, 1), np.nan)

        total_sum = flux.sum()
        mean_out = np.where(valid, (total_sum - sum_in) / np.maximum(len(flux) - n_in, 1), np.nan)

        depth = mean_out - mean_in
        scores = np.where(valid, depth * np.sqrt(n_in), -np.inf)

        sum_sq_out = np.where(~in_transit, (flux[None, :] - mean_out[:, None]) ** 2, 0).sum(axis=1)
        noise = np.sqrt(sum_sq_out / np.maximum(n_out, 1))

        standard_error = noise / np.sqrt(np.maximum(n_in, 1))
        snr_score = np.where(standard_error>0, depth / np.where(standard_error > 0, standard_error, 1), 0)


        idx = np.argmax(scores)
        if scores[idx] > best_score:
            best_score = scores[idx]
            best_period = period
            best_phase_start = phase_starts[idx]
            best_depth = depth[idx]
            best_snr_score = snr_score[idx]

    return best_period, best_phase_start, best_score, best_depth, best_snr_score

def bls_search_two_pass(time, flux, period_min, period_max, duration=0.04):
    coarse_period, _, _, _, _ = bls_search_vectorized(time, flux, period_min, period_max, n_period=2000, n_phase=10)

    zoom = max(0.01 * coarse_period, 0.1)
    fine_min = max(period_min, coarse_period - zoom)
    fine_max = min(period_max, coarse_period + zoom)

    fine_period, fine_phase, fine_score, _, _ = bls_search_vectorized(time,flux, fine_min, fine_max, n_period=2000, n_phase=20, duration=duration)
    
    return fine_period, fine_phase, fine_score


def check_aliases(time, flux, candidate_period, duration=0.04):
    candidates = [candidate_period / n for n in range(1, 15)] + [candidate_period * n for n in range(2, 4)]
    results = []
    
    for p in candidates:
        if p <= 0:
            continue

        refined_p, phase_start, score, _, _ = bls_search_vectorized(time, flux, p * 0.995, p * 1.005, n_period=200, duration=duration)
        results.append((refined_p, score))

    results.sort(key=lambda x: -x[1])
    return results


def refine_duration(time, flux, period, duration_range, n_phase=20):
    best = (-np.inf, None, None, None, None)
    for duration in duration_range:
        _, phase_start, score, depth, snr_score = bls_search_vectorized(time, flux, period*0.999, period*1.001, n_period=3, duration=duration, n_phase=n_phase)
        if score > best[0]:
            best = (score, duration, phase_start, depth, snr_score)
    return best


def pick_best_alias(time, flux, aliases, duration_range, top_n=4):
    best = (-np.inf, None, None, None, None, None)
    for candidate_period, _ in aliases[:top_n]:
        score, duration, phase_start, depth, snr_score = refine_duration(time, flux, candidate_period, duration_range)
        # print(f"candidate {candidate_period:.4f} -> refined score {score:.5f} at duration {duration:.4f}")
        if score > best[0]:
            best = (score, candidate_period, duration, phase_start, depth, snr_score)
    return best

def compute_core_depth(time, flux, period, phase_start, duration, core_fraction=0.4):
    phase = (time % period) / period
    center = phase_start + duration / 2
    half_core = duration * (core_fraction / 2)

    core_mask = (phase >= center - half_core) & (phase < center + half_core)
    core_depth = 1.0 - np.mean(flux[core_mask])
    return core_depth


def bin_folded_curve(phase, flux, n_bins=500):
    bin_edges = np.linspace(0, 1, n_bins + 1)
    bin_idx = np.digitize(phase, bin_edges) -1
    bin_idx = np.clip(bin_idx, 0, n_bins - 1)

    binned_phase = []
    binned_flux = []
    for i in range(n_bins):
        mask = bin_idx == i
        if np.sum(mask) > 0:
            binned_phase.append(float(np.mean(phase[mask])))
            binned_flux.append(float(np.mean(flux[mask])))

    return binned_phase, binned_flux

def compute_coverage_ratio(time, best_period, best_phase_start, best_duration):
    phase = (time % best_period) / best_period
    in_transit_mask = (phase >= best_phase_start) & (phase < best_phase_start + best_duration)
    
    total_baseline = time.max() - time.min()
    n_expected_cycles = total_baseline / best_period

    cycle_numbers = np.floor(time[in_transit_mask] / best_period)
    n_cycles_with_transit = len(np.unique(cycle_numbers))

    coverage_ratio = n_cycles_with_transit / n_expected_cycles
    return coverage_ratio, n_cycles_with_transit, n_expected_cycles

period, phase, score = bls_search_two_pass(time_values, flux_values, args.period_min, args.period_max)
aliases = check_aliases(time_values, flux_values, period)

duration_range = np.linspace(0.01, 0.08, 30)
best_score, best_period, best_duration, best_phase_start, _, snr_score = pick_best_alias(time_values, flux_values, aliases, duration_range)

coverage_ratio, n_covered, n_expected = compute_coverage_ratio(time_values, best_period, best_phase_start, best_duration)

if n_expected < 5:
    confidence = "weak"
    # print("WHY IS IT STILL WRONG")
elif coverage_ratio < 0.3:
    confidence = "weak"
else:
    if snr_score >= 7:
        confidence = "strong"
    elif snr_score >= 4:
        confidence = "moderate"
    else:
        confidence = "weak"



depth = compute_core_depth(only_detrended_time, only_detrended_flux, best_period, best_phase_start, best_duration)

# print(len(time_values), len(only_detrended_time), len(search_time))
transit_duration_hours = best_period * best_duration * 24
radius_ratio = np.sqrt(depth)

star_radius = data["metadata"].get("radius")

if star_radius is not None:
    planet_radius_solar = radius_ratio * star_radius
    planet_radius_earth = planet_radius_solar * 109.2
else:
    planet_radius_earth = None
    planet_radius_solar = None


folded_phase = (only_detrended_time % best_period) / best_period
binned_phase, binned_flux = bin_folded_curve(folded_phase, only_detrended_flux)


output = {
    "star": data["star"],
    "metadata": data["metadata"],
    "period_days":best_period,
    "transit_duration_hours": transit_duration_hours,
    "transit_depth": depth,
    "radius_ratio": radius_ratio,
    "planet_radius_solar": planet_radius_solar,
    "planet_radius_earth": planet_radius_earth,
    "snr_score": snr_score,
    "n_covered": n_covered,
    "n_expected": n_expected,
    "depth": depth,
    "confidence": confidence,
    "folded": {
        "time": binned_phase,
        "flux": binned_flux
    }
}

if args.output == "json":
    print(json.dumps(output))
else:
    with open(args.output, "w") as f:
        f.write(json.dumps(output))