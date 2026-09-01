import { useEffect, useRef, useState } from 'react'
import { useControls, folder, button } from 'leva'
import {
  BannerStack,
  BANNER_CONFIG_FULL,
  BANNER_CONFIG_PHONE,
  BANNER_CONFIG_TABLET,
  BANNER_DEFAULT_CONFIG,
  type BannerSample,
  type BannerStackMotionConfig,
} from '@/components/BannerStack'
import { buildBannerJsxSpec, buildBannerJsonSpec } from '@/lib/buildBannerSpec'
import { SpecCard, stringifyConfig, useLiveCopy } from '@/components/SpecCard'

const EASE = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'circIn', 'circOut', 'backIn', 'backOut', 'anticipate']
const ORIGIN = ['center', 'bottom right', 'bottom left', 'bottom center', 'top right']

const D = BANNER_DEFAULT_CONFIG

const SAMPLE_BANNERS: BannerSample[] = [
  { title: 'Weekly streak', subtitle: '7 days strong', ctaLabel: 'Keep going', imageUrl: '🔥', tint: '#3a2a12', subtitleColor: '#e0b678' },
  { title: 'New quest', subtitle: 'The Iron Vault', ctaLabel: 'Start', imageUrl: '⚔️', tint: '#12233a', subtitleColor: '#8fb7d6' },
  { title: 'Reward ready', subtitle: '2,400 gold', ctaLabel: 'Claim', imageUrl: '🪙', tint: '#2a1533', subtitleColor: '#d6a8e0' },
]

type Viewport = 'phone' | 'tablet' | 'full'
type FlatConfig = Record<string, number | string | boolean>

function strEase(e: BannerStackMotionConfig['shuffleEase']): string {
  return typeof e === 'string' ? e : 'easeOut'
}

/** A config object → the flat leaf-key record Leva's `set` wants. */
function flatten(cfg: BannerStackMotionConfig): FlatConfig {
  const out: FlatConfig = {}
  for (const [k, val] of Object.entries(cfg)) out[k] = Array.isArray(val) ? 'easeOut' : (val as number | string | boolean)
  return out
}

/** The approved config per viewport — all three signed off 2026-09-01. */
const VIEWPORT_CODE_CONFIG: Record<Viewport, BannerStackMotionConfig> = {
  phone: BANNER_CONFIG_PHONE,
  tablet: BANNER_CONFIG_TABLET,
  full: BANNER_CONFIG_FULL,
}

const slotKey = (vp: Viewport) => `tgc-bench:banner:${vp}`

/** The approved config for a viewport: a "save as approved" localStorage slot wins, else the code config. */
function approvedFor(vp: Viewport): FlatConfig {
  try {
    const raw = localStorage.getItem(slotKey(vp))
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, unknown>
      const base = flatten(VIEWPORT_CODE_CONFIG[vp])
      for (const k of Object.keys(base)) if (k in obj) base[k] = obj[k] as number | string | boolean
      return base
    }
  } catch {
    /* fall through */
  }
  return flatten(VIEWPORT_CODE_CONFIG[vp])
}

