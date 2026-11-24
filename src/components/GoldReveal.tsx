import { useEffect, useRef, useState } from 'react'
import { FoldableButton } from '@/components/banner-stubs'
import { ParticleRain, type ParticleRainConfig } from '@/components/ParticleRain'
import { Confetti } from '@/components/Confetti'
import {
  GOLD_CLOSING_LINES,
  GOLD_DEFAULT_CONFIG,
  GOLD_REFERENCE_WIDTH,
  GOLD_TEASE_LINES,
  goldConfettiConfig,
  goldIconPx,
  goldPile,
  type GoldRevealConfig,
  type GoldRevealState,
} from '@/components/goldReveal.config'
import { REVEAL_MUSIC } from '@/components/revealMusic'
import { hexToRgba } from '@/lib/gemTiers'
import goldbarUrl from '@/assets/GOLDBAR_X3.svg'
// placeholder avatar poses — the production avatar is a Rive file (see the README)
import avatarFistUrl from '@/assets/fistRaise.png'
import avatarPointUrl from '@/assets/pointUp.png'
import tickerUrl from '@/assets/mp3/GemReveal_ticker.mp3'
import aaahUrl from '@/assets/revealSFX/aaah.mp3'
import ooohUrl from '@/assets/revealSFX/oooh.mp3'
import cheerUrl from '@/assets/mp3/dailyGoldCheer.mp3'
import counterUrl from '@/assets/mp3/dailyGoldCounter.mp3'
import chaChingUrl from '@/assets/mp3/chaChing.mp3'
import { GOLD_BAR_SFX, GOLD_CONFETTI_SFX } from '@/components/goldSfx'
import { createSfxBus } from '@/lib/sfxBank'

/**
 * Gold Reveal — "a balance update turned into a payday".
 *
 *   armed → tease → pour → piled → drain → count → landed
 *
 * - **tease**: a playful line pops in on its own ("Ka-ching! …").
 * - **pour**: gold bars pour in from the top and pile up until they fill the
 *   screen. The pile IS the Particle Rain engine (burst + floor + collisions),
 *   with its bar count worked out from the stage's area so the same fill level
 *   buries a phone and a desktop alike. The tease is underneath — it gets buried.
 * - **piled**: the pile goes to sleep (Particle Rain's auto-sleep), holds a beat.
 * - **drain**: the floor is pulled out (Particle Rain's `dumpSignal`) and the
 *   pile cascades off the bottom, uncovering "You found gold!" / GOLDBAR_X3 /
 *   "<amount> GRAILGOLD", stacked.
 * - **count**: the amount counts up with an ease-out.
 * - **landed**: impact — the icon pulses — swells and eases back (same curve
 *   as the gem) with a white burst + shockwave ring around it;
 *   then the closing line and the Grail Shop button spring in.
 *
 * Layers, back → front: fx canvas (glow / burst / ring) → tease → amount + shop
 * push → the gold pile canvas.
 */

