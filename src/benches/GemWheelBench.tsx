import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useControls, folder, button } from 'leva'
import {
  GemWheel,
  WHEEL_DEFAULT_CONFIG,
  WHEEL_LABEL,
  WHEEL_ORDER,
  type GemWheelConfig,
  type WheelState,
} from '@/components/GemWheel'
import { buildGemWheelJsonSpec, buildGemWheelWiringSpec } from '@/lib/buildGemWheelSpec'
import { SpecCard, stringifyConfig, useLiveCopy } from '@/components/SpecCard'

const D = WHEEL_DEFAULT_CONFIG
const GRADE_OPTIONS = Object.fromEntries([...WHEEL_ORDER].reverse().map((g) => [WHEEL_LABEL[g], g]))
const EASE_OPTIONS = ['linear', 'easeIn', 'easeOut', 'easeInOut']
const MUSIC_OPTIONS = {
  off: 'off',
  random: 'random',
  'Belt and Braces': 'belt-and-braces',
  'Chasing Quails': 'chasing-quails',
}
const TEXT_OPTIONS = ['You found a gem.', 'Spin the wheel.']

const SLOT_KEY = 'tgc-bench:wheel'

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

function initialViewport(): string {
  if (typeof window === 'undefined') return 'phone'
  const vp = new URLSearchParams(window.location.search).get('vp')?.toLowerCase() ?? ''
  return vp === 'phone' || vp === 'tablet' || vp === 'full' ? vp : 'phone'
}

const STATE_LABEL: Record<WheelState, string> = {
  armed: 'armed — press Start',
  found: 'found',
  lineup: 'line-up',
  ready: 'ready — swipe or Spin',
  spinning: 'spinning',
  stopping: 'stopping',
  landed: 'landed',
}

