import { useEffect, useRef } from 'react'
import gbarUrl from '@/assets/gbar.svg'
import tinyBarUrl from '@/assets/tinyBar.svg'

/**
 * Canvas-2D particle system — the images in `src/assets/` rain down from the top
 * of the stage. One `requestAnimationFrame` loop integrates a small array of
 * particle states (gravity, initial velocity, air drag, spin, sway, wind, floor
 * bounce, particle-particle collision) and `drawImage`s each one. No
 * dependencies — this is the reference the developer drops onto a `<canvas>`
 * overlay (or ports to Pixi if they ever need thousands of sprites; at the
 * 50–150 counts here, 2D canvas is plenty).
 *
 * Units: `gravity` is in **m/s²** (9.8 = Earth) — the engine multiplies by a
 * fixed pixels-per-metre scale. Every other speed/distance is in px (or px/s).
 *
 * Sprites: the SVGs are **rasterised once** to an offscreen canvas at a fixed
 * high resolution, then blitted per particle — vector-crisp at any on-screen
 * size the responsive sizing produces, with no per-frame SVG re-rasterisation.
 *
 * Two emission modes:
 *  - **burst**  — `count` particles released over `burstWindow` s (0 = all at once)
 *  - **stream** — `spawnRate` particles/s, for `streamDuration` s (0 = forever)
 *
 * Responsive: with `autoScale` on, `count` and `particleSize` scale off the live
 * canvas width against `referenceWidth`, so the downpour keeps the same density
 * and proportions from a phone to a desktop with no breakpoints to wire.
 *
 * Collision (`collide`): particles are treated as circles (radius = a fraction
 * of the half-size); overlaps are resolved with a spatial hash + position and
 * impulse correction, so in `bounce` floor mode they stack into a pile instead
 * of a flat heap. `collideFriction` grips bars together (resting contacts
 * included) and `pileFriction` bleeds the sideways drift off any supported
 * particle each frame, so the pile locks quickly instead of slowly spreading.
 * A supported particle stops getting gravity, and its last bit of motion eases
 * out with a critical glide + a speed-scaled sway fade, so it comes to rest
 * smoothly rather than snapping. Settled particles are immovable until a hit
 * exceeds `collideWake` (0 = never). Once the whole system goes quiet the solver
 * is skipped entirely (auto-sleep), so a finished pile never drifts, however
 * many particles are in it.
 *
 * Walls (`walls`, optional): left + right colliders at the frame edges, the same
 * clamp/reflect/friction treatment as the floor — particles bounce off and pile
 * against them.
 *
 * Spin: `spinMin`/`spinMax` set the airborne tumble; `airborneSpin` chooses
 * whether it `keep`s, is killed on first contact (`killOnContact`), or is `off`
 * entirely. `contactSpin` turns a fraction of every sliding contact (floor skid,
 * bar-on-bar rub) into spin, so bars keep tumbling from what they hit.
 *
 * Clearing the screen: bump `dumpSignal` to "pull the floor out" — spawning
 * stops and the floor is removed, so the pile collapses. Particle collisions
 * stay on, so it drains and cascades from the bottom up (each layer lets go once
 * nothing holds it, `dumpStagger` s apart) rather than dropping as one block.
 * Each particle despawns as it leaves the bottom of the view; a fresh `runKey`
 * starts it over.
 *
 * Every number comes from `config`. `ParticleRainConfig` is 1:1 with the Leva
 * panel and the `copy config` output.
 */
