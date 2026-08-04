export function dayStrain(samples: Array<{ bpm: number }>, restingHeartRate: number | null) {
  if (!restingHeartRate || !samples.length) return null;
  const load = samples.reduce((total, sample) => {
    const ratio = sample.bpm / restingHeartRate;
    return total + (ratio > 1.25 ? (ratio - 1.25) * 5 : 0);
  }, 0);
  return Math.round(21 * (1 - Math.exp(-load / 25)) * 10) / 10;
}
