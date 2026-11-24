import { CONFETTI_DEFAULT_CONFIG, CONFETTI_PRESETS, type ConfettiConfig, type ConfettiPalette } from '@/components/confetti.config'
import type { RevealMusicTrack } from '@/components/revealMusic'
/**
 * Cosmetic Reveal config, defaults, text lists and tiers — kept out of
 * `CosmeticReveal.tsx` so that file exports only its component (Fast Refresh).
 */
import { COSMETIC_ITEMS, type CosmeticItem } from '@/components/cosmeticItems'

export type CosmeticTier = 'common' | 'rare' | 'grail'
export const COSMETIC_TIERS: CosmeticTier[] = ['common', 'rare', 'grail']

export type CosmeticRevealState =
  | 'armed'
  | 'tease' // paparazzi flashes + the teaser line
  | 'carousel' // the cards slide in
  | 'ready' // waiting for a swipe (or the auto spin)
  | 'spinning'
  | 'stopping' // controlled ease-out onto the chosen item
  | 'spotlight' // the winner scales up, flash, sticker + rarity line
  | 'outro' // cards leave, the avatar (wearing it) comes in + closing + buttons

export type CosmeticRevealConfig = {
  // --- result (set by the app) ---
  /** the item they get — an item name, or 'random' (prototype) */
  winnerItem: string
  /** set by the app; 'random' = a different tier each run (prototype) */
  winnerTier: CosmeticTier | 'random'
  /** how many cards are in the carousel (the winner is one of them) */
  itemCount: number
  /** the other cards: item names, comma-separated (blank / short = random from the pool) */
  teaserItems: string

  // --- tease (headline, then subheader under it — as the Gold Reveal) ---
  /** 'random' = a new pair each run, or its index ('0' …) */
  teaseLine: string
  teaseSize: number
  teaseSubSize: number
  teaseSubDelay: number
  teaseSubGap: number
  teaseSlideTime: number
  teaseSizeVsWidth: number
  teaseSizeMax: number
  teaseSubMaxWidth: number
  teaseInDelay: number
  teaseFade: number
  teaseFromScale: number
  teaseFromRotate: number
  teaseRotate: number
  teaseStiffness: number
  teaseDamping: number
  /** seconds from Start until the carousel comes in (the tease fades as it does) */
  teaseHold: number

  // --- paparazzi (camera flashes, each with a random shutter sound) ---
  /** flashes per second while the tease is up */
  flashRate: number
  /** how irregular the timing is, 0 = metronome, 1 = very bursty */
  flashJitter: number
  /** flash bloom radius, px (randomised by flashSizeVar) */
  flashSize: number
  /** 0–1 — random size spread: each flash is flashSize × (1 ± this) */
  flashSizeVar: number
  /** each flash's colour is a random mix of white and this */
  flashGold: string
  /** 0–1 — how gold the goldest flash gets (0 = all white) */
  flashGoldMix: number
  flashIntensity: number
  /** seconds each flash takes to fade */
  flashDuration: number
  /** the glint (lens star) at each flash: points that taper from the middle to nothing */
  flashGlint: boolean
  /** how many points */
  flashGlintPoints: number
  /** glint arm length, × the flash size */
  flashGlintSize: number
  /** how thick the points are at the middle, × the flash size (they taper to a tip) */
  flashGlintWidth: number

  // --- carousel ---
  /** card size on a 390 px phone, px (square) */
  cardSize: number
  /** 0–1 — how much cards grow on wider screens */
  cardSizeVsWidth: number
  cardSizeMax: number
  /** px between cards */
  cardGap: number
  cardRadius: number
  cardBorderWidth: number
  cardBorderColor: string
  cardBorderOpacity: number
  /** the card's fill (transparent by default) */
  cardFill: string
  cardFillOpacity: number
  /** space inside the card around the item, × the card size */
  itemPadding: number
  /** the centre card's scale while spinning / waiting */
  focusScale: number
  /** opacity of the cards furthest from the centre */
  edgeOpacity: number
  /** px — the carousel's vertical offset from the centre */
  carouselOffsetY: number
  /** seconds the cards take to slide in (they fly in from the right) */
  carouselIn: number
  /** seconds between each card arriving */
  carouselInStagger: number
  /** the "swipe to spin" hint under the carousel ('' = none) */
  promptText: string
  promptSize: number
  /** seconds after the cards arrive before it auto-spins (0 = wait for a swipe) */
  autoSpinAfter: number

  // --- spin + stop (as the Gem Wheel, sideways) ---
  spinDirection: 'left' | 'right'
  /** auto spin speed, cards per second */
  cruiseSpeed: number
  spinUpDuration: number
  /** seconds at speed before the slowdown */
  spinDuration: number
  flickGain: number
  flickMin: number
  flickMax: number
  /** release speed (px/s) below which a swipe isn't a flick */
  flickThreshold: number
  /** roughly how long the slowdown takes, s */
  stopDuration: number
  stopEasePower: number
  extraLoops: number
  /** go past the item by `overshoot` cards, hang, snap back (the tease) */
  hesitate: boolean
  overshoot: number
  overshootHold: number
  snapStiffness: number
  snapDamping: number

  // --- speed lines while the carousel spins (the Gem Wheel's, horizontal) ---
  warp: boolean
  warpCount: number
  /** line speed, × the carousel's */
  warpSpeedScale: number
  warpSpeedVar: number
  warpLength: number
  warpWidth: number
  warpColor: string
  warpColorVar: number
  warpOpacity: number
  warpOpacityVar: number
  /** seconds the lines take to come on / leave */
  warpFade: number
  /** height of the band they fill, × the screen (centred on the carousel) */
  warpBand: number

  // --- spotlight (the winner) ---
  /** the winner's size, × its card size */
  spotScale: number
  spotStiffness: number
  spotDamping: number
  /** seconds the other cards take to fade */
  othersFade: number
  // burst + ring: the Gold Reveal's impact, drawn round the card
  /** white burst behind the winner (0 = off) */
  spotFlash: number
  spotFlashSize: number
  spotFlashDecay: number
  spotRing: boolean
  spotRingColor: string
  spotRingSize: number
  spotRingWidth: number
  spotRingOpacity: number
  spotRingDuration: number
  /** one tapered star over the item, as the camera flashes' glint — intensity (0 = off) */
  spotGlint: number
  spotGlintPoints: number
  /** centre → tip, px */
  spotGlintLength: number
  /** thickness at the middle, × the length (it tapers to a tip) */
  spotGlintWidth: number
  /** turn, ° (0 = a point straight up) */
  spotGlintRotate: number
  spotGlintDuration: number
  /** 0–1 — share of its life before it starts fading (it's at full strength until then) */
  spotGlintFadeAt: number
  spotGlintColor: string
  // a single firework from the centre of the revealed item — the end fireworks' look, its own settings
  spotPop: boolean
  /** seconds after the reveal */
  spotPopDelay: number
  spotPopPalette: ConfettiPalette
  /** how far its outermost pieces fly before they fade, px */
  spotPopRadius: number
  spotPopGSize: number
  spotPopPaperSize: number
  /** 0–1 — random size spread (±) */
  spotPopSizeVar: number
  /** pieces × */
  spotPopAmount: number
  /** seconds until its pieces shrink + fade */
  spotPopLife: number
  /** flash (0 = off), colour (random from its palette, or white), radius px, fade s */
  spotPopFlash: number
  spotPopFlashColor: ConfettiConfig['popFlashColor']
  spotPopFlashSize: number
  spotPopFlashDuration: number
  /** streaks (0 = off), how many, how far out / length / width px, seconds, colour */
  spotPopStreaks: number
  spotPopStreakCount: number
  spotPopStreakRadius: number
  spotPopStreakLength: number
  spotPopStreakWidth: number
  spotPopStreakDuration: number
  spotPopStreakColor: string

  // --- rarity: sticker + line ---
  /** true = the sticker shows the item's odds ("1 in 100"); false = its tier name */
  oddsSticker: boolean
  /** the item's odds, 1 in this many — set by the app with the item, and it sets the tier (0 = random, prototype) */
  odds: number
  /** how the odds read: {odds} is filled in */
  oddsFormat: string
  /** odds of 1 in this many or longer = Rare (shorter = Common) */
  oddsRareFrom: number
  /** odds of 1 in this many or longer = Grail */
  oddsGrailFrom: number
  /** the line under the item: 'tier' = the tier's preset, 'random' = one from the tier's list, or the line itself */
  rarityLine: string
  /** a line written for this item — replaces `rarityLine` ('' = don't) */
  rarityLineText: string
  commonColor: string
  commonTextColor: string
  /** seconds after the spotlight before the sticker slaps on */
  stickerDelay: number
  /** sticker size multiplier (crisp) */
  stickerSize: number
  stickerRotate: number
  rareColor: string
  rareTextColor: string
  grailColor: string
  grailTextColor: string
  /** the line under the winner, per tier ('' = none) */
  commonLine: string
  rareLine: string
  grailLine: string
  lineSize: number
  /** line centre below the revealed card's bottom edge, px on a phone (− = up, over the card) */
  lineGap: number
  /** px from the centre (− = left) */
  lineOffsetX: number
  /** seconds after the sticker */
  lineDelay: number
  /** seconds the revealed item holds before the outro starts (every tier) */
  revealHold: number

  // --- fireworks (the same for every tier) ---
  fireworks: boolean
  /** seconds after the item is revealed (the spotlight) before the first volley */
  fireworksDelay: number
  /** particle colours (the flashes pick from it too) */
  fireworksPalette: ConfettiPalette
  /** fireworks in each volley: a random number from min to max, rolled per volley */
  fireworksBurstsMin: number
  fireworksBurstsMax: number
  /** how far a firework's outermost pieces fly before they fade, px */
  fireworksRadius: number
  /** gold G height / paper piece length inside the pops, px */
  fireworksGSize: number
  fireworksPaperSize: number
  /** 0–1 — random size spread on every piece (±) */
  fireworksSizeVar: number
  /** flash where each firework pops (0 = off), its colour (a random palette colour per pop, or white) + radius, px */
  fireworksFlash: number
  fireworksFlashColor: ConfettiConfig['popFlashColor']
  fireworksFlashSize: number
  /** white radial streaks at each pop (0 = off), as the Confetti component's starburst */
  fireworksStreaks: number
  fireworksStreakCount: number
  /** how far the streaks fly out / stroke length / stroke width, px */
  fireworksStreakRadius: number
  fireworksStreakLength: number
  fireworksStreakWidth: number
  /** fireworks: the band they burst in, × height from the top (above the item) */
  fireworksTop: number
  fireworksBottom: number
  /** seconds between volleys — they keep going through the outro (0 = one volley) */
  confettiLoop: number
  /** fireworks pieces shrink + fade this long after bursting, so they stay up top (s) */
  fireworksLife: number
  /** pieces per firework × this */
  confettiAmount: number

  // --- outro: cards leave, the avatar (wearing the item) comes in ---
  /** seconds the cards take to slide off */
  outroDuration: number
  outroStagger: number
  avatar: boolean
  avatarHeight: number
  avatarX: number
  /** the avatar's centre, × the stage height from the top (0.5 = middle; less = higher) */
  avatarCenterY: number
  /** seconds after the outro starts */
  avatarDelay: number
  avatarStiffness: number
  avatarDamping: number
  /** 'random' = a new closing pair each run, or its index */
  closingLine: string
  /** px between the closing pair and the buttons (it sits just above them) */
  closingGap: number
  closingSize: number
  closingSubSize: number
  closingSubGap: number
  closingSubMaxWidth: number
  /** seconds after the outro starts */
  closingDelay: number

  // --- buttons (examples — the developer uses the design-system buttons) ---
  button: boolean
  buyText: string
  buyColor: string
  buyTextColor: string
  buyRotate: number
  tryText: string
  tryColor: string
  tryTextColor: string
  tryRotate: number
  shopBottom: number
  buttonWidth: number
  buttonSize: number
  buttonsGap: number
  /** seconds after the outro starts */
  buttonDelay: number
  buttonStagger: number
  buttonFromScale: number
  buttonFromRotate: number
  buttonStiffness: number
  buttonDamping: number
  buttonMass: number

  // --- audio (temporary) ---
  sound: boolean
  volume: number
  /** the crowd as the flashes start: a random `oooh` / `aaah`, one of them, or off */
  crowdSound: 'random' | 'oooh' | 'aaah' | 'off'
  /** × SFX volume */
  crowdVolume: number
  /** seconds after the first flash */
  crowdDelay: number
  /** one random `fireworks*` clip on the spotlight's single firework */
  spotPopSound: boolean
  spotPopSoundVolume: number
  /** a random `fireworks*` clip on each end firework */
  fireworksSound: boolean
  fireworksSoundVolume: number
  /** 0–1 — share of the fireworks that make a sound */
  fireworksSoundShare: number
  /** most clips sounding at once; a firework past that is silent */
  fireworksSoundMax: number
  /** shortest time between two sounds, s */
  fireworksSoundGap: number
  /** low-pass cutoff, Hz — lower = duller, further away (20000 = off) */
  fireworksSoundMuffle: number
  /** each clip fades out by this many seconds (0 = full length) */
  fireworksSoundLength: number
  /** they settle to this × volume … */
  fireworksSoundFadeTo: number
  /** … over this many seconds from the first one */
  fireworksSoundFadeTime: number
  fireworksSoundVolumeVar: number
  fireworksSoundPitchVar: number
  /** 0–1 — how far each sound follows its firework left / right */
  fireworksSoundPan: number
  /** camera shutters (camSFX/*.wav), × SFX volume */
  shutterVolume: number
  /** a tick per card passing the centre */
  tickVolume: number
  revealSound: boolean
  musicTrack: RevealMusicTrack
  musicVolume: number
  musicLoop: boolean
  musicStart: 'start' | 'spotlight' | 'outro'
  musicDelay: number
}

