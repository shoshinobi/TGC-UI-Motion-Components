import { useEffect, useRef } from 'react'
// SVG-only build — roughly half the weight of the full `lottie-web`.
import lottie from 'lottie-web/build/player/lottie_light'
import type { AnimationItem } from 'lottie-web'
import gemData from '@/assets/gem.json'
import { FoldableButton } from '@/components/banner-stubs'
import {
  FLASH_WHITE,
  GEM_GRADES,
  GEM_GRADE_KEYS,
  GRADE_COLOR_KEY,
  gradeHex,
  hexToRgb01,
  hexToRgba,
  shiftHue,
  type GemGrade,
} from '@/lib/gemTiers'

/**
 * Gem reveal — the looping `gem.lottie` (256×256, `gemColor` slot) pops up from
 * below and hovers in the centre. One `requestAnimationFrame` loop owns
 * everything: the entry + punch springs, the sine hover, the Lottie speed ramp,
 * the grade auto-cycle, and every effect (all drawn on one canvas behind the
 * gem, plus a diamond flash overlay on top).
 *
 * The gem colour is the Lottie slot `gemColor` (`slots.gemColor.p.k`, normalised
 * RGB). lottie-web resolves slots at load, so a grade change reloads the
 * animation at its current frame — cheap for a 32 KB JSON.
 *
 * Effects: **glow** (a blurred diamond that follows the gem silhouette),
 * **gem streaks** (the radial `GEM_streaks` starburst, fired on reveal / punch
 * apex / white flash / a manual trigger), **warp streaks** (vertical speed lines,
 * intensity gated by the gem's upward speed), **jet stream** (1–2 tapering tracks
 * that fade off from the gem end toward the tail a beat after landing). The
 * **white flash** whites out the whole gem shape, spikes the glow, and fires the
 * streak burst.
 */
