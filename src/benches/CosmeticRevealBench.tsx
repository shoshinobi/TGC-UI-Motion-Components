import { REVEAL_MUSIC_OPTIONS } from '@/components/revealMusic'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { SpecsToggle } from '@/components/SpecsToggle'
import { useControls, folder, button, LevaInputs } from 'leva'
import { CosmeticReveal } from '@/components/CosmeticReveal'
import {
  COSMETIC_CLOSING_LINES,
  COSMETIC_DEFAULT_CONFIG,
  COSMETIC_RARITY_LINES,
  COSMETIC_TEASE_LINES,
  type CosmeticRevealConfig,
  type CosmeticRevealState,
} from '@/components/cosmeticReveal.config'
import { COSMETIC_NAMES } from '@/components/cosmeticItems'
import { buildCosmeticRevealJsonSpec, buildCosmeticRevealWiringSpec } from '@/lib/buildCosmeticRevealSpec'
import { SpecCard, stringifyConfig, useLiveCopy } from '@/components/SpecCard'

const D = COSMETIC_DEFAULT_CONFIG
const SLOT_KEY = 'tgc-bench:cosmetic'
const MUSIC_OPTIONS = REVEAL_MUSIC_OPTIONS
const WINNER_OPTIONS: Record<string, string> = { 'random (prototype)': 'random', ...Object.fromEntries(COSMETIC_NAMES.map((n) => [n, n])) }
const TEASE_OPTIONS: Record<string, string> = {
  'random each time': 'random',
  ...Object.fromEntries(COSMETIC_TEASE_LINES.map(([h, s], i) => [`${h} / ${s}`, String(i)])),
}
const CLOSING_OPTIONS: Record<string, string> = {
  'random each time': 'random',
  ...Object.fromEntries(COSMETIC_CLOSING_LINES.map(([h, s], i) => [`${h} / ${s}`, String(i)])),
}

const RARITY_LINE_OPTIONS: Record<string, string> = {
  'preset: the tier’s line': 'tier',
  'random (from the tier’s list)': 'random',
  ...Object.fromEntries(
    Object.entries(COSMETIC_RARITY_LINES).flatMap(([t, lines]) => lines.map((l) => [`${t}: ${l}`, l])),
  ),
}

