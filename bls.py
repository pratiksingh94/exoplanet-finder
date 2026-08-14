# this file is just testing and rough work, i am going to commit this just as a proof of work and to save my efforts cuz i put too much time into this 😭
# the real script for these things will be analysis.py

from matplotlib import pyplot as plt
import json
import numpy  as np

with open("detrended.json", "r") as f:
    data = json.loads(f.read())

time_values = np.array(data["time"])
flux_values = np.array(data["flux"])

# period = 3.52
# phase = (time_values % period) / period

# plt.scatter(phase, flux_values, s=1)
# plt.xlabel("Phase")
# plt.ylabel("Flux")
# plt.title(f"Folded at period {period} days")
# plt.savefig("folded.png", dpi=200, bbox_inches="tight")


# def bls_search(time, flux, period_min, period_max, n_period=2000, duration=0.03, n_phase=20):
#     periods = np.linspace(period_min, period_max, n_period)
#     best_score = -np.inf
#     best_period = None
#     best_phase_start = None

#     for period in periods:
#         phase = (time % period) / period
#         for phase_start in np.linspace(0, 1 - duration, n_phase):
#             in_transit = (phase >= phase_start) & (phase < phase_start + duration)
#             if np.sum(in_transit) < 3:
#                 continue

#             mean_in = np.mean(flux[in_transit])
#             mean_out = np.mean(flux[~in_transit])
#             depth = mean_out - mean_in
#             score = depth * np.sqrt(np.sum(in_transit))
#             # print(mean_in, mean_out)

#             if score > best_score:
#                 # print("eee")
#                 best_score = score
#                 best_period = period
#                 best_phase_start = phase_start
    
#     return best_period, best_phase_start, best_score

def bls_search_vectorized(time, flux, period_min, period_max, n_period=2000, duration=0.03, n_phase=20):
    periods = np.linspace(period_min, period_max, n_period) # (P,)
    phase_starts = np.linspace(0, 1 - duration, n_phase) # (S,)

    best_score = -np.inf
    best_period = None
    best_phase_start = None
    
    for period in periods:
        phase = (time % period) / period # (N,)

        in_transit = (phase[None, :] >= phase_starts[:, None]) & (phase[None, :] < (phase_starts[:, None] + duration)) # (S, N) (?)

        n_in = in_transit.sum(axis=1)
        valid = n_in >= 3

        sum_in = np.where(in_transit, flux[None, :], 0).sum(axis=1)
        mean_in = np.where(valid, sum_in / np.maximum(n_in, 1), np.nan)

        total_sum = flux.sum()
        mean_out = np.where(valid, (total_sum - sum_in) / np.maximum(len(flux) - n_in, 1), np.nan)
        # print(mean_out)

        depth = mean_out - mean_in
        scores = np.where(valid, depth * np.sqrt(n_in), -np.inf)

        idx = np.argmax(scores)
        if scores[idx] > best_score:
            best_score = scores[idx]
            best_period = period
            best_phase_start = phase_starts[idx]

    return best_period, best_phase_start, best_score




def bls_search_two_pass(time, flux, period_min, period_max, duration=0.03):
    coarse_period, _, _ = bls_search_vectorized(time, flux, period_min, period_max, n_period=2000, n_phase=10)

    zoom = max(0.05 * coarse_period, 0.1)
    fine_min = max(period_min, coarse_period - zoom)
    fine_max = min(period_max, coarse_period + zoom)

    fine_period, fine_phase, fine_score = bls_search_vectorized(time,flux, fine_min, fine_max, n_period=2000, n_phase=20, duration=duration)
    
    return fine_period, fine_phase, fine_score


def check_aliases(time, flux, candidate_period, duration=0.03):
    # candidates = [
    #     candidate_period,
    #     candidate_period * 2,
    #     candidate_period / 2,
    #     candidate_period * 3,
    #     candidate_period / 3
    # ]
 
    candidates = [candidate_period / n for n in range(1, 10)] + [candidate_period * n for n in range(2, 4)]
    results = []
    
    for p in candidates:
        if p <= 0:
            continue

        _, phase_start, score = bls_search_vectorized(time, flux, p * 0.98, p * 1.02, n_period=200, duration=duration)
        results.append((p, score))

    results.sort(key=lambda x: -x[1])
    return results


period, phase, score = bls_search_two_pass(time_values, flux_values, 1.0, 356.0)
aliases = check_aliases(time_values,flux_values, period)
final_period, final_score = aliases[0]

print("final period:", final_period, "final score", final_score)