import type { BannerStackMotionConfig } from '@/components/BannerStack'

function r(v: number): number {
  return Math.round(v * 10000) / 10000
}
function nn(v: number): string {
  return Number.isInteger(v) ? String(v) : String(r(v))
}
function ease(e: BannerStackMotionConfig['shuffleEase']): string {
  return Array.isArray(e) ? `[${e.map(nn).join(', ')}]` : `'${e}'`
}

function shuffleLiteral(c: BannerStackMotionConfig): string {
  return c.shuffleType === 'spring'
    ? `{ type: 'spring', stiffness: ${nn(c.shuffleStiffness)}, damping: ${nn(c.shuffleDamping)}, mass: ${nn(c.shuffleMass)} }`
    : `{ duration: ${nn(c.shuffleDuration)}, ease: ${ease(c.shuffleEase)} }`
}

function ctaLiteral(c: BannerStackMotionConfig): string {
  const core =
    c.ctaType === 'spring'
      ? `type: 'spring', stiffness: ${nn(c.ctaStiffness)}, damping: ${nn(c.ctaDamping)}, mass: ${nn(c.ctaMass)}`
      : `duration: ${nn(c.ctaDuration)}, ease: ${ease(c.ctaEase)}`
  return `{ delay: ${nn(c.ctaDelay)}, ${core} }`
}

/** Framer Motion — the persistent looping stack, ready to drop into BannerStack. */
export function buildBannerJsxSpec(c: BannerStackMotionConfig): string {
  const dir = c.directionAware ? 'dir' : '1'
  const L: string[] = []

  L.push(`// Commit on release once EITHER threshold is cleared (both small — a nudge is enough):`)
  L.push(`const SWIPE_OFFSET_PX = ${nn(c.swipeOffsetPx)}`)
  L.push(`const SWIPE_VELOCITY  = ${nn(c.swipeVelocity)}   // px/s flick`)
  L.push(``)
  L.push(`// Infinite loop: monotonic step, every banner is a persistent motion.div.`)
  L.push(`const [step, setStep] = useState(0)`)
  L.push(`const [dir, setDir] = useState(1)`)
  L.push(`const [flyingOut, setFlyingOut] = useState(-1)   // banner index mid fly-out (phase A)`)
  L.push(`const n = banners.length`)
  L.push(`const active = ((step % n) + n) % n`)
  L.push(``)
  L.push(`function advance(direction) { setDir(direction); setFlyingOut(active); setStep(s => s + 1) }`)
  L.push(`function handleDragEnd(_e, info) {`)
  L.push(`  if (Math.abs(info.offset.x) > SWIPE_OFFSET_PX || Math.abs(info.velocity.x) > SWIPE_VELOCITY)`)
  L.push(`    advance(info.offset.x < 0 ? -1 : 1)`)
  L.push(`}`)
  L.push(``)
  L.push(`const STACK_COUNT = ${nn(c.stackCount)}`)
  L.push(`function slot(pos) {`)
  L.push(`  const d = Math.min(pos, STACK_COUNT - 1)`)
  L.push(`  return {`)
  L.push(`    x: ${nn(c.stackGapX)} * d, y: ${nn(c.stackGapY)} * d,`)
  L.push(`    scale: 1 - ${nn(c.stackScaleStep)} * d, rotate: ${nn(c.stackRotateStep)} * d,`)
  L.push(`    opacity: pos >= STACK_COUNT ? 0 : Math.max(0, 1 - ${nn(c.stackOpacityStep)} * pos),`)
  L.push(`  }`)
  L.push(`}`)
  L.push(``)
  L.push(`{banners.map((banner, i) => {`)
  L.push(`  const pos = ((i - active) % n + n) % n`)
  L.push(`  const isFront = pos === 0`)
  L.push(`  const isFlyingOut = i === flyingOut`)
  L.push(`  const rest = slot(pos)`)
  L.push(``)
  L.push(`  // Phase A: the released card slides OUT to ${nn(c.flyOutDistance)}px (from centre, toward the`)
  L.push(`  // swipe dir). onAnimationComplete → phase B: it recedes into the back slot.`)
  L.push(`  const animate = isFlyingOut`)
  L.push(`    ? { x: ${dir} * ${nn(c.flyOutDistance)}, y: 0, scale: 1, opacity: 1, rotate: ${dir} * ${nn(c.flyOutRotate)} }`)
  L.push(`    : rest`)
  L.push(`  const transition = isFlyingOut`)
  L.push(`    ? { duration: ${nn(c.flyOutDuration)}, ease: ${ease(c.flyOutEase)} }`)
  L.push(`    : ${shuffleLiteral(c)}`)
  L.push(``)
  L.push(`  return (`)
  L.push(`    <motion.div`)
  L.push(`      key={i}`)
  L.push(`      style={{ zIndex: isFlyingOut ? STACK_COUNT + 2 : STACK_COUNT - Math.min(pos, STACK_COUNT),`)
  L.push(`               pointerEvents: isFront ? 'auto' : 'none' }}`)
  L.push(`      animate={animate}`)
  L.push(`      transition={transition}`)
  L.push(`      onAnimationComplete={() => { if (isFlyingOut) setFlyingOut(-1) }}`)
  L.push(`      drag={isFront && n > 1 ? 'x' : false}`)
  L.push(`      dragConstraints={{ left: 0, right: 0 }}   // release springs back to centre`)
  L.push(`      dragElastic={0.9}                          // follows the pointer ~1:1`)
  L.push(`      dragTransition={{ bounceStiffness: ${nn(c.snapBackStiffness)}, bounceDamping: ${nn(c.snapBackDamping)} }}`)
  L.push(`      onDragEnd={isFront ? handleDragEnd : undefined}`)
  L.push(`    >`)
  L.push(`      <Banner {...banner} isPeeking={!isFront}${c.ctaAnimate ? ` ctaMotion={isFront ? ctaMotion : null}` : ''} />`)
  L.push(`    </motion.div>`)
  L.push(`  )`)
  L.push(`})}`)

  if (c.ctaAnimate) {
    L.push(``)
    L.push(`// CTA (FoldableButton) — front card only. transform-origin: ${c.ctaOrigin}`)
    L.push(`<motion.div`)
    L.push(`  style={{ transformOrigin: '${c.ctaOrigin}' }}`)
    L.push(`  initial={{ scale: ${nn(c.ctaFromScale)}, opacity: ${nn(c.ctaFromOpacity)} }}`)
    L.push(`  animate={{ scale: 1, opacity: 1 }}`)
    L.push(`  transition={${ctaLiteral(c)}}`)
    L.push(`>`)
    L.push(`  <FoldableButton tone="white" size="md" onClick={onCtaClick}>{ctaLabel}</FoldableButton>`)
    L.push(`</motion.div>`)
  }

  return L.join('\n')
}