export type GemRevealConfig = {
  // --- gem colour / token ---
  tier: GemGrade
  /** the `gemColor` slot value per grade — editable in the bench */
  gcHolyGrail: string
  gcMythic: string
  gcIllustrious: string
  gcStoried: string
  gcRenowned: string
  gcNotable: string
  autoCycle: boolean
  cycleInterval: number
  cycleRamp: number
  cycleMinInterval: number
  /** fire the white flash between grade changes */
  cycleFlash: boolean

  // --- Lottie playback (phase-driven) ---
  /** loop speed once the grade is locked */
  loopSpeed: number
  /** loop speed during the reveal loop (before lock) */
  revealLoopSpeed: number

  // --- entry ---
  entryDistance: number
  entryScale: number
  entryDelay: number
  entryStiffness: number
  entryDamping: number
  entryMass: number

  // --- hover ---
  hover: boolean
  hoverAmpX: number
  hoverAmpY: number
  hoverFreqX: number
  hoverFreqY: number
  hoverRotate: number
  hoverWander: number

  // --- scale + punch ---
  scale: number
  punchTo: number
  punchStiffness: number
  punchDamping: number
  /** colour flash at the peak of a punch: off / the current grade / a fixed grade */
  punchFlash: 'off' | 'current' | GemGrade
  punchFlashDuration: number

  // --- white flash (impact event) ---
  /** seconds held at full white before it decays */
  flashHold: number
  /** seconds the decay takes */
  flashDuration: number
  /** CSS blur on the flash overlay, px — softens the diamond edge into a bloom */
  flashBlur: number
  /** 0–3 — how hard the glow spikes with the flash */
  flashGlow: number
  /** fire the gem-streak burst on the flash */
  flashStreaks: boolean
  /** fire a white flash as the gem settles into the reveal loop (ambient — no punch) */
  revealFlash: boolean
  /** seconds after the gem arrives before that flash fires */
  revealFlashDelay: number

  // --- glow (follows the gem silhouette) ---
  glow: boolean
  glowColor: string
  /** blur radius, px */
  glowSize: number
  /** overall brightness multiplier — how visible the glow is */
  glowIntensity: number
  /** how far the soft halo extends past the gem (× the gem silhouette) */
  glowReach: number
  /** 1–4 stacked core passes — denser, more saturated core */
  glowStrength: number
  /** Hz — 0 = steady */
  glowPulse: number

  // --- gem streaks (radial burst) ---
  streaks: boolean
  streakCount: number
  /** initial outward speed, px/s */
  streakSpeed: number
  /** 0 = constant speed · 1 = snaps to a stop */
  streakDecel: number
  /** seconds after the gem lands before the reveal burst fires */
  streakDelay: number
  streakLength: number
  streakWidth: number
  streakOpacity: number
  /** seconds each streak takes to fade */
  streakLife: number
  streakColor: string
  streakOnReveal: boolean
  streakOnPunch: boolean
  /** keep firing bursts on an interval through the reveal loop */
  streakLoop: boolean
  /** seconds between reveal-loop bursts */
  streakLoopInterval: number

  // --- warp streaks (upward-flight speed lines, gated by the gem's speed) ---
  warp: boolean
  warpCount: number
  /** base downward speed, px/s */
  warpSpeed: number
  /** 0–1 per-streak speed variation */
  warpSpeedVar: number
  warpLength: number
  warpWidth: number
  warpColor: string
  /** 0–1 per-streak hue jitter */
  warpColorVar: number
  warpOpacity: number
  /** 0–1 per-streak opacity variation */
  warpOpacityVar: number

  // --- jet stream ---
  jet: boolean
  /** 1 or 2 tracks */
  jetTracks: number
  /** width of each track, px */
  jetTrackWidth: number
  /** gap between the two tracks, px (2-track only) */
  jetSpacing: number
  jetLength: number
  /** 0–1 how much each track narrows toward its end */
  jetTaper: number
  jetColor: string
  /** opacity at the gem end of the stream */
  jetOpacityStart: number
  /** opacity at the tail */
  jetOpacityEnd: number
  /** seconds after the gem lands before the fade-off begins */
  jetFadeDelay: number
  /** seconds the fade-off takes — it eats the stream from the gem end toward the tail */
  jetFadeDuration: number

  // --- lock transition (reveal → locked) ---
  /** seconds after the lock trigger before the punch + coupled white flash fire */
  lockPunchDelay: number
  /** seconds after lock before the loop-speed ease-down begins */
  lockSpeedDelay: number
  /** seconds for the loop speed to ease revealLoopSpeed → loopSpeed */
  lockSpeedDuration: number
  lockSpeedEase: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
  /** seconds for the gem + warp streaks to fade to nothing */
  lockFadeDuration: number
  lockFadeEase: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'

  // --- grade button (folded button, on lock) ---
  button: boolean
  /** empty = the locked grade's tier name */
  buttonLabelOverride: string
  buttonOffsetX: number
  /** px from the gem's bottom point to the button's top edge (negative = overlap) */
  buttonOffsetY: number
  /** seconds after lock before it springs in */
  buttonDelay: number
  buttonFromScale: number
  buttonFromRotate: number
  /** settled tilt, ° */
  buttonRotate: number
  /** settled scale */
  buttonScale: number
  buttonStiffness: number
  buttonDamping: number
  buttonMass: number
}

export const GEM_DEFAULT_CONFIG: GemRevealConfig = {
  tier: 'holyGrail',
  gcHolyGrail: '#ffbf00',
  gcMythic: '#974edb',
  gcIllustrious: '#035bdb',
  gcStoried: '#01fffc',
  gcRenowned: '#6a9394',
  gcNotable: '#da6821',
  autoCycle: true,
  cycleInterval: 0.05,
  cycleRamp: 1,
  cycleMinInterval: 0.5,
  cycleFlash: false,

  loopSpeed: 0.5,
  revealLoopSpeed: 2,

  entryDistance: 760,
  entryScale: 0,
  entryDelay: 0,
  entryStiffness: 380,
  entryDamping: 33,
  entryMass: 3.2,

  hover: true,
  hoverAmpX: 6,
  hoverAmpY: 28,
  hoverFreqX: 0,
  hoverFreqY: 0.27,
  hoverRotate: 2,
  hoverWander: 0.35,

  scale: 1,
  punchTo: 12,
  punchStiffness: 310,
  punchDamping: 25,
  punchFlash: 'current',
  punchFlashDuration: 0.48,

  flashHold: 0.22,
  flashDuration: 0.76,
  flashBlur: 50,
  flashGlow: 2.2,
  flashStreaks: true,
  revealFlash: false,
  revealFlashDelay: 0,

  glow: true,
  glowColor: 'tier',
  glowSize: 23,
  glowIntensity: 0.6,
  glowReach: 1.8,
  glowStrength: 2,
  glowPulse: 1,

  streaks: true,
  streakCount: 8,
  streakSpeed: 1400,
  streakDecel: 0.8,
  streakDelay: 0,
  streakLength: 32,
  streakWidth: 6,
  streakOpacity: 0.9,
  streakLife: 0.7,
  streakColor: '#ffffff',
  streakOnReveal: false,
  streakOnPunch: true,
  streakLoop: false,
  streakLoopInterval: 0.9,

  warp: true,
  warpCount: 42,
  warpSpeed: 3000,
  warpSpeedVar: 0.25,
  warpLength: 255,
  warpWidth: 3,
  warpColor: '#ffffff',
  warpColorVar: 1,
  warpOpacity: 0.36,
  warpOpacityVar: 1,

  jet: true,
  jetTracks: 2,
  jetTrackWidth: 28,
  jetSpacing: 24,
  jetLength: 620,
  jetTaper: 0,
  jetColor: 'tier',
  jetOpacityStart: 0.6,
  jetOpacityEnd: 0,
  jetFadeDelay: 0.65,
  jetFadeDuration: 0.4,

  lockPunchDelay: 0,
  lockSpeedDelay: 0,
  lockSpeedDuration: 0.7,
  lockSpeedEase: 'easeIn',
  lockFadeDuration: 0.9,
  lockFadeEase: 'easeIn',

  button: true,
  buttonLabelOverride: '',
  buttonOffsetX: 0,
  buttonOffsetY: -14,
  buttonDelay: 0.75,
  buttonFromScale: 1.5,
  buttonFromRotate: -6,
  buttonRotate: 2,
  buttonScale: 1,
  buttonStiffness: 230,
  buttonDamping: 38,
  buttonMass: 2.7,
}

