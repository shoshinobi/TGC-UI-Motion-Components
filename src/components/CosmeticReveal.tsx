import { useEffect, useRef, useState } from 'react'
import { FoldableButton } from '@/components/banner-stubs'
import { Confetti } from '@/components/Confetti'
import { FIREWORK_SFX } from '@/components/fireworkSfx'
import { REVEAL_MUSIC } from '@/components/revealMusic'
import { hexToRgba, shiftHue } from '@/lib/gemTiers'
import { createSfxBus } from '@/lib/sfxBank'
import {
  cosmeticFireworksConfig,
  cosmeticSpotFireworkConfig,
  COSMETIC_CLOSING_LINES,
  COSMETIC_DEFAULT_CONFIG,
  COSMETIC_REFERENCE_WIDTH,
  COSMETIC_TEASE_LINES,
  buildCarousel,
  fitItem,
  rarityOf,
  type RarityRoll,
  type CosmeticRevealConfig,
  type CosmeticRevealState,
  type CosmeticTier,
} from '@/components/cosmeticReveal.config'
// placeholder avatar poses (he's "wearing the new item") — the real avatar comes from the avatar system
import pose1Url from '@/assets/avatarPose1.png'
import pose2Url from '@/assets/avatarPose2.png'
import pose3Url from '@/assets/avatarPose3.png'
import tickUrl from '@/assets/mp3/drip4.ogg'
import aaahUrl from '@/assets/revealSFX/aaah.mp3'
import ooohUrl from '@/assets/revealSFX/oooh.mp3'
import revealUrl from '@/assets/mp3/GemReveal_punch.mp3'

/**
 * Cosmetic Reveal — make the rarity known, so they feel lucky and want to show it off.
 *
 *   armed → tease → carousel → ready → spinning → stopping → spotlight → outro
 *
 * - **tease**: paparazzi — camera flashes pop at random spots (each with a random
 *   shutter sound, overlapping freely) while a two-part teaser line comes in.
 * - **carousel / ready**: a horizontal, looping strip of cards slides in (transparent
 *   cards with a rounded border; every item fitted to the same space by its visible
 *   box). The winner is already one of the cards. Swipe either way — or it spins on
 *   its own after `autoSpinAfter`.
 * - **spinning / stopping**: the Gem Wheel's controlled stop, sideways — it always
 *   eases onto the predetermined item. Horizontal speed lines stream with the cards.
 * - **spotlight**: the winner scales up with a flash, ring and tapered star; the other
 *   cards fade. Rare / Grail slap a tier sticker on, and the tier's line shows under the card. The
 *   hold (`revealHold`) and the fireworks are the same for every tier.
 * - **outro**: the cards slide off and the avatar — wearing the item — comes in, with
 *   a closing pair and the two buttons.
 */

const TAU = Math.PI * 2
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / Math.max(1e-6, e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}
/** A star whose points are thickest at the middle (`width` px) and taper to a tip `arm` px out. */
function fillTaperedStar(ctx: CanvasRenderingContext2D, x: number, y: number, arm: number, width: number, points: number, rot: number) {
  const n = Math.max(2, Math.round(points))
  // the valleys between points sit close in; each side curves in toward the middle
  const valley = Math.min(arm * 0.5, width / 2) / Math.max(0.2, Math.sin(Math.PI / n))
  // control points on each point's own axis pull both its sides in → a needle taper
  const pull = arm * 0.22
  ctx.beginPath()
  ctx.moveTo(x + Math.cos(rot) * arm, y + Math.sin(rot) * arm)
  for (let i = 0; i < n; i++) {
    const a = rot + (i * TAU) / n
    const mid = a + Math.PI / n
    const next = a + TAU / n
    ctx.quadraticCurveTo(x + Math.cos(a) * pull, y + Math.sin(a) * pull, x + Math.cos(mid) * valley, y + Math.sin(mid) * valley)
    ctx.quadraticCurveTo(x + Math.cos(next) * pull, y + Math.sin(next) * pull, x + Math.cos(next) * arm, y + Math.sin(next) * arm)
  }
  ctx.closePath()
  ctx.fill()
}
const easeOutCubic = (u: number) => 1 - Math.pow(1 - u, 3)
const easeInCubic = (u: number) => u * u * u

// the camera shutters (temporary audio) — every flash plays one of these at random
const SHUTTER_URLS = Object.values(
  import.meta.glob('@/assets/camSFX/*.wav', { eager: true, query: '?url', import: 'default' }),
) as string[]

// the pose PNGs are 1867×1222 with him in x 848–1389, y 169–1222 (feet at the bottom)
const POSES = [pose1Url, pose2Url, pose3Url]
const POSE_BOX = { x0: 848, y0: 169, x1: 1389, y1: 1222, w: 1867 }
const POSE_ASPECT = (POSE_BOX.x1 - POSE_BOX.x0) / (1222 - POSE_BOX.y0)

const TIERS: CosmeticTier[] = ['common', 'rare', 'grail']
const last = { tease: -1, closing: -1, pose: -1, tier: -1, line: '' }
function pick(n: number, prev: number) {
  if (n <= 1) return 0
  let i = Math.floor(Math.random() * n)
  if (i === prev) i = (i + 1 + Math.floor(Math.random() * (n - 1))) % n
  return i
}
function lineIndex(choice: string, rolled: number, n: number) {
  if (choice === 'random') return rolled
  const i = Number(choice)
  return Number.isFinite(i) ? clamp(Math.round(i), 0, n - 1) : 0
}

export type CosmeticRevealProps = {
  config?: Partial<CosmeticRevealConfig>
  paused?: boolean
  runKey?: string | number
  /** armed → tease (bump a counter) */
  startSignal?: number
  /** ready → spinning, auto direction (bump a counter) */
  spinSignal?: number
  onState?: (s: CosmeticRevealState) => void
  /** "Buy another chest" */
  onBuy?: () => void
  /** "Try the item on" */
  onTry?: () => void
  /** skip `armed` — start on mount (fresh runKey + this = restart) */
  autoStart?: boolean
}

