import type { RevealMusicTrack } from '@/components/revealMusic'
/**
 * Gold Reveal config, defaults, text lists and sizing helpers — kept out of
 * `GoldReveal.tsx` so that file exports only its component (Vite Fast Refresh can
 * then hot-swap it instead of reloading the module).
 */
import { PARTICLE_DEFAULT_CONFIG, type ParticleRainConfig } from '@/components/ParticleRain'
import {
  CONFETTI_DEFAULT_CONFIG,
  CONFETTI_PRESETS,
  type ConfettiConfig,
  type ConfettiPalette,
} from '@/components/confetti.config'

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export type GoldRevealState = 'armed' | 'tease' | 'pour' | 'piled' | 'drain' | 'count' | 'landed'

export type GoldRevealConfig = {
  // --- amount ---
  /** the gold the player receives — set by the app (used as-is when `amountRandom` is off) */
  amount: number
  /** prototype only: a random amount every run, between amountMin and amountMax */
  amountRandom: boolean
  amountMin: number
  amountMax: number
  /** the random amount is rounded to this step (10 → 4,730) */
  amountStep: number
  /** the count-up starts from this value */
  countFrom: number

  // --- tease (beat 1) — a headline, then a subheader under it ---
  /** which headline / subheader pair (GOLD_TEASE_LINES): 'random' = a new one each run, or its index ('0' …) */
  teaseLine: string
  teaseSize: number
  teaseSubSize: number
  /** seconds after the headline pops in before the subheader does */
  teaseSubDelay: number
  /** px between the two lines */
  teaseSubGap: number
  /** seconds the headline takes to slide up from the centre to make room — the pair ends up centred */
  teaseSlideTime: number
  /** 0–1 — how much the tease text grows on wider screens (vs a 390 px phone; 0 = same px everywhere) */
  teaseSizeVsWidth: number
  /** cap on that growth, × the phone size */
  teaseSizeMax: number
  /** px on a phone — a longer subheader wraps onto two balanced lines (grows with the text on wider screens) */
  teaseSubMaxWidth: number
  /** seconds after start before the line pops in */
  teaseInDelay: number
  teaseFade: number
  /** pop-in: from this scale, springing to 1 */
  teaseFromScale: number
  teaseFromRotate: number
  /** settled tilt, ° — a bit of character */
  teaseRotate: number
  teaseStiffness: number
  teaseDamping: number
  /** seconds the line is on its own before the gold starts pouring */
  teaseHold: number
  /** seconds after the pour starts before the line fades (it's being buried anyway) */
  teaseOutDelay: number

  // --- pile-up (beat 2) — sized to the stage, Particle Rain physics ---
  /** how high the settled pile reaches, × the stage height (1 = full screen) */
  fillLevel: number
  /** smaller amounts make a smaller pile, up to `fillLevel` at `fullAmount` */
  fillByAmount: boolean
  /** the amount (and above) that gets the full `fillLevel` */
  fullAmount: number
  /** the smallest pile, × stage height (fillByAmount) */
  minFillLevel: number
  /** packing fudge on the computed bar count — raise if the pile comes up short */
  fillDensity: number
  /** bar size on a 390px-wide phone, px (longest edge) */
  barSize: number
  /** 0–1 — how much bars grow with the stage width (0 = same px everywhere → more bars on wide screens) */
  barSizeVsWidth: number
  barAsset: ParticleRainConfig['asset']
  barScaleMin: number
  barScaleMax: number
  /** seconds over which all the bars are released */
  pourDuration: number
  /** ease-in on the pour: 1 = steady release, higher = starts as a trickle and builds to a downpour */
  pourEase: number
  /** the first bars drop in at this × the drop-in speed, building to full speed (1 = off) */
  pourSpeedStart: number
  /** px above the top edge the bars drop in from (randomised) */
  spawnHeight: number
  /** m/s² */
  gravity: number
  /** bars leave the top already falling at this speed, px/s (randomised between min / max) */
  dropSpeedMin: number
  dropSpeedMax: number
  /** fastest a bar can fall while pouring, px/s */
  terminalVelocity: number
  /** 0–1 bounce off the floor + each other */
  bounce: number
  /** seconds after the last bar drops in before the pile is frozen as settled */
  settleTime: number

  // --- drain (beat 3) ---
  /** pull the floor out automatically once the pile settles (off = wait for the trigger) */
  autoDrain: boolean
  /** seconds the settled pile holds before the floor goes */
  drainDelay: number
  /** safety cap — drain this long after the pour starts even if the pile hasn't fully settled */
  drainMaxWait: number
  /** `smooth` = bars let go bottom → top on a timed front and fall freely (no collisions, no jitter)
   *  · `physics` = collisions stay on and each bar lets go once nothing holds it (a real collapse, jittery) */
  drainMode: 'smooth' | 'physics'
  /** smooth: seconds for the release front to sweep from the bottom of the pile to the top */
  drainFrontTime: number
  /** smooth: ease-in power of the front (3 = cubic: creeps off the bottom, then races up) */
  drainFrontPower: number
  /** smooth: ± random seconds on each bar's release, so it doesn't go in neat rows */
  drainReleaseJitter: number
  /** smooth: random sideways drift as a bar lets go, ± px/s */
  drainDrift: number
  /** smooth: random spin as a bar lets go, ± °/s */
  drainSpin: number
  /** physics: seconds each layer waits once it loses support — the bottom-up cascade (at the start of the drain) */
  drainStagger: number
  /** …easing to this by the end of the ramp (lower = the last layers let go together) */
  drainStaggerEnd: number
  /** gravity × this the moment the floor goes — < 1 starts the collapse slowly */
  drainGravityStart: number
  /** gravity × this by the end of the ramp — high = the pile is off screen sooner */
  drainGravityEnd: number
  /** seconds the ramp takes, start → end */
  drainRampTime: number
  /** ease-in power of the ramp (3 = cubic: slow, then sharply faster) */
  drainRampPower: number

  // --- reveal + count-up (beat 4) — stacked: heading / GOLDBAR_X3 / amount + label ---
  /** the line above the icon (shown upper-case) */
  headerText: string
  headerSize: number
  headerColor: string
  /** px between the heading and the icon's top */
  headerGap: number
  /** icon size, × the heading's text size (5.4 = the reference proportion) */
  iconScale: number
  /** px between the icon's bottom and the amount line */
  amountGap: number
  amountSize: number
  amountColor: string
  /** the word after the number (shown upper-case) */
  amountLabel: string
  labelSize: number
  labelColor: string
  /** tilt on the heading + amount lines, ° */
  textTilt: number
  /** px — the icon's vertical offset from the stage centre (everything hangs off it) */
  revealOffsetY: number
  /** 0–1 — share of the pile that has drained when the icon + text scale in (and the count starts) */
  revealAtCleared: number
  /** earliest the reveal can start, seconds after the floor goes */
  countDelay: number
  /** seconds the icon + text take to scale in */
  revealFade: number
  /** scale they grow from (0 = from nothing) */
  revealFromScale: number
  /** ease-out-back overshoot on the scale-in (0 = none) */
  revealOvershoot: number
  /** 0–1 — the impact waits until this share of the pile has drained (the count holds its last digits till then) */
  landAtCleared: number
  countDuration: number
  /** ease-out power on the count (higher = slows harder at the end) */
  countEasePower: number

  // --- impact (with the reveal: flash, ring, starburst, swell, cha-ching — the count runs on past it) ---
  /** seconds after the text + icon start scaling in before the impact fires */
  impactDelay: number
  impact: boolean
  /** peak size, × resting */
  impactScale: number
  impactUp: number
  impactHold: number
  impactDown: number
  /** white radial burst behind the amount (0 = off) */
  impactFlash: number
  /** burst radius, × the stage's height */
  impactFlashSize: number
  impactFlashDecay: number
  impactRing: boolean
  impactRingColor: string
  impactRingSize: number
  impactRingWidth: number
  impactRingOpacity: number
  impactRingDuration: number
  /** starburst with the ring: straight strokes flying out from the icon like clock hands (0 = off) */
  impactStar: number
  impactStarStrokes: number
  /** even (clock face) · random */
  impactStarLayout: 'even' | 'random'
  /** even: rotate the clock face, ° */
  impactStarRotate: number
  /** px the strokes travel out from the icon's edge */
  impactStarRadius: number
  impactStarLength: number
  impactStarWidth: number
  impactStarDuration: number
  impactStarColor: string
  /** warm glow behind the amount, after the impact */
  glow: boolean
  glowColor: string
  /** radius, × the stage's height */
  glowSize: number
  glowIntensity: number
  /** Hz — 0 = steady */
  glowPulse: number
  /** after the impact, the gold bars keep pulsing (a looping scale) */
  iconLoop: boolean
  /** how much bigger at the top of each pulse (0.08 = +8%) */
  iconLoopScale: number
  /** pulses per second */
  iconLoopSpeed: number
  /** seconds after the impact swell has settled before it starts (it eases in) */
  iconLoopDelay: number

  // --- shop push (beat 5) — closing line + button in their own block, anchored to the bottom ---
  /** px from the bottom of the screen to the bottom of the block (+ the device's safe area) */
  shopBottom: number
  /** which closing line (GOLD_CLOSING_LINES): 'random' = a new one each run, or its index ('0' …) */
  closingLine: string
  closingSize: number
  /** seconds after the impact */
  closingDelay: number
  closingFade: number
  /** px — longer closing lines wrap onto balanced lines (0 = only the screen edge) */
  closingMaxWidth: number
  /** the two folded buttons under the closing line: "go to the shop" (top) + "open another chest" */
  button: boolean
  buyText: string
  /** panel fill + text colour of the buy button */
  buyColor: string
  buyTextColor: string
  /** settled tilt, ° */
  buyRotate: number
  shopText: string
  shopColor: string
  shopTextColor: string
  shopRotate: number
  /** px below the closing line */
  buttonGap: number
  /** px between the two buttons (− = they overlap a little, as in the reference) */
  buttonsGap: number
  /** button width, px (capped to the screen) */
  buttonWidth: number
  /** seconds after the count ends before the first button springs in */
  buttonDelay: number
  /** seconds between the first and second button */
  buttonStagger: number
  /** real size multiplier — text + height (stays crisp) */
  buttonSize: number
  buttonFromScale: number
  buttonFromRotate: number
  buttonStiffness: number
  buttonDamping: number
  buttonMass: number

  // --- audio ---
  sound: boolean
  volume: number
  /** 0–1 — evens out the clips' loudness (0 = as recorded, 1 = all the same peak) */
  sfxLevelMatch: number
  /** a random `confetti*` clip on each side-cannon shot, panned to its side */
  cannonSound: boolean
  cannonSoundVolume: number
  /** random clips layered on each shot */
  cannonSoundLayers: number
  /** ± random pitch */
  cannonSoundPitchVar: number
  /** `dailyGoldCheer.mp3`: the crowd, with the cannons */
  cheeringSound: boolean
  cheeringVolume: number
  /** seconds after the cannons' cue */
  cheeringDelay: number
  /** `dailyGoldCounter.mp3`: the dings, from the first gold-bar hit */
  counterSound: boolean
  counterVolume: number
  /** seconds after that first hit */
  counterDelay: number
  /** the pile-up: random `goldbar*` clips as the bars pour in — a few, then building */
  pourSound: boolean
  pileVolume: number
  /** how many hits across the pile-up */
  pileHits: number
  /** seconds after the pour starts before the first hit (the first bars are still falling) */
  pileDelay: number
  /** seconds from the first hit to the thick of it */
  pileDuration: number
  /** 1 = evenly spread, higher = a few at first, then denser and denser */
  pileRamp: number
  /** × volume of the first hits (they build to 1) */
  pileVolumeStart: number
  /** stragglers after the peak, as the last bars settle */
  pileTailHits: number
  pileTailTime: number
  /** gold bars: ± random pitch */
  barPitchVar: number
  /** gold bars: ± random loudness */
  barVolumeVar: number
  /** gold bars: 0–1 — how far left / right the hits are scattered */
  barPan: number
  /** the crowd as the pile-up begins: a random `oooh` / `aaah`, one of them, or off */
  pileCrowdSound: 'random' | 'oooh' | 'aaah' | 'off'
  pileCrowdVolume: number
  /** seconds into the pile-up (from the first gold-bar hit) */
  pileCrowdDelay: number
  /** fades out by this many seconds (0 = full length) */
  pileCrowdLength: number
  /** the spill: more `goldbar*` clips as the floor goes and the bars fall out */
  drainSound: boolean
  drainVolume: number
  drainHits: number
  /** 0–1 — share of those hits as the bars break loose; the rest follow the bars leaving the screen */
  drainLooseShare: number
  /** 0–1 — how far the pitch sinks over the spill */
  drainPitchDrop: number
  /** × volume by the time the pile is gone (leaves room for the count) */
  drainVolumeEnd: number
  /** GemReveal_ticker.mp3 under the count-up */
  countSound: boolean
  /** chaChing.mp3 on the impact */
  impactSound: boolean
  musicTrack: RevealMusicTrack
  musicVolume: number
  musicLoop: boolean
  musicStart: 'start' | 'drain' | 'impact'
  musicDelay: number

  // --- avatar (placeholder PNG for the Rive avatar): pops up with the cannons, buried by the gold ---
  avatar: boolean
  /** which pose: pointing up, fist raised, or a random one each run */
  avatarPose: 'pointUp' | 'fistRaise' | 'random'
  /** height, × the stage height (capped so he never gets wider than 80 % of it) */
  avatarHeight: number
  /** horizontal position of his feet, 0–1 of the width (0.5 = centre) */
  avatarX: number
  /** px his feet sit above the bottom edge (− = below it) */
  avatarBottom: number
  /** seconds after Start before he springs up (0.3 = with the side cannons) */
  avatarInDelay: number
  /** the slide-up spring */
  avatarStiffness: number
  avatarDamping: number
  /** 0–1 — he slides back out of the bottom once the pour is this far done (0.5 = halfway) */
  avatarOutAt: number
  /** seconds the slide back down takes */
  avatarOutDuration: number
  /** px — the least space kept between the bottom of the tease text and the top of the avatar.
   *  The text grows on wider screens; if it would come closer, he sits lower by the difference. */
  avatarTextGap: number

  // --- celebration: two confetti cues (Confetti presets + per-cue tweaks) ---
  /** confetti as the tease line comes up */
  teaseConfetti: GoldConfettiStyle
  /** seconds after the tease line pops in */
  teaseConfettiDelay: number
  /** × the piece counts */
  teaseConfettiAmount: number
  /** × the launch speed (how far bursts throw / how fast the rain starts) */
  teaseConfettiSpeed: number
  /** pop styles: volleys / pops (0 = the style's own) */
  teaseConfettiBursts: number
  /** pop styles: cone width, ° (0 = the style's own; 360 = full shell) */
  teaseConfettiSpread: number
  /** rain style: seconds it rains (0 = the style's own) */
  teaseConfettiRain: number
  /** rain style: keep raining until the reveal is replayed (seconds ignored) */
  teaseConfettiLoop: boolean
  /** confetti on the impact */
  impactConfetti: GoldConfettiStyle
  /** seconds after the impact */
  impactConfettiDelay: number
  impactConfettiAmount: number
  impactConfettiSpeed: number
  impactConfettiBursts: number
  impactConfettiSpread: number
  impactConfettiRain: number
  impactConfettiLoop: boolean
  // shared look + reaction (both cues)
  /** rain: m/s² */
  confettiRainGravity: number
  /** rain: air drag — high = slow, papery float */
  confettiRainDrag: number
  /** rain: fades over this bottom share of the height (0 = none) */
  confettiRainFadeZone: number
  /** side cannons: m/s² — with light drag, this is what bends the shot into an arc */
  confettiCannonGravity: number
  /** side cannons: air drag — low = a long, ballistic arc; high = a punchy stall-and-float (fireworks keep their own) */
  confettiCannonDrag: number
  /** side cannons: 0–1 per-piece variation in how fast pieces fall */
  confettiCannonFallVar: number
  /** rain: 0–1 per-piece variation in how fast pieces fall */
  confettiRainFallVar: number
  /** side cannons: px below the vertical centre (+ = lower) */
  confettiCannonOffsetY: number
  /** side cannons aim at the tease line: how far in toward the middle (× half-width, 1 = centre) */
  confettiCannonAimX: number
  /** …and how far above (−) / below the line, px */
  confettiCannonAimY: number
  /** set the launch angle yourself, or aim at a height (the angle is then worked out) */
  confettiCannonAimBy: ConfettiConfig['cannonAimBy']
  /** launch angle, ° above horizontal */
  confettiCannonAngle: number
  /** the angle is as on a phone; wider screens keep the same rise (flatter shot) */
  confettiCannonKeepHeight: boolean
  /** seconds for the middle of the burst to reach it (shorter = harder, flatter) */
  confettiCannonTime: number
  /** 0–1 speed spread — pieces land short of and past the target */
  confettiCannonSpeedVar: number
  /** which cannon fires first each volley: together, alternate, random */
  confettiCannonOrder: ConfettiConfig['cannonOrder']
  /** seconds between the two cannons in a volley */
  confettiCannonStagger: number
  /** ± random seconds on every cannon shot */
  confettiCannonJitter: number
  /** flash + starburst position from each cannon mouth, px: x inward (mirrored), y + = lower */
  confettiFlashOffsetX: number
  confettiFlashOffsetY: number
  /** sideways sway once floating, px */
  confettiFlutter: number
  /** 0–1 share of pieces that are the gold G */
  confettiGShare: number
  confettiGSize: number
  confettiPalette: ConfettiPalette
  /** how firework / cannon pieces leave: fade, shrink, both, or off (they just fall and fade at end of life) */
  confettiPopExit: ConfettiConfig['popExit']
  /** seconds after launch the exit starts */
  confettiPopExitStart: number
  /** seconds it takes */
  confettiPopExitDuration: number
  /** 0–1 random spread on the start */
  confettiPopExitVar: number
  // origin flash + starburst at each cannon mouth / firework pop (shared)
  /** white flash intensity (0 = off) */
  confettiFlash: number
  /** flash radius, px */
  confettiFlashSize: number
  confettiFlashDuration: number
  /** starburst intensity (0 = off) */
  confettiStar: number
  confettiStarStrokes: number
  /** even (clock face) · random · aimed (a fan along the shot) */
  confettiStarLayout: ConfettiConfig['starLayout']
  /** aimed: fan width, ° */
  confettiStarFan: number
  /** how far the strokes fly, px */
  confettiStarRadius: number
  confettiStarLength: number
  confettiStarWidth: number
  confettiStarDuration: number
  confettiStarColor: string
}

