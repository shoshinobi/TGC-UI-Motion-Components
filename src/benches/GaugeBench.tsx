import { useState } from 'react'
import { useControls, folder, button } from 'leva'
import { Gauge, GAUGE_DEFAULT_CONFIG, type GaugeMotionConfig } from '@/components/Gauge'
import { buildGaugeJsxSpec, buildGaugeJsonSpec } from '@/lib/buildGaugeSpec'
import { SpecCard, copyText } from '@/components/SpecCard'

const EASE_OPTIONS = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'circIn', 'circOut', 'backIn', 'backOut', 'anticipate']
const RAMP_EASE_OPTIONS = ['linear', 'easeIn', 'circIn', 'backIn']

const D = GAUGE_DEFAULT_CONFIG

function flatDefaults() {
  return {
    value: D.value,
    min: D.min,
    max: D.max,
    format: D.format,
    countUp: D.countUp,
    countUpDelay: D.countUpDelay,
    countUpEase: typeof D.countUpEase === 'string' ? D.countUpEase : 'easeOut',
    delay: D.delay,
    type: D.type,
    stiffness: D.stiffness,
    damping: D.damping,
    mass: D.mass,
    duration: D.duration,
    ease: typeof D.ease === 'string' ? D.ease : 'easeOut',
    rampDuration: D.rampDuration,
    rampEase: typeof D.rampEase === 'string' ? D.rampEase : 'easeIn',
    rampTo: D.rampTo,
    flash: D.flash,
    flashColor: D.flashColor,
    flashBlur: D.flashBlur,
    flashSpread: D.flashSpread,
    flashIntensity: D.flashIntensity,
    flashDuration: D.flashDuration,
    flashOffset: D.flashOffset,
    flashPulses: D.flashPulses,
    fillTop: D.fillTop,
    fillBottom: D.fillBottom,
    gradientStop: D.gradientStop,
    trackWidth: D.trackWidth,
    trackHeight: D.trackHeight,
    showPointer: D.showPointer,
    showMinLabel: D.showMinLabel,
  }
}

