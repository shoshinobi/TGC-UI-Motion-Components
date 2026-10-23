import { useEffect, useRef } from 'react'
import { FoldableButton } from '@/components/banner-stubs'
// SVG-only build — used to rasterise the gem into cached frames and for the
// live winner after landing.
import lottie from 'lottie-web/build/player/lottie_light'
import type { AnimationItem } from 'lottie-web'
import gemData from '@/assets/gem.json'
import ambientUrl from '@/assets/mp3/GemReveal_ambientLoop.mp3'
import startUrl from '@/assets/mp3/GemReveal_start.mp3'
import endUrl from '@/assets/mp3/GemReveal_end.mp3'
import punchUrl from '@/assets/mp3/GemReveal_punch.mp3'
import tickUrl from '@/assets/mp3/drip4.ogg'
import { GEM_DEFAULT_CONFIG, GEM_MUSIC } from '@/components/GemReveal'
import { hexToRgb01, hexToRgba, shiftHue } from '@/lib/gemTiers'

/**
 * Gem Wheel — a "you found a gem → spin for its grade" sequence.
 *
 *   armed → found → lineup → ready → spinning → stopping → landed
 *
 * - **found**: a white gem rises from below and hovers, with a line of text
 *   ("You found a gem.") under it.
 * - **lineup**: the white gem shrinks and slides into the bottom (Notable) slot,
 *   tweening white → Notable, while the other five drop in from the top. Six
 *   gems, bottom → top Notable … Holy Grail, each a step bigger than the last.
 * - **ready**: the drum waits for a vertical swipe (either way; flick speed
 *   sets the spin speed) or an auto/trigger spin.
 * - **spinning**: the drum turns at a constant speed for `spinDuration`.
 * - **stopping**: a controlled ease-out that lands the preset `finalGrade` at
 *   the centre — carrying on `overshoot` slots past it (0.5 = right on the division line
 *   with the next tier, in whichever direction it's spinning), holding, then
 *   snapping back. Extra loops are
 *   added as needed.
 * - **landed**: white flash; under it the winner switches to a live, spinning
 *   Lottie; the other gems fade; the winner grows to `winnerScale` alone.
 *
 * Performance: the wheel gems are still (one cached rest frame per grade) and
 * all drawn on one canvas, so 18 gems spinning costs a handful of `drawImage`s.
 * Only one live Lottie ever runs: the found gem, then the landed winner.
 */

export const WHEEL_ORDER = ['notable', 'renowned', 'storied', 'illustrious', 'mythic', 'holyGrail'] as const
export type WheelGrade = (typeof WHEEL_ORDER)[number]
export const WHEEL_LABEL: Record<WheelGrade, string> = {
  notable: 'Notable',
  renowned: 'Renowned',
  storied: 'Storied',
  illustrious: 'Illustrious',
  mythic: 'Mythic',
  holyGrail: 'Holy Grail',
}

export type WheelState = 'armed' | 'found' | 'lineup' | 'ready' | 'spinning' | 'stopping' | 'landed'
export type WheelEase = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'

export type GemWheelConfig = {
  // --- result ---
  /** the grade the wheel lands on — preset by the developer */
  finalGrade: WheelGrade

  // --- colours (default = Gem Reveal's approved grade colours) ---
  gcNotable: string
  gcRenowned: string
  gcStoried: string
  gcIllustrious: string
  gcMythic: string
  gcHolyGrail: string
  /** colour of the found gem before it becomes Notable */
  foundColor: string

  // --- drum layout ---
  /** Holy Grail size (the biggest), px */
  gemSize: number
  /** each grade down is this much smaller than the one above (0.13 = −13% per grade) */
  sizeStep: number
  /** how many times the six-gem sequence repeats round the loop (3 = 18 slots) */
  repeats: number
  /** fit the line-up to the stage: Holy Grail's top and Notable's bottom both `lineupMargin` from the edges, equal spacing between */
  lineupFit: boolean
  /** px from the top / bottom edge to Holy Grail's top / Notable's bottom (when fitted) */
  lineupMargin: number
  /** px between slots (when not fitted) */
  slotSpacing: number
  /** which slot sits at the centre in the line-up (when not fitted; 2.5 = symmetric) */
  lineupCenter: number
  /** gems past either end of the line-up fade out over this many slots */
  fadeSlots: number

  // --- gem animation ---
  /** the Lottie frame the wheel gems rest on (they hold still from the line-up until the landing) */
  restFrame: number
  /** cached frame resolution, px */
  spriteRes: number
  /** live Lottie loop speed (the found gem + the winner) */
  loopSpeed: number
  hoverAmp: number
  hoverFreq: number
  /** phase offset between neighbouring gems' hover, 0–1 */
  hoverStagger: number

  // --- found (state 1) ---
  /** found gem size, × gemSize (the Holy Grail size) */
  foundScale: number
  entryDistance: number
  entryStiffness: number
  entryDamping: number
  entryMass: number
  /** seconds after `found` before the line-up auto-starts (0 = wait for the trigger) */
  autoLineupAfter: number
  /** white flash on the found gem as it arrives */
  foundFlash: boolean
  /** seconds after it arrives */
  foundFlashDelay: number

  // --- jet (gradient tracks trailing the found gem's entry) ---
  jet: boolean
  jetColor: string
  /** 1 or 2 tracks */
  jetTracks: number
  jetTrackWidth: number
  jetSpacing: number
  jetLength: number
  /** 0–1 how much each track narrows toward its end */
  jetTaper: number
  jetOpacityStart: number
  jetOpacityEnd: number
  /** seconds after the found gem first reaches the centre before the jet retracts */
  jetFadeDelay: number
  /** seconds the retract (tail → head) takes */
  jetFadeDuration: number

  // --- warp (speed lines while the wheel spins) ---
  warp: boolean
  warpCount: number
  /** line speed per unit of wheel speed (× the slot spacing) */
  warpSpeedScale: number
  warpSpeedVar: number
  warpLength: number
  warpWidth: number
  warpColor: string
  warpColorVar: number
  warpOpacity: number
  warpOpacityVar: number
  /** seconds to fade the lines in when the spin starts / out as it stops */
  warpFade: number

  // --- text ---
  text: string
  /** second line shown after the first fades, while the wheel waits ('' = none) */
  promptText: string
  textSize: number
  /** px below the found gem */
  textGap: number
  /** seconds after `found` before the text fades in */
  textInDelay: number
  textFade: number
  /** seconds after the line-up STARTS before the text fades out (0 = immediately) */
  textOutDelay: number
  /** "Spin the wheel." fades in this long after the line-up settles */
  promptDelay: number

  // --- line-up (state 2) ---
  /** the found gem's move + colour tween into the Notable slot, s */
  lineupDuration: number
  lineupEase: WheelEase
  /** seconds between each gem dropping in */
  dropStagger: number
  dropStiffness: number
  dropDamping: number
  /** seconds after the line-up settles before the wheel auto-spins (0 = wait for a swipe / trigger) */
  autoSpinAfter: number

  // --- spin ---
  /** auto spin direction (a swipe picks its own) */
  spinDirection: 'down' | 'up'
  /** auto spin speed, slots per second */
  cruiseSpeed: number
  /** auto spin ease-in, s */
  spinUpDuration: number
  /** seconds at speed before the controlled slowdown starts */
  spinDuration: number
  /** flick velocity → spin speed multiplier */
  flickGain: number
  /** slowest / fastest a flick can spin it, slots/s */
  flickMin: number
  flickMax: number
  /** release speed below this (px/s) is not a flick — the drum springs back */
  flickThreshold: number

  // --- stop + suspense ---
  /** roughly how long the slowdown takes, s (rounded so it lands on the grade) */
  stopDuration: number
  /** ease-out power for the slowdown (2 = gentle, 5 = long crawl) */
  stopEasePower: number
  /** extra full loops added to the slowdown */
  extraLoops: number
  /** slots the drum carries on past the grade, in the direction it's travelling, before snapping back (0.5 = the division line with the next tier; 0 = no tease) */
  overshoot: number
  /** seconds it hangs at the overshoot */
  overshootHold: number
  snapStiffness: number
  snapDamping: number

  // --- landing ---
  flashDelay: number
  flashHold: number
  flashDuration: number
  /** white bloom on the flash, px */
  flashBlur: number
  /** seconds the other gems + the line work take to fade */
  othersFade: number
  /** final winner size, × gemSize (the Holy Grail size) */
  winnerScale: number
  growStiffness: number
  growDamping: number
  glow: boolean
  glowSize: number
  glowIntensity: number

  // --- impact (the winner swells, then settles back to its resting size) ---
  impact: boolean
  /** peak size, × the resting winner size */
  impactScale: number
  /** seconds to ease out to the peak (from the flash) */
  impactUp: number
  /** seconds held at the peak */
  impactHold: number
  /** seconds to ease slowly back down to the resting size */
  impactDown: number
  /** white radial burst behind the winner on the flash (0 = off) */
  impactFlash: number
  /** burst radius, × the stage's height */
  impactFlashSize: number
  /** seconds the burst takes to fade */
  impactFlashDecay: number
  /** expanding shockwave ring on the flash */
  impactRing: boolean
  impactRingColor: string
  /** px the ring travels out past the gem's edge */
  impactRingSize: number
  impactRingWidth: number
  impactRingOpacity: number
  impactRingDuration: number

  // --- grade label (the folded button under the winner) ---
  label: boolean
  /** blank = the landed grade's name */
  labelOverride: string
  /** seconds after the flash */
  labelDelay: number
  /** px from the winner's bottom point to the label's top (negative = overlap) */
  labelOffsetY: number
  labelSize: number
  labelFromScale: number
  labelFromRotate: number
  labelRotate: number
  labelStiffness: number
  labelDamping: number
  labelMass: number

  // --- line work ---
  lines: boolean
  lineColor: string
  lineOpacity: number
  lineWidth: number
  /** half-width of the slot lines, px (capped to the stage edge) */
  lineHalfWidth: number
  /** where the slot lines start fading toward their ends, 0 = centre … 1 = the ends */
  lineSideFade: number
  bracket: boolean
  /** distance of the centre arrows from the middle, px */
  bracketHalfWidth: number
  bracketColor: string
  bracketOpacity: number
  /** the lines + arrows fade in this long after the gems have settled into the line-up */
  lineInDelay: number
  /** …over this many seconds */
  lineInFade: number

  // --- audio ---
  sound: boolean
  volume: number
  ambient: boolean
  /** drip4.ogg, once per slot passing the centre */
  tickVolume: number
  /** playback rate of the tick at rest / at cruise speed */
  tickPitchMin: number
  tickPitchMax: number
  /** cap on ticks per second */
  tickMaxRate: number
  musicTrack: 'off' | 'random' | 'belt-and-braces' | 'chasing-quails'
  musicVolume: number
  musicLoop: boolean
  musicStart: 'start' | 'spin' | 'land'
  musicDelay: number
}

