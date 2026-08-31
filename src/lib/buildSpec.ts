import type { FlameMotionConfig } from '@/components/FlamePictogram'

/** Round to 4 dp to drop slider / arithmetic float noise (0.9299999… → 0.93). */
function r(v: number): number {
  return Math.round(v * 10000) / 10000
}

function n(v: number): string {
  return Number.isInteger(v) ? String(v) : String(r(v))
}

function easeToken(ease: FlameMotionConfig['ease']): string {
  return Array.isArray(ease) ? `[${ease.map((v) => n(v)).join(', ')}]` : `'${ease}'`
}

/** Effective per-layer duration in seconds (base duration ÷ speed multiplier). */
function layerDurations(c: FlameMotionConfig): { outer: number; middle: number; inner: number } {
  return {
    outer: r(c.duration / c.layerSpeeds.outer),
    middle: r(c.duration / c.layerSpeeds.middle),
    inner: r(c.duration / c.layerSpeeds.inner),
  }
}

function isLayered(c: FlameMotionConfig): boolean {
  const d = c.layerDelays
  const s = c.layerSpeeds
  return d.outer !== 0 || d.middle !== 0 || d.inner !== 0 || s.outer !== 1 || s.middle !== 1 || s.inner !== 1
}

/** Framer Motion / `motion/react` props, ready to paste back. */
export function buildJsxSpec(c: FlameMotionConfig): string {
  const lines: string[] = []
  lines.push('animate={{')
  lines.push(`  scaleX: [${c.scaleX.map(n).join(', ')}],`)
  lines.push(`  scaleY: [${c.scaleY.map(n).join(', ')}],`)
  lines.push('}}')
  lines.push('transition={{')
  lines.push(`  duration: ${n(c.duration)},`)
  lines.push(`  times: [${c.times.map(n).join(', ')}],`)
  lines.push(`  repeat: ${c.repeat === Infinity ? 'Infinity' : c.repeat},`)
  if (c.repeatType !== 'loop') lines.push(`  repeatType: '${c.repeatType}',`)
  if (c.repeatDelay) lines.push(`  repeatDelay: ${n(c.repeatDelay)},`)
  lines.push(`  ease: ${easeToken(c.ease)},`)
  lines.push('}}')

  if (!isLayered(c)) {
    lines.push(`style={{ transformOrigin: '${c.transformOrigin}' }}`)
    lines.push('// ^ on <motion.svg>')
    return lines.join('\n')
  }

  const dur = layerDurations(c)
  const { outer, middle, inner } = c.layerDelays
  lines.push('')
  lines.push('// Per-layer timing. motion.dev cannot animate `scale` on SVG child')
  lines.push('// nodes (<path>/<g>) — only on an <svg> root — so render one')
  lines.push('// <motion.svg> per flame layer, stacked, each with its own transition:')
  lines.push('//')
  lines.push('//   <span style={{ position: "relative", display: "inline-block" }}>')
  lines.push('//     {LAYERS.map((layer, i) => (')
  lines.push('//       <motion.svg key={i} viewBox="0 0 16 32" preserveAspectRatio="none"')
  lines.push('//         overflow="visible"')
  lines.push('//         animate={{ scaleX, scaleY }}   // shared, from above')
  lines.push('//         transition={{ ...transition, duration: LAYERS[i].duration, delay: LAYERS[i].delay }}')
  lines.push(`//         style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transformOrigin: "${c.transformOrigin}" }}>`)
  lines.push('//         <path d={layer.d} fill={`url(#${layer.gradientId})`} />')
  lines.push('//       </motion.svg>')
  lines.push('//     ))}')
  lines.push('//   </span>')
  lines.push('//')
  lines.push('// const LAYERS = [ // outer, middle, inner')
  lines.push(`//   { duration: ${n(dur.outer)}, delay: ${n(outer)} },`)
  lines.push(`//   { duration: ${n(dur.middle)}, delay: ${n(middle)} },`)
  lines.push(`//   { duration: ${n(dur.inner)}, delay: ${n(inner)} },`)
  lines.push('// ]')
  return lines.join('\n')
}

/** Framework-neutral motion tokens. */
export function buildJsonSpec(c: FlameMotionConfig): string {
  return JSON.stringify(
    {
      name: 'flame-pictogram',
      keyframes: {
        scaleX: c.scaleX.map(r),
        scaleY: c.scaleY.map(r),
        times: c.times.map(r),
      },
      transition: {
        duration: r(c.duration),
        repeat: c.repeat === Infinity ? 'infinite' : c.repeat,
        repeatType: c.repeatType,
        repeatDelay: c.repeatDelay,
        ease: Array.isArray(c.ease) ? { cubicBezier: c.ease } : c.ease,
      },
      layered: isLayered(c),
      layerDelays: c.layerDelays,
      layerSpeeds: c.layerSpeeds,
      layerDurations: layerDurations(c),
      transformOrigin: c.transformOrigin,
      color: c.color,
    },
    null,
    2,
  )
}
