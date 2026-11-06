const KEY = "heathrow-control-best";
export function readBest() {
  try {
    const value = Number(localStorage.getItem(KEY));
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch { return 0; }
}
export function saveBest(score, previous) {
  const best = Math.max(previous, score);
  if (best > previous) {
    try { localStorage.setItem(KEY, String(best)); } catch { /* Private/blocked storage: keep the session best. */ }
  }
  return best;
}
export function resultText(sim) {
  return `I handled ${sim.landed} arrival${sim.landed === 1 ? "" : "s"} and ${sim.departed} departure${sim.departed === 1 ? "" : "s"} at Heathrow. ${sim.score} points before I lost control. Your turn:\nhttps://heathrow-simulator.alexchoi.xyz/`;
}
