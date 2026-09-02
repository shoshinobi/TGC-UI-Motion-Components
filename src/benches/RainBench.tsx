import { useEffect, useRef, useState } from 'react'
import { useControls, folder, button } from 'leva'
import { ParticleRain, PARTICLE_DEFAULT_CONFIG, type ParticleRainConfig } from '@/components/ParticleRain'
import { buildParticleLoopSpec, buildParticleJsonSpec } from '@/lib/buildParticleSpec'
import { SpecCard, stringifyConfig, useLiveCopy } from '@/components/SpecCard'

const D = PARTICLE_DEFAULT_CONFIG

/** Where "★ save settings" stashes an in-progress tune, so it survives a reload
 *  without being baked into PARTICLE_DEFAULT_CONFIG yet. */
const SLOT_KEY = 'tgc-bench:rain'

function flatDefaults() {
  return { ...D }
}

/** The saved in-progress tune (leaf keys only, merged over the code defaults), or null. */
function savedSettings(): Record<string, number | string | boolean> | null {
  try {
    const raw = localStorage.getItem(SLOT_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, number | string | boolean> = {}
    for (const k of Object.keys(D)) {
      if (k in obj) out[k] = obj[k] as number | string | boolean
    }
    // gravity moved from px/s² to m/s² — convert a legacy slot's big number down
    if (typeof out.gravity === 'number' && out.gravity > 45) out.gravity = out.gravity / 143
    return out
  } catch {
    return null
  }
}

function initialViewport(): string {
  if (typeof window === 'undefined') return 'full'
  const vp = new URLSearchParams(window.location.search).get('vp')?.toLowerCase() ?? ''
  return vp === 'phone' || vp === 'tablet' || vp === 'full' ? vp : 'full'
}

export function RainBench() {
  const [nonce, setNonce] = useState(0)
  const [dump, setDump] = useState(0)

  const stage = useControls('Stage', {
    viewport: { value: initialViewport(), options: ['phone', 'tablet', 'full'] },
    background: { value: 'dark', options: ['dark', 'light', 'ember'] },
    paused: false,
  })

  const [v, set] = useControls('Rain', () => ({
    emission: folder({
      mode: { value: D.mode, options: ['burst', 'stream'] },
      count: { value: D.count, min: 1, max: 400, step: 1, label: 'count / pool' },
      burstWindow: { value: D.burstWindow, min: 0, max: 4, step: 0.05, label: 'burst window (s)' },
      spawnRate: { value: D.spawnRate, min: 1, max: 200, step: 1, label: 'stream /s' },
      streamDuration: { value: D.streamDuration, min: 0, max: 30, step: 0.5, label: 'stream secs (0=∞)' },
      spawnWidth: { value: D.spawnWidth, min: 0, max: 1, step: 0.01, label: 'spawn band' },
      spawnHeight: { value: D.spawnHeight, min: 0, max: 800, step: 10, label: 'spawn above (px)' },
    }),
    responsive: folder(
      {
        autoScale: { value: D.autoScale, label: 'scale w/ width' },
        referenceWidth: { value: D.referenceWidth, min: 320, max: 1920, step: 10, label: 'ref width (px)' },
        countScale: { value: D.countScale, min: 0, max: 1, step: 0.05, label: 'count vs width' },
        sizeScale: { value: D.sizeScale, min: 0, max: 1, step: 0.05, label: 'size vs width' },
        minScale: { value: D.minScale, min: 0.1, max: 1, step: 0.05, label: 'clamp min' },
        maxScale: { value: D.maxScale, min: 1, max: 4, step: 0.1, label: 'clamp max' },
      },
      { collapsed: true },
    ),
    physics: folder({
      gravity: { value: D.gravity, min: 0, max: 40, step: 0.1, label: 'gravity (m/s²)' },
      velocityYMin: { value: D.velocityYMin, min: 0, max: 1500, step: 10, label: 'start vy min' },
      velocityYMax: { value: D.velocityYMax, min: 0, max: 2000, step: 10, label: 'start vy max' },
      velocityXSpread: { value: D.velocityXSpread, min: 0, max: 800, step: 10, label: 'start vx ±' },
      airDrag: { value: D.airDrag, min: 0, max: 4, step: 0.05, label: 'air drag' },
      terminalVelocity: { value: D.terminalVelocity, min: 0, max: 3000, step: 20, label: 'terminal vel' },
      wind: { value: D.wind, min: -2000, max: 2000, step: 20, label: 'wind' },
      sway: folder(
        {
          swayAmplitude: { value: D.swayAmplitude, min: 0, max: 120, step: 1, label: 'amplitude (px)' },
          swayFrequency: { value: D.swayFrequency, min: 0, max: 6, step: 0.05, label: 'frequency (Hz)' },
        },
        { collapsed: true },
      ),
      spin: folder(
        {
          spinMin: { value: D.spinMin, min: 0, max: 720, step: 5, label: 'spawn min °/s' },
          spinMax: { value: D.spinMax, min: 0, max: 1440, step: 5, label: 'spawn max °/s' },
          spinDrag: { value: D.spinDrag, min: 0, max: 4, step: 0.05, label: 'drag' },
          airborneSpin: { value: D.airborneSpin, options: ['keep', 'killOnContact', 'off'], label: 'airborne' },
          contactSpin: { value: D.contactSpin, min: 0, max: 1, step: 0.02, label: 'from contacts' },
        },
        { collapsed: true },
      ),
    }),
    floor: folder({
      floor: { value: D.floor, options: ['fallThrough', 'bounce'] },
      floorInset: { value: D.floorInset, min: -300, max: 400, step: 2, label: 'inset (px, −=below)' },
      restitution: { value: D.restitution, min: 0, max: 1, step: 0.01, label: 'bounce' },
      floorFriction: { value: D.floorFriction, min: 0, max: 1, step: 0.01, label: 'friction' },
      restThreshold: { value: D.restThreshold, min: 5, max: 400, step: 5, label: 'settle < px/s' },
      fadeOut: { value: D.fadeOut, min: 0, max: 2, step: 0.05, label: 'fade-out (s)' },
      dumpStagger: { value: D.dumpStagger, min: 0, max: 0.6, step: 0.01, label: 'dump stagger (s)' },
    }),
    walls: folder(
      {
        walls: { value: D.walls, label: 'side colliders' },
        wallInset: { value: D.wallInset, min: -200, max: 300, step: 2, label: 'inset (px, −=outside)' },
        wallRestitution: { value: D.wallRestitution, min: 0, max: 1, step: 0.01, label: 'bounce' },
        wallFriction: { value: D.wallFriction, min: 0, max: 1, step: 0.01, label: 'friction' },
      },
      { collapsed: true },
    ),
    collision: folder({
      collide: { value: D.collide, label: 'collide + stack' },
      collideRadius: { value: D.collideRadius, min: 0.2, max: 1.2, step: 0.02, label: 'hit radius' },
      collideRestitution: { value: D.collideRestitution, min: 0, max: 1, step: 0.02, label: 'bounce' },
      collideFriction: { value: D.collideFriction, min: 0, max: 1, step: 0.02, label: 'bar grip' },
      pileFriction: { value: D.pileFriction, min: 0, max: 1, step: 0.02, label: 'pile friction' },
      collideIterations: { value: D.collideIterations, min: 1, max: 6, step: 1, label: 'iterations' },
      collideWake: { value: D.collideWake, min: 0, max: 1200, step: 20, label: 'wake px/s (0=off)' },
    }),
    appearance: folder(
      {
        asset: { value: D.asset, options: ['both', 'gbar', 'tinyBar'] },
        particleSize: { value: D.particleSize, min: 8, max: 160, step: 1, label: 'size (px)' },
        scaleMin: { value: D.scaleMin, min: 0.1, max: 2, step: 0.05, label: 'scale min' },
        scaleMax: { value: D.scaleMax, min: 0.1, max: 3, step: 0.05, label: 'scale max' },
        bigFallFaster: { value: D.bigFallFaster, min: 0, max: 1, step: 0.05, label: 'big=faster' },
        fadeIn: { value: D.fadeIn, min: 0, max: 1, step: 0.02, label: 'fade in (s)' },
        opacity: { value: D.opacity, min: 0, max: 1, step: 0.02, label: 'opacity' },
      },
      { collapsed: true },
    ),
  }))

  // On mount, restore an in-progress tune saved with "★ save settings" (if any).
  const restored = useRef(false)
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const saved = savedSettings()
    if (saved) {
      set(saved as unknown as Parameters<typeof set>[0])
      setNonce((k) => k + 1)
    }
  }, [set])

  // Leva flattens folder values, so the panel is 1:1 with the flat config —
  // pull every key straight through by name.
  const values = v as unknown as Record<string, string | number | boolean>
  const config = Object.fromEntries(
    Object.keys(D).map((k) => [k, values[k]]),
  ) as unknown as ParticleRainConfig

  const loop = buildParticleLoopSpec(config)
  const json = buildParticleJsonSpec(config)
  const copy = useLiveCopy({ loop, json, config: stringifyConfig(config) })

  // Leva `button` freezes its closure — route the save through a live ref.
  const liveConfig = useRef(config)
  liveConfig.current = config

  useControls('Export', {
    '★ save settings': button(() => {
      try {
        localStorage.setItem(SLOT_KEY, JSON.stringify(liveConfig.current))
      } catch {
        /* storage blocked — nothing to do */
      }
    }),
    'reset to code default': button(() => {
      try {
        localStorage.removeItem(SLOT_KEY)
      } catch {
        /* ignore */
      }
      set(flatDefaults() as unknown as Parameters<typeof set>[0])
      setNonce((k) => k + 1)
    }),
    'drop again': button(() => setNonce((k) => k + 1)),
    '⤓ pull the floor out (clear screen)': button(() => setDump((d) => d + 1)),
    'copy canvas loop': button(copy('loop')),
    'copy JSON tokens': button(copy('json')),
    'copy config (for defaults)': button(copy('config')),
  })

  // Physics / floor / appearance update live via a ref inside the component.
  // Emission + anything that changes the drop-time particle count (viewport
  // frame, responsive scaling) re-drops the whole system; so does the button.
  const runKey = [
    nonce,
    config.mode,
    config.count,
    config.burstWindow,
    config.spawnRate,
    config.streamDuration,
    stage.viewport,
    config.autoScale,
    config.referenceWidth,
    config.countScale,
    config.minScale,
    config.maxScale,
  ].join('|')

  const frameWidth =
    stage.viewport === 'phone' ? '390px' : stage.viewport === 'tablet' ? '720px' : 'min(1100px, 100%)'

  return (
    <>
      <div className='stage' data-bg={stage.background}>
        <button type='button' className='stage-replay' onClick={() => setNonce((k) => k + 1)}>
          ↻ Drop again
        </button>
        <button
          type='button'
          className='stage-replay stage-replay--alt'
          onClick={() => setDump((d) => d + 1)}
        >
          ⤓ Pull the floor out
        </button>
        <div className='rain-stage-inner'>
          <div className='rain-frame' style={{ width: frameWidth }} data-viewport={stage.viewport}>
            <ParticleRain
              key={runKey}
              config={config}
              paused={stage.paused}
              runKey={runKey}
              dumpSignal={dump}
            />
          </div>
        </div>
      </div>

      <div className='dock'>
        <SpecCard title='Canvas loop (drop-in, no deps)' text={loop} />
        <SpecCard title='JSON physics tokens' text={json} />
      </div>
    </>
  )
}