export function GemWheelBench() {
  const [nonce, setNonce] = useState(0)
  const [start, setStart] = useState(0)
  const [lineup, setLineup] = useState(0)
  const [spin, setSpin] = useState(0)
  const [stop, setStop] = useState(0)
  const [wheelState, setWheelState] = useState<WheelState>('armed')

  const replay = () => setNonce((k) => k + 1)

  const stage = useControls('Stage', {
    viewport: { value: initialViewport(), options: ['phone', 'tablet', 'full'] },
    background: { value: 'ember', options: ['dark', 'light', 'ember'] },
    emberColor: { value: '#3a1512', label: 'ember colour' },
    emberSpread: { value: 60, min: 10, max: 140, step: 2, label: 'ember spread (%)' },
    paused: false,
  })

  const [v, set] = useControls('Wheel', () => ({
    result: folder({
      finalGrade: { value: D.finalGrade, options: GRADE_OPTIONS, label: 'lands on (preset)' },
    }),
    'grade colours': folder(
      {
        gcNotable: { value: D.gcNotable, label: 'Notable' },
        gcRenowned: { value: D.gcRenowned, label: 'Renowned' },
        gcStoried: { value: D.gcStoried, label: 'Storied' },
        gcIllustrious: { value: D.gcIllustrious, label: 'Illustrious' },
        gcMythic: { value: D.gcMythic, label: 'Mythic' },
        gcHolyGrail: { value: D.gcHolyGrail, label: 'Holy Grail' },
        foundColor: { value: D.foundColor, label: 'found gem' },
      },
      { collapsed: true },
    ),
    'found (1)': folder(
      {
        foundScale: { value: D.foundScale, min: 0.3, max: 3, step: 0.05, label: 'size × Holy Grail' },
        entryDistance: { value: D.entryDistance, min: 0, max: 1400, step: 10, label: 'from below (px)' },
        entryStiffness: { value: D.entryStiffness, min: 20, max: 900, step: 5, label: 'spring stiffness' },
        entryDamping: { value: D.entryDamping, min: 2, max: 80, step: 1, label: 'spring damping' },
        entryMass: { value: D.entryMass, min: 0.2, max: 5, step: 0.1, label: 'spring mass' },
        autoLineupAfter: { value: D.autoLineupAfter, min: 0, max: 10, step: 0.1, label: 'auto line-up after (s, 0 = trigger)' },
        foundFlash: { value: D.foundFlash, label: 'white flash on arrival' },
        foundFlashDelay: { value: D.foundFlashDelay, min: 0, max: 2, step: 0.05, label: '↳ delay after arrival (s)' },
      },
      { collapsed: true },
    ),
    text: folder(
      {
        text: { value: D.text, options: TEXT_OPTIONS, label: 'text' },
        promptText: { value: D.promptText, label: 'then show (blank = none)' },
        textSize: { value: D.textSize, min: 10, max: 48, step: 1, label: 'size (px)' },
        textGap: { value: D.textGap, min: 0, max: 80, step: 1, label: 'gap below gem (px)' },
        textInDelay: { value: D.textInDelay, min: 0, max: 3, step: 0.05, label: 'fade-in delay (s)' },
        textFade: { value: D.textFade, min: 0.05, max: 2, step: 0.05, label: 'fade (s)' },
        textOutDelay: { value: D.textOutDelay, min: 0, max: 3, step: 0.05, label: 'fade-out after line-up starts (s)' },
        promptDelay: { value: D.promptDelay, min: 0, max: 3, step: 0.05, label: 'prompt in after line-up (s)' },
      },
      { collapsed: true },
    ),
    'line-up (2)': folder(
      {
        gemSize: { value: D.gemSize, min: 40, max: 560, step: 1, label: 'Holy Grail size (px)' },
        sizeStep: { value: D.sizeStep, min: 0, max: 0.4, step: 0.01, label: 'shrink per grade down' },
        lineupDuration: { value: D.lineupDuration, min: 0.1, max: 3, step: 0.05, label: 'found → Notable (s)' },
        lineupEase: { value: D.lineupEase, options: EASE_OPTIONS, label: '↳ ease' },
        dropStagger: { value: D.dropStagger, min: 0, max: 0.6, step: 0.01, label: 'drop-in stagger (s)' },
        dropStiffness: { value: D.dropStiffness, min: 20, max: 900, step: 5, label: 'drop spring stiffness' },
        dropDamping: { value: D.dropDamping, min: 2, max: 80, step: 1, label: 'drop spring damping' },
        autoSpinAfter: { value: D.autoSpinAfter, min: 0, max: 10, step: 0.1, label: 'auto spin after (s, 0 = swipe)' },
      },
      { collapsed: true },
    ),
    'jet (entry trail)': folder(
      {
        jet: { value: D.jet, label: 'jet trail' },
        jetColor: { value: D.jetColor, label: 'colour' },
        jetTracks: { value: D.jetTracks, min: 1, max: 2, step: 1, label: 'tracks' },
        jetTrackWidth: { value: D.jetTrackWidth, min: 4, max: 200, step: 2, label: 'track width (px)' },
        jetSpacing: { value: D.jetSpacing, min: 0, max: 200, step: 2, label: 'spacing (2-track)' },
        jetLength: { value: D.jetLength, min: 0, max: 900, step: 10, label: 'length (px)' },
        jetTaper: { value: D.jetTaper, min: 0, max: 1, step: 0.02, label: 'taper' },
        jetOpacityStart: { value: D.jetOpacityStart, min: 0, max: 1, step: 0.02, label: 'opacity at gem' },
        jetOpacityEnd: { value: D.jetOpacityEnd, min: 0, max: 1, step: 0.02, label: 'opacity at tail' },
        jetFadeDelay: { value: D.jetFadeDelay, min: 0, max: 3, step: 0.05, label: 'retract after reaching centre (s)' },
        jetFadeDuration: { value: D.jetFadeDuration, min: 0.05, max: 3, step: 0.05, label: 'retract (s)' },
      },
      { collapsed: true },
    ),
    'warp (spin speed lines)': folder(
      {
        warp: { value: D.warp, label: 'speed lines' },
        warpCount: { value: D.warpCount, min: 0, max: 160, step: 2, label: 'count' },
        warpSpeedScale: { value: D.warpSpeedScale, min: 0.1, max: 5, step: 0.05, label: 'speed × wheel' },
        warpSpeedVar: { value: D.warpSpeedVar, min: 0, max: 1, step: 0.05, label: '↳ speed variation' },
        warpLength: { value: D.warpLength, min: 10, max: 600, step: 5, label: 'length (px)' },
        warpWidth: { value: D.warpWidth, min: 0.5, max: 12, step: 0.5, label: 'width (px)' },
        warpColor: { value: D.warpColor, label: 'colour' },
        warpColorVar: { value: D.warpColorVar, min: 0, max: 1, step: 0.05, label: '↳ colour variation' },
        warpOpacity: { value: D.warpOpacity, min: 0.02, max: 1, step: 0.02, label: 'opacity' },
        warpOpacityVar: { value: D.warpOpacityVar, min: 0, max: 1, step: 0.05, label: '↳ opacity variation' },
        warpFade: { value: D.warpFade, min: 0.05, max: 2, step: 0.05, label: 'fade in / out (s)' },
      },
      { collapsed: true },
    ),
    'strip (spacing + fade)': folder(
      {
        lineupFit: { value: D.lineupFit, label: 'fit line-up to stage' },
        lineupMargin: { value: D.lineupMargin, min: 0, max: 160, step: 1, label: '↳ margin top / bottom (px)' },
        slotSpacing: { value: D.slotSpacing, min: 20, max: 300, step: 1, label: 'slot spacing (px, not fitted)' },
        lineupCenter: { value: D.lineupCenter, min: 0, max: 5, step: 0.05, label: 'line-up centre (slot, not fitted)' },
        fadeSlots: { value: D.fadeSlots, min: 0.1, max: 4, step: 0.05, label: 'fade beyond line-up (slots)' },
        repeats: { value: D.repeats, min: 1, max: 4, step: 1, label: 'sequence repeats' },
      },
      { collapsed: true },
    ),
    'spin (3)': folder(
      {
        spinDirection: { value: D.spinDirection, options: ['down', 'up'], label: 'auto direction' },
        cruiseSpeed: { value: D.cruiseSpeed, min: 1, max: 40, step: 0.5, label: 'auto speed (slots/s)' },
        spinUpDuration: { value: D.spinUpDuration, min: 0, max: 3, step: 0.05, label: 'auto ease-in (s)' },
        spinDuration: { value: D.spinDuration, min: 0, max: 15, step: 0.1, label: 'spin before slowdown (s)' },
        flickGain: { value: D.flickGain, min: 0.1, max: 4, step: 0.05, label: 'flick → speed ×' },
        flickMin: { value: D.flickMin, min: 0.5, max: 20, step: 0.5, label: 'flick min (slots/s)' },
        flickMax: { value: D.flickMax, min: 2, max: 60, step: 0.5, label: 'flick max (slots/s)' },
        flickThreshold: { value: D.flickThreshold, min: 0, max: 2000, step: 10, label: 'flick threshold (px/s)' },
      },
      { collapsed: true },
    ),
    'stop + suspense (4–5)': folder(
      {
        stopDuration: { value: D.stopDuration, min: 0.3, max: 8, step: 0.1, label: 'slowdown (≈ s)' },
        stopEasePower: { value: D.stopEasePower, min: 1.5, max: 6, step: 0.1, label: 'ease-out power' },
        extraLoops: { value: D.extraLoops, min: 0, max: 4, step: 1, label: 'extra loops' },
        overshoot: { value: D.overshoot, min: 0, max: 0.95, step: 0.01, label: 'go past by (slots, 0.5 = division line)' },
        overshootHold: { value: D.overshootHold, min: 0, max: 2, step: 0.05, label: 'hang there (s)' },
        snapStiffness: { value: D.snapStiffness, min: 20, max: 1200, step: 10, label: 'snap-back stiffness' },
        snapDamping: { value: D.snapDamping, min: 2, max: 80, step: 1, label: 'snap-back damping' },
      },
      { collapsed: true },
    ),
    'landing (6)': folder(
      {
        flashDelay: { value: D.flashDelay, min: 0, max: 1.5, step: 0.01, label: 'flash delay (s)' },
        flashHold: { value: D.flashHold, min: 0, max: 1, step: 0.01, label: 'flash hold (s)' },
        flashDuration: { value: D.flashDuration, min: 0.05, max: 2, step: 0.01, label: 'flash decay (s)' },
        flashBlur: { value: D.flashBlur, min: 0, max: 100, step: 1, label: 'flash bloom (px)' },
        othersFade: { value: D.othersFade, min: 0.05, max: 2, step: 0.05, label: 'others fade (s)' },
        winnerScale: { value: D.winnerScale, min: 0.3, max: 3, step: 0.05, label: 'winner size × Holy Grail' },
        growStiffness: { value: D.growStiffness, min: 20, max: 900, step: 5, label: 'grow stiffness' },
        growDamping: { value: D.growDamping, min: 2, max: 80, step: 1, label: 'grow damping' },
        glow: { value: D.glow, label: 'glow' },
        glowSize: { value: D.glowSize, min: 0, max: 200, step: 2, label: '↳ size (px)' },
        glowIntensity: { value: D.glowIntensity, min: 0, max: 3, step: 0.05, label: '↳ intensity' },
      },
      { collapsed: true },
    ),
    'grade label': folder(
      {
        label: { value: D.label, label: 'folded label on landing' },
        labelOverride: { value: D.labelOverride, label: 'text (blank = grade name)' },
        labelDelay: { value: D.labelDelay, min: 0, max: 2, step: 0.02, label: 'delay after flash (s)' },
        labelOffsetY: { value: D.labelOffsetY, min: -120, max: 160, step: 1, label: 'offset Y — overlap (px)' },
        labelSize: { value: D.labelSize, min: 0.5, max: 6, step: 0.1, label: 'size (crisp)' },
        labelFromScale: { value: D.labelFromScale, min: 0, max: 2, step: 0.05, label: 'from scale' },
        labelFromRotate: { value: D.labelFromRotate, min: -45, max: 45, step: 1, label: 'from rotate (°)' },
        labelRotate: { value: D.labelRotate, min: -20, max: 20, step: 0.5, label: 'settled rotate (°)' },
        labelStiffness: { value: D.labelStiffness, min: 40, max: 1200, step: 10, label: 'spring stiffness' },
        labelDamping: { value: D.labelDamping, min: 2, max: 80, step: 1, label: 'spring damping' },
        labelMass: { value: D.labelMass, min: 0.2, max: 4, step: 0.1, label: 'spring mass' },
      },
      { collapsed: true },
    ),
    'line work': folder(
      {
        lines: { value: D.lines, label: 'slot lines' },
        lineColor: { value: D.lineColor, label: 'colour' },
        lineOpacity: { value: D.lineOpacity, min: 0, max: 1, step: 0.01, label: 'opacity' },
        lineWidth: { value: D.lineWidth, min: 0.5, max: 6, step: 0.5, label: 'width (px)' },
        lineHalfWidth: { value: D.lineHalfWidth, min: 30, max: 400, step: 2, label: 'line half-width (px)' },
        lineSideFade: { value: D.lineSideFade, min: 0, max: 1, step: 0.05, label: 'fade toward ends from' },
        bracket: { value: D.bracket, label: 'centre arrows' },
        bracketHalfWidth: { value: D.bracketHalfWidth, min: 20, max: 300, step: 2, label: '↳ distance from centre (px)' },
        bracketColor: { value: D.bracketColor, label: '↳ colour' },
        bracketOpacity: { value: D.bracketOpacity, min: 0, max: 1, step: 0.05, label: '↳ opacity' },
      },
      { collapsed: true },
    ),
    'gem animation': folder(
      {
        restFrame: { value: D.restFrame, min: 0, max: 59, step: 1, label: 'wheel rest frame' },
        spriteRes: { value: D.spriteRes, min: 128, max: 512, step: 32, label: 'cached res (px)' },
        loopSpeed: { value: D.loopSpeed, min: 0.1, max: 4, step: 0.05, label: 'spin speed × (found + winner)' },
        hoverAmp: { value: D.hoverAmp, min: 0, max: 40, step: 1, label: 'hover amp (px)' },
        hoverFreq: { value: D.hoverFreq, min: 0, max: 2, step: 0.01, label: 'hover freq (Hz)' },
        hoverStagger: { value: D.hoverStagger, min: 0, max: 1, step: 0.01, label: 'hover stagger' },
      },
      { collapsed: true },
    ),
    sound: folder(
      {
        sound: { value: D.sound, label: 'sound on' },
        volume: { value: D.volume, min: 0, max: 1, step: 0.05, label: 'SFX volume' },
        ambient: { value: D.ambient, label: 'ambient loop' },
        tickVolume: { value: D.tickVolume, min: 0, max: 1, step: 0.05, label: 'tick volume' },
        tickPitchMin: { value: D.tickPitchMin, min: 0.25, max: 3, step: 0.05, label: 'tick rate at rest' },
        tickPitchMax: { value: D.tickPitchMax, min: 0.25, max: 3, step: 0.05, label: 'tick rate at speed' },
        tickMaxRate: { value: D.tickMaxRate, min: 2, max: 40, step: 1, label: 'max ticks / s' },
        musicTrack: { value: D.musicTrack, options: MUSIC_OPTIONS, label: 'soundtrack' },
        musicVolume: { value: D.musicVolume, min: 0, max: 1, step: 0.05, label: '↳ volume' },
        musicLoop: { value: D.musicLoop, label: '↳ loop' },
        musicStart: { value: D.musicStart, options: ['start', 'spin', 'land'], label: '↳ starts on' },
        musicDelay: { value: D.musicDelay, min: 0, max: 10, step: 0.1, label: '↳ delay (s)' },
      },
      { collapsed: true },
    ),
  }))

  const restored = useRef(false)
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const saved = savedSettings()
    if (saved) set(saved as unknown as Parameters<typeof set>[0])
  }, [set])

  const values = v as unknown as Record<string, string | number | boolean>
  const config = Object.fromEntries(Object.keys(D).map((k) => [k, values[k]])) as unknown as GemWheelConfig

  const json = buildGemWheelJsonSpec(config)
  const wiring = buildGemWheelWiringSpec(config)
  const copy = useLiveCopy({ json, wiring, config: stringifyConfig(config) })
  const liveConfig = useRef(config)
  liveConfig.current = config

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
    '↻ replay': button(() => replay()),
    '▶ start': button(() => setStart((n) => n + 1)),
    '⇣ line up': button(() => setLineup((n) => n + 1)),
    '⟳ spin': button(() => setSpin((n) => n + 1)),
    '■ stop now': button(() => setStop((n) => n + 1)),
    'copy JSON tokens': button(copy('json')),
    'copy wiring reference': button(copy('wiring')),
    'copy config (for defaults)': button(copy('config')),
  })

  // anything baked into the cached sprites or the drum's slot count re-mounts
  const runKey = [
    nonce,
    config.repeats,
    config.restFrame,
    config.spriteRes,
    config.gcNotable,
    config.gcRenowned,
    config.gcStoried,
    config.gcIllustrious,
    config.gcMythic,
    config.gcHolyGrail,
    config.foundColor,
    config.musicTrack,
    stage.viewport,
  ].join('|')

  // a remount starts back at 'armed'
  useEffect(() => setWheelState('armed'), [runKey])

  const frameWidth =
    stage.viewport === 'phone' ? '390px' : stage.viewport === 'tablet' ? '720px' : 'min(1100px, 100%)'

  return (
    <>
      <div
        className='stage'
        data-bg={stage.background}
        style={{ '--ember': stage.emberColor, '--ember-spread': `${stage.emberSpread}%` } as CSSProperties}
      >
        <button type='button' className='stage-replay' onClick={replay}>
          ↻ Replay
        </button>
        <button
          type='button'
          className='stage-replay stage-replay--alt'
          onClick={() => setStart((n) => n + 1)}
          disabled={wheelState !== 'armed'}
        >
          ▶ Start
        </button>
        <button
          type='button'
          className='stage-replay stage-replay--alt2'
          onClick={() => setLineup((n) => n + 1)}
          disabled={wheelState !== 'found'}
        >
          ⇣ Line up
        </button>
        <button
          type='button'
          className='stage-replay stage-replay--alt3'
          onClick={() => setSpin((n) => n + 1)}
          disabled={wheelState !== 'ready'}
        >
          ⟳ Spin
        </button>
        <button
          type='button'
          className='stage-replay stage-replay--alt4'
          onClick={() => setStop((n) => n + 1)}
          disabled={wheelState !== 'spinning'}
        >
          ■ Stop now
        </button>
        <div className='stage-state' aria-live='polite'>
          {STATE_LABEL[wheelState]}
        </div>
        <button
          type='button'
          className='stage-audio'
          data-on={config.sound}
          aria-pressed={config.sound}
          title={config.sound ? 'Mute audio' : 'Unmute audio'}
          onClick={() => set({ sound: !config.sound } as Parameters<typeof set>[0])}
        >
          <svg viewBox='0 0 24 24' width='20' height='20' aria-hidden='true'>
            <path
              d='M4 9v6h4l5 4V5L8 9H4z'
              fill='currentColor'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinejoin='round'
            />
            {config.sound ? (
              <path
                d='M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.8'
                strokeLinecap='round'
              />
            ) : (
              <path d='M16.5 9.5l5 5m0-5l-5 5' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' />
            )}
          </svg>
        </button>
        <div className='wheel-stage-inner'>
          <div className='wheel-frame' style={{ width: frameWidth }} data-viewport={stage.viewport}>
            <GemWheel
              key={runKey}
              runKey={runKey}
              config={config}
              paused={stage.paused}
              startSignal={start}
              lineupSignal={lineup}
              spinSignal={spin}
              stopSignal={stop}
              onState={setWheelState}
            />
          </div>
        </div>
      </div>

      <div className='dock'>
        <SpecCard title='Gem Wheel wiring (reference)' text={wiring} />
        <SpecCard title='Gem Wheel JSON tokens' text={json} />
      </div>
    </>
  )
}
