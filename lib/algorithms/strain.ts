export function dayStrain(
  samples: Array<{ bpm: number }>,
  restingHeartRate: number | null,
  activities: Array<{ activity_type?: string; duration_sec?: number; calories?: number }> = []
) {
  if (!restingHeartRate || !samples.length) return null;

  // 1. Cardiovascular Load (Heart Rate Zones & Nonlinear Weighting)
  const maxHeartRate = 190; // Defaulting to 190 as we don't store age/max HR yet
  const hrr = maxHeartRate - restingHeartRate;
  const threshold = restingHeartRate + 0.3 * hrr;

  let cardioLoad = 0;
  for (const sample of samples) {
    if (sample.bpm > threshold) {
      // Calculate reserve intensity (0.3 to 1.0)
      const reserveIntensity = (sample.bpm - restingHeartRate) / hrr;
      // Nonlinear weighting: higher zones impact the score disproportionately
      cardioLoad += Math.pow(reserveIntensity, 3);
    }
  }
  cardioLoad = cardioLoad * 4.5; // Scale factor

  // 2. Muscular Load (Workout logging & Activity Tracking)
  let muscularLoad = 0;
  for (const activity of activities) {
    const type = (activity.activity_type || "").toLowerCase();
    const durationMins = (activity.duration_sec || 0) / 60;
    
    if (type.includes("strength") || type.includes("weight") || type.includes("lift")) {
      muscularLoad += durationMins * 1.5; // High muscular load for resistance training
    } else if (type.includes("hiit") || type.includes("yoga") || type.includes("pilates")) {
      muscularLoad += durationMins * 1.0; // Moderate muscular load
    } else {
      muscularLoad += durationMins * 0.2; // Low muscular load for general cardio
    }
  }

  // 3. The Strain Scale (Logarithmic Design)
  const totalLoad = cardioLoad + muscularLoad;
  // Moving higher on the 0-21 scale requires exponentially more effort
  const strain = 21 * (1 - Math.exp(-totalLoad / 300));
  
  return Math.round(strain * 10) / 10;
}
