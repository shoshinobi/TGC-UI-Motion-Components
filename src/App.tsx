import { useEffect, useState } from 'react'
import { Leva, useControls, folder, button } from 'leva'
import { FlamePictogram, FLAME_DEFAULT_CONFIG, type FlameMotionConfig } from '@/components/FlamePictogram'
import { buildJsxSpec, buildJsonSpec } from '@/lib/buildSpec'

const EASE_OPTIONS = [
  'linear',
  'easeIn',
  'easeOut',
  'easeInOut',
  'circIn',
  'circOut',
  'circInOut',
  'backIn',
  'backOut',
  'backInOut',
  'anticipate',
  'custom',
]

/**
 * The approved motion spec (signed off 2026-08-31) — the values baked into
 * FlamePictogram when no `motionConfig` is passed, and the Leva panel's starting
 * point. "Reset to approved spec" restores exactly these. Kept in sync with
 * FLAME_DEFAULT_CONFIG and the README "✅ Approved motion specs" section.
 */
const APPROVED_SPEC = {
  appearance: {
    color: FLAME_DEFAULT_CONFIG.color,
    transformOrigin: FLAME_DEFAULT_CONFIG.transformOrigin,
  },
  timing: {
    duration: FLAME_DEFAULT_CONFIG.duration,
    ease: FLAME_DEFAULT_CONFIG.ease as string,
    bezierX1: 0.42,
    bezierY1: 0,
    bezierX2: 0.58,
    bezierY2: 1,
    loop: FLAME_DEFAULT_CONFIG.repeat === Infinity,
    repeatType: FLAME_DEFAULT_CONFIG.repeatType,
    repeatDelay: FLAME_DEFAULT_CONFIG.repeatDelay,
  },
  keyframes: {
    t1: FLAME_DEFAULT_CONFIG.times[0], sx1: FLAME_DEFAULT_CONFIG.scaleX[0], sy1: FLAME_DEFAULT_CONFIG.scaleY[0],
    t2: FLAME_DEFAULT_CONFIG.times[1], sx2: FLAME_DEFAULT_CONFIG.scaleX[1], sy2: FLAME_DEFAULT_CONFIG.scaleY[1],
    t3: FLAME_DEFAULT_CONFIG.times[2], sx3: FLAME_DEFAULT_CONFIG.scaleX[2], sy3: FLAME_DEFAULT_CONFIG.scaleY[2],
    t4: FLAME_DEFAULT_CONFIG.times[3], sx4: FLAME_DEFAULT_CONFIG.scaleX[3], sy4: FLAME_DEFAULT_CONFIG.scaleY[3],
  },
  layers: {
    delayOuter: FLAME_DEFAULT_CONFIG.layerDelays.outer, speedOuter: FLAME_DEFAULT_CONFIG.layerSpeeds.outer,
    delayMiddle: FLAME_DEFAULT_CONFIG.layerDelays.middle, speedMiddle: FLAME_DEFAULT_CONFIG.layerSpeeds.middle,
    delayInner: FLAME_DEFAULT_CONFIG.layerDelays.inner, speedInner: FLAME_DEFAULT_CONFIG.layerSpeeds.inner,
  },
}

