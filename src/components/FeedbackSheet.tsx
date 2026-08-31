import { motion, type Easing, type MotionProps, type TargetAndTransition, type Transition } from 'motion/react'

/**
 * Rebuilt from the design-system Storybook story
 * `design-system-feedbacksheet--error` (chase-your-grail). Plain scoped CSS
 * (`.fsheet-*` in index.css); the enter motion is driven entirely by
 * `motionConfig` so each layer can be tuned in isolation on the bench.
 */
export type SheetLayerKey = 'sheet' | 'gradient' | 'icon' | 'heading' | 'body' | 'button'

export type SheetLayerAnim = {
  /** opacity it animates FROM (→ 1) */
  fromOpacity: number
  /** y offset it animates FROM (→ 0). sheet: % of own height; others: px */
  fromY: number
  /** scale it animates FROM (→ 1). 1 = no scale */
  fromScale: number
  /** start delay, seconds (ignored when `startAfterAll`) */
  delay: number
  /** begin only once every other layer has settled */
  startAfterAll: boolean
  type: 'tween' | 'spring'
  /** tween */
  duration: number
  ease: Easing | number[]
  /** spring */
  stiffness: number
  damping: number
  mass: number
  // shake — a decaying oscillation overlaid on the enter (great for an alert icon)
  /** rotational amplitude, degrees (0 = off) */
  shakeDeg: number
  /** horizontal amplitude, px (0 = off) */
  shakeX: number
  /** number of back-and-forth swings */
  shakeCount: number
  /** seconds the shake runs for */
  shakeDuration: number
  /** 0–1, how fast each swing shrinks (lower = stays violent longer) */
  shakeDecay: number
}

export type SheetMotionConfig = Record<SheetLayerKey, SheetLayerAnim>

export const SHEET_LAYER_KEYS: SheetLayerKey[] = ['sheet', 'gradient', 'icon', 'heading', 'body', 'button']

/** Resting tilt (deg) of each layer — playful, part of the visual design. */
export const LAYER_BASE_ROTATE: Record<SheetLayerKey, number> = {
  sheet: 0,
  gradient: 0,
  icon: 0,
  heading: 2,
  body: 1,
  button: 1,
}

// Approved motion spec — signed off 2026-08-31. See README "✅ Approved motion
// specs — Feedback Sheet". This is the component's built-in enter animation when
// no `motionConfig` is passed, and the bench's starting point.
export const SHEET_DEFAULT_CONFIG: SheetMotionConfig = {
  sheet: { fromOpacity: 1, fromY: 100, fromScale: 1, delay: 0, startAfterAll: false, type: 'spring', duration: 0.3, ease: 'easeOut', stiffness: 260, damping: 30, mass: 1, shakeDeg: 0, shakeX: 0, shakeCount: 4, shakeDuration: 0.5, shakeDecay: 0.6 },
  gradient: { fromOpacity: 0, fromY: 20, fromScale: 1, delay: 0.06, startAfterAll: false, type: 'tween', duration: 0.5, ease: 'easeOut', stiffness: 200, damping: 26, mass: 1, shakeDeg: 0, shakeX: 0, shakeCount: 4, shakeDuration: 0.5, shakeDecay: 0.6 },
  icon: { fromOpacity: 0, fromY: 0, fromScale: 5, delay: 0, startAfterAll: false, type: 'spring', duration: 0.1, ease: 'backOut', stiffness: 720, damping: 40, mass: 2.8, shakeDeg: 16, shakeX: 0, shakeCount: 10, shakeDuration: 0.8, shakeDecay: 1 },
  heading: { fromOpacity: 0, fromY: 16, fromScale: 1, delay: 0.24, startAfterAll: false, type: 'tween', duration: 0.4, ease: 'easeOut', stiffness: 200, damping: 26, mass: 1, shakeDeg: 0, shakeX: 0, shakeCount: 4, shakeDuration: 0.5, shakeDecay: 0.6 },
  body: { fromOpacity: 0, fromY: 16, fromScale: 1, delay: 0.3, startAfterAll: false, type: 'tween', duration: 0.4, ease: 'easeOut', stiffness: 200, damping: 26, mass: 1, shakeDeg: 0, shakeX: 0, shakeCount: 4, shakeDuration: 0.5, shakeDecay: 0.6 },
  button: { fromOpacity: 0, fromY: 0, fromScale: 0, delay: 0.5, startAfterAll: true, type: 'spring', duration: 0.1, ease: 'backOut', stiffness: 750, damping: 29, mass: 0.9, shakeDeg: 0, shakeX: 0, shakeCount: 2, shakeDuration: 0.1, shakeDecay: 0.15 },
}

function mergeConfig(partial?: Partial<SheetMotionConfig>): SheetMotionConfig {
  return SHEET_LAYER_KEYS.reduce((acc, k) => {
    acc[k] = { ...SHEET_DEFAULT_CONFIG[k], ...(partial?.[k] ?? {}) }
    return acc
  }, {} as SheetMotionConfig)
}

/** 2% settling time of a spring — used to time "start after all". */
export function springSettleTime(stiffness: number, damping: number, mass: number): number {
  const m = Math.max(mass, 0.01)
  const w0 = Math.sqrt(stiffness / m)
  const zeta = damping / (2 * Math.sqrt(stiffness * m))
  if (!Number.isFinite(w0) || w0 <= 0) return 0.6
  const t = zeta < 1 ? -Math.log(0.02 * Math.sqrt(Math.max(1 - zeta * zeta, 1e-6))) / (zeta * w0) : 4 / w0
  return Math.min(2, Math.max(0.2, t))
}

