import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform, type AnimationPlaybackControls, type Easing } from 'motion/react'
import { springSettleTime } from '@/lib/spring'

/**
 * Rebuilt from the design-system Storybook story `design-system-gauge--default`
 * (chase-your-grail). A vertical bar meter: a bottom-anchored gradient fill whose
 * height is `(value - min) / (max - min)`, a hair-line pointer in the empty zone
 * above it, and a value pill that rides the top of the fill. On mount one
 * `fraction` value animates 0 → target and drives all three; an optional glow
 * flashes on the value pill once the fill settles. Plain scoped CSS
 * (`.gauge-*` in index.css).
 */
export type GaugeFormat = 'compact' | 'full' | 'raw'

export type GaugeMotionConfig = {
  // reading
  value: number
  min: number
  max: number
  format: GaugeFormat
  /** value pill counts up instead of showing the final number */
  countUp: boolean
  /** seconds the count-up keeps running past the fill settling, before it eases to the final value */
  countUpDelay: number
  countUpEase: Easing | number[]
  // enter animation (the `fraction` 0 → target)
  delay: number
  /** `ramp` = an ease-in build-up to `rampTo`, then the spring for the finish */
  type: 'spring' | 'tween' | 'ramp'
  stiffness: number
  damping: number
  mass: number
  duration: number
  ease: Easing | number[]
  // ramp phase (used when type === 'ramp')
  rampDuration: number
  rampEase: Easing | number[]
  /** 0–1 — fraction of the target the build-up reaches before the spring takes over */
  rampTo: number
  // value-pill flash (fires around the moment the fill settles)
  flash: boolean
  flashColor: string
  flashBlur: number
  flashSpread: number
  /** peak opacity, 0–1 */
  flashIntensity: number
  flashDuration: number
  /** seconds relative to the estimated settle time (negative = earlier) */
  flashOffset: number
  /** number of pulses */
  flashPulses: number
  // appearance (design-system tokens by default)
  fillTop: string
  fillBottom: string
  /** % down the fill where `fillBottom` lands */
  gradientStop: number
  trackWidth: number
  trackHeight: number
  showPointer: boolean
  showMinLabel: boolean
}

// Approved motion spec — updated 2026-08-31. `SHEET`-style: this is the built-in
// enter animation and the bench's "reset defaults". See README "✅ Approved
// motion specs — Gauge".
export const GAUGE_DEFAULT_CONFIG: GaugeMotionConfig = {
  value: 7000,
  min: 0,
  max: 10000,
  format: 'full',
  countUp: true,
  countUpDelay: 0.05,
  countUpEase: 'easeInOut',
  delay: 0.2,
  type: 'ramp',
  stiffness: 795,
  damping: 51,
  mass: 2.1,
  duration: 1,
  ease: 'easeOut',
  rampDuration: 0.8,
  rampEase: 'easeIn',
  rampTo: 0.4,
  flash: true,
  flashColor: '#A5C4D8',
  flashBlur: 24,
  flashSpread: 4,
  flashIntensity: 1,
  flashDuration: 0.8,
  flashOffset: -0.32,
  flashPulses: 1,
  fillTop: '#E0B678',
  fillBottom: '#204C68',
  gradientStop: 75,
  trackWidth: 12,
  trackHeight: 384,
  showPointer: true,
  showMinLabel: true,
}

export function formatGauge(v: number, mode: GaugeFormat): string {
  const n = Math.round(v)
  if (mode === 'raw') return String(n)
  if (mode === 'full') return n.toLocaleString('en-US')
  return `${Math.round(n / 1000)}k` // compact — matches the DS (500 → "1k")
}

/** Length of the fill animation itself (after `delay`), in seconds. */
export function gaugeRunTime(c: GaugeMotionConfig): number {
  const spring = springSettleTime(c.stiffness, c.damping, c.mass)
  if (c.type === 'ramp') return c.rampDuration + spring
  if (c.type === 'spring') return spring
  return c.duration
}

/** When the fill animation has settled, in seconds from mount. */
export function gaugeSettleTime(c: GaugeMotionConfig): number {
  return Math.round((c.delay + gaugeRunTime(c)) * 1000) / 1000
}

/** When the pill flash fires, in seconds from mount. */
export function gaugeFlashAt(c: GaugeMotionConfig): number {
  return Math.max(0, Math.round((gaugeSettleTime(c) + c.flashOffset) * 1000) / 1000)
}

/** Opacity keyframes + times for the flash (fast rise, decaying pulses). */
export function flashKeyframes(intensity: number, pulses: number): { values: number[]; times: number[] } {
  const n = Math.max(1, Math.round(pulses))
  const values: number[] = [0]
  for (let i = 0; i < n; i++) {
    values.push(Math.round(intensity * Math.max(0.25, 1 - i * 0.3) * 1000) / 1000, 0)
  }
  // fast attack on the first pulse, even spacing after
  const times: number[] = [0]
  const rest = values.length - 1
  for (let i = 1; i <= rest; i++) {
    const base = i === 1 ? 0.22 / rest : i / rest
    times.push(Math.round(Math.min(1, base) * 1000) / 1000)
  }
  times[times.length - 1] = 1
  return { values, times }
}

