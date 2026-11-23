import { REVEAL_MUSIC_OPTIONS } from '@/components/revealMusic'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { SpecsToggle } from '@/components/SpecsToggle'
import { useControls, folder, button, LevaInputs } from 'leva'
import { GoldReveal } from '@/components/GoldReveal'
import {
  GOLD_CLOSING_LINES,
  GOLD_DEFAULT_CONFIG,
  GOLD_TEASE_LINES,
  goldPile,
  type GoldRevealConfig,
  type GoldRevealState,
} from '@/components/goldReveal.config'
import { buildGoldRevealJsonSpec, buildGoldRevealWiringSpec } from '@/lib/buildGoldRevealSpec'
import { SpecCard, stringifyConfig, useLiveCopy } from '@/components/SpecCard'

const D = GOLD_DEFAULT_CONFIG
const MUSIC_OPTIONS = REVEAL_MUSIC_OPTIONS
const STYLE_OPTIONS = { off: 'off', 'side cannons': 'cannons', 'gold rain': 'goldRain', fireworks: 'fireworks' }
// 'random each time', or pin one line (by its index) while tuning
const TEASE_LINE_OPTIONS: Record<string, string> = {
  'random each time': 'random',
  ...Object.fromEntries(GOLD_TEASE_LINES.map(([h, s], i) => [`${h} / ${s}`, String(i)])),
}
const CLOSING_LINE_OPTIONS: Record<string, string> = {
  'random each time': 'random',
  ...Object.fromEntries(GOLD_CLOSING_LINES.map((l, i) => [l, String(i)])),
}

const SLOT_KEY = 'tgc-bench:gold'

