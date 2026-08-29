
export type AnalysisResult = {
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
  snr_score: number;
  n_covered:number;
  n_expected:number;
  depth:number;
  confidence: string;
  folded: { time: number[], flux: number[] };
}