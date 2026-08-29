import { AnalysisResult } from "@/types";
import FoldedChart from "./FoldedChart";
import Metric from "./Metric";

const CONFIDENCE_COPY: Record<AnalysisResult["confidence"], { label: string, verdict: (r: AnalysisResult) => string; badge: string; }> = {
    strong: {
        label: "Likely planet detected",
        verdict: (r) => `A periodic dimming was detected every ${r.period_days.toFixed(2)} days, a possible planet passing in front of the star`,
        badge: "bg-emerald-500/10 text-emerald-600"
    },
    moderate: {
        label: "MAYBE a planet?",
        verdict: (r) => `A possible periodic signal was found at ${r.period_days.toFixed(2)} days, but it isnt strong enough to confirm a planet`,
        badge: "bg-amber-500/10 text-amber-600"
    },
    weak: {
        label: "No planet detected",
        verdict: (r) => `No repeatign dimming pattern strong enough to indicate a planet, this may be just noise or stellar activity`,
        badge: "bg-neutral-500/10 text-neutral-500"
    }
}



export default function ResultCard({ result }: { result: AnalysisResult}) {
    const copy = CONFIDENCE_COPY[result.confidence]

    return (
        <div className="border border-border rounded-xl p-5">
            <div className="flex justify-between items-baseline mb-3">
                <span className="font-medium text-[15px]">{result.star}</span>
                <span className={` px-2 py-0.5 rounded-full ${copy.badge}`}>{copy.label}</span>
            </div>

            <p className="text-sm mb-4">{copy.verdict(result)}</p>

            <FoldedChart time={result.folded.time} flux={result.folded.flux}/>

            <p className=" mt-2 mb-4">Star brightess over one orbital period. The dip is planet blocking a part of star's light.</p>

            <div className="grid grid-cols-3 gap-3">
                <Metric label="Period" value={`${result.period_days.toFixed(2)} d`} tooltip="How often the planet orbts its star in days"/>

                <Metric label="Duration" value={`${result.transit_duration_hours.toFixed(1)} h`} tooltip="How long each transit (dip) lasts"/>

                <Metric label="Radius" value={result.planet_radius_earth !== null ? `${result.planet_radius_earth.toFixed(1)} R⊕` : `ratio ${result.radius_ratio.toFixed(3)}`} tooltip="Estimated size of planet compared to Earth (R⊕ = Earth radius)"/>

                <Metric label="Teff" value={`${result.metadata.temperature} K`} tooltip="The star's surface temprature in Kelvin"/>

                <Metric label="Log g" value={`${result.metadata.gravity}`} tooltip="Measure of star's surface gravity"/>

                <Metric label="R★" value={`${result.metadata.radius} R☉`} tooltip="The star's radius compared to Sun's (R☉ = solar radii)"/ >

            </div>


            <details className="mt-4">
                <summary className="cursor-pointer select-none">Verdict explaination</summary>
                <div className="mt-2 space-y-1 pl-1">
                    <p>Signal found in {result.n_covered} seperate transit events {result.n_covered === 1 ? "" : "s"}, out of {result.n_expected.toFixed(1)} expected orbital cycles across the obsered data.</p>

                    <p>Signal-to-Noise ratio: {result.snr_score.toFixed(1)}</p>

                    <p>Measured brightness drop: {(result.depth * 100).toFixed(3)}%</p>
                    
                    <p className="pt-1">
                        A detection is marked as confident when the signal is significant (SNR {'>='} 7) and repeats across enough orbital cycles ({'>='} 5) to rule out a one-off event
                    </p>
                </div>
            </details>
        </div>
    )
}