function savedSettings(): Record<string, number | string | boolean> | null {
  try {
    const raw = localStorage.getItem(SLOT_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, number | string | boolean> = {}
    for (const k of Object.keys(D)) if (k in obj) out[k] = obj[k] as number | string | boolean
    // Leva used to turn a colour-name label ("Gold") into a hex code — drop one that got saved
    for (const k of ['amountLabel', 'headerText', 'buyText', 'shopText'] as const) {
      if (typeof out[k] === 'string' && /^#[0-9a-f]{3,8}$/i.test(out[k] as string)) out[k] = D[k]
    }
    return out
  } catch {
    return null
  }
}

function initialViewport(): string {
  if (typeof window === 'undefined') return 'phone'
  const vp = new URLSearchParams(window.location.search).get('vp')?.toLowerCase() ?? ''
  return vp === 'phone' || vp === 'tablet' || vp === 'full' ? vp : 'phone'
}

const STATE_LABEL: Record<GoldRevealState, string> = {
  armed: 'armed — press Start',
  tease: 'tease',
  pour: 'pouring',
  piled: 'piled',
  drain: 'floor pulled',
  count: 'counting',
  landed: 'landed',
}

export function GoldRevealBench() {
  const [nonce, setNonce] = useState(0)
  const [start, setStart] = useState(0)
  const [drain, setDrain] = useState(0)
  const [goldState, setGoldState] = useState<GoldRevealState>('armed')
  const [shopTaps, setShopTaps] = useState<'' | 'buy' | 'shop'>('')

  // replay = back to armed; restart = back to the top AND straight into the tease
  const [autoStart, setAutoStart] = useState(false)
  const replay = () => {
    setAutoStart(false)
    setNonce((k) => k + 1)
  }
  const restart = () => {
    setAutoStart(true)
    setNonce((k) => k + 1)
  }

  const stage = useControls('Stage', {
    viewport: { value: initialViewport(), options: ['phone', 'tablet', 'full'] },
    background: { value: 'ember', options: ['dark', 'light', 'ember'] },
    emberColor: { value: '#3a1512', label: 'ember colour' },
    emberSpread: { value: 60, min: 10, max: 140, step: 2, label: 'ember spread (%)' },
    paused: false,
  })

  const [v, set] = useControls('Gold', () => ({
    amount: folder({
      amountRandom: { value: D.amountRandom, label: 'random amount each run' },
      amountMin: { value: D.amountMin, min: 0, max: 10000, step: 10, label: '↳ from' },
      amountMax: { value: D.amountMax, min: 100, max: 10000, step: 10, label: '↳ to' },
      amountStep: { value: D.amountStep, min: 1, max: 1000, step: 1, label: '↳ round to' },
      amount: { value: D.amount, min: 100, max: 10000, step: 10, label: 'fixed amount (random off)' },
      countFrom: { value: D.countFrom, min: 0, max: 10000, step: 10, label: 'count from' },
    }),
    'tease (1)': folder(
      {
        teaseLine: { value: D.teaseLine, options: TEASE_LINE_OPTIONS, label: 'line (headline / subheader)' },
        teaseSize: { value: D.teaseSize, min: 12, max: 80, step: 1, label: 'headline size (px on phone, shrinks to fit)' },
        teaseSubSize: { value: D.teaseSubSize, min: 10, max: 48, step: 1, label: 'subheader size (px on phone)' },
        teaseSizeVsWidth: { value: D.teaseSizeVsWidth, min: 0, max: 1, step: 0.05, label: '↳ grow on wider screens' },
        teaseSizeMax: { value: D.teaseSizeMax, min: 1, max: 3, step: 0.05, label: '↳ max × phone size' },
        teaseSubMaxWidth: { value: D.teaseSubMaxWidth, min: 100, max: 600, step: 5, label: 'subheader max width (px on phone, wraps)' },
        teaseSubDelay: { value: D.teaseSubDelay, min: 0, max: 2, step: 0.05, label: '↳ comes in after headline (s)' },
        teaseSubGap: { value: D.teaseSubGap, min: -20, max: 60, step: 1, label: '↳ gap under headline (px)' },
        teaseSlideTime: { value: D.teaseSlideTime, min: 0.05, max: 1.5, step: 0.05, label: '↳ headline slides up over (s)' },
        teaseInDelay: { value: D.teaseInDelay, min: 0, max: 2, step: 0.05, label: 'pop-in delay (s)' },
        teaseFade: { value: D.teaseFade, min: 0.05, max: 1.5, step: 0.05, label: 'fade (s)' },
        teaseFromScale: { value: D.teaseFromScale, min: 0, max: 2, step: 0.05, label: 'pop from scale' },
        teaseFromRotate: { value: D.teaseFromRotate, min: -30, max: 30, step: 1, label: 'pop from rotate (°)' },
        teaseRotate: { value: D.teaseRotate, min: -15, max: 15, step: 0.5, label: 'settled tilt (°)' },
        teaseStiffness: { value: D.teaseStiffness, min: 40, max: 1200, step: 10, label: 'pop stiffness' },
        teaseDamping: { value: D.teaseDamping, min: 2, max: 80, step: 1, label: 'pop damping' },
        teaseHold: { value: D.teaseHold, min: 0, max: 5, step: 0.05, label: 'alone before the pour (s)' },
        teaseOutDelay: { value: D.teaseOutDelay, min: 0, max: 3, step: 0.05, label: 'fade after pour starts (s)' },
      },
      { collapsed: true },
    ),
    'pile-up (2)': folder(
      {
        fillLevel: { value: D.fillLevel, min: 0.2, max: 1.3, step: 0.01, label: 'fill level × height' },
        fillByAmount: { value: D.fillByAmount, label: 'smaller amount → smaller pile' },
        fullAmount: { value: D.fullAmount, min: 100, max: 100000, step: 100, label: '↳ full pile at amount' },
        minFillLevel: { value: D.minFillLevel, min: 0.05, max: 1, step: 0.01, label: '↳ smallest pile × height' },
        fillDensity: { value: D.fillDensity, min: 0.4, max: 2, step: 0.02, label: 'packing (bar count ×)' },
        barSize: { value: D.barSize, min: 24, max: 200, step: 1, label: 'bar size on phone (px)' },
        barSizeVsWidth: { value: D.barSizeVsWidth, min: 0, max: 1, step: 0.05, label: 'bar size vs width' },
        barAsset: { value: D.barAsset, options: ['both', 'gbar', 'tinyBar'], label: 'bars' },
        barScaleMin: { value: D.barScaleMin, min: 0.2, max: 2, step: 0.05, label: 'scale min' },
        barScaleMax: { value: D.barScaleMax, min: 0.2, max: 3, step: 0.05, label: 'scale max' },
        pourDuration: { value: D.pourDuration, min: 0, max: 5, step: 0.05, label: 'pour (release over, s)' },
        pourEase: { value: D.pourEase, min: 1, max: 6, step: 0.1, label: '↳ ease-in (1 = steady)' },
        pourSpeedStart: { value: D.pourSpeedStart, min: 0, max: 1, step: 0.05, label: '↳ first bars speed ×' },
        spawnHeight: { value: D.spawnHeight, min: 0, max: 1200, step: 10, label: 'drop in from above (px)' },
        gravity: { value: D.gravity, min: 1, max: 60, step: 0.5, label: 'gravity (m/s²)' },
        dropSpeedMin: { value: D.dropSpeedMin, min: 0, max: 3000, step: 50, label: 'drop-in speed min (px/s)' },
        dropSpeedMax: { value: D.dropSpeedMax, min: 0, max: 4000, step: 50, label: 'drop-in speed max (px/s)' },
        terminalVelocity: { value: D.terminalVelocity, min: 500, max: 5000, step: 50, label: 'top fall speed (px/s)' },
        bounce: { value: D.bounce, min: 0, max: 1, step: 0.01, label: 'bounce' },
        settleTime: { value: D.settleTime, min: 0.1, max: 5, step: 0.05, label: 'settle after last bar (s)' },
      },
      { collapsed: true },
    ),
    'drain (3)': folder(
      {
        autoDrain: { value: D.autoDrain, label: 'auto pull the floor' },
        drainDelay: { value: D.drainDelay, min: 0, max: 5, step: 0.05, label: 'hold settled pile (s)' },
        drainMaxWait: { value: D.drainMaxWait, min: 0, max: 15, step: 0.25, label: 'pull anyway after (s, 0 = off)' },
        drainGravityStart: { value: D.drainGravityStart, min: 0.05, max: 3, step: 0.05, label: 'gravity × as the floor goes' },
        drainGravityEnd: { value: D.drainGravityEnd, min: 0.5, max: 10, step: 0.1, label: 'gravity × at full ramp' },
        drainRampTime: { value: D.drainRampTime, min: 0.05, max: 4, step: 0.05, label: 'ramp time (s)' },
        drainRampPower: { value: D.drainRampPower, min: 1, max: 6, step: 0.1, label: 'ramp power (3 = cubic)' },
        drainMode: { value: D.drainMode, options: ['smooth', 'physics'], label: 'drain style' },
        drainFrontTime: { value: D.drainFrontTime, min: 0.1, max: 4, step: 0.05, label: '↳ smooth: bottom → top sweep (s)' },
        drainFrontPower: { value: D.drainFrontPower, min: 1, max: 6, step: 0.1, label: '↳ smooth: sweep power (3 = cubic)' },
        drainReleaseJitter: { value: D.drainReleaseJitter, min: 0, max: 0.4, step: 0.01, label: '↳ smooth: release jitter (s)' },
        drainDrift: { value: D.drainDrift, min: 0, max: 400, step: 5, label: '↳ smooth: drift ± (px/s)' },
        drainSpin: { value: D.drainSpin, min: 0, max: 720, step: 5, label: '↳ smooth: spin ± (°/s)' },
        drainStagger: { value: D.drainStagger, min: 0, max: 0.6, step: 0.01, label: '↳ physics: stagger at start (s)' },
        drainStaggerEnd: { value: D.drainStaggerEnd, min: 0, max: 0.6, step: 0.01, label: '↳ physics: stagger at full ramp (s)' },
      },
      { collapsed: true },
    ),
    'reveal + count (4)': folder(
      {
        headerText: { value: D.headerText, type: LevaInputs.STRING, label: 'heading (above icon)' },
        headerSize: { value: D.headerSize, min: 10, max: 60, step: 1, label: '↳ size (px)' },
        headerColor: { value: D.headerColor, label: '↳ colour' },
        headerGap: { value: D.headerGap, min: -40, max: 80, step: 1, label: '↳ gap to icon (px)' },
        iconScale: { value: D.iconScale, min: 1, max: 12, step: 0.1, label: 'icon size × heading text' },
        amountGap: { value: D.amountGap, min: -40, max: 80, step: 1, label: 'amount gap below icon (px)' },
        amountSize: { value: D.amountSize, min: 12, max: 120, step: 1, label: 'number size (px)' },
        amountColor: { value: D.amountColor, label: 'number colour' },
        amountLabel: { value: D.amountLabel, type: LevaInputs.STRING, label: 'label after number' },
        labelSize: { value: D.labelSize, min: 10, max: 120, step: 1, label: '↳ size (px)' },
        labelColor: { value: D.labelColor, label: '↳ colour' },
        textTilt: { value: D.textTilt, min: -15, max: 15, step: 0.5, label: 'text tilt (°)' },
        revealOffsetY: { value: D.revealOffsetY, min: -300, max: 300, step: 2, label: 'icon offset from centre (px)' },
        revealAtCleared: { value: D.revealAtCleared, min: 0, max: 1, step: 0.05, label: 'scale in once drained (share)' },
        revealFade: { value: D.revealFade, min: 0.05, max: 1.5, step: 0.05, label: '↳ scale-in time (s)' },
        revealFromScale: { value: D.revealFromScale, min: 0, max: 1, step: 0.05, label: '↳ from scale' },
        revealOvershoot: { value: D.revealOvershoot, min: 0, max: 4, step: 0.1, label: '↳ overshoot (0 = none)' },
        countDelay: { value: D.countDelay, min: 0, max: 3, step: 0.05, label: 'count after floor goes (s)' },
        landAtCleared: { value: D.landAtCleared, min: 0, max: 1, step: 0.02, label: 'impact once drained (share)' },
        countDuration: { value: D.countDuration, min: 0.1, max: 5, step: 0.05, label: 'count duration (s)' },
        countEasePower: { value: D.countEasePower, min: 1, max: 6, step: 0.1, label: 'count ease-out power' },
      },
      { collapsed: true },
    ),
    'impact (5)': folder(
      {
        impactDelay: { value: D.impactDelay, min: 0, max: 2, step: 0.05, label: 'impact delay after text (s)' },
        impact: { value: D.impact, label: 'impact swell' },
        impactScale: { value: D.impactScale, min: 1, max: 3, step: 0.05, label: 'peak size × resting' },
        impactUp: { value: D.impactUp, min: 0.05, max: 1.5, step: 0.01, label: 'ease out to peak (s)' },
        impactHold: { value: D.impactHold, min: 0, max: 1, step: 0.01, label: 'hold at peak (s)' },
        impactDown: { value: D.impactDown, min: 0.1, max: 4, step: 0.05, label: 'ease back down (s)' },
        impactFlash: { value: D.impactFlash, min: 0, max: 2, step: 0.05, label: 'white burst (0 = off)' },
        impactFlashSize: { value: D.impactFlashSize, min: 0.1, max: 2, step: 0.05, label: '↳ radius × height' },
        impactFlashDecay: { value: D.impactFlashDecay, min: 0.05, max: 2, step: 0.05, label: '↳ fade (s)' },
        impactRing: { value: D.impactRing, label: 'shockwave ring' },
        impactRingColor: { value: D.impactRingColor, label: '↳ colour' },
        impactRingSize: { value: D.impactRingSize, min: 20, max: 600, step: 5, label: '↳ travel (px)' },
        impactRingWidth: { value: D.impactRingWidth, min: 0.5, max: 30, step: 0.5, label: '↳ width (px)' },
        impactRingOpacity: { value: D.impactRingOpacity, min: 0, max: 1, step: 0.05, label: '↳ opacity' },
        impactRingDuration: { value: D.impactRingDuration, min: 0.1, max: 2, step: 0.05, label: '↳ duration (s)' },
        impactStar: { value: D.impactStar, min: 0, max: 1.5, step: 0.05, label: 'starburst (0 = off)' },
        impactStarStrokes: { value: D.impactStarStrokes, min: 1, max: 48, step: 1, label: '↳ strokes' },
        impactStarLayout: { value: D.impactStarLayout, options: { 'even (clock)': 'even', random: 'random' }, label: '↳ distribution' },
        impactStarRotate: { value: D.impactStarRotate, min: 0, max: 90, step: 1, label: '↳ rotate (°, even)' },
        impactStarRadius: { value: D.impactStarRadius, min: 10, max: 500, step: 5, label: '↳ burst radius (px)' },
        impactStarLength: { value: D.impactStarLength, min: 4, max: 200, step: 1, label: '↳ stroke length (px)' },
        impactStarWidth: { value: D.impactStarWidth, min: 0.5, max: 16, step: 0.5, label: '↳ stroke width (px)' },
        impactStarDuration: { value: D.impactStarDuration, min: 0.1, max: 2, step: 0.05, label: '↳ duration (s)' },
        impactStarColor: { value: D.impactStarColor, label: '↳ colour' },
        glow: { value: D.glow, label: 'warm glow behind' },
        glowColor: { value: D.glowColor, label: '↳ colour' },
        glowSize: { value: D.glowSize, min: 0.05, max: 1.5, step: 0.05, label: '↳ radius × height' },
        glowIntensity: { value: D.glowIntensity, min: 0, max: 1, step: 0.05, label: '↳ intensity' },
        glowPulse: { value: D.glowPulse, min: 0, max: 3, step: 0.05, label: '↳ pulse (Hz, 0 = steady)' },
        iconLoop: { value: D.iconLoop, label: 'icon pulse loop (after impact)' },
        iconLoopScale: { value: D.iconLoopScale, min: 0, max: 0.4, step: 0.01, label: '↳ size (+ × at peak)' },
        iconLoopSpeed: { value: D.iconLoopSpeed, min: 0.1, max: 4, step: 0.05, label: '↳ speed (pulses / s)' },
        iconLoopDelay: { value: D.iconLoopDelay, min: 0, max: 3, step: 0.05, label: '↳ starts after swell (s)' },
      },
      { collapsed: true },
    ),
    'shop push (6)': folder(
      {
        shopBottom: { value: D.shopBottom, min: 0, max: 240, step: 2, label: 'block: up from the bottom (px)' },
        closingLine: { value: D.closingLine, options: CLOSING_LINE_OPTIONS, label: 'closing line' },
        closingSize: { value: D.closingSize, min: 10, max: 40, step: 1, label: '↳ size (px)' },

        closingDelay: { value: D.closingDelay, min: 0, max: 3, step: 0.05, label: '↳ delay after the count (s)' },
        closingFade: { value: D.closingFade, min: 0.05, max: 2, step: 0.05, label: '↳ fade (s)' },
        closingMaxWidth: { value: D.closingMaxWidth, min: 0, max: 600, step: 10, label: '↳ max width (px, wraps; 0 = screen)' },
        button: { value: D.button, label: 'buttons' },
        shopText: { value: D.shopText, type: LevaInputs.STRING, label: 'top: label' },
        shopColor: { value: D.shopColor, label: '↳ colour' },
        shopTextColor: { value: D.shopTextColor, label: '↳ text colour' },
        shopRotate: { value: D.shopRotate, min: -20, max: 20, step: 0.5, label: '↳ settled tilt (°)' },
        buyText: { value: D.buyText, type: LevaInputs.STRING, label: 'bottom: label' },
        buyColor: { value: D.buyColor, label: '↳ colour' },
        buyTextColor: { value: D.buyTextColor, label: '↳ text colour' },
        buyRotate: { value: D.buyRotate, min: -20, max: 20, step: 0.5, label: '↳ settled tilt (°)' },
        buttonWidth: { value: D.buttonWidth, min: 120, max: 600, step: 2, label: 'buttons: width (px, ≤ screen)' },
        buttonSize: { value: D.buttonSize, min: 0.5, max: 3, step: 0.05, label: '↳ size (text + height, crisp)' },
        buttonGap: { value: D.buttonGap, min: 0, max: 120, step: 1, label: '↳ gap under line (px)' },
        buttonsGap: { value: D.buttonsGap, min: -30, max: 40, step: 1, label: '↳ gap between (px, − = overlap)' },
        buttonDelay: { value: D.buttonDelay, min: 0, max: 3, step: 0.05, label: '↳ delay after the count (s)' },
        buttonStagger: { value: D.buttonStagger, min: 0, max: 1, step: 0.01, label: '↳ second one after (s)' },
        buttonFromScale: { value: D.buttonFromScale, min: 0, max: 2.5, step: 0.05, label: '↳ from scale' },
        buttonFromRotate: { value: D.buttonFromRotate, min: -45, max: 45, step: 1, label: '↳ from rotate (°)' },
        buttonStiffness: { value: D.buttonStiffness, min: 40, max: 1200, step: 10, label: '↳ spring stiffness' },
        buttonDamping: { value: D.buttonDamping, min: 2, max: 80, step: 1, label: '↳ spring damping' },
        buttonMass: { value: D.buttonMass, min: 0.2, max: 4, step: 0.1, label: '↳ spring mass' },
      },
      { collapsed: true },
    ),
    'avatar (placeholder)': folder(
      {
        avatar: { value: D.avatar, label: 'avatar' },
        avatarPose: { value: D.avatarPose, options: { random: 'random', 'pointing up': 'pointUp', 'fist raised': 'fistRaise' }, label: '↳ pose' },
        avatarHeight: { value: D.avatarHeight, min: 0.15, max: 0.9, step: 0.01, label: '↳ height (× screen)' },
        avatarX: { value: D.avatarX, min: 0, max: 1, step: 0.01, label: '↳ across (0.5 = centre)' },
        avatarBottom: { value: D.avatarBottom, min: -200, max: 200, step: 2, label: '↳ feet above bottom (px)' },
        avatarInDelay: { value: D.avatarInDelay, min: 0, max: 3, step: 0.05, label: '↳ springs up after Start (s)' },
        avatarStiffness: { value: D.avatarStiffness, min: 40, max: 900, step: 10, label: '↳ spring stiffness' },
        avatarDamping: { value: D.avatarDamping, min: 2, max: 80, step: 1, label: '↳ spring damping' },
        avatarOutAt: { value: D.avatarOutAt, min: 0, max: 1, step: 0.05, label: '↳ slides out at pour (share)' },
        avatarOutDuration: { value: D.avatarOutDuration, min: 0.1, max: 2, step: 0.05, label: '↳ slide out (s)' },
        avatarTextGap: { value: D.avatarTextGap, min: 0, max: 200, step: 2, label: '↳ min space below the text (px)' },
      },
      { collapsed: true },
    ),
    'confetti — tease': folder(
      {
        teaseConfetti: { value: D.teaseConfetti, options: STYLE_OPTIONS, label: 'with the tease' },
        teaseConfettiDelay: { value: D.teaseConfettiDelay, min: 0, max: 4, step: 0.05, label: '↳ delay (s)' },
        teaseConfettiAmount: { value: D.teaseConfettiAmount, min: 0.1, max: 4, step: 0.05, label: '↳ amount ×' },
        teaseConfettiSpeed: { value: D.teaseConfettiSpeed, min: 0.2, max: 3, step: 0.05, label: '↳ launch speed ×' },
        teaseConfettiBursts: { value: D.teaseConfettiBursts, min: 0, max: 10, step: 1, label: '↳ pop: bursts (0 = style)' },
        teaseConfettiSpread: { value: D.teaseConfettiSpread, min: 0, max: 360, step: 1, label: '↳ pop: spread ° (0 = style)' },
        teaseConfettiRain: { value: D.teaseConfettiRain, min: 0, max: 10, step: 0.1, label: '↳ rain: seconds (0 = style)' },
        teaseConfettiLoop: { value: D.teaseConfettiLoop, label: '↳ rain: loop (keeps raining)' },
      },
      { collapsed: true },
    ),
    'confetti — impact': folder(
      {
        impactConfetti: { value: D.impactConfetti, options: STYLE_OPTIONS, label: 'on the impact' },
        impactConfettiDelay: { value: D.impactConfettiDelay, min: 0, max: 4, step: 0.05, label: '↳ delay (s)' },
        impactConfettiAmount: { value: D.impactConfettiAmount, min: 0.1, max: 4, step: 0.05, label: '↳ amount ×' },
        impactConfettiSpeed: { value: D.impactConfettiSpeed, min: 0.2, max: 3, step: 0.05, label: '↳ launch speed ×' },
        impactConfettiBursts: { value: D.impactConfettiBursts, min: 0, max: 10, step: 1, label: '↳ pop: bursts (0 = style)' },
        impactConfettiSpread: { value: D.impactConfettiSpread, min: 0, max: 360, step: 1, label: '↳ pop: spread ° (0 = style)' },
        impactConfettiRain: { value: D.impactConfettiRain, min: 0, max: 10, step: 0.1, label: '↳ rain: seconds (0 = style)' },
        impactConfettiLoop: { value: D.impactConfettiLoop, label: '↳ rain: loop (keeps raining)' },
      },
      { collapsed: true },
    ),
    'confetti — flash + starburst': folder(
      {
        confettiFlashOffsetX: { value: D.confettiFlashOffsetX, min: -150, max: 200, step: 2, label: 'position: in from cannon (px)' },
        confettiFlashOffsetY: { value: D.confettiFlashOffsetY, min: -200, max: 200, step: 2, label: 'position: below cannon (px, − = up)' },
        confettiFlash: { value: D.confettiFlash, min: 0, max: 2, step: 0.05, label: 'white flash (0 = off)' },
        confettiFlashSize: { value: D.confettiFlashSize, min: 10, max: 400, step: 5, label: '↳ radius (px)' },
        confettiFlashDuration: { value: D.confettiFlashDuration, min: 0.05, max: 1.5, step: 0.05, label: '↳ fade (s)' },
        confettiStar: { value: D.confettiStar, min: 0, max: 1.5, step: 0.05, label: 'starburst (0 = off)' },
        confettiStarStrokes: { value: D.confettiStarStrokes, min: 1, max: 40, step: 1, label: '↳ strokes' },
        confettiStarLayout: {
          value: D.confettiStarLayout,
          options: { 'aimed fan': 'aimed', 'even (clock)': 'even', random: 'random' },
          label: '↳ distribution',
        },
        confettiStarFan: { value: D.confettiStarFan, min: 10, max: 360, step: 5, label: '↳ fan width (°, aimed)' },
        confettiStarRadius: { value: D.confettiStarRadius, min: 10, max: 500, step: 5, label: '↳ burst radius (px)' },
        confettiStarLength: { value: D.confettiStarLength, min: 4, max: 200, step: 1, label: '↳ stroke length (px)' },
        confettiStarWidth: { value: D.confettiStarWidth, min: 0.5, max: 16, step: 0.5, label: '↳ stroke width (px)' },
        confettiStarDuration: { value: D.confettiStarDuration, min: 0.1, max: 2, step: 0.05, label: '↳ duration (s)' },
        confettiStarColor: { value: D.confettiStarColor, label: '↳ colour' },
      },
      { collapsed: true },
    ),
    'confetti look (both)': folder(
      {
        confettiRainGravity: { value: D.confettiRainGravity, min: 0, max: 20, step: 0.1, label: 'rain: gravity (m/s²)' },
        confettiRainDrag: { value: D.confettiRainDrag, min: 0, max: 8, step: 0.05, label: 'rain: air drag (float)' },
        confettiRainFallVar: { value: D.confettiRainFallVar, min: 0, max: 1, step: 0.05, label: 'rain: fall speed variation' },
        confettiRainFadeZone: { value: D.confettiRainFadeZone, min: 0, max: 0.5, step: 0.01, label: 'rain: fade at bottom (× height)' },
        confettiCannonGravity: { value: D.confettiCannonGravity, min: 0, max: 30, step: 0.5, label: 'side cannons: gravity (arc)' },
        confettiCannonDrag: { value: D.confettiCannonDrag, min: 0, max: 6, step: 0.05, label: 'side cannons: air drag (low = long arc)' },
        confettiCannonFallVar: { value: D.confettiCannonFallVar, min: 0, max: 1, step: 0.05, label: 'side cannons: fall speed variation' },
        confettiCannonOffsetY: { value: D.confettiCannonOffsetY, min: -400, max: 400, step: 2, label: 'side cannons: below centre (px)' },
        confettiCannonAimX: { value: D.confettiCannonAimX, min: 0, max: 1.5, step: 0.01, label: '↳ aim in (× way to middle)' },
        confettiCannonAimBy: {
          value: D.confettiCannonAimBy,
          options: { 'launch angle': 'angle', 'aim at a height': 'height' },
          label: '↳ aim by',
        },
        confettiCannonAngle: { value: D.confettiCannonAngle, min: 0, max: 85, step: 1, label: '↳ launch angle (° up)' },
        confettiCannonKeepHeight: { value: D.confettiCannonKeepHeight, label: '↳ keep the phone’s height on wider screens' },
        confettiCannonAimY: { value: D.confettiCannonAimY, min: -400, max: 400, step: 2, label: '↳ aim height vs text (px, height mode)' },
        confettiCannonTime: { value: D.confettiCannonTime, min: 0.1, max: 2, step: 0.05, label: '↳ time to target (s)' },
        confettiCannonSpeedVar: { value: D.confettiCannonSpeedVar, min: 0, max: 0.9, step: 0.05, label: '↳ speed spread' },
        confettiCannonOrder: {
          value: D.confettiCannonOrder,
          options: { 'random side first': 'random', alternate: 'alternate', together: 'together' },
          label: '↳ firing order',
        },
        confettiCannonStagger: { value: D.confettiCannonStagger, min: 0, max: 1, step: 0.01, label: '↳ gap between sides (s)' },
        confettiCannonJitter: { value: D.confettiCannonJitter, min: 0, max: 0.5, step: 0.01, label: '↳ timing jitter ± (s)' },
        confettiFlutter: { value: D.confettiFlutter, min: 0, max: 80, step: 1, label: 'flutter (px)' },
        confettiGShare: { value: D.confettiGShare, min: 0, max: 1, step: 0.05, label: 'gold G share' },
        confettiGSize: { value: D.confettiGSize, min: 6, max: 120, step: 1, label: 'G size (px)' },
        confettiPalette: { value: D.confettiPalette, options: ['goldWhite', 'gold', 'grail', 'party'], label: 'palette' },
        confettiPopExit: {
          value: D.confettiPopExit,
          options: { 'fade + shrink': 'fadeShrink', fade: 'fade', shrink: 'shrink', off: 'off' },
          label: 'pop exit (fireworks / cannons)',
        },
        confettiPopExitStart: { value: D.confettiPopExitStart, min: 0, max: 5, step: 0.05, label: '↳ starts after (s)' },
        confettiPopExitDuration: { value: D.confettiPopExitDuration, min: 0.05, max: 3, step: 0.05, label: '↳ takes (s)' },
        confettiPopExitVar: { value: D.confettiPopExitVar, min: 0, max: 1, step: 0.05, label: '↳ randomness' },
      },
      { collapsed: true },
    ),
    sound: folder(
      {
        sound: { value: D.sound, label: 'sound on' },
        volume: { value: D.volume, min: 0, max: 1, step: 0.05, label: 'SFX volume' },
        pourSound: { value: D.pourSound, label: 'pour (dailyGold)' },
        countSound: { value: D.countSound, label: 'count ticker' },
        impactSound: { value: D.impactSound, label: 'impact (chaChing)' },
        musicTrack: { value: D.musicTrack, options: MUSIC_OPTIONS, label: 'soundtrack' },
        musicVolume: { value: D.musicVolume, min: 0, max: 1, step: 0.05, label: '↳ volume' },
        musicLoop: { value: D.musicLoop, label: '↳ loop' },
        musicStart: { value: D.musicStart, options: ['start', 'drain', 'impact'], label: '↳ starts on' },
        musicDelay: { value: D.musicDelay, min: 0, max: 10, step: 0.1, label: '↳ delay (s)' },
      },
      { collapsed: true },
    ),
  }), { order: 2 })

  const restored = useRef(false)
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const saved = savedSettings()
    if (saved) set(saved as unknown as Parameters<typeof set>[0])
  }, [set])

  const values = v as unknown as Record<string, string | number | boolean>
  const config = Object.fromEntries(Object.keys(D).map((k) => [k, values[k]])) as unknown as GoldRevealConfig

  const json = buildGoldRevealJsonSpec(config)
  const wiring = buildGoldRevealWiringSpec(config)
  const copy = useLiveCopy({ json, wiring, config: stringifyConfig(config) })
  const liveConfig = useRef(config)
  liveConfig.current = config

  useControls('Export', {
    '★ save settings': button(() => {
      try {
        localStorage.setItem(SLOT_KEY, JSON.stringify(liveConfig.current))
      } catch {
        /* storage blocked */
      }
    }),
    'reset to code default': button(() => {
      try {
        localStorage.removeItem(SLOT_KEY)
      } catch {
        /* ignore */
      }
      set({ ...D } as unknown as Parameters<typeof set>[0])
      replay()
    }),
    '↻ replay': button(() => replay()),
    '↻ restart (replay + start)': button(() => restart()),
    '▶ start': button(() => setStart((n) => n + 1)),
    '⤓ pull the floor out': button(() => setDrain((n) => n + 1)),
    'copy JSON tokens': button(copy('json')),
    'copy wiring reference': button(copy('wiring')),
    'copy config (for defaults)': button(copy('config')),
  }, { order: 3 }) // Export stays last, whichever bench creates it first

  const runKey = [nonce, config.musicTrack, stage.viewport].join('|')
  // (the reveal reports its own state on mount — 'armed', or 'tease' on a restart)
  useEffect(() => setShopTaps(''), [runKey])

  const frameWidth =
    stage.viewport === 'phone' ? '390px' : stage.viewport === 'tablet' ? '720px' : 'min(1100px, 100%)'

  // live readout: bars for a 760-tall frame at this width
  const preview = goldPile(config, stage.viewport === 'phone' ? 390 : stage.viewport === 'tablet' ? 720 : 1100, 760)

  return (
    <>
      <div
        className='stage'
        data-bg={stage.background}
        style={{ '--ember': stage.emberColor, '--ember-spread': `${stage.emberSpread}%` } as CSSProperties}
      >
        <SpecsToggle />
        <button type='button' className='stage-replay' onClick={replay}>
          ↻ Replay
        </button>
        <button
          type='button'
          className='stage-replay stage-replay--alt'
          onClick={() => setStart((n) => n + 1)}
          disabled={goldState !== 'armed'}
        >
          ▶ Start
        </button>
        <button type='button' className='stage-replay stage-replay--alt2' onClick={restart}>
          ↻ Restart
        </button>
        <button
          type='button'
          className='stage-replay stage-replay--alt3'
          onClick={() => setDrain((n) => n + 1)}
          disabled={goldState !== 'pour' && goldState !== 'piled'}
        >
          ⤓ Pull the floor
        </button>
        <div className='stage-state' aria-live='polite'>
          {shopTaps === 'buy' ? '→ open another chest' : shopTaps === 'shop' ? '→ the shop' : STATE_LABEL[goldState]} · ~{preview.count} bars
        </div>
        <button
          type='button'
          className='stage-audio'
          data-on={config.sound}
          aria-pressed={config.sound}
          title={config.sound ? 'Mute audio' : 'Unmute audio'}
          onClick={() => set({ sound: !config.sound } as Parameters<typeof set>[0])}
        >
          <svg viewBox='0 0 24 24' width='20' height='20' aria-hidden='true'>
            <path
              d='M4 9v6h4l5 4V5L8 9H4z'
              fill='currentColor'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinejoin='round'
            />
            {config.sound ? (
              <path
                d='M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.8'
                strokeLinecap='round'
              />
            ) : (
              <path d='M16.5 9.5l5 5m0-5l-5 5' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' />
            )}
          </svg>
        </button>
        <div className='gold-stage-inner'>
          <div className='gold-frame' style={{ width: frameWidth }} data-viewport={stage.viewport}>
            <GoldReveal
              key={runKey}
              runKey={runKey}
              config={config}
              paused={stage.paused}
              startSignal={start}
              drainSignal={drain}
              autoStart={autoStart}
              onState={setGoldState}
              onShop={() => setShopTaps('shop')}
              onBuy={() => setShopTaps('buy')}
            />
          </div>
        </div>
      </div>

      <div className='dock'>
        <SpecCard title='Gold Reveal wiring (reference)' text={wiring} />
        <SpecCard title='Gold Reveal JSON tokens' text={json} />
      </div>
    </>
  )
}