export function BannerBench() {
  const [nonce, setNonce] = useState(0)
  const [advance, setAdvance] = useState(0)

  const stage = useControls('Stage', {
    viewport: { value: 'phone', options: ['phone', 'tablet', 'full'] },
    background: { value: 'dark', options: ['dark', 'light', 'ember'] },
    paused: false,
  })

  const [v, set] = useControls('BannerStack', () => ({
    'drag / release': folder({
      swipeOffsetPx: { value: D.swipeOffsetPx, min: 4, max: 320, step: 2, label: 'commit distance (px)' },
      swipeVelocity: { value: D.swipeVelocity, min: 50, max: 2000, step: 25, label: 'flick velocity (px/s)' },
      snapBackStiffness: { value: D.snapBackStiffness, min: 50, max: 1200, step: 10, label: 'snap-back stiffness' },
      snapBackDamping: { value: D.snapBackDamping, min: 4, max: 80, step: 1, label: 'snap-back damping' },
    }),
    'fly-out (on release)': folder({
      flyOutDistance: { value: D.flyOutDistance, min: 20, max: 1000, step: 5, label: 'distance out (px)' },
      directionAware: { value: D.directionAware, label: 'toward swipe direction' },
      flyOutRotate: { value: D.flyOutRotate, min: -30, max: 30, step: 1, label: 'rotate out (°, × dir)' },
      flyOutDuration: { value: D.flyOutDuration, min: 0.05, max: 1.2, step: 0.02, label: 'duration out (s)' },
      flyOutEase: { value: strEase(D.flyOutEase), options: EASE, label: 'ease out' },
    }),
    'stack fan-out': folder({
      stackCount: { value: D.stackCount, min: 2, max: 5, step: 1, label: 'visible cards' },
      stackGapX: { value: D.stackGapX, min: 0, max: 120, step: 2, label: 'gap X — right edge (px)' },
      stackGapY: { value: D.stackGapY, min: -60, max: 60, step: 2, label: 'gap Y (px)' },
      stackScaleStep: { value: D.stackScaleStep, min: 0, max: 0.2, step: 0.005, label: 'scale − per step' },
      stackOpacityStep: { value: D.stackOpacityStep, min: 0, max: 1, step: 0.05, label: 'opacity − per step' },
      stackRotateStep: { value: D.stackRotateStep, min: -12, max: 12, step: 0.5, label: 'fan rotate per step (°)' },
      stackDarken: { value: D.stackDarken, min: 0, max: 1, step: 0.05, label: 'darken cards behind' },
    }),
    border: folder({
      borderColor: { value: D.borderColor, label: 'colour' },
      borderWidth: { value: D.borderWidth, min: 0, max: 10, step: 0.5, label: 'width (px)' },
    }),
    'shuffle': folder({
      shuffleType: { value: D.shuffleType, options: ['tween', 'spring'] },
      shuffleTween: folder(
        {
          shuffleDuration: { value: D.shuffleDuration, min: 0.05, max: 2, step: 0.02, label: 'duration (s)' },
          shuffleEase: { value: strEase(D.shuffleEase), options: EASE, label: 'ease' },
        },
        { collapsed: false },
      ),
      shuffleSpring: folder(
        {
          shuffleStiffness: { value: D.shuffleStiffness, min: 20, max: 1200, step: 10, label: 'stiffness' },
          shuffleDamping: { value: D.shuffleDamping, min: 1, max: 80, step: 1, label: 'damping' },
          shuffleMass: { value: D.shuffleMass, min: 0.2, max: 5, step: 0.1, label: 'mass' },
        },
        { collapsed: true },
      ),
    }),
    'CTA button': folder({
      ctaAnimate: { value: D.ctaAnimate, label: 'scale in (front card only)' },
      ctaDelay: { value: D.ctaDelay, min: 0, max: 2, step: 0.02, label: 'delay (s)' },
      ctaFromScale: { value: D.ctaFromScale, min: 0, max: 1.5, step: 0.05, label: 'from scale' },
      ctaFromOpacity: { value: D.ctaFromOpacity, min: 0, max: 1, step: 0.05, label: 'from opacity' },
      ctaOrigin: { value: D.ctaOrigin, options: ORIGIN, label: 'transform origin' },
      ctaType: { value: D.ctaType, options: ['spring', 'tween'] },
      ctaTween: folder(
        {
          ctaDuration: { value: D.ctaDuration, min: 0.05, max: 2, step: 0.05, label: 'duration (s)' },
          ctaEase: { value: strEase(D.ctaEase), options: EASE, label: 'ease' },
        },
        { collapsed: true },
      ),
      ctaSpring: folder(
        {
          ctaStiffness: { value: D.ctaStiffness, min: 20, max: 1200, step: 10, label: 'stiffness (↑ snappier)' },
          ctaDamping: { value: D.ctaDamping, min: 1, max: 60, step: 1, label: 'damping (↓ more elastic)' },
          ctaMass: { value: D.ctaMass, min: 0.2, max: 5, step: 0.1, label: 'mass' },
        },
        { collapsed: false },
      ),
    }),
  }))

  const values = v as unknown as Record<string, number | string | boolean>
  const config = Object.fromEntries(Object.keys(D).map((k) => [k, values[k]])) as unknown as BannerStackMotionConfig

  const viewport = stage.viewport as Viewport

  // Switching the viewport loads that viewport's approved config into the panel.
  // (Unsaved tweaks for the viewport you leave are discarded — use "save as
  // approved" first.) Also runs once on mount.
  const loadedFor = useRef<Viewport | null>(null)
  useEffect(() => {
    if (loadedFor.current === viewport) return
    loadedFor.current = viewport
    set(approvedFor(viewport) as unknown as Parameters<typeof set>[0])
    setNonce((k) => k + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport])

  const jsx = buildBannerJsxSpec(config)
  const json = buildBannerJsonSpec(config)
  const copy = useLiveCopy({ jsx, json, config: stringifyConfig(config) })

  // Buttons freeze their closures — route through a ref that's fresh each render.
  const live = useRef({ config, viewport })
  live.current = { config, viewport }

  useControls('Export', {
    'next banner ▸': button(() => setAdvance((a) => a + 1)),
    '★ save as approved (this viewport)': button(() => {
      const { config, viewport } = live.current
      try {
        localStorage.setItem(slotKey(viewport), JSON.stringify(config))
      } catch {
        /* blocked — fine */
      }
    }),
    'reset this viewport to code default': button(() => {
      const { viewport } = live.current
      try {
        localStorage.removeItem(slotKey(viewport))
      } catch {
        /* ignore */
      }
      set(flatten(VIEWPORT_CODE_CONFIG[viewport]) as unknown as Parameters<typeof set>[0])
      setNonce((k) => k + 1)
    }),
    'replay (rewind to first)': button(() => setNonce((k) => k + 1)),
    'copy Framer Motion': button(copy('jsx')),
    'copy JSON tokens': button(copy('json')),
    'copy config (for defaults)': button(copy('config')),
  })

  const frameWidth = stage.viewport === 'phone' ? '390px' : stage.viewport === 'tablet' ? '640px' : 'min(880px, 100%)'
  const animKey = `${nonce}-${JSON.stringify(config)}`

  return (
    <>
      <div className='stage' data-bg={stage.background}>
        <button type='button' className='stage-replay' onClick={() => setNonce((k) => k + 1)}>
          ↻ Replay
        </button>
        <button type='button' className='stage-replay stage-replay--alt' onClick={() => setAdvance((a) => a + 1)}>
          Next ▸
        </button>
        <div className='banner-stage-inner'>
          <div className='banner-frame' style={{ width: frameWidth }}>
            <BannerStack
              key={animKey}
              banners={SAMPLE_BANNERS}
              motionConfig={config}
              paused={stage.paused}
              advanceSignal={advance}
            />
          </div>
        </div>
      </div>

      <div className='dock'>
        <SpecCard title='Framer Motion (motion/react)' text={jsx} />
        <SpecCard title='JSON motion tokens' text={json} />
      </div>
    </>
  )
}
