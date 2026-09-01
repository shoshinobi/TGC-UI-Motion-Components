import { useEffect, useRef, useState } from 'react'
import { motion, type Easing, type MotionProps, type PanInfo, type Transition } from 'motion/react'
import { Banner, type BannerProps } from './Banner'

/**
 * Rebuilt from the developer's `BannerStack.tsx`, with the interaction reworked
 * to match the reference (codepen.io/tahazsh/pen/yLWPNrG):
 *
 *  - the front card **follows the pointer** while dragging;
 *  - on release it **snaps back**, and if the drag cleared a *small* distance OR
 *    was a flick, the stack **reorders** — the front card settles onto the back,
 *    every other card shuffles one slot forward;
 *  - it's an **infinite loop** — persistent cards, position from a monotonic
 *    step, so swiping past the last banner wraps to the first.
 *
 * Every number comes from `motionConfig`. `Typography` / `FoldableButton` /
 * `Image` / `LinearGradient` are dummy stubs (`banner-stubs.tsx`).
 */
export type BannerStackMotionConfig = {
  // --- drag / release ---
  /** px of drag that commits on release (keep it small) */
  swipeOffsetPx: number
  /** px/s flick speed that commits even without much distance */
  swipeVelocity: number
  /** spring for the snap-back when a drag does NOT commit */
  snapBackStiffness: number
  snapBackDamping: number

  // --- fly-out: automatic once the drag commits ---
  /** the fly-out goes toward the swipe direction; off = always one way */
  directionAware: boolean
  /** px from centre the released card automatically slides out to, before receding to the back */
  flyOutDistance: number
  /** degrees (× direction) it tilts on the way out */
  flyOutRotate: number
  /** seconds the fly-out takes (the recede-to-back then uses the shuffle timing) */
  flyOutDuration: number
  flyOutEase: Easing | number[]

  // --- stack fan-out: how the cards behind the front one are spread ---
  stackCount: number
  /** px each card further back is offset right — the visible edge */
  stackGapX: number
  stackGapY: number
  stackScaleStep: number
  stackOpacityStep: number
  stackRotateStep: number
  /** resting tilt of the top card, degrees — negative tilts the other way. The fan adds `stackRotateStep` per card behind it */
  frontRotate: number
  /** 0–1 — opacity of a dark overlay on EVERY card behind the front one (equal, not per-depth) — also dims the border */
  stackDarken: number

  // --- border (every card) ---
  borderColor: string
  borderWidth: number

  // --- shuffle: every card easing into its new slot on a commit ---
  shuffleType: 'tween' | 'spring'
  shuffleDuration: number
  shuffleEase: Easing | number[]
  shuffleStiffness: number
  shuffleDamping: number
  shuffleMass: number

  // --- CTA (foldable button) — front card only ---
  ctaAnimate: boolean
  ctaDelay: number
  ctaFromScale: number
  ctaFromOpacity: number
  ctaType: 'spring' | 'tween'
  ctaDuration: number
  ctaEase: Easing | number[]
  ctaStiffness: number
  ctaDamping: number
  ctaMass: number
  ctaOrigin: string
}

/**
 * Approved — **phone** viewport (2026-09-01). The base config; the app swaps in
 * a wider-screen variant above the breakpoint. See README "✅ Approved motion
 * specs — Banner Stack".
 */
export const BANNER_DEFAULT_CONFIG: BannerStackMotionConfig = {
  swipeOffsetPx: 140,
  swipeVelocity: 450,
  snapBackStiffness: 680,
  snapBackDamping: 22,

  directionAware: true,
  flyOutDistance: 300,
  flyOutRotate: 8,
  flyOutDuration: 0.16,
  flyOutEase: 'circOut',

  stackCount: 3,
  stackGapX: 28,
  stackGapY: 2,
  stackScaleStep: 0.1,
  stackOpacityStep: 0,
  stackRotateStep: 3,
  frontRotate: -2,
  stackDarken: 0.4,

  borderColor: '#FFFFFF',
  borderWidth: 2,

  shuffleType: 'tween',
  shuffleDuration: 0.2,
  shuffleEase: 'easeInOut',
  shuffleStiffness: 320,
  shuffleDamping: 32,
  shuffleMass: 1,

  ctaAnimate: true,
  ctaDelay: 0.3,
  ctaFromScale: 0,
  ctaFromOpacity: 0,
  ctaType: 'spring',
  ctaDuration: 0.5,
  ctaEase: 'backOut',
  ctaStiffness: 600,
  ctaDamping: 29,
  ctaMass: 1,
  ctaOrigin: 'center',
}

/** `BANNER_DEFAULT_CONFIG` is the phone config. Alias for clarity at call sites. */
export const BANNER_CONFIG_PHONE = BANNER_DEFAULT_CONFIG

/**
 * Approved — **tablet** viewport (2026-09-01). Between phone and full: a slightly
 * longer commit drag, a mid fly-out, a wider + flatter fan, and a softer
 * `easeInOut` fly-out (vs phone/full's `circOut`).
 */
export const BANNER_CONFIG_TABLET: BannerStackMotionConfig = {
  ...BANNER_CONFIG_PHONE,
  swipeOffsetPx: 150,
  flyOutDistance: 500,
  flyOutEase: 'easeInOut',
  stackGapX: 25,
  stackGapY: 1,
  stackRotateStep: 2,
  // pinned to their approved values — the phone base changed these on 2026-09-01
  stackScaleStep: 0.05,
  frontRotate: 2,
}

