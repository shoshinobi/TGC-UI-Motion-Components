import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useControls, folder, button } from 'leva'
import { GemReveal, GEM_DEFAULT_CONFIG, type GemRevealConfig } from '@/components/GemReveal'
import { GEM_GRADES } from '@/lib/gemTiers'
import { buildGemJsonSpec, buildGemReactSpec } from '@/lib/buildGemSpec'
import { SpecCard, stringifyConfig, useLiveCopy } from '@/components/SpecCard'

const D = GEM_DEFAULT_CONFIG
const GRADE_OPTIONS = Object.fromEntries(GEM_GRADES.map((g) => [g.label, g.key]))
const PUNCH_FLASH_OPTIONS = { off: 'off', 'current grade': 'current', ...GRADE_OPTIONS }
const EASE_OPTIONS = ['linear', 'easeIn', 'easeOut', 'easeInOut']

/** "★ save settings" persists an in-progress tune before it's baked into the default. */
const SLOT_KEY = 'tgc-bench:gem'

function flatDefaults() {
  return { ...D }
}

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

export function GemBench() {
  const [nonce, setNonce] = useState(0)
  const [punch, setPunch] = useState(0)
  const [flash, setFlash] = useState(0)
  const [streak, setStreak] = useState(0)
  const [phase, setPhase] = useState<'armed' | 'reveal' | 'locked'>('armed')

  const replay = () => {
    setPhase('armed')
    setNonce((k) => k + 1)
  }

  const stage = useControls('Stage', {
    background: { value: 'ember', options: ['dark', 'light', 'ember'] },
    emberColor: { value: '#3a1512', label: 'ember colour' },
    emberSpread: { value: 60, min: 10, max: 140, step: 2, label: 'ember spread (%)' },
    paused: false,
  })

  const [v, set] = useControls('Gem', () => ({
    'colour / token': folder({
      tier: { value: D.tier, options: GRADE_OPTIONS, label: 'grade' },
      autoCycle: { value: D.autoCycle, label: 'auto-cycle grades' },
      cycleInterval: { value: D.cycleInterval, min: 0.05, max: 4, step: 0.05, label: 'start interval (s)' },
      cycleRamp: { value: D.cycleRamp, min: 0, max: 1, step: 0.05, label: 'speed-up ramp' },
      cycleMinInterval: { value: D.cycleMinInterval, min: 0.03, max: 1, step: 0.01, label: 'min interval (s)' },
      cycleFlash: { value: D.cycleFlash, label: 'white-flash between' },
      'grade colours': folder(
        {
          gcHolyGrail: { value: D.gcHolyGrail, label: 'Holy Grail' },
          gcMythic: { value: D.gcMythic, label: 'Mythic' },
          gcIllustrious: { value: D.gcIllustrious, label: 'Illustrious' },
          gcStoried: { value: D.gcStoried, label: 'Storied' },
          gcRenowned: { value: D.gcRenowned, label: 'Renowned' },
          gcNotable: { value: D.gcNotable, label: 'Notable' },
        },
        { collapsed: true },
      ),
    }),
    playback: folder({
      revealLoopSpeed: { value: D.revealLoopSpeed, min: 0.1, max: 4, step: 0.05, label: 'reveal loop speed ×' },
      loopSpeed: { value: D.loopSpeed, min: 0.1, max: 4, step: 0.05, label: 'locked loop speed ×' },
    }),
    entry: folder({
      entryDistance: { value: D.entryDistance, min: 0, max: 1200, step: 10, label: 'from below (px)' },
      entryScale: { value: D.entryScale, min: 0, max: 1, step: 0.02, label: 'from scale' },
      entryDelay: { value: D.entryDelay, min: 0, max: 2, step: 0.02, label: 'delay (s)' },
      entryStiffness: { value: D.entryStiffness, min: 20, max: 900, step: 5, label: 'spring stiffness' },
      entryDamping: { value: D.entryDamping, min: 2, max: 60, step: 1, label: 'spring damping' },
      entryMass: { value: D.entryMass, min: 0.2, max: 4, step: 0.1, label: 'spring mass' },
    }),
    hover: folder(
      {
        hover: { value: D.hover, label: 'sine hover' },
        hoverAmpX: { value: D.hoverAmpX, min: 0, max: 80, step: 1, label: 'amp X (px)' },
        hoverAmpY: { value: D.hoverAmpY, min: 0, max: 80, step: 1, label: 'amp Y (px)' },
        hoverFreqX: { value: D.hoverFreqX, min: 0, max: 2, step: 0.01, label: 'freq X (Hz)' },
        hoverFreqY: { value: D.hoverFreqY, min: 0, max: 2, step: 0.01, label: 'freq Y (Hz)' },
        hoverRotate: { value: D.hoverRotate, min: 0, max: 20, step: 0.5, label: 'rotate sway (°)' },
        hoverWander: { value: D.hoverWander, min: 0, max: 1, step: 0.05, label: 'randomness' },
      },
      { collapsed: true },
    ),
    'scale + punch': folder(
      {
        scale: { value: D.scale, min: 0.2, max: 3, step: 0.02, label: 'rest scale' },
        punchTo: { value: D.punchTo, min: 0.5, max: 12, step: 0.1, label: 'punch to ×' },
        punchMode: { value: D.punchMode, options: ['spring', 'tween'], label: 'punch model' },
        punchStiffness: { value: D.punchStiffness, min: 40, max: 1200, step: 10, label: 'spring: stiffness' },
        punchDamping: { value: D.punchDamping, min: 2, max: 60, step: 1, label: 'spring: damping' },
        punchInDuration: { value: D.punchInDuration, min: 0.01, max: 2, step: 0.01, label: 'tween: in (s)' },
        punchInEase: { value: D.punchInEase, options: EASE_OPTIONS, label: 'tween: in ease' },
        punchHold: { value: D.punchHold, min: 0, max: 2, step: 0.01, label: 'tween: hold at full (s)' },
        punchOutDuration: { value: D.punchOutDuration, min: 0.01, max: 3, step: 0.01, label: 'tween: out (s)' },
        punchOutEase: { value: D.punchOutEase, options: EASE_OPTIONS, label: 'tween: out ease' },
        punchFlash: { value: D.punchFlash, options: PUNCH_FLASH_OPTIONS, label: 'apex colour flash' },
        punchFlashDuration: { value: D.punchFlashDuration, min: 0.05, max: 1, step: 0.01, label: '↳ flash (s)' },
      },
      { collapsed: true },
    ),
    'white flash': folder(
      {
        flashHold: { value: D.flashHold, min: 0, max: 0.6, step: 0.01, label: 'hold full (s)' },
        flashDuration: { value: D.flashDuration, min: 0.05, max: 2, step: 0.02, label: 'decay (s)' },
        flashBlur: { value: D.flashBlur, min: 0, max: 60, step: 1, label: 'blur / bloom (px)' },
        flashGlow: { value: D.flashGlow, min: 0, max: 3, step: 0.1, label: 'glow spike ×' },
        flashStreaks: { value: D.flashStreaks, label: 'emit gem streaks' },
        revealFlash: { value: D.revealFlash, label: 'flash on entering the loop' },
        revealFlashDelay: { value: D.revealFlashDelay, min: 0, max: 2, step: 0.02, label: '↳ delay after arrival (s)' },
      },
      { collapsed: true },
    ),
    glow: folder({
      glow: { value: D.glow, label: 'glow (follows gem)' },
      glowColor: { value: D.glowColor, label: 'colour (tier / hex)' },
      glowIntensity: { value: D.glowIntensity, min: 0, max: 6, step: 0.1, label: 'intensity' },
      glowReach: { value: D.glowReach, min: 0.5, max: 4, step: 0.05, label: 'reach (× gem)' },
      glowSize: { value: D.glowSize, min: 0, max: 200, step: 1, label: 'blur (px)' },
      glowStrength: { value: D.glowStrength, min: 1, max: 4, step: 1, label: 'core passes' },
      glowPulse: { value: D.glowPulse, min: 0, max: 4, step: 0.05, label: 'pulse (Hz)' },
    }),
    'gem streaks': folder({
      streaks: { value: D.streaks, label: 'radial streak burst' },
      streakCount: { value: D.streakCount, min: 2, max: 24, step: 1, label: 'count' },
      streakSpeed: { value: D.streakSpeed, min: 40, max: 2000, step: 20, label: 'speed (px/s)' },
      streakDecel: { value: D.streakDecel, min: 0, max: 1, step: 0.02, label: 'deceleration' },
      streakDelay: { value: D.streakDelay, min: 0, max: 1.5, step: 0.02, label: 'delay after land (s)' },
      streakLength: { value: D.streakLength, min: 4, max: 120, step: 1, label: 'length (px)' },
      streakWidth: { value: D.streakWidth, min: 1, max: 20, step: 0.5, label: 'width (px)' },
      streakOpacity: { value: D.streakOpacity, min: 0.05, max: 1, step: 0.05, label: 'opacity' },
      streakLife: { value: D.streakLife, min: 0.1, max: 2, step: 0.05, label: 'life (s)' },
      streakColor: { value: D.streakColor, label: 'colour (tier / hex)' },
      streakOnReveal: { value: D.streakOnReveal, label: 'fire on reveal' },
      streakOnPunch: { value: D.streakOnPunch, label: 'fire on punch apex' },
      streakLoop: { value: D.streakLoop, label: 'loop during reveal' },
      streakLoopInterval: { value: D.streakLoopInterval, min: 0.15, max: 3, step: 0.05, label: '↳ interval (s)' },
    }),
    'warp streaks': folder(
      {
        warp: { value: D.warp, label: 'upward-flight lines' },
        warpCount: { value: D.warpCount, min: 0, max: 160, step: 2, label: 'count' },
        warpSpeed: { value: D.warpSpeed, min: 100, max: 3000, step: 20, label: 'speed (px/s)' },
        warpSpeedVar: { value: D.warpSpeedVar, min: 0, max: 1, step: 0.05, label: '↳ speed variation' },
        warpLength: { value: D.warpLength, min: 10, max: 400, step: 5, label: 'length (px)' },
        warpWidth: { value: D.warpWidth, min: 0.5, max: 12, step: 0.5, label: 'width (px)' },
        warpColor: { value: D.warpColor, label: 'colour (tier / hex)' },
        warpColorVar: { value: D.warpColorVar, min: 0, max: 1, step: 0.05, label: '↳ colour variation' },
        warpOpacity: { value: D.warpOpacity, min: 0.02, max: 1, step: 0.02, label: 'opacity' },
        warpOpacityVar: { value: D.warpOpacityVar, min: 0, max: 1, step: 0.05, label: '↳ opacity variation' },
        warpOnDelay: { value: D.warpOnDelay, min: 0, max: 3, step: 0.02, label: 'fade-on delay (after centre) (s)' },
        warpOnDuration: { value: D.warpOnDuration, min: 0.05, max: 3, step: 0.05, label: 'fade-on (s)' },
      },
      { collapsed: true },
    ),
    jet: folder(
      {
        jet: { value: D.jet, label: 'jet stream' },
        jetTracks: { value: D.jetTracks, min: 1, max: 2, step: 1, label: 'tracks' },
        jetTrackWidth: { value: D.jetTrackWidth, min: 4, max: 240, step: 2, label: 'track width (px)' },
        jetSpacing: { value: D.jetSpacing, min: 0, max: 200, step: 2, label: 'spacing (2-track)' },
        jetLength: { value: D.jetLength, min: 0, max: 800, step: 10, label: 'length (px)' },
        jetTaper: { value: D.jetTaper, min: 0, max: 1, step: 0.02, label: 'taper' },
        jetOpacityStart: { value: D.jetOpacityStart, min: 0, max: 1, step: 0.02, label: 'opacity at gem' },
        jetOpacityEnd: { value: D.jetOpacityEnd, min: 0, max: 1, step: 0.02, label: 'opacity at tail' },
        jetFadeDelay: { value: D.jetFadeDelay, min: 0, max: 4, step: 0.05, label: 'fade delay after lock (s)' },
        jetFadeDuration: { value: D.jetFadeDuration, min: 0, max: 4, step: 0.05, label: 'fade duration (s)' },
        jetColor: { value: D.jetColor, label: 'colour (tier / hex)' },
      },
      { collapsed: true },
    ),
    'lock transition': folder(
      {
        lockWhiteBlast: { value: D.lockWhiteBlast, label: 'white blast before reveal' },
        lockWhiteBlastDuration: { value: D.lockWhiteBlastDuration, min: 0, max: 1.5, step: 0.02, label: '↳ blast build (s)' },
        lockPunchDelay: { value: D.lockPunchDelay, min: 0, max: 2, step: 0.02, label: 'punch/flash delay (s)' },
        lockSpeedDelay: { value: D.lockSpeedDelay, min: 0, max: 3, step: 0.02, label: 'speed revert delay (s)' },
        lockSpeedDuration: { value: D.lockSpeedDuration, min: 0, max: 5, step: 0.05, label: 'speed revert (s)' },
        lockSpeedEase: { value: D.lockSpeedEase, options: EASE_OPTIONS, label: '↳ ease' },
        lockFadeDuration: { value: D.lockFadeDuration, min: 0, max: 4, step: 0.05, label: 'streak/warp fade (s)' },
        lockFadeEase: { value: D.lockFadeEase, options: EASE_OPTIONS, label: '↳ ease' },
      },
      { collapsed: true },
    ),
    'grade button': folder(
      {
        button: { value: D.button, label: 'folded button on lock' },
        buttonLabelOverride: { value: D.buttonLabelOverride, label: 'label (blank = tier name)' },
        buttonOffsetX: { value: D.buttonOffsetX, min: -200, max: 200, step: 1, label: 'offset X (px)' },
        buttonOffsetY: { value: D.buttonOffsetY, min: -120, max: 160, step: 1, label: 'offset Y — overlap (px)' },
        buttonDelay: { value: D.buttonDelay, min: 0, max: 2, step: 0.02, label: 'delay after lock (s)' },
        buttonFromScale: { value: D.buttonFromScale, min: 0, max: 1.5, step: 0.05, label: 'from scale' },
        buttonFromRotate: { value: D.buttonFromRotate, min: -45, max: 45, step: 1, label: 'from rotate (°)' },
        buttonRotate: { value: D.buttonRotate, min: -20, max: 20, step: 0.5, label: 'settled rotate (°)' },
        buttonSize: { value: D.buttonSize, min: 0.5, max: 6, step: 0.1, label: 'size (crisp)' },
        buttonScale: { value: D.buttonScale, min: 0.3, max: 2.5, step: 0.05, label: 'settled scale (pop)' },
        buttonStiffness: { value: D.buttonStiffness, min: 40, max: 1200, step: 10, label: 'spring stiffness' },
        buttonDamping: { value: D.buttonDamping, min: 2, max: 60, step: 1, label: 'spring damping' },
        buttonMass: { value: D.buttonMass, min: 0.2, max: 4, step: 0.1, label: 'spring mass' },
      },
      { collapsed: true },
    ),
  }))

  const restored = useRef(false)
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const saved = savedSettings()
    if (saved) {
      set(saved as unknown as Parameters<typeof set>[0])
      replay()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set])

  const values = v as unknown as Record<string, string | number | boolean>
  const config = Object.fromEntries(Object.keys(D).map((k) => [k, values[k]])) as unknown as GemRevealConfig

  const json = buildGemJsonSpec(config)
  const react = buildGemReactSpec(config)
  const copy = useLiveCopy({ react, json, config: stringifyConfig(config) })

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
      set(flatDefaults() as unknown as Parameters<typeof set>[0])
      replay()
    }),
    'replay reveal': button(() => replay()),
    '🚀 launch': button(() => setPhase((p) => (p === 'armed' ? 'reveal' : p))),
    '🔒 lock grade': button(() => setPhase((p) => (p === 'reveal' ? 'locked' : p))),
    '✦ punch scale': button(() => setPunch((p) => p + 1)),
    '⚡ white flash': button(() => setFlash((f) => f + 1)),
    '✷ emit streaks': button(() => setStreak((s) => s + 1)),
    'copy lottie-web wiring': button(copy('react')),
    'copy JSON tokens': button(copy('json')),
    'copy config (for defaults)': button(copy('config')),
  })

  const runKey = [nonce, config.entryDistance, config.entryScale, config.entryDelay].join('|')

  return (
    <>
      <div
        className='stage'
        data-bg={stage.background}
        style={{ '--ember': stage.emberColor, '--ember-spread': `${stage.emberSpread}%` } as CSSProperties}
      >
        <button type='button' className='stage-replay' onClick={replay}>
          ↻ Replay reveal
        </button>
        <button
          type='button'
          className='stage-replay stage-replay--alt'
          onClick={() => setPhase('locked')}
          disabled={phase !== 'reveal'}
        >
          🔒 Lock grade
        </button>
        <button
          type='button'
          className='stage-replay stage-replay--alt2'
          onClick={() => setFlash((f) => f + 1)}
        >
          ⚡ White flash
        </button>
        <button
          type='button'
          className='stage-replay stage-replay--alt3'
          onClick={() => setPhase('reveal')}
          disabled={phase !== 'armed'}
        >
          🚀 Launch
        </button>
        <div className='gem-stage-inner'>
          <GemReveal
            key={runKey}
            config={config}
            paused={stage.paused}
            runKey={runKey}
            phase={phase}
            scaleSignal={punch}
            flashSignal={flash}
            streakSignal={streak}
          />
        </div>
      </div>

      <div className='dock'>
        <SpecCard title='lottie-web wiring (reference)' text={react} />
        <SpecCard title='JSON tokens' text={json} />
      </div>
    </>
  )
}
