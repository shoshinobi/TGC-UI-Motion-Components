import {
  flashKeyframes,
  gaugeFlashAt,
  gaugeRunTime,
  gaugeSettleTime,
  type GaugeMotionConfig,
} from '@/components/Gauge'

function r(v: number): number {
  return Math.round(v * 10000) / 10000
}
function num(v: number): string {
  return Number.isInteger(v) ? String(v) : String(r(v))
}
function easeToken(ease: GaugeMotionConfig['ease']): string {
  return Array.isArray(ease) ? `[${ease.map(num).join(', ')}]` : `'${ease}'`
}

/** Framer Motion — one `fraction` value drives fill height, pointer, and label. */
export function buildGaugeJsxSpec(c: GaugeMotionConfig): string {
  const target = c.max === c.min ? 0 : r((c.value - c.min) / (c.max - c.min))
  const springOpts = `{ type: 'spring', stiffness: ${num(c.stiffness)}, damping: ${num(c.damping)}${c.mass !== 1 ? `, mass: ${num(c.mass)}` : ''} }`

  const enter: string[] = [
    `// value → fraction:  (value - min) / (max - min) = ${target}   (${c.value} of ${c.min}–${c.max})`,
    `const fraction = useMotionValue(0)`,
    ``,
    `useEffect(() => {`,
  ]
  if (c.type === 'ramp') {
    enter.push(
      `  // phase 1 — ease-in build-up to ${num(c.rampTo * 100)}% of the target`,
      `  const build = animate(fraction, ${r(target * c.rampTo)}, { duration: ${num(c.rampDuration)}, ease: ${easeToken(c.rampEase)}${c.delay ? `, delay: ${num(c.delay)}` : ''} })`,
      `  build.finished.then(() => {`,
      `    // phase 2 — spring covers the last stretch + overshoot`,
      `    animate(fraction, ${target}, ${springOpts})`,
      `  })`,
      `  return () => build.stop()`,
    )
  } else if (c.type === 'spring') {
    enter.push(
      `  const controls = animate(fraction, ${target}, { type: 'spring', stiffness: ${num(c.stiffness)}, damping: ${num(c.damping)}${c.mass !== 1 ? `, mass: ${num(c.mass)}` : ''}${c.delay ? `, delay: ${num(c.delay)}` : ''} })`,
      `  return () => controls.stop()`,
    )
  } else {
    enter.push(
      `  const controls = animate(fraction, ${target}, { duration: ${num(c.duration)}, ease: ${easeToken(c.ease)}${c.delay ? `, delay: ${num(c.delay)}` : ''} })`,
      `  return () => controls.stop()`,
    )
  }
  enter.push(`}, [])`, ``)

  enter.push(
    `// fill box     style={{ height: useTransform(fraction, f => \`\${f * 100}%\`) }}`,
    `// pointer zone  style={{ height: useTransform(fraction, f => \`\${(1 - f) * 100}%\`) }}`,
    `// value pill    style={{ bottom: useTransform(fraction, f => \`\${f * 100}%\`) }}`,
  )

  if (c.countUp) {
    const dur = r(gaugeRunTime(c) + c.countUpDelay)
    enter.push(
      ``,
      `// pill number — own timeline, finishes ${num(c.countUpDelay)}s after the fill settles`,
      `const count = useMotionValue(${c.min})`,
      `useEffect(() => {`,
      `  const c = animate(count, ${c.value}, { duration: ${dur}, ease: ${easeToken(c.countUpEase)}${c.delay ? `, delay: ${num(c.delay)}` : ''} })`,
      `  return () => c.stop()`,
      `}, [])`,
      `// pill text = useTransform(count, v => format(v))`,
    )
  } else {
    enter.push(`// pill text    format(${c.value})   // static`)
  }

  if (c.flash) enter.push('', ...flashBlock(c))
  return enter.join('\n')
}

