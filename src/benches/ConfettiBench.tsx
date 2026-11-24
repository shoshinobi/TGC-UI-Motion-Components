import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { SpecsToggle } from '@/components/SpecsToggle'
import { useViewport } from '@/lib/viewport'
import { useControls, folder, button } from 'leva'
import { Confetti } from '@/components/Confetti'
import { CONFETTI_DEFAULT_CONFIG, CONFETTI_PRESETS, type ConfettiConfig } from '@/components/confetti.config'
import { buildConfettiJsonSpec } from '@/lib/buildConfettiSpec'
import { SpecCard, stringifyConfig, useLiveCopy } from '@/components/SpecCard'

const D = CONFETTI_DEFAULT_CONFIG
const SLOT_KEY = 'tgc-bench:confetti'

function savedSettings(): Record<string, number | string | boolean> | null {
  try {
    const raw = localStorage.getItem(SLOT_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, number | string | boolean> = {}
    for (const k of Object.keys(D)) if (k in obj) out[k] = obj[k] as number | string | boolean
    return out
  } catch {
    return null
  }
}

export function ConfettiBench() {
  const [nonce, setNonce] = useState(0)
  const [fire, setFire] = useState(0)
  const [stop, setStop] = useState(0)
  const replay = () => setNonce((k) => k + 1)

  const viewport = useViewport()
  const stage = useControls('Stage', {
    background: { value: 'ember', options: ['dark', 'light', 'ember'] },
    emberColor: { value: '#3a1512', label: 'ember colour' },
    emberSpread: { value: 60, min: 10, max: 140, step: 2, label: 'ember spread (%)' },
    paused: false,
  })

  const [v, set] = useControls('Confetti', () => ({
    style: folder({
      mode: { value: D.mode, options: ['pop', 'rain', 'both'], label: 'style' },
      autoFire: { value: D.autoFire, label: 'fire on replay' },
      fireDelay: { value: D.fireDelay, min: 0, max: 3, step: 0.05, label: '↳ delay (s)' },
      loopEvery: { value: D.loopEvery, min: 0, max: 10, step: 0.25, label: 'repeat every (s, 0 = once)' },
    }),
    'pop (firework)': folder(
      {
        bursts: { value: D.bursts, min: 1, max: 10, step: 1, label: 'bursts' },
        burstsMax: { value: D.burstsMax, min: 0, max: 10, step: 1, label: '↳ random up to (0 = fixed)' },
        burstInterval: { value: D.burstInterval, min: 0, max: 2, step: 0.05, label: 'between bursts (s)' },
        burstOrigin: { value: D.burstOrigin, options: ['random', 'center', 'sides', 'bottom'], label: 'from' },
        originX: { value: D.originX, min: 0, max: 1, step: 0.01, label: '↳ centre x (× width)' },
        originY: { value: D.originY, min: 0, max: 1, step: 0.01, label: '↳ centre y (× height)' },
        randomTop: { value: D.randomTop, min: 0, max: 1, step: 0.01, label: '↳ random: top (× height)' },
        randomBottom: { value: D.randomBottom, min: 0, max: 1, step: 0.01, label: '↳ random: bottom (× height)' },
        burstPieces: { value: D.burstPieces, min: 5, max: 300, step: 1, label: 'pieces per burst' },
        burstSpeedMin: { value: D.burstSpeedMin, min: 0, max: 3000, step: 25, label: 'speed min (px/s)' },
        burstSpeedMax: { value: D.burstSpeedMax, min: 100, max: 4000, step: 25, label: 'speed max (px/s)' },
        burstSpread: { value: D.burstSpread, min: 5, max: 360, step: 1, label: 'spread (°, 360 = ring)' },
        burstAngle: { value: D.burstAngle, min: -180, max: 180, step: 1, label: 'aim (°, −90 = up)' },
        burstFill: { value: D.burstFill, options: ['sphere', 'ring'], label: 'shape' },
        flashOffsetX: { value: D.flashOffsetX, min: -150, max: 200, step: 2, label: 'flash + star: offset x (px, inward for cannons)' },
        flashOffsetY: { value: D.flashOffsetY, min: -200, max: 200, step: 2, label: 'flash + star: offset y (px, + = lower)' },
        popFlash: { value: D.popFlash, min: 0, max: 2, step: 0.05, label: 'flash at origin (0 = off)' },
        popFlashColor: { value: D.popFlashColor, options: { 'random from palette': 'palette', white: 'white' }, label: '↳ colour' },
        popFlashSize: { value: D.popFlashSize, min: 10, max: 400, step: 5, label: '↳ radius (px)' },
        popFlashDuration: { value: D.popFlashDuration, min: 0.05, max: 1.5, step: 0.05, label: '↳ fade (s)' },
        starIntensity: { value: D.starIntensity, min: 0, max: 1.5, step: 0.05, label: 'starburst at origin (0 = off)' },
        starStrokes: { value: D.starStrokes, min: 1, max: 40, step: 1, label: '↳ strokes' },
        starLayout: { value: D.starLayout, options: { 'aimed fan': 'aimed', 'even (clock)': 'even', random: 'random' }, label: '↳ distribution' },
        starFan: { value: D.starFan, min: 10, max: 360, step: 5, label: '↳ fan width (°, aimed)' },
        starRadius: { value: D.starRadius, min: 10, max: 500, step: 5, label: '↳ burst radius (px)' },
        starLength: { value: D.starLength, min: 4, max: 200, step: 1, label: '↳ stroke length (px)' },
        starWidth: { value: D.starWidth, min: 0.5, max: 16, step: 0.5, label: '↳ stroke width (px)' },
        starDuration: { value: D.starDuration, min: 0.1, max: 2, step: 0.05, label: '↳ duration (s)' },
        starColor: { value: D.starColor, label: '↳ colour' },
        cannonY: { value: D.cannonY, min: 0, max: 1, step: 0.01, label: 'side cannons: height (0.5 = middle)' },
        cannonOffsetY: { value: D.cannonOffsetY, min: -400, max: 400, step: 2, label: '↳ offset (px, + = lower)' },
        cannonAimX: { value: D.cannonAimX, min: 0, max: 1.5, step: 0.01, label: '↳ aim in (× way to middle)' },
        cannonAimBy: { value: D.cannonAimBy, options: { 'launch angle': 'angle', 'aim at a height': 'height' }, label: '↳ aim by' },
        cannonAngle: { value: D.cannonAngle, min: 0, max: 85, step: 1, label: '↳ launch angle (° up)' },
        cannonKeepHeight: { value: D.cannonKeepHeight, label: '↳ keep the phone’s height on wider screens' },
        cannonAimY: { value: D.cannonAimY, min: -400, max: 400, step: 2, label: '↳ aim height (px, height mode)' },
        cannonTime: { value: D.cannonTime, min: 0.1, max: 2, step: 0.05, label: '↳ time to target (s)' },
        cannonPower: { value: D.cannonPower, min: 0.3, max: 2, step: 0.05, label: '↳ power (1 = lands on target)' },
        cannonSpeedVar: { value: D.cannonSpeedVar, min: 0, max: 0.9, step: 0.05, label: '↳ speed spread' },
        cannonOrder: { value: D.cannonOrder, options: { 'random side first': 'random', alternate: 'alternate', together: 'together' }, label: '↳ firing order' },
        cannonStagger: { value: D.cannonStagger, min: 0, max: 1, step: 0.01, label: '↳ gap between sides (s)' },
        cannonJitter: { value: D.cannonJitter, min: 0, max: 0.5, step: 0.01, label: '↳ timing jitter ± (s)' },
        popExit: {
          value: D.popExit,
          options: { 'fade + shrink': 'fadeShrink', fade: 'fade', shrink: 'shrink', off: 'off' },
          label: 'exit',
        },
        popExitStart: { value: D.popExitStart, min: 0, max: 5, step: 0.05, label: '↳ starts after (s)' },
        popExitDuration: { value: D.popExitDuration, min: 0.05, max: 3, step: 0.05, label: '↳ takes (s)' },
        popExitVar: { value: D.popExitVar, min: 0, max: 1, step: 0.05, label: '↳ randomness' },
      },
      { collapsed: false },
    ),
    rain: folder(
      {
        rainRate: { value: D.rainRate, min: 5, max: 400, step: 5, label: 'pieces / s' },
        rainDuration: { value: D.rainDuration, min: 0.2, max: 10, step: 0.1, label: 'duration (s)' },
        rainLoop: { value: D.rainLoop, label: 'loop (until stopped)' },
        rainFadeZone: { value: D.rainFadeZone, min: 0, max: 0.5, step: 0.01, label: 'fade at bottom (× height)' },
        rainSpread: { value: D.rainSpread, min: 0.1, max: 1, step: 0.05, label: 'spread (× width)' },
        rainSpeed: { value: D.rainSpeed, min: 0, max: 1200, step: 10, label: 'start speed (px/s)' },
      },
      { collapsed: true },
    ),
    physics: folder(
      {
        rainGravity: { value: D.rainGravity, min: 0, max: 20, step: 0.1, label: 'rain: gravity (m/s²)' },
        rainDrag: { value: D.rainDrag, min: 0, max: 8, step: 0.05, label: 'rain: air drag (float)' },
        popGravity: { value: D.popGravity, min: 0, max: 20, step: 0.1, label: 'bursts: gravity (m/s²)' },
        popFallVar: { value: D.popFallVar, min: 0, max: 1, step: 0.05, label: 'bursts: fall speed variation' },
        rainFallVar: { value: D.rainFallVar, min: 0, max: 1, step: 0.05, label: 'rain: fall speed variation' },
        popDrag: { value: D.popDrag, min: 0, max: 8, step: 0.05, label: 'bursts: air drag (throw + float)' },
        terminalVelocity: { value: D.terminalVelocity, min: 0, max: 2000, step: 10, label: 'top fall speed (px/s)' },
        wind: { value: D.wind, min: -600, max: 600, step: 10, label: 'wind (px/s²)' },
        flutterAmp: { value: D.flutterAmp, min: 0, max: 80, step: 1, label: 'flutter (px)' },
        flutterFreq: { value: D.flutterFreq, min: 0, max: 4, step: 0.05, label: '↳ per second' },
        spinMin: { value: D.spinMin, min: 0, max: 720, step: 5, label: 'spin min (°/s)' },
        spinMax: { value: D.spinMax, min: 0, max: 1440, step: 5, label: 'spin max (°/s)' },
        flipMin: { value: D.flipMin, min: 0, max: 6, step: 0.05, label: '3D flip min (turns/s)' },
        flipMax: { value: D.flipMax, min: 0, max: 8, step: 0.05, label: '3D flip max (turns/s)' },
      },
      { collapsed: true },
    ),
    pieces: folder(
      {
        gShare: { value: D.gShare, min: 0, max: 1, step: 0.05, label: 'gold G share' },
        gSize: { value: D.gSize, min: 6, max: 120, step: 1, label: '↳ G size (px)' },
        gTint: { value: D.gTint, options: ['original', 'palette'], label: '↳ G colour' },
        dotShare: { value: D.dotShare, min: 0, max: 1, step: 0.05, label: 'dots (of paper)' },
        paperSize: { value: D.paperSize, min: 4, max: 60, step: 1, label: 'paper size (px)' },
        paperAspect: { value: D.paperAspect, min: 0.1, max: 1, step: 0.05, label: '↳ strip width ÷ length' },
        sizeVar: { value: D.sizeVar, min: 0, max: 0.9, step: 0.05, label: 'size variation' },
        palette: { value: D.palette, options: ['goldWhite', 'gold', 'grail', 'party'], label: 'palette' },
        backShade: { value: D.backShade, min: 0, max: 0.9, step: 0.05, label: 'back face darker by' },
      },
      { collapsed: true },
    ),
    life: folder(
      {
        lifeMin: { value: D.lifeMin, min: 0.5, max: 10, step: 0.1, label: 'burst life min (s)' },
        lifeMax: { value: D.lifeMax, min: 0.5, max: 12, step: 0.1, label: 'burst life max (s)' },
        fadeOut: { value: D.fadeOut, min: 0, max: 3, step: 0.05, label: 'fade out (s)' },
        maxPieces: { value: D.maxPieces, min: 50, max: 3000, step: 50, label: 'max pieces' },
        countVsWidth: { value: D.countVsWidth, min: 0, max: 1, step: 0.05, label: 'more pieces on wider screens' },
      },
      { collapsed: true },
    ),
  }), { order: 2 })

  const restored = useRef(false)
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const saved = savedSettings()
    if (saved) set(saved as unknown as Parameters<typeof set>[0])
  }, [set])

  const values = v as unknown as Record<string, string | number | boolean>
  const config = Object.fromEntries(Object.keys(D).map((k) => [k, values[k]])) as unknown as ConfettiConfig

  const json = buildConfettiJsonSpec(config)
  const copy = useLiveCopy({ json, config: stringifyConfig(config) })
  const liveConfig = useRef(config)
  liveConfig.current = config

  const load = (preset: keyof typeof CONFETTI_PRESETS) => {
    set(CONFETTI_PRESETS[preset] as unknown as Parameters<typeof set>[0])
    setFire((n) => n + 1)
  }

  useControls('Export', {
    '★ save settings': button(() => {
      try {
        localStorage.setItem(SLOT_KEY, JSON.stringify(liveConfig.current))
      } catch {
        /* storage blocked */
      }
    }),
    'reset to code default': button(() => {
      try {
        localStorage.removeItem(SLOT_KEY)
      } catch {
        /* ignore */
      }
      set({ ...D } as unknown as Parameters<typeof set>[0])
      replay()
    }),
    '🎆 fire': button(() => setFire((n) => n + 1)),
    '■ stop rain': button(() => setStop((n) => n + 1)),
    '▶ load "fireworks"': button(() => load('fireworks')),
    '▶ load "side cannons"': button(() => load('cannons')),
    '▶ load "gold rain"': button(() => load('goldRain')),
    '↻ clear + replay': button(() => replay()),
    'copy JSON tokens': button(copy('json')),
    'copy config (for defaults)': button(copy('config')),
  }, { order: 3 }) // Export stays last, whichever bench creates it first

  const runKey = [nonce, viewport].join('|')
  const frameWidth =
    viewport === 'phone' ? '390px' : viewport === 'tablet' ? '720px' : 'min(1100px, 100%)'

  return (
    <>
      <div
        className='stage'
        data-bg={stage.background}
        style={{ '--ember': stage.emberColor, '--ember-spread': `${stage.emberSpread}%` } as CSSProperties}
      >
        <SpecsToggle />
        <button type='button' className='stage-replay' onClick={replay}>
          ↻ Clear + replay
        </button>
        <button type='button' className='stage-replay stage-replay--alt' onClick={() => setFire((n) => n + 1)}>
          🎆 Fire
        </button>
        <button type='button' className='stage-replay stage-replay--alt2' onClick={() => load('fireworks')}>
          Fireworks
        </button>
        <button type='button' className='stage-replay stage-replay--alt3' onClick={() => load('cannons')}>
          Side cannons
        </button>
        <button type='button' className='stage-replay stage-replay--alt4' onClick={() => load('goldRain')}>
          Gold rain
        </button>
        <div className='confetti-stage-inner'>
          <div className='confetti-frame' style={{ width: frameWidth }} data-viewport={viewport}>
            <Confetti key={runKey} runKey={runKey} config={config} paused={stage.paused} fireSignal={fire} stopSignal={stop} />
          </div>
        </div>
      </div>

      <div className='dock'>
        <SpecCard title='Confetti JSON tokens' text={json} />
      </div>
    </>
  )
}