export const COSMETIC_DEFAULT_CONFIG: CosmeticRevealConfig = {
  winnerItem: 'random',
  winnerTier: 'random',
  itemCount: 10,
  teaserItems: '',

  teaseLine: 'random',
  teaseSize: 41,
  teaseSubSize: 20,
  teaseSubDelay: 0.8,
  teaseSubGap: 6,
  teaseSlideTime: 0.4,
  teaseSizeVsWidth: 0.35,
  teaseSizeMax: 1.8,
  teaseSubMaxWidth: 240,
  teaseInDelay: 0.2,
  teaseFade: 0.25,
  teaseFromScale: 0.6,
  teaseFromRotate: -6,
  teaseRotate: -2,
  teaseStiffness: 420,
  teaseDamping: 18,
  teaseHold: 2.8,

  flashRate: 5,
  flashJitter: 0.7,
  flashSize: 200,
  flashSizeVar: 0.6,
  flashGold: '#ffc94a',
  flashGoldMix: 0.85,
  flashIntensity: 0.8,
  flashDuration: 0.28,
  flashGlint: true,
  flashGlintPoints: 4,
  flashGlintSize: 1,
  flashGlintWidth: 0.1,

  cardSize: 150,
  cardSizeVsWidth: 0.3,
  cardSizeMax: 1.6,
  cardGap: 18,
  cardRadius: 18,
  cardBorderWidth: 0.5,
  cardBorderColor: '#f4efe6',
  cardBorderOpacity: 0.55,
  cardFill: '#ffffff',
  cardFillOpacity: 0,
  itemPadding: 0.14,
  focusScale: 1.15,
  edgeOpacity: 0.25,
  carouselOffsetY: 0,
  carouselIn: 0.55,
  carouselInStagger: 0.05,
  promptText: 'Swipe to spin',
  promptSize: 16,
  autoSpinAfter: 2.5,

  spinDirection: 'left',
  cruiseSpeed: 9,
  spinUpDuration: 0.6,
  spinDuration: 1.6,
  flickGain: 1,
  flickMin: 4,
  flickMax: 24,
  flickThreshold: 300,
  stopDuration: 2,
  stopEasePower: 2,
  extraLoops: 0,
  hesitate: true,
  overshoot: 0.4,
  overshootHold: 0.25,
  snapStiffness: 380,
  snapDamping: 15,

  warp: true,
  warpCount: 24,
  warpSpeedScale: 1.5,
  warpSpeedVar: 0.25,
  warpLength: 255,
  warpWidth: 2,
  warpColor: '#ffffff',
  warpColorVar: 1,
  warpOpacity: 0.24,
  warpOpacityVar: 1,
  warpFade: 0.2,
  warpBand: 0.35,

  spotScale: 1.55,
  spotStiffness: 700,
  spotDamping: 25,
  othersFade: 0.35,
  spotFlash: 1,
  spotFlashSize: 0.45,
  spotFlashDecay: 0.6,
  spotRing: true,
  spotRingColor: '#ffe269',
  spotRingSize: 220,
  spotRingWidth: 3,
  spotRingOpacity: 1,
  spotRingDuration: 0.5,
  spotGlint: 1,
  spotGlintPoints: 4,
  spotGlintLength: 260,
  spotGlintWidth: 0.1,
  spotGlintRotate: 0,
  spotGlintDuration: 0.4,
  spotGlintFadeAt: 0.6,
  spotGlintColor: '#ffe269',
  spotPop: true,
  spotPopDelay: 0,
  spotPopPalette: 'goldWhite',
  spotPopRadius: 465,
  spotPopGSize: 32,
  spotPopPaperSize: 24,
  spotPopSizeVar: 0.35,
  spotPopAmount: 1,
  spotPopLife: 0.95,
  spotPopFlash: 1,
  spotPopFlashColor: 'white',
  spotPopFlashSize: 285,
  spotPopFlashDuration: 0.45,
  spotPopStreaks: 1,
  spotPopStreakCount: 16,
  spotPopStreakRadius: 175,
  spotPopStreakLength: 43,
  spotPopStreakWidth: 3,
  spotPopStreakDuration: 0.8,
  spotPopStreakColor: '#ffffff',

  oddsSticker: true,
  odds: 0,
  oddsFormat: '1 in {odds}',
  oddsRareFrom: 100,
  oddsGrailFrom: 1000,
  rarityLine: 'random',
  rarityLineText: '',
  commonColor: '#f4efe6',
  commonTextColor: '#000000',
  stickerDelay: 0.25,
  stickerSize: 1.5,
  stickerRotate: 8,
  rareColor: '#974edb',
  rareTextColor: '#ffffff',
  grailColor: '#ffbf00',
  grailTextColor: '#000000',
  commonLine: 'Nice find!',
  rareLine: 'Not many players have this one!',
  grailLine: 'Only a few players have this one!',
  lineSize: 18,
  lineGap: 48,
  lineOffsetX: 0,
  lineDelay: 0.35,
  revealHold: 2.2,

  fireworks: true,
  fireworksDelay: 3,
  fireworksPalette: 'grail',
  fireworksBurstsMin: 3,
  fireworksBurstsMax: 4,
  fireworksRadius: 325,
  fireworksGSize: 18,
  fireworksPaperSize: 16,
  fireworksSizeVar: 0.35,
  fireworksFlash: 1,
  fireworksFlashColor: 'palette',
  fireworksFlashSize: 190,
  fireworksStreaks: 1,
  fireworksStreakCount: 16,
  fireworksStreakRadius: 120,
  fireworksStreakLength: 32,
  fireworksStreakWidth: 3,
  fireworksTop: 0.06,
  fireworksBottom: 0.3,
  confettiLoop: 1.8,
  fireworksLife: 0.7,
  confettiAmount: 1,

  outroDuration: 0.4,
  outroStagger: 0.03,
  avatar: true,
  avatarHeight: 0.5,
  avatarX: 0.5,
  avatarCenterY: 0.42,
  avatarDelay: 0.4,
  avatarStiffness: 240,
  avatarDamping: 20,
  closingLine: 'random',
  closingGap: 18,
  closingSize: 36,
  closingSubSize: 20,
  closingSubGap: 6,
  closingSubMaxWidth: 260,
  closingDelay: 0.45,

  button: true,
  buyText: 'Buy another chest',
  buyColor: '#204c68',
  buyTextColor: '#ffffff',
  buyRotate: 1,
  tryText: 'Try the item on',
  tryColor: '#e0b678',
  tryTextColor: '#000000',
  tryRotate: -2,
  shopBottom: 40,
  buttonWidth: 338,
  buttonSize: 1.1,
  buttonsGap: 0,
  buttonDelay: 0.9,
  buttonStagger: 0.12,
  buttonFromScale: 1.5,
  buttonFromRotate: -6,
  buttonStiffness: 230,
  buttonDamping: 38,
  buttonMass: 2.7,

  sound: true,
  volume: 0.85,
  crowdSound: 'random',
  crowdVolume: 0.7,
  crowdDelay: 0,
  spotPopSound: true,
  spotPopSoundVolume: 0.6,
  fireworksSound: true,
  fireworksSoundVolume: 0.81,
  fireworksSoundShare: 1,
  fireworksSoundMax: 5,
  fireworksSoundGap: 0.08,
  fireworksSoundMuffle: 4000,
  fireworksSoundLength: 1.8,
  fireworksSoundFadeTo: 0.5,
  fireworksSoundFadeTime: 6,
  fireworksSoundVolumeVar: 0.3,
  fireworksSoundPitchVar: 0.08,
  fireworksSoundPan: 0.6,
  shutterVolume: 0.6,
  tickVolume: 0.35,
  revealSound: true,
  musicTrack: 'vogue',
  musicVolume: 0.2,
  musicLoop: true,
  musicStart: 'spotlight',
  musicDelay: 0.4,
}

