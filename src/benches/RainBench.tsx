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
      count: { value: D.count, min: 1, max: 400, step: 1, label: 'count / pool (@ ref width)' },
      burstWindow: { value: D.burstWindow, min: 0, max: 4, step: 0.05, label: 'burst window (s)' },
      spawnRate: { value: D.spawnRate, min: 1, max: 200, step: 1, label: 'stream rate (/s)' },
      streamDuration: { value: D.streamDuration, min: 0, max: 30, step: 0.5, label: 'stream length (s, 0=∞)' },
      spawnWidth: { value: D.spawnWidth, min: 0, max: 1, step: 0.01, label: 'spawn band (× width)' },
      spawnHeight: { value: D.spawnHeight, min: 0, max: 800, step: 10, label: 'spawn height (px above)' },
    }),
    responsive: folder({
      autoScale: { value: D.autoScale, label: 'scale with width' },
      referenceWidth: { value: D.referenceWidth, min: 320, max: 1920, step: 10, label: 'reference width (px)' },
      countScale: { value: D.countScale, min: 0, max: 1, step: 0.05, label: 'count tracks width' },
      sizeScale: { value: D.sizeScale, min: 0, max: 1, step: 0.05, label: 'size tracks width' },
      minScale: { value: D.minScale, min: 0.1, max: 1, step: 0.05, label: 'scale clamp min' },
      maxScale: { value: D.maxScale, min: 1, max: 4, step: 0.1, label: 'scale clamp max' },
    }),
    physics: folder({
      gravity: { value: D.gravity, min: 0, max: 5000, step: 20, label: 'gravity (px/s²)' },
      velocityYMin: { value: D.velocityYMin, min: 0, max: 1500, step: 10, label: 'start vy min' },
      velocityYMax: { value: D.velocityYMax, min: 0, max: 2000, step: 10, label: 'start vy max' },
      velocityXSpread: { value: D.velocityXSpread, min: 0, max: 800, step: 10, label: 'start vx spread (±)' },
      airDrag: { value: D.airDrag, min: 0, max: 4, step: 0.05, label: 'air drag (1/s)' },
      terminalVelocity: { value: D.terminalVelocity, min: 0, max: 3000, step: 20, label: 'terminal vel (0=none)' },
      wind: { value: D.wind, min: -2000, max: 2000, step: 20, label: 'wind (px/s²)' },
      sway: folder(
        {
          swayAmplitude: { value: D.swayAmplitude, min: 0, max: 120, step: 1, label: 'amplitude (px)' },
          swayFrequency: { value: D.swayFrequency, min: 0, max: 6, step: 0.05, label: 'frequency (Hz)' },
        },
        { collapsed: true },
      ),
      spin: folder(
        {
          spinMin: { value: D.spinMin, min: 0, max: 720, step: 5, label: 'spawn spin min (°/s)' },
          spinMax: { value: D.spinMax, min: 0, max: 1440, step: 5, label: 'spawn spin max (°/s)' },
          spinDrag: { value: D.spinDrag, min: 0, max: 4, step: 0.05, label: 'spin drag (1/s)' },
          airborneSpin: { value: D.airborneSpin, options: ['keep', 'killOnContact', 'off'], label: 'airborne spin' },
          contactSpin: { value: D.contactSpin, min: 0, max: 1, step: 0.02, label: '↳ tumble from contacts' },
        },
        { collapsed: true },
      ),
    }),
    floor: folder({
      floor: { value: D.floor, options: ['fallThrough', 'bounce'] },
      floorInset: { value: D.floorInset, min: -300, max: 400, step: 2, label: 'floor inset (px, − = below edge)' },
      restitution: { value: D.restitution, min: 0, max: 1, step: 0.01, label: '↳ bounce restitution' },
      floorFriction: { value: D.floorFriction, min: 0, max: 1, step: 0.01, label: '↳ bounce friction' },
      restThreshold: { value: D.restThreshold, min: 5, max: 400, step: 5, label: '↳ settle below (px/s)' },
      fadeOut: { value: D.fadeOut, min: 0, max: 2, step: 0.05, label: '↳ fallThrough fade-out (s)' },
      dumpStagger: { value: D.dumpStagger, min: 0, max: 0.6, step: 0.01, label: 'dump cascade delay (s)' },
    }),
    collision: folder({
      collide: { value: D.collide, label: 'particles collide + stack' },
      collideRadius: { value: D.collideRadius, min: 0.2, max: 1.2, step: 0.02, label: 'hit radius (× half-size)' },
      collideRestitution: { value: D.collideRestitution, min: 0, max: 1, step: 0.02, label: 'bounciness' },
      collideFriction: { value: D.collideFriction, min: 0, max: 1, step: 0.02, label: 'grip between bars' },
      pileFriction: { value: D.pileFriction, min: 0, max: 1, step: 0.02, label: 'pile friction (lock ↑)' },
      collideIterations: { value: D.collideIterations, min: 1, max: 6, step: 1, label: 'solver iterations' },
      collideWake: { value: D.collideWake, min: 0, max: 1200, step: 20, label: 'wake on hit (px/s, 0=never)' },
    }),
    appearance: folder({
      asset: { value: D.asset, options: ['both', 'gbar', 'tinyBar'] },
      particleSize: { value: D.particleSize, min: 8, max: 160, step: 1, label: 'size (px)' },
      scaleMin: { value: D.scaleMin, min: 0.1, max: 2, step: 0.05, label: 'scale min' },
      scaleMax: { value: D.scaleMax, min: 0.1, max: 3, step: 0.05, label: 'scale max' },
      bigFallFaster: { value: D.bigFallFaster, min: 0, max: 1, step: 0.05, label: 'big = faster' },
      fadeIn: { value: D.fadeIn, min: 0, max: 1, step: 0.02, label: 'fade in (s)' },
      opacity: { value: D.opacity, min: 0, max: 1, step: 0.02, label: 'opacity' },
    }),
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

  const values = v as unknown as Record<string, string | number | boolean>

  const config: ParticleRainConfig = {
    mode: values.mode as ParticleRainConfig['mode'],
    count: values.count as number,
    burstWindow: values.burstWindow as number,
    spawnRate: values.spawnRate as number,
    streamDuration: values.streamDuration as number,
    spawnWidth: values.spawnWidth as number,
    spawnHeight: values.spawnHeight as number,
    gravity: values.gravity as number,
    velocityYMin: values.velocityYMin as number,
    velocityYMax: values.velocityYMax as number,
    velocityXSpread: values.velocityXSpread as number,
    airDrag: values.airDrag as number,
    terminalVelocity: values.terminalVelocity as number,
    wind: values.wind as number,
    swayAmplitude: values.swayAmplitude as number,
    swayFrequency: values.swayFrequency as number,
    spinMin: values.spinMin as number,
    spinMax: values.spinMax as number,
    spinDrag: values.spinDrag as number,
    airborneSpin: values.airborneSpin as ParticleRainConfig['airborneSpin'],
    contactSpin: values.contactSpin as number,
    floor: values.floor as ParticleRainConfig['floor'],
    floorInset: values.floorInset as number,
    restitution: values.restitution as number,
    floorFriction: values.floorFriction as number,
    restThreshold: values.restThreshold as number,
    fadeOut: values.fadeOut as number,
    dumpStagger: values.dumpStagger as number,
    collide: values.collide as boolean,
    collideRadius: values.collideRadius as number,
    collideRestitution: values.collideRestitution as number,
    collideFriction: values.collideFriction as number,
    pileFriction: values.pileFriction as number,
    collideIterations: values.collideIterations as number,
    collideWake: values.collideWake as number,
    asset: values.asset as ParticleRainConfig['asset'],
    particleSize: values.particleSize as number,
    scaleMin: values.scaleMin as number,
    scaleMax: values.scaleMax as number,
    bigFallFaster: values.bigFallFaster as number,
    fadeIn: values.fadeIn as number,
    opacity: values.opacity as number,
    autoScale: values.autoScale as boolean,
    referenceWidth: values.referenceWidth as number,
    countScale: values.countScale as number,
    sizeScale: values.sizeScale as number,
    minScale: values.minScale as number,
    maxScale: values.maxScale as number,
  }

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
