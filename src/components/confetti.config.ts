/**
 * Confetti config, presets and palettes — kept out of `Confetti.tsx` so that file
 * exports only its component (Vite Fast Refresh can then hot-swap it).
 */
export type ConfettiPalette = 'gold' | 'goldWhite' | 'grail' | 'party'
export type ConfettiOrigin = 'center' | 'random' | 'sides' | 'bottom'

export type ConfettiConfig = {
  // --- emission ---
  mode: 'pop' | 'rain' | 'both'
  /** fire once on mount (after `fireDelay`) */
  autoFire: boolean
  fireDelay: number
  /** re-fire every N seconds (0 = once) — handy for tuning */
  loopEvery: number

  // --- pop (firework bursts) ---
  bursts: number
  /** seconds between bursts */
  burstInterval: number
  burstOrigin: ConfettiOrigin
  /** centre origin: 0–1 of the stage width / height */
  originX: number
  originY: number
  burstPieces: number
  burstSpeedMin: number
  burstSpeedMax: number
  /** cone width, ° (360 = a full ring, like a firework shell) */
  burstSpread: number
  /** cone direction, ° (−90 = straight up) — centre / random / bottom origins */
  burstAngle: number
  /** `sphere` = pieces fill the burst (random speeds) · `ring` = all near top speed, a crisp ring */
  burstFill: 'sphere' | 'ring'
  /** side cannons: height on the stage, 0–1 (0.5 = vertical centre) */
  cannonY: number
  /** side cannons: px offset from that height (+ = lower) — sit them just under the text */
  cannonOffsetY: number
  /** side cannons aim at a target and work out their own angle + speed per screen:
   *  how far in toward the middle the target is, 0–1 of the half-width (1 = dead centre) */
  cannonAimX: number
  /** target height: px from `cannonY` (− = above; 0 = the text when it sits at that height) */
  cannonAimY: number
  /** `angle` = you set the launch angle (`cannonAngle`) · `height` = it aims at `cannonAimY` and works the angle out */
  cannonAimBy: 'angle' | 'height'
  /** launch angle, ° above horizontal (inward) — `cannonAimBy: 'angle'` */
  cannonAngle: number
  /** angle mode: the angle is how it looks on a 390 px phone, and wider screens keep that same rise
   *  (the shot flattens as it travels further) — off = the exact angle on every screen (goes higher on wide ones) */
  cannonKeepHeight: boolean
  /** seconds for the middle of the burst to reach the target — shorter = a harder, flatter shot */
  cannonTime: number
  /** × the solved speed — 1 = the burst's middle lands on the target, > 1 overshoots */
  cannonPower: number
  /** 0–1 random ± on each piece's speed, so the burst spreads short of and past the target */
  cannonSpeedVar: number
  /** which cannon fires first in each volley: both at once, alternating sides, or a random side */
  cannonOrder: 'together' | 'alternate' | 'random'
  /** seconds between the first and second cannon in a volley (alternate / random) */
  cannonStagger: number
  /** ± random seconds on every cannon shot — loosens the rhythm */
  cannonJitter: number
  /** white flash at each pop / cannon mouth — intensity (0 = off) */
  popFlash: number
  /** flash radius, px */
  popFlashSize: number
  /** seconds the flash takes to fade */
  popFlashDuration: number
  /** starburst at each pop / cannon mouth — straight strokes flying outward like clock hands (0 = off) */
  starIntensity: number
  /** how many strokes */
  starStrokes: number
  /** `even` = equal gaps round the full circle (a clock face) · `random` = scattered angles ·
   *  `aimed` = a fan centred on the shot direction (best for edge cannons — no strokes wasted off-screen) */
  starLayout: 'even' | 'random' | 'aimed'
  /** aimed: fan width, ° */
  starFan: number
  /** how far the strokes travel out, px */
  starRadius: number
  /** stroke length, px (it shortens as it flies) */
  starLength: number
  /** stroke width, px */
  starWidth: number
  /** seconds the burst lasts */
  starDuration: number
  starColor: string
  /** flash + starburst position relative to each burst origin, px — x is inward for the side cannons (mirrored) */
  flashOffsetX: number
  /** + = lower */
  flashOffsetY: number
  /** how burst pieces leave: fade out, shrink away, both, or `off` (they fall + fade at end of life) */
  popExit: 'off' | 'fade' | 'shrink' | 'fadeShrink'
  /** seconds after launch the exit starts */
  popExitStart: number
  /** seconds the exit takes */
  popExitDuration: number
  /** 0–1 random spread on the exit start, so pieces don't all vanish together */
  popExitVar: number

  // --- rain ---
  /** pieces per second */
  rainRate: number
  /** seconds it keeps raining */
  rainDuration: number
  /** keep raining until stopped (`stopSignal` / unmount) — `rainDuration` is ignored */
  rainLoop: boolean
  /** rain pieces fall until they leave the screen; they fade over this bottom share of the height (0 = no fade) */
  rainFadeZone: number
  /** 0–1 of the width the rain spawns across (centred) */
  rainSpread: number
  /** initial downward speed, px/s */
  rainSpeed: number

  // --- physics ---
  /** rain: m/s² (× 143 px/m, as Particle Rain) */
  rainGravity: number
  /** rain: air drag, 1/s — high = papery float (fall speed ≈ gravity × 143 / drag) */
  rainDrag: number
  /** bursts (cannons + fireworks): m/s² */
  popGravity: number
  /** bursts: air drag, 1/s — sets how far a burst throws (≈ speed / drag) and how it floats after */
  popDrag: number
  /** bursts: 0–1 per-piece variation in gravity, drag and top fall speed — so they don't all fall in lockstep */
  popFallVar: number
  /** rain: the same, for rain pieces */
  rainFallVar: number
  /** fall-speed cap, px/s (0 = none) */
  terminalVelocity: number
  /** constant sideways push, px/s² */
  wind: number
  /** sideways sway once floating, px */
  flutterAmp: number
  /** sway cycles per second */
  flutterFreq: number
  /** in-plane spin, °/s (random between, random direction) */
  spinMin: number
  spinMax: number
  /** 3D flip, turns per second (random between) */
  flipMin: number
  flipMax: number

  // --- pieces ---
  /** 0–1 share of pieces that are the gold G */
  gShare: number
  /** 0–1 share of the paper pieces that are dots (the rest are strips) */
  dotShare: number
  /** G height, px */
  gSize: number
  /** paper strip length, px */
  paperSize: number
  /** strip width ÷ length */
  paperAspect: number
  /** 0–1 random size variation */
  sizeVar: number
  palette: ConfettiPalette
  /** G colour: its own orange, or tinted from the palette */
  gTint: 'original' | 'palette'
  /** how much darker the back face is, 0–1 */
  backShade: number

  // --- life ---
  /** seconds a piece lives (random between), then fades */
  lifeMin: number
  lifeMax: number
  fadeOut: number
  /** hard cap on live pieces */
  maxPieces: number

  // --- responsive ---
  /** 0–1 — how much piece counts grow with the stage width (vs a 390 px phone) */
  countVsWidth: number
}