/** Framework-neutral motion tokens. */
export function buildBannerJsonSpec(c: BannerStackMotionConfig): string {
  const shuffle =
    c.shuffleType === 'spring'
      ? { type: 'spring', stiffness: r(c.shuffleStiffness), damping: r(c.shuffleDamping), mass: r(c.shuffleMass) }
      : { type: 'tween', duration: r(c.shuffleDuration), ease: Array.isArray(c.shuffleEase) ? { cubicBezier: c.shuffleEase } : c.shuffleEase }

  return JSON.stringify(
    {
      name: 'banner-stack',
      loop: 'infinite — persistent cards, position from a monotonic step',
      release: {
        commitOffsetPx: r(c.swipeOffsetPx),
        commitVelocity: r(c.swipeVelocity),
        note: 'front card follows the pointer; on release it springs back, or — if either threshold cleared — the fly-out + recede plays automatically',
        snapBack: { bounceStiffness: r(c.snapBackStiffness), bounceDamping: r(c.snapBackDamping) },
      },
      flyOut: {
        target: 'the released card — phase A: slides out; phase B: recedes to the back',
        directionAware: c.directionAware,
        distancePx: r(c.flyOutDistance),
        rotate: r(c.flyOutRotate),
        transition: { type: 'tween', duration: r(c.flyOutDuration), ease: Array.isArray(c.flyOutEase) ? { cubicBezier: c.flyOutEase } : c.flyOutEase },
        thenRecedeWith: 'shuffle',
      },
      stack: {
        visibleCount: r(c.stackCount),
        perStep: {
          x: r(c.stackGapX),
          y: r(c.stackGapY),
          scale: -r(c.stackScaleStep),
          opacity: -r(c.stackOpacityStep),
          rotate: r(c.stackRotateStep),
        },
        note: 'card `pos` slots back: x = gapX·pos, scale = 1 − scaleStep·pos, opacity = 1 − opacityStep·pos …',
      },
      shuffle: { target: 'the other cards easing forward one slot, and the flown-out card receding to the back', transition: shuffle },
      cta: {
        target: 'FoldableButton — front card only',
        animate: c.ctaAnimate,
        ...(c.ctaAnimate
          ? {
              delay: r(c.ctaDelay),
              from: { scale: r(c.ctaFromScale), opacity: r(c.ctaFromOpacity) },
              transformOrigin: c.ctaOrigin,
              transition:
                c.ctaType === 'spring'
                  ? { type: 'spring', stiffness: r(c.ctaStiffness), damping: r(c.ctaDamping), mass: r(c.ctaMass) }
                  : { type: 'tween', duration: r(c.ctaDuration), ease: Array.isArray(c.ctaEase) ? { cubicBezier: c.ctaEase } : c.ctaEase },
            }
          : {}),
      },
    },
    null,
    2,
  )
}
