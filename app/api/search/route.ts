import fs from "fs/promises"
import { execFile } from "child_process"
import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promisify } from "util"
import { isValidStarId, STAR_ID_HINT } from "@/lib/utils"



const execFileSync = promisify(execFile)

const PIPELINE_DIR = path.join(process.cwd(), "pipeline")
const PYTHON_BIN = process.env.PYTHON_BIN || path.join(PIPELINE_DIR, "venv", "bin", "python")
const CACHE_DIR = path.join(PIPELINE_DIR, "cache")

const DEFAULT_PERIOD_MIN = 1.0
const DEFAULT_PERIOD_MAX = 365.0
const PIPELINE_TIMEOUT = 5 * 60 * 1000

const slugify = (star: string) => {
    return star.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")
}

const fileExists = async (f: string) => {
    try {
        await fs.access(f)
        return true
    } catch {
        return false
    }
}

const runStage = async (script: string, args: string[]) => {
    const scriptPath = path.join(PIPELINE_DIR, script)
    const { stdout, stderr } = await execFileSync(PYTHON_BIN, [scriptPath, ...args], {
        timeout: PIPELINE_TIMEOUT,
        maxBuffer: 1024*1024*50
    })

    if (stderr) {
        console.warn(`[${script}] stderr:`, stderr)
    }

    return stdout
}


export async function POST(req: NextRequest) {
    try {
        const {star, mission = "Kepler", periodMin = DEFAULT_PERIOD_MIN, periodMax = DEFAULT_PERIOD_MAX} = await req.json()

        if(!star || typeof star !== "string" || !star.trim()) {
            return NextResponse.json({error: "missing star id"}, {status: 400})
        }

        if (!isValidStarId(star)) {
            return NextResponse.json({error: STAR_ID_HINT}, {status: 400})
        }

        if (!["Kepler", "K2", "TESS"].includes(mission)) {
            return NextResponse.json({error: "Invalid mission, must be Kepler, K2 or TESS"}, {status: 400})
        }

        const pMin = Number(periodMin)
        const pMax = Number(periodMax)
        if (!Number.isFinite(pMin) || !Number.isFinite(pMax)) {
            return NextResponse.json({error: "Period min and max must be numbers"}, {status: 400})
        }

        if (pMin < 0.5 || pMax > 1000 || pMin >= pMax) {
            return NextResponse.json({error: "Invalid period range, must satisfy 0.5 <= min < max <= 1000"}, {status: 400})
        }

        await fs.mkdir(CACHE_DIR, { recursive: true })

        const slug = slugify(star)
        const ingestPath = path.join(CACHE_DIR, `${slug}.lightcurve.json`)
        const detrendPath = path.join(CACHE_DIR, `${slug}.detrended.json`)
        const analysisPath = path.join(CACHE_DIR, `${slug}.analysis.json`)

        if(!(await fileExists(ingestPath))) {
            await runStage("ingest.py", ["--star", star, "--mission", mission, "--output", ingestPath])
        }

        if(!(await fileExists(detrendPath))) {
            await runStage("detrend.py", ["--input", ingestPath, "--output", detrendPath])
        }

        await runStage("analysis.py", [
            "--input", detrendPath,
            "--output", analysisPath,
            "--period-min", String(periodMin),
            "--period-max", periodMax
        ])

        const result = JSON.parse(await fs.readFile(analysisPath, "utf-8"))
        return NextResponse.json(result);
    } catch (err:any) {
        const stderrText = String(err?.stderr ?? "")
        const messageText = String(err?.message ?? "")
        const combined = `${stderrText}\n${messageText}`
        const isNotFound =
            err?.code === 10 ||
            /STAR_NOT_FOUND|empty search result|could not resolve/i.test(combined)

        if (isNotFound) {
            console.warn("star not found:", err?.stderr ?? err?.message)
            return NextResponse.json({ error: "Star not found, no data for that ID. Check the ID and try e.g. KIC 8191672." }, {status: 404})
        }

        console.error("pipeline error:", err)
        return NextResponse.json({ error: "Analysis Failed", detail: err?.message ?? String(err) }, {status: 500})
    }
}