export const CONFETTI_DEFAULT_CONFIG: ConfettiConfig = {
  mode: 'pop',
  autoFire: true,
  fireDelay: 0.2,
  loopEvery: 0,

  bursts: 3,
  burstInterval: 0.35,
  burstOrigin: 'random',
  originX: 0.5,
  originY: 0.4,
  burstPieces: 90,
  burstSpeedMin: 350,
  burstSpeedMax: 1500,
  burstSpread: 360,
  burstAngle: -90,
  burstFill: 'sphere',
  popFlash: 0.6,
  popFlashSize: 90,
  popFlashDuration: 0.35,
  starIntensity: 0,
  starStrokes: 12,
  starLayout: 'aimed',
  starFan: 150,
  starRadius: 120,
  starLength: 34,
  starWidth: 3,
  starDuration: 0.45,
  starColor: '#ffffff',
  flashOffsetX: 0,
  flashOffsetY: 0,
  cannonY: 0.5,
  cannonOffsetY: 70,
  cannonAimX: 0.9,
  cannonAimY: -10,
  cannonAimBy: 'angle',
  cannonAngle: 65,
  cannonKeepHeight: true,
  cannonTime: 0.75,
  cannonPower: 1,
  cannonSpeedVar: 0.35,
  cannonOrder: 'random',
  cannonStagger: 0.12,
  cannonJitter: 0.06,
  popExit: 'fadeShrink',
  popExitStart: 1.1,
  popExitDuration: 0.8,
  popExitVar: 0.5,

  rainRate: 70,
  rainDuration: 2.5,
  rainLoop: false,
  rainFadeZone: 0.12,
  rainSpread: 1,
  rainSpeed: 120,

  rainGravity: 4.5,
  rainDrag: 2.6,
  popGravity: 5,
  popDrag: 2.8,
  popFallVar: 0.35,
  rainFallVar: 0,
  terminalVelocity: 420,
  wind: 0,
  flutterAmp: 18,
  flutterFreq: 1.1,
  spinMin: 40,
  spinMax: 260,
  flipMin: 0.6,
  flipMax: 2.2,

  gShare: 0.35,
  dotShare: 0.2,
  gSize: 34,
  paperSize: 16,
  paperAspect: 0.45,
  sizeVar: 0.35,
  palette: 'goldWhite',
  gTint: 'original',
  backShade: 0.45,

  lifeMin: 3,
  lifeMax: 5,
  fadeOut: 0.6,
  maxPieces: 900,

  countVsWidth: 0.6,
}