const TAU = Math.PI * 2
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** the (bench-overridable) colour for a grade */
function gradeColor(cfg: GemRevealConfig, grade: GemGrade): string {
  const key = GRADE_COLOR_KEY[grade] as keyof GemRevealConfig
  const v = cfg[key]
  return typeof v === 'string' && v.startsWith('#') ? v : gradeHex(grade)
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** resolve a `'tier'` sentinel or a hex string to a hex string. */
const resolve = (value: string, tierColor: string) => (value === 'tier' ? tierColor : value)
const asHex = (value: string, fallback: string) => (value.startsWith('#') ? value : fallback)

const EASING: Record<GemRevealConfig['lockSpeedEase'], (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
}

type WarpStreak = { x: number; y: number; speed: number; alpha: number; hue: number }
type StreakBurst = { firedAt: number; color: string }

export type GemRevealProps = {
  config?: Partial<GemRevealConfig>
  paused?: boolean
  /** change to replay the reveal from the start */
  runKey?: string | number
  /**
   * `'reveal'` — the gem rises + hovers, effects run, grade auto-cycles.
   * `'locked'` — the dev has chosen the final grade: punch, snap to it, fade the
   * effects, ease the loop speed back, spring the folded grade button in.
   */
  phase?: 'reveal' | 'locked'
  /** bump to punch the scale */
  scaleSignal?: number
  /** bump to fire the white flash */
  flashSignal?: number
  /** bump to fire the gem-streak burst */
  streakSignal?: number
}

export function GemReveal({
  config,
  paused = false,
  runKey,
  phase = 'reveal',
  scaleSignal = 0,
  flashSignal = 0,
  streakSignal = 0,
}: GemRevealProps) {
  const c: GemRevealConfig = { ...GEM_DEFAULT_CONFIG, ...config }
  const buttonLabel =
    c.buttonLabelOverride.trim() || GEM_GRADES.find((g) => g.key === c.tier)?.label || c.tier

  const wrapRef = useRef<HTMLDivElement>(null)
  const gemRef = useRef<HTMLDivElement>(null)
  const lottieHostRef = useRef<HTMLDivElement>(null)
  const flashWrapRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLDivElement>(null)
  const fxRef = useRef<HTMLCanvasElement>(null)

  const cfgRef = useRef(c)
  cfgRef.current = c
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  // signal → counter refs read by the rAF loop
  const punchN = useRef(0)
  const flashN = useRef(0)
  const streakN = useRef(0)
  const last = useRef({ scale: scaleSignal, flash: flashSignal, streak: streakSignal })
  useEffect(() => {
    if (scaleSignal !== last.current.scale) {
      last.current.scale = scaleSignal
      punchN.current++
    }
  }, [scaleSignal])
  useEffect(() => {
    if (flashSignal !== last.current.flash) {
      last.current.flash = flashSignal
      flashN.current++
    }
  }, [flashSignal])
  useEffect(() => {
    if (streakSignal !== last.current.streak) {
      last.current.streak = streakSignal
      streakN.current++
    }
  }, [streakSignal])

  useEffect(() => {
    const wrap = wrapRef.current
    const gemEl = gemRef.current
    const host = lottieHostRef.current
    const flashWrap = flashWrapRef.current
    const flashEl = flashRef.current
    const btnEl = btnRef.current
    const canvas = fxRef.current
    if (!wrap || !gemEl || !host || !flashWrap || !flashEl || !btnEl || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // ---- Lottie ----
    const working = structuredClone(gemData) as typeof gemData & {
      slots: { gemColor: { p: { a: number; k: number[] } } }
    }
    let anim: AnimationItem | null = null
    let currentSpeed = cfgRef.current.loopSpeed

    const loadGem = (hex: string, atFrame = 0) => {
      working.slots.gemColor.p.k = hexToRgb01(hex)
      anim?.destroy()
      anim = lottie.loadAnimation({
        container: host,
        renderer: 'svg',
        loop: true,
        autoplay: !pausedRef.current,
        animationData: working,
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
      })
      anim.setSpeed(currentSpeed)
      if (atFrame > 0) anim.goToAndPlay(atFrame, true)
    }
    let activeHex = gradeColor(cfgRef.current, cfgRef.current.tier)
    loadGem(activeHex)

    // ---- size ----
    let size = { w: wrap.clientWidth, h: wrap.clientHeight }
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      size = { w: wrap.clientWidth, h: wrap.clientHeight }
      canvas.width = Math.max(1, Math.round(size.w * dpr))
      canvas.height = Math.max(1, Math.round(size.h * dpr))
      canvas.style.width = `${size.w}px`
      canvas.style.height = `${size.h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    // ---- state ----
    let simTime = 0
    let entryY = cfgRef.current.entryDistance
    let entryVy = 0
    let entryS = cfgRef.current.entryScale
    let entrySv = 0
    let punchS = cfgRef.current.scale
    let punchV = 0
    let prevPunchV = 0
    let seenPunch = punchN.current
    let seenFlash = flashN.current
    let seenStreak = streakN.current
    let arrivedAt = -1
    let warpIntensity = 0
    let revealFlashAt = -1
    // phase machine
    let seenPhase: 'reveal' | 'locked' = phaseRef.current
    let lockedAt = phaseRef.current === 'locked' ? 0 : -1
    let lockPunchFired = false
    let streakLoopNextAt = 0
    // folded grade button springs
    let btnScale = cfgRef.current.buttonFromScale
    let btnScaleV = 0
    let btnRot = cfgRef.current.buttonFromRotate
    let btnRotV = 0
    let btnOpacity = 0
    let glowPhase = Math.random() * TAU
    const wanderPhase = { x: Math.random() * TAU, y: Math.random() * TAU, r: Math.random() * TAU }

    // grade cycle
    let cycleIdx = 0
    let cycleInterval = cfgRef.current.cycleInterval
    let cycleNextAt = cfgRef.current.cycleInterval

    // flash overlay { color, firedAt, hold, dur }
    let overlay: { color: string; firedAt: number; hold: number; dur: number } | null = null
    // active streak bursts
    const bursts: StreakBurst[] = []
    // warp streaks
    const warpStreaks: WarpStreak[] = []

    const fireStreaks = (color: string) => {
      if (!cfgRef.current.streaks) return
      bursts.push({ firedAt: simTime, color })
      if (bursts.length > 6) bursts.shift()
    }
    const fireFlash = (color: string, hold: number, dur: number) => {
      overlay = { color, firedAt: simTime, hold, dur }
    }

    // diamond path matching the gem silhouette
    const gemDiamond = (cx: number, cy: number, w: number, h: number) => {
      ctx.beginPath()
      ctx.moveTo(cx, cy - h / 2)
      ctx.lineTo(cx + w / 2, cy)
      ctx.lineTo(cx, cy + h / 2)
      ctx.lineTo(cx - w / 2, cy)
      ctx.closePath()
    }

    // ---- loop ----
    let raf = 0
    let lastT = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - lastT) / 1000, 1 / 30)
      lastT = now
      const cfg = cfgRef.current
      const isPaused = pausedRef.current
      if (!isPaused) simTime += dt

      // ---- phase machine ----
      const phase = phaseRef.current
      if (phase === 'locked' && seenPhase === 'reveal') {
        seenPhase = 'locked'
        lockedAt = simTime
      }
      const locked = phase === 'locked' && lockedAt >= 0
      // effects fade 1 → 0 across the lock transition
      const lockFade =
        locked && cfg.lockFadeDuration > 0
          ? 1 - EASING[cfg.lockFadeEase](clamp((simTime - lockedAt) / cfg.lockFadeDuration, 0, 1))
          : locked
            ? 0
            : 1

      // ---- colour: auto-cycle (reveal only) or follow the grade prop ----
      const gradeHexNow = gradeColor(cfg, cfg.tier)
      if (cfg.autoCycle && !isPaused && phase === 'reveal') {
        if (simTime >= cycleNextAt) {
          cycleIdx = (cycleIdx + 1) % GEM_GRADE_KEYS.length
          activeHex = gradeColor(cfg, GEM_GRADE_KEYS[cycleIdx])
          loadGem(activeHex, anim?.currentFrame ?? 0)
          if (cfg.cycleFlash) {
            fireFlash(FLASH_WHITE, cfg.flashHold, cfg.flashDuration)
            if (cfg.flashStreaks) fireStreaks(resolve(cfg.streakColor, activeHex))
          }
          cycleInterval = Math.max(cfg.cycleMinInterval, cycleInterval * (1 - cfg.cycleRamp * 0.25))
          cycleNextAt = simTime + cycleInterval
        }
      } else if (gradeHexNow !== activeHex) {
        activeHex = gradeHexNow
        loadGem(activeHex, anim?.currentFrame ?? 0)
        cycleIdx = 0
        cycleInterval = cfg.cycleInterval
        cycleNextAt = simTime + cfg.cycleInterval
      }

      // ---- Lottie speed: revealLoopSpeed, easing down to loopSpeed on lock ----
      if (!isPaused && anim) {
        let speed = cfg.revealLoopSpeed
        if (locked) {
          const elapsed = simTime - lockedAt - cfg.lockSpeedDelay
          if (elapsed >= 0) {
            const t = cfg.lockSpeedDuration > 0 ? clamp(elapsed / cfg.lockSpeedDuration, 0, 1) : 1
            speed = lerp(cfg.revealLoopSpeed, cfg.loopSpeed, EASING[cfg.lockSpeedEase](t))
          }
        }
        if (Math.abs(speed - currentSpeed) > 0.01) {
          currentSpeed = speed
          anim.setSpeed(speed)
        }
      }

      // ---- entry spring (Y + scale-in) ----
      const revealing = simTime >= cfg.entryDelay
      if (!isPaused && revealing) {
        const spring = (pos: number, vel: number, target: number) => {
          const F = -cfg.entryStiffness * (pos - target) - cfg.entryDamping * vel
          const nv = vel + (F / Math.max(0.05, cfg.entryMass)) * dt
          return [pos + nv * dt, nv] as const
        }
        ;[entryY, entryVy] = spring(entryY, entryVy, 0)
        ;[entryS, entrySv] = spring(entryS, entrySv, cfg.scale)
      }
      // reveal arrival — once the scale-in is essentially done
      if (arrivedAt < 0 && entryS >= cfg.scale * 0.985 && Math.abs(entryVy) < 40) {
        arrivedAt = simTime
        streakLoopNextAt = simTime + Math.max(0.15, cfg.streakLoopInterval)
        if (cfg.streakOnReveal) {
          bursts.push({ firedAt: simTime + cfg.streakDelay, color: resolve(cfg.streakColor, activeHex) })
        }
        if (cfg.revealFlash) revealFlashAt = simTime + cfg.revealFlashDelay
      }
      // white flash as the gem settles into the loop (no punch — an ambient pulse)
      if (revealFlashAt >= 0 && simTime >= revealFlashAt) {
        revealFlashAt = -1
        fireFlash(FLASH_WHITE, cfg.flashHold, cfg.flashDuration)
        if (cfg.flashStreaks) fireStreaks(resolve(cfg.streakColor, activeHex))
      }

      // ---- punch spring + white flash (coupled: either trigger fires both) ----
      const punchTriggered = punchN.current !== seenPunch
      const flashTriggered = flashN.current !== seenFlash
      // the lock does a coupled punch + flash once, after lockPunchDelay
      let lockTriggered = false
      if (locked && !lockPunchFired && simTime >= lockedAt + cfg.lockPunchDelay) {
        lockPunchFired = true
        lockTriggered = true
      }
      if (punchTriggered) seenPunch = punchN.current
      if (flashTriggered) seenFlash = flashN.current
      if (punchTriggered || flashTriggered || lockTriggered) {
        punchV += (cfg.punchTo - punchS) * 6
        fireFlash(FLASH_WHITE, cfg.flashHold, cfg.flashDuration)
        if (cfg.flashStreaks) fireStreaks(resolve(cfg.streakColor, activeHex))
      }
      prevPunchV = punchV
      const pf = -cfg.punchStiffness * (punchS - cfg.scale) - cfg.punchDamping * punchV
      punchV += pf * dt
      punchS += punchV * dt
      // apex: velocity crossed from + to − while scaled up
      if (prevPunchV > 5 && punchV <= 5 && punchS > cfg.scale + 0.05) {
        if (cfg.streakOnPunch) fireStreaks(resolve(cfg.streakColor, activeHex))
        if (cfg.punchFlash !== 'off') {
          const col = cfg.punchFlash === 'current' ? activeHex : gradeColor(cfg, cfg.punchFlash)
          fireFlash(col, cfg.punchFlashDuration * 0.35, cfg.punchFlashDuration)
        }
      }

      // ---- manual streak burst ----
      if (streakN.current !== seenStreak) {
        seenStreak = streakN.current
        fireStreaks(resolve(cfg.streakColor, activeHex))
      }
      // ---- gem-streak loop through the reveal ----
      if (phase === 'reveal' && cfg.streakLoop && cfg.streaks && arrivedAt >= 0 && !isPaused) {
        if (simTime >= streakLoopNextAt) {
          fireStreaks(resolve(cfg.streakColor, activeHex))
          streakLoopNextAt = simTime + Math.max(0.15, cfg.streakLoopInterval)
        }
      }

      // ---- hover ----
      let hx = 0
      let hy = 0
      let hr = 0
      const arrive = clamp((entryS - cfg.entryScale) / Math.max(0.01, cfg.scale - cfg.entryScale), 0, 1)
      if (cfg.hover) {
        const w = cfg.hoverWander
        wanderPhase.x += w * (Math.random() - 0.5) * dt * 2
        wanderPhase.y += w * (Math.random() - 0.5) * dt * 2
        wanderPhase.r += w * (Math.random() - 0.5) * dt * 2
        hx = Math.sin(simTime * TAU * cfg.hoverFreqX + wanderPhase.x) * cfg.hoverAmpX * arrive
        hy = Math.sin(simTime * TAU * cfg.hoverFreqY + wanderPhase.y) * cfg.hoverAmpY * arrive
        hr = Math.sin(simTime * TAU * cfg.hoverFreqY * 0.7 + wanderPhase.r) * cfg.hoverRotate * arrive
      }

      // ---- composed gem transform ----
      const gx = hx
      const gy = entryY + hy
      const gs = (entryS / cfg.scale) * (punchS / cfg.scale) * cfg.scale
      const gr = hr
      gemEl.style.transform = `translate3d(${gx.toFixed(2)}px, ${gy.toFixed(2)}px, 0) scale(${(gs / cfg.scale).toFixed(4)}) rotate(${gr.toFixed(2)}deg)`

      // ---- flash overlay ----
      let flashK = 0
      if (overlay) {
        const ft = simTime - overlay.firedAt
        flashK = ft < overlay.hold ? 1 : Math.max(0, 1 - (ft - overlay.hold) / overlay.dur)
        if (flashK <= 0) overlay = null
      }
      flashEl.style.opacity = flashK.toFixed(3)
      flashEl.style.background = overlay?.color ?? FLASH_WHITE
      // blur lives on the (unclipped) wrapper so it blooms past the diamond edge
      flashWrap.style.filter = cfg.flashBlur > 0 && flashK > 0 ? `blur(${cfg.flashBlur}px)` : ''

      // ================= effects canvas =================
      ctx.clearRect(0, 0, size.w, size.h)
      const cx = size.w / 2 + gx
      const cy = size.h / 2 + gy
      const gemPx = 210 * (gs / cfg.scale) * cfg.scale
      const dW = gemPx * 0.8
      const dH = gemPx * 0.82

      // ---- warp streaks (behind everything) ----
      if (cfg.warp && cfg.warpCount > 0) {
        while (warpStreaks.length < Math.round(cfg.warpCount)) {
          warpStreaks.push({
            x: Math.random() * size.w,
            y: Math.random() * size.h,
            speed: cfg.warpSpeed * (1 + rand(-cfg.warpSpeedVar, cfg.warpSpeedVar)),
            alpha: 1 - Math.random() * cfg.warpOpacityVar,
            hue: rand(-cfg.warpColorVar, cfg.warpColorVar) * 60,
          })
        }
        if (warpStreaks.length > Math.round(cfg.warpCount)) warpStreaks.length = Math.round(cfg.warpCount)
        // on in the background through the reveal loop, fades out across the lock
        if (!isPaused) {
          warpIntensity = locked ? lockFade : Math.min(1, warpIntensity + dt / 0.3)
        }
        if (warpIntensity > 0.01) {
          const base = asHex(cfg.warpColor, activeHex)
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          for (const s of warpStreaks) {
            if (!isPaused) {
              s.y += s.speed * dt
              if (s.y - cfg.warpLength > size.h) {
                s.y = -cfg.warpLength
                s.x = Math.random() * size.w
              }
            }
            const col = s.hue ? shiftHue(base, s.hue) : base
            ctx.fillStyle = hexToRgba(col, cfg.warpOpacity * s.alpha * warpIntensity)
            ctx.fillRect(s.x - cfg.warpWidth / 2, s.y, cfg.warpWidth, cfg.warpLength)
          }
          ctx.restore()
        }
      }

      // ---- jet stream ----
      if (cfg.jet && cfg.jetLength > 0) {
        const jhex = asHex(resolve(cfg.jetColor, activeHex), activeHex)
        // stays fully on through the reveal loop; only fades once the grade is locked
        let fadeProg = 0
        if (locked && simTime > lockedAt + cfg.jetFadeDelay && cfg.jetFadeDuration > 0) {
          fadeProg = clamp((simTime - lockedAt - cfg.jetFadeDelay) / cfg.jetFadeDuration, 0, 1)
        }
        // head (y0) is pinned to the gem and never fades; the fade-off eats the
        // stream inward from the tail (y1) toward the head as fadeProg → 1
        const y0 = cy
        const y1 = cy + cfg.jetLength
        const grad = ctx.createLinearGradient(0, y0, 0, y1)
        if (fadeProg <= 0) {
          grad.addColorStop(0, hexToRgba(jhex, cfg.jetOpacityStart))
          grad.addColorStop(1, hexToRgba(jhex, cfg.jetOpacityEnd))
        } else if (fadeProg >= 1) {
          grad.addColorStop(0, hexToRgba(jhex, 0))
          grad.addColorStop(1, hexToRgba(jhex, 0))
        } else {
          const cut = clamp(1 - fadeProg, 0.001, 0.999) // gradient pos of the fade edge
          grad.addColorStop(0, hexToRgba(jhex, cfg.jetOpacityStart))
          grad.addColorStop(
            Math.max(0, cut - 0.06),
            hexToRgba(jhex, lerp(cfg.jetOpacityStart, cfg.jetOpacityEnd, cut)),
          )
          grad.addColorStop(Math.min(1, cut + 0.02), hexToRgba(jhex, 0))
          grad.addColorStop(1, hexToRgba(jhex, 0))
        }
        const tracks = Math.round(cfg.jetTracks) === 2 ? [-1, 1] : [0]
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = grad
        for (const dir of tracks) {
          const tcx = cx + dir * (cfg.jetSpacing / 2 + cfg.jetTrackWidth / 2)
          const topW = cfg.jetTrackWidth / 2
          const botW = topW * (1 - clamp(cfg.jetTaper, 0, 1))
          ctx.beginPath()
          ctx.moveTo(tcx - topW, y0)
          ctx.lineTo(tcx + topW, y0)
          ctx.lineTo(tcx + botW, y1)
          ctx.lineTo(tcx - botW, y1)
          ctx.closePath()
          ctx.fill()
        }
        ctx.restore()
      }

      // ---- glow — a blurred diamond that keeps the gem's silhouette ----
      if (cfg.glow && cfg.glowSize > 0 && cfg.glowIntensity > 0) {
        glowPhase += dt * TAU * cfg.glowPulse
        const pulse = cfg.glowPulse > 0 ? 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(glowPhase)) : 1
        const ghex = asHex(resolve(cfg.glowColor, activeHex), activeHex)
        const spike = overlay?.color === FLASH_WHITE ? 1 + cfg.flashGlow * flashK : 1
        const gain = cfg.glowIntensity * pulse * spike
        const reach = clamp(cfg.glowReach, 0.5, 4)
        const passes = Math.round(clamp(cfg.glowStrength, 1, 4))
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        // soft outer halo — a radial wash for reach + visibility (no filter, cheap)
        const haloR = Math.max(dW, dH) * 0.5 * reach + cfg.glowSize
        const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR)
        halo.addColorStop(0, hexToRgba(ghex, clamp(0.32 * gain, 0, 1)))
        halo.addColorStop(0.45, hexToRgba(ghex, clamp(0.13 * gain, 0, 1)))
        halo.addColorStop(1, hexToRgba(ghex, 0))
        ctx.fillStyle = halo
        ctx.fillRect(cx - haloR, cy - haloR, haloR * 2, haloR * 2)
        // core — a blurred diamond so the glow still reads as the gem's shape
        ctx.filter = `blur(${Math.max(1, cfg.glowSize * pulse * 0.8).toFixed(1)}px)`
        ctx.fillStyle = hexToRgba(ghex, clamp(0.28 * gain, 0, 1))
        for (let i = 0; i < passes; i++) {
          gemDiamond(cx, cy, dW * 1.06, dH * 1.06)
          ctx.fill()
        }
        ctx.filter = 'none'
        ctx.restore()
      }

      // ---- gem streaks (radial burst) ----
      if (cfg.streaks && bursts.length) {
        const k = lerp(0.3, 9, clamp(cfg.streakDecel, 0, 1))
        const r0 = gemPx * 0.4
        for (let bi = bursts.length - 1; bi >= 0; bi--) {
          const b = bursts[bi]
          const bt = simTime - b.firedAt
          if (bt < 0) continue
          if (bt > cfg.streakLife) {
            bursts.splice(bi, 1)
            continue
          }
          const dist = k > 0.01 ? (cfg.streakSpeed / k) * (1 - Math.exp(-k * bt)) : cfg.streakSpeed * bt
          const alpha = cfg.streakOpacity * (1 - bt / cfg.streakLife) * lockFade
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          ctx.fillStyle = hexToRgba(asHex(b.color, activeHex), alpha)
          const n = Math.max(2, Math.round(cfg.streakCount))
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU
            ctx.save()
            ctx.translate(cx + Math.cos(a) * (r0 + dist), cy + Math.sin(a) * (r0 + dist))
            ctx.rotate(a)
            ctx.fillRect(-cfg.streakLength / 2, -cfg.streakWidth / 2, cfg.streakLength, cfg.streakWidth)
            ctx.restore()
          }
          ctx.restore()
        }
      }

      // ---- folded grade button (springs in after lock) ----
      const btnActive = cfg.button && locked && simTime >= lockedAt + cfg.buttonDelay
      if (btnActive && !isPaused) {
        const mass = Math.max(0.05, cfg.buttonMass)
        const fS = -cfg.buttonStiffness * (btnScale - cfg.buttonScale) - cfg.buttonDamping * btnScaleV
        btnScaleV += (fS / mass) * dt
        btnScale += btnScaleV * dt
        const fR = -cfg.buttonStiffness * (btnRot - cfg.buttonRotate) - cfg.buttonDamping * btnRotV
        btnRotV += (fR / mass) * dt
        btnRot += btnRotV * dt
        btnOpacity = Math.min(1, btnOpacity + dt / 0.15)
      }
      if (cfg.button) {
        // sit just under the gem's bottom point; offsetY < 0 overlaps the gem
        const gemBottom = size.h / 2 + gemPx * 0.41
        const btnCentreY = gemBottom + cfg.buttonOffsetY + 19 - size.h / 2
        btnEl.style.opacity = btnOpacity.toFixed(3)
        btnEl.style.transform = `translate(-50%, -50%) translate(${cfg.buttonOffsetX.toFixed(1)}px, ${btnCentreY.toFixed(1)}px) scale(${btnScale.toFixed(4)}) rotate(${btnRot.toFixed(2)}deg)`
      } else {
        btnEl.style.opacity = '0'
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      anim?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey])

  return (
    <div ref={wrapRef} className='gem-reveal'>
      <canvas ref={fxRef} className='gem-reveal__fx' />
      <div ref={gemRef} className='gem-reveal__gem'>
        <div ref={lottieHostRef} className='gem-reveal__lottie' />
        <div ref={flashWrapRef} className='gem-reveal__flash-wrap' aria-hidden='true'>
          <div ref={flashRef} className='gem-reveal__flash' />
        </div>
      </div>
      <div ref={btnRef} className='gem-reveal__btn' aria-hidden='true'>
        <FoldableButton>{buttonLabel}</FoldableButton>
      </div>
    </div>
  )
}

export { GEM_GRADES }