export type ParticleRainConfig = {
  // --- emission ---
  mode: 'burst' | 'stream'
  /** burst: total particles. stream: max alive at once (pool cap). */
  count: number
  /** burst: seconds over which the full count is released (0 = all on frame 1) */
  burstWindow: number
  /** stream: particles spawned per second */
  spawnRate: number
  /** stream: seconds the emitter runs (0 = infinite) */
  streamDuration: number
  /** 0–1 of stage width — the centred band particles spawn across */
  spawnWidth: number
  /** px above the top edge particles drop in from (randomised 0..this, staggers entry) */
  spawnHeight: number

  // --- physics ---
  /** downward acceleration in **m/s²** (9.8 = Earth). Multiplied by the engine's
   *  fixed pixels-per-metre scale to get px/s². Other speeds below are px/s. */
  gravity: number
  /** initial downward speed at spawn, px/s (randomised between min/max) */
  velocityYMin: number
  velocityYMax: number
  /** initial horizontal speed at spawn, px/s (± this) */
  velocityXSpread: number
  /** air resistance — exponential velocity damping, 1/s (0 = vacuum) */
  airDrag: number
  /** hard cap on fall speed, px/s (0 = none) */
  terminalVelocity: number
  /** constant horizontal acceleration, px/s² (± = left/right) */
  wind: number
  /** sinusoidal horizontal drift while falling, px */
  swayAmplitude: number
  /** sway oscillations per second, Hz */
  swayFrequency: number
  /** spin at spawn, deg/s (randomised between min/max, random direction) */
  spinMin: number
  spinMax: number
  /** spin damping, 1/s */
  spinDrag: number
  /** spawn spin: `keep` persists (decays via spinDrag) · `killOnContact` drops it the first time the particle touches anything · `off` no airborne spin at all */
  airborneSpin: 'keep' | 'killOnContact' | 'off'
  /** 0–1 — how much of a contact's sliding (friction) impulse becomes spin — the floor skid and bar-on-bar rub that tumble a particle */
  contactSpin: number

  // --- floor ---
  floor: 'fallThrough' | 'bounce'
  /** px the floor line sits above the stage bottom — negative = below the visible edge */
  floorInset: number
  /** bounce: fraction of vertical speed kept per bounce, 0–1 */
  restitution: number
  /** bounce: horizontal + spin speed lost on each floor contact, 0–1 */
  floorFriction: number
  /** bounce: speed below which a particle is considered settled, px/s */
  restThreshold: number
  /** fallThrough: seconds a particle fades over once it passes the floor line */
  fadeOut: number
  /** "pull the floor out" (dumpSignal): seconds a pile particle waits after it
   *  loses support before it lets go — spreads the collapse into a cascade from
   *  the bottom up instead of the whole pile dropping at once. 0 = instant cascade */
  dumpStagger: number

  // --- side walls (optional — left + right colliders, same idea as the floor) ---
  /** on = particles bounce off / pile against the left and right frame edges */
  walls: boolean
  /** px each wall sits inside the frame edge — negative = outside the visible edge */
  wallInset: number
  /** fraction of horizontal speed kept when a particle hits a wall, 0–1 */
  wallRestitution: number
  /** vertical + spin speed a particle loses sliding along a wall, 0–1 */
  wallFriction: number

  // --- collision (particle-particle stacking) ---
  /** off = settled particles form a flat single-layer heap. on = they collide + pile up. */
  collide: boolean
  /** collision-circle radius as a fraction of the particle half-size (bars aren't round, so < 1) */
  collideRadius: number
  /** 0–1 — bounciness of particle-particle hits */
  collideRestitution: number
  /** 0–1 — tangential (sliding) speed lost on every contact, resting contacts included — grip between bars */
  collideFriction: number
  /** 0–1 — extra horizontal + spin speed a *resting* particle bleeds off per frame (floor or pile). The pile-lock knob: higher = the pile stops spreading and settles sooner */
  pileFriction: number
  /** position-solver iterations per frame (higher = firmer stacks, small cost) */
  collideIterations: number
  /** relative-impact speed (px/s) that un-settles a rammed pile particle (0 = the pile is never disturbed) */
  collideWake: number

  // --- appearance ---
  asset: 'gbar' | 'tinyBar' | 'both'
  /** on-screen size (longest edge) of a scale-1 particle, px */
  particleSize: number
  scaleMin: number
  scaleMax: number
  /** 0–1 — how much bigger particles fall faster (parallax feel) */
  bigFallFaster: number
  /** seconds a particle fades in over at spawn */
  fadeIn: number
  /** global peak opacity, 0–1 */
  opacity: number

  // --- responsive: auto-scale count + size from the live canvas width ---
  /** on = `count` and `particleSize` scale with the canvas width; off = literal */
  autoScale: boolean
  /** width (px) at which `count` and `particleSize` are used exactly as set */
  referenceWidth: number
  /** 0–1 — how strongly count tracks width (1 = linear: 2× width → 2× count → constant density) */
  countScale: number
  /** 0–1 — how strongly particleSize tracks width */
  sizeScale: number
  /** clamp on the width-scale factor, so a very narrow / ultra-wide frame doesn't over- or under-do it */
  minScale: number
  maxScale: number
}