export type GoldConfettiStyle = 'off' | 'fireworks' | 'cannons' | 'goldRain'

export const GOLD_DEFAULT_CONFIG: GoldRevealConfig = {
  amount: 5890,
  amountRandom: true,
  amountMin: 100,
  amountMax: 10000,
  amountStep: 10,
  countFrom: 0,

  teaseLine: 'random',
  teaseSize: 41,
  teaseSubSize: 20,
  teaseSubDelay: 1,
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
  teaseHold: 2,
  teaseOutDelay: 0.6,

  fillLevel: 0.95,
  fillByAmount: false,
  fullAmount: 5000,
  minFillLevel: 0.35,
  fillDensity: 1,
  barSize: 80,
  barSizeVsWidth: 0.2,
  barAsset: 'both',
  barScaleMin: 0.8,
  barScaleMax: 1.6,
  pourDuration: 1.4,
  pourEase: 1.4,
  pourSpeedStart: 1,
  spawnHeight: 200,
  gravity: 16,
  dropSpeedMin: 950,
  dropSpeedMax: 1600,
  terminalVelocity: 2200,
  bounce: 0.6,
  settleTime: 1.2,

  autoDrain: true,
  drainDelay: 0.5,
  drainMaxWait: 6,
  drainMode: 'smooth',
  drainFrontTime: 0.9,
  drainFrontPower: 3,
  drainReleaseJitter: 0.06,
  drainDrift: 40,
  drainSpin: 60,
  drainStagger: 0.06,
  drainStaggerEnd: 0.04,
  drainGravityStart: 0.1,
  drainGravityEnd: 2.5,
  drainRampTime: 1,
  drainRampPower: 1.2,

  headerText: 'You found gold!',
  headerSize: 29,
  headerColor: '#f4efe6',
  headerGap: 10,
  iconScale: 5.4,
  amountGap: 8,
  amountSize: 56,
  amountColor: '#ffe269',
  amountLabel: 'Gold',
  labelSize: 35,
  labelColor: '#f4efe6',
  textTilt: -4,
  revealOffsetY: -24,
  revealAtCleared: 0.7,
  countDelay: 0.2,
  revealFade: 0.3,
  revealFromScale: 0.4,
  revealOvershoot: 1.4,
  landAtCleared: 0.92,
  countDuration: 2,
  countEasePower: 3,

  impactDelay: 0,
  impact: true,
  impactScale: 1.3,
  impactUp: 0.25,
  impactHold: 0.06,
  impactDown: 0.9,
  impactFlash: 0.7,
  impactFlashSize: 0.6,
  impactFlashDecay: 0.7,
  impactRing: true,
  impactRingColor: '#ffe269',
  impactRingSize: 220,
  impactRingWidth: 3,
  impactRingOpacity: 0.8,
  impactRingDuration: 0.5,
  impactStar: 1,
  impactStarStrokes: 16,
  impactStarLayout: 'even',
  impactStarRotate: 0,
  impactStarRadius: 170,
  impactStarLength: 46,
  impactStarWidth: 3.5,
  impactStarDuration: 0.55,
  impactStarColor: '#ffe269',
  glow: true,
  glowColor: '#ff9d00',
  glowSize: 0.2,
  glowIntensity: 0.3,
  glowPulse: 2.5,
  iconLoop: true,
  iconLoopScale: 0.06,
  iconLoopSpeed: 0.8,
  iconLoopDelay: 0,

  shopBottom: 40,
  closingLine: 'random',
  closingSize: 18,
  closingDelay: 0.5,
  closingFade: 0.35,
  closingMaxWidth: 300,
  button: true,
  buyText: 'Open another chest',
  buyColor: '#204c68',
  buyTextColor: '#ffffff',
  buyRotate: 1,
  shopText: 'Go to the shop',
  shopColor: '#e0b678',
  shopTextColor: '#000000',
  shopRotate: -2,
  buttonGap: 20,
  buttonsGap: 0,
  buttonWidth: 338,
  buttonDelay: 0.85,
  buttonStagger: 0.12,
  buttonSize: 1.1,
  buttonFromScale: 1.5,
  buttonFromRotate: -6,
  buttonStiffness: 230,
  buttonDamping: 38,
  buttonMass: 2.7,

  sound: true,
  volume: 0.85,
  sfxLevelMatch: 0.75,
  cannonSound: true,
  cannonSoundVolume: 0.8,
  cannonSoundLayers: 2,
  cannonSoundPitchVar: 0.06,
  cheeringSound: true,
  cheeringVolume: 1,
  cheeringDelay: 0,
  counterSound: true,
  counterVolume: 1,
  counterDelay: 0,
  pourSound: true,
  pileVolume: 0.3,
  pileHits: 28,
  pileDelay: 0.15,
  pileDuration: 1.2,
  pileRamp: 2.4,
  pileVolumeStart: 1.35,
  pileTailHits: 6,
  pileTailTime: 0.45,
  barPitchVar: 0.5,
  barVolumeVar: 0.15,
  barPan: 0.6,
  pileCrowdSound: 'random',
  pileCrowdVolume: 0.6,
  pileCrowdDelay: 1.15,
  pileCrowdLength: 0,
  drainSound: true,
  drainVolume: 0.25,
  drainHits: 32,
  drainLooseShare: 0.3,
  drainPitchDrop: 0,
  drainVolumeEnd: 0.5,
  countSound: true,
  impactSound: true,
  musicTrack: 'chasing-quails',
  musicVolume: 0.2,
  musicLoop: true,
  musicStart: 'impact',
  musicDelay: 0.5,

  avatar: true,
  avatarPose: 'random',
  avatarHeight: 0.6,
  avatarX: 0.5,
  avatarBottom: -200,
  avatarInDelay: 0.3,
  avatarStiffness: 260,
  avatarDamping: 20,
  avatarOutAt: 0.5,
  avatarOutDuration: 0.45,
  avatarTextGap: 56,

  teaseConfetti: 'cannons',
  teaseConfettiDelay: 0.1,
  teaseConfettiAmount: 1.55,
  teaseConfettiSpeed: 2,
  teaseConfettiBursts: 1,
  teaseConfettiSpread: 43,
  teaseConfettiRain: 0,
  teaseConfettiLoop: false,
  impactConfetti: 'goldRain',
  impactConfettiDelay: 0,
  impactConfettiAmount: 0.3,
  impactConfettiSpeed: 0.2,
  impactConfettiBursts: 0,
  impactConfettiSpread: 0,
  impactConfettiRain: 0,
  impactConfettiLoop: true,
  confettiRainGravity: 4.5,
  confettiRainDrag: 2.6,
  confettiRainFadeZone: 0.12,
  confettiCannonGravity: 15.5,
  confettiCannonDrag: 4.3,
  confettiCannonFallVar: 0.35,
  confettiRainFallVar: 0,
  confettiCannonOffsetY: 0,
  confettiCannonAimX: 0.58,
  confettiCannonAimY: 14,
  confettiCannonAimBy: 'angle',
  confettiCannonAngle: 60,
  confettiCannonKeepHeight: true,
  confettiCannonTime: 0.55,
  confettiCannonSpeedVar: 0.5,
  confettiCannonOrder: 'together',
  confettiCannonStagger: 0.12,
  confettiCannonJitter: 0.18,
  confettiFlashOffsetX: 0,
  confettiFlashOffsetY: 0,
  confettiFlutter: 18,
  confettiGShare: 0.35,
  confettiGSize: 24,
  confettiPalette: 'grail',
  confettiPopExit: 'shrink',
  confettiPopExitStart: 1.1,
  confettiPopExitDuration: 0.8,
  confettiPopExitVar: 0.5,
  confettiFlash: 1,
  confettiFlashSize: 180,
  confettiFlashDuration: 0.25,
  confettiStar: 1,
  confettiStarStrokes: 6,
  confettiStarLayout: 'aimed',
  confettiStarFan: 180,
  confettiStarRadius: 125,
  confettiStarLength: 42,
  confettiStarWidth: 3,
  confettiStarDuration: 0.75,
  confettiStarColor: '#ffffff',
}