export function CosmeticReveal({
  config,
  paused = false,
  runKey,
  startSignal = 0,
  spinSignal = 0,
  onState,
  onBuy,
  onTry,
  autoStart = false,
}: CosmeticRevealProps) {
  const c: CosmeticRevealConfig = { ...COSMETIC_DEFAULT_CONFIG, ...config }
  const wrapRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLCanvasElement>(null)
  const frontRef = useRef<HTMLCanvasElement>(null)
  const teaseRef = useRef<HTMLDivElement>(null)
  const teaseSubRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const promptRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLDivElement>(null)
  const closeSubRef = useRef<HTMLDivElement>(null)
  const shopRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLDivElement>(null)
  const btn2Ref = useRef<HTMLDivElement>(null)

  const cfgRef = useRef(c)
  cfgRef.current = c
  const fireworkSound = useRef<((x: number) => void) | null>(null)
  const spotFireworkSound = useRef<(() => void) | null>(null)
  const musicRef = useRef<{ el: HTMLAudioElement | null; playing: boolean }>({ el: null, playing: false })
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const onStateRef = useRef(onState)
  onStateRef.current = onState
  const autoStartRef = useRef(autoStart)
  autoStartRef.current = autoStart

  const rarityRef = useRef<ReturnType<typeof rarityOf>>({ sticker: null, line: '', lineKey: '' })
  // one roll per run: the carousel, the lines, the pose, the tier (when 'random')
  const roll = useRef<{ key: unknown; tease: number; closing: number; pose: number; tier: number; rarity: RarityRoll; carousel: ReturnType<typeof buildCarousel> } | null>(null)
  const carouselKey = `${runKey}|${c.winnerItem}|${c.itemCount}|${c.teaserItems}`
  if (!roll.current || roll.current.key !== carouselKey) {
    const keepLines = roll.current && String(roll.current.key).split('|')[0] === String(runKey)
    const tease = keepLines ? roll.current!.tease : pick(COSMETIC_TEASE_LINES.length, last.tease)
    const closing = keepLines ? roll.current!.closing : pick(COSMETIC_CLOSING_LINES.length, last.closing)
    const pose = keepLines ? roll.current!.pose : pick(POSES.length, last.pose)
    const rolledTier = keepLines ? roll.current!.tier : pick(TIERS.length, last.tier)
    const rarityRoll: RarityRoll = keepLines
      ? roll.current!.rarity
      : { odds: Math.random(), line: Math.random(), prevLine: last.line }
    roll.current = { key: carouselKey, tease, closing, pose, tier: rolledTier, rarity: rarityRoll, carousel: buildCarousel(c, Math.random) }
  }
  // remembered once the run is on screen (not while rendering — dev mode renders twice), so nothing repeats back to back
  useEffect(() => {
    if (!roll.current) return
    last.tease = roll.current.tease
    last.closing = roll.current.closing
    last.pose = roll.current.pose
    last.tier = roll.current.tier
    last.line = rarityRef.current.lineKey
  }, [carouselKey])
  const { items, winnerSlot } = roll.current.carousel
  const [teaseText, teaseSubText] = COSMETIC_TEASE_LINES[lineIndex(c.teaseLine, roll.current.tease, COSMETIC_TEASE_LINES.length)]
  const [closeText, closeSubText] = COSMETIC_CLOSING_LINES[lineIndex(c.closingLine, roll.current.closing, COSMETIC_CLOSING_LINES.length)]
  const poseUrl = POSES[roll.current.pose]
  // the app sets the tier; 'random' (prototype) uses this run's roll
  const winnerTier: CosmeticTier = c.winnerTier === 'random' ? TIERS[roll.current.tier] : c.winnerTier
  // its sticker (odds or tier name) and the line under it
  const tier = rarityOf(c, winnerTier, roll.current.rarity)
  rarityRef.current = tier

  const [confettiFire, setConfettiFire] = useState(0)
  const [spotPopFire, setSpotPopFire] = useState(0)
  const sig = useRef({ start: 0, spin: 0 })
  const lastSig = useRef({ start: startSignal, spin: spinSignal })
  useEffect(() => {
    if (startSignal !== lastSig.current.start) {
      lastSig.current.start = startSignal
      sig.current.start++
    }
    if (spinSignal !== lastSig.current.spin) {
      lastSig.current.spin = spinSignal
      sig.current.spin++
    }
  }, [startSignal, spinSignal])

  useEffect(() => {
    const wrap = wrapRef.current
    const back = backRef.current
    const front = frontRef.current
    const strip = stripRef.current
    const els = {
      tease: teaseRef.current,
      teaseSub: teaseSubRef.current,
      prompt: promptRef.current,
      line: lineRef.current,
      avatar: avatarRef.current,
      close: closeRef.current,
      closeSub: closeSubRef.current,
      shop: shopRef.current,
      btn: btnRef.current,
      btn2: btn2Ref.current,
    }
    if (!wrap || !back || !front || !strip || Object.values(els).some((e) => !e)) return
    const E = els as { [K in keyof typeof els]: HTMLDivElement }
    const bctx = back.getContext('2d')
    const fctx = front.getContext('2d')
    if (!bctx || !fctx) return
    const cards = Array.from(strip.children) as HTMLDivElement[]
    const N = cards.length

    // ---- sizing ----
    let size = { w: wrap.clientWidth, h: wrap.clientHeight }
    let dpr = 1
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      size = { w: wrap.clientWidth, h: wrap.clientHeight }
      for (const cv of [back, front]) {
        cv.width = Math.max(1, Math.round(size.w * dpr))
        cv.height = Math.max(1, Math.round(size.h * dpr))
      }
    }
    resize()
    // the button block's height — the closing pair sits just above it
    let shopH = E.shop.offsetHeight
    const shopRo = new ResizeObserver(() => (shopH = E.shop.offsetHeight))
    shopRo.observe(E.shop)
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    // ---- style writes only when a value changes ----
    const memo = new Map<HTMLElement, Record<string, string>>()
    const css = (el: HTMLElement, prop: string, value: string) => {
      let m = memo.get(el)
      if (!m) memo.set(el, (m = {}))
      if (m[prop] === value) return
      m[prop] = value
      el.style.setProperty(prop, value)
    }

    // ---- audio: shutters + ticks through Web Audio (cheap overlaps), the rest as <audio> ----
    let actx: AudioContext | null = null
    let gain: GainNode | null = null
    const shutterBufs: AudioBuffer[] = []
    let tickBuf: AudioBuffer | null = null
    const ensureAudio = () => {
      if (actx) {
        actx.resume().catch(() => {})
        return
      }
      try {
        actx = new AudioContext()
        gain = actx.createGain()
        gain.connect(actx.destination)
        const load = (url: string) =>
          fetch(url)
            .then((r) => r.arrayBuffer())
            .then((b) => actx!.decodeAudioData(b))
        SHUTTER_URLS.forEach((u) => load(u).then((buf) => shutterBufs.push(buf)).catch(() => {}))
        load(tickUrl).then((buf) => (tickBuf = buf)).catch(() => {})
      } catch {
        actx = null
      }
    }
    const playBuf = (buf: AudioBuffer | null, vol: number, rate = 1) => {
      const cfg = cfgRef.current
      if (!cfg.sound || !actx || !gain || !buf || vol <= 0) return
      const src = actx.createBufferSource()
      src.buffer = buf
      src.playbackRate.value = rate
      const g = actx.createGain()
      g.gain.value = clamp(vol * cfg.volume, 0, 1)
      src.connect(g)
      g.connect(gain)
      src.start()
    }
    const shutter = (loud: number) => {
      if (!shutterBufs.length) return
      playBuf(shutterBufs[Math.floor(Math.random() * shutterBufs.length)], cfgRef.current.shutterVolume * loud, 0.94 + Math.random() * 0.14)
    }
    // the crowd, with the first camera flash: level-matched (the two clips differ by ~10 dB)
    const bus = createSfxBus()
    const crowd = { random: bus.group([ooohUrl, aaahUrl]), oooh: bus.group([ooohUrl]), aaah: bus.group([aaahUrl]) }
    let crowdAt = -1
    // the fireworks: the end ones sit in the background (muffled, capped, fading down)
    const booms = bus.group(FIREWORK_SFX)
    const spotBoom = bus.group(FIREWORK_SFX)
    let firstBoomAt = -1
    let lastBoomAt = -Infinity
    fireworkSound.current = (x) => {
      const cfg = cfgRef.current
      if (firstBoomAt < 0) firstBoomAt = t
      if (!cfg.fireworksSound || Math.random() >= cfg.fireworksSoundShare) return
      if (t - lastBoomAt < cfg.fireworksSoundGap || booms.playing() >= cfg.fireworksSoundMax) return
      lastBoomAt = t
      const settle = cfg.fireworksSoundFadeTime > 0 ? clamp((t - firstBoomAt) / cfg.fireworksSoundFadeTime, 0, 1) : 1
      booms.play({
        volume: cfg.fireworksSoundVolume * lerp(1, cfg.fireworksSoundFadeTo, settle) * (1 + (Math.random() * 2 - 1) * cfg.fireworksSoundVolumeVar),
        rate: 1 + (Math.random() * 2 - 1) * cfg.fireworksSoundPitchVar,
        pan: x * cfg.fireworksSoundPan,
        levelMatch: 0.75,
        lowpass: cfg.fireworksSoundMuffle,
        length: cfg.fireworksSoundLength,
      })
    }
    spotFireworkSound.current = () => {
      const cfg = cfgRef.current
      if (cfg.spotPopSound) spotBoom.play({ volume: cfg.spotPopSoundVolume, levelMatch: 0.75 })
    }
    const revealSfx = new Audio(revealUrl)
    const c0 = cfgRef.current
    const musicKeys = Object.keys(REVEAL_MUSIC) as (keyof typeof REVEAL_MUSIC)[]
    const musicKey =
      c0.musicTrack === 'off' ? null : c0.musicTrack === 'random' ? musicKeys[Math.floor(Math.random() * musicKeys.length)] : c0.musicTrack
    const music = musicKey ? new Audio(REVEAL_MUSIC[musicKey].url) : null
    musicRef.current = { el: music, playing: false }
    let musicTimer = 0
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

    // ---- a headline + subheader pair: pop, slide up so the pair centres, fit, wrap ----
    const makePair = (head: HTMLDivElement, sub: HTMLDivElement) => {
      const p = { s: 0.6, sv: 0, r: -6, rv: 0, ss: 0.6, ssv: 0, sr: -6, srv: 0, headH: head.offsetHeight, subH: sub.offsetHeight, subW: sub.offsetWidth, wpp: 0, fitText: '' }
      const measure = () => {
        p.headH = head.offsetHeight
        p.subH = sub.offsetHeight
        p.subW = sub.offsetWidth
        const fs = parseFloat(head.style.fontSize) || 1
        p.wpp = head.scrollWidth / fs
        p.fitText = head.textContent ?? ''
      }
      const pro = new ResizeObserver(measure)
      pro.observe(head)
      pro.observe(sub)
      const reset = (fromScale: number, fromRot: number) => {
        p.s = p.ss = fromScale
        p.r = p.sr = fromRot
        p.sv = p.rv = p.ssv = p.srv = 0
      }
      /** `t` = seconds since the pair started (−1 = not yet), `out` 0–1 = fading out */
      const update = (o: {
        t: number
        dt: number
        live: boolean
        out: number
        /** the pair's centre, px from the stage centre — or, with `bottomY`, where its bottom sits */
        centreY: number
        bottomY?: number
        size: number
        subSize: number
        subGap: number
        subMaxWidth: number
        subDelay: number
        slideTime: number
        fade: number
        rotate: number
        stiffness: number
        damping: number
        sizeK: number
      }) => {
        const k = o.t < 0 ? 0 : smooth(0, o.fade, o.t) * (1 - o.out)
        const kSub = o.t < 0 ? 0 : smooth(o.subDelay, o.subDelay + o.fade, o.t) * (1 - o.out)
        if (o.live && o.t >= 0) {
          const f1 = -o.stiffness * (p.s - 1) - o.damping * p.sv
          p.sv += f1 * o.dt
          p.s += p.sv * o.dt
          const f2 = -o.stiffness * (p.r - o.rotate) - o.damping * p.rv
          p.rv += f2 * o.dt
          p.r += p.rv * o.dt
          if (o.t >= o.subDelay) {
            const f3 = -o.stiffness * (p.ss - 1) - o.damping * p.ssv
            p.ssv += f3 * o.dt
            p.ss += p.ssv * o.dt
            const f4 = -o.stiffness * (p.sr - o.rotate) - o.damping * p.srv
            p.srv += f4 * o.dt
            p.sr += p.srv * o.dt
          }
        }
        const hasSub = (sub.textContent ?? '').trim() !== ''
        const tilt = (Math.abs(Math.sin((o.rotate * Math.PI) / 180)) * (hasSub ? p.subW : 0)) / 2
        const total = hasSub ? p.headH + o.subGap + p.subH : p.headH
        // bottom-anchored: centre the (final) pair so its bottom lands on bottomY
        if (o.bottomY !== undefined) o.centreY = o.bottomY - total / 2 - tilt
        const slide = hasSub && o.t >= 0 ? easeOutCubic(clamp((o.t - o.subDelay) / Math.max(0.01, o.slideTime), 0, 1)) : 0
        const headY = o.centreY - ((o.subGap + p.subH) / 2) * slide
        const subY = headY + p.headH / 2 + o.subGap + p.subH / 2 + (1 - kSub) * 12
        if ((head.textContent ?? '') !== p.fitText) measure()
        const fitPx = p.wpp > 0 ? Math.max(40, size.w - 32) / p.wpp : Infinity
        css(head, 'opacity', k.toFixed(3))
        css(head, 'font-size', `${Math.min(o.size * o.sizeK, fitPx).toFixed(1)}px`)
        css(head, 'transform', `translate(-50%, -50%) translate(0px, ${headY.toFixed(1)}px) scale(${p.s.toFixed(4)}) rotate(${p.r.toFixed(2)}deg)`)
        css(sub, 'opacity', (hasSub ? kSub : 0).toFixed(3))
        css(sub, 'font-size', `${(o.subSize * o.sizeK).toFixed(1)}px`)
        css(sub, 'max-width', `min(${(o.subMaxWidth * o.sizeK).toFixed(0)}px, calc(100% - 32px))`)
        css(sub, 'transform', `translate(-50%, -50%) translate(0px, ${subY.toFixed(1)}px) scale(${p.ss.toFixed(4)}) rotate(${p.sr.toFixed(2)}deg)`)
        // the pair's bottom (incl. the tilt), relative to the stage centre
        return o.centreY + total / 2 + tilt
      }
      return { update, reset, disconnect: () => pro.disconnect() }
    }
    const teasePair = makePair(E.tease, E.teaseSub)
    const closePair = makePair(E.close, E.closeSub)
    teasePair.reset(c0.teaseFromScale, c0.teaseFromRotate)
    closePair.reset(c0.teaseFromScale, c0.teaseFromRotate)

    // ---- state ----
    let state: CosmeticRevealState = 'armed'
    let t = 0
    let st = 0
    let teaseAt = -1
    let carouselAt = -1
    let readyAt = -1
    let spotAt = -1
    let fireworksFired = false
    let spotPopFired = false
    let outroAt = -1
    const setState = (s: CosmeticRevealState) => {
      state = s
      st = 0
      onStateRef.current?.(s)
      const cfg = cfgRef.current
      if (s === 'tease') {
        teaseAt = t
        ensureAudio()
        nextFlashAt = t + cfg.teaseInDelay
        if (cfg.crowdSound !== 'off') crowdAt = nextFlashAt + Math.max(0, cfg.crowdDelay)
        if (cfg.musicStart === 'start') startMusic()
      }
      if (s === 'carousel') carouselAt = t
      if (s === 'ready') readyAt = t
      if (s === 'spotlight') {
        spotAt = t
        if (cfg.revealSound && cfg.sound) {
          revealSfx.volume = clamp(cfg.volume, 0, 1)
          revealSfx.currentTime = 0
          revealSfx.play().catch(() => {})
        }
        if (cfg.musicStart === 'spotlight') startMusic()
      }
      if (s === 'outro') {
        outroAt = t
        if (cfg.musicStart === 'outro') startMusic()
      }
    }
    onStateRef.current?.('armed')

    // ---- carousel motion (phi = the card index at the centre) ----
    let phi = winnerSlot - Math.floor(N / 2) // start with the winner well off-centre
    let omega = 0
    // speed lines (y = 0–1 across the band)
    const streaks: { x: number; y: number; speed: number; alpha: number; hue: number }[] = []
    let warpK = 0
    let warpPhi = 0
    let spinMode: 'auto' | 'flick' = 'auto'
    let spinDir = 1
    let spinStartOmega = 0
    let plan = { p0: 0, dir: 1, dist: 0, dur: 1, n: 3, hold: 0, target: 0 }
    let holdUntil = -1
    let snapping = false
    let snapV = 0
    let lastTickSlot = Math.round(phi)
    let spot = 1
    let spotV = 0
    let sticker = 0
    let stickerV = 0
    let stickerKey = ''
    let stickerW = 0

    let dragging = false
    let dragPhi0 = 0
    let dragX0 = 0
    const samples: { x: number; t: number }[] = []
    let pitchNow = 160
    const onDown = (e: PointerEvent) => {
      if (state !== 'ready') return
      dragging = true
      dragPhi0 = phi
      dragX0 = e.clientX
      samples.length = 0
      samples.push({ x: e.clientX, t: performance.now() })
      wrap.setPointerCapture(e.pointerId)
      ensureAudio()
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      phi = dragPhi0 - (e.clientX - dragX0) / pitchNow
      samples.push({ x: e.clientX, t: performance.now() })
      while (samples.length > 2 && samples[0].t < performance.now() - 100) samples.shift()
    }
    const onUp = (e: PointerEvent) => {
      if (!dragging) return
      dragging = false
      wrap.releasePointerCapture?.(e.pointerId)
      const a = samples[0]
      const b = samples[samples.length - 1]
      const v = ((b.x - a.x) / Math.max(1, b.t - a.t)) * 1000
      const cfg = cfgRef.current
      if (Math.abs(v) < cfg.flickThreshold) {
        // not a flick — settle back onto the nearest card
        plan = { ...plan, target: Math.round(phi) }
        snapping = true
        snapV = 0
        return
      }
      spinMode = 'flick'
      spinDir = -Math.sign(v) // swipe left → the strip moves left → phi increases
      omega = spinDir * clamp((Math.abs(v) / pitchNow) * cfg.flickGain, cfg.flickMin, cfg.flickMax)
      spinStartOmega = omega
      setState('spinning')
    }
    wrap.addEventListener('pointerdown', onDown)
    wrap.addEventListener('pointermove', onMove)
    wrap.addEventListener('pointerup', onUp)
    wrap.addEventListener('pointercancel', onUp)

    const startStopping = () => {
      const cfg = cfgRef.current
      const w0 = Math.abs(omega) || cfg.cruiseSpeed
      const dir = Math.sign(omega) || 1
      const n = Math.max(1.2, cfg.stopEasePower)
      const o = cfg.hesitate ? Math.max(0, cfg.overshoot) : 0
      const want = (w0 * cfg.stopDuration) / n + N * Math.max(0, Math.round(cfg.extraLoops))
      const g = winnerSlot
      const target = dir > 0 ? g + N * Math.ceil((phi + want - o - g) / N) : g + N * Math.floor((phi - want + o - g) / N)
      const hold = target + dir * o
      const dist = Math.abs(hold - phi)
      plan = { p0: phi, dir, dist, dur: (n * dist) / w0, n, hold, target }
      holdUntil = -1
      snapping = false
      snapV = 0
      setState('stopping')
    }

    // ---- paparazzi flashes ----
    type Flash = { x: number; y: number; r: number; age: number; rot: number; rgb: string }
    const gold = (hex: string) => {
      const n = parseInt(hex.replace('#', ''), 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }
    const flashes: Flash[] = []
    let nextFlashAt = -1
    const pop = (loud: number) => {
      const cfg = cfgRef.current
      flashes.push({
        x: size.w * (0.06 + Math.random() * 0.88),
        y: size.h * (0.06 + Math.random() * 0.88),
        r: cfg.flashSize * Math.max(0.1, 1 + (Math.random() * 2 - 1) * cfg.flashSizeVar),
        age: 0,
        rot: Math.random() * Math.PI,
        // a random mix of white and gold
        rgb: (() => {
          const g = gold(cfg.flashGold)
          const m = Math.random() * clamp(cfg.flashGoldMix, 0, 1)
          return g.map((v) => Math.round(255 + (v - 255) * m)).join(',')
        })(),
      })
      shutter(loud)
    }
    const interval = (rate: number, jitter: number) => {
      const mean = 1 / Math.max(0.1, rate)
      const expo = -Math.log(1 - Math.random() * 0.999) // bursty
      return mean * (1 - jitter + jitter * expo)
    }

    // ---- buttons ----
    const btns = [0, 1].map(() => ({ s: c0.buttonFromScale, sv: 0, r: c0.buttonFromRotate, rv: 0, o: 0 }))
    // avatar slide: 0 = in place, 1 = hidden below
    let avY = 1
    let avV = 0

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

      // ---- signals + transitions ----
      if (sig.current.start !== seen.start) {
        seen.start = sig.current.start
        if (state === 'armed') setState('tease')
      }
      if (sig.current.spin !== seen.spin) {
        seen.spin = sig.current.spin
        if (state === 'ready') {
          ensureAudio()
          spinMode = 'auto'
          spinDir = cfg.spinDirection === 'left' ? 1 : -1
          omega = 0
          setState('spinning')
        }
      }
      bus.setLevel(cfg.sound ? cfg.volume : 0)
      const tr = rarityRef.current
      if (live) {
        if (crowdAt >= 0 && t >= crowdAt) {
          crowdAt = -1
          if (cfg.crowdSound !== 'off') crowd[cfg.crowdSound].play({ volume: cfg.crowdVolume, levelMatch: 0.75 })
        }
        if (!spotPopFired && spotAt >= 0 && t >= spotAt + Math.max(0, cfg.spotPopDelay)) {
          spotPopFired = true
          if (cfg.spotPop) setSpotPopFire((n) => n + 1)
        }
        if (!fireworksFired && spotAt >= 0 && t >= spotAt + Math.max(0, cfg.fireworksDelay)) {
          fireworksFired = true
          if (cfg.fireworks) setConfettiFire((n) => n + 1)
        }
        if (state === 'tease' && st >= cfg.teaseHold) setState('carousel')
        else if (state === 'carousel' && st >= cfg.carouselIn + cfg.carouselInStagger * N) setState('ready')
        else if (state === 'ready' && cfg.autoSpinAfter > 0 && st >= cfg.autoSpinAfter && !dragging && !snapping) {
          ensureAudio()
          spinMode = 'auto'
          spinDir = cfg.spinDirection === 'left' ? 1 : -1
          omega = 0
          setState('spinning')
        } else if (state === 'spotlight' && st >= cfg.revealHold) setState('outro')
      }

      // ---- spin / stop ----
      if (live && state === 'spinning') {
        if (spinMode === 'auto') omega = spinDir * cfg.cruiseSpeed * Math.pow(clamp(cfg.spinUpDuration > 0 ? st / cfg.spinUpDuration : 1, 0, 1), 2)
        else omega = spinStartOmega
        phi += omega * dt
        if (st >= cfg.spinDuration + (spinMode === 'auto' ? cfg.spinUpDuration : 0)) startStopping()
      }
      if (live && state === 'stopping') {
        if (!snapping) {
          const u = clamp(st / Math.max(0.05, plan.dur), 0, 1)
          phi = plan.p0 + plan.dir * plan.dist * (1 - Math.pow(1 - u, plan.n))
          if (u >= 1) {
            phi = plan.hold
            if (Math.abs(plan.hold - plan.target) < 1e-4) snapping = true
            else if (holdUntil < 0) holdUntil = t + cfg.overshootHold
            else if (t >= holdUntil) {
              snapping = true
              snapV = 0
            }
          }
        }
        if (snapping) {
          const f = -cfg.snapStiffness * (phi - plan.target) - cfg.snapDamping * snapV
          snapV += f * dt
          phi += snapV * dt
          if (Math.abs(phi - plan.target) < 0.002 && Math.abs(snapV) < 0.02) {
            phi = plan.target
            snapping = false
            spot = 1
            spotV = 0
            sticker = 0
            stickerV = 0
            setState('spotlight')
          }
        }
      }
      // a swipe that didn't flick: settle onto the nearest card
      if (live && state === 'ready' && snapping && !dragging) {
        const f = -cfg.snapStiffness * (phi - plan.target) - cfg.snapDamping * snapV
        snapV += f * dt
        phi += snapV * dt
        if (Math.abs(phi - plan.target) < 0.002 && Math.abs(snapV) < 0.02) {
          phi = plan.target
          snapping = false
        }
      }
      // a tick per card crossing the centre
      if (Math.round(phi) !== lastTickSlot) {
        lastTickSlot = Math.round(phi)
        if (state === 'spinning' || state === 'stopping' || dragging) playBuf(tickBuf, cfg.tickVolume, 0.9 + Math.min(1.2, Math.abs(omega) / 20))
      }

      // ---- layout ----
      const sizeK = clamp(1 + (size.w / COSMETIC_REFERENCE_WIDTH - 1) * cfg.cardSizeVsWidth, 1, Math.max(1, cfg.cardSizeMax))
      const card = Math.min(cfg.cardSize * sizeK, size.w * 0.55)
      const pitch = card + cfg.cardGap * sizeK
      pitchNow = pitch
      const cx = size.w / 2
      const cy = size.h / 2 + cfg.carouselOffsetY
      const halfView = size.w / 2 / pitch + 0.5
      const sinceSpot = spotAt >= 0 ? t - spotAt : -1
      const sinceOutro = outroAt >= 0 ? t - outroAt : -1

      // spotlight springs
      if (live && sinceSpot >= 0) {
        const f = -cfg.spotStiffness * (spot - cfg.spotScale) - cfg.spotDamping * spotV
        spotV += f * dt
        spot += spotV * dt
        if (sinceSpot >= cfg.stickerDelay && tr.sticker) {
          const g = -360 * (sticker - 1) - 16 * stickerV
          stickerV += g * dt
          sticker += stickerV * dt
        }
      }
      const othersK = sinceSpot >= 0 ? 1 - smooth(0, Math.max(0.05, cfg.othersFade), sinceSpot) : 1

      // ---- cards ----
      const order = cards.map((_, i) => {
        const d = i - phi - N * Math.floor((i - phi + N / 2) / N)
        return { i, d }
      })
      const ranked = [...order].sort((a, b) => a.d - b.d)
      ranked.forEach(({ i, d }, rank) => {
        const el = cards[i]
        let x = cx + d * pitch
        let alpha = lerp(1, cfg.edgeOpacity, clamp((Math.abs(d) - 0.5) / Math.max(0.5, halfView - 0.5), 0, 1))
        let scale = 1 + (cfg.focusScale - 1) * clamp(1 - Math.abs(d), 0, 1)
        // in: fly in from the right, staggered left → right
        if (carouselAt < 0) alpha = 0
        else {
          const u = easeOutCubic(clamp((t - carouselAt - rank * cfg.carouselInStagger) / Math.max(0.05, cfg.carouselIn), 0, 1))
          x += (1 - u) * (size.w * 0.9)
          alpha *= u
        }
        const isWinner = i === winnerSlot && sinceSpot >= 0
        if (isWinner) scale *= spot
        else alpha *= othersK
        // out: everything slides off to the left
        if (sinceOutro >= 0) {
          const u = easeInCubic(clamp((sinceOutro - rank * cfg.outroStagger) / Math.max(0.05, cfg.outroDuration), 0, 1))
          x -= u * (size.w + card * 2)
        }
        css(el, 'width', `${card.toFixed(1)}px`)
        css(el, 'height', `${card.toFixed(1)}px`)
        css(el, 'opacity', clamp(alpha, 0, 1).toFixed(3))
        css(el, 'z-index', isWinner ? '3' : String(2 - Math.min(1, Math.round(Math.abs(d)))))
        css(el, 'transform', `translate(${(x - card / 2).toFixed(1)}px, ${(cy - card / 2).toFixed(1)}px) scale(${scale.toFixed(4)})`)
      })
      // the sticker on the winner
      const stickerEl = cards[winnerSlot]?.querySelector<HTMLElement>('.cosmetic-card__sticker')
      if (stickerEl) {
        css(stickerEl, 'opacity', tr.sticker && sinceSpot >= cfg.stickerDelay ? '1' : '0')
        const fs = `${(11.5 * cfg.stickerSize * sizeK).toFixed(1)}px`
        css(stickerEl, '--sticker-fs', fs)
        // long odds are nudged in so they never run off the screen (its width is re-read only when it changes)
        const key = `${fs}|${stickerEl.textContent}`
        if (key !== stickerKey) {
          stickerKey = key
          stickerW = stickerEl.offsetWidth
        }
        // drawn at its final size and the card's scale undone, so the text stays sharp
        const k = cfg.focusScale * cfg.spotScale
        const over = Math.max(0, size.w / 2 + (k * card) / 2 + stickerW / 2 - (size.w - 12)) / Math.max(0.1, k)
        css(stickerEl, 'transform', `translate(50%, -50%) translate(${(-over).toFixed(1)}px, 0px) rotate(${cfg.stickerRotate}deg) scale(${(Math.max(0, sticker) / Math.max(0.1, k)).toFixed(4)})`)
      }

      // ---- prompt + rarity line ----
      {
        const promptK = state === 'ready' && cfg.promptText.trim() ? smooth(0, 0.3, t - readyAt) * (0.6 + 0.4 * Math.sin(TAU * 1.1 * t) ** 2) : 0
        css(E.prompt, 'opacity', promptK.toFixed(3))
        css(E.prompt, 'font-size', `${(cfg.promptSize * sizeK).toFixed(1)}px`)
        css(E.prompt, 'transform', `translate(-50%, -50%) translate(0px, ${(cy - size.h / 2 + (card * cfg.focusScale) / 2 + 30 * sizeK).toFixed(1)}px)`)
        const lineAt = cfg.stickerDelay + cfg.lineDelay
        let lineK = sinceSpot >= 0 && tr.line ? smooth(lineAt, lineAt + 0.3, sinceSpot) : 0
        if (sinceOutro >= 0) lineK *= 1 - smooth(0, 0.25, sinceOutro)
        css(E.line, 'opacity', lineK.toFixed(3))
        css(E.line, 'font-size', `${(cfg.lineSize * sizeK).toFixed(1)}px`)
        css(E.line, 'transform', `translate(-50%, -50%) translate(${(cfg.lineOffsetX * sizeK).toFixed(1)}px, ${(cy - size.h / 2 + (card * cfg.spotScale) / 2 + cfg.lineGap * sizeK + (1 - lineK) * 10).toFixed(1)}px)`)
      }

      // ---- tease pair (fades as the carousel comes in) + closing pair (outro) ----
      const textK = clamp(1 + (size.w / COSMETIC_REFERENCE_WIDTH - 1) * cfg.teaseSizeVsWidth, 1, Math.max(1, cfg.teaseSizeMax))
      const pairBase = {
        dt,
        live,
        fade: cfg.teaseFade,
        rotate: cfg.teaseRotate,
        stiffness: cfg.teaseStiffness,
        damping: cfg.teaseDamping,
        slideTime: cfg.teaseSlideTime,
        sizeK: textK,
      }
      teasePair.update({
        ...pairBase,
        t: teaseAt >= 0 ? t - teaseAt - cfg.teaseInDelay : -1,
        out: carouselAt >= 0 ? smooth(0, 0.35, t - carouselAt) : 0,
        centreY: 0,
        size: cfg.teaseSize,
        subSize: cfg.teaseSubSize,
        subGap: cfg.teaseSubGap,
        subMaxWidth: cfg.teaseSubMaxWidth,
        subDelay: cfg.teaseSubDelay,
      })
      // just above the buttons (as the Gold Reveal's closing line)
      const shopTop = size.h - cfg.shopBottom - shopH
      closePair.update({
        ...pairBase,
        t: sinceOutro >= cfg.closingDelay ? sinceOutro - cfg.closingDelay : -1,
        out: 0,
        centreY: 0,
        bottomY: shopTop - cfg.closingGap - size.h / 2,
        size: cfg.closingSize,
        subSize: cfg.closingSubSize,
        subGap: cfg.closingSubGap,
        subMaxWidth: cfg.closingSubMaxWidth,
        subDelay: 0.35,
      })

      // ---- avatar (wearing the item) ----
      {
        const avH = Math.min(cfg.avatarHeight * size.h, (0.8 * size.w) / POSE_ASPECT)
        // centred at avatarCenterY (slightly above the middle); springs up from below the screen
        const top = size.h * cfg.avatarCenterY - avH / 2
        const hidden = size.h - top + 20
        if (live) {
          if (sinceOutro >= cfg.avatarDelay) {
            const f = -cfg.avatarStiffness * avY - cfg.avatarDamping * avV
            avV += f * dt
            avY += avV * dt
          } else {
            avY = 1
            avV = 0
          }
        }
        css(E.avatar, 'opacity', cfg.avatar && avY < 0.999 ? '1' : '0')
        css(E.avatar, 'left', `${(cfg.avatarX * 100).toFixed(2)}%`)
        css(E.avatar, 'top', '0px')
        css(E.avatar, 'bottom', 'auto')
        css(E.avatar, 'height', `${avH.toFixed(1)}px`)
        css(E.avatar, 'width', `${(avH * POSE_ASPECT).toFixed(1)}px`)
        css(E.avatar, 'transform', `translate(-50%, ${(top + avY * hidden).toFixed(1)}px)`)
      }

      // ---- buttons ----
      {
        const fs = 14 * Math.max(0.2, cfg.buttonSize)
        // top → bottom: "Try the item on", then "Buy another chest" (colours stay with each button)
        const bEls = [E.btn2, E.btn]
        const tilts = [cfg.tryRotate, cfg.buyRotate]
        css(E.shop, 'bottom', `calc(${cfg.shopBottom}px + env(safe-area-inset-bottom, 0px))`)
        for (let i = 0; i < 2; i++) {
          const b = btns[i]
          const at = cfg.buttonDelay + i * Math.max(0, cfg.buttonStagger)
          if (cfg.button && sinceOutro >= at) {
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
          } else if (sinceOutro < 0) {
            b.s = cfg.buttonFromScale
            b.r = cfg.buttonFromRotate
            b.sv = b.rv = 0
            b.o = 0
          }
          const el = bEls[i]
          css(el, 'margin-top', `${i === 0 ? 0 : cfg.buttonsGap}px`)
          css(el, 'z-index', i === 0 ? '2' : '1')
          css(el, 'width', `min(${cfg.buttonWidth}px, 100%)`)
          css(el, '--gem-btn-fs', `${fs.toFixed(2)}px`)
          css(el, 'opacity', (cfg.button ? b.o : 0).toFixed(3))
          css(el, 'pointer-events', cfg.button && b.o > 0.5 ? 'auto' : 'none')
          css(el, 'transform', `scale(${b.s.toFixed(4)}) rotate(${b.r.toFixed(2)}deg)`)
        }
        css(E.btn, '--cta-fill', cfg.buyColor)
        css(E.btn, '--cta-ink', cfg.buyTextColor)
        css(E.btn2, '--cta-fill', cfg.tryColor)
        css(E.btn2, '--cta-ink', cfg.tryTextColor)
      }

      // ---- paparazzi: schedule + age ----
      if (live) {
        // camera flashes: during the tease only — none on the carousel or in the outro
        const rate = state === 'tease' ? cfg.flashRate : 0
        if (rate > 0 && nextFlashAt >= 0 && t >= nextFlashAt) {
          pop(1)
          nextFlashAt = t + interval(rate, cfg.flashJitter)
        } else if (rate > 0 && nextFlashAt < 0) nextFlashAt = t + interval(rate, cfg.flashJitter)
        for (let i = flashes.length - 1; i >= 0; i--) {
          flashes[i].age += dt
          if (flashes[i].age > cfg.flashDuration) {
            flashes[i] = flashes[flashes.length - 1]
            flashes.pop()
          }
        }
      }

      // ---- front canvas: the camera flashes ----
      fctx.setTransform(1, 0, 0, 1, 0, 0)
      fctx.clearRect(0, 0, front.width, front.height)
      if (flashes.length) {
        fctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        fctx.globalCompositeOperation = 'lighter'
        for (const f of flashes) {
          const u = f.age / Math.max(0.01, cfg.flashDuration)
          const k = Math.pow(1 - u, 2) * cfg.flashIntensity
          const r = f.r * (0.6 + 0.4 * easeOutCubic(u))
          const grd = fctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r)
          grd.addColorStop(0, `rgba(${f.rgb},${clamp(k, 0, 1).toFixed(3)})`)
          grd.addColorStop(0.25, `rgba(${f.rgb},${clamp(k * 0.5, 0, 1).toFixed(3)})`)
          grd.addColorStop(1, `rgba(${f.rgb},0)`)
          fctx.fillStyle = grd
          fctx.fillRect(f.x - r, f.y - r, r * 2, r * 2)
          if (cfg.flashGlint) {
            // the lens glint: points that are thickest at the middle and taper to a tip
            const arm = f.r * cfg.flashGlintSize * (1 - u * 0.5)
            fctx.fillStyle = `rgba(${f.rgb},${clamp(k, 0, 1).toFixed(3)})`
            fillTaperedStar(fctx, f.x, f.y, arm, f.r * cfg.flashGlintWidth * (1 - u * 0.5), cfg.flashGlintPoints, f.rot)
          }
        }
        fctx.globalCompositeOperation = 'source-over'
      }

      // ---- front canvas: the spotlight's one tapered star, over the item: full size at once, then
      // shrinking (as the camera flashes' glint), and fading late in its life ----
      if (cfg.spotGlint > 0 && sinceSpot >= 0 && sinceSpot < cfg.spotGlintDuration && sinceOutro < 0) {
        const u = sinceSpot / Math.max(0.01, cfg.spotGlintDuration)
        const arm = cfg.spotGlintLength * (1 - u * 0.5)
        fctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        fctx.globalCompositeOperation = 'lighter'
        const fade = 1 - smooth(Math.min(0.99, cfg.spotGlintFadeAt), 1, u)
        fctx.fillStyle = hexToRgba(cfg.spotGlintColor, clamp(cfg.spotGlint, 0, 1) * fade)
        fillTaperedStar(fctx, cx, cy, arm, arm * cfg.spotGlintWidth, cfg.spotGlintPoints, (cfg.spotGlintRotate * Math.PI) / 180 - Math.PI / 2)
        fctx.globalCompositeOperation = 'source-over'
      }

      // ---- back canvas: speed lines, then the spotlight burst + ring (behind the cards) ----
      bctx.setTransform(1, 0, 0, 1, 0, 0)
      bctx.clearRect(0, 0, back.width, back.height)

      // speed lines while the carousel spins — the Gem Wheel's, sideways
      {
        const turning = state === 'spinning' || state === 'stopping'
        // cards per second right now (+ = the cards move left), read off phi so it slows down with the stop
        const speed = live && turning && dt > 0 ? (phi - warpPhi) / dt : 0
        warpPhi = phi
        if (live) {
          const target = turning ? clamp(Math.abs(speed) / Math.max(1, cfg.cruiseSpeed), 0, 1) : 0
          const rate = dt / Math.max(0.05, cfg.warpFade)
          warpK = warpK < target ? Math.min(target, warpK + rate) : Math.max(target, warpK - rate)
        }
        const n = cfg.warp ? Math.round(cfg.warpCount) : 0
        while (streaks.length < n) {
          streaks.push({
            x: Math.random() * (size.w + cfg.warpLength) - cfg.warpLength,
            y: Math.random(),
            speed: 1 + (Math.random() * 2 - 1) * cfg.warpSpeedVar,
            alpha: 1 - Math.random() * cfg.warpOpacityVar,
            hue: (Math.random() * 2 - 1) * cfg.warpColorVar * 60,
          })
        }
        if (streaks.length > n) streaks.length = n
        if (n > 0 && (warpK > 0.01 || turning)) {
          const v = -speed * pitch * cfg.warpSpeedScale // with the cards
          const band = size.h * cfg.warpBand
          bctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          bctx.globalCompositeOperation = 'lighter'
          for (const sk of streaks) {
            sk.x += v * sk.speed * dt
            if (sk.x > size.w) {
              sk.x = -cfg.warpLength
              sk.y = Math.random()
            } else if (sk.x < -cfg.warpLength) {
              sk.x = size.w
              sk.y = Math.random()
            }
            if (warpK <= 0.01) continue
            const col = sk.hue ? shiftHue(cfg.warpColor, sk.hue) : cfg.warpColor
            bctx.fillStyle = hexToRgba(col, cfg.warpOpacity * sk.alpha * warpK)
            bctx.fillRect(sk.x, cy + (sk.y - 0.5) * band - cfg.warpWidth / 2, cfg.warpLength, cfg.warpWidth)
          }
          bctx.globalCompositeOperation = 'source-over'
        }
      }
      if (sinceSpot >= 0 && sinceSpot < Math.max(cfg.spotFlashDecay, cfg.spotRingDuration) && sinceOutro < 0) {
        bctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        bctx.globalCompositeOperation = 'lighter'
        if (cfg.spotFlash > 0) {
          const k = 1 - clamp(sinceSpot / Math.max(0.01, cfg.spotFlashDecay), 0, 1)
          if (k > 0) {
            const r = Math.max(10, cfg.spotFlashSize * size.h) * lerp(0.6, 1, 1 - k * k)
            const grd = bctx.createRadialGradient(cx, cy, 0, cx, cy, r)
            const a = clamp(cfg.spotFlash * k * k, 0, 1)
            grd.addColorStop(0, hexToRgba('#ffffff', a))
            grd.addColorStop(0.35, hexToRgba('#ffffff', a * 0.45))
            grd.addColorStop(1, hexToRgba('#ffffff', 0))
            bctx.fillStyle = grd
            bctx.fillRect(0, 0, size.w, size.h)
          }
        }
        if (cfg.spotRing) {
          const u = clamp(sinceSpot / Math.max(0.01, cfg.spotRingDuration), 0, 1)
          if (u < 1) {
            bctx.strokeStyle = hexToRgba(cfg.spotRingColor, cfg.spotRingOpacity * (1 - u))
            bctx.lineWidth = Math.max(0.5, cfg.spotRingWidth * (1 - u * 0.7))
            bctx.beginPath()
            bctx.arc(cx, cy, card * 0.55 + cfg.spotRingSize * easeOutCubic(u), 0, TAU)
            bctx.stroke()
          }
        }
        bctx.globalCompositeOperation = 'source-over'
      }

      raf = requestAnimationFrame(loop)
    }
    const seen = { ...sig.current }
    if (autoStartRef.current) setState('tease')
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      shopRo.disconnect()
      teasePair.disconnect()
      closePair.disconnect()
      wrap.removeEventListener('pointerdown', onDown)
      wrap.removeEventListener('pointermove', onMove)
      wrap.removeEventListener('pointerup', onUp)
      wrap.removeEventListener('pointercancel', onUp)
      window.clearTimeout(musicTimer)
      revealSfx.pause()
      revealSfx.src = ''
      if (music) {
        music.pause()
        music.src = ''
      }
      musicRef.current = { el: null, playing: false }
      fireworkSound.current = null
      spotFireworkSound.current = null
      bus.dispose()
      actx?.close().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carouselKey])

  // live mute / volume for the soundtrack (the speaker icon flips `sound`)
  useEffect(() => {
    const m = musicRef.current
    if (!m.el) return
    m.el.volume = clamp(c.musicVolume, 0, 1)
    m.el.loop = c.musicLoop
    if (!c.sound) m.el.pause()
    else if (m.playing) m.el.play().catch(() => {})
  }, [c.sound, c.musicVolume, c.musicLoop])

  // fireworks (the same for every tier) burst in the band above the revealed item and keep going through the outro
  const confettiCfg = c.fireworks ? cosmeticFireworksConfig(c) : null
  // one firework from the centre of the revealed item (firing re-renders, so the height is current)
  const stageH = wrapRef.current?.clientHeight || 0
  const spotPopCfg = c.spotPop ? cosmeticSpotFireworkConfig(c, 0.5 + (stageH ? c.carouselOffsetY / stageH : 0)) : null

  return (
    <div ref={wrapRef} className='cosmetic-reveal'>
      <canvas ref={backRef} className='cosmetic-reveal__fx' />
      {confettiCfg && (
        <Confetti
          key={`${carouselKey}:confetti`}
          runKey={`${carouselKey}:confetti`}
          config={confettiCfg}
          fireSignal={confettiFire}
          paused={paused}
          intensity={c.confettiAmount}
          onBurst={(_side, x) => fireworkSound.current?.(x)}
        />
      )}
      {/* placeholder avatar, "wearing" the item — the real one comes from the avatar system */}
      <div ref={avatarRef} className='cosmetic-reveal__avatar' aria-hidden='true'>
        <img
          src={poseUrl}
          alt=''
          draggable={false}
          style={{
            width: `${((POSE_BOX.w / (POSE_BOX.x1 - POSE_BOX.x0)) * 100).toFixed(2)}%`,
            left: `${((-POSE_BOX.x0 / (POSE_BOX.x1 - POSE_BOX.x0)) * 100).toFixed(2)}%`,
            top: `${((-POSE_BOX.y0 / (1222 - POSE_BOX.y0)) * 100).toFixed(2)}%`,
          }}
        />
      </div>
      <div ref={teaseRef} className='gold-reveal__text gold-reveal__tease'>
        {teaseText}
      </div>
      <div ref={teaseSubRef} className='gold-reveal__text gold-reveal__tease-sub'>
        {teaseSubText}
      </div>
      <div ref={stripRef} className='cosmetic-reveal__strip'>
        {items.map((it, i) => {
          const fit = fitItem(it, c.itemPadding)
          return (
            <div
              key={`${it.name}-${i}`}
              className='cosmetic-card'
              style={{
                borderRadius: c.cardRadius,
                borderWidth: c.cardBorderWidth,
                borderColor: hexToRgba(c.cardBorderColor, c.cardBorderOpacity),
                background: hexToRgba(c.cardFill, c.cardFillOpacity),
              }}
              aria-label={it.name}
            >
              <img src={it.url} alt='' draggable={false} style={fit} />
              {i === winnerSlot && tier.sticker && (
                <span
                  className='cosmetic-card__sticker'
                  style={{ background: tier.sticker.color, color: tier.sticker.ink }}
                >
                  {tier.sticker.text}
                </span>
              )}
            </div>
          )
        })}
      </div>
      {/* the single firework: over the cards, sticker included */}
      {spotPopCfg && (
        <div className='cosmetic-reveal__firework'>
          <Confetti
            key={`${carouselKey}:spot`}
            runKey={`${carouselKey}:spot`}
            config={spotPopCfg}
            fireSignal={spotPopFire}
            paused={paused}
            intensity={c.spotPopAmount}
            onBurst={() => spotFireworkSound.current?.()}
          />
        </div>
      )}
      <div ref={promptRef} className='gold-reveal__text cosmetic-reveal__prompt'>
        {c.promptText}
      </div>
      <div ref={lineRef} className='gold-reveal__text cosmetic-reveal__line'>
        {tier.line}
      </div>
      <canvas ref={frontRef} className='cosmetic-reveal__fx cosmetic-reveal__fx--front' />
      <div ref={closeRef} className='gold-reveal__text gold-reveal__tease'>
        {closeText}
      </div>
      <div ref={closeSubRef} className='gold-reveal__text gold-reveal__tease-sub'>
        {closeSubText}
      </div>
      <div ref={shopRef} className='gold-reveal__shop'>
        <div ref={btn2Ref} className='gem-reveal__btn gold-reveal__btn gold-reveal__cta'>
          <FoldableButton onClick={onTry}>{c.tryText}</FoldableButton>
        </div>
        <div ref={btnRef} className='gem-reveal__btn gold-reveal__btn gold-reveal__cta'>
          <FoldableButton onClick={onBuy}>{c.buyText}</FoldableButton>
        </div>
      </div>
    </div>
  )
}
