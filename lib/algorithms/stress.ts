export function currentStress(
  recentSamples: Array<{ bpm: number }>,
  restingHeartRate: number | null
): { score: number; label: string } | null {
  if (!restingHeartRate || !recentSamples.length) return null;

  // We look at the average HR over the last few samples (e.g. last 15 mins)
  const avgHr = recentSamples.reduce((sum, s) => sum + s.bpm, 0) / recentSamples.length;
  
  // Reserve heart rate (assuming max 190)
  const hrr = 190 - restingHeartRate;
  const reserveIntensity = (avgHr - restingHeartRate) / hrr;

  let score = 0;
  if (reserveIntensity > 0) {
    score = Math.min(3.0, reserveIntensity * 10);
  }

  score = Math.round(score * 10) / 10;

  let label = "LOW";
  if (score >= 2.0) label = "HIGH";
  else if (score >= 1.0) label = "MEDIUM";

  return { score, label };
}
