import {
  effectiveDelay,
  LAYER_BASE_ROTATE,
  shakeKeyframes,
  shakeTimes,
  SHEET_LAYER_KEYS,
  type SheetLayerAnim,
  type SheetLayerKey,
  type SheetMotionConfig,
} from '@/components/FeedbackSheet'

function r(v: number): number {
  return Math.round(v * 10000) / 10000
}
function num(v: number): string {
  return Number.isInteger(v) ? String(v) : String(r(v))
}
function easeToken(ease: SheetLayerAnim['ease']): string {
  return Array.isArray(ease) ? `[${ease.map(num).join(', ')}]` : `'${ease}'`
}

const LABEL: Record<SheetLayerKey, string> = {
  sheet: 'Sheet panel (slides up)',
  gradient: 'Gradient wash',
  icon: 'Icon',
  heading: 'Heading',
  body: 'Body copy',
  button: 'Action button',
}

function isShaking(a: SheetLayerAnim): boolean {
  return a.shakeDeg > 0 || a.shakeX > 0
}

function initialObj(key: SheetLayerKey, a: SheetLayerAnim): string {
  const base = LAYER_BASE_ROTATE[key]
  const parts: string[] = []
  if (a.fromOpacity !== 1) parts.push(`opacity: ${num(a.fromOpacity)}`)
  if (a.fromY !== 0) parts.push(`y: ${key === 'sheet' ? `'${num(a.fromY)}%'` : num(a.fromY)}`)
  if (a.fromScale !== 1) parts.push(`scale: ${num(a.fromScale)}`)
  if (base !== 0) parts.push(`rotate: ${num(base)}`)
  return `{ ${parts.join(', ')} }`
}

function animateObj(key: SheetLayerKey, a: SheetLayerAnim): string {
  const base = LAYER_BASE_ROTATE[key]
  const parts: string[] = []
  if (a.fromOpacity !== 1) parts.push(`opacity: 1`)
  if (a.fromY !== 0) parts.push(`y: 0`)
  if (a.fromScale !== 1) parts.push(`scale: 1`)
  if (a.shakeX > 0) parts.push(`x: [${shakeKeyframes(0, a.shakeX, a.shakeCount, a.shakeDecay).map(num).join(', ')}]`)
  if (a.shakeDeg > 0) parts.push(`rotate: [${shakeKeyframes(base, a.shakeDeg, a.shakeCount, a.shakeDecay).map(num).join(', ')}]`)
  else if (base !== 0) parts.push(`rotate: ${num(base)}`)
  return `{ ${parts.join(', ')} }`
}

function transitionObj(key: SheetLayerKey, config: SheetMotionConfig): string {
  const a = config[key]
  const delay = effectiveDelay(key, config)
  const core: string[] = []
  if (delay) core.push(`delay: ${num(delay)}`)
  if (a.type === 'spring') {
    core.push(`type: 'spring'`, `stiffness: ${num(a.stiffness)}`, `damping: ${num(a.damping)}`)
    if (a.mass !== 1) core.push(`mass: ${num(a.mass)}`)
  } else {
    core.push(`duration: ${num(a.duration)}`, `ease: ${easeToken(a.ease)}`)
  }
  if (isShaking(a)) {
    const t = shakeTimes(a.shakeCount)
    const sub = `{ duration: ${num(a.shakeDuration)}, ease: 'easeOut', times: [${t.join(', ')}] }`
    if (a.shakeX > 0) core.push(`x: ${sub}`)
    if (a.shakeDeg > 0) core.push(`rotate: ${sub}`)
  }
  return `{ ${core.join(', ')} }`
}

/** Framer Motion props per layer, ready to paste onto each `motion.*` element. */
export function buildSheetJsxSpec(config: SheetMotionConfig): string {
  return SHEET_LAYER_KEYS.map((key) => {
    const a = config[key]
    const note = a.startAfterAll
      ? `// ${LABEL[key]} — starts after every other layer settles (~${num(effectiveDelay(key, config))}s)`
      : `// ${LABEL[key]}`
    return [note, `initial={${initialObj(key, a)}}`, `animate={${animateObj(key, a)}}`, `transition={${transitionObj(key, config)}}`].join('\n')
  }).join('\n\n')
}

/** Framework-neutral motion tokens for the whole sheet. */
export function buildSheetJsonSpec(config: SheetMotionConfig): string {
  const enter = SHEET_LAYER_KEYS.reduce(
    (acc, key) => {
      const a = config[key]
      const base = LAYER_BASE_ROTATE[key]
      acc[key] = {
        from: {
          opacity: r(a.fromOpacity),
          y: key === 'sheet' ? `${num(a.fromY)}%` : r(a.fromY),
          scale: r(a.fromScale),
          rotate: base,
        },
        delay: effectiveDelay(key, config),
        ...(a.startAfterAll ? { startAfterAll: true } : {}),
        ...(a.type === 'spring'
          ? { type: 'spring', stiffness: r(a.stiffness), damping: r(a.damping), mass: r(a.mass) }
          : { type: 'tween', duration: r(a.duration), ease: Array.isArray(a.ease) ? { cubicBezier: a.ease } : a.ease }),
        ...(isShaking(a)
          ? {
              shake: {
                duration: r(a.shakeDuration),
                times: shakeTimes(a.shakeCount),
                ...(a.shakeDeg > 0 ? { rotateKeyframes: shakeKeyframes(base, a.shakeDeg, a.shakeCount, a.shakeDecay).map(r) } : {}),
                ...(a.shakeX > 0 ? { xKeyframes: shakeKeyframes(0, a.shakeX, a.shakeCount, a.shakeDecay).map(r) } : {}),
              },
            }
          : {}),
      }
      return acc
    },
    {} as Record<string, unknown>,
  )
  return JSON.stringify({ name: 'feedback-sheet', enter }, null, 2)
}
