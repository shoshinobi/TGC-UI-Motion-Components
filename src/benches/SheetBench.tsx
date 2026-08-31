import { useState } from 'react'
import { useControls, folder, button } from 'leva'
import {
  FeedbackSheet,
  SHEET_DEFAULT_CONFIG,
  SHEET_LAYER_KEYS,
  type SheetLayerAnim,
  type SheetLayerKey,
  type SheetMotionConfig,
} from '@/components/FeedbackSheet'
import { buildSheetJsxSpec, buildSheetJsonSpec } from '@/lib/buildSheetSpec'
import { SpecCard, stringifyConfig, useLiveCopy } from '@/components/SpecCard'

const EASE_OPTIONS = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'circOut', 'backOut', 'anticipate']

const LAYER_LABEL: Record<SheetLayerKey, string> = {
  sheet: 'sheet',
  gradient: 'gradient',
  icon: 'icon',
  heading: 'heading',
  body: 'body',
  button: 'button',
}

const PROPS = [
  'type', 'fromOpacity', 'fromY', 'fromScale', 'delay', 'startAfterAll',
  'duration', 'ease', 'stiffness', 'damping', 'mass',
  'shakeDeg', 'shakeX', 'shakeCount', 'shakeDuration', 'shakeDecay',
] as const

/** Flat Leva schema keys → per-layer config. */
const k = (key: SheetLayerKey, prop: string) => `${key}__${prop}`

function flatDefaults() {
  const out: Record<string, number | string | boolean> = {}
  for (const key of SHEET_LAYER_KEYS) {
    const d = SHEET_DEFAULT_CONFIG[key]
    for (const p of PROPS) {
      out[k(key, p)] = p === 'ease' ? (typeof d.ease === 'string' ? d.ease : 'easeOut') : (d[p] as number | string | boolean)
    }
  }
  return out
}

function layerFolder(key: SheetLayerKey) {
  const d = SHEET_DEFAULT_CONFIG[key]
  const isSheet = key === 'sheet'
  return folder(
    {
      [k(key, 'type')]: { value: d.type, options: ['tween', 'spring'], label: 'type' },
      [k(key, 'fromOpacity')]: { value: d.fromOpacity, min: 0, max: 1, step: 0.05, label: 'from opac.' },
      [k(key, 'fromY')]: {
        value: d.fromY,
        min: isSheet ? 0 : -120,
        max: isSheet ? 150 : 120,
        step: 1,
        label: isSheet ? 'from Y %' : 'from Y px',
      },
      [k(key, 'fromScale')]: {
        value: d.fromScale,
        min: 0,
        max: key === 'icon' ? 12 : 6,
        step: 0.05,
        label: 'from scale',
      },
      [k(key, 'delay')]: { value: d.delay, min: 0, max: 1.5, step: 0.01, label: 'delay' },
      [k(key, 'startAfterAll')]: { value: d.startAfterAll, label: 'wait for all' },

      spring: folder(
        {
          [k(key, 'stiffness')]: { value: d.stiffness, min: 10, max: 1000, step: 5, label: 'stiffness' },
          [k(key, 'damping')]: { value: d.damping, min: 1, max: 60, step: 1, label: 'damping' },
          [k(key, 'mass')]: { value: d.mass, min: 0.2, max: 4, step: 0.1, label: 'mass' },
        },
        { collapsed: true },
      ),
      tween: folder(
        {
          [k(key, 'duration')]: { value: d.duration, min: 0.05, max: 2, step: 0.05, label: 'duration' },
          [k(key, 'ease')]: {
            value: typeof d.ease === 'string' ? d.ease : 'easeOut',
            options: EASE_OPTIONS,
            label: 'ease',
          },
        },
        { collapsed: true },
      ),
      shake: folder(
        {
          [k(key, 'shakeDeg')]: { value: d.shakeDeg, min: 0, max: 90, step: 1, label: 'rotate °' },
          [k(key, 'shakeX')]: { value: d.shakeX, min: 0, max: 60, step: 1, label: 'shift px' },
          [k(key, 'shakeCount')]: { value: d.shakeCount, min: 2, max: 16, step: 1, label: 'swings' },
          [k(key, 'shakeDuration')]: { value: d.shakeDuration, min: 0.1, max: 1.5, step: 0.05, label: 'duration' },
          [k(key, 'shakeDecay')]: { value: d.shakeDecay, min: 0.15, max: 1, step: 0.05, label: 'decay' },
        },
        { collapsed: key !== 'icon' },
      ),
    },
    { collapsed: key !== 'sheet' && key !== 'icon' },
  )
}

export function SheetBench() {
  const [nonce, setNonce] = useState(0)

  const stage = useControls('Stage', {
    viewport: { value: 'phone', options: ['phone', 'tablet', 'full'] },
    scrim: true,
    paused: false,
  })

  const [v, set] = useControls('Layers', () => {
    const schema: Record<string, ReturnType<typeof layerFolder>> = {}
    for (const key of SHEET_LAYER_KEYS) schema[LAYER_LABEL[key]] = layerFolder(key)
    return schema
  })

  // Leva flattens folder contents to their leaf keys at runtime; its types don't
  // model that for a dynamically-built schema, so read through `unknown`.
  const values = v as unknown as Record<string, string | number | boolean>

  const numAt = (key: SheetLayerKey, p: string) => values[k(key, p)] as number

  const config = SHEET_LAYER_KEYS.reduce((acc, key) => {
    acc[key] = {
      type: values[k(key, 'type')] as SheetLayerAnim['type'],
      fromOpacity: numAt(key, 'fromOpacity'),
      fromY: numAt(key, 'fromY'),
      fromScale: numAt(key, 'fromScale'),
      delay: numAt(key, 'delay'),
      startAfterAll: values[k(key, 'startAfterAll')] as boolean,
      duration: numAt(key, 'duration'),
      ease: values[k(key, 'ease')] as SheetLayerAnim['ease'],
      stiffness: numAt(key, 'stiffness'),
      damping: numAt(key, 'damping'),
      mass: numAt(key, 'mass'),
      shakeDeg: numAt(key, 'shakeDeg'),
      shakeX: numAt(key, 'shakeX'),
      shakeCount: numAt(key, 'shakeCount'),
      shakeDuration: numAt(key, 'shakeDuration'),
      shakeDecay: numAt(key, 'shakeDecay'),
    }
    return acc
  }, {} as SheetMotionConfig)

  const jsx = buildSheetJsxSpec(config)
  const json = buildSheetJsonSpec(config)
  const copy = useLiveCopy({ jsx, json, config: stringifyConfig(config) })

  useControls('Export', {
    'reset defaults': button(() => {
      set(flatDefaults() as unknown as Parameters<typeof set>[0])
      setNonce((n) => n + 1)
    }),
    'replay animation': button(() => setNonce((n) => n + 1)),
    'copy Framer Motion': button(copy('jsx')),
    'copy JSON tokens': button(copy('json')),
    'copy config (for defaults)': button(copy('config')),
  })

  const frameWidth = stage.viewport === 'phone' ? '390px' : stage.viewport === 'tablet' ? '720px' : 'min(1100px, 100%)'
  const animKey = `${nonce}-${JSON.stringify(config)}`

  return (
    <>
      <div className='stage' data-bg='dark'>
        <button type='button' className='stage-replay' onClick={() => setNonce((n) => n + 1)}>
          ↻ Replay
        </button>
        <div className='fsheet-stage-inner'>
          <div className='fsheet-frame' style={{ width: frameWidth }}>
            <FeedbackSheet key={animKey} motionConfig={config} paused={stage.paused} showScrim={stage.scrim} />
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