/** The Confetti config for one cue: its style's preset, the cue's tweaks, the shared look. Null = off. */
export function goldConfettiConfig(c: GoldRevealConfig, cue: 'tease' | 'impact'): Partial<ConfettiConfig> | null {
  const t = cue === 'tease'
  const style = t ? c.teaseConfetti : c.impactConfetti
  if (style === 'off') return null
  const preset = CONFETTI_PRESETS[style]
  const P = { ...CONFETTI_DEFAULT_CONFIG, ...preset }
  const speed = t ? c.teaseConfettiSpeed : c.impactConfettiSpeed
  const bursts = t ? c.teaseConfettiBursts : c.impactConfettiBursts
  const spread = t ? c.teaseConfettiSpread : c.impactConfettiSpread
  const rain = t ? c.teaseConfettiRain : c.impactConfettiRain
  const loop = t ? c.teaseConfettiLoop : c.impactConfettiLoop
  return {
    ...preset,
    autoFire: false,
    loopEvery: 0,
    burstSpeedMin: P.burstSpeedMin * speed,
    burstSpeedMax: P.burstSpeedMax * speed,
    rainSpeed: P.rainSpeed * speed,
    bursts: bursts > 0 ? bursts : P.bursts,
    burstSpread: spread > 0 ? spread : P.burstSpread,
    rainDuration: rain > 0 ? rain : P.rainDuration,
    rainLoop: loop,
    popExit: c.confettiPopExit,
    popExitStart: c.confettiPopExitStart,
    popExitDuration: c.confettiPopExitDuration,
    popExitVar: c.confettiPopExitVar,
    popFlash: c.confettiFlash,
    popFlashSize: c.confettiFlashSize,
    popFlashDuration: c.confettiFlashDuration,
    starIntensity: c.confettiStar,
    starStrokes: c.confettiStarStrokes,
    starLayout: c.confettiStarLayout,
    starFan: c.confettiStarFan,
    starRadius: c.confettiStarRadius,
    starLength: c.confettiStarLength,
    starWidth: c.confettiStarWidth,
    starDuration: c.confettiStarDuration,
    starColor: c.confettiStarColor,
    rainGravity: c.confettiRainGravity,
    rainDrag: c.confettiRainDrag,
    rainFadeZone: c.confettiRainFadeZone,
    // the cannons get their own arc physics; fireworks keep their preset's stall-and-float
    ...(style === 'cannons'
      ? { popGravity: c.confettiCannonGravity, popDrag: c.confettiCannonDrag, popFallVar: c.confettiCannonFallVar }
      : {}),
    rainFallVar: c.confettiRainFallVar,
    cannonY: 0.5,
    cannonOffsetY: c.confettiCannonOffsetY,
    cannonAimX: c.confettiCannonAimX,
    cannonAimY: c.confettiCannonAimY,
    cannonAimBy: c.confettiCannonAimBy,
    cannonAngle: c.confettiCannonAngle,
    cannonKeepHeight: c.confettiCannonKeepHeight,
    cannonTime: c.confettiCannonTime,
    cannonSpeedVar: c.confettiCannonSpeedVar,
    cannonOrder: c.confettiCannonOrder,
    cannonStagger: c.confettiCannonStagger,
    cannonJitter: c.confettiCannonJitter,
    flashOffsetX: c.confettiFlashOffsetX,
    flashOffsetY: c.confettiFlashOffsetY,
    cannonPower: speed, // the cue's "launch speed ×" — 1 lands on the target
    flutterAmp: c.confettiFlutter,
    gShare: c.confettiGShare,
    gSize: c.confettiGSize,
    palette: c.confettiPalette,
  }
}