function savedSettings(): Record<string, number | string | boolean> | null {
  try {
    const raw = localStorage.getItem(SLOT_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, number | string | boolean> = {}
    for (const k of Object.keys(D)) if (k in obj) out[k] = obj[k] as number | string | boolean
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

const STATE_LABEL: Record<CosmeticRevealState, string> = {
  armed: 'armed — press Start',
  tease: 'paparazzi',
  carousel: 'carousel in',
  ready: 'ready — swipe or Spin',
  spinning: 'spinning',
  stopping: 'stopping',
  spotlight: 'spotlight',
  outro: 'outro',
}

export function CosmeticRevealBench() {
  const [nonce, setNonce] = useState(0)
  const [start, setStart] = useState(0)
  const [spin, setSpin] = useState(0)
  const [autoStart, setAutoStart] = useState(false)
  const [state, setState] = useState<CosmeticRevealState>('armed')
  const [tapped, setTapped] = useState<'' | 'buy' | 'try'>('')
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

  const [v, set] = useControls('Cosmetic', () => ({
    result: folder({
      winnerItem: { value: D.winnerItem, options: WINNER_OPTIONS, label: 'item they get' },
      winnerTier: { value: D.winnerTier, options: { 'random (prototype)': 'random', common: 'common', rare: 'rare', grail: 'grail' }, label: 'tier (when no odds are set)' },
      itemCount: { value: D.itemCount, min: 3, max: 30, step: 1, label: 'cards in the carousel' },
      teaserItems: { value: D.teaserItems, type: LevaInputs.STRING, label: 'other cards (names, comma-sep; blank = random)' },
      autoSpinAfter: { value: D.autoSpinAfter, min: 0, max: 15, step: 0.1, label: 'no swipe? auto-spin after (s, 0 = never)' },
    }),
    'tease (1)': folder(
      {
        teaseLine: { value: D.teaseLine, options: TEASE_OPTIONS, label: 'line (headline / subheader)' },
        teaseSize: { value: D.teaseSize, min: 12, max: 80, step: 1, label: 'headline size (px on phone)' },
        teaseSubSize: { value: D.teaseSubSize, min: 10, max: 48, step: 1, label: 'subheader size (px on phone)' },
        teaseSubMaxWidth: { value: D.teaseSubMaxWidth, min: 100, max: 600, step: 5, label: 'subheader max width (px, wraps)' },
        teaseSizeVsWidth: { value: D.teaseSizeVsWidth, min: 0, max: 1, step: 0.05, label: '↳ grow on wider screens' },
        teaseSizeMax: { value: D.teaseSizeMax, min: 1, max: 3, step: 0.05, label: '↳ max × phone size' },
        teaseInDelay: { value: D.teaseInDelay, min: 0, max: 2, step: 0.05, label: 'pop-in delay (s)' },
        teaseSubDelay: { value: D.teaseSubDelay, min: 0, max: 2, step: 0.05, label: 'subheader after (s)' },
        teaseSubGap: { value: D.teaseSubGap, min: -20, max: 60, step: 1, label: 'gap between (px)' },
        teaseSlideTime: { value: D.teaseSlideTime, min: 0.05, max: 1.5, step: 0.05, label: 'headline slides up over (s)' },
        teaseHold: { value: D.teaseHold, min: 0.5, max: 8, step: 0.1, label: 'carousel comes in at (s)' },
        teaseFromScale: { value: D.teaseFromScale, min: 0, max: 2, step: 0.05, label: 'pop from scale' },
        teaseFromRotate: { value: D.teaseFromRotate, min: -30, max: 30, step: 1, label: 'pop from rotate (°)' },
        teaseRotate: { value: D.teaseRotate, min: -15, max: 15, step: 0.5, label: 'settled tilt (°)' },
        teaseStiffness: { value: D.teaseStiffness, min: 40, max: 1200, step: 10, label: 'pop stiffness' },
        teaseDamping: { value: D.teaseDamping, min: 2, max: 80, step: 1, label: 'pop damping' },
        teaseFade: { value: D.teaseFade, min: 0.05, max: 1.5, step: 0.05, label: 'fade (s)' },
      },
      { collapsed: true },
    ),
    'paparazzi (1)': folder(
      {
        flashRate: { value: D.flashRate, min: 0, max: 30, step: 0.5, label: 'flashes / s (tease)' },
        flashJitter: { value: D.flashJitter, min: 0, max: 1, step: 0.05, label: 'random timing (0 = even)' },
        flashSize: { value: D.flashSize, min: 20, max: 400, step: 5, label: 'flash size (px)' },
        flashSizeVar: { value: D.flashSizeVar, min: 0, max: 0.9, step: 0.05, label: '↳ random size (±)' },
        flashGold: { value: D.flashGold, label: 'gold colour' },
        flashGoldMix: { value: D.flashGoldMix, min: 0, max: 1, step: 0.05, label: '↳ white → gold mix (max)' },
        flashIntensity: { value: D.flashIntensity, min: 0, max: 2, step: 0.05, label: 'intensity' },
        flashDuration: { value: D.flashDuration, min: 0.05, max: 1.5, step: 0.01, label: 'fade (s)' },
        flashGlint: { value: D.flashGlint, label: 'lens glint (tapered star)' },
        flashGlintPoints: { value: D.flashGlintPoints, min: 2, max: 16, step: 1, label: '↳ points' },
        flashGlintSize: { value: D.flashGlintSize, min: 0.1, max: 3, step: 0.05, label: '↳ length × flash size' },
        flashGlintWidth: { value: D.flashGlintWidth, min: 0.01, max: 0.5, step: 0.01, label: '↳ thickness at the middle × flash size' },
      },
      { collapsed: true },
    ),
    'carousel (2)': folder(
      {
        cardSize: { value: D.cardSize, min: 60, max: 320, step: 2, label: 'card size (px on phone)' },
        cardSizeVsWidth: { value: D.cardSizeVsWidth, min: 0, max: 1, step: 0.05, label: '↳ grow on wider screens' },
        cardSizeMax: { value: D.cardSizeMax, min: 1, max: 3, step: 0.05, label: '↳ max × phone size' },
        cardGap: { value: D.cardGap, min: 0, max: 80, step: 1, label: 'gap (px)' },
        cardRadius: { value: D.cardRadius, min: 0, max: 60, step: 1, label: 'corner radius (px)' },
        cardBorderWidth: { value: D.cardBorderWidth, min: 0, max: 8, step: 0.5, label: 'border (px)' },
        cardBorderColor: { value: D.cardBorderColor, label: '↳ colour' },
        cardBorderOpacity: { value: D.cardBorderOpacity, min: 0, max: 1, step: 0.05, label: '↳ opacity' },
        cardFill: { value: D.cardFill, label: 'fill colour' },
        cardFillOpacity: { value: D.cardFillOpacity, min: 0, max: 1, step: 0.02, label: '↳ opacity (0 = transparent)' },
        itemPadding: { value: D.itemPadding, min: 0, max: 0.4, step: 0.01, label: 'space around the item (× card)' },
        focusScale: { value: D.focusScale, min: 1, max: 1.5, step: 0.01, label: 'centre card scale' },
        edgeOpacity: { value: D.edgeOpacity, min: 0, max: 1, step: 0.05, label: 'edge cards opacity' },
        carouselOffsetY: { value: D.carouselOffsetY, min: -300, max: 300, step: 2, label: 'offset from centre (px)' },
        carouselIn: { value: D.carouselIn, min: 0.1, max: 2, step: 0.05, label: 'cards slide in (s)' },
        carouselInStagger: { value: D.carouselInStagger, min: 0, max: 0.3, step: 0.01, label: '↳ between cards (s)' },
        promptText: { value: D.promptText, type: LevaInputs.STRING, label: 'hint (blank = none)' },
        promptSize: { value: D.promptSize, min: 10, max: 32, step: 1, label: '↳ size (px)' },
      },
      { collapsed: true },
    ),
    'spin + stop (3)': folder(
      {
        spinDirection: { value: D.spinDirection, options: ['left', 'right'], label: 'auto direction' },
        cruiseSpeed: { value: D.cruiseSpeed, min: 1, max: 40, step: 0.5, label: 'auto speed (cards/s)' },
        spinUpDuration: { value: D.spinUpDuration, min: 0, max: 3, step: 0.05, label: 'auto ease-in (s)' },
        spinDuration: { value: D.spinDuration, min: 0, max: 10, step: 0.1, label: 'spin before slowdown (s)' },
        flickGain: { value: D.flickGain, min: 0.1, max: 4, step: 0.05, label: 'swipe → speed ×' },
        flickMin: { value: D.flickMin, min: 0.5, max: 20, step: 0.5, label: 'swipe min (cards/s)' },
        flickMax: { value: D.flickMax, min: 2, max: 60, step: 0.5, label: 'swipe max (cards/s)' },
        flickThreshold: { value: D.flickThreshold, min: 0, max: 2000, step: 10, label: 'swipe threshold (px/s)' },
        stopDuration: { value: D.stopDuration, min: 0.3, max: 8, step: 0.1, label: 'slowdown (≈ s)' },
        stopEasePower: { value: D.stopEasePower, min: 1.5, max: 6, step: 0.1, label: 'ease-out power' },
        extraLoops: { value: D.extraLoops, min: 0, max: 4, step: 1, label: 'extra loops' },
        hesitate: { value: D.hesitate, label: 'hesitate (go past, snap back)' },
        overshoot: { value: D.overshoot, min: 0, max: 0.95, step: 0.01, label: '↳ go past by (cards)' },
        overshootHold: { value: D.overshootHold, min: 0, max: 2, step: 0.05, label: '↳ hang (s)' },
        snapStiffness: { value: D.snapStiffness, min: 20, max: 1200, step: 10, label: 'snap stiffness' },
        snapDamping: { value: D.snapDamping, min: 2, max: 80, step: 1, label: 'snap damping' },
      },
      { collapsed: true },
    ),
    'speed lines (3)': folder(
      {
        warp: { value: D.warp, label: 'speed lines' },
        warpCount: { value: D.warpCount, min: 0, max: 160, step: 2, label: 'count' },
        warpSpeedScale: { value: D.warpSpeedScale, min: 0.1, max: 5, step: 0.05, label: 'speed × carousel' },
        warpSpeedVar: { value: D.warpSpeedVar, min: 0, max: 1, step: 0.05, label: '↳ speed variation' },
        warpLength: { value: D.warpLength, min: 10, max: 600, step: 5, label: 'length (px)' },
        warpWidth: { value: D.warpWidth, min: 0.5, max: 12, step: 0.5, label: 'width (px)' },
        warpColor: { value: D.warpColor, label: 'colour' },
        warpColorVar: { value: D.warpColorVar, min: 0, max: 1, step: 0.05, label: '↳ colour variation' },
        warpOpacity: { value: D.warpOpacity, min: 0.02, max: 1, step: 0.02, label: 'opacity' },
        warpOpacityVar: { value: D.warpOpacityVar, min: 0, max: 1, step: 0.05, label: '↳ opacity variation' },
        warpFade: { value: D.warpFade, min: 0.05, max: 2, step: 0.05, label: 'fade in / out (s)' },
        warpBand: { value: D.warpBand, min: 0.05, max: 1, step: 0.05, label: 'band height (× screen)' },
      },
      { collapsed: true },
    ),
    'spotlight (4)': folder(
      {
        spotScale: { value: D.spotScale, min: 1, max: 2.5, step: 0.05, label: 'winner scale' },
        spotStiffness: { value: D.spotStiffness, min: 40, max: 900, step: 10, label: '↳ spring stiffness' },
        spotDamping: { value: D.spotDamping, min: 2, max: 80, step: 1, label: '↳ spring damping' },
        othersFade: { value: D.othersFade, min: 0.05, max: 2, step: 0.05, label: 'other cards fade (s)' },
        spotFlash: { value: D.spotFlash, min: 0, max: 2, step: 0.05, label: 'white burst (0 = off)' },
        spotFlashSize: { value: D.spotFlashSize, min: 0.1, max: 2, step: 0.05, label: '↳ radius × height' },
        spotFlashDecay: { value: D.spotFlashDecay, min: 0.05, max: 2, step: 0.05, label: '↳ fade (s)' },
        spotRing: { value: D.spotRing, label: 'shockwave ring' },
        spotRingColor: { value: D.spotRingColor, label: '↳ colour' },
        spotRingSize: { value: D.spotRingSize, min: 20, max: 600, step: 5, label: '↳ travel (px)' },
        spotRingWidth: { value: D.spotRingWidth, min: 0.5, max: 30, step: 0.5, label: '↳ width (px)' },
        spotRingOpacity: { value: D.spotRingOpacity, min: 0, max: 1, step: 0.05, label: '↳ opacity' },
        spotRingDuration: { value: D.spotRingDuration, min: 0.1, max: 2, step: 0.05, label: '↳ duration (s)' },
        spotGlint: { value: D.spotGlint, min: 0, max: 1.5, step: 0.05, label: 'tapered star (0 = off)' },
        spotGlintPoints: { value: D.spotGlintPoints, min: 2, max: 16, step: 1, label: '↳ points' },
        spotGlintLength: { value: D.spotGlintLength, min: 20, max: 800, step: 5, label: '↳ length (px)' },
        spotGlintWidth: { value: D.spotGlintWidth, min: 0.01, max: 0.5, step: 0.01, label: '↳ thickness at the middle × length' },
        spotGlintRotate: { value: D.spotGlintRotate, min: -90, max: 90, step: 1, label: '↳ rotate (°)' },
        spotGlintDuration: { value: D.spotGlintDuration, min: 0.1, max: 2, step: 0.05, label: '↳ duration (s)' },
        spotGlintFadeAt: { value: D.spotGlintFadeAt, min: 0, max: 0.95, step: 0.05, label: '↳ starts fading at (× its duration)' },
        spotGlintColor: { value: D.spotGlintColor, label: '↳ colour' },
      },
      { collapsed: true },
    ),
    'single firework (4)': folder(
      {
        spotPop: { value: D.spotPop, label: 'firework from the item' },
        spotPopDelay: { value: D.spotPopDelay, min: 0, max: 4, step: 0.05, label: 'start after the reveal (s)' },
        spotPopPalette: { value: D.spotPopPalette, options: ['goldWhite', 'gold', 'grail', 'party'], label: 'colour palette' },
        spotPopRadius: { value: D.spotPopRadius, min: 30, max: 1000, step: 5, label: 'firework radius (px)' },
        spotPopGSize: { value: D.spotPopGSize, min: 4, max: 120, step: 1, label: 'particle size: gold G (px)' },
        spotPopPaperSize: { value: D.spotPopPaperSize, min: 2, max: 80, step: 1, label: '↳ paper (px)' },
        spotPopSizeVar: { value: D.spotPopSizeVar, min: 0, max: 0.95, step: 0.05, label: '↳ random size (±)' },
        spotPopAmount: { value: D.spotPopAmount, min: 0.1, max: 4, step: 0.05, label: 'particles ×' },
        spotPopLife: { value: D.spotPopLife, min: 0.1, max: 3, step: 0.05, label: 'particles fade after (s)' },
        spotPopFlash: { value: D.spotPopFlash, min: 0, max: 2, step: 0.05, label: 'flash (0 = off)' },
        spotPopFlashColor: { value: D.spotPopFlashColor, options: { 'random from palette': 'palette', white: 'white' }, label: '↳ colour' },
        spotPopFlashSize: { value: D.spotPopFlashSize, min: 10, max: 600, step: 5, label: '↳ radius (px)' },
        spotPopFlashDuration: { value: D.spotPopFlashDuration, min: 0.05, max: 1.5, step: 0.05, label: '↳ fade (s)' },
        spotPopStreaks: { value: D.spotPopStreaks, min: 0, max: 1.5, step: 0.05, label: 'streaks (0 = off)' },
        spotPopStreakCount: { value: D.spotPopStreakCount, min: 1, max: 48, step: 1, label: '↳ how many' },
        spotPopStreakRadius: { value: D.spotPopStreakRadius, min: 10, max: 500, step: 5, label: '↳ radius (px)' },
        spotPopStreakLength: { value: D.spotPopStreakLength, min: 4, max: 200, step: 1, label: '↳ length (px)' },
        spotPopStreakWidth: { value: D.spotPopStreakWidth, min: 0.5, max: 16, step: 0.5, label: '↳ width (px)' },
        spotPopStreakDuration: { value: D.spotPopStreakDuration, min: 0.1, max: 2, step: 0.05, label: '↳ duration (s)' },
        spotPopStreakColor: { value: D.spotPopStreakColor, label: '↳ colour' },
      },
      { collapsed: true },
    ),
    'rarity (5)': folder(
      {
        oddsSticker: { value: D.oddsSticker, label: 'sticker: odds (off = tier name)' },
        odds: { value: D.odds, min: 0, max: 1000000, step: 1, label: '↳ 1 in … (sets the tier; 0 = random)' },
        oddsFormat: { value: D.oddsFormat, type: LevaInputs.STRING, label: '↳ reads ({odds})' },
        oddsRareFrom: { value: D.oddsRareFrom, min: 2, max: 100000, step: 1, label: '↳ Rare from 1 in …' },
        oddsGrailFrom: { value: D.oddsGrailFrom, min: 2, max: 1000000, step: 1, label: '↳ Grail from 1 in …' },
        rarityLine: { value: D.rarityLine, options: RARITY_LINE_OPTIONS, label: 'line under the item' },
        rarityLineText: { value: D.rarityLineText, type: LevaInputs.STRING, label: '↳ or write one (blank = use the choice above)' },
        stickerDelay: { value: D.stickerDelay, min: 0, max: 2, step: 0.05, label: 'sticker after (s)' },
        stickerSize: { value: D.stickerSize, min: 0.25, max: 3, step: 0.05, label: 'sticker size' },
        stickerRotate: { value: D.stickerRotate, min: -30, max: 30, step: 1, label: 'sticker tilt (°)' },
        commonColor: { value: D.commonColor, label: 'Common: sticker colour (odds only)' },
        commonTextColor: { value: D.commonTextColor, label: '↳ text colour' },
        rareColor: { value: D.rareColor, label: 'Rare: sticker colour' },
        rareTextColor: { value: D.rareTextColor, label: '↳ text colour' },
        grailColor: { value: D.grailColor, label: 'Grail: sticker colour' },
        grailTextColor: { value: D.grailTextColor, label: '↳ text colour' },
        commonLine: { value: D.commonLine, type: LevaInputs.STRING, label: 'Common: preset line (blank = none)' },
        rareLine: { value: D.rareLine, type: LevaInputs.STRING, label: 'Rare: preset line' },
        grailLine: { value: D.grailLine, type: LevaInputs.STRING, label: 'Grail: preset line' },
        lineSize: { value: D.lineSize, min: 10, max: 40, step: 1, label: 'line size (px)' },
        lineGap: { value: D.lineGap, min: -400, max: 300, step: 1, label: '↳ below the card (px, − = up)' },
        lineOffsetX: { value: D.lineOffsetX, min: -200, max: 200, step: 1, label: '↳ left / right (px)' },
        lineDelay: { value: D.lineDelay, min: 0, max: 2, step: 0.05, label: 'line after sticker (s)' },
      },
      { collapsed: true },
    ),
    'fireworks (4–6)': folder(
      {
        fireworks: { value: D.fireworks, label: 'fireworks (every tier)' },
        fireworksDelay: { value: D.fireworksDelay, min: 0, max: 6, step: 0.05, label: 'start after the reveal (s)' },
        fireworksPalette: { value: D.fireworksPalette, options: ['goldWhite', 'gold', 'grail', 'party'], label: 'colour palette' },
        fireworksRadius: { value: D.fireworksRadius, min: 30, max: 1000, step: 5, label: 'firework radius (px)' },
        fireworksGSize: { value: D.fireworksGSize, min: 4, max: 120, step: 1, label: 'particle size: gold G (px)' },
        fireworksPaperSize: { value: D.fireworksPaperSize, min: 2, max: 80, step: 1, label: '↳ paper (px)' },
        fireworksSizeVar: { value: D.fireworksSizeVar, min: 0, max: 0.95, step: 0.05, label: '↳ random size (±)' },
        confettiAmount: { value: D.confettiAmount, min: 0.1, max: 3, step: 0.05, label: 'particles per firework ×' },
        fireworksBurstsMin: { value: D.fireworksBurstsMin, min: 1, max: 10, step: 1, label: 'fireworks per volley: random from' },
        fireworksBurstsMax: { value: D.fireworksBurstsMax, min: 1, max: 10, step: 1, label: '↳ to' },
        confettiLoop: { value: D.confettiLoop, min: 0, max: 6, step: 0.1, label: 'new volley every (s, 0 = once)' },
        fireworksLife: { value: D.fireworksLife, min: 0.1, max: 3, step: 0.05, label: 'particles fade after (s)' },
        fireworksTop: { value: D.fireworksTop, min: 0, max: 1, step: 0.01, label: 'band top (× height)' },
        fireworksBottom: { value: D.fireworksBottom, min: 0, max: 1, step: 0.01, label: 'band bottom (× height)' },
        fireworksFlash: { value: D.fireworksFlash, min: 0, max: 2, step: 0.05, label: 'flash (0 = off)' },
        fireworksFlashColor: { value: D.fireworksFlashColor, options: { 'random from palette': 'palette', white: 'white' }, label: '↳ colour' },
        fireworksFlashSize: { value: D.fireworksFlashSize, min: 10, max: 400, step: 5, label: '↳ radius (px)' },
        fireworksStreaks: { value: D.fireworksStreaks, min: 0, max: 1.5, step: 0.05, label: 'white streaks (0 = off)' },
        fireworksStreakCount: { value: D.fireworksStreakCount, min: 1, max: 40, step: 1, label: '↳ how many' },
        fireworksStreakRadius: { value: D.fireworksStreakRadius, min: 10, max: 500, step: 5, label: '↳ radius (px)' },
        fireworksStreakLength: { value: D.fireworksStreakLength, min: 4, max: 200, step: 1, label: '↳ length (px)' },
        fireworksStreakWidth: { value: D.fireworksStreakWidth, min: 0.5, max: 16, step: 0.5, label: '↳ width (px)' },
      },
      { collapsed: true },
    ),
    'outro (6)': folder(
      {
        revealHold: { value: D.revealHold, min: 0.3, max: 8, step: 0.1, label: 'starts after the reveal (s)' },
        outroDuration: { value: D.outroDuration, min: 0.1, max: 2, step: 0.05, label: 'cards slide off (s)' },
        outroStagger: { value: D.outroStagger, min: 0, max: 0.3, step: 0.01, label: '↳ between cards (s)' },
        avatar: { value: D.avatar, label: 'avatar (placeholder, random pose)' },
        avatarHeight: { value: D.avatarHeight, min: 0.15, max: 0.95, step: 0.01, label: '↳ height (× screen)' },
        avatarX: { value: D.avatarX, min: 0, max: 1, step: 0.01, label: '↳ across' },
        avatarCenterY: { value: D.avatarCenterY, min: 0.2, max: 0.8, step: 0.01, label: '↳ centre height (× screen, 0.5 = middle)' },
        avatarDelay: { value: D.avatarDelay, min: 0, max: 2, step: 0.05, label: '↳ comes up after (s)' },
        avatarStiffness: { value: D.avatarStiffness, min: 40, max: 900, step: 10, label: '↳ spring stiffness' },
        avatarDamping: { value: D.avatarDamping, min: 2, max: 80, step: 1, label: '↳ spring damping' },
        closingLine: { value: D.closingLine, options: CLOSING_OPTIONS, label: 'closing (headline / subheader)' },
        closingGap: { value: D.closingGap, min: 0, max: 120, step: 1, label: '↳ gap above the buttons (px)' },
        closingSize: { value: D.closingSize, min: 12, max: 80, step: 1, label: '↳ headline size (px on phone)' },
        closingSubSize: { value: D.closingSubSize, min: 10, max: 48, step: 1, label: '↳ subheader size (px on phone)' },
        closingSubGap: { value: D.closingSubGap, min: -20, max: 60, step: 1, label: '↳ gap between (px)' },
        closingSubMaxWidth: { value: D.closingSubMaxWidth, min: 100, max: 600, step: 5, label: '↳ subheader max width (px)' },
        closingDelay: { value: D.closingDelay, min: 0, max: 3, step: 0.05, label: '↳ after the outro starts (s)' },
      },
      { collapsed: true },
    ),
    'buttons (6)': folder(
      {
        button: { value: D.button, label: 'buttons (example — use the design system)' },
        tryText: { value: D.tryText, type: LevaInputs.STRING, label: 'top: label' },
        tryColor: { value: D.tryColor, label: '↳ colour' },
        tryTextColor: { value: D.tryTextColor, label: '↳ text colour' },
        tryRotate: { value: D.tryRotate, min: -20, max: 20, step: 0.5, label: '↳ tilt (°)' },
        buyText: { value: D.buyText, type: LevaInputs.STRING, label: 'bottom: label' },
        buyColor: { value: D.buyColor, label: '↳ colour' },
        buyTextColor: { value: D.buyTextColor, label: '↳ text colour' },
        buyRotate: { value: D.buyRotate, min: -20, max: 20, step: 0.5, label: '↳ tilt (°)' },
        shopBottom: { value: D.shopBottom, min: 0, max: 240, step: 2, label: 'up from the bottom (px)' },
        buttonWidth: { value: D.buttonWidth, min: 120, max: 600, step: 2, label: 'width (px, ≤ screen)' },
        buttonSize: { value: D.buttonSize, min: 0.5, max: 3, step: 0.05, label: 'size (crisp)' },
        buttonsGap: { value: D.buttonsGap, min: -30, max: 40, step: 1, label: 'gap between (px)' },
        buttonDelay: { value: D.buttonDelay, min: 0, max: 3, step: 0.05, label: 'after the outro starts (s)' },
        buttonStagger: { value: D.buttonStagger, min: 0, max: 1, step: 0.01, label: 'second one after (s)' },
        buttonFromScale: { value: D.buttonFromScale, min: 0, max: 2.5, step: 0.05, label: 'from scale' },
        buttonFromRotate: { value: D.buttonFromRotate, min: -45, max: 45, step: 1, label: 'from rotate (°)' },
        buttonStiffness: { value: D.buttonStiffness, min: 40, max: 1200, step: 10, label: 'spring stiffness' },
        buttonDamping: { value: D.buttonDamping, min: 2, max: 80, step: 1, label: 'spring damping' },
        buttonMass: { value: D.buttonMass, min: 0.2, max: 4, step: 0.1, label: 'spring mass' },
      },
      { collapsed: true },
    ),
    'sound (temporary)': folder(
      {
        sound: { value: D.sound, label: 'sound on' },
        volume: { value: D.volume, min: 0, max: 1, step: 0.05, label: 'SFX volume' },
        crowdSound: { value: D.crowdSound, options: ['random', 'oooh', 'aaah', 'off'], label: 'crowd (with the flashes)' },
        crowdVolume: { value: D.crowdVolume, min: 0, max: 2, step: 0.05, label: '↳ volume' },
        crowdDelay: { value: D.crowdDelay, min: 0, max: 3, step: 0.05, label: '↳ delay (s)' },
        spotPopSound: { value: D.spotPopSound, label: 'spotlight firework' },
        spotPopSoundVolume: { value: D.spotPopSoundVolume, min: 0, max: 2, step: 0.05, label: '↳ volume' },
        fireworksSound: { value: D.fireworksSound, label: 'end fireworks' },
        fireworksSoundVolume: { value: D.fireworksSoundVolume, min: 0, max: 1.5, step: 0.01, label: '↳ volume' },
        fireworksSoundFadeTo: { value: D.fireworksSoundFadeTo, min: 0, max: 1, step: 0.05, label: '↳ settle to × volume' },
        fireworksSoundFadeTime: { value: D.fireworksSoundFadeTime, min: 0, max: 30, step: 0.5, label: '↳ settle over (s)' },
        fireworksSoundMuffle: { value: D.fireworksSoundMuffle, min: 300, max: 20000, step: 100, label: '↳ muffle (Hz, lower = duller)' },
        fireworksSoundLength: { value: D.fireworksSoundLength, min: 0, max: 3, step: 0.1, label: '↳ tail length (s, 0 = full)' },
        fireworksSoundShare: { value: D.fireworksSoundShare, min: 0, max: 1, step: 0.05, label: '↳ share with a sound' },
        fireworksSoundMax: { value: D.fireworksSoundMax, min: 1, max: 16, step: 1, label: '↳ most at once' },
        fireworksSoundGap: { value: D.fireworksSoundGap, min: 0, max: 2, step: 0.02, label: '↳ shortest gap (s)' },
        fireworksSoundVolumeVar: { value: D.fireworksSoundVolumeVar, min: 0, max: 1, step: 0.05, label: '↳ volume ±' },
        fireworksSoundPitchVar: { value: D.fireworksSoundPitchVar, min: 0, max: 0.5, step: 0.01, label: '↳ pitch ±' },
        fireworksSoundPan: { value: D.fireworksSoundPan, min: 0, max: 1, step: 0.05, label: '↳ left / right' },
        shutterVolume: { value: D.shutterVolume, min: 0, max: 1.5, step: 0.05, label: 'camera shutters' },
        tickVolume: { value: D.tickVolume, min: 0, max: 1, step: 0.05, label: 'carousel ticks' },
        revealSound: { value: D.revealSound, label: 'reveal hit' },
        musicTrack: { value: D.musicTrack, options: MUSIC_OPTIONS, label: 'soundtrack' },
        musicVolume: { value: D.musicVolume, min: 0, max: 1, step: 0.05, label: '↳ volume' },
        musicLoop: { value: D.musicLoop, label: '↳ loop' },
        musicStart: { value: D.musicStart, options: ['start', 'spotlight', 'outro'], label: '↳ starts on' },
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
  // every key, falling back to the code default where there's no panel control
  const config = Object.fromEntries(
    Object.keys(D).map((k) => [k, values[k] ?? D[k as keyof CosmeticRevealConfig]]),
  ) as unknown as CosmeticRevealConfig

  const json = buildCosmeticRevealJsonSpec(config)
  const wiring = buildCosmeticRevealWiringSpec(config)
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
    '⟳ spin': button(() => setSpin((n) => n + 1)),
    'copy JSON tokens': button(copy('json')),
    'copy wiring reference': button(copy('wiring')),
    'copy config (for defaults)': button(copy('config')),
  }, { order: 3 }) // Export stays last, whichever bench creates it first

  const runKey = [nonce, config.musicTrack, stage.viewport].join('|')
  useEffect(() => setTapped(''), [runKey])
  const frameWidth = stage.viewport === 'phone' ? '390px' : stage.viewport === 'tablet' ? '720px' : 'min(1100px, 100%)'

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
        <button type='button' className='stage-replay stage-replay--alt' onClick={() => setStart((n) => n + 1)} disabled={state !== 'armed'}>
          ▶ Start
        </button>
        <button type='button' className='stage-replay stage-replay--alt2' onClick={restart}>
          ↻ Restart
        </button>
        <button type='button' className='stage-replay stage-replay--alt3' onClick={() => setSpin((n) => n + 1)} disabled={state !== 'ready'}>
          ⟳ Spin
        </button>
        <div className='stage-state' aria-live='polite'>
          {tapped === 'buy' ? '→ buy another chest' : tapped === 'try' ? '→ try the item on' : STATE_LABEL[state]}
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
            <path d='M4 9v6h4l5 4V5L8 9H4z' fill='currentColor' stroke='currentColor' strokeWidth='1.5' strokeLinejoin='round' />
            {config.sound ? (
              <path d='M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' />
            ) : (
              <path d='M16.5 9.5l5 5m0-5l-5 5' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' />
            )}
          </svg>
        </button>
        <div className='gold-stage-inner'>
          <div className='gold-frame' style={{ width: frameWidth }} data-viewport={stage.viewport}>
            <CosmeticReveal
              key={runKey}
              runKey={runKey}
              config={config}
              paused={stage.paused}
              startSignal={start}
              spinSignal={spin}
              autoStart={autoStart}
              onState={setState}
              onBuy={() => setTapped('buy')}
              onTry={() => setTapped('try')}
            />
          </div>
        </div>
      </div>

      <div className='dock'>
        <SpecCard title='Cosmetic Reveal wiring (reference)' text={wiring} />
        <SpecCard title='Cosmetic Reveal JSON tokens' text={json} />
      </div>
    </>
  )
}