/**
 * Approved — **full-width** viewport (2026-09-01). Same motion timing as phone;
 * a longer commit drag, a much bigger fly-out (wide frame), and a wider fan with
 * less tilt.
 */
export const BANNER_CONFIG_FULL: BannerStackMotionConfig = {
  ...BANNER_CONFIG_PHONE,
  swipeOffsetPx: 200,
  flyOutDistance: 800,
  stackGapX: 52,
  stackGapY: 0,
  stackScaleStep: 0.095,
  stackRotateStep: 2.5,
  frontRotate: -1,
}

function mergeConfig(partial?: Partial<BannerStackMotionConfig>): BannerStackMotionConfig {
  return { ...BANNER_DEFAULT_CONFIG, ...partial }
}

export type BannerSample = Omit<BannerProps, 'className' | 'style' | 'ctaMotion' | 'ctaOrigin'>

export type BannerStackProps = {
  banners: BannerSample[]
  motionConfig?: Partial<BannerStackMotionConfig>
  paused?: boolean
  /** bump to advance the stack programmatically (bench "next" button) */
  advanceSignal?: number
}

export function BannerStack({ banners, motionConfig, paused, advanceSignal = 0 }: BannerStackProps) {
  const c = mergeConfig(motionConfig)
  const n = Math.max(banners.length, 1)

  const [step, setStep] = useState(0) // monotonic — keys never repeat, so the loop never stalls
  const [swipeDir, setSwipeDir] = useState(1)
  const [flyingOut, setFlyingOut] = useState(-1) // banner index mid-fly-out (phase A)
  const active = ((step % n) + n) % n

  const advancedRef = useRef(advanceSignal)
  useEffect(() => {
    if (advanceSignal !== advancedRef.current) {
      advancedRef.current = advanceSignal
      advance(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanceSignal])

  function advance(direction: number) {
    setSwipeDir(direction)
    setFlyingOut(active)
    setStep((s) => s + 1)
  }

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const committed = Math.abs(info.offset.x) > c.swipeOffsetPx || Math.abs(info.velocity.x) > c.swipeVelocity
    if (committed) advance(info.offset.x < 0 ? -1 : 1)
  }

  const shuffleT: Transition =
    c.shuffleType === 'spring'
      ? { type: 'spring', stiffness: c.shuffleStiffness, damping: c.shuffleDamping, mass: c.shuffleMass }
      : { duration: c.shuffleDuration, ease: c.shuffleEase as Easing }

  const dirMul = (d: number) => (c.directionAware ? d : 1)

  /** Resting transform for a card `pos` slots behind the front one. */
  function slot(pos: number) {
    const depth = Math.min(pos, c.stackCount - 1)
    return {
      x: c.stackGapX * depth,
      y: c.stackGapY * depth,
      scale: 1 - c.stackScaleStep * depth,
      rotate: c.stackRotateStep * depth,
      opacity: pos >= c.stackCount ? 0 : Math.max(0, 1 - c.stackOpacityStep * pos),
    }
  }

  const ctaTransition: Transition = {
    delay: c.ctaDelay,
    ...(c.ctaType === 'spring'
      ? { type: 'spring', stiffness: c.ctaStiffness, damping: c.ctaDamping, mass: c.ctaMass }
      : { duration: c.ctaDuration, ease: c.ctaEase as Easing }),
  }
  const ctaMotion: MotionProps | null = c.ctaAnimate
    ? { initial: { scale: c.ctaFromScale, opacity: c.ctaFromOpacity }, animate: { scale: 1, opacity: 1 }, transition: ctaTransition }
    : null

  return (
    <div className='banner-stack' data-depth={c.stackCount}>
      {banners.map((banner, i) => {
        const pos = ((i - active) % n + n) % n
        const isFront = pos === 0
        const isFlyingOut = i === flyingOut
        const rest = slot(pos)

        // Phase A — the released card automatically slides OUT to `flyOutDistance`
        // (from centre, toward the swipe direction). When that finishes, phase B:
        // it becomes an ordinary back-of-stack card and recedes into the stack.
        const animate: MotionProps['animate'] = isFlyingOut
          ? {
              x: dirMul(swipeDir) * c.flyOutDistance,
              y: 0,
              scale: 1,
              opacity: 1,
              rotate: dirMul(swipeDir) * c.flyOutRotate,
            }
          : rest
        const transition: Transition = isFlyingOut
          ? { duration: c.flyOutDuration, ease: c.flyOutEase as Easing }
          : shuffleT

        return (
          <motion.div
            key={i}
            className='banner-stack__card'
            data-front={isFront}
            style={{
              zIndex: isFlyingOut ? c.stackCount + 2 : c.stackCount - Math.min(pos, c.stackCount),
              pointerEvents: isFront ? 'auto' : 'none',
            }}
            animate={animate}
            transition={transition}
            onAnimationComplete={() => {
              if (isFlyingOut) setFlyingOut(-1)
            }}
            drag={isFront && n > 1 && !paused ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.9}
            dragTransition={{ bounceStiffness: c.snapBackStiffness, bounceDamping: c.snapBackDamping }}
            onDragEnd={isFront ? handleDragEnd : undefined}
          >
            <Banner
              {...banner}
              className='banner--fill'
              isPeeking={!isFront}
              ctaMotion={isFront ? ctaMotion : null}
              ctaOrigin={c.ctaOrigin}
              rotate={c.frontRotate}
              dim={isFront || isFlyingOut ? 0 : c.stackDarken}
              borderColor={c.borderColor}
              borderWidth={c.borderWidth}
            />
          </motion.div>
        )
      })}
    </div>
  )
}