/** Teaser: headline first, subheader second. One pair is picked per run. */
export const COSMETIC_TEASE_LINES: [string, string][] = [
  ['Strike a pose.', 'Something fabulous is coming.'],
  ['Cameras ready.', 'Your new look is arriving.'],
  ['Make way.', 'Style coming through.'],
  ['Red carpet time.', 'You’re the one they came to see.'],
  ['Lights. Cameras.', 'Fashion.'],
  ['Paparazzi alert.', 'Everyone wants a shot of this.'],
  ['Glow up incoming.', 'You’re about to turn heads.'],
  ['VIP arrival.', 'Your new look just pulled up.'],
]

/** Closing pair over the avatar: headline, then subheader. One is picked per run. */
export const COSMETIC_CLOSING_LINES: [string, string][] = [
  ['Looking good.', 'Go show it off.'],
  ['Now that’s a look.', 'Equip it and own the room.'],
  ['Star status unlocked.', 'Wear it proud.'],
  ['Fresh fit.', 'Time to flex.'],
]

/** the phone width card / text sizes are set at */
export const COSMETIC_REFERENCE_WIDTH = 390

/** seconds a firework's pieces take to shrink + fade */
const FIREWORK_EXIT = 0.5

/**
 * A firework's Confetti config: the shared `fireworks` preset (as the Confetti component
 * plays it) with a radius (px) and a life (s) in place of raw launch speeds.
 */
