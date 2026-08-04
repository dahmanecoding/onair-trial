export function sleepScore(sleep: Record<string, number | null | undefined> | null) {
  if (!sleep || sleep.minutes_asleep == null) return null;
  const duration = Math.min(100, (sleep.minutes_asleep / 480) * 100);
  const efficiency = sleep.efficiency ?? 85;
  const restorative = Math.min(100, ((((sleep.minutes_deep ?? 0) + (sleep.minutes_rem ?? 0)) / Math.max(1, sleep.minutes_asleep)) / 0.4) * 100);
  return Math.round(0.6 * duration + 0.25 * efficiency + 0.15 * restorative);
}