const G = GEM_DEFAULT_CONFIG
export const WHEEL_DEFAULT_CONFIG: GemWheelConfig = {
  finalGrade: 'illustrious',

  gcNotable: G.gcNotable,
  gcRenowned: G.gcRenowned,
  gcStoried: G.gcStoried,
  gcIllustrious: G.gcIllustrious,
  gcMythic: G.gcMythic,
  gcHolyGrail: G.gcHolyGrail,
  foundColor: '#ffffff',

  gemSize: 130,
  sizeStep: 0.2,
  repeats: 3,
  lineupFit: true,
  lineupMargin: 28,
  slotSpacing: 110,
  lineupCenter: 3,
  fadeSlots: 1.5,

  restFrame: 0,
  spriteRes: 320,
  loopSpeed: 1,
  hoverAmp: 6,
  hoverFreq: 0.3,
  hoverStagger: 0.17,

  foundScale: 1.5,
  entryDistance: 700,
  entryStiffness: 200,
  entryDamping: 22,
  entryMass: 1.4,
  autoLineupAfter: 2,
  foundFlash: true,
  foundFlashDelay: 0,

  jet: true,
  jetColor: '#ffffff',
  jetTracks: G.jetTracks,
  jetTrackWidth: 16,
  jetSpacing: G.jetSpacing,
  jetLength: G.jetLength,
  jetTaper: G.jetTaper,
  jetOpacityStart: G.jetOpacityStart,
  jetOpacityEnd: G.jetOpacityEnd,
  jetFadeDelay: 0,
  jetFadeDuration: G.jetFadeDuration,

  warp: true,
  warpCount: G.warpCount,
  warpSpeedScale: 1.4,
  warpSpeedVar: G.warpSpeedVar,
  warpLength: G.warpLength,
  warpWidth: G.warpWidth,
  warpColor: G.warpColor,
  warpColorVar: G.warpColorVar,
  warpOpacity: G.warpOpacity,
  warpOpacityVar: G.warpOpacityVar,
  warpFade: 0.4,

  text: 'You found a gem.',
  promptText: 'Spin the wheel.',
  textSize: 22,
  textGap: 18,
  textInDelay: 0.5,
  textFade: 0.4,
  textOutDelay: 0,
  promptDelay: 0.5,

  lineupDuration: 0.8,
  lineupEase: 'easeInOut',
  dropStagger: 0.16,
  dropStiffness: 295,
  dropDamping: 37,
  autoSpinAfter: 0,

  spinDirection: 'down',
  cruiseSpeed: 9,
  spinUpDuration: 0.8,
  spinDuration: 2.5,
  flickGain: 1,
  flickMin: 4,
  flickMax: 22,
  flickThreshold: 300,

  stopDuration: 2.6,
  stopEasePower: 3,
  extraLoops: 0,
  overshoot: 0.5,
  overshootHold: 0.35,
  snapStiffness: 380,
  snapDamping: 24,

  flashDelay: 0.05,
  flashHold: 0.12,
  flashDuration: 0.45,
  flashBlur: 30,
  othersFade: 0.35,
  winnerScale: 1.5045,
  growStiffness: 160,
  growDamping: 16,
  glow: true,
  glowSize: 70,
  glowIntensity: 0.9,
  impact: true,
  impactScale: 2,
  impactUp: 0.3,
  impactHold: 0.06,
  impactDown: 1.2,
  impactFlash: 0.8,
  impactFlashSize: 0.75,
  impactFlashDecay: 0.7,
  impactRing: true,
  impactRingColor: '#ffffff',
  impactRingSize: 220,
  impactRingWidth: 3,
  impactRingOpacity: 0.8,
  impactRingDuration: 0.4,

  label: true,
  labelOverride: '',
  labelDelay: G.buttonDelay,
  labelOffsetY: G.buttonOffsetY,
  labelSize: G.buttonSize,
  labelFromScale: G.buttonFromScale,
  labelFromRotate: G.buttonFromRotate,
  labelRotate: G.buttonRotate,
  labelStiffness: G.buttonStiffness,
  labelDamping: G.buttonDamping,
  labelMass: G.buttonMass,

  lines: true,
  lineColor: '#ffffff',
  lineOpacity: 0.2,
  lineWidth: 1.5,
  lineHalfWidth: 200,
  lineSideFade: 0,
  bracket: true,
  bracketHalfWidth: 120,
  bracketColor: '#ffffff',
  bracketOpacity: 0.6,
  lineInDelay: 0,
  lineInFade: 0.4,

  sound: true,
  volume: 0.85,
  ambient: true,
  tickVolume: 0.6,
  tickPitchMin: 0.9,
  tickPitchMax: 1.4,
  tickMaxRate: 18,
  musicTrack: G.musicTrack, // as Gem Reveal: Belt and Braces
  musicVolume: 0.1,
  musicLoop: G.musicLoop,
  musicStart: 'land',
  musicDelay: 0.5, // after the landing, as the winner comes through
}