function fireworkBase(radius: number, life: number): Partial<ConfettiConfig> {
  const P = { ...CONFETTI_DEFAULT_CONFIG, ...CONFETTI_PRESETS.fireworks }
  // launch speed that carries the outermost pieces `radius` px by the time they're
  // half faded: distance(T) = v·(1 − e^(−drag·T)) / drag
  const T = Math.max(0.1, life) + FIREWORK_EXIT / 2
  const speedMax = (Math.max(1, radius) * P.popDrag) / (1 - Math.exp(-P.popDrag * T))
  return {
    ...CONFETTI_PRESETS.fireworks,
    autoFire: false,
    burstSpeedMax: speedMax,
    burstSpeedMin: speedMax * (P.burstSpeedMin / P.burstSpeedMax),
    // gone before they fall far
    popExit: 'fadeShrink',
    popExitStart: Math.max(0.1, life),
    popExitDuration: FIREWORK_EXIT,
    countVsWidth: 0.3,
  }
}

/** The fireworks at the end — the same for every tier. */
export function cosmeticFireworksConfig(c: CosmeticRevealConfig): Partial<ConfettiConfig> {
  return {
    ...fireworkBase(c.fireworksRadius, c.fireworksLife),
    palette: c.fireworksPalette,
    bursts: Math.min(c.fireworksBurstsMin, c.fireworksBurstsMax),
    burstsMax: Math.max(c.fireworksBurstsMin, c.fireworksBurstsMax),
    gSize: c.fireworksGSize,
    paperSize: c.fireworksPaperSize,
    sizeVar: c.fireworksSizeVar,
    popFlash: c.fireworksFlash,
    popFlashColor: c.fireworksFlashColor,
    popFlashSize: c.fireworksFlashSize,
    starIntensity: c.fireworksStreaks,
    starStrokes: c.fireworksStreakCount,
    starRadius: c.fireworksStreakRadius,
    starLength: c.fireworksStreakLength,
    starWidth: c.fireworksStreakWidth,
    randomTop: c.fireworksTop,
    randomBottom: c.fireworksBottom,
    loopEvery: Math.max(0, c.confettiLoop),
  }
}

