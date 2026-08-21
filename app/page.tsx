"use client"

import FoldedChart from "@/components/FoldedChart"
import { useState } from "react"


const KNOWN_STARS = ["KIC 8191672", "KIC 6922244"]
const LOADING_STATES = [
  "Fetching light curve data...",
  "Removing noise...",
  "Searching for transits..."
]


type AnalysisResult = {
  metadata: {
    radius: number;
    temperature: number;
    gravity: number;
  }
  star: string;
  period_days: number;
  transit_duration_hours: number;
  radius_ratio: number;
  planet_radius_earth: number | null;
  planet_radius_sun: number | null;
  score: number;
  folded: { time: number[], flux: number[] };
}


export default function Home() {
  const [star, setStar] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState(0)

  const runSearch = async (targetStar: string) => {
    if(!targetStar.trim()) {
      setError("Enter star ID to search")
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
        body: JSON.stringify({ star: targetStar })
      })

      const data = await res.json()
      if(!res.ok) throw new Error(data.error || "Analysis failed");

      setResult(data)
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
        <div className="rounded-xl border border-border bg-secondary p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-[15px] font-medium">
              {result.star}
            </span>

            {/* TODO: ADD THIS  */}
            <span className="rounded-lg px-2 py-0.5 text-xs bg-success/30 text-success">STRONG SIGNAL</span>
          </div>


          <FoldedChart time={result.folded.time} flux={result.folded.flux}/>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <Metric label="Period" value={`${result.period_days.toFixed(2)} d`}/>
            <Metric label="Duration" value={`${result.transit_duration_hours.toFixed(1)} h`}/>
            <Metric label="Radius" value={result.planet_radius_earth != null ? `${result.planet_radius_earth.toFixed(1)}  R⊕` : `ratio ${result.radius_ratio.toFixed(3)}`}/>
            <Metric label="Teff" value={`${result.metadata.temperature} K`}/>
            <Metric label="Log g" value={`${result.metadata.gravity}`}/>
            <Metric label="R★" value={`${result.metadata.radius} R☉`}/>
            {/* <div className="flex gap-4 mt-3 text-xl text-secondary-foreground">
              <span>Teff {result.metadata.temperature} K</span>
              <span>log g {result.metadata.gravity}</span>
              <span>R★ {result.metadata.radius} R☉</span>
            </div> */}
          </div>

        </div>
      )}
    </div>
  );
}


function Metric({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-secondary rounded-lg p-3">
      <p className="text-[13px] text-secondary-foreground m-0 mb-1">{label}</p>
      <p className="m-0 text-xl font-medium">{value}</p>
    </div>
  )
}