function layerEnd(a: SheetLayerAnim): number {
  const dur = a.type === 'spring' ? springSettleTime(a.stiffness, a.damping, a.mass) : a.duration
  return a.delay + dur
}

/** Effective start delay for a layer, resolving `startAfterAll`. */
export function effectiveDelay(key: SheetLayerKey, config: SheetMotionConfig): number {
  const a = config[key]
  if (!a.startAfterAll) return round(a.delay)
  let max = 0
  for (const k of SHEET_LAYER_KEYS) {
    if (k === key || config[k].startAfterAll) continue
    max = Math.max(max, layerEnd(config[k]))
  }
  return round(max)
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000
}

/** Decaying oscillation: [center, +amp, -amp*d, +amp*d², …, center]. */
export function shakeKeyframes(center: number, amp: number, count: number, decay: number): number[] {
  const n = Math.max(2, Math.round(count))
  const kf = [center]
  let a = amp
  for (let i = 0; i < n; i++) {
    kf.push(center + (i % 2 === 0 ? -a : a))
    a *= decay
  }
  kf.push(center)
  return kf
}

/** Evenly-spaced times for an (count+2)-length keyframe array. */
export function shakeTimes(count: number): number[] {
  const n = Math.max(2, Math.round(count)) + 2
  return Array.from({ length: n }, (_, i) => Math.round((i / (n - 1)) * 1000) / 1000)
}

function layerProps(key: SheetLayerKey, config: SheetMotionConfig, paused?: boolean): MotionProps {
  const a = config[key]
  const baseRotate = LAYER_BASE_ROTATE[key]
  const fromY = key === 'sheet' ? `${a.fromY}%` : a.fromY
  const rest = { opacity: 1, y: 0, x: 0, scale: 1, rotate: baseRotate }
  if (paused) return { initial: rest, animate: rest, transition: { duration: 0 } } as MotionProps

  const delay = effectiveDelay(key, config)
  const base: Transition =
    a.type === 'spring'
      ? { type: 'spring', stiffness: a.stiffness, damping: a.damping, mass: a.mass, delay }
      : { type: 'tween', duration: a.duration, ease: a.ease as Easing, delay }

  const shakeT: Transition = { delay, duration: a.shakeDuration, ease: 'easeOut', times: shakeTimes(a.shakeCount) }
  const rotShake = a.shakeDeg > 0
  const xShake = a.shakeX > 0

  const animate: TargetAndTransition = {
    opacity: 1,
    y: 0,
    scale: 1,
    x: xShake ? shakeKeyframes(0, a.shakeX, a.shakeCount, a.shakeDecay) : 0,
    rotate: rotShake ? shakeKeyframes(baseRotate, a.shakeDeg, a.shakeCount, a.shakeDecay) : baseRotate,
  }
  const transition: Transition = {
    ...base,
    ...(rotShake ? { rotate: shakeT } : {}),
    ...(xShake ? { x: shakeT } : {}),
  }

  return {
    initial: { opacity: a.fromOpacity, y: fromY, x: 0, scale: a.fromScale, rotate: baseRotate },
    animate,
    transition,
  } as MotionProps
}

export type FeedbackSheetProps = {
  motionConfig?: Partial<SheetMotionConfig>
  paused?: boolean
  showScrim?: boolean
}

export function FeedbackSheet({ motionConfig, paused, showScrim = true }: FeedbackSheetProps) {
  const c = mergeConfig(motionConfig)

  return (
    <div className='fsheet-overlay'>
      {showScrim && <div className='fsheet-scrim' aria-hidden='true' />}

      <motion.div className='fsheet-panel' role='dialog' aria-modal='true' aria-label='Feedback' {...layerProps('sheet', c, paused)}>
        <motion.div className='fsheet-gradient' aria-hidden='true' {...layerProps('gradient', c, paused)} />

        <div className='fsheet-content'>
          <div className='fsheet-text'>
            <motion.div className='fsheet-icon' {...layerProps('icon', c, paused)}>
              <svg viewBox='0 0 43.9783 60.0013' fill='none' aria-hidden='true'>
                <path
                  d='M6.00064 6.00064L21.9888 30.0006M21.9888 30.0006L6.00064 54.0006M21.9888 30.0006L37.9777 54.0006M21.9888 30.0006L37.9777 6.00064'
                  stroke='url(#fsheet-cross)'
                  strokeWidth='12'
                  strokeLinecap='round'
                />
                <path
                  d='M6.00064 6.00064L21.9888 30.0006M21.9888 30.0006L6.00064 54.0006M21.9888 30.0006L37.9777 54.0006M21.9888 30.0006L37.9777 6.00064'
                  stroke='#000'
                  strokeWidth='6'
                  strokeLinecap='round'
                />
                <defs>
                  <linearGradient id='fsheet-cross' x1='21.9891' y1='6.00064' x2='21.9891' y2='54.0006' gradientUnits='userSpaceOnUse'>
                    <stop stopColor='var(--color-error)' />
                    <stop offset='1' stopColor='var(--color-error)' stopOpacity='0.25' />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>

            <motion.h1 className='fsheet-h1' {...layerProps('heading', c, paused)}>
              Purchase error
            </motion.h1>

            <motion.p className='fsheet-body' {...layerProps('body', c, paused)}>
              Lorem ipsum <span className='fsheet-error'>dolores mosum</span> ipsum lores.
            </motion.p>
          </div>

          <div className='fsheet-actions'>
            <motion.button type='button' className='fsheet-btn' {...layerProps('button', c, paused)}>
              <span className='fsheet-btn-fold' aria-hidden='true' />
              <span className='fsheet-btn-label'>Try again</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
