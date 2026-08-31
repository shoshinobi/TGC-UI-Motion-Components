/**
 * 2% settling time of a spring (seconds) — used to time things that should fire
 * "when the spring settles" (the sheet's `startAfterAll`, the gauge's flash).
 * Underdamped: standard settling-time formula. Over/critically damped: ~4/ωₙ.
 */
export function springSettleTime(stiffness: number, damping: number, mass: number): number {
  const m = Math.max(mass, 0.01)
  const w0 = Math.sqrt(stiffness / m)
  const zeta = damping / (2 * Math.sqrt(stiffness * m))
  if (!Number.isFinite(w0) || w0 <= 0) return 0.6
  const t = zeta < 1 ? -Math.log(0.02 * Math.sqrt(Math.max(1 - zeta * zeta, 1e-6))) / (zeta * w0) : 4 / w0
  return Math.min(2, Math.max(0.2, t))
}
