function smoothStep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 1)));
  return t * t * (3 - 2 * t);
}

function oscillation(progress: number, seed: number) {
  return (
    Math.sin(progress * Math.PI * (26 + seed * 3.5)) * 0.024 +
    Math.sin(progress * Math.PI * (73 + seed * 5.5)) * 0.015 +
    Math.sin(progress * Math.PI * (157 + seed * 9.5)) * 0.008
  );
}

function initialDip(progress: number) {
  const dipWindow = 0.045;
  return -0.14 * smoothStep(0, dipWindow, progress) * (1 - smoothStep(dipWindow, 0.09, progress));
}

function recoveryCurve(progress: number) {
  const recover = 0.11 * smoothStep(0.04, 0.22, progress);
  const drift = 0.43 * smoothStep(0.18, 0.92, progress);
  const latePush = 0.09 * smoothStep(0.62, 1, progress);
  return recover + drift + latePush;
}

function middaySoftness(progress: number) {
  return -0.04 * smoothStep(0.42, 0.58, progress) + 0.03 * smoothStep(0.72, 0.88, progress);
}

export function shapedMarketValue(args: {
  baseline: number;
  progress: number;
  range: number;
  noise: number;
}) {
  const clamped = Math.max(0, Math.min(1, args.progress));
  const structural =
    initialDip(clamped) +
    recoveryCurve(clamped) +
    middaySoftness(clamped) +
    oscillation(clamped, Math.abs(args.noise) * 10);
  const microNoise = args.noise * 0.07 + Math.sin(clamped * Math.PI * 401) * 0.004;
  const level = structural + microNoise;
  const min = args.baseline - args.range;
  const max = args.baseline + args.range;
  return Math.min(max, Math.max(min, args.baseline + level * args.range));
}