function flashBlock(c: GaugeMotionConfig): string[] {
  const { values, times } = flashKeyframes(c.flashIntensity, c.flashPulses)
  const at = gaugeFlashAt(c)
  const settle = gaugeSettleTime(c)
  const off = c.flashOffset ? ` ${c.flashOffset > 0 ? '+' : '-'} ${num(Math.abs(c.flashOffset))}s offset` : ''
  return [
    `// Value-pill flash — fires ~${at}s in (fill settles ~${settle}s${off}).`,
    `// Absolute overlay inside the pill (pill is position: relative):`,
    `<motion.span`,
    `  aria-hidden`,
    `  style={{ position: 'absolute', inset: -2, borderRadius: 8, pointerEvents: 'none',`,
    `           boxShadow: '0 0 ${num(c.flashBlur)}px ${num(c.flashSpread)}px ${c.flashColor}' }}`,
    `  initial={{ opacity: 0 }}`,
    `  animate={{ opacity: [${values.join(', ')}] }}`,
    `  transition={{ delay: ${at}, duration: ${num(c.flashDuration)}, times: [${times.join(', ')}], ease: 'easeOut' }}`,
    `/>`,
  ]
}

/** Framework-neutral motion tokens. */
export function buildGaugeJsonSpec(c: GaugeMotionConfig): string {
  const target = c.max === c.min ? 0 : r((c.value - c.min) / (c.max - c.min))
  const enter: Record<string, unknown> = {
    property: 'fraction',
    from: 0,
    to: target,
    delay: r(c.delay),
  }
  if (c.type === 'ramp') {
    enter.type = 'ramp'
    enter.phase1 = { to: r(target * c.rampTo), type: 'tween', duration: r(c.rampDuration), ease: Array.isArray(c.rampEase) ? { cubicBezier: c.rampEase } : c.rampEase }
    enter.phase2 = { to: target, type: 'spring', stiffness: r(c.stiffness), damping: r(c.damping), mass: r(c.mass) }
  } else if (c.type === 'spring') {
    Object.assign(enter, { type: 'spring', stiffness: r(c.stiffness), damping: r(c.damping), mass: r(c.mass) })
  } else {
    Object.assign(enter, { type: 'tween', duration: r(c.duration), ease: Array.isArray(c.ease) ? { cubicBezier: c.ease } : c.ease })
  }
  enter.drives = ['fill height = fraction', 'pointer height = 1 - fraction', 'value-pill bottom = fraction']

  return JSON.stringify(
    {
      name: 'gauge',
      reading: { value: c.value, min: c.min, max: c.max, fraction: target, format: c.format },
      enter,
      ...(c.countUp
        ? {
            countUp: {
              target: 'value-pill number',
              from: c.min,
              to: c.value,
              type: 'tween',
              duration: r(gaugeRunTime(c) + c.countUpDelay),
              ease: Array.isArray(c.countUpEase) ? { cubicBezier: c.countUpEase } : c.countUpEase,
              note: `finishes ${r(c.countUpDelay)}s after the fill settles (~${gaugeSettleTime(c)}s)`,
            },
          }
        : {}),
      ...(c.flash
        ? {
            flash: {
              target: 'value-pill glow (box-shadow opacity)',
              at: gaugeFlashAt(c),
              note: `settle ≈ ${gaugeSettleTime(c)}s${c.flashOffset ? ` ${c.flashOffset > 0 ? '+' : '-'} ${Math.abs(c.flashOffset)}s` : ''}`,
              boxShadow: `0 0 ${c.flashBlur}px ${c.flashSpread}px ${c.flashColor}`,
              duration: r(c.flashDuration),
              opacityKeyframes: flashKeyframes(c.flashIntensity, c.flashPulses).values,
              times: flashKeyframes(c.flashIntensity, c.flashPulses).times,
            },
          }
        : {}),
      appearance: {
        fillGradient: `linear-gradient(180deg, ${c.fillTop} 0%, ${c.fillBottom} ${c.gradientStop}%)`,
        trackWidth: c.trackWidth,
        trackHeight: c.trackHeight,
        showPointer: c.showPointer,
        showMinLabel: c.showMinLabel,
      },
    },
    null,
    2,
  )
}