const TAU = Math.PI * 2
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / Math.max(1e-6, e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}
const EASING: Record<WheelEase, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
}
/** wrap to (-π, π] */

const COLOR_KEY: Record<WheelGrade, keyof GemWheelConfig> = {
  notable: 'gcNotable',
  renowned: 'gcRenowned',
  storied: 'gcStoried',
  illustrious: 'gcIllustrious',
  mythic: 'gcMythic',
  holyGrail: 'gcHolyGrail',
}
const gradeColor = (c: GemWheelConfig, g: number) => c[COLOR_KEY[WHEEL_ORDER[g]]] as string
/** sprite colour slots: 0–5 = grades bottom → top, 6 = found colour */
const FOUND = 6

type Sprites = (HTMLCanvasElement | null)[][]

/** Rasterise the gem Lottie's rest frame once per colour. */
async function buildSprites(
  colors: string[],
  restFrame: number,
  res: number,
  out: Sprites,
  cancelled: () => boolean,
) {
  const host = document.createElement('div')
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${res}px;height:${res}px;pointer-events:none;opacity:0`
  document.body.appendChild(host)
  const working = structuredClone(gemData) as typeof gemData & {
    slots: { gemColor: { p: { a: number; k: number[] } } }
  }
  // spread the work over idle time — each raster is a synchronous SVG paint
  const idle = () =>
    new Promise<void>((resolve) => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
        .requestIdleCallback
      if (ric) ric(() => resolve(), { timeout: 120 })
      else window.setTimeout(resolve, 16)
    })
  const raster = async (anim: AnimationItem, frame: number) => {
    await idle()
    anim.goToAndStop(frame, true)
    const svg = host.querySelector('svg')
    if (!svg) return null
    svg.setAttribute('width', String(res))
    svg.setAttribute('height', String(res))
    if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const xml = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
    try {
      await img.decode()
    } catch {
      return null
    }
    const cv = document.createElement('canvas')
    cv.width = res
    cv.height = res
    cv.getContext('2d')?.drawImage(img, 0, 0, res, res)
    return cv
  }
  const load = (hex: string) => {
    working.slots.gemColor.p.k = hexToRgb01(hex)
    host.innerHTML = ''
    return lottie.loadAnimation({
      container: host,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: working,
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    })
  }
  try {
    for (let ci = 0; ci < colors.length; ci++) {
      if (cancelled()) return
      out[ci] = [null]
      const anim = load(colors[ci])
      out[ci][0] = await raster(anim, restFrame)
      anim.destroy()
    }
  } finally {
    host.remove()
  }
}

export type GemWheelProps = {
  config?: Partial<GemWheelConfig>
  paused?: boolean
  runKey?: string | number
  /** bump: armed → found */
  startSignal?: number
  /** bump: found → lineup */
  lineupSignal?: number
  /** bump: ready → spinning (auto spin) */
  spinSignal?: number
  /** bump: spinning → stopping now (skips the rest of `spinDuration`) */
  stopSignal?: number
  /** fires on every state change */
  onState?: (s: WheelState) => void
}

export function GemWheel({
  config,
  paused = false,
  runKey,
  startSignal = 0,
  lineupSignal = 0,
  spinSignal = 0,
  stopSignal = 0,
  onState,
}: GemWheelProps) {
  const c: GemWheelConfig = { ...WHEEL_DEFAULT_CONFIG, ...config }
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const promptRef = useRef<HTMLDivElement>(null)
  const liveRef = useRef<HTMLDivElement>(null)
  const liveHostRef = useRef<HTMLDivElement>(null)
  const flashWrapRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  const cfgRef = useRef(c)
  cfgRef.current = c
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const onStateRef = useRef(onState)
  onStateRef.current = onState
  // long-running audio (ambient loop + soundtrack), for the live mute/volume effect
  const longAudio = useRef<{ ambient: HTMLAudioElement | null; music: HTMLAudioElement | null; playing: boolean }>({
    ambient: null,
    music: null,
    playing: false,
  })

  // signals → counters the loop reads
  const sig = useRef({ start: 0, lineup: 0, spin: 0, stop: 0 })
  const last = useRef({ start: startSignal, lineup: lineupSignal, spin: spinSignal, stop: stopSignal })
  useEffect(() => {
    if (startSignal !== last.current.start) {
      last.current.start = startSignal
      sig.current.start++
    }
    if (lineupSignal !== last.current.lineup) {
      last.current.lineup = lineupSignal
      sig.current.lineup++
    }
    if (spinSignal !== last.current.spin) {
      last.current.spin = spinSignal
      sig.current.spin++
    }
    if (stopSignal !== last.current.stop) {
      last.current.stop = stopSignal
      sig.current.stop++
    }
  }, [startSignal, lineupSignal, spinSignal, stopSignal])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const textEl = textRef.current
    const promptEl = promptRef.current
    const liveEl = liveRef.current
    const liveHost = liveHostRef.current
    const flashWrap = flashWrapRef.current
    const flashEl = flashRef.current
    const labelEl = labelRef.current
    if (!wrap || !canvas || !textEl || !promptEl || !liveEl || !liveHost || !flashWrap || !flashEl || !labelEl) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // ---- sprites ----
    const c0 = cfgRef.current
    const spriteColors = [...WHEEL_ORDER.map((_, g) => gradeColor(c0, g)), c0.foundColor]
    const sprites: Sprites = []
    let dead = false
    buildSprites(spriteColors, clamp(Math.round(c0.restFrame), 0, 59), Math.round(c0.spriteRes), sprites, () => dead)
    const sprite = (ci: number, f: number) => {
      const row = sprites[ci]
      if (!row) return null
      return row[f] ?? row[0] ?? null
    }

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

    // ---- audio ----
    const mk = (src: string, loop: boolean) => {
      const el = new Audio(src)
      el.loop = loop
      el.preload = 'auto'
      return el
    }
    const sfx = { ambient: mk(ambientUrl, true), start: mk(startUrl, false), end: mk(endUrl, false), punch: mk(punchUrl, false) }
    let musicKey: keyof typeof GEM_MUSIC | null = null
    if (c0.musicTrack === 'belt-and-braces' || c0.musicTrack === 'chasing-quails') musicKey = c0.musicTrack
    else if (c0.musicTrack === 'random') musicKey = Math.random() < 0.5 ? 'belt-and-braces' : 'chasing-quails'
    const music = musicKey ? mk(GEM_MUSIC[musicKey].url, c0.musicLoop) : null
    let musicTimer = 0
    longAudio.current = { ambient: sfx.ambient, music, playing: false }
    const playSfx = (el: HTMLAudioElement, restart = true) => {
      if (!cfgRef.current.sound) return
      el.volume = clamp(cfgRef.current.volume, 0, 1)
      if (restart) el.currentTime = 0
      el.play().catch(() => {})
    }
    const startMusic = () => {
      if (!music) return
      window.clearTimeout(musicTimer)
      musicTimer = window.setTimeout(() => {
        if (!cfgRef.current.sound) return
        music.volume = clamp(cfgRef.current.musicVolume, 0, 1)
        music.loop = cfgRef.current.musicLoop
        music.currentTime = 0
        music.play().catch(() => {})
        longAudio.current.playing = true
      }, Math.max(0, cfgRef.current.musicDelay) * 1000)
    }
    // tick — Web Audio so overlapping drips are cheap and pitchable
    let actx: AudioContext | null = null
    let tickBuf: AudioBuffer | null = null
    let tickGain: GainNode | null = null
    const ensureAudio = () => {
      if (actx) {
        actx.resume().catch(() => {})
        return
      }
      try {
        actx = new AudioContext()
        tickGain = actx.createGain()
        tickGain.connect(actx.destination)
        fetch(tickUrl)
          .then((r) => r.arrayBuffer())
          .then((b) => actx?.decodeAudioData(b))
          .then((buf) => {
            tickBuf = buf ?? null
          })
          .catch(() => {})
      } catch {
        actx = null
      }
    }
    let lastTickAt = -1
    const tick = (speedNorm: number) => {
      const cfg = cfgRef.current
      if (!cfg.sound || !actx || !tickBuf || !tickGain || cfg.tickVolume <= 0) return
      const now = actx.currentTime
      if (now - lastTickAt < 1 / Math.max(1, cfg.tickMaxRate)) return
      lastTickAt = now
      tickGain.gain.value = clamp(cfg.tickVolume * cfg.volume, 0, 1)
      const src = actx.createBufferSource()
      src.buffer = tickBuf
      src.playbackRate.value = lerp(cfg.tickPitchMin, cfg.tickPitchMax, clamp(speedNorm, 0, 1))
      src.connect(tickGain)
      src.start()
    }

    // ---- live winner (Lottie) ----
    let liveAnim: AnimationItem | null = null
    const loadLive = (hex: string) => {
      const data = structuredClone(gemData) as typeof gemData & {
        slots: { gemColor: { p: { a: number; k: number[] } } }
      }
      data.slots.gemColor.p.k = hexToRgb01(hex)
      liveAnim?.destroy()
      liveAnim = lottie.loadAnimation({
        container: liveHost,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: data,
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
      })
      liveAnim.setSpeed(cfgRef.current.loopSpeed)
    }

    // ---- state ----
    let state: WheelState = 'armed'
    let stateAt = 0
    let t = 0
    // seconds in the current state — reset by setState so a transition made
    // mid-frame never reads the previous state's (stale) elapsed time
    let st = 0
    const seen = { ...sig.current }
    const setState = (s: WheelState) => {
      state = s
      stateAt = t
      st = 0
      onStateRef.current?.(s)
    }
    onStateRef.current?.('armed')

    // found gem entry spring
    let entryY = 0
    let entryV = 0
    // line-up: hero tween + per-gem drop springs (slots 0–5)
    const drop = WHEEL_ORDER.map(() => ({ p: 0, v: 0 }))
    let lineupDoneAt = -1
    // drum
    let phi = 0 // slot index at the centre (set to the line-up position below)
    let omega = 0 // slots / s
    let spinStartOmega = 0
    let spinMode: 'auto' | 'flick' = 'auto'
    let spinDir = 1
    // stopping plan
    let plan = { p0: 0, dir: 1, dist: 0, dur: 1, n: 3, hold: 0, target: 0 }
    let snapV = 0
    let holdUntil = -1
    let snapping = false
    // landing
    let winnerSlot = -1
    let grow = 0
    let growV = 0
    let landedAt = -1
    // found gem arrival (for its flash + the jet retract)
    let foundArrivedAt = -1
    let foundCenterAt = -1 // first time the rising gem reaches the centre
    let foundFlashAt = -1
    // warp streaks
    type Streak = { x: number; y: number; speed: number; alpha: number; hue: number }
    const streaks: Streak[] = []
    let warpK = 0
    // grade label springs
    let lblScale = cfgRef.current.labelFromScale
    let lblScaleV = 0
    let lblRot = cfgRef.current.labelFromRotate
    let lblRotV = 0
    let lblOpacity = 0
    let handoffAt = -1
    let winnerRestS = 0 // the winner's size without the impact swell
    let punchPlayed = false
    // the repeat slots (beyond the first six) stay hidden until the first spin,
    // so the line-up reads as exactly six gems
    let spunAt = -1
    // swipe
    let dragging = false
    let dragPhi0 = 0
    let dragY0 = 0
    const samples: { y: number; t: number }[] = []
    let lastSlot = Math.round(phi)

    const slotCount = () => 6 * Math.max(1, Math.round(cfgRef.current.repeats))
    const gemPx = (g: number) => cfgRef.current.gemSize * Math.pow(1 - clamp(cfgRef.current.sizeStep, 0, 0.9), 5 - g)

    // where the gem actually sits inside its sprite (fractions of the sprite
    // height) — measured once from the first cached sprite, so the line-up
    // margins are measured to the gem's visible top / bottom points
    let vis = { top: 0.12, bot: 0.88, measured: false }
    const measureVis = () => {
      if (vis.measured) return
      const img = sprite(0, 0)
      const g2 = img?.getContext('2d')
      if (!img || !g2) return
      const { width: w, height: h } = img
      let px: Uint8ClampedArray
      try {
        px = g2.getImageData(0, 0, w, h).data
      } catch {
        vis.measured = true // can't read it back — keep the estimate
        return
      }
      let top = -1
      let bot = -1
      for (let y = 0; y < h && top < 0; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 24) { top = y; break }
      for (let y = h - 1; y >= 0 && bot < 0; y--) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 24) { bot = y + 1; break }
      if (top >= 0 && bot > top) vis = { top: top / h, bot: bot / h, measured: true }
    }

    /** the strip: equal spacing between slots (px) + which slot sits at the centre in the line-up */
    const layout = () => {
      const cfg = cfgRef.current
      if (!cfg.lineupFit) return { pitch: Math.max(10, cfg.slotSpacing), center: cfg.lineupCenter }
      const m = cfg.lineupMargin
      const s5 = gemPx(5)
      const s0 = gemPx(0)
      const yTop = m + s5 * (0.5 - vis.top) // Holy Grail centre: its top point `m` below the top edge
      const yBot = size.h - m - s0 * (vis.bot - 0.5) // Notable centre: its bottom point `m` above the bottom edge
      const pitch = Math.max(10, (yBot - yTop) / 5)
      return { pitch, center: (yBot - size.h / 2) / pitch }
    }
    const slotPx = () => layout().pitch
    const lineupPhi = () => layout().center

    /** screen placement of a slot at `ph` — a flat strip, wrapping round the loop */
    const place = (i: number, ph: number) => {
      const cfg = cfgRef.current
      const S = slotCount()
      const { pitch, center } = layout()
      const d = i - ph - S * Math.floor((i - ph + S / 2) / S) // slots from the centre, wrapped
      const y = size.h / 2 - d * pitch
      // full strength across the line-up's span; fading over `fadeSlots` beyond either end
      const lo = -center // Notable's offset in the line-up
      const hi = 5 - center // Holy Grail's
      const out = Math.max(0, lo - d, d - hi)
      const alpha = 1 - smooth(0, Math.max(0.05, cfg.fadeSlots), out)
      return { y, d, alpha, sx: 1, sy: 1 }
    }

    const drawGem = (ci: number, frame: number, x: number, y: number, s: number, sy: number, alpha: number) => {
      const img = sprite(ci, frame)
      if (!img || alpha <= 0.002 || s <= 0) return
      ctx.globalAlpha = clamp(alpha, 0, 1)
      ctx.drawImage(img, x - s / 2, y - (s * sy) / 2, s, s * sy)
      ctx.globalAlpha = 1
    }

    phi = lineupPhi()

    // ---- swipe ----
    const onDown = (e: PointerEvent) => {
      if (state !== 'ready') return
      dragging = true
      dragPhi0 = phi
      dragY0 = e.clientY
      samples.length = 0
      samples.push({ y: e.clientY, t: performance.now() })
      wrap.setPointerCapture(e.pointerId)
      ensureAudio()
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      phi = dragPhi0 + (e.clientY - dragY0) / slotPx()
      samples.push({ y: e.clientY, t: performance.now() })
      while (samples.length > 2 && samples[0].t < performance.now() - 100) samples.shift()
    }
    const onUp = (e: PointerEvent) => {
      if (!dragging) return
      dragging = false
      wrap.releasePointerCapture?.(e.pointerId)
      const a = samples[0]
      const b = samples[samples.length - 1]
      const dtMs = Math.max(1, b.t - a.t)
      const v = ((b.y - a.y) / dtMs) * 1000 // px/s, + = down
      const cfg = cfgRef.current
      if (Math.abs(v) < cfg.flickThreshold) {
        // not a flick — spring back to the line-up
        plan = { ...plan, target: lineupPhi() }
        snapV = 0
        snapping = true
        return
      }
      const w = clamp((Math.abs(v) / slotPx()) * cfg.flickGain, cfg.flickMin, cfg.flickMax)
      spinMode = 'flick'
      spinDir = Math.sign(v)
      omega = spinDir * w
      spinStartOmega = omega
      startSpin()
    }
    wrap.addEventListener('pointerdown', onDown)
    wrap.addEventListener('pointermove', onMove)
    wrap.addEventListener('pointerup', onUp)
    wrap.addEventListener('pointercancel', onUp)

    const startSpin = () => {
      snapping = false
      if (spunAt < 0) spunAt = t
      setState('spinning')
      if (cfgRef.current.musicStart === 'spin') startMusic()
    }

    const startStopping = () => {
      const cfg = cfgRef.current
      const g = WHEEL_ORDER.indexOf(cfg.finalGrade)
      const w0 = Math.abs(omega) || cfg.cruiseSpeed
      const dir = Math.sign(omega) || 1
      const n = Math.max(1.2, cfg.stopEasePower)
      const o = Math.max(0, cfg.overshoot)
      const want = (w0 * cfg.stopDuration) / n + 6 * Math.max(0, Math.round(cfg.extraLoops))
      let target: number
      // the hold point is `o` slots PAST the target in the travel direction
      if (dir > 0) target = g + 6 * Math.ceil((phi + want - o - g) / 6)
      else target = g + 6 * Math.floor((phi - want + o - g) / 6)
      const hold = target + dir * o
      const dist = Math.abs(hold - phi)
      plan = { p0: phi, dir, dist, dur: (n * dist) / w0, n, hold, target }
      holdUntil = -1
      snapping = false
      snapV = 0
      setState('stopping')
    }

    // ---- loop ----
    let raf = 0
    let lastT = performance.now()
    const tickLoop = (now: number) => {
      const dt = Math.min((now - lastT) / 1000, 1 / 30)
      lastT = now
      const cfg = cfgRef.current
      measureVis()
      if (!pausedRef.current) t += dt
      const live = !pausedRef.current
      st = t - stateAt

      // signals
      if (sig.current.start !== seen.start) {
        seen.start = sig.current.start
        if (state === 'armed') {
          ensureAudio()
          setState('found')
          entryY = cfg.entryDistance
          entryV = 0
          foundArrivedAt = -1
          foundCenterAt = -1
          foundFlashAt = -1
          loadLive(cfg.foundColor)
          playSfx(sfx.start)
          if (cfg.ambient) playSfx(sfx.ambient)
          if (cfg.musicStart === 'start') startMusic()
        }
      }
      if (sig.current.lineup !== seen.lineup) {
        seen.lineup = sig.current.lineup
        if (state === 'found') setState('lineup')
      }
      if (sig.current.spin !== seen.spin) {
        seen.spin = sig.current.spin
        if (state === 'ready') {
          ensureAudio()
          spinMode = 'auto'
          spinDir = cfg.spinDirection === 'down' ? 1 : -1
          omega = 0
          startSpin()
        }
      }
      if (sig.current.stop !== seen.stop) {
        seen.stop = sig.current.stop
        if (state === 'spinning') startStopping()
      }

      // timers
      if (state === 'found' && cfg.autoLineupAfter > 0 && st >= cfg.autoLineupAfter) setState('lineup')

      // ---- found: entry spring ----
      if (live && (state === 'found' || state === 'lineup')) {
        const f = -cfg.entryStiffness * entryY - cfg.entryDamping * entryV
        entryV += (f / Math.max(0.05, cfg.entryMass)) * dt
        entryY += entryV * dt
        if (foundCenterAt < 0 && entryY <= 0.5) foundCenterAt = t
        if (foundArrivedAt < 0 && Math.abs(entryY) < 3 && Math.abs(entryV) < 60) {
          foundArrivedAt = t
          if (cfg.foundFlash) foundFlashAt = t + cfg.foundFlashDelay
        }
      }

      // ---- line-up ----
      if (state === 'lineup' && live) {
        let settled = st >= cfg.lineupDuration
        drop.forEach((d, i) => {
          if (i === 0) return // the found gem tweens instead
          if (st < cfg.dropStagger * i) {
            settled = false
            return
          }
          const f = -cfg.dropStiffness * (d.p - 1) - cfg.dropDamping * d.v
          d.v += f * dt
          d.p += d.v * dt
          if (Math.abs(d.p - 1) > 0.002 || Math.abs(d.v) > 0.02) settled = false
        })
        if (settled) {
          drop.forEach((d) => {
            d.p = 1
            d.v = 0
          })
          lineupDoneAt = t
          phi = lineupPhi()
          lastSlot = Math.round(phi)
          setState('ready')
          if (cfg.autoSpinAfter <= 0) {
            /* wait for a swipe or the spin trigger */
          }
        }
      }
      if (state === 'ready' && cfg.autoSpinAfter > 0 && st >= cfg.autoSpinAfter && !dragging) {
        ensureAudio()
        spinMode = 'auto'
        spinDir = cfg.spinDirection === 'down' ? 1 : -1
        omega = 0
        startSpin()
      }

      // ---- spin ----
      if (state === 'spinning' && live) {
        if (spinMode === 'auto') {
          const u = cfg.spinUpDuration > 0 ? clamp(st / cfg.spinUpDuration, 0, 1) : 1
          omega = spinDir * cfg.cruiseSpeed * EASING.easeIn(u)
        } else {
          omega = spinStartOmega
        }
        phi += omega * dt
        if (st >= cfg.spinDuration + (spinMode === 'auto' ? cfg.spinUpDuration : 0)) startStopping()
      }

      // ---- stopping: controlled ease-out to the hold point, hold, snap ----
      if (state === 'stopping' && live) {
        if (!snapping) {
          const u = clamp(st / Math.max(0.05, plan.dur), 0, 1)
          const e = 1 - Math.pow(1 - u, plan.n)
          const prev = phi
          phi = plan.p0 + plan.dir * plan.dist * e
          omega = (phi - prev) / Math.max(dt, 1e-4)
          if (u >= 1) {
            phi = plan.hold
            omega = 0
            if (Math.abs(plan.hold - plan.target) < 1e-4) {
              snapping = true
            } else if (holdUntil < 0) {
              holdUntil = t + cfg.overshootHold
            } else if (t >= holdUntil) {
              snapping = true
              snapV = 0
            }
          }
        }
        if (snapping) {
          const f = -cfg.snapStiffness * (phi - plan.target) - cfg.snapDamping * snapV
          snapV += f * dt
          phi += snapV * dt
          omega = snapV
          if (Math.abs(phi - plan.target) < 0.002 && Math.abs(snapV) < 0.02) {
            phi = plan.target
            omega = 0
            snapping = false
            winnerSlot = (((Math.round(plan.target) % slotCount()) + slotCount()) % slotCount())
            landedAt = t
            grow = 0
            growV = 0
            handoffAt = -1
            winnerRestS = 0
            punchPlayed = false
            setState('landed')
            playSfx(sfx.end)
            if (cfg.musicStart === 'land') startMusic()
          }
        }
      }
      // swipe that didn't commit — spring back to the line-up
      if (state === 'ready' && snapping && live && !dragging) {
        const f = -cfg.snapStiffness * (phi - plan.target) - cfg.snapDamping * snapV
        snapV += f * dt
        phi += snapV * dt
        if (Math.abs(phi - plan.target) < 0.002 && Math.abs(snapV) < 0.02) {
          phi = plan.target
          snapping = false
        }
      }

      // ---- ticks: one drip per slot passing the centre ----
      const slotNow = Math.round(phi)
      if (slotNow !== lastSlot) {
        const speedNorm = Math.abs(omega) / Math.max(1, cfg.cruiseSpeed)
        tick(speedNorm)
        lastSlot = slotNow
      }

      // ---- flashes ----
      let flashK = 0
      let othersK = 1
      // impact: × size on the winner — ease out to the peak, hold, ease slowly back to 1
      let impactK = 1
      let impactT = -1 // seconds since the landing flash
      if (state === 'landed' && handoffAt >= 0) impactT = t - handoffAt
      if (cfg.impact && impactT >= 0) {
        const up = Math.max(0.01, cfg.impactUp)
        const peak = Math.max(0.1, cfg.impactScale)
        if (impactT < up) impactK = lerp(1, peak, 1 - Math.pow(1 - impactT / up, 3))
        else if (impactT < up + cfg.impactHold) impactK = peak
        else {
          const u = clamp((impactT - up - cfg.impactHold) / Math.max(0.01, cfg.impactDown), 0, 1)
          impactK = lerp(peak, 1, EASING.easeInOut(u))
        }
      }
      if (foundFlashAt >= 0 && t >= foundFlashAt && (state === 'found' || state === 'lineup')) {
        const ft = t - foundFlashAt
        flashK = ft < cfg.flashHold ? 1 : Math.max(0, 1 - (ft - cfg.flashHold) / Math.max(0.01, cfg.flashDuration))
      }
      if (state === 'landed') {
        const lt = t - landedAt
        const ft = lt - cfg.flashDelay
        if (ft >= 0) {
          if (!punchPlayed) {
            punchPlayed = true
            playSfx(sfx.punch)
            // the winner starts spinning (live Lottie) under the flash
            loadLive(gradeColor(cfg, winnerSlot % 6))
            handoffAt = t
          }
          flashK = ft < cfg.flashHold ? 1 : Math.max(0, 1 - (ft - cfg.flashHold) / Math.max(0.01, cfg.flashDuration))
          othersK = 1 - clamp(ft / Math.max(0.01, cfg.othersFade), 0, 1)
          if (live) {
            const f = -cfg.growStiffness * (grow - 1) - cfg.growDamping * growV
            growV += f * dt
            grow += growV * dt
          }
        }
      }

      // ================= draw =================
      ctx.clearRect(0, 0, size.w, size.h)
      const cx = size.w / 2
      const cy = size.h / 2
      const spinning = state === 'spinning' || state === 'stopping'
      // live Lottie placement (the found gem, then the winner)
      let liveK = 0
      let liveY = 0
      let liveS = 0
      const bobAmt = spinning ? 0 : 1
      const bob = (i: number) => Math.sin((t * cfg.hoverFreq + i * cfg.hoverStagger) * TAU) * cfg.hoverAmp * bobAmt

      // ---- warp: speed lines while the wheel turns (behind everything) ----
      {
        const target = spinning ? clamp(Math.abs(omega) / Math.max(1, cfg.cruiseSpeed), 0, 1) : 0
        if (live) {
          const rate = dt / Math.max(0.05, cfg.warpFade)
          warpK = warpK < target ? Math.min(target, warpK + rate) : Math.max(target, warpK - rate)
        }
        const n = cfg.warp ? Math.round(cfg.warpCount) : 0
        while (streaks.length < n) {
          streaks.push({
            x: Math.random() * size.w,
            y: Math.random() * (size.h + cfg.warpLength) - cfg.warpLength,
            speed: 1 + (Math.random() * 2 - 1) * cfg.warpSpeedVar,
            alpha: 1 - Math.random() * cfg.warpOpacityVar,
            hue: (Math.random() * 2 - 1) * cfg.warpColorVar * 60,
          })
        }
        if (streaks.length > n) streaks.length = n
        if (cfg.warp && (warpK > 0.01 || spinning)) {
          // lines travel with the gems: + omega = gems moving down
          const v = omega * slotPx() * cfg.warpSpeedScale
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          for (const sk of streaks) {
            if (live) {
              sk.y += v * sk.speed * dt
              if (sk.y > size.h) {
                sk.y = -cfg.warpLength
                sk.x = Math.random() * size.w
              } else if (sk.y < -cfg.warpLength) {
                sk.y = size.h
                sk.x = Math.random() * size.w
              }
            }
            if (warpK <= 0.01) continue
            const col = sk.hue ? shiftHue(cfg.warpColor, sk.hue) : cfg.warpColor
            ctx.fillStyle = hexToRgba(col, cfg.warpOpacity * sk.alpha * warpK)
            ctx.fillRect(sk.x - cfg.warpWidth / 2, sk.y, cfg.warpWidth, cfg.warpLength)
          }
          ctx.restore()
        }
      }

      // ---- jet: gradient tracks trailing the found gem's entry ----
      if (cfg.jet && cfg.jetLength > 0 && (state === 'found' || state === 'lineup')) {
        let headY = cy + entryY + bob(0)
        let fade = 0
        if (foundCenterAt >= 0) fade = clamp((t - foundCenterAt - cfg.jetFadeDelay) / Math.max(0.01, cfg.jetFadeDuration), 0, 1)
        if (state === 'lineup') {
          const u = EASING[cfg.lineupEase](clamp(st / Math.max(0.05, cfg.lineupDuration), 0, 1))
          headY = lerp(cy + entryY, place(0, lineupPhi()).y, u) + bob(0)
          fade = Math.max(fade, smooth(0, 0.3, st))
        }
        if (fade < 1) {
          const y0 = headY
          const y1 = headY + cfg.jetLength
          const grad = ctx.createLinearGradient(0, y0, 0, y1)
          const cut = clamp(1 - fade, 0.001, 0.999) // retracts tail → head
          grad.addColorStop(0, hexToRgba(cfg.jetColor, cfg.jetOpacityStart))
          if (fade > 0) {
            grad.addColorStop(Math.max(0, cut - 0.06), hexToRgba(cfg.jetColor, lerp(cfg.jetOpacityStart, cfg.jetOpacityEnd, cut)))
            grad.addColorStop(Math.min(1, cut + 0.02), hexToRgba(cfg.jetColor, 0))
            grad.addColorStop(1, hexToRgba(cfg.jetColor, 0))
          } else {
            grad.addColorStop(1, hexToRgba(cfg.jetColor, cfg.jetOpacityEnd))
          }
          const tracks = Math.round(cfg.jetTracks) === 2 ? [-1, 1] : [0]
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          ctx.fillStyle = grad
          for (const d of tracks) {
            const tcx = cx + d * (cfg.jetSpacing / 2 + cfg.jetTrackWidth / 2)
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
      }

      // line work (behind the gems)
      const drumVisible = state === 'ready' || spinning || state === 'landed' || state === 'lineup'
      if (cfg.lines && drumVisible) {
        // in only once the gems have settled into the line-up
        const linesUp =
          lineupDoneAt < 0 ? 0 : smooth(cfg.lineInDelay, cfg.lineInDelay + Math.max(0.01, cfg.lineInFade), t - lineupDoneAt)
        const lineIn = linesUp * (state === 'landed' ? othersK : 1)
        const hw = Math.max(10, Math.min(cfg.lineHalfWidth, size.w / 2 - 4))
        const sideFade = clamp(cfg.lineSideFade, 0, 0.99) * 0.5
        ctx.save()
        ctx.lineWidth = cfg.lineWidth
        ctx.lineCap = 'butt'
        // slot separators — evenly spaced, fading past the line-up's ends and toward their own ends
        const S = slotCount()
        const lp = lineupPhi()
        for (let i = 0; i < S; i++) {
          // in the line-up only the five lines between the six gems
          if (state === 'lineup' || (state === 'ready' && spunAt < 0 && Math.abs(phi - lp) < 1e-3)) {
            if (i > 4) continue
          }
          const p = place(i + 0.5, phi)
          if (p.alpha <= 0.01 || p.y < -10 || p.y > size.h + 10) continue
          const op = cfg.lineOpacity * p.alpha * lineIn
          const lg = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0)
          lg.addColorStop(0, hexToRgba(cfg.lineColor, 0))
          lg.addColorStop(0.5 - sideFade, hexToRgba(cfg.lineColor, op))
          lg.addColorStop(0.5 + sideFade, hexToRgba(cfg.lineColor, op))
          lg.addColorStop(1, hexToRgba(cfg.lineColor, 0))
          ctx.strokeStyle = lg
          ctx.beginPath()
          ctx.moveTo(cx - hw, p.y)
          ctx.lineTo(cx + hw, p.y)
          ctx.stroke()
        }
        // centre selection bracket
        if (cfg.bracket) {
          const bk = cfg.bracketOpacity * lineIn
          ctx.fillStyle = hexToRgba(cfg.bracketColor, bk)
          const s = 9
          const bhw = Math.min(cfg.bracketHalfWidth, size.w / 2 - 4)
          const xl = cx - bhw
          const xr = cx + bhw
          ctx.beginPath()
          ctx.moveTo(xl, cy - s)
          ctx.lineTo(xl + s * 1.2, cy)
          ctx.lineTo(xl, cy + s)
          ctx.closePath()
          ctx.moveTo(xr, cy - s)
          ctx.lineTo(xr - s * 1.2, cy)
          ctx.lineTo(xr, cy + s)
          ctx.closePath()
          ctx.fill()
        }
        ctx.restore()
      }

      // winner glow
      if (state === 'landed' && cfg.glow && winnerSlot >= 0) {
        const k = clamp((t - landedAt - cfg.flashDelay) / 0.3, 0, 1)
        const g = winnerSlot % 6
        const ws = lerp(gemPx(g), cfg.gemSize * cfg.winnerScale, grow) * impactK
        const r = ws * 0.5 + cfg.glowSize
        const hex = gradeColor(cfg, g)
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        grd.addColorStop(0, hexToRgba(hex, clamp(0.35 * cfg.glowIntensity * k * (1 + flashK), 0, 1)))
        grd.addColorStop(0.5, hexToRgba(hex, clamp(0.12 * cfg.glowIntensity * k, 0, 1)))
        grd.addColorStop(1, hexToRgba(hex, 0))
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = grd
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
        ctx.restore()
      }

      // impact: white burst + shockwave ring behind the winner
      if (impactT >= 0 && cfg.impact) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        if (cfg.impactFlash > 0) {
          const k = 1 - clamp(impactT / Math.max(0.01, cfg.impactFlashDecay), 0, 1)
          if (k > 0) {
            const r = Math.max(10, cfg.impactFlashSize * size.h) * lerp(0.6, 1, 1 - k * k)
            const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
            const a = clamp(cfg.impactFlash * k * k, 0, 1)
            grd.addColorStop(0, hexToRgba('#ffffff', a))
            grd.addColorStop(0.35, hexToRgba('#ffffff', a * 0.45))
            grd.addColorStop(1, hexToRgba('#ffffff', 0))
            ctx.fillStyle = grd
            ctx.fillRect(0, 0, size.w, size.h)
          }
        }
        if (cfg.impactRing && winnerRestS > 0) {
          const u = clamp(impactT / Math.max(0.01, cfg.impactRingDuration), 0, 1)
          if (u < 1) {
            const e = 1 - Math.pow(1 - u, 3)
            const r0 = winnerRestS * 0.4
            const r = r0 + (cfg.impactRingSize + winnerRestS * 0.1) * e
            ctx.strokeStyle = hexToRgba(cfg.impactRingColor, cfg.impactRingOpacity * (1 - u))
            ctx.lineWidth = Math.max(0.5, cfg.impactRingWidth * (1 - u * 0.7))
            ctx.beginPath()
            ctx.arc(cx, cy, r, 0, TAU)
            ctx.stroke()
          }
        }
        ctx.restore()
      }

      if (state === 'found') {
        // the found gem is the live Lottie — spinning at full frame rate
        liveK = 1
        liveY = entryY + bob(0)
        liveS = cfg.gemSize * cfg.foundScale
      } else if (state === 'lineup') {
        // gems 1–5 drop in from the top into their slots
        for (let i = 1; i < 6; i++) {
          const d = drop[i]
          if (t - stateAt < cfg.dropStagger * i) continue
          const p = place(i, lineupPhi())
          const fromY = -gemPx(i)
          const y = lerp(fromY, p.y, d.p)
          drawGem(i, 0, cx, y + bob(i), gemPx(i) * p.sx, p.sy / p.sx, Math.min(1, d.p * 3) * p.alpha)
        }
        // the found gem: shrink, slide down into the Notable slot, white → Notable
        const u = EASING[cfg.lineupEase](clamp(st / Math.max(0.05, cfg.lineupDuration), 0, 1))
        const p0 = place(0, lineupPhi())
        const fromS = cfg.gemSize * cfg.foundScale
        const s = lerp(fromS, gemPx(0) * p0.sx, u)
        const sy = lerp(1, p0.sy / p0.sx, u)
        const y = lerp(cy + entryY, p0.y, u) + bob(0)
        const alpha = lerp(1, p0.alpha, u)
        // the live (spinning) white gem fades out on top of the still canvas gem
        // as it travels — so the gems are all still once they're lined up.
        // Only the TOP layer of each blend fades (the one underneath stays
        // opaque); fading both at once dips the gem see-through mid-way.
        const xfade = smooth(0, Math.max(0.05, cfg.lineupDuration * 0.4), st)
        liveK = 1 - xfade
        liveY = y - cy
        liveS = s
        drawGem(FOUND, 0, cx, y, s, sy, alpha) // white, opaque underneath
        drawGem(0, 0, cx, y, s, sy, alpha * u) // Notable fading in over it
      } else if (state !== 'armed') {
        // the drum — back to front
        const S = slotCount()
        const order: { i: number; cos: number }[] = []
        // nearest the centre drawn last (on top)
        for (let i = 0; i < S; i++) order.push({ i, cos: -Math.abs(place(i, phi).d) })
        order.sort((a, b) => a.cos - b.cos)
        // gems further along the loop show (faded) once the line-up has settled
        const extrasK = lineupDoneAt < 0 ? 0 : smooth(0, 0.4, t - lineupDoneAt)
        for (const { i } of order) {
          const g = i % 6
          const p = place(i, phi)
          if (i >= 6) p.alpha *= extrasK
          if (p.alpha <= 0.002 || p.y < -gemPx(g) || p.y > size.h + gemPx(g)) continue
          const isWinner = state === 'landed' && i === winnerSlot
          if (state === 'landed' && !isWinner) {
            drawGem(g, 0, cx, p.y + bob(i), gemPx(g) * p.sx, p.sy / p.sx, p.alpha * othersK)
            continue
          }
          if (isWinner) continue // drawn on top below
          drawGem(g, 0, cx, p.y + bob(i), gemPx(g) * p.sx, p.sy / p.sx, p.alpha)
        }
        if (state === 'landed' && winnerSlot >= 0) {
          const g = winnerSlot % 6
          const restS = lerp(gemPx(g), cfg.gemSize * cfg.winnerScale, grow)
          const ws = restS * impactK
          winnerRestS = restS
          const y = cy + bob(winnerSlot) * clamp(grow, 0, 1)
          if (handoffAt < 0) {
            // still on the wheel's rest frame until the flash
            drawGem(g, 0, cx, y, ws, 1, 1)
          } else {
            liveK = 1
            liveY = y - cy
            liveS = ws
          }
        }
      }
      // live Lottie + its white flash (a solid white gem shape with a bloom)
      liveEl.style.opacity = liveK.toFixed(3)
      if (liveK > 0) {
        const sc = Math.max(0.001, liveS / 256)
        liveEl.style.transform = `translate(-50%, -50%) translate(0px, ${liveY.toFixed(2)}px) scale(${sc.toFixed(4)})`
        flashEl.style.opacity = flashK.toFixed(3)
        flashWrap.style.filter = flashK > 0 && cfg.flashBlur > 0 ? `blur(${(cfg.flashBlur / sc).toFixed(1)}px)` : ''
      } else {
        flashEl.style.opacity = '0'
      }

      // ---- grade label: the folded button under the winner ----
      if (cfg.label && state === 'landed' && handoffAt >= 0 && t >= handoffAt + cfg.labelDelay) {
        if (live) {
          const m = Math.max(0.05, cfg.labelMass)
          const fS = -cfg.labelStiffness * (lblScale - 1) - cfg.labelDamping * lblScaleV
          lblScaleV += (fS / m) * dt
          lblScale += lblScaleV * dt
          const fR = -cfg.labelStiffness * (lblRot - cfg.labelRotate) - cfg.labelDamping * lblRotV
          lblRotV += (fR / m) * dt
          lblRot += lblRotV * dt
          lblOpacity = Math.min(1, lblOpacity + dt / 0.15)
        }
      } else if (state !== 'landed') {
        lblScale = cfg.labelFromScale
        lblScaleV = 0
        lblRot = cfg.labelFromRotate
        lblRotV = 0
        lblOpacity = 0
      }
      {
        const fs = 14 * Math.max(0.2, cfg.labelSize)
        // attached to the winner's bottom point — it rides the impact swell back down
        const winnerBottom = liveY + liveS * 0.41
        const ly = winnerBottom + cfg.labelOffsetY + fs * 1.35
        labelEl.style.setProperty('--gem-btn-fs', `${fs.toFixed(2)}px`)
        labelEl.style.opacity = (cfg.label ? lblOpacity : 0).toFixed(3)
        labelEl.style.transform = `translate(-50%, -50%) translate(0px, ${ly.toFixed(1)}px) scale(${lblScale.toFixed(4)}) rotate(${lblRot.toFixed(2)}deg)`
      }

      // ---- text ----
      {
        const textY = cy + (cfg.gemSize * cfg.foundScale) / 2 + cfg.textGap + (state === 'found' ? entryY : 0)
        let k1 = 0
        let k2 = 0
        if (state === 'found') k1 = smooth(cfg.textInDelay, cfg.textInDelay + cfg.textFade, st)
        else if (state === 'lineup') k1 = 1 - smooth(cfg.textOutDelay, cfg.textOutDelay + cfg.textFade, st)
        else if (state === 'ready' && lineupDoneAt >= 0) {
          const since = t - lineupDoneAt
          if (cfg.promptText.trim()) k2 = smooth(cfg.promptDelay, cfg.promptDelay + cfg.textFade, since)
        }
        textEl.style.opacity = k1.toFixed(3)
        textEl.style.fontSize = `${cfg.textSize}px`
        textEl.style.transform = `translate(-50%, 0) translate(0px, ${(textY - cy).toFixed(1)}px)`
        promptEl.style.opacity = k2.toFixed(3)
        promptEl.style.fontSize = `${cfg.textSize}px`
        const promptY = size.h - cfg.lineupMargin + 4 // in the bottom margin, just under Notable
        promptEl.style.transform = `translate(-50%, 0) translate(0px, ${(Math.min(promptY, size.h - cfg.textSize * 1.4) - cy).toFixed(1)}px)`
      }

      raf = requestAnimationFrame(tickLoop)
    }
    raf = requestAnimationFrame(tickLoop)

    return () => {
      dead = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      wrap.removeEventListener('pointerdown', onDown)
      wrap.removeEventListener('pointermove', onMove)
      wrap.removeEventListener('pointerup', onUp)
      wrap.removeEventListener('pointercancel', onUp)
      window.clearTimeout(musicTimer)
      for (const el of Object.values(sfx)) {
        el.pause()
        el.src = ''
      }
      if (music) {
        music.pause()
        music.src = ''
      }
      actx?.close().catch(() => {})
      liveAnim?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey])

  // live mute / volume for the long-running audio (one-shots read cfgRef as they fire)
  useEffect(() => {
    const { ambient, music } = longAudio.current
    if (ambient) {
      ambient.volume = clamp(c.volume, 0, 1)
      if (!c.sound || !c.ambient) ambient.pause()
    }
    if (music) {
      music.volume = clamp(c.musicVolume, 0, 1)
      music.loop = c.musicLoop
      if (!c.sound) music.pause()
      else if (longAudio.current.playing) music.play().catch(() => {})
    }
  }, [c.sound, c.ambient, c.volume, c.musicVolume, c.musicLoop])

  return (
    <div ref={wrapRef} className='gem-wheel'>
      <canvas ref={canvasRef} className='gem-wheel__canvas' />
      <div ref={liveRef} className='gem-wheel__live' aria-hidden='true'>
        <div ref={liveHostRef} className='gem-wheel__lottie' />
        <div ref={flashWrapRef} className='gem-wheel__flash-wrap'>
          <div ref={flashRef} className='gem-wheel__flash' />
        </div>
      </div>
      <div ref={textRef} className='gem-wheel__text'>
        {c.text}
      </div>
      <div ref={promptRef} className='gem-wheel__text gem-wheel__text--prompt'>
        {c.promptText}
      </div>
      <div ref={labelRef} className='gem-reveal__btn gem-wheel__label' aria-hidden='true'>
        <FoldableButton>{c.labelOverride.trim() || WHEEL_LABEL[c.finalGrade]}</FoldableButton>
      </div>
    </div>
  )
}