export const PARTICLE_DEFAULT_CONFIG: ParticleRainConfig = {
  mode: 'burst',
  count: 56,
  burstWindow: 0.75,
  spawnRate: 30,
  streamDuration: 0,
  spawnWidth: 1,
  spawnHeight: 200,

  gravity: 14,
  velocityYMin: 600,
  velocityYMax: 1200,
  velocityXSpread: 500,
  airDrag: 1,
  terminalVelocity: 1540,
  wind: 0,
  swayAmplitude: 0,
  swayFrequency: 0,
  spinMin: 200,
  spinMax: 500,
  spinDrag: 0.75,
  airborneSpin: 'killOnContact',
  contactSpin: 0,

  floor: 'bounce',
  floorInset: -16,
  restitution: 0.55,
  floorFriction: 0.55,
  restThreshold: 5,
  fadeOut: 0,
  dumpStagger: 0.2,

  walls: true,
  wallInset: -24,
  wallRestitution: 0.5,
  wallFriction: 0.15,

  collide: true,
  collideRadius: 0.64,
  collideRestitution: 0.55,
  collideFriction: 0.76,
  pileFriction: 1,
  collideIterations: 6,
  collideWake: 0,

  asset: 'both',
  particleSize: 80,
  scaleMin: 0.8,
  scaleMax: 1.6,
  bigFallFaster: 1,
  fadeIn: 0.15,
  opacity: 1,

  autoScale: true,
  referenceWidth: 570,
  countScale: 0.55,
  sizeScale: 0.3,
  minScale: 0.35,
  maxScale: 2.2,
}

const TAU = Math.PI * 2
const DEG = Math.PI / 180
const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** The engine's world scale: `gravity` is set in m/s² and multiplied by this to
 *  get px/s². 143 keeps the default 9.8 m/s² at the long-standing ~1400 px/s². */
const PX_PER_METER = 143

/** Longest edge (× DPR) the SVGs are rasterised to once, up front. */
const SPRITE_RASTER = 384

type SpriteKey = 'gbar' | 'tinyBar'
type Sprite = { bitmap: HTMLCanvasElement; aw: number; ah: number }

type Particle = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  spin: number
  scale: number
  speedMul: number
  swayPhase: number
  age: number
  releaseAt: number
  sprite: SpriteKey
  active: boolean
  settled: boolean
  dead: boolean
  fade: number
  pastFloorFor: number
  support: boolean
  /** support flag carried from the previous frame (collision sets support one frame late) */
  grounded: boolean
  /** has this particle made its first contact yet (for spinResetOnContact) */
  contacted: boolean
  restFor: number
  /** dump: seconds left before an unsupported pile particle lets go (-1 = not counting) */
  releaseCountdown: number
}

/** Rasterise an SVG (or any image URL) to an offscreen canvas once it loads. */
function rasterizeSprite(url: string, onReady: (s: Sprite) => void) {
  const img = new Image()
  img.onload = () => {
    const iw = img.naturalWidth || SPRITE_RASTER
    const ih = img.naturalHeight || SPRITE_RASTER
    const longest = Math.max(iw, ih)
    const aw = iw / longest
    const ah = ih / longest
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const bitmap = document.createElement('canvas')
    bitmap.width = Math.max(1, Math.round(SPRITE_RASTER * aw * dpr))
    bitmap.height = Math.max(1, Math.round(SPRITE_RASTER * ah * dpr))
    const bx = bitmap.getContext('2d')
    if (bx) bx.drawImage(img, 0, 0, bitmap.width, bitmap.height)
    onReady({ bitmap, aw, ah })
  }
  img.src = url
}

