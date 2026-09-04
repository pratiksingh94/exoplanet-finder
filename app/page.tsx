"use client"

import FoldedChart from "@/components/FoldedChart"
import ResultCard from "@/components/ResultCard"
import { AnalysisResult } from "@/types"
import { useState } from "react"


const KNOWN_STARS = ["KIC 8191672", "KIC 6922244", "KIC 8462852"]
const LOADING_STATES = [
  "Fetching light curve data...",
  "Removing noise...",
  "Searching for transits..."
]




export default function Home() {
  const [star, setStar] = useState("")
  const [mission, setMission] = useState("Kepler")
  const [periodMin, setPeriodMin] = useState("1.0")
  const [periodMax, setPeriodMax] = useState("365.0")
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState(0)

  const runSearch = async (targetStar: string) => {
    if(!targetStar.trim()) {
      setError("Enter star ID to search")
      return
    }

    if (mission === "K2" || mission === "TESS") {
      setError(`${mission} search is disabled, see the note under advanced options`)
      return
    }

    if(Number(periodMin) >= Number(periodMax)) {
      setError("Period min must be less than period max")
      return
    }

    setError(null)
    setResult(null)
    setLoading(true)
    setStage(0)

    // purely cosmetic btw no streaming of stage from backend pls dont shush me for lying
    const ticker = setInterval(() => {
      setStage((i) => Math.min(i + 1, LOADING_STATES.length - 1))
    }, 4000)

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ star: targetStar, mission, periodMin: parseFloat(periodMin), periodMax: parseFloat(periodMax) })
      })

      const data = await res.json()
      if(!res.ok) throw new Error(data.error || "Analysis failed");

      setResult(data)
      console.log(data)
    } catch (err:any) {
      setError(err.message ?? "Something went wrong :(")
    } finally {
      clearInterval(ticker)
      setLoading(false)
    }
  }
  return (
    <div className="mx-auto max-w-[680px] px-4 py-8">
      <div className="mb-6">
        <h1 className="m-0 mb-1 text-2xl font-semibold">Exoplanet Finder</h1>

        <p className="m-0 text-sm text-secondary-foreground">Search a star and find a period transit signal in its light curve! (exoplanet?????)</p>
      </div>

      <div className="mb-2 flex gap-2">
        <input
        type="text"
        placeholder="KIC 692224"
        value={star}
        onChange={e => setStar(e.target.value)}
        onKeyDown={e => e.key == "Enter" && runSearch(star)}
        className="min-w-0 flex-1 border-2 border-border rounded-lg p-2"
        />

        <button onClick={() => runSearch(star)} disabled={loading} className="cursor-pointer">Search</button>
      </div>


      <div className="mb-3 mt-1 flex flex-wrap gap-2">
        <p>Try these: </p>
        {KNOWN_STARS.map(s => (
          <button
          key={s}
          onClick={() => {
            setStar(s)
            runSearch(s)
          }}
          className="border-border border-2 rounded-lg h-auto px-2.5 py-1 text-sm cursor-pointer"
          >{s}</button>
        ))}
      </div>

      <button onClick={() => setShowAdvanced(v => !v)} className="mb-3 cursor-pointer">
        {showAdvanced ? "Hide" : "Show"} advanced options
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-md">
          <label>Mission
            <select value={mission} onChange={(e) => setMission(e.target.value)} className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1 text-sm">
              <option value="Kepler">Kepler</option>
              <option value="K2">K2 (unsupported)</option>
              <option value="TESS">TESS (unsupported)</option>
            </select>
          </label>

          <label>Period min (days)
            <input
            type="number"
            step="0.1"
            value={periodMin}
            onChange={e => setPeriodMin((e.target.value))}
            className="mt-1 rounded w-full border border-border bg-transparent px-2 py-1 text-sm"
            />
          </label>

          <label>Period max (days)
            <input
            type="number"
            step="0.1"
            value={periodMax}
            onChange={e => setPeriodMax((e.target.value))}
            className="mt-1 rounded w-full border border-border bg-transparent px-2 py-1 text-sm"
            />
          </label>

          {mission == "TESS" && (
            <p className="col-span-3 text-sm text-red-600">
              i am so sorry, i cannot add TESS support for now these stars need special kind of data clean up and many more things that i need to figure out. T__T
            </p>
          )}

          {mission == "K2" && (
            <p className="col-span-3 text-sm text-red-600">
              K2 data has a strong 6 hours instrumental noise from periodic thruster firings, which my detrending cant fully remove. This will make the analysis give wrong values so K2 search is disabled for now.
            </p>
          )}
        </div>
      )}


      {error && (
        <p className="mb-3 text-[13px] text-destructive">{error}</p>
      )}


      <p className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground">
        Detects single strongest periodic signal! Only suited for single-planet systems right now!
      </p>

      {loading && (
        <div className="rounded-lg bg-secondary px-4 py-8 text-center text-sm text-secondary-foreground">
          {LOADING_STATES[stage]}
        </div>
      )}


      {result && (
        // <div className="rounded-xl border border-border bg-secondary p-4">
        //   <div className="mb-3 flex items-baseline justify-between">
        //     <span className="text-[15px] font-medium">
        //       {result.star}
        //     </span>

        //     {/* TODO: ADD THIS  */}
        //     <span className="rounded-lg px-2 py-0.5 text-xs bg-success/30 text-success">{result.confidence.toUpperCase()} SIGNAL</span>
        //   </div>


        //   <FoldedChart time={result.folded.time} flux={result.folded.flux}/>

        //   <div className="mt-4 grid grid-cols-3 gap-3">
        //     <Metric label="Period" value={`${result.period_days.toFixed(2)} d`}/>
        //     <Metric label="Duration" value={`${result.transit_duration_hours.toFixed(1)} h`}/>
        //     <Metric label="Radius" value={result.planet_radius_earth != null ? `${result.planet_radius_earth.toFixed(1)}  R⊕` : `ratio ${result.radius_ratio.toFixed(3)}`}/>
        //     <Metric label="Teff" value={`${result.metadata.temperature} K`}/>
        //     <Metric label="Log g" value={`${result.metadata.gravity}`}/>
        //     <Metric label="R★" value={`${result.metadata.radius} R☉`}/>
        //     {/* <div className="flex gap-4 mt-3 text-xl text-secondary-foreground">
        //       <span>Teff {result.metadata.temperature} K</span>
        //       <span>log g {result.metadata.gravity}</span>
        //       <span>R★ {result.metadata.radius} R☉</span>
        //     </div> */}
        //   </div>

        // </div>

        <ResultCard result={result}/>
      )}
    </div>
  );
}