/** Ready-made looks — the bench loads them, the Gold Reveal fires them. */
export const CONFETTI_PRESETS: Record<'fireworks' | 'cannons' | 'goldRain', Partial<ConfettiConfig>> = {
  fireworks: {
    mode: 'pop',
    bursts: 3,
    burstInterval: 0.35,
    burstOrigin: 'random',
    burstSpread: 360,
    burstFill: 'sphere',
    burstPieces: 90,
    burstSpeedMin: 350,
    burstSpeedMax: 1500,
    popGravity: 5,
    popDrag: 2.8,
    popFlash: 0.6,
  },
  cannons: {
    mode: 'pop',
    bursts: 2,
    burstInterval: 0.25,
    burstOrigin: 'sides',
    burstSpread: 34,
    burstFill: 'sphere',
    burstPieces: 80,
    burstSpeedMin: 450,
    burstSpeedMax: 1000,
    // light drag + real gravity: they launch up, gravity takes over, and they
    // arc down over the middle (vs the fireworks' high-drag stall-and-float)
    popGravity: 9,
    popDrag: 1,
    popFlash: 0.8,
    popFlashSize: 110,
    starIntensity: 1,
  },
  goldRain: {
    mode: 'rain',
    rainRate: 70,
    rainDuration: 2.5,
    rainSpread: 1,
    rainSpeed: 120,
  },
}

export const CONFETTI_PALETTES: Record<ConfettiPalette, string[]> = {
  gold: ['#ff9d00', '#ffbf00', '#ffe269', '#ff7900'],
  goldWhite: ['#ff9d00', '#ffbf00', '#ffe269', '#ffffff', '#fff3c4'],
  // the six gem-grade colours
  grail: ['#ffbf00', '#974edb', '#035bdb', '#01fffc', '#6a9394', '#da6821'],
  party: ['#ff4d6d', '#ffbf00', '#3ddc97', '#4dabf7', '#b197fc', '#ffffff'],
}