const TAU = Math.PI * 2
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / Math.max(1e-6, e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

export type GoldRevealProps = {
  config?: Partial<GoldRevealConfig>
  paused?: boolean
  runKey?: string | number
  /** armed → tease (bump a counter) */
  startSignal?: number
  /** pull the floor out now (pour / piled → drain) */
  drainSignal?: number
  onState?: (s: GoldRevealState) => void
  /** "Go to the shop" was pressed */
  onShop?: () => void
  /** "Open another chest" was pressed */
  onBuy?: () => void
  /** skip `armed` — start the sequence as soon as it mounts (a fresh runKey + this = restart) */
  autoStart?: boolean
}

// the last random picks, so the same line never comes up twice in a row
const lastPick = { tease: -1, closing: -1 }
function pickIndex(n: number, last: number) {
  if (n <= 1) return 0
  let i = Math.floor(Math.random() * n)
  if (i === last) i = (i + 1 + Math.floor(Math.random() * (n - 1))) % n
  return i
}
/** 'random' → the index rolled for this run; otherwise the chosen index, kept in range */
/** the random amount for a roll u ∈ [0, 1): min…max, rounded to the step */
function randomAmount(c: GoldRevealConfig, u: number) {
  const lo = Math.min(c.amountMin, c.amountMax)
  const hi = Math.max(c.amountMin, c.amountMax)
  const step = Math.max(1, c.amountStep)
  return Math.min(hi, Math.max(lo, Math.round((lo + u * (hi - lo)) / step) * step))
}

function lineIndex(choice: string, rolled: number, n: number) {
  if (choice === 'random') return rolled
  const i = Number(choice)
  return Number.isFinite(i) ? Math.max(0, Math.min(n - 1, Math.round(i))) : 0
}

export function GoldReveal({
  config,
  paused = false,
  runKey,
  startSignal = 0,
  drainSignal = 0,
  onState,
  onShop,
  onBuy,
  autoStart = false,
}: GoldRevealProps) {
  const base: GoldRevealConfig = { ...GOLD_DEFAULT_CONFIG, ...config }
  // prototype: a random amount for every run (a new runKey = a new roll); in the app it's set
  const amountRoll = useRef<{ key: unknown; u: number } | null>(null)
  if (!amountRoll.current || amountRoll.current.key !== runKey) amountRoll.current = { key: runKey, u: Math.random() }
  const c: GoldRevealConfig = base.amountRandom
    ? { ...base, amount: randomAmount(base, amountRoll.current.u) }
    : base
  const wrapRef = useRef<HTMLDivElement>(null)
  const fxRef = useRef<HTMLCanvasElement>(null)
  const teaseRef = useRef<HTMLDivElement>(null)
  const teaseSubRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const iconRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)
  const amountLineRef = useRef<HTMLDivElement>(null)
  const amountRef = useRef<HTMLSpanElement>(null)
  const shopRef = useRef<HTMLDivElement>(null)
  const closingRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLDivElement>(null)
  const btn2Ref = useRef<HTMLDivElement>(null)

  const cfgRef = useRef(c)
  cfgRef.current = c
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const autoStartRef = useRef(autoStart)
  autoStartRef.current = autoStart
  const onStateRef = useRef(onState)
  onStateRef.current = onState
  const musicRef = useRef<{ el: HTMLAudioElement | null; playing: boolean }>({ el: null, playing: false })

  const cannonShot = useRef<((side: number) => void) | null>(null)

  // the pile: mounted fresh at each pour, sized to the stage at that moment
  const [pile, setPile] = useState<{ run: number; size: number; count: number } | null>(null)
  const [dump, setDump] = useState(0)
  // a fresh random tease + closing line for every run (a new runKey = a new roll)
  const roll = useRef<{ key: unknown; tease: number; closing: number; fist: boolean } | null>(null)
  if (!roll.current || roll.current.key !== runKey) {
    const tease = pickIndex(GOLD_TEASE_LINES.length, lastPick.tease)
    const closing = pickIndex(GOLD_CLOSING_LINES.length, lastPick.closing)
    lastPick.tease = tease
    lastPick.closing = closing
    roll.current = { key: runKey, tease, closing, fist: Math.random() < 0.5 }
  }
  const [teaseText, teaseSubText] =
    GOLD_TEASE_LINES[lineIndex(c.teaseLine, roll.current.tease, GOLD_TEASE_LINES.length)]
  const closingText = GOLD_CLOSING_LINES[lineIndex(c.closingLine, roll.current.closing, GOLD_CLOSING_LINES.length)]
  const avatarUrl =
    c.avatarPose === 'fistRaise' || (c.avatarPose === 'random' && roll.current.fist) ? avatarFistUrl : avatarPointUrl
  const [teaseFire, setTeaseFire] = useState(0)
  const [impactFire, setImpactFire] = useState(0)
  const pileEvents = useRef({ settled: false, cleared: false, drained: 0 })

  // signals → counters the loop reads
  const sig = useRef({ start: 0, drain: 0 })
  const last = useRef({ start: startSignal, drain: drainSignal })
  useEffect(() => {
    if (startSignal !== last.current.start) {
      last.current.start = startSignal
      sig.current.start++
    }
    if (drainSignal !== last.current.drain) {
      last.current.drain = drainSignal
      sig.current.drain++
    }
  }, [startSignal, drainSignal])

  useEffect(() => {
    const wrap = wrapRef.current
    const fx = fxRef.current
    const teaseEl = teaseRef.current
    const teaseSubEl = teaseSubRef.current
    const headerEl = headerRef.current
    const iconEl = iconRef.current
    const avatarEl = avatarRef.current
    const amountLineEl = amountLineRef.current
    const amountEl = amountRef.current
    const shopEl = shopRef.current
    const closingEl = closingRef.current
    const btnEl = btnRef.current
    const btn2El = btn2Ref.current
    if (!avatarEl || !btn2El || !shopEl || !wrap || !fx || !teaseEl || !teaseSubEl || !headerEl || !iconEl || !amountLineEl || !amountEl || !closingEl || !btnEl) return
    const ctx = fx.getContext('2d')
    if (!ctx) return

    setPile(null)
    pileEvents.current = { settled: false, cleared: false, drained: 0 }

    // ---- canvas sizing ----
    let size = { w: wrap.clientWidth, h: wrap.clientHeight }
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      size = { w: wrap.clientWidth, h: wrap.clientHeight }
      fx.width = Math.max(1, Math.round(size.w * dpr))
      fx.height = Math.max(1, Math.round(size.h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    // the tease lines' real heights (the subheader may wrap) — measured on change, not per frame
    // the headline stays on one line and shrinks to fit a narrow screen (e.g. "Clear some space!")
    // the headline's width per px of font size — so it can be capped to fit the screen
    let teaseWidthPerPx = 0
    let teaseFitText = ''
    const fitTease = () => {
      const fs = parseFloat(teaseEl.style.fontSize) || cfgRef.current.teaseSize
      teaseWidthPerPx = teaseEl.scrollWidth / fs
      teaseFitText = teaseEl.textContent ?? ''
    }
    const teaseH = { head: teaseEl.offsetHeight, sub: teaseSubEl.offsetHeight, subW: teaseSubEl.offsetWidth }
    const teaseRo = new ResizeObserver(() => {
      fitTease()
      teaseH.head = teaseEl.offsetHeight
      teaseH.sub = teaseSubEl.offsetHeight
      teaseH.subW = teaseSubEl.offsetWidth
    })
    teaseRo.observe(teaseEl)
    teaseRo.observe(teaseSubEl)
    teaseRo.observe(wrap)
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    // ---- audio ----
    const mk = (src: string, loop = false) => {
      const el = new Audio(src)
      el.preload = 'auto'
      el.loop = loop
      return el
    }
    const sfx = { ticker: mk(tickerUrl, true), chaChing: mk(chaChingUrl) }
    // layered one-shots: the cannons, the crowd, the gold bars
    const bus = createSfxBus()
    const bars = bus.group(GOLD_BAR_SFX)
    const pops = bus.group(GOLD_CONFETTI_SFX)
    const around = (v: number) => 1 + (Math.random() * 2 - 1) * v
    const barHit = (volume: number, rate = 1) => {
      const cfg = cfgRef.current
      bars.play({
        volume: volume * around(cfg.barVolumeVar),
        rate: rate * around(cfg.barPitchVar),
        pan: (Math.random() * 2 - 1) * cfg.barPan,
        delay: Math.random() * 0.03, // off the frame grid
        levelMatch: cfg.sfxLevelMatch,
      })
    }
    cannonShot.current = (side) => {
      const cfg = cfgRef.current
      if (!cfg.cannonSound) return
      for (let i = 0; i < Math.max(1, Math.round(cfg.cannonSoundLayers)); i++) {
        pops.play({
          volume: cfg.cannonSoundVolume,
          rate: around(cfg.cannonSoundPitchVar),
          pan: side === 0 ? -0.6 : side === 1 ? 0.6 : 0,
          delay: i === 0 ? 0 : Math.random() * 0.05,
          levelMatch: cfg.sfxLevelMatch,
        })
      }
    }
    const cheer = bus.group([cheerUrl])
    const counter = bus.group([counterUrl])
    const crowd = { random: bus.group([ooohUrl, aaahUrl]), oooh: bus.group([ooohUrl]), aaah: bus.group([aaahUrl]) }
    // the pile-up: hit times (seconds into the pour), thin at first and building, then a few stragglers
    let pileHits: { at: number; k: number }[] = []
    const composePile = (cfg: GoldRevealConfig) => {
      const n = Math.max(0, Math.round(cfg.pileHits))
      const hits = Array.from({ length: n }, (_, i) => {
        // the first hit lands exactly on the cue; the rest are scattered
        const u = i === 0 ? 0 : Math.pow((i + Math.random()) / n, 1 / Math.max(0.2, cfg.pileRamp))
        return { at: cfg.pileDelay + u * cfg.pileDuration, k: lerp(cfg.pileVolumeStart, 1, u) }
      })
      const tail = Math.max(0, Math.round(cfg.pileTailHits))
      for (let i = 0; i < tail; i++) {
        const u = (i + Math.random()) / tail
        hits.push({ at: cfg.pileDelay + cfg.pileDuration + u * cfg.pileTailTime, k: lerp(0.8, 0.3, u) })
      }
      return hits.sort((a, b) => b.at - a.at) // soonest last, so it can be popped
    }
    let pileClock = 0 // seconds since the pour started
    let drainClock = -1 // seconds since the floor went (-1 = it hasn't)
    let drainPlayed = 0
    const play = (el: HTMLAudioElement, on: boolean) => {
      const cfg = cfgRef.current
      if (!cfg.sound || !on) return
      el.volume = clamp(cfg.volume, 0, 1)
      el.currentTime = 0
      el.play().catch(() => {})
    }
    const c0 = cfgRef.current
    const musicKeys = Object.keys(REVEAL_MUSIC) as (keyof typeof REVEAL_MUSIC)[]
    const musicKey =
      c0.musicTrack === 'off'
        ? null
        : c0.musicTrack === 'random'
          ? musicKeys[Math.floor(Math.random() * musicKeys.length)]
          : c0.musicTrack
    const music = musicKey ? mk(REVEAL_MUSIC[musicKey].url, c0.musicLoop) : null
    musicRef.current = { el: music, playing: false }
    let musicTimer = 0
    // confetti cues, on the loop's clock (so `paused` holds them too)
    let teaseConfettiAt = -1
    let cheerAt = -1
    let counterAt = -1
    let crowdAt = -1
    let impactConfettiAt = -1
    const startMusic = () => {
      if (!music) return
      window.clearTimeout(musicTimer)
      musicTimer = window.setTimeout(() => {
        const cfg = cfgRef.current
        // the cue has been reached: if muted now, unmuting brings the music in
        musicRef.current.playing = true
        music.volume = clamp(cfg.musicVolume, 0, 1)
        music.loop = cfg.musicLoop
        music.currentTime = 0
        if (cfg.sound) music.play().catch(() => {})
      }, Math.max(0, cfgRef.current.musicDelay) * 1000)
    }

    // ---- state ----
    let state: GoldRevealState = 'armed'
    let t = 0
    let st = 0 // seconds in the current state (reset in setState)
    let revealAt = -1
    let teaseAt = -1
    // avatar slide: 0 = in place, 1 = hidden below the bottom edge
    let avY = 1
    let avV = 0
    let avOutAt = -1
    let impactPendingAt = -1
    let landedAt = -1
    let impactAt = -1
    let impactStarAngles: number[] = []
    let pileRun = 0
    const seen = { ...sig.current }
    const drained = () => (pileEvents.current.cleared ? 1 : pileEvents.current.drained)
    const setState = (s: GoldRevealState) => {
      state = s
      st = 0
      onStateRef.current?.(s)
      const cfg = cfgRef.current
      if (s === 'tease') {
        teaseAt = t
        if (cfg.musicStart === 'start') startMusic()
        const cue = t + cfg.teaseInDelay + Math.max(0, cfg.teaseConfettiDelay)
        if (cfg.teaseConfetti !== 'off') teaseConfettiAt = cue
        if (cfg.cheeringSound) cheerAt = cue + Math.max(0, cfg.cheeringDelay)
      }
      if (s === 'pour') {
        const p = goldPile(cfg, size.w, size.h)
        pileRun++
        pileEvents.current = { settled: false, cleared: false, drained: 0 }
        setPile({ run: pileRun, ...p })
        // the counter starts with the first gold-bar hit
        if (cfg.counterSound) counterAt = t + cfg.pileDelay + Math.max(0, cfg.counterDelay)
        if (cfg.pileCrowdSound !== 'off') crowdAt = t + cfg.pileDelay + Math.max(0, cfg.pileCrowdDelay)
        pileClock = 0
        pileHits = cfg.pourSound ? composePile(cfg) : []
      }
      if (s === 'drain') {
        setDump((d) => d + 1)
        pileHits = [] // pulled early: the pile-up is over
        counterAt = -1
        crowdAt = -1
        drainClock = 0
        drainPlayed = 0
        if (cfg.musicStart === 'drain') startMusic()
      }
      if (s === 'count') {
        revealAt = t
        impactPendingAt = t + Math.max(0, cfg.impactDelay)
        play(sfx.ticker, cfg.countSound)
      }
      if (s === 'landed') {
        // the count is done: the ticker stops and the shop push comes in
        landedAt = t
        sfx.ticker.pause()
      }
    }
    // the impact — fired with the reveal (+ impactDelay), while the count keeps running
    const fireImpact = () => {
      const cfg = cfgRef.current
      impactAt = t
      // the impact starburst's stroke angles, fixed for this impact
      {
          const n = Math.max(1, Math.round(cfg.impactStarStrokes))
          const rot = (cfg.impactStarRotate * Math.PI) / 180
          impactStarAngles = Array.from({ length: n }, (_, i) =>
            cfg.impactStarLayout === 'random' ? Math.random() * TAU : rot - Math.PI / 2 + (i * TAU) / n,
          )
        }
      play(sfx.chaChing, cfg.impactSound)
      if (cfg.musicStart === 'impact') startMusic()
      if (cfg.impactConfetti !== 'off') impactConfettiAt = t + Math.max(0, cfg.impactConfettiDelay)
    }
    onStateRef.current?.('armed')
    if (autoStartRef.current) setState('tease')

    // springs
    let teaseS = c0.teaseFromScale
    let teaseSV = 0
    let teaseR = c0.teaseFromRotate
    let teaseRV = 0
    let subS = c0.teaseFromScale
    let subSV = 0
    let subR = c0.teaseFromRotate
    let subRV = 0
    // the two buttons' springs: [0] = buy, [1] = shop
    const btns = [0, 1].map(() => ({ s: c0.buttonFromScale, sv: 0, r: c0.buttonFromRotate, rv: 0, o: 0 }))
    let shownValue = NaN

    // per-frame style writes go through here: a value is only written when it
    // changes, so a settled screen stops touching the DOM (cheaper on mobile)
    const styleMemo = new Map<HTMLElement, Record<string, string>>()
    const css = (el: HTMLElement, prop: string, value: string) => {
      let m = styleMemo.get(el)
      if (!m) styleMemo.set(el, (m = {}))
      if (m[prop] === value) return
      m[prop] = value
      el.style.setProperty(prop, value)
    }
    let fxDirty = true // the fx canvas only needs clearing once something has been drawn on it

    let raf = 0
    let lastNow = performance.now()
    const loop = (now: number) => {
      const dt = Math.min((now - lastNow) / 1000, 1 / 30)
      lastNow = now
      const cfg = cfgRef.current
      const live = !pausedRef.current
      if (live) {
        t += dt
        st += dt
      }

      // ---- signals ----
      if (sig.current.start !== seen.start) {
        seen.start = sig.current.start
        if (state === 'armed') setState('tease')
      }
      if (sig.current.drain !== seen.drain) {
        seen.drain = sig.current.drain
        if (state === 'pour' || state === 'piled') setState('drain')
      }

      // ---- impact (with the reveal) ----
      if (impactPendingAt >= 0 && t >= impactPendingAt) {
        impactPendingAt = -1
        fireImpact()
      }

      // ---- confetti cues ----
      if (teaseConfettiAt >= 0 && t >= teaseConfettiAt) {
        teaseConfettiAt = -1
        setTeaseFire((n) => n + 1)
      }
      if (cheerAt >= 0 && t >= cheerAt) {
        cheerAt = -1
        cheer.play({ volume: cfg.cheeringVolume })
      }
      if (crowdAt >= 0 && t >= crowdAt) {
        crowdAt = -1
        // level-matched: the two clips were recorded ~10 dB apart
        if (cfg.pileCrowdSound !== 'off')
          crowd[cfg.pileCrowdSound].play({ volume: cfg.pileCrowdVolume, levelMatch: cfg.sfxLevelMatch, length: cfg.pileCrowdLength })
      }
      if (counterAt >= 0 && t >= counterAt) {
        counterAt = -1
        counter.play({ volume: cfg.counterVolume })
      }

      // ---- gold-bar sounds ----
      bus.setLevel(cfg.sound ? cfg.volume : 0)
      if (live) {
        if (pileHits.length) {
          pileClock += dt
          while (pileHits.length && pileHits[pileHits.length - 1].at <= pileClock) barHit(cfg.pileVolume * pileHits.pop()!.k)
        }
        if (drainClock >= 0 && cfg.drainSound) {
          drainClock += dt
          // a share of the hits as the bars break loose (building), the rest as they leave the screen
          const gone = drained()
          const loose = clamp(drainClock / Math.max(0.1, cfg.drainFrontTime), 0, 1)
          const due = cfg.drainHits * (cfg.drainLooseShare * loose * loose + (1 - cfg.drainLooseShare) * gone)
          while (drainPlayed < Math.floor(due + 1e-6)) {
            drainPlayed++
            barHit(cfg.drainVolume * lerp(1, cfg.drainVolumeEnd, gone), 1 - cfg.drainPitchDrop * gone)
          }
        }
      }
      if (impactConfettiAt >= 0 && t >= impactConfettiAt) {
        impactConfettiAt = -1
        setImpactFire((n) => n + 1)
      }

      // ---- transitions ----
      if (live) {
        if (state === 'tease' && st >= cfg.teaseInDelay + cfg.teaseHold) setState('pour')
        else if (state === 'pour') {
          if (pileEvents.current.settled) setState('piled')
          else if (cfg.autoDrain && cfg.drainMaxWait > 0 && st >= cfg.drainMaxWait) setState('drain')
        } else if (state === 'piled' && cfg.autoDrain && st >= cfg.drainDelay) setState('drain')
        else if (state === 'drain') {
          if (st >= cfg.countDelay && drained() >= cfg.revealAtCleared) setState('count')
        } else if (state === 'count') {
          // the impact waits for the pile to (mostly) clear — never under the gold.
          // A safety cap stops a stuck bar from holding it forever.
          if (st >= cfg.countDuration && (drained() >= cfg.landAtCleared || st >= cfg.countDuration + 3)) setState('landed')
        }
      }
      const sinceImpact = impactAt >= 0 ? t - impactAt : -1
      const sinceLanded = landedAt >= 0 ? t - landedAt : -1
      const cx = size.w / 2
      const cy = size.h / 2 + cfg.revealOffsetY

      // ---- avatar: springs up with the cannons, the gold pours over him, he slides out at ~half-pour ----
      {
        const pourLen = Math.max(0.1, cfg.pourDuration + cfg.settleTime)
        const pourDone = state === 'pour' ? st / pourLen : state === 'tease' || state === 'armed' ? 0 : 1
        if (avOutAt < 0 && pourDone >= cfg.avatarOutAt && state !== 'armed' && state !== 'tease') avOutAt = t
        // the figure's box: the PNGs are 1440×1193 with him in x 645–1221, y 212–1193 (feet at the bottom)
        const aspect = 576 / 981
        const avH = Math.min(cfg.avatarHeight * size.h, (0.8 * size.w) / aspect)
        // keep him clear of the tease: measured from the pair's final (centred, two-line) layout,
        // so he doesn't shift when the subheader arrives; push down if the text has grown into him
        const hasSubText = (teaseSubEl.textContent ?? '').trim() !== ''
        // + the tilt: a rotated line's low corner hangs below its straight bottom edge
        const tiltPad = (Math.abs(Math.sin((cfg.teaseRotate * Math.PI) / 180)) * (hasSubText ? teaseH.subW : 0)) / 2
        const textBottom = size.h / 2 + (hasSubText ? teaseH.head + cfg.teaseSubGap + teaseH.sub : teaseH.head) / 2 + tiltPad
        const avTop = size.h + cfg.avatarBottom * -1 - avH // css `bottom` raises the feet; − sinks them
        const pushDown = Math.max(0, textBottom + cfg.avatarTextGap - avTop)
        const hidden = avH + Math.max(0, cfg.avatarBottom) + 20
        if (live) {
          if (avOutAt >= 0) {
            // out: ease-in slide back down
            const u = clamp((t - avOutAt) / Math.max(0.05, cfg.avatarOutDuration), 0, 1)
            avY = Math.max(avY, u * u)
            avV = 0
          } else if (teaseAt >= 0 && t - teaseAt >= cfg.avatarInDelay) {
            // in: a spring up into place (a little overshoot)
            const f = -cfg.avatarStiffness * avY - cfg.avatarDamping * avV
            avV += f * dt
            avY += avV * dt
          } else {
            avY = 1
            avV = 0
          }
        }
        const show = cfg.avatar && avY < 0.999
        css(avatarEl, 'opacity', show ? '1' : '0')
        css(avatarEl, 'left', `${(cfg.avatarX * 100).toFixed(2)}%`)
        css(avatarEl, 'bottom', `${cfg.avatarBottom}px`)
        css(avatarEl, 'height', `${avH.toFixed(1)}px`)
        css(avatarEl, 'width', `${(avH * aspect).toFixed(1)}px`)
        css(avatarEl, 'transform', `translate(-50%, ${(pushDown + avY * hidden).toFixed(1)}px)`)
      }

      // ---- tease: pops in, buried by the pour, fades ----
      {
        let k = 0
        const teaseT = state === 'tease' ? st : -1
        if (state === 'tease') k = smooth(cfg.teaseInDelay, cfg.teaseInDelay + cfg.teaseFade, teaseT)
        else if (state === 'pour' || state === 'piled') {
          const pourT = state === 'pour' ? st : cfg.teaseOutDelay + cfg.teaseFade
          k = 1 - smooth(cfg.teaseOutDelay, cfg.teaseOutDelay + cfg.teaseFade, pourT)
        }
        // the subheader pops in its own beat later, on the same spring
        const subAt = cfg.teaseInDelay + Math.max(0, cfg.teaseSubDelay)
        let kSub = 0
        if (state === 'tease') kSub = smooth(subAt, subAt + cfg.teaseFade, teaseT)
        else if (state === 'pour' || state === 'piled') kSub = k
        if (live && state === 'tease') {
          if (teaseT >= cfg.teaseInDelay) {
            const fS = -cfg.teaseStiffness * (teaseS - 1) - cfg.teaseDamping * teaseSV
            teaseSV += fS * dt
            teaseS += teaseSV * dt
            const fR = -cfg.teaseStiffness * (teaseR - cfg.teaseRotate) - cfg.teaseDamping * teaseRV
            teaseRV += fR * dt
            teaseR += teaseRV * dt
          }
          if (teaseT >= subAt) {
            const fS = -cfg.teaseStiffness * (subS - 1) - cfg.teaseDamping * subSV
            subSV += fS * dt
            subS += subSV * dt
            const fR = -cfg.teaseStiffness * (subR - cfg.teaseRotate) - cfg.teaseDamping * subRV
            subRV += fR * dt
            subR += subRV * dt
          }
        } else if (state === 'armed') {
          teaseS = subS = cfg.teaseFromScale
          teaseR = subR = cfg.teaseFromRotate
          teaseSV = teaseRV = subSV = subRV = 0
        }
        // The headline arrives alone at the centre; as the subheader comes in it
        // slides up so the pair ends up centred together (measured heights, so a
        // wrapped subheader still centres).
        const hasSub = (teaseSubEl.textContent ?? '').trim() !== ''
        let slide = 0
        if (hasSub) {
          if (state === 'tease') {
            const u = clamp((teaseT - subAt) / Math.max(0.01, cfg.teaseSlideTime), 0, 1)
            slide = 1 - Math.pow(1 - u, 3)
          } else if (state !== 'armed') slide = 1
        }
        const pairShift = (cfg.teaseSubGap + teaseH.sub) / 2
        const headY = -pairShift * slide
        const subY = headY + teaseH.head / 2 + cfg.teaseSubGap + teaseH.sub / 2 + (1 - kSub) * 12 // rises in
        css(teaseEl, 'opacity', k.toFixed(3))
        if ((teaseEl.textContent ?? '') !== teaseFitText) fitTease() // a different line was picked
        // responsive: grows with the stage width (1× on a 390 px phone, capped), then the
        // headline is shrunk if it still wouldn't fit on one line
        const sizeK = clamp(1 + (size.w / GOLD_REFERENCE_WIDTH - 1) * cfg.teaseSizeVsWidth, 1, Math.max(1, cfg.teaseSizeMax))
        const fitPx = teaseWidthPerPx > 0 ? Math.max(40, size.w - 32) / teaseWidthPerPx : Infinity
        css(teaseEl, 'font-size', `${Math.min(cfg.teaseSize * sizeK, fitPx).toFixed(1)}px`)
        css(teaseEl, 'transform-origin', 'center center')
        css(teaseEl, 'transform', `translate(-50%, -50%) translate(0px, ${headY.toFixed(1)}px) scale(${teaseS.toFixed(4)}) rotate(${teaseR.toFixed(2)}deg)`)
        css(teaseSubEl, 'opacity', (hasSub ? kSub : 0).toFixed(3))
        css(teaseSubEl, 'font-size', `${(cfg.teaseSubSize * sizeK).toFixed(1)}px`)
        css(teaseSubEl, 'max-width', `min(${(cfg.teaseSubMaxWidth * sizeK).toFixed(0)}px, calc(100% - 32px))`)
        css(teaseSubEl, 'transform-origin', 'center center')
        css(teaseSubEl, 'transform', `translate(-50%, -50%) translate(0px, ${subY.toFixed(1)}px) scale(${subS.toFixed(4)}) rotate(${subR.toFixed(2)}deg)`)
      }

      // ---- impact curve: ease out to the peak, hold, ease slowly back ----
      let impactK = 1
      if (cfg.impact && sinceImpact >= 0) {
        const up = Math.max(0.01, cfg.impactUp)
        const peak = Math.max(0.1, cfg.impactScale)
        if (sinceImpact < up) impactK = lerp(1, peak, 1 - Math.pow(1 - sinceImpact / up, 3))
        else if (sinceImpact < up + cfg.impactHold) impactK = peak
        else impactK = lerp(peak, 1, easeInOut(clamp((sinceImpact - up - cfg.impactHold) / Math.max(0.01, cfg.impactDown), 0, 1)))
      }

      // ---- amount row ----
      {
        // scale in (ease-out-back) near the end of the drain, as the count starts
        const sinceReveal = revealAt >= 0 ? t - revealAt : -1
        const dur = Math.max(0.01, cfg.revealFade)
        const k = sinceReveal >= 0 ? smooth(0, dur * 0.5, sinceReveal) : 0
        const u = sinceReveal >= 0 ? clamp(sinceReveal / dur, 0, 1) : 0
        const back = cfg.revealOvershoot
        const eb = 1 + (back + 1) * Math.pow(u - 1, 3) + back * Math.pow(u - 1, 2)
        const scaleIn = lerp(cfg.revealFromScale, 1, eb)
        let value = cfg.countFrom
        if (state === 'count') {
          const u = clamp(st / Math.max(0.01, cfg.countDuration), 0, 1)
          value = lerp(cfg.countFrom, cfg.amount, 1 - Math.pow(1 - u, Math.max(1, cfg.countEasePower)))
        } else if (state === 'landed') value = cfg.amount
        const rounded = Math.round(value)
        if (rounded !== shownValue) {
          shownValue = rounded
          amountEl.textContent = fmt(rounded)
        }
        // the icon pulses; the heading + amount ride its edges
        const iconPx = goldIconPx(cfg)
        const half = (iconPx / 2) * impactK * scaleIn
        const op = k.toFixed(3)
        const sIn = scaleIn.toFixed(4)
        css(iconEl, 'opacity', op)
        css(iconEl, 'width', `${iconPx.toFixed(1)}px`)
        css(iconEl, 'height', `${iconPx.toFixed(1)}px`)
        // after the impact swell settles: a looping pulse on the icon alone (the text stays put)
        let loopK = 1
        if (cfg.iconLoop && sinceImpact >= 0) {
          const loopAt = (cfg.impact ? cfg.impactUp + cfg.impactHold + cfg.impactDown : 0) + Math.max(0, cfg.iconLoopDelay)
          const lt = sinceImpact - loopAt
          if (lt > 0) {
            const ease = smooth(0, 0.5, lt) // eases in, no jump
            loopK = 1 + cfg.iconLoopScale * ease * (0.5 - 0.5 * Math.cos(TAU * cfg.iconLoopSpeed * lt))
          }
        }
        css(iconEl, 'transform', `translate(-50%, -50%) translate(0px, ${cfg.revealOffsetY}px) scale(${(impactK * scaleIn * loopK).toFixed(4)})`)
        css(headerEl, 'opacity', op)
        css(headerEl, 'transform-origin', 'center bottom')
        css(headerEl, 'font-size', `${cfg.headerSize}px`)
        css(headerEl, 'transform', `translate(-50%, -100%) translate(0px, ${(cfg.revealOffsetY - half - cfg.headerGap).toFixed(1)}px) rotate(${cfg.textTilt}deg) scale(${sIn})`)
        css(amountLineEl, 'opacity', op)
        css(amountLineEl, 'transform-origin', 'center top')
        css(amountLineEl, 'transform', `translate(-50%, 0) translate(0px, ${(cfg.revealOffsetY + half + cfg.amountGap).toFixed(1)}px) rotate(${cfg.textTilt}deg) scale(${sIn})`)
      }

      // ---- fx canvas: glow, white burst, ring (all behind the amount) ----
      if (fxDirty || sinceImpact >= 0) ctx.clearRect(0, 0, size.w, size.h)
      fxDirty = sinceImpact >= 0
      if (sinceImpact >= 0) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        if (cfg.glow) {
          const on = smooth(0, 0.4, sinceImpact)
          const pulse = cfg.glowPulse > 0 ? 0.85 + 0.15 * Math.sin(TAU * cfg.glowPulse * sinceImpact) : 1
          const a = clamp(cfg.glowIntensity * on * pulse, 0, 1)
          const r = Math.max(10, cfg.glowSize * size.h) * impactK
          const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
          grd.addColorStop(0, hexToRgba(cfg.glowColor, a))
          grd.addColorStop(0.5, hexToRgba(cfg.glowColor, a * 0.35))
          grd.addColorStop(1, hexToRgba(cfg.glowColor, 0))
          ctx.fillStyle = grd
          ctx.fillRect(0, 0, size.w, size.h)
        }
        if (cfg.impact && cfg.impactFlash > 0) {
          const k = 1 - clamp(sinceImpact / Math.max(0.01, cfg.impactFlashDecay), 0, 1)
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
        if (cfg.impact && cfg.impactStar > 0 && impactStarAngles.length) {
          // starburst: strokes fly out from the icon's edge, shortening + thinning + fading — one path
          const u = sinceImpact / Math.max(0.01, cfg.impactStarDuration)
          if (u < 1) {
            const e = 1 - Math.pow(1 - u, 3)
            const r0 = goldIconPx(cfg) * 0.38
            const head = r0 + cfg.impactStarRadius * e
            const tail = Math.max(r0 * 0.8, head - cfg.impactStarLength * (1 - u * 0.7))
            ctx.globalAlpha = clamp(cfg.impactStar * Math.pow(1 - u, 1.5), 0, 1)
            ctx.strokeStyle = cfg.impactStarColor
            ctx.lineWidth = Math.max(0.5, cfg.impactStarWidth * (1 - u * 0.6))
            ctx.lineCap = 'round'
            ctx.beginPath()
            for (const a of impactStarAngles) {
              const ca = Math.cos(a)
              const sa = Math.sin(a)
              ctx.moveTo(cx + ca * tail, cy + sa * tail)
              ctx.lineTo(cx + ca * head, cy + sa * head)
            }
            ctx.stroke()
            ctx.globalAlpha = 1
          }
        }
        if (cfg.impact && cfg.impactRing) {
          const u = clamp(sinceImpact / Math.max(0.01, cfg.impactRingDuration), 0, 1)
          if (u < 1) {
            const e = 1 - Math.pow(1 - u, 3)
            const r0 = goldIconPx(cfg) * 0.42
            ctx.strokeStyle = hexToRgba(cfg.impactRingColor, cfg.impactRingOpacity * (1 - u))
            ctx.lineWidth = Math.max(0.5, cfg.impactRingWidth * (1 - u * 0.7))
            ctx.beginPath()
            ctx.arc(cx, cy, r0 + cfg.impactRingSize * e, 0, TAU)
            ctx.stroke()
          }
        }
        ctx.restore()
      }

      // ---- shop push: closing line + button, hung under the (swelling) row ----
      {
        // the block sits at the bottom (in normal flow: line, then button); only the
        // fade / slide / spring are driven here
        css(shopEl, 'bottom', `calc(${cfg.shopBottom}px + env(safe-area-inset-bottom, 0px))`)
        // the shop push waits for the count to finish
        const ck = sinceLanded >= 0 ? smooth(cfg.closingDelay, cfg.closingDelay + cfg.closingFade, sinceLanded) : 0
        css(closingEl, 'opacity', ck.toFixed(3))
        css(closingEl, 'font-size', `${cfg.closingSize}px`)
        css(closingEl, 'max-width', cfg.closingMaxWidth > 0 ? `min(${cfg.closingMaxWidth}px, 100%)` : '100%')
        css(closingEl, 'transform', `translateY(${((1 - ck) * 8).toFixed(1)}px)`)

        // two buttons, staggered, each springing in to its own settled tilt
        const fs = 14 * Math.max(0.2, cfg.buttonSize)
        // top → bottom: "Go to the shop", then "Open another chest" (colours stay with each button)
        const els = [btn2El, btnEl]
        const tilts = [cfg.shopRotate, cfg.buyRotate]
        for (let i = 0; i < 2; i++) {
          const b = btns[i]
          const at = cfg.buttonDelay + i * Math.max(0, cfg.buttonStagger)
          if (cfg.button && sinceLanded >= at) {
            if (live) {
              const m = Math.max(0.05, cfg.buttonMass)
              const fS = -cfg.buttonStiffness * (b.s - 1) - cfg.buttonDamping * b.sv
              b.sv += (fS / m) * dt
              b.s += b.sv * dt
              const fR = -cfg.buttonStiffness * (b.r - tilts[i]) - cfg.buttonDamping * b.rv
              b.rv += (fR / m) * dt
              b.r += b.rv * dt
              b.o = Math.min(1, b.o + dt / 0.15)
            }
          } else if (sinceLanded < 0) {
            b.s = cfg.buttonFromScale
            b.r = cfg.buttonFromRotate
            b.sv = b.rv = 0
            b.o = 0
          }
          const el = els[i]
          css(el, 'margin-top', `${i === 0 ? cfg.buttonGap : cfg.buttonsGap}px`)
          css(el, 'z-index', i === 0 ? '2' : '1') // the top button sits above the bottom one
          css(el, 'width', `min(${cfg.buttonWidth}px, 100%)`)
          css(el, '--gem-btn-fs', `${fs.toFixed(2)}px`)
          css(el, 'opacity', (cfg.button ? b.o : 0).toFixed(3))
          css(el, 'pointer-events', cfg.button && b.o > 0.5 ? 'auto' : 'none')
          css(el, 'transform', `scale(${b.s.toFixed(4)}) rotate(${b.r.toFixed(2)}deg)`)
        }
        css(btnEl, '--cta-fill', cfg.buyColor)
        css(btnEl, '--cta-ink', cfg.buyTextColor)
        css(btn2El, '--cta-fill', cfg.shopColor)
        css(btn2El, '--cta-ink', cfg.shopTextColor)
      }

      raf =requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      teaseRo.disconnect()
      window.clearTimeout(musicTimer)
      for (const el of Object.values(sfx)) {
        el.pause()
        el.src = ''
      }
      if (music) {
        music.pause()
        music.src = ''
      }
      musicRef.current = { el: null, playing: false }
      cannonShot.current = null
      bus.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey])

  // live mute / volume for the soundtrack
  useEffect(() => {
    const m = musicRef.current
    if (!m.el) return
    m.el.volume = clamp(c.musicVolume, 0, 1)
    m.el.loop = c.musicLoop
    if (!c.sound) m.el.pause()
    else if (m.playing) m.el.play().catch(() => {})
  }, [c.sound, c.musicVolume, c.musicLoop])

  // the pile: Particle Rain's approved burst + floor + collisions, sized to the stage
  const rainConfig: Partial<ParticleRainConfig> | null = pile
    ? {
        mode: 'burst',
        count: pile.count,
        particleSize: pile.size,
        autoScale: false,
        burstWindow: c.pourDuration,
        burstEasePower: c.pourEase,
        burstSpeedStart: c.pourSpeedStart,
        spawnWidth: 1,
        spawnHeight: c.spawnHeight,
        gravity: c.gravity,
        velocityYMin: Math.min(c.dropSpeedMin, c.dropSpeedMax),
        velocityYMax: Math.max(c.dropSpeedMin, c.dropSpeedMax),
        terminalVelocity: c.terminalVelocity,
        floor: 'bounce',
        restitution: c.bounce,
        collideRestitution: c.bounce,
        collide: true,
        walls: true,
        asset: c.barAsset,
        scaleMin: c.barScaleMin,
        scaleMax: Math.max(c.barScaleMin, c.barScaleMax),
        dumpStagger: c.drainStagger,
        dumpStaggerEnd: c.drainStaggerEnd,
        dumpMode: c.drainMode === 'smooth' ? 'sequenced' : 'physics',
        dumpSequenceTime: c.drainFrontTime,
        dumpSequencePower: c.drainFrontPower,
        dumpReleaseJitter: c.drainReleaseJitter,
        dumpDrift: c.drainDrift,
        dumpSpin: c.drainSpin,
        dumpGravityStart: c.drainGravityStart,
        dumpGravityEnd: c.drainGravityEnd,
        dumpRampTime: c.drainRampTime,
        dumpRampPower: c.drainRampPower,
        forceSleepAfter: Math.max(0.05, c.settleTime),
      }
    : null

  const teaseConfetti = goldConfettiConfig(c, 'tease')
  const impactConfetti = goldConfettiConfig(c, 'impact')

  return (
    <div ref={wrapRef} className='gold-reveal'>
      <canvas ref={fxRef} className='gold-reveal__fx' />
      {/* placeholder avatar (PNG) — behind the confetti, the text and the gold pile */}
      <div ref={avatarRef} className='gold-reveal__avatar' aria-hidden='true'>
        <img src={avatarUrl} alt='' draggable={false} />
      </div>
      {teaseConfetti && (
        <Confetti
          key={`${runKey}:tease:${c.teaseConfetti}`}
          runKey={`${runKey}:tease:${c.teaseConfetti}`}
          config={teaseConfetti}
          fireSignal={teaseFire}
          paused={paused}
          intensity={c.teaseConfettiAmount}
          onBurst={(side) => cannonShot.current?.(side)}
        />
      )}
      {impactConfetti && (
        <Confetti
          key={`${runKey}:impact:${c.impactConfetti}`}
          runKey={`${runKey}:impact:${c.impactConfetti}`}
          config={impactConfetti}
          fireSignal={impactFire}
          paused={paused}
          intensity={c.impactConfettiAmount}
        />
      )}
      <div ref={teaseRef} className='gold-reveal__text gold-reveal__tease'>
        {teaseText}
      </div>
      <div ref={teaseSubRef} className='gold-reveal__text gold-reveal__tease-sub'>
        {teaseSubText}
      </div>
      <div ref={headerRef} className='gold-reveal__piece gold-reveal__caps' style={{ color: c.headerColor }}>
        {c.headerText}
      </div>
      <div ref={iconRef} className='gold-reveal__piece gold-reveal__icon'>
        <img src={goldbarUrl} alt='' draggable={false} />
      </div>
      <div ref={amountLineRef} className='gold-reveal__piece gold-reveal__caps gold-reveal__amount-line'>
        <span className='gold-reveal__amount' style={{ fontSize: c.amountSize, color: c.amountColor }}>
          {/* the final value sizes the box, so the line doesn't shift as it counts */}
          <span className='gold-reveal__amount-ghost' aria-hidden='true'>
            {fmt(c.amount)}
          </span>
          <span ref={amountRef} className='gold-reveal__amount-live'>
            {fmt(c.countFrom)}
          </span>
        </span>
        {c.amountLabel.trim() && (
          <span className='gold-reveal__label' style={{ fontSize: c.labelSize, color: c.labelColor }}>
            {c.amountLabel}
          </span>
        )}
      </div>
      {/* shop push: its own block, anchored to the bottom of the screen */}
      <div ref={shopRef} className='gold-reveal__shop'>
        <div ref={closingRef} className='gold-reveal__closing'>
          {closingText}
        </div>
        <div ref={btn2Ref} className='gem-reveal__btn gold-reveal__btn gold-reveal__cta'>
          <FoldableButton onClick={onShop}>{c.shopText}</FoldableButton>
        </div>
        <div ref={btnRef} className='gem-reveal__btn gold-reveal__btn gold-reveal__cta'>
          <FoldableButton onClick={onBuy}>{c.buyText}</FoldableButton>
        </div>
      </div>
      {pile && rainConfig && (
        <div className='gold-reveal__pile'>
          <ParticleRain
            key={`${runKey}:${pile.run}`}
            runKey={`${runKey}:${pile.run}`}
            config={rainConfig}
            paused={paused}
            dumpSignal={dump}
            onSettled={() => (pileEvents.current.settled = true)}
            onCleared={() => (pileEvents.current.cleared = true)}
            onDrain={(gone, total) => (pileEvents.current.drained = total > 0 ? gone / total : 1)}
          />
        </div>
      )}
    </div>
  )
}
