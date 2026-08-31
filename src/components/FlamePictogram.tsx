import { useId } from 'react'
import { motion, type SVGMotionProps, type Easing } from 'motion/react'
import type { Props } from '@/lib/types'
import { cn } from '@/lib/utils/cn'

/**
 * Live-tunable motion config for the preview. When `motionConfig` is omitted the
 * component animates with exactly the values your developer specified, so the
 * defaults below are the source of truth for the hand-back spec.
 */
export type FlameMotionConfig = {
  scaleX: [number, number, number, number]
  scaleY: [number, number, number, number]
  times: [number, number, number, number]
  duration: number
  ease: Easing | number[]
  repeat: number
  repeatType: 'loop' | 'mirror' | 'reverse'
  repeatDelay: number
  transformOrigin: string
  /**
   * Per-layer start delay (seconds) and speed multiplier (1 = base `duration`,
   * 2 = twice as fast). Any non-default value splits the flame into three
   * stacked `<motion.svg>` layers; all-default keeps the original single
   * `<motion.svg>` animation.
   */
  layerDelays: { outer: number; middle: number; inner: number }
  layerSpeeds: { outer: number; middle: number; inner: number }
  /** Drives `--color-error` on the SVG. */
  color: string
}

// Approved motion spec — signed off 2026-08-31. See README "✅ Approved motion
// specs". This is a layered spec (middle layer delayed, inner layer faster), so
// with these defaults the component renders as three stacked <motion.svg> layers.
export const FLAME_DEFAULT_CONFIG: FlameMotionConfig = {
  scaleX: [0.75, 1.005, 0.93, 0.75],
  scaleY: [1, 0.8325, 0.93, 0.98],
  times: [0, 0.5, 0.75, 1],
  duration: 0.4,
  ease: 'linear',
  repeat: Infinity,
  repeatType: 'loop',
  repeatDelay: 0,
  transformOrigin: 'bottom',
  layerDelays: { outer: 0, middle: 0.05, inner: 0 },
  layerSpeeds: { outer: 1, middle: 1, inner: 1.1 },
  color: '#FF5053',
}

/**
 * The three nested flame shapes, outer → inner. Each gradient runs from the
 * shape's own top (opaque) to the bottom of the icon (transparent).
 */
const FLAME_LAYERS = [
  {
    d: 'M2.34315 28.1137C-0.781048 22.9381 -0.781048 14.5468 2.34315 9.37122L8 0L13.6569 9.37122C16.781 14.5468 16.781 22.9381 13.6569 28.1137C10.5327 33.2893 5.46734 33.2893 2.34315 28.1137Z',
    gradientY: [0, 31.9954] as const,
  },
  {
    d: 'M4.00669 29.26C1.80138 25.6066 1.80138 19.6834 4.00669 16.03L7.99976 9.41503L11.9928 16.03C14.1982 19.6834 14.1982 25.6066 11.9928 29.26C9.78752 32.9133 6.212 32.9133 4.00669 29.26Z',
    gradientY: [9.41503, 32] as const,
  },
  {
    d: 'M5.67067 30.3987C4.38424 28.2676 4.38424 24.8123 5.67067 22.6812L7.99996 18.8225L10.3293 22.6812C11.6157 24.8123 11.6157 28.2676 10.3293 30.3987C9.04282 32.5298 6.9571 32.5298 5.67067 30.3987Z',
    gradientY: [18.8225, 31.997] as const,
  },
]

function FlameGradient({ id, y }: { id: string; y: readonly [number, number] }) {
  return (
    <linearGradient id={id} x1='8' y1={y[0]} x2='8' y2={y[1]} gradientUnits='userSpaceOnUse'>
      <stop stopColor='var(--color-error)' />
      <stop offset={1} stopColor='var(--color-error)' stopOpacity={0} />
    </linearGradient>
  )
}

export type FlamePictogramProps = Props<React.SVGAttributes<SVGSVGElement>> & {
  motionConfig?: Partial<FlameMotionConfig>
  paused?: boolean
}

export function FlamePictogram({ className, style, motionConfig, paused, ...props }: FlamePictogramProps) {
  const gradientIds = [useId(), useId(), useId()]

  const c = { ...FLAME_DEFAULT_CONFIG, ...motionConfig }
  const delays = [c.layerDelays.outer, c.layerDelays.middle, c.layerDelays.inner]
  const speeds = [c.layerSpeeds.outer, c.layerSpeeds.middle, c.layerSpeeds.inner]
  const layered = !paused && (delays.some((d) => d !== 0) || speeds.some((s) => s !== 1))

  const scaleKeyframes = paused ? { scaleX: 1, scaleY: 1 } : { scaleX: c.scaleX, scaleY: c.scaleY }
  const baseTransition = paused
    ? { duration: 0 }
    : {
        duration: c.duration,
        times: c.times,
        repeat: c.repeat,
        repeatType: c.repeatType,
        repeatDelay: c.repeatDelay,
        ease: c.ease as Easing,
      }

  // --- Per-layer: motion can't animate `scale` on SVG child nodes, so each
  // flame layer is its own <motion.svg>, stacked, with its own delay + speed. ---
  if (layered) {
    return (
      <span
        className={className}
        style={{
          position: 'relative',
          display: 'inline-block',
          ['--color-error' as string]: c.color,
          ...style,
        }}
      >
        {FLAME_LAYERS.map((layer, i) => (
          <motion.svg
            key={i}
            viewBox='0 0 16 32'
            fill='none'
            preserveAspectRatio='none'
            overflow='visible'
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              transformOrigin: c.transformOrigin,
            }}
            animate={scaleKeyframes}
            transition={{ ...baseTransition, duration: c.duration / speeds[i], delay: delays[i] }}
          >
            <path d={layer.d} fill={`url(#${gradientIds[i]})`} />
            <defs>
              <FlameGradient id={gradientIds[i]} y={layer.gradientY} />
            </defs>
          </motion.svg>
        ))}
      </span>
    )
  }

  // --- Default: the developer's original single-unit animation. ---
  return (
    <motion.svg
      viewBox='0 0 16 32'
      fill='none'
      preserveAspectRatio='none'
      overflow='visible'
      className={cn('h-6 w-3', className)}
      animate={scaleKeyframes}
      transition={baseTransition}
      style={{ transformOrigin: c.transformOrigin, ['--color-error' as string]: c.color, ...style }}
      {...(props as SVGMotionProps<SVGSVGElement>)}
    >
      {FLAME_LAYERS.map((layer, i) => (
        <path key={i} d={layer.d} fill={`url(#${gradientIds[i]})`} />
      ))}
      <defs>
        {FLAME_LAYERS.map((layer, i) => (
          <FlameGradient key={i} id={gradientIds[i]} y={layer.gradientY} />
        ))}
      </defs>
    </motion.svg>
  )
}