/** the icon's px size — a multiple of the heading's text size, so they keep the reference proportion */
export const goldIconPx = (c: GoldRevealConfig) => c.iconScale * c.headerSize

/** the phone width `barSize` is set at */
export const GOLD_REFERENCE_WIDTH = 390

/** How high the pile should reach for this config, × stage height. */
export function goldFillLevel(c: GoldRevealConfig): number {
  if (!c.fillByAmount) return c.fillLevel
  const k = clamp(c.amount / Math.max(1, c.fullAmount), 0, 1)
  return lerp(Math.min(c.minFillLevel, c.fillLevel), c.fillLevel, k)
}

/**
 * Bar size + count that fill a `w × h` stage to the fill level.
 * Each bar is a collision circle (Particle Rain's `collideRadius` × half its
 * size); a hex-packed circle of radius r takes 2√3·r² of floor area, so
 * count = fillDensity · width · pileHeight / (2√3 · E[r²]).
 */
export function goldPile(c: GoldRevealConfig, w: number, h: number) {
  const R = PARTICLE_DEFAULT_CONFIG
  const widthK = clamp(1 + (w / GOLD_REFERENCE_WIDTH - 1) * c.barSizeVsWidth, 0.5, 3)
  const size = c.barSize * widthK
  const a = c.barScaleMin
  const b = Math.max(a, c.barScaleMax)
  const meanScale2 = (a * a + a * b + b * b) / 3
  const r2 = Math.pow((R.collideRadius * size) / 2, 2) * meanScale2
  const floorW = w - 2 * R.wallInset
  const pileH = h * goldFillLevel(c) - R.floorInset
  const count = Math.max(1, Math.round((c.fillDensity * floorW * Math.max(0, pileH)) / (2 * Math.sqrt(3) * r2)))
  return { size, count }
}

/** The tease: a headline, then a subheader under it. One pair is picked per run. */
export const GOLD_TEASE_LINES: [string, string][] = [
  ['Ka-ching!', 'Someone’s buying something nice'],
  ['Heads up!', 'It’s raining gold'],
  ['Payday!', 'Brace yourself'],
  ['Gold rush!', 'Your pockets are about to get heavy'],
  ['Look out below!', 'Something shiny is headed your way'],
  ['Big catch!', 'Hope you brought a bigger wallet'],
  ['Clear some space!', 'This one’s a big one'],
  ['Jackpot!', 'Get ready to go shopping'],
]

/** The shop push's closing line. One is picked per run. */
export const GOLD_CLOSING_LINES: string[] = [
  'The Grail Shop is open. Treat yourself.',
  'Go on. You’ve earned it.',
  'Your next favourite thing is in the Grail Shop.',
  'Time to spend it.',
  'Shop’s open. Go make it rain.',
  'Burning a hole in your pocket? The Grail Shop can help.',
  'Treat yourself. We won’t tell.',
]