function mergeConfig(partial?: Partial<GaugeMotionConfig>): GaugeMotionConfig {
  return { ...GAUGE_DEFAULT_CONFIG, ...partial }
}

export type GaugeProps = {
  motionConfig?: Partial<GaugeMotionConfig>
  paused?: boolean
}

export function Gauge({ motionConfig, paused }: GaugeProps) {
  const c = mergeConfig(motionConfig)
  const span = Math.max(c.max - c.min, 1e-9)
  const target = Math.min(1, Math.max(0, (c.value - c.min) / span))

  const frac = useMotionValue(paused ? target : 0)
  // Own timeline for the pill number so it can lag past the fill and ease in.
  const count = useMotionValue(paused ? c.value : c.min)

  useEffect(() => {
    if (paused) {
      frac.set(target)
      return
    }
    frac.set(0)
    let cancelled = false
    const running: AnimationPlaybackControls[] = []
    const spring = { type: 'spring' as const, stiffness: c.stiffness, damping: c.damping, mass: c.mass }

    if (c.type === 'ramp') {
      // phase 1 — ease-in build-up to a fraction of the target
      const build = animate(frac, target * c.rampTo, {
        type: 'tween',
        duration: c.rampDuration,
        ease: c.rampEase as Easing,
        delay: c.delay,
      })
      running.push(build)
      // phase 2 — spring covers the last stretch + overshoot
      build.then(() => {
        if (!cancelled) running.push(animate(frac, target, spring))
      })
    } else if (c.type === 'spring') {
      running.push(animate(frac, target, { ...spring, delay: c.delay }))
    } else {
      running.push(animate(frac, target, { type: 'tween', duration: c.duration, ease: c.ease as Easing, delay: c.delay }))
    }
    return () => {
      cancelled = true
      running.forEach((run) => run.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    target, paused, c.type, c.stiffness, c.damping, c.mass, c.duration, c.delay, c.ease,
    c.rampDuration, c.rampEase, c.rampTo,
  ])

  useEffect(() => {
    if (!c.countUp) return
    if (paused) {
      count.set(c.value)
      return
    }
    count.set(c.min)
    const controls = animate(count, c.value, {
      type: 'tween',
      duration: gaugeRunTime(c) + c.countUpDelay,
      ease: c.countUpEase as Easing,
      delay: c.delay,
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.countUp, paused, c.value, c.min, c.countUpDelay, c.countUpEase, c.delay, gaugeRunTime(c)])

  const fillH = useTransform(frac, (f) => `${Math.min(1, Math.max(0, f)) * 100}%`)
  const pointerH = useTransform(frac, (f) => `${(1 - Math.min(1, Math.max(0, f))) * 100}%`)
  const countText = useTransform(count, (v) => formatGauge(v, c.format))
  const staticText = formatGauge(c.value, c.format)

  const flash = flashKeyframes(c.flashIntensity, c.flashPulses)
  const flashAt = gaugeFlashAt(c)

  return (
    <div className='gauge-wrap' style={{ height: c.trackHeight }}>
      <div
        className='gauge-track'
        role='meter'
        aria-valuenow={Math.round(c.value)}
        aria-valuemin={c.min}
        aria-valuemax={c.max}
        style={{ width: c.trackWidth }}
      >
        <motion.div className='gauge-fill-box' style={{ height: fillH }}>
          <div
            className='gauge-fill'
            style={{ backgroundImage: `linear-gradient(180deg, ${c.fillTop} 0%, ${c.fillBottom} ${c.gradientStop}%)` }}
          />
        </motion.div>

        {c.showPointer && (
          <motion.div className='gauge-pointer' style={{ height: pointerH }} aria-hidden='true'>
            <div className='gauge-hairline' />
            <svg viewBox='0 0 9 5' fill='none' className='gauge-tri'>
              <path d='M4.5 0.5L0.5 4.5H8.5L4.5 0.5Z' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </motion.div>
        )}

        <motion.div className='gauge-label' style={{ bottom: fillH }}>
          <div className='gauge-pill'>
            {c.flash && !paused && (
              <motion.span
                className='gauge-flash'
                aria-hidden='true'
                style={{ boxShadow: `0 0 ${c.flashBlur}px ${c.flashSpread}px ${c.flashColor}` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: flash.values }}
                transition={{ delay: flashAt, duration: c.flashDuration, times: flash.times, ease: 'easeOut' }}
              />
            )}
            {c.countUp ? <motion.span>{countText}</motion.span> : <span>{staticText}</span>}
          </div>
        </motion.div>

        {c.showMinLabel && (
          <span className='gauge-min'>{c.min === 0 ? '0' : formatGauge(c.min, c.format)}</span>
        )}
      </div>
    </div>
  )
}
