import type { ParticleRainConfig } from '@/components/ParticleRain'

function n(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 10_000) / 10_000)
}

/**
 * A standalone, dependency-free canvas-2D implementation with this config's
 * numbers baked in. Drop it onto a `<canvas>` overlay in the app:
 *
 *   const rain = createParticleRain(canvasEl, { gbar: '/gbar.svg', tinyBar: '/tinyBar.svg' })
 *   rain.dump()   // "pull the floor out" — the pile collapses bottom-up and drains off the screen
 *   rain.stop()   // tear down the loop; re-create to start over
 *
 * Sprites are rasterised once from the URLs (SVG or raster, both fine).
 * Responsive: `count` + `particleSize` scale off the live canvas width against
 * `referenceWidth` (when `autoScale`). Collision (`collide`): particles pile up
 * in `bounce` floor mode via a spatial hash + circle-overlap resolution.
 */
export function buildParticleLoopSpec(c: ParticleRainConfig): string {
  return `// particle-rain — generated from the approved config. No dependencies.
// const rain = createParticleRain(canvas, { gbar: url, tinyBar: url })   // URLs may be .svg or raster
// rain.dump()  → "pull the floor out": pile collapses bottom-up + drains off the screen (dumpStagger)
// rain.stop()  → tear down

const CONFIG = ${JSON.stringify(c, null, 2)}

const SPRITE_RASTER = 384   // longest edge (× DPR) the sprites are rasterised to, once
const PX_PER_METER = 143    // gravity is set in m/s²; multiply by this for px/s²

export function createParticleRain(canvas, urls) {
  const ctx = canvas.getContext('2d')
  const c = CONFIG
  const TAU = Math.PI * 2, DEG = Math.PI / 180
  const rand = (a, b) => a + Math.random() * (b - a)
  let dumping = false   // "pull the floor out" — see the returned dump()
  let quietFor = 0      // seconds the system has been at rest (auto-sleep)

  // --- sprites: rasterise each URL once to an offscreen canvas ---
  const sprites = { gbar: null, tinyBar: null }
  const loadSprite = (url, set) => {
    const img = new Image()
    img.onload = () => {
      const iw = img.naturalWidth || SPRITE_RASTER, ih = img.naturalHeight || SPRITE_RASTER
      const longest = Math.max(iw, ih), aw = iw / longest, ah = ih / longest
      const dpr = Math.min(devicePixelRatio || 1, 2)
      const bm = document.createElement('canvas')
      bm.width = Math.max(1, Math.round(SPRITE_RASTER * aw * dpr))
      bm.height = Math.max(1, Math.round(SPRITE_RASTER * ah * dpr))
      bm.getContext('2d').drawImage(img, 0, 0, bm.width, bm.height)
      set({ bitmap: bm, aw, ah })
    }
    img.src = url
  }
  loadSprite(urls.gbar, s => (sprites.gbar = s))
  loadSprite(urls.tinyBar, s => (sprites.tinyBar = s))

  let size = { w: canvas.clientWidth, h: canvas.clientHeight }
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2)
    size = { w: canvas.clientWidth, h: canvas.clientHeight }
    canvas.width = Math.round(size.w * dpr)
    canvas.height = Math.round(size.h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  const ro = new ResizeObserver(resize); ro.observe(canvas)

  // width-driven scale: 1.0 at referenceWidth, tracks live width by \`strength\`, clamped
  const wf = (strength) => {
    if (!c.autoScale) return 1
    const f = 1 + (size.w / (c.referenceWidth || 1) - 1) * strength
    return Math.max(c.minScale, Math.min(c.maxScale, f))
  }
  const effCount = () => Math.max(1, Math.round(c.count * wf(c.countScale)))
  const effSize = () => c.particleSize * wf(c.sizeScale)

  const pickSprite = () =>
    c.asset === 'gbar' ? 'gbar' : c.asset === 'tinyBar' ? 'tinyBar' : Math.random() < 0.5 ? 'gbar' : 'tinyBar'

  let nextId = 0
  const make = (releaseAt, es) => {
    const scale = rand(c.scaleMin, c.scaleMax)
    const mid = (c.scaleMin + c.scaleMax) / 2 || 1
    const speedMul = 1 + c.bigFallFaster * ((scale - mid) / mid)
    return {
      id: nextId++,
      x: size.w / 2 + (Math.random() - 0.5) * c.spawnWidth * size.w,
      y: -rand(0, c.spawnHeight) - es,
      vx: (Math.random() - 0.5) * 2 * c.velocityXSpread,
      vy: rand(c.velocityYMin, c.velocityYMax) * speedMul,
      angle: Math.random() * TAU,
      spin: c.airborneSpin === 'off' ? 0 : rand(c.spinMin, c.spinMax) * DEG * (Math.random() < 0.5 ? -1 : 1),
      scale, speedMul, swayPhase: Math.random() * TAU,
      age: 0, releaseAt, sprite: pickSprite(),
      active: false, settled: false, dead: false, fade: 0, pastFloorFor: 0,
      support: false, grounded: false, contacted: false, restFor: 0, releaseCountdown: -1,
    }
  }

  const parts = []
  let simTime = 0, spawnAcc = 0
  if (c.mode === 'burst') {
    const n0 = effCount(), es0 = effSize()
    for (let i = 0; i < n0; i++)
      parts.push(make(c.burstWindow > 0 ? Math.random() * c.burstWindow : 0, es0))
  }

  const collide = (es) => {
    if (!c.collide) return
    const list = parts.filter(p => !p.dead && p.active)
    if (list.length < 2) return
    const rOf = p => (c.collideRadius * es * p.scale) / 2
    const cell = Math.max(4, c.collideRadius * es * c.scaleMax)
    const grid = new Map()
    const key = (x, y) => x + ',' + y
    for (const p of list) {
      const k = key(Math.floor(p.x / cell), Math.floor(p.y / cell))
      grid.has(k) ? grid.get(k).push(p) : grid.set(k, [p])
    }
    for (let it = 0; it < Math.max(1, Math.round(c.collideIterations)); it++) {
      for (const a of list) {
        const acx = Math.floor(a.x / cell), acy = Math.floor(a.y / cell), ra = rOf(a)
        for (let gx = acx - 1; gx <= acx + 1; gx++) for (let gy = acy - 1; gy <= acy + 1; gy++) {
          const bucket = grid.get(key(gx, gy)); if (!bucket) continue
          for (const b of bucket) {
            if (b.id <= a.id) continue
            let dx = b.x - a.x, dy = b.y - a.y
            const rr = ra + rOf(b), d2 = dx * dx + dy * dy
            if (d2 >= rr * rr) continue
            let d = Math.sqrt(d2)
            if (d < 1e-4) { dx = a.id % 2 ? -0.5 : 0.5; dy = 0.5; d = Math.hypot(dx, dy) }
            const nx = dx / d, ny = dy / d
            const corr = Math.max(rr - d - 0.5, 0) * 0.9   // slop + 0.9 factor → less stack jitter
            // support flags — before the immovable-pair early-out (settled-on-settled
            // support is what makes a dump collapse bottom-up, not as a block)
            if (a.settled && !b.settled && ny < -0.35) b.support = true
            if (b.settled && !a.settled && ny > 0.35) a.support = true
            if (a.settled && b.settled) { if (ny > 0.35) a.support = true; else if (ny < -0.35) b.support = true }
            const ima = a.settled ? 0 : 1, imb = b.settled ? 0 : 1, ims = ima + imb
            if (!ims) continue
            a.x -= nx * corr * (ima / ims); a.y -= ny * corr * (ima / ims)
            b.x += nx * corr * (imb / ims); b.y += ny * corr * (imb / ims)
            if (c.airborneSpin === 'killOnContact') { if (!a.contacted) a.spin = 0; if (!b.contacted) b.spin = 0 }
            a.contacted = true; b.contacted = true
            const rvx = b.vx - a.vx, rvy = b.vy - a.vy, vn = rvx * nx + rvy * ny
            if (vn < 0) {
              const jn = (-(1 + c.collideRestitution) * vn) / ims
              a.vx -= nx * jn * ima; a.vy -= ny * jn * ima
              b.vx += nx * jn * imb; b.vy += ny * jn * imb
              const wake = dumping ? 150 : c.collideWake
              if (wake > 0 && Math.hypot(rvx, rvy) > wake) { a.settled = false; b.settled = false }
            }
            // tangential friction — every contact, resting ones included (grip)
            const tx = -ny, ty = nx, vt = rvx * tx + rvy * ty, jt = (-vt * c.collideFriction) / ims
            a.vx -= tx * jt * ima; a.vy -= ty * jt * ima
            b.vx += tx * jt * imb; b.vy += ty * jt * imb
            // that sliding impulse also tumbles the bars
            if (c.contactSpin > 0) {
              a.spin -= (jt / Math.max(2, ra)) * c.contactSpin * ima
              b.spin -= (jt / Math.max(2, rOf(b))) * c.contactSpin * imb
            }
          }
        }
      }
    }
  }

  const step = (dt, es) => {
    const floorY = size.h - c.floorInset
    if (c.mode === 'stream' && !dumping && !(c.streamDuration > 0 && simTime >= c.streamDuration)) {
      const cap = effCount()
      spawnAcc += c.spawnRate * dt
      while (spawnAcc >= 1) {
        spawnAcc -= 1
        if (parts.reduce((k, p) => k + (p.dead ? 0 : 1), 0) >= cap) break
        const slot = parts.find(p => p.dead)
        const fresh = make(simTime, es); fresh.active = true
        slot ? Object.assign(slot, fresh) : parts.push(fresh)
      }
    }
    const half = p => (es * p.scale) / 2

    for (const p of parts) {
      if (p.dead) continue
      if (!p.active) { if (simTime >= p.releaseAt) p.active = true; else continue }
      p.age += dt
      p.grounded = p.support   // collision resolves support a frame late
      p.support = false
      if (p.settled) continue   // settled particles don't integrate; dump release is decided in pass 3
      if (!p.grounded || dumping) p.vy += c.gravity * PX_PER_METER * p.speedMul * dt
      p.vx += c.wind * dt
      const damp = Math.exp(-c.airDrag * dt)
      p.vx *= damp; p.vy *= damp
      if (c.terminalVelocity > 0 && p.vy > c.terminalVelocity) p.vy = c.terminalVelocity
      p.x += p.vx * dt; p.y += p.vy * dt
      p.spin *= Math.exp(-c.spinDrag * dt); p.angle += p.spin * dt
    }

    // auto-sleep: skip the solver once every particle is dead or settled
    let anyActive = false
    for (const p of parts) if (!p.dead && p.active && !p.settled) { anyActive = true; break }
    if (anyActive) collide(es)

    for (const p of parts) {
      if (p.dead || !p.active) continue
      const h = half(p)
      // dump: a settled particle lets go once nothing holds it up (floor's gone),
      // so the pile collapses bottom-up; dumpStagger jitters the cascade
      if (p.settled && dumping) {
        if (p.support) p.releaseCountdown = -1
        else {
          if (p.releaseCountdown < 0) p.releaseCountdown = c.dumpStagger * (0.5 + Math.random())
          p.releaseCountdown -= dt
          if (p.releaseCountdown <= 0) p.settled = false
        }
      }
      if (!p.settled) {
        if (c.floor === 'bounce' && !dumping) {
          if (p.y + h >= floorY) {
            p.y = floorY - h
            if (p.vy > 0) p.vy = -p.vy * c.restitution
            if (c.airborneSpin === 'killOnContact' && !p.contacted) p.spin = 0
            p.contacted = true
            const skid = p.vx * c.floorFriction   // horizontal speed lost to floor friction
            p.vx -= skid
            p.spin *= 1 - c.floorFriction
            if (c.contactSpin > 0) p.spin += (skid / Math.max(2, h)) * c.contactSpin   // roll it into a tumble
            p.support = true
          }
          // resting friction + a critical glide once slow, so it eases to a stop
          // (no snap) rather than being frozen mid-motion.
          if (p.support) {
            if (c.pileFriction > 0) {
              const keep = Math.max(0, 1 - c.pileFriction)
              p.vx *= keep; p.spin *= keep
              if (p.vy > 0) p.vy *= keep
            }
            const motion = Math.hypot(p.vx, p.vy) + Math.abs(p.spin) * 18
            if (motion < c.restThreshold) {
              const glide = Math.exp(-16 * dt)
              p.vx *= glide; p.vy *= glide; p.spin *= glide
              p.restFor += dt
              if (p.restFor > 0.14 && Math.hypot(p.vx, p.vy) + Math.abs(p.spin) * 18 < 6) {
                p.settled = true; p.vx = p.vy = p.spin = 0
              }
            } else p.restFor = 0
          } else p.restFor = 0
        } else if (p.y + h >= floorY) p.pastFloorFor += dt

        // side walls — clamp x, reflect vx, shave vy + spin (same as the floor)
        if (c.walls) {
          const lx = c.wallInset, rx = size.w - c.wallInset
          if (p.x - h < lx) {
            p.x = lx + h
            if (p.vx < 0) p.vx = -p.vx * c.wallRestitution
            p.vy *= 1 - c.wallFriction; p.spin *= 1 - c.wallFriction
          } else if (p.x + h > rx) {
            p.x = rx - h
            if (p.vx > 0) p.vx = -p.vx * c.wallRestitution
            p.vy *= 1 - c.wallFriction; p.spin *= 1 - c.wallFriction
          }
        }
      }
      const fin = c.fadeIn > 0 ? Math.min(1, p.age / c.fadeIn) : 1
      const fout = !dumping && c.floor === 'fallThrough' && c.fadeOut > 0 && p.pastFloorFor > 0
        ? Math.max(0, 1 - p.pastFloorFor / c.fadeOut) : 1
      p.fade = fin * fout
      const bottomEdge = dumping ? size.h : Math.max(size.h, floorY)
      if (p.y - h > bottomEdge + 4 || (!dumping && c.floor === 'fallThrough' && fout <= 0)) p.dead = true
    }

    // auto-sleep — freeze everything once it's all barely moving and nothing's
    // pending, so a finished pile holds still (solver above is then skipped)
    if (!dumping && anyActive) {
      let maxMotion = 0, pending = false
      for (const p of parts) {
        if (p.dead) continue
        if (!p.active) { pending = true; continue }
        if (p.settled) continue
        maxMotion = Math.max(maxMotion, Math.hypot(p.vx, p.vy) + Math.abs(p.spin) * 18)
      }
      if (maxMotion < 8 && !pending) {
        quietFor += dt
        if (quietFor > 0.4) for (const p of parts) {
          if (!p.dead && p.active && !p.settled) { p.settled = true; p.vx = p.vy = p.spin = 0 }
        }
      } else quietFor = 0
    } else quietFor = 0
  }

  const draw = (es) => {
    ctx.clearRect(0, 0, size.w, size.h)
    for (const p of parts) {
      if (p.dead || !p.active || p.fade <= 0) continue
      const spr = sprites[p.sprite]; if (!spr) continue
      const w = spr.aw * es * p.scale, h = spr.ah * es * p.scale
      // flutter scales with speed, so sway eases to 0 as the particle rests — no jump on settle
      const flutter = (p.settled || dumping) ? 0 : Math.min(1, Math.hypot(p.vx, p.vy) / 200)
      const swayX = c.swayAmplitude * Math.sin(TAU * c.swayFrequency * p.age + p.swayPhase) * flutter
      ctx.save()
      ctx.globalAlpha = Math.min(1, p.fade * c.opacity)
      ctx.translate(p.x + swayX, p.y)
      ctx.rotate(p.angle)
      ctx.drawImage(spr.bitmap, -w / 2, -h / 2, w, h)
      ctx.restore()
    }
  }

  let raf = 0, last = performance.now()
  const tick = (now) => {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now
    const es = effSize()
    simTime += dt; step(dt, es); draw(es)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  return {
    // tear the whole thing down
    stop() { cancelAnimationFrame(raf); ro.disconnect() },
    // "pull the floor out": floor + collisions off, every visible particle drops
    // off the bottom and despawns; spawning stops. Re-create to start over.
    dump() { dumping = true },
  }
}`
}