export type ParticleRainProps = {
  config?: Partial<ParticleRainConfig>
  paused?: boolean
  /** change this to re-drop the whole system from scratch */
  runKey?: string | number
  /** bump to "pull the floor out" — floor + particle collisions switch off and
   *  every visible particle drops off the bottom of the view and despawns.
   *  Spawning stops until the next `runKey`. */
  dumpSignal?: number
}

export function ParticleRain({ config, paused = false, runKey, dumpSignal = 0 }: ParticleRainProps) {
  const c: ParticleRainConfig = { ...PARTICLE_DEFAULT_CONFIG, ...config }
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Latest config for the rAF loop without re-subscribing every tweak.
  const cfgRef = useRef(c)
  cfgRef.current = c
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  // "Pull the floor out" — set true when dumpSignal changes, cleared on re-drop.
  const dumpRef = useRef(false)
  const lastDumpSignal = useRef(dumpSignal)
  useEffect(() => {
    if (dumpSignal !== lastDumpSignal.current) {
      lastDumpSignal.current = dumpSignal
      dumpRef.current = true
    }
  }, [dumpSignal])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    dumpRef.current = false // a fresh drop is never mid-dump
    lastDumpSignal.current = dumpSignal

    const sprites: Record<SpriteKey, Sprite | null> = { gbar: null, tinyBar: null }
    rasterizeSprite(gbarUrl, (s) => (sprites.gbar = s))
    rasterizeSprite(tinyBarUrl, (s) => (sprites.tinyBar = s))

    let size = { w: wrap.clientWidth, h: wrap.clientHeight }
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      size = { w: wrap.clientWidth, h: wrap.clientHeight }
      canvas.width = Math.max(1, Math.round(size.w * dpr))
      canvas.height = Math.max(1, Math.round(size.h * dpr))
      canvas.style.width = `${size.w}px`
      canvas.style.height = `${size.h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resizeCanvas()
    const ro = new ResizeObserver(resizeCanvas)
    ro.observe(wrap)

    // Width-driven scale factor: 1.0 at referenceWidth, tracks the live canvas
    // width by `strength` (0 = fixed, 1 = linear), clamped to [minScale, maxScale].
    const widthFactor = (cfg: ParticleRainConfig, strength: number): number => {
      if (!cfg.autoScale) return 1
      const raw = size.w / (cfg.referenceWidth || 1)
      const f = 1 + (raw - 1) * strength
      return Math.max(cfg.minScale, Math.min(cfg.maxScale, f))
    }
    const effectiveCount = (cfg: ParticleRainConfig) =>
      Math.max(1, Math.round(cfg.count * widthFactor(cfg, cfg.countScale)))
    const effectiveSize = (cfg: ParticleRainConfig) => cfg.particleSize * widthFactor(cfg, cfg.sizeScale)

    const cfg0 = cfgRef.current
    const particles: Particle[] = []
    let simTime = 0
    let spawnAcc = 0
    let quietFor = 0 // seconds the whole system has been at rest (→ auto-sleep)
    let nextId = 0

    const pickSprite = (asset: ParticleRainConfig['asset']): SpriteKey =>
      asset === 'gbar' ? 'gbar' : asset === 'tinyBar' ? 'tinyBar' : Math.random() < 0.5 ? 'gbar' : 'tinyBar'

    const makeParticle = (cfg: ParticleRainConfig, releaseAt: number, effSize: number): Particle => {
      const scale = rand(cfg.scaleMin, cfg.scaleMax)
      const mid = (cfg.scaleMin + cfg.scaleMax) / 2 || 1
      const speedMul = 1 + cfg.bigFallFaster * ((scale - mid) / mid)
      const band = cfg.spawnWidth * size.w
      return {
        id: nextId++,
        x: size.w / 2 + (Math.random() - 0.5) * band,
        y: -rand(0, cfg.spawnHeight) - effSize,
        vx: (Math.random() - 0.5) * 2 * cfg.velocityXSpread,
        vy: rand(cfg.velocityYMin, cfg.velocityYMax) * speedMul,
        angle: Math.random() * TAU,
        spin:
          cfg.airborneSpin === 'off'
            ? 0
            : rand(cfg.spinMin, cfg.spinMax) * DEG * (Math.random() < 0.5 ? -1 : 1),
        scale,
        speedMul,
        swayPhase: Math.random() * TAU,
        age: 0,
        releaseAt,
        sprite: pickSprite(cfg.asset),
        active: false,
        settled: false,
        dead: false,
        fade: 0,
        pastFloorFor: 0,
        support: false,
        grounded: false,
        contacted: false,
        restFor: 0,
        releaseCountdown: -1,
      }
    }

    // Burst: pre-create the count (scaled to the width it was dropped at), each
    // with a staggered release time.
    if (cfg0.mode === 'burst') {
      const n0 = effectiveCount(cfg0)
      const size0 = effectiveSize(cfg0)
      for (let i = 0; i < n0; i++) {
        particles.push(makeParticle(cfg0, cfg0.burstWindow > 0 ? Math.random() * cfg0.burstWindow : 0, size0))
      }
    }

    const spawnStream = (cfg: ParticleRainConfig, dt: number, effSize: number) => {
      if (cfg.streamDuration > 0 && simTime >= cfg.streamDuration) return
      const cap = effectiveCount(cfg)
      spawnAcc += cfg.spawnRate * dt
      while (spawnAcc >= 1) {
        spawnAcc -= 1
        const alive = particles.reduce((n, p) => n + (p.dead ? 0 : 1), 0)
        if (alive >= cap) break
        const slot = particles.find((p) => p.dead)
        const fresh = makeParticle(cfg, simTime, effSize)
        fresh.active = true
        if (slot) Object.assign(slot, fresh)
        else particles.push(fresh)
      }
    }

    /** Circle-approx particle-particle collision: spatial hash + position/impulse resolution. */
    const resolveCollisions = (cfg: ParticleRainConfig, effSize: number) => {
      if (!cfg.collide) return
      const list = particles.filter((p) => !p.dead && p.active)
      if (list.length < 2) return

      const radiusOf = (p: Particle) => (cfg.collideRadius * effSize * p.scale) / 2
      const maxR = (cfg.collideRadius * effSize * cfg.scaleMax) / 2
      const cell = Math.max(4, maxR * 2)
      const grid = new Map<string, Particle[]>()
      const keyOf = (cx: number, cy: number) => `${cx},${cy}`
      for (const p of list) {
        const k = keyOf(Math.floor(p.x / cell), Math.floor(p.y / cell))
        const bucket = grid.get(k)
        if (bucket) bucket.push(p)
        else grid.set(k, [p])
      }

      const iters = Math.max(1, Math.round(cfg.collideIterations))
      for (let it = 0; it < iters; it++) {
        for (const a of list) {
          const acx = Math.floor(a.x / cell)
          const acy = Math.floor(a.y / cell)
          const ra = radiusOf(a)
          for (let gx = acx - 1; gx <= acx + 1; gx++) {
            for (let gy = acy - 1; gy <= acy + 1; gy++) {
              const bucket = grid.get(keyOf(gx, gy))
              if (!bucket) continue
              for (const b of bucket) {
                if (b.id <= a.id) continue
                let dx = b.x - a.x
                let dy = b.y - a.y
                const rr = ra + radiusOf(b)
                const d2 = dx * dx + dy * dy
                if (d2 >= rr * rr) continue
                let d = Math.sqrt(d2)
                if (d < 1e-4) {
                  dx = a.id % 2 === 0 ? 0.5 : -0.5
                  dy = 0.5
                  d = Math.hypot(dx, dy)
                }
                const nx = dx / d
                const ny = dy / d
                // positional slop (0.5px) + a 0.9 correction factor — resolving
                // only most of the overlap per pass keeps deep stacks from
                // fighting themselves frame to frame (less jitter at high counts)
                const corr = Math.max(rr - d - 0.5, 0) * 0.9

                // Support flags — computed before the immovable-pair early-out,
                // because settled-on-settled support is what makes a dump
                // collapse from the bottom up rather than drop as a block.
                // ny > 0 → b is below a; ny < 0 → a is below b. Only a *settled*
                // neighbour counts as holding the other one up.
                if (a.settled && !b.settled && ny < -0.35) b.support = true
                if (b.settled && !a.settled && ny > 0.35) a.support = true
                if (a.settled && b.settled) {
                  if (ny > 0.35) a.support = true
                  else if (ny < -0.35) b.support = true
                }

                const ima = a.settled ? 0 : 1
                const imb = b.settled ? 0 : 1
                const ims = ima + imb
                if (ims === 0) continue

                a.x -= nx * corr * (ima / ims)
                a.y -= ny * corr * (ima / ims)
                b.x += nx * corr * (imb / ims)
                b.y += ny * corr * (imb / ims)

                // first contact of any kind → optionally drop the spawn spin
                if (cfg.airborneSpin === 'killOnContact') {
                  if (!a.contacted) a.spin = 0
                  if (!b.contacted) b.spin = 0
                }
                a.contacted = true
                b.contacted = true

                const rvx = b.vx - a.vx
                const rvy = b.vy - a.vy
                const vn = rvx * nx + rvy * ny

                // normal impulse — only when the two are closing (never pull them together)
                if (vn < 0) {
                  const jn = (-(1 + cfg.collideRestitution) * vn) / ims
                  a.vx -= nx * jn * ima
                  a.vy -= ny * jn * ima
                  b.vx += nx * jn * imb
                  b.vy += ny * jn * imb
                  // during a dump, a fast bit of falling debris knocks its
                  // neighbours loose too (helps the collapse look like a collapse)
                  const wake = dumpRef.current ? 150 : cfg.collideWake
                  if (wake > 0 && Math.hypot(rvx, rvy) > wake) {
                    a.settled = false
                    b.settled = false
                  }
                }

                // tangential friction — applied on EVERY contact, resting ones
                // included, so bars grip each other and the pile stops sliding
                const tx = -ny
                const ty = nx
                const vt = rvx * tx + rvy * ty
                const jt = (-vt * cfg.collideFriction) / ims
                a.vx -= tx * jt * ima
                a.vy -= ty * jt * ima
                b.vx += tx * jt * imb
                b.vy += ty * jt * imb

                // that same sliding impulse also tumbles the bars — the rub of
                // one edge against another (or against the floor, handled below)
                if (cfg.contactSpin > 0) {
                  a.spin -= (jt / Math.max(2, ra)) * cfg.contactSpin * ima
                  b.spin -= (jt / Math.max(2, radiusOf(b))) * cfg.contactSpin * imb
                }
              }
            }
          }
        }
      }
    }

    const step = (cfg: ParticleRainConfig, dt: number, effSize: number) => {
      const floorY = size.h - cfg.floorInset
      // "Pull the floor out": stop spawning, remove the floor, and let the pile
      // collapse. Particle collisions stay ON so it drains and cascades from the
      // bottom up rather than the whole heap dropping as one block.
      const dumping = dumpRef.current
      if (cfg.mode === 'stream' && !dumping) spawnStream(cfg, dt, effSize)
      const halfOf = (p: Particle) => (effSize * p.scale) / 2

      // pass 1 — activate, integrate
      for (const p of particles) {
        if (p.dead) continue
        if (!p.active) {
          if (simTime >= p.releaseAt) p.active = true
          else continue
        }
        p.age += dt
        // carry last frame's contact state forward — collision resolves support
        // a frame late, so gravity decisions use the previous result
        p.grounded = p.support
        p.support = false
        // Settled particles don't integrate. During a dump their release is
        // decided in pass 3 (once they've actually lost support), not here.
        if (p.settled) continue

        // A particle that was resting last frame doesn't get re-accelerated
        // downward — that steady drip of vy is what made it jitter and then snap
        // when it finally settled. (During a dump, everything loose falls.)
        if (!p.grounded || dumping) p.vy += cfg.gravity * PX_PER_METER * p.speedMul * dt
        p.vx += cfg.wind * dt
        const damp = Math.exp(-cfg.airDrag * dt)
        p.vx *= damp
        p.vy *= damp
        if (cfg.terminalVelocity > 0 && p.vy > cfg.terminalVelocity) p.vy = cfg.terminalVelocity
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.spin *= Math.exp(-cfg.spinDrag * dt)
        p.angle += p.spin * dt
      }

      // Is anything still in motion? If the whole system has gone quiet (every
      // particle either dead or settled), skip the collision solver entirely —
      // that's what stops a big finished pile from being nudged around forever.
      let anyActive = false
      for (const p of particles) {
        if (!p.dead && p.active && !p.settled) {
          anyActive = true
          break
        }
      }

      // pass 2 — particle-particle collision (sets support flags)
      if (anyActive) resolveCollisions(cfg, effSize)

      // pass 3 — dump release, floor contact, settle, fade, despawn
      for (const p of particles) {
        if (p.dead || !p.active) continue
        const half = halfOf(p)

        // Dump: a settled particle lets go once nothing holds it up any more —
        // the floor is gone, so the bottom of the pile goes first, then whatever
        // was resting on it, and so on. `dumpStagger` adds a short (jittered)
        // delay so the collapse reads as a cascade, not a single lurch.
        if (p.settled && dumping) {
          if (p.support) {
            p.releaseCountdown = -1
          } else {
            if (p.releaseCountdown < 0) p.releaseCountdown = cfg.dumpStagger * (0.5 + Math.random())
            p.releaseCountdown -= dt
            if (p.releaseCountdown <= 0) p.settled = false
          }
        }

        if (!p.settled) {
          if (cfg.floor === 'bounce' && !dumping) {
            if (p.y + half >= floorY) {
              p.y = floorY - half
              if (p.vy > 0) p.vy = -p.vy * cfg.restitution
              if (cfg.airborneSpin === 'killOnContact' && !p.contacted) p.spin = 0
              p.contacted = true
              // the horizontal speed lost to floor friction is a skid — roll it
              // into spin so the bar tumbles forward as it lands
              const skid = p.vx * cfg.floorFriction
              p.vx -= skid
              p.spin *= 1 - cfg.floorFriction
              if (cfg.contactSpin > 0) p.spin += (skid / Math.max(2, half)) * cfg.contactSpin
              p.support = true
            }
            // Resting friction: a supported particle (floor OR a settled particle
            // beneath it) bleeds off its drift, spin and any downward creep. Then
            // once it's genuinely slow, an extra critical glide eases the last
            // bit of motion out so it comes to rest smoothly instead of snapping.
            if (p.support) {
              if (cfg.pileFriction > 0) {
                const keep = Math.max(0, 1 - cfg.pileFriction)
                p.vx *= keep
                p.spin *= keep
                if (p.vy > 0) p.vy *= keep
              }
              const motion = Math.hypot(p.vx, p.vy) + Math.abs(p.spin) * 18
              if (motion < cfg.restThreshold) {
                const glide = Math.exp(-16 * dt)
                p.vx *= glide
                p.vy *= glide
                p.spin *= glide
                p.restFor += dt
                if (p.restFor > 0.14 && Math.hypot(p.vx, p.vy) + Math.abs(p.spin) * 18 < 6) {
                  p.settled = true
                  p.vx = 0
                  p.vy = 0
                  p.spin = 0
                }
              } else {
                p.restFor = 0
              }
            } else {
              p.restFor = 0
            }
          } else if (p.y + half >= floorY) {
            p.pastFloorFor += dt
          }

          // Side walls — same idea as the floor: clamp x, reflect the inbound
          // horizontal speed, and shave vertical + spin speed off the slide.
          if (cfg.walls) {
            const leftX = cfg.wallInset
            const rightX = size.w - cfg.wallInset
            if (p.x - half < leftX) {
              p.x = leftX + half
              if (p.vx < 0) p.vx = -p.vx * cfg.wallRestitution
              p.vy *= 1 - cfg.wallFriction
              p.spin *= 1 - cfg.wallFriction
            } else if (p.x + half > rightX) {
              p.x = rightX - half
              if (p.vx > 0) p.vx = -p.vx * cfg.wallRestitution
              p.vy *= 1 - cfg.wallFriction
              p.spin *= 1 - cfg.wallFriction
            }
          }
        }

        const fadeInK = cfg.fadeIn > 0 ? Math.min(1, p.age / cfg.fadeIn) : 1
        const fadeOutK =
          !dumping && cfg.floor === 'fallThrough' && cfg.fadeOut > 0 && p.pastFloorFor > 0
            ? Math.max(0, 1 - p.pastFloorFor / cfg.fadeOut)
            : 1
        p.fade = fadeInK * fadeOutK

        // during a dump, particles vanish as soon as they clear the visible edge
        const bottomEdge = dumping ? size.h : Math.max(size.h, floorY)
        const goneBelow = p.y - half > bottomEdge + 4
        if (goneBelow || (!dumping && cfg.floor === 'fallThrough' && fadeOutK <= 0)) p.dead = true
      }

      // Auto-sleep — once every active particle is barely moving and none are
      // still waiting to be released, freeze them all. A finished pile then
      // holds perfectly still because the solver above is skipped (`anyActive`
      // goes false). A new particle, or a dump, brings it back to life.
      if (!dumping && anyActive) {
        let maxMotion = 0
        let pending = false
        for (const p of particles) {
          if (p.dead) continue
          if (!p.active) {
            pending = true
            continue
          }
          if (p.settled) continue
          const m = Math.hypot(p.vx, p.vy) + Math.abs(p.spin) * 18
          if (m > maxMotion) maxMotion = m
        }
        if (maxMotion < 8 && !pending) {
          quietFor += dt
          if (quietFor > 0.4) {
            for (const p of particles) {
              if (!p.dead && p.active && !p.settled) {
                p.settled = true
                p.vx = 0
                p.vy = 0
                p.spin = 0
              }
            }
          }
        } else {
          quietFor = 0
        }
      } else {
        quietFor = 0
      }
    }

    const draw = (cfg: ParticleRainConfig, effSize: number) => {
      const dumping = dumpRef.current
      ctx.clearRect(0, 0, size.w, size.h)
      for (const p of particles) {
        if (p.dead || !p.active || p.fade <= 0) continue
        const spr = sprites[p.sprite]
        if (!spr) continue
        const w = spr.aw * effSize * p.scale
        const h = spr.ah * effSize * p.scale
        // Flutter scales with how fast the particle is moving, so the sway offset
        // eases to 0 as it comes to rest — no horizontal jump when it settles.
        const flutter = p.settled || dumping ? 0 : Math.min(1, Math.hypot(p.vx, p.vy) / 200)
        const swayX = cfg.swayAmplitude * Math.sin(TAU * cfg.swayFrequency * p.age + p.swayPhase) * flutter
        ctx.save()
        ctx.globalAlpha = Math.min(1, p.fade * cfg.opacity)
        ctx.translate(p.x + swayX, p.y)
        ctx.rotate(p.angle)
        ctx.drawImage(spr.bitmap, -w / 2, -h / 2, w, h)
        ctx.restore()
      }
    }

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      const cfg = cfgRef.current
      const effSize = effectiveSize(cfg)
      if (!pausedRef.current) {
        simTime += dt
        step(cfg, dt, effSize)
      }
      draw(cfg, effSize)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey])

  return (
    <div ref={wrapRef} className='rain-canvas-wrap'>
      <canvas ref={canvasRef} className='rain-canvas' />
    </div>
  )
}