export function GaugeBench() {
  const [nonce, setNonce] = useState(0)

  const stage = useControls('Stage', {
    background: { value: 'dark', options: ['dark', 'light', 'ember'] },
    paused: false,
  })

  const [v, set] = useControls('Gauge', () => ({
    reading: folder({
      value: { value: D.value, step: 25 },
      min: { value: D.min, step: 100 },
      max: { value: D.max, step: 100 },
      format: { value: D.format, options: ['compact', 'full', 'raw'] },
      countUp: { value: D.countUp, label: 'count up' },
      countUpDelay: { value: D.countUpDelay, min: 0, max: 5, step: 0.05, label: '↳ hold past settle (s)' },
      countUpEase: {
        value: typeof D.countUpEase === 'string' ? D.countUpEase : 'easeOut',
        options: EASE_OPTIONS,
        label: '↳ ease in to final',
      },
    }),
    enter: folder({
      delay: { value: D.delay, min: 0, max: 2, step: 0.02, label: 'delay (s)' },
      type: { value: D.type, options: ['spring', 'tween', 'ramp'] },
      ramp: folder(
        {
          rampDuration: { value: D.rampDuration, min: 0.1, max: 10, step: 0.05, label: 'build-up (s)' },
          rampEase: {
            value: typeof D.rampEase === 'string' ? D.rampEase : 'easeIn',
            options: RAMP_EASE_OPTIONS,
            label: 'build-up ease',
          },
          rampTo: { value: D.rampTo, min: 0.1, max: 1, step: 0.02, label: 'hand off at ×target' },
        },
        { collapsed: true },
      ),
      spring: folder(
        {
          stiffness: { value: D.stiffness, min: 10, max: 1000, step: 5 },
          damping: { value: D.damping, min: 1, max: 80, step: 1 },
          mass: { value: D.mass, min: 0.2, max: 5, step: 0.1 },
        },
        { collapsed: false },
      ),
      tween: folder(
        {
          duration: { value: D.duration, min: 0.1, max: 10, step: 0.05, label: 'duration (s)' },
          ease: { value: typeof D.ease === 'string' ? D.ease : 'easeOut', options: EASE_OPTIONS },
        },
        { collapsed: true },
      ),
    }),
    'pill flash': folder({
      flash: { value: D.flash, label: 'enabled' },
      flashOffset: { value: D.flashOffset, min: -0.6, max: 1, step: 0.02, label: 'offset vs settle (s)' },
      flashDuration: { value: D.flashDuration, min: 0.1, max: 2, step: 0.05, label: 'duration (s)' },
      flashPulses: { value: D.flashPulses, min: 1, max: 6, step: 1, label: 'pulses' },
      flashColor: { value: D.flashColor, label: 'colour' },
      flashIntensity: { value: D.flashIntensity, min: 0, max: 1, step: 0.05, label: 'intensity' },
      flashBlur: { value: D.flashBlur, min: 0, max: 60, step: 1, label: 'blur (px)' },
      flashSpread: { value: D.flashSpread, min: 0, max: 30, step: 1, label: 'spread (px)' },
    }),
    appearance: folder(
      {
        fillTop: { value: D.fillTop, label: 'fill top' },
        fillBottom: { value: D.fillBottom, label: 'fill bottom' },
        gradientStop: { value: D.gradientStop, min: 0, max: 100, step: 1, label: 'gradient stop %' },
        trackWidth: { value: D.trackWidth, min: 2, max: 60, step: 1, label: 'track width (px)' },
        trackHeight: { value: D.trackHeight, min: 120, max: 640, step: 4, label: 'track height (px)' },
        showPointer: { value: D.showPointer, label: 'pointer' },
        showMinLabel: { value: D.showMinLabel, label: 'min label' },
      },
      { collapsed: true },
    ),
  }))

  const values = v as unknown as Record<string, string | number | boolean>

  const config: GaugeMotionConfig = {
    value: values.value as number,
    min: values.min as number,
    max: values.max as number,
    format: values.format as GaugeMotionConfig['format'],
    countUp: values.countUp as boolean,
    countUpDelay: values.countUpDelay as number,
    countUpEase: values.countUpEase as GaugeMotionConfig['countUpEase'],
    delay: values.delay as number,
    type: values.type as GaugeMotionConfig['type'],
    stiffness: values.stiffness as number,
    damping: values.damping as number,
    mass: values.mass as number,
    duration: values.duration as number,
    ease: values.ease as GaugeMotionConfig['ease'],
    rampDuration: values.rampDuration as number,
    rampEase: values.rampEase as GaugeMotionConfig['rampEase'],
    rampTo: values.rampTo as number,
    flash: values.flash as boolean,
    flashColor: values.flashColor as string,
    flashBlur: values.flashBlur as number,
    flashSpread: values.flashSpread as number,
    flashIntensity: values.flashIntensity as number,
    flashDuration: values.flashDuration as number,
    flashOffset: values.flashOffset as number,
    flashPulses: values.flashPulses as number,
    fillTop: values.fillTop as string,
    fillBottom: values.fillBottom as string,
    gradientStop: values.gradientStop as number,
    trackWidth: values.trackWidth as number,
    trackHeight: values.trackHeight as number,
    showPointer: values.showPointer as boolean,
    showMinLabel: values.showMinLabel as boolean,
  }

  const jsx = buildGaugeJsxSpec(config)
  const json = buildGaugeJsonSpec(config)

  useControls('Export', {
    'reset defaults': button(() => {
      set(flatDefaults() as unknown as Parameters<typeof set>[0])
      setNonce((n) => n + 1)
    }),
    'replay animation': button(() => setNonce((n) => n + 1)),
    'copy Framer Motion': button(() => copyText(jsx)),
    'copy JSON tokens': button(() => copyText(json)),
    'copy config (for defaults)': button(() => copyText(JSON.stringify(config, null, 2))),
  })

  const animKey = `${nonce}-${JSON.stringify(config)}`

  return (
    <>
      <div className='stage' data-bg={stage.background}>
        <button type='button' className='stage-replay' onClick={() => setNonce((n) => n + 1)}>
          ↻ Replay
        </button>
        <div className='gauge-stage-inner'>
          <Gauge key={animKey} motionConfig={config} paused={stage.paused} />
        </div>
      </div>

      <div className='dock'>
        <SpecCard title='Framer Motion (motion/react)' text={jsx} />
        <SpecCard title='JSON motion tokens' text={json} />
      </div>
    </>
  )
}