/** Framework-neutral physics tokens. */
export function buildParticleJsonSpec(c: ParticleRainConfig): string {
  return JSON.stringify(
    {
      name: 'particle-rain',
      renderer:
        'canvas-2d, single requestAnimationFrame loop (no library needed at this scale). SVG sprites rasterised once to an offscreen canvas.',
      responsive: c.autoScale
        ? {
            mode: 'auto-scale from live canvas width',
            referenceWidthPx: c.referenceWidth,
            countTracksWidth: c.countScale,
            sizeTracksWidth: c.sizeScale,
            scaleClamp: [c.minScale, c.maxScale],
            note: `count → round(${c.count} · clamp(1 + (width/${c.referenceWidth} − 1)·${n(c.countScale)})); particleSize likewise with ${n(c.sizeScale)}. Spawn band is already width-relative.`,
          }
        : { mode: 'fixed — count and particleSize are literal at every width' },
      emission: {
        mode: c.mode,
        count: c.count,
        burstWindowSec: c.burstWindow,
        note:
          c.mode === 'burst'
            ? `all ${c.count} (× width scale) released over ${n(c.burstWindow)}s (0 = same frame)`
            : `${n(c.spawnRate)}/s for ${c.streamDuration === 0 ? 'ever' : n(c.streamDuration) + 's'}, ${c.count} (× width scale) alive max`,
        spawnRatePerSec: c.spawnRate,
        streamDurationSec: c.streamDuration,
        spawnBandWidth: c.spawnWidth,
        spawnHeightPx: c.spawnHeight,
      },
      physics: {
        gravityMs2: c.gravity,
        pixelsPerMeter: 143,
        gravityPxS2: c.gravity * 143,
        gravityNote: 'gravity is set in m/s² (9.8 = Earth); the engine ×143 to get px/s²',
        initialVelocityY: [c.velocityYMin, c.velocityYMax],
        initialVelocityXSpread: c.velocityXSpread,
        airDragPerSec: c.airDrag,
        terminalVelocityPxS: c.terminalVelocity,
        windPxS2: c.wind,
        sway: { amplitudePx: c.swayAmplitude, frequencyHz: c.swayFrequency },
        spin: {
          spawnDegS: c.airborneSpin === 'off' ? [0, 0] : [c.spinMin, c.spinMax],
          dragPerSec: c.spinDrag,
          airborneSpin: c.airborneSpin,
          airborneSpinNote: 'keep = spawn spin persists · killOnContact = zeroed on first touch · off = none',
          contactSpin: c.contactSpin,
          contactSpinNote: 'fraction of each sliding (friction) impulse — floor skid and bar-on-bar rub — turned into spin',
        },
        integration: 'semi-implicit Euler, dt clamped to 1/30s',
        note: 'width-independent — identical at every screen size',
      },
      clear: {
        api: 'the createParticleRain(...) return has a dump() method (React: bump the dumpSignal prop)',
        effect:
          'spawning stops and the floor is removed; the pile collapses. Particle collisions stay on, so each layer lets go only once nothing holds it (dumpStagger s apart, jittered) — the collapse cascades from the bottom up and the bars drain off the screen rather than dropping as one block.',
        dumpStaggerSec: c.dumpStagger,
        oneWay: 're-create the system to run it again',
      },
      floor:
        c.floor === 'bounce'
          ? {
              mode: 'bounce',
              lineInsetPx: c.floorInset,
              note: c.floorInset < 0 ? 'negative inset — floor sits below the visible edge' : undefined,
              restitution: c.restitution,
              friction: c.floorFriction,
              settleBelowPxS: c.restThreshold,
            }
          : { mode: 'fallThrough', lineInsetPx: c.floorInset, fadeOutSec: c.fadeOut },
      walls: c.walls
        ? {
            enabled: true,
            insetPx: c.wallInset,
            insetNote: 'each wall is this far inside the frame edge; negative = outside the visible edge',
            restitution: c.wallRestitution,
            friction: c.wallFriction,
            frictionNote: 'vertical + spin speed lost sliding along a wall',
          }
        : { enabled: false },
      collision: c.collide
        ? {
            model: 'circle approximation, spatial hash + position/impulse resolution (0.5px slop, 0.9 correction factor)',
            hitRadius: c.collideRadius,
            hitRadiusNote: '× the particle half-size — bars aren’t round, so < 1',
            restitution: c.collideRestitution,
            contactFriction: c.collideFriction,
            contactFrictionNote: 'tangential grip on every contact, resting ones included',
            pileFriction: c.pileFriction,
            pileFrictionNote: 'per-frame horizontal + spin damping on any supported particle (floor or pile) — the pile-lock knob',
            solverIterations: c.collideIterations,
            solverIterationsNote: 'raise to 3–4 for very deep / high-count piles',
            wakeAbovePxS: c.collideWake,
            autoSleep: 'once every particle is barely moving and none are pending, they are all force-settled and the solver is skipped — a finished pile of any size holds perfectly still. A new particle or a dump() wakes it.',
            note: 'settled particles are immovable until a relative impact exceeds wakeAbovePxS (0 = never). A supported particle stops receiving gravity and its residual motion eases out (critical glide + speed-scaled sway fade) so it comes to rest without a visible snap; it locks in ~0.15s once nearly still.',
          }
        : { model: 'none — settled particles form a flat single-layer heap' },
      appearance: {
        asset: c.asset,
        particleSizePx: c.particleSize,
        scale: [c.scaleMin, c.scaleMax],
        bigFallFaster: c.bigFallFaster,
        fadeInSec: c.fadeIn,
        opacity: c.opacity,
      },
    },
    null,
    2,
  )
}