/** The single firework that explodes from the centre of the revealed item; `originY` = the item's centre, × height. */
export function cosmeticSpotFireworkConfig(c: CosmeticRevealConfig, originY: number): Partial<ConfettiConfig> {
  return {
    ...fireworkBase(c.spotPopRadius, c.spotPopLife),
    palette: c.spotPopPalette,
    bursts: 1,
    burstsMax: 0,
    burstOrigin: 'center',
    originX: 0.5,
    originY,
    loopEvery: 0,
    gSize: c.spotPopGSize,
    paperSize: c.spotPopPaperSize,
    sizeVar: c.spotPopSizeVar,
    popFlash: c.spotPopFlash,
    popFlashColor: c.spotPopFlashColor,
    popFlashSize: c.spotPopFlashSize,
    popFlashDuration: c.spotPopFlashDuration,
    starIntensity: c.spotPopStreaks,
    starStrokes: c.spotPopStreakCount,
    starRadius: c.spotPopStreakRadius,
    starLength: c.spotPopStreakLength,
    starWidth: c.spotPopStreakWidth,
    starDuration: c.spotPopStreakDuration,
    starColor: c.spotPopStreakColor,
  }
}

/** The lines a developer can pick from per tier — how hard the item is to find ({odds} = its odds). */
export const COSMETIC_RARITY_LINES: Record<CosmeticTier, string[]> = {
  common: ['Nice find!', 'Good pull!', 'A crowd favorite.', 'One for the collection.'],
  rare: ['Not many players have this one!', 'Now that’s a rare find.', 'Hard to come by.', 'A 1 in {odds} find.'],
  grail: ['Only a few players have this one!', 'Almost impossible to find.', 'Hardly anyone pulls this.', 'You beat 1 in {odds} odds.'],
}

