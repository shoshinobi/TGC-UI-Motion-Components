import { useEffect, useRef } from 'react'
import gSvgRaw from '@/assets/GOLD_G.svg?raw'
import { CONFETTI_DEFAULT_CONFIG, CONFETTI_PALETTES, type ConfettiConfig } from '@/components/confetti.config'

/**
 * Confetti — one canvas, one rAF loop, two ways to celebrate:
 *
 * - **rain**: pieces spawn across the top for `rainDuration` and flutter down.
 * - **pop**: firework bursts — each burst throws `burstPieces` out from an
 *   origin (centre / random spots / two side cannons / bottom), fast at first,
 *   then air drag kills the speed and they hang, flip and flutter down.
 *
 * Pieces are a mix of the **GOLD_G.svg** mark and paper confetti (strips +
 * dots). Every piece tumbles in 3D the cheap way: a flip angle squashes it
 * (`scaleY = cos(flip)`) and its back face is drawn darker, so it catches the
 * light as it turns. Flutter (sideways sway) fades in as a piece slows down, so
 * a burst flies out clean and only drifts once it's floating.
 *
 * Physics per piece: gravity (m/s², same world scale as Particle Rain), air
 * drag (exponential — sets the float speed: terminal ≈ gravity / drag), a
 * terminal-velocity cap, wind, spin, flip.
 *
 * Fire it with `fireSignal` (bump a counter) or `autoFire`. Counts scale with
 * the stage width (`countVsWidth`), so phone and desktop feel equally full.
 */

const TAU = Math.PI * 2
const DEG = Math.PI / 180
const PX_PER_METER = 143
const G_ORANGE = '#ff9d00'
/** shading steps per colour — fill styles are looked up, never built per frame */
const LIGHT_STEPS = 8
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
/** per-piece fall multipliers: heavier pieces get more gravity, less drag, a higher top speed */
function fallVariation(v: number) {
  if (v <= 0) return { gK: 1, kK: 1, capK: 1 }
  const r = Math.random() * 2 - 1 // −1 light … +1 heavy
  const j = (Math.random() * 2 - 1) * 0.35 // a little independent wobble so it isn't one straight line
  return {
    gK: Math.max(0.2, 1 + v * (r + j)),
    kK: Math.max(0.2, 1 - v * 0.5 * r),
    capK: Math.max(0.25, 1 + v * (r - j)),
  }
}

