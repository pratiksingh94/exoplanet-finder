"use client"

import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, XAxis, YAxis } from "recharts";


export default function FoldedChart({ time, flux }: { time: number[], flux: number[] }) {
    const data = time.map((p, i) => ({phase: p, flux: flux[i]}));

    return (
        <div className="h-[220px] bg-secondary rounded-lg">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart className="mt-3 mr-3 mb-5 ml-0">
                    <CartesianGrid strokeDasharray="0" stroke="#38bdf8" strokeOpacity={0.3} horizontal={false} />
                    <XAxis
                    type="number"
                    dataKey="phase"
                    domain={[0, 1]}
                    tick={{ fontSize: 11 }}
                    stroke="#FFFFFF"
                    label={{ value: "Phase", position: "insideBottom", offset: -4, fontSize: 12 }}
                    />
                    <YAxis
                    type="number"
                    dataKey="flux"
                    tick={{ fontSize: 11 }}
                    stroke="#FFFFFF"
                    width={60}
                    domain={["auto", "auto"]}
                    // label={{ value: "Flux", position: "insideLeft", offset: -4, fontSize: 12 }}
                    />

                    <Scatter data={data} fill="#378ADD" r={1.5}/>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    )
}