/** prototype only: what random odds are picked from */
const RANDOM_ODDS = [5, 10, 20, 50, 100, 200, 250, 500, 1000, 2500, 5000, 10000]

/** Easy to find = Common, harder = Rare, extremely hard = Grail. */
export function tierFromOdds(c: CosmeticRevealConfig, odds: number): CosmeticTier {
  return odds >= c.oddsGrailFrom ? 'grail' : odds >= c.oddsRareFrom ? 'rare' : 'common'
}

/** this run's dice (each 0–1) for whatever is left on random, and the line to avoid repeating */
export type RarityRoll = { odds: number; line: number; prevLine: string }

/**
 * The sticker + line for an item. Its odds set its tier; with no odds set
 * (prototype) `tier` is used and odds that fit it are rolled.
 */
export function rarityOf(c: CosmeticRevealConfig, tier: CosmeticTier, roll: RarityRoll) {
  const at = <T,>(list: T[], u: number) => list[Math.min(list.length - 1, Math.floor(u * list.length))]
  const set = Math.round(c.odds)
  const t = set > 0 ? tierFromOdds(c, set) : tier
  const fits = RANDOM_ODDS.filter((o) => tierFromOdds(c, o) === t)
  const edge = t === 'grail' ? c.oddsGrailFrom : t === 'rare' ? c.oddsRareFrom : Math.max(2, c.oddsRareFrom - 1)
  const odds = set > 0 ? set : fits.length ? at(fits, roll.odds) : edge
  const fill = (text: string) => text.replace(/\{odds\}/g, odds.toLocaleString('en-US'))

  const base = tierOf(c, t)
  const sticker = c.oddsSticker
    ? { text: fill(c.oddsFormat), color: base.sticker?.color ?? c.commonColor, ink: base.sticker?.ink ?? c.commonTextColor }
    : base.sticker
  let line = base.line
  if (c.rarityLineText.trim()) line = c.rarityLineText
  else if (c.rarityLine === 'random') {
    const fresh = COSMETIC_RARITY_LINES[t].filter((l) => l !== roll.prevLine)
    line = at(fresh, roll.line)
  } else if (c.rarityLine !== 'tier') line = c.rarityLine
  return { sticker, line: fill(line), lineKey: line }
}