function shadeHex(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, '0')
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`
}

type GSprite = { front: HTMLCanvasElement | null; back: HTMLCanvasElement | null; aspect: number }

/** The G recoloured by swapping its fill, rasterised once — at the size it's drawn, not bigger. */
function rasterG(hex: string, heightPx: number, onReady: (c: HTMLCanvasElement, aspect: number) => void) {
  const svg = gSvgRaw.replace(new RegExp(G_ORANGE, 'gi'), hex)
  const img = new Image()
  img.onload = () => {
    const iw = img.naturalWidth || 184
    const ih = img.naturalHeight || 206
    const c = document.createElement('canvas')
    c.height = Math.max(8, Math.round(heightPx))
    c.width = Math.max(8, Math.round((heightPx * iw) / ih))
    c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height)
    onReady(c, iw / ih)
  }
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

type Piece = {
  kind: 0 | 1 | 2 // 0 = G, 1 = strip, 2 = dot
  color: number
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  spin: number
  flip: number
  flipSpeed: number
  size: number
  swayPhase: number
  swayFreq: number
  age: number
  life: number
  /** pop pieces: age at which the fade / shrink exit starts (-1 = none) */
  exitAt: number
  /** a burst piece (pop physics) vs a rain piece (rain physics, no time limit) */
  pop: boolean
  /** per-piece multipliers on gravity / drag / the fall-speed cap (fall variation) */
  gK: number
  kK: number
  capK: number
}
/** a pop / cannon mouth: the flash + starburst drawn there */
/** `pick` (0–1) chooses the flash's palette colour */
type Flash = { x: number; y: number; age: number; pick: number; angles: number[] | null }

export type ConfettiProps = {
  config?: Partial<ConfettiConfig>
  paused?: boolean
  /** change to start over (clears the screen) */
  runKey?: string | number
  /** bump to fire (a burst sequence, the rain, or both) */
  fireSignal?: number
  /** bump to stop a looping (or running) rain — pieces already falling finish */
  stopSignal?: number
  /** stage-wide count multiplier (e.g. scale with a payout) */
  intensity?: number
  /** a pop / cannon just fired. side: 0 = left cannon, 1 = right, −1 = the whole burst; x: −1 left … 1 right */
  onBurst?: (side: number, x: number) => void
}

/**
 * Performance notes (mobile first):
 * - the rAF loop **stops when nothing is on screen or scheduled** and wakes on fire,
 *   so an idle confetti layer costs nothing;
 * - one `setTransform` per piece (no save/restore), fill colours from a
 *   pre-built shade table (no per-frame string building), swap-remove for dead
 *   pieces (no splice), G sprites rasterised at their drawn size;
 * - DPR capped at 2, piece count capped by `maxPieces`.
 */
export function Confetti({
  config,
  paused = false,
  runKey,
  fireSignal = 0,
  stopSignal = 0,
  intensity = 1,
  onBurst,
}: ConfettiProps) {
  const c: ConfettiConfig = { ...CONFETTI_DEFAULT_CONFIG, ...config }
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cfgRef = useRef(c)
  cfgRef.current = c
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const intensityRef = useRef(intensity)
  intensityRef.current = intensity
  const onBurstRef = useRef(onBurst)
  onBurstRef.current = onBurst
  const wakeRef = useRef<() => void>(() => {})

  const sig = useRef({ fire: 0, stop: 0 })
  const last = useRef({ fire: fireSignal, stop: stopSignal })
  useEffect(() => {
    if (fireSignal !== last.current.fire) {
      last.current.fire = fireSignal
      sig.current.fire++
      wakeRef.current()
    }
    if (stopSignal !== last.current.stop) {
      last.current.stop = stopSignal
      sig.current.stop++
      wakeRef.current()
    }
  }, [fireSignal, stopSignal])
  // un-pausing has to restart a sleeping loop too
  useEffect(() => {
    if (!paused) wakeRef.current()
  }, [paused])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let size = { w: wrap.clientWidth, h: wrap.clientHeight }
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      size = { w: wrap.clientWidth, h: wrap.clientHeight }
      canvas.width = Math.max(1, Math.round(size.w * dpr))
      canvas.height = Math.max(1, Math.round(size.h * dpr))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    // ---- caches ----
    // G sprites per colour + raster height, front + darker back face
    const gCache = new Map<string, GSprite>()
    const gFor = (hex: string, back: number, px: number): GSprite => {
      const key = `${hex}|${back}|${px}`
      let s = gCache.get(key)
      if (!s) {
        const sp: GSprite = { front: null, back: null, aspect: 184 / 206 }
        s = sp
        gCache.set(key, sp)
        rasterG(hex, px, (cv, a) => {
          sp.front = cv
          sp.aspect = a
        })
        rasterG(shadeHex(hex, 1 - back), px, (cv) => (sp.back = cv))
      }
      return s
    }
    // shade table: [colour][0 = front, 1 = back][light step] → fill style
    let shadeKey = ''
    let shades: string[][][] = []
    const shadeTable = (cfg: ConfettiConfig) => {
      const key = `${cfg.palette}|${cfg.backShade}`
      if (key !== shadeKey) {
        shadeKey = key
        const pal = CONFETTI_PALETTES[cfg.palette] ?? CONFETTI_PALETTES.gold
        shades = pal.map((hex) =>
          [1, 1 - cfg.backShade].map((face) =>
            Array.from({ length: LIGHT_STEPS }, (_, i) => shadeHex(hex, face * (0.75 + (0.25 * i) / (LIGHT_STEPS - 1)))),
          ),
        )
      }
      return shades
    }

    const pieces: Piece[] = []
    const flashes: Flash[] = []
    let t = 0
    // side: 0 = left cannon only, 1 = right only, -1 = the whole burst
    const queue: { at: number; origin: number; side: number }[] = []
    let rainUntil = -1 // Infinity while looping
    let rainAcc = 0
    let nextLoopAt = -1
    const seen = { ...sig.current }

    const widthK = (cfg: ConfettiConfig) =>
      clamp(1 + (size.w / 390 - 1) * cfg.countVsWidth, 0.5, 3) * Math.max(0, intensityRef.current)

    const spawn = (cfg: ConfettiConfig, x: number, y: number, vx: number, vy: number, fromPop: boolean) => {
      if (pieces.length >= cfg.maxPieces) return
      const palette = CONFETTI_PALETTES[cfg.palette] ?? CONFETTI_PALETTES.gold
      const kind: Piece['kind'] = Math.random() < cfg.gShare ? 0 : Math.random() < cfg.dotShare ? 2 : 1
      const sv = 1 + (Math.random() * 2 - 1) * cfg.sizeVar
      pieces.push({
        kind,
        color: Math.floor(Math.random() * palette.length),
        x,
        y,
        vx,
        vy,
        rot: Math.random() * TAU,
        spin: rand(cfg.spinMin, cfg.spinMax) * DEG * (Math.random() < 0.5 ? -1 : 1),
        flip: Math.random() * TAU,
        flipSpeed: rand(cfg.flipMin, cfg.flipMax) * TAU * (Math.random() < 0.5 ? -1 : 1),
        size: (kind === 0 ? cfg.gSize : cfg.paperSize) * sv,
        swayPhase: Math.random() * TAU,
        swayFreq: cfg.flutterFreq * rand(0.7, 1.3),
        age: 0,
        // rain lives until it leaves the bottom of the screen, whatever the height
        life: fromPop ? rand(cfg.lifeMin, Math.max(cfg.lifeMin, cfg.lifeMax)) : Infinity,
        pop: fromPop,
        ...fallVariation(fromPop ? cfg.popFallVar : cfg.rainFallVar),
        exitAt:
          fromPop && cfg.popExit !== 'off'
            ? Math.max(0, cfg.popExitStart * (1 + (Math.random() * 2 - 1) * cfg.popExitVar))
            : -1,
      })
    }

    const burst = (cfg: ConfettiConfig, originIdx: number, side = -1) => {
      const n = Math.round(cfg.burstPieces * widthK(cfg))
      const spread = clamp(cfg.burstSpread, 0, 360) * DEG
      // `speed` set = this shot solved its own launch speed (side cannons)
      // `inward` = which way is "in" for the flash offset (+1 left cannon, −1 right, 0 = not a side cannon)
      const shots: { x: number; y: number; dir: number; speed?: number; inward?: number }[] = []
      if (cfg.burstOrigin === 'sides') {
        // Two cannons on the side edges that AIM at a target: solve the launch
        // velocity so the middle of the burst is at the target after `cannonTime`
        // seconds, under this drag + gravity. With v' = g − k·v (k = drag):
        //   x(T) = vx0·(1 − e^−kT)/k
        //   y(T) = vy0·(1 − e^−kT)/k + (g/k)·(T − (1 − e^−kT)/k)
        // → every screen gets its own angle + speed, and the shot always lands
        // on the text (no per-viewport retuning).
        const y = size.h * cfg.cannonY + cfg.cannonOffsetY
        const k = Math.max(0.05, cfg.popDrag)
        const g = cfg.popGravity * PX_PER_METER
        const T = Math.max(0.05, cfg.cannonTime)
        const e = 1 - Math.exp(-k * T)
        // the target is measured from the edge; the cannon may sit in from it
        const dx = (size.w / 2) * clamp(cfg.cannonAimX, 0, 1.5)
        // horizontal: always reach `aimX` of the way in, in `cannonTime` — the same on every screen
        const vx = (dx * k) / e
        let vy: number
        if (cfg.cannonAimBy === 'angle') {
          // you set the angle; the speed is whatever carries it across in time
          const tanA = Math.tan(clamp(cfg.cannonAngle, 0, 85) * DEG)
          // keep height: the vertical launch speed a 390 px phone would get at this angle,
          // so the rise is the same everywhere and wider screens just throw further
          const vxPhone = (195 * clamp(cfg.cannonAimX, 0, 1.5) * k) / e
          vy = -(cfg.cannonKeepHeight ? vxPhone : vx) * tanA
        } else {
          const dy = size.h * cfg.cannonY + cfg.cannonAimY - y
          vy = ((dy - (g / k) * (T - e / k)) * k) / e
        }
        const speed = Math.hypot(vx, vy) * Math.max(0, cfg.cannonPower)
        const dir = Math.atan2(vy, vx)
        if (side !== 1) shots.push({ x: 0, y, dir, speed, inward: 1 })
        if (side !== 0) shots.push({ x: size.w, y, dir: Math.PI - dir, speed, inward: -1 })
      } else if (cfg.burstOrigin === 'bottom') {
        shots.push({ x: size.w / 2, y: size.h, dir: cfg.burstAngle * DEG })
      } else if (cfg.burstOrigin === 'random') {
        // spread successive bursts across the screen rather than stacking them
        const lane = (originIdx * 0.37 + 0.18) % 1
        shots.push({
          x: size.w * (0.2 + 0.6 * lane + rand(-0.06, 0.06)),
          y: size.h * rand(Math.min(cfg.randomTop, cfg.randomBottom), Math.max(cfg.randomTop, cfg.randomBottom)),
          dir: cfg.burstAngle * DEG,
        })
      } else {
        shots.push({ x: size.w * cfg.originX, y: size.h * cfg.originY, dir: cfg.burstAngle * DEG })
      }
      for (const s of shots) {
        if (cfg.popFlash > 0 || cfg.starIntensity > 0) {
          let angles: number[] | null = null
          if (cfg.starIntensity > 0) {
            const n = Math.max(1, Math.round(cfg.starStrokes))
            angles = []
            for (let i = 0; i < n; i++) {
              if (cfg.starLayout === 'even') angles.push(s.dir + (i * TAU) / n)
              else if (cfg.starLayout === 'random') angles.push(Math.random() * TAU)
              else {
                const fan = clamp(cfg.starFan, 0, 360) * DEG
                angles.push(n === 1 ? s.dir : s.dir - fan / 2 + (i * fan) / (n - 1))
              }
            }
          }
          const fx = s.x + cfg.flashOffsetX * (s.inward ?? 1)
          flashes.push({ x: fx, y: s.y + cfg.flashOffsetY, age: 0, pick: Math.random(), angles })
        }
        // a single cannon still fires its half of the volley
        const per = Math.max(1, Math.round(side >= 0 ? n / 2 : n / shots.length))
        for (let i = 0; i < per; i++) {
          const a = spread >= TAU - 1e-3 ? Math.random() * TAU : s.dir + (Math.random() - 0.5) * spread
          let sp: number
          if (s.speed !== undefined) {
            sp = s.speed * (1 + (Math.random() * 2 - 1) * cfg.cannonSpeedVar)
          } else {
            const u = cfg.burstFill === 'ring' ? rand(0.9, 1) : Math.sqrt(Math.random())
            sp = cfg.burstSpeedMin + (cfg.burstSpeedMax - cfg.burstSpeedMin) * u
          }
          spawn(cfg, s.x, s.y, Math.cos(a) * sp, Math.sin(a) * sp, true)
        }
      }
      // where it went off, −1 left … 1 right
      const mid = shots.reduce((sum, s) => sum + s.x, 0) / Math.max(1, shots.length)
      return size.w > 0 ? (mid / size.w) * 2 - 1 : 0
    }

    const fire = (cfg: ConfettiConfig) => {
      if (cfg.mode === 'pop' || cfg.mode === 'both') {
        const least = Math.max(1, Math.round(cfg.bursts))
        const most = Math.max(least, Math.round(cfg.burstsMax))
        const volleys = least + Math.floor(Math.random() * (most - least + 1))
        if (cfg.burstOrigin === 'sides' && (cfg.cannonOrder !== 'together' || cfg.cannonJitter > 0)) {
          // each cannon gets its own shot time: an order (which side leads), a
          // stagger between the two, and ± jitter on every shot
          const jit = () => (Math.random() * 2 - 1) * cfg.cannonJitter
          for (let i = 0; i < volleys; i++) {
            const base = t + i * cfg.burstInterval
            const lead =
              cfg.cannonOrder === 'alternate' ? i % 2 : cfg.cannonOrder === 'random' ? (Math.random() < 0.5 ? 0 : 1) : 0
            const gap = cfg.cannonOrder === 'together' ? 0 : Math.max(0, cfg.cannonStagger)
            queue.push({ at: Math.max(t, base + jit()), origin: i, side: lead })
            queue.push({ at: Math.max(t, base + gap + jit()), origin: i, side: 1 - lead })
          }
        } else {
          for (let i = 0; i < volleys; i++) queue.push({ at: t + i * cfg.burstInterval, origin: i, side: -1 })
        }
      }
      if (cfg.mode === 'rain' || cfg.mode === 'both') rainUntil = cfg.rainLoop ? Infinity : t + cfg.rainDuration
      nextLoopAt = cfg.loopEvery > 0 ? t + cfg.loopEvery : -1
    }

    const c0 = cfgRef.current
    if (c0.autoFire) nextLoopAt = c0.fireDelay

    // ---- loop (sleeps when idle) ----
    let raf = 0
    let running = false
    let cleared = true
    let last = performance.now()

    const idle = () =>
      pieces.length === 0 && flashes.length === 0 && queue.length === 0 && t >= rainUntil && nextLoopAt < 0

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      const cfg = cfgRef.current
      if (!pausedRef.current) {
        t += dt

        // ---- triggers ----
        if (sig.current.fire !== seen.fire) {
          seen.fire = sig.current.fire
          fire(cfg)
        }
        if (sig.current.stop !== seen.stop) {
          seen.stop = sig.current.stop
          rainUntil = -1
          queue.length = 0
          nextLoopAt = -1
        }
        if (nextLoopAt >= 0 && t >= nextLoopAt) fire(cfg)
        for (let i = queue.length - 1; i >= 0; i--) {
          if (t >= queue[i].at) {
            const x = burst(cfg, queue[i].origin, queue[i].side)
            onBurstRef.current?.(queue[i].side, x)
            queue[i] = queue[queue.length - 1]
            queue.pop()
          }
        }
        if (t < rainUntil) {
          rainAcc += cfg.rainRate * widthK(cfg) * dt
          const band = cfg.rainSpread * size.w
          while (rainAcc >= 1) {
            rainAcc -= 1
            spawn(cfg, size.w / 2 + (Math.random() - 0.5) * band, -20 - Math.random() * 40, rand(-30, 30), cfg.rainSpeed * rand(0.7, 1.3), false)
          }
        }

        // ---- integrate (swap-remove the dead) ----
        const gRain = cfg.rainGravity * PX_PER_METER
        const gPop = cfg.popGravity * PX_PER_METER
        const dampRain = Math.exp(-cfg.rainDrag * dt)
        const dampPop = Math.exp(-cfg.popDrag * dt)
        const vCap = cfg.terminalVelocity
        const exitEnd = Math.max(0.01, cfg.popExitDuration)
        for (let i = pieces.length - 1; i >= 0; i--) {
          const p = pieces[i]
          p.age += dt
          const g = (p.pop ? gPop : gRain) * p.gK
          const damp = p.kK === 1 ? (p.pop ? dampPop : dampRain) : Math.exp(-(p.pop ? cfg.popDrag : cfg.rainDrag) * p.kK * dt)
          // the fall-speed cap only stops gravity adding speed past it — it never
          // trims a burst's launch speed (that flattened each pop into a line)
          const vyPrev = p.vy * damp
          p.vy = (p.vy + g * dt) * damp
          const cap = vCap * p.capK
          if (vCap > 0 && p.vy > cap) p.vy = vyPrev > cap ? vyPrev : cap
          p.vx = (p.vx + cfg.wind * dt) * damp
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.rot += p.spin * dt
          p.flip += p.flipSpeed * dt
          const exited = p.exitAt >= 0 && p.age >= p.exitAt + exitEnd
          if (exited || p.age > p.life || p.y - p.size > size.h || p.x < -120 || p.x > size.w + 120) {
            pieces[i] = pieces[pieces.length - 1]
            pieces.pop()
          }
        }
        for (let i = flashes.length - 1; i >= 0; i--) {
          flashes[i].age += dt
          if (flashes[i].age > Math.max(cfg.popFlashDuration, cfg.starDuration)) {
            flashes[i] = flashes[flashes.length - 1]
            flashes.pop()
          }
        }
      }

      // ---- draw ----
      if (pieces.length || flashes.length || !cleared) {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        cleared = pieces.length === 0 && flashes.length === 0
      }
      if (flashes.length) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.globalCompositeOperation = 'lighter'
        ctx.lineCap = 'round'
        for (const f of flashes) {
          // flash (white, or this pop's palette colour): a soft radial bloom that swells a little as it fades
          const fu = f.age / Math.max(0.01, cfg.popFlashDuration)
          if (cfg.popFlash > 0 && fu < 1) {
            const k = 1 - fu
            const r = cfg.popFlashSize * (0.5 + 0.5 * (1 - k * k))
            const a = Math.min(1, cfg.popFlash * k * k)
            const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r)
            let rgb = '255,255,255'
            if (cfg.popFlashColor === 'palette') {
              const pal = CONFETTI_PALETTES[cfg.palette] ?? CONFETTI_PALETTES.gold
              const n = parseInt(pal[Math.floor(f.pick * pal.length)].slice(1), 16)
              rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
            }
            grd.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`)
            grd.addColorStop(0.4, `rgba(${rgb},${(a * 0.45).toFixed(3)})`)
            grd.addColorStop(1, `rgba(${rgb},0)`)
            ctx.globalAlpha = 1
            ctx.fillStyle = grd
            ctx.fillRect(f.x - r, f.y - r, r * 2, r * 2)
          }
          // starburst: strokes fly out (ease-out), shortening, thinning and fading — one path per burst
          const su = f.age / Math.max(0.01, cfg.starDuration)
          if (f.angles && su < 1) {
            const e = 1 - Math.pow(1 - su, 3)
            const head = 4 + cfg.starRadius * e
            const tail = Math.max(2, head - cfg.starLength * (1 - su * 0.7))
            ctx.globalAlpha = clamp(cfg.starIntensity * Math.pow(1 - su, 1.5), 0, 1)
            ctx.strokeStyle = cfg.starColor
            ctx.lineWidth = Math.max(0.5, cfg.starWidth * (1 - su * 0.6))
            ctx.beginPath()
            for (const a of f.angles) {
              const ca = Math.cos(a)
              const sa = Math.sin(a)
              ctx.moveTo(f.x + ca * tail, f.y + sa * tail)
              ctx.lineTo(f.x + ca * head, f.y + sa * head)
            }
            ctx.stroke()
          }
        }
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'
      }
      if (pieces.length) {
        const palette = CONFETTI_PALETTES[cfg.palette] ?? CONFETTI_PALETTES.gold
        const table = shadeTable(cfg)
        // G raster: the largest it's drawn (× DPR), bucketed so a slider drag doesn't re-raster every step
        const gPx = Math.ceil((cfg.gSize * (1 + cfg.sizeVar) * dpr) / 8) * 8
        const fadeExit = cfg.popExit === 'fade' || cfg.popExit === 'fadeShrink'
        const shrinkExit = cfg.popExit === 'shrink' || cfg.popExit === 'fadeShrink'
        const exitEnd = Math.max(0.01, cfg.popExitDuration)
        for (const p of pieces) {
          let alpha = p.age > p.life - cfg.fadeOut ? clamp((p.life - p.age) / Math.max(0.01, cfg.fadeOut), 0, 1) : 1
          // rain: fades only as it reaches the bottom of the screen
          if (!p.pop && cfg.rainFadeZone > 0) alpha *= clamp((size.h - p.y) / (cfg.rainFadeZone * size.h), 0, 1)
          let scale = 1
          if (p.exitAt >= 0 && p.age > p.exitAt) {
            const u = Math.min(1, (p.age - p.exitAt) / exitEnd)
            const e = u * u * (3 - 2 * u)
            if (fadeExit) alpha *= 1 - e
            if (shrinkExit) scale = 1 - e
          }
          if (p.age < 0.06) alpha *= p.age / 0.06
          if (alpha <= 0.01 || scale <= 0.02) continue
          // flutter fades in as the piece slows — a burst flies out clean
          const speed2 = p.vx * p.vx + p.vy * p.vy
          const floatK = speed2 >= 490000 ? 0 : 1 - Math.sqrt(speed2) / 700
          const x = p.x + cfg.flutterAmp * Math.sin(TAU * p.swayFreq * p.age + p.swayPhase) * floatK
          const cosF = Math.cos(p.flip)
          const front = cosF >= 0
          const sy = Math.max(0.06, front ? cosF : -cosF)
          // one transform: translate · rotate · scale(scale, scale·sy), × DPR
          const cr = Math.cos(p.rot) * scale * dpr
          const sr = Math.sin(p.rot) * scale * dpr
          ctx.setTransform(cr, sr, -sr * sy, cr * sy, x * dpr, p.y * dpr)
          ctx.globalAlpha = alpha
          if (p.kind === 0) {
            const hex = cfg.gTint === 'palette' ? palette[p.color % palette.length] : G_ORANGE
            const spr = gFor(hex, cfg.backShade, gPx)
            const img = front ? spr.front : (spr.back ?? spr.front)
            if (img) {
              const h = p.size
              const w = h * spr.aspect
              ctx.drawImage(img, -w / 2, -h / 2, w, h)
            }
          } else {
            const row = table[p.color % table.length]
            ctx.fillStyle = row[front ? 0 : 1][Math.round(sy * (LIGHT_STEPS - 1))]
            if (p.kind === 2) {
              ctx.beginPath()
              ctx.arc(0, 0, p.size * 0.32, 0, TAU)
              ctx.fill()
            } else {
              const w = p.size * cfg.paperAspect
              ctx.fillRect(-w / 2, -p.size / 2, w, p.size)
            }
          }
        }
        ctx.globalAlpha = 1
      }

      if (idle() && cleared) {
        running = false
        return
      }
      raf = requestAnimationFrame(frame)
    }
    const wake = () => {
      if (running) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    wakeRef.current = wake
    wake()

    return () => {
      cancelAnimationFrame(raf)
      running = false
      wakeRef.current = () => {}
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey])

  return (
    <div ref={wrapRef} className='confetti'>
      <canvas ref={canvasRef} className='confetti__canvas' />
    </div>
  )
}