export function App() {
  // Bump to force the <motion.svg> to remount and replay from the first keyframe.
  const [nonce, setNonce] = useState(0)

  // Start the Leva panel collapsed on small screens so it doesn't cover the stage.
  const [panelCollapsed, setPanelCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 720,
  )
  useEffect(() => {
    const onResize = () => setPanelCollapsed(window.innerWidth < 720)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const stage = useControls('Stage', {
    size: { value: 120, min: 16, max: 360, step: 1, label: 'size (px)' },
    background: { value: 'dark', options: ['dark', 'light', 'ember'] },
    baseline: true,
    contextRow: { value: true, label: 'context row' },
    paused: false,
  })

  const [appearance, setAppearance] = useControls('Appearance', () => ({
    color: APPROVED_SPEC.appearance.color,
    transformOrigin: {
      value: APPROVED_SPEC.appearance.transformOrigin,
      options: ['bottom', 'center', 'top', 'left bottom', 'right bottom'],
    },
  }))

  const [timing, setTiming] = useControls('Timing', () => ({
    duration: { value: APPROVED_SPEC.timing.duration, min: 0.1, max: 5, step: 0.05 },
    ease: { value: APPROVED_SPEC.timing.ease, options: EASE_OPTIONS },
    bezierX1: { value: APPROVED_SPEC.timing.bezierX1, min: 0, max: 1, step: 0.01, label: 'cubic x1' },
    bezierY1: { value: APPROVED_SPEC.timing.bezierY1, min: -1, max: 2, step: 0.01, label: 'cubic y1' },
    bezierX2: { value: APPROVED_SPEC.timing.bezierX2, min: 0, max: 1, step: 0.01, label: 'cubic x2' },
    bezierY2: { value: APPROVED_SPEC.timing.bezierY2, min: -1, max: 2, step: 0.01, label: 'cubic y2' },
    loop: APPROVED_SPEC.timing.loop,
    repeatType: { value: APPROVED_SPEC.timing.repeatType, options: ['loop', 'mirror', 'reverse'] },
    repeatDelay: { value: APPROVED_SPEC.timing.repeatDelay, min: 0, max: 3, step: 0.05 },
  }))

  const [kf, setKf] = useControls('Keyframes', () => ({
    'frame 1': folder({
      t1: { value: APPROVED_SPEC.keyframes.t1, min: 0, max: 1, step: 0.01, label: 'time' },
      sx1: { value: APPROVED_SPEC.keyframes.sx1, min: 0.2, max: 3, step: 0.01, label: 'scaleX' },
      sy1: { value: APPROVED_SPEC.keyframes.sy1, min: 0.2, max: 3, step: 0.01, label: 'scaleY' },
    }),
    'frame 2': folder({
      t2: { value: APPROVED_SPEC.keyframes.t2, min: 0, max: 1, step: 0.01, label: 'time' },
      sx2: { value: APPROVED_SPEC.keyframes.sx2, min: 0.2, max: 3, step: 0.01, label: 'scaleX' },
      sy2: { value: APPROVED_SPEC.keyframes.sy2, min: 0.2, max: 3, step: 0.01, label: 'scaleY' },
    }),
    'frame 3': folder({
      t3: { value: APPROVED_SPEC.keyframes.t3, min: 0, max: 1, step: 0.01, label: 'time' },
      sx3: { value: APPROVED_SPEC.keyframes.sx3, min: 0.2, max: 3, step: 0.01, label: 'scaleX' },
      sy3: { value: APPROVED_SPEC.keyframes.sy3, min: 0.2, max: 3, step: 0.01, label: 'scaleY' },
    }),
    'frame 4': folder({
      t4: { value: APPROVED_SPEC.keyframes.t4, min: 0, max: 1, step: 0.01, label: 'time' },
      sx4: { value: APPROVED_SPEC.keyframes.sx4, min: 0.2, max: 3, step: 0.01, label: 'scaleX' },
      sy4: { value: APPROVED_SPEC.keyframes.sy4, min: 0.2, max: 3, step: 0.01, label: 'scaleY' },
    }),
  }))

  const [layers, setLayers] = useControls('Per-layer', () => ({
    outer: folder({
      delayOuter: { value: APPROVED_SPEC.layers.delayOuter, min: 0, max: 1, step: 0.01, label: 'delay (s)' },
      speedOuter: { value: APPROVED_SPEC.layers.speedOuter, min: 0.25, max: 4, step: 0.05, label: 'speed ×' },
    }),
    middle: folder({
      delayMiddle: { value: APPROVED_SPEC.layers.delayMiddle, min: 0, max: 1, step: 0.01, label: 'delay (s)' },
      speedMiddle: { value: APPROVED_SPEC.layers.speedMiddle, min: 0.25, max: 4, step: 0.05, label: 'speed ×' },
    }),
    inner: folder({
      delayInner: { value: APPROVED_SPEC.layers.delayInner, min: 0, max: 1, step: 0.01, label: 'delay (s)' },
      speedInner: { value: APPROVED_SPEC.layers.speedInner, min: 0.25, max: 4, step: 0.05, label: 'speed ×' },
    }),
  }))

  const config: FlameMotionConfig = {
    scaleX: [kf.sx1, kf.sx2, kf.sx3, kf.sx4],
    scaleY: [kf.sy1, kf.sy2, kf.sy3, kf.sy4],
    times: [kf.t1, kf.t2, kf.t3, kf.t4],
    duration: timing.duration,
    ease:
      timing.ease === 'custom'
        ? [timing.bezierX1, timing.bezierY1, timing.bezierX2, timing.bezierY2]
        : (timing.ease as FlameMotionConfig['ease']),
    repeat: timing.loop ? Infinity : 0,
    repeatType: timing.repeatType as FlameMotionConfig['repeatType'],
    repeatDelay: timing.repeatDelay,
    layerDelays: {
      outer: layers.delayOuter,
      middle: layers.delayMiddle,
      inner: layers.delayInner,
    },
    layerSpeeds: {
      outer: layers.speedOuter,
      middle: layers.speedMiddle,
      inner: layers.speedInner,
    },
    transformOrigin: appearance.transformOrigin,
    color: appearance.color,
  }

  const jsx = buildJsxSpec(config)
  const json = buildJsonSpec(config)

  useControls('Export', {
    'reset to approved spec': button(() => {
      setAppearance(APPROVED_SPEC.appearance)
      setTiming(APPROVED_SPEC.timing)
      setKf(APPROVED_SPEC.keyframes)
      setLayers(APPROVED_SPEC.layers)
      setNonce((n) => n + 1)
    }),
    'restart animation': button(() => setNonce((n) => n + 1)),
    'copy Framer Motion': button(() => copy(jsx)),
    'copy JSON tokens': button(() => copy(json)),
  })

  // Remount whenever a timing-affecting param changes so the preview always
  // replays with the current values (motion keeps an infinite loop running with
  // its original transition otherwise). Colour / transform-origin update live.
  const animKey = JSON.stringify([
    nonce,
    config.scaleX,
    config.scaleY,
    config.times,
    config.duration,
    config.ease,
    config.repeat,
    config.repeatType,
    config.repeatDelay,
    config.layerDelays,
    config.layerSpeeds,
  ])

  return (
    <div className='shell' data-panel={panelCollapsed ? 'collapsed' : 'expanded'}>
      <Leva
        titleBar={{ title: 'Flame Pictogram' }}
        collapsed={{ collapsed: panelCollapsed, onChange: setPanelCollapsed }}
        theme={{ sizes: { rootWidth: 'min(300px, calc(100vw - 20px))' } }}
      />

      <div className='stage' data-bg={stage.background}>
        <div className='stage-inner' style={{ color: stage.background === 'light' ? '#18181b' : '#e4e4e7' }}>
          <div className='flame-slot'>
            <FlamePictogram
              key={animKey}
              motionConfig={config}
              paused={stage.paused}
              className=''
              style={{ width: stage.size / 2, height: stage.size }}
            />
          </div>
          {stage.baseline && <div className='baseline' />}

          {stage.contextRow && (
            <div className='context-row'>
              {[16, 24, 40].map((s) => (
                <span key={s} className='context-line'>
                  <FlamePictogram
                    key={`${s}-${animKey}`}
                    motionConfig={config}
                    paused={stage.paused}
                    className=''
                    style={{ width: s / 2, height: s }}
                  />
                  {s}px
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className='dock'>
        <SpecCard title='Framer Motion (motion/react)' text={jsx} />
        <SpecCard title='JSON motion tokens' text={json} />
      </div>
    </div>
  )
}

function copy(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

function SpecCard({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className='spec'>
      <div className='spec-head'>
        <span>{title}</span>
        <button
          className='copy-btn'
          data-copied={copied}
          onClick={() => {
            navigator.clipboard.writeText(text).then(
              () => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1200)
              },
              () => {},
            )
          }}
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre>{text}</pre>
    </div>
  )
}