/** Per-tier numbers for a config. */
export function tierOf(c: CosmeticRevealConfig, tier: CosmeticTier) {
  const t = tier === 'grail' ? 'grail' : tier === 'rare' ? 'rare' : 'common'
  return {
    line: t === 'grail' ? c.grailLine : t === 'rare' ? c.rareLine : c.commonLine,
    sticker: t === 'common' ? null : t === 'grail' ? { text: 'Grail', color: c.grailColor, ink: c.grailTextColor } : { text: 'Rare', color: c.rareColor, ink: c.rareTextColor },
  }
}

const findItem = (name: string) => {
  const n = name.trim().toLowerCase()
  return n ? COSMETIC_ITEMS.find((i) => i.name.toLowerCase() === n) : undefined
}

/**
 * The carousel for one run: `count` items with the winner among them (at a random
 * slot). The others are the named teaser items first (in order), topped up at
 * random from the pool — never repeating, never the winner.
 */
export function buildCarousel(c: CosmeticRevealConfig, rand: () => number) {
  const pool = COSMETIC_ITEMS
  const count = Math.max(2, Math.min(pool.length, Math.round(c.itemCount)))
  const winner =
    (c.winnerItem !== 'random' && findItem(c.winnerItem)) || pool[Math.floor(rand() * pool.length)]
  const others: CosmeticItem[] = []
  for (const name of c.teaserItems.split(',')) {
    const it = findItem(name)
    if (it && it !== winner && !others.includes(it) && others.length < count - 1) others.push(it)
  }
  const rest = pool.filter((i) => i !== winner && !others.includes(i))
  while (others.length < count - 1 && rest.length) others.push(rest.splice(Math.floor(rand() * rest.length), 1)[0])
  const winnerSlot = Math.floor(rand() * count)
  const items = [...others]
  items.splice(winnerSlot, 0, winner)
  return { items, winnerSlot, winner }
}

/** Fit an item's visible box into a square card: the <img>'s size + offset as % of the card. */
export function fitItem(item: CosmeticItem, padding: number) {
  const [x0, y0, x1, y1] = item.box
  const bw = (x1 - x0) * item.w
  const bh = (y1 - y0) * item.h
  const inner = 1 - 2 * Math.max(0, Math.min(0.45, padding))
  const k = inner / Math.max(bw, bh) // card-fractions per image px
  const w = item.w * k
  const h = item.h * k
  return {
    width: `${(w * 100).toFixed(3)}%`,
    height: `${(h * 100).toFixed(3)}%`,
    left: `${((0.5 - (bw * k) / 2 - x0 * w) * 100).toFixed(3)}%`,
    top: `${((0.5 - (bh * k) / 2 - y0 * h) * 100).toFixed(3)}%`,
  }
}
