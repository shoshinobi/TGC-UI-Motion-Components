import { useEffect, useRef, useState } from 'react'
import { FoldableButton } from '@/components/banner-stubs'
import { ParticleRain, PARTICLE_DEFAULT_CONFIG, type ParticleRainConfig } from '@/components/ParticleRain'
import {
  Confetti,
  CONFETTI_DEFAULT_CONFIG,
  CONFETTI_PRESETS,
  type ConfettiConfig,
  type ConfettiPalette,
} from '@/components/Confetti'
import { GEM_MUSIC } from '@/components/GemReveal'
import { hexToRgba } from '@/lib/gemTiers'
import goldbarUrl from '@/assets/GOLDBAR_X3.svg'
import pourUrl from '@/assets/mp3/dailyGold.mp3'
import tickerUrl from '@/assets/mp3/GemReveal_ticker.mp3'
import chaChingUrl from '@/assets/mp3/chaChing.mp3'

/**
 * Gold Reveal — "a balance update turned into a payday".
 *
 *   armed → tease → pour → piled → drain → count → landed
 *
 * - **tease**: a playful line pops in on its own ("Ka-ching! …").
 * - **pour**: gold bars pour in from the top and pile up until they fill the
 *   screen. The pile IS the Particle Rain engine (burst + floor + collisions),
 *   with its bar count worked out from the stage's area so the same fill level
 *   buries a phone and a desktop alike. The tease is underneath — it gets buried.
 * - **piled**: the pile goes to sleep (Particle Rain's auto-sleep), holds a beat.
 * - **drain**: the floor is pulled out (Particle Rain's `dumpSignal`) and the
 *   pile cascades off the bottom, uncovering "You found gold!" / GOLDBAR_X3 /
 *   "<amount> GRAILGOLD", stacked.
 * - **count**: the amount counts up with an ease-out.
 * - **landed**: impact — the icon pulses — swells and eases back (same curve
 *   as the gem) with a white burst + shockwave ring around it;
 *   then the closing line and the Grail Shop button spring in.
 *
 * Layers, back → front: fx canvas (glow / burst / ring) → tease → amount + shop
 * push → the gold pile canvas.
 */

export type GoldRevealState = 'armed' | 'tease' | 'pour' | 'piled' | 'drain' | 'count' | 'landed'

export type GoldRevealConfig = {
  // --- amount ---
  /** the gold the player receives — set by the app */
  amount: number
  /** the count-up starts from this value */
  countFrom: number

  // --- tease (beat 1) — a headline, then a subheader under it ---
  /** headline ("Ka-ching!") */
  teaseText: string
  teaseSize: number
  /** subheader under it ('' = none) */
  teaseSubText: string
  teaseSubSize: number
  /** seconds after the headline pops in before the subheader does */
  teaseSubDelay: number
  /** px between the two lines */
  teaseSubGap: number
  /** seconds the headline takes to slide up from the centre to make room — the pair ends up centred */
  teaseSlideTime: number
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
  closingText: string
  closingSize: number
  /** seconds after the impact */
  closingDelay: number
  closingFade: number
  /** px — longer closing lines wrap onto balanced lines (0 = only the screen edge) */
  closingMaxWidth: number
  button: boolean
  buttonText: string
  /** px below the closing line */
  buttonGap: number
  /** seconds after the impact */
  buttonDelay: number
  /** real size multiplier (stays crisp) */
  buttonSize: number
  buttonFromScale: number
  buttonFromRotate: number
  buttonRotate: number
  buttonStiffness: number
  buttonDamping: number
  buttonMass: number

  // --- audio ---
  sound: boolean
  volume: number
  /** dailyGold.mp3 as the bars pour in */
  pourSound: boolean
  /** GemReveal_ticker.mp3 under the count-up */
  countSound: boolean
  /** chaChing.mp3 on the impact */
  impactSound: boolean
  musicTrack: 'off' | 'random' | 'belt-and-braces' | 'chasing-quails'
  musicVolume: number
  musicLoop: boolean
  musicStart: 'start' | 'drain' | 'impact'
  musicDelay: number

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
  amount: 2500,
  countFrom: 0,

  teaseText: 'Ka-ching!',
  teaseSize: 40,
  teaseSubText: 'Somebody’s buying something nice.',
  teaseSubSize: 20,
  teaseSubDelay: 0.35,
  teaseSubGap: 6,
  teaseSlideTime: 0.4,
  teaseInDelay: 0.2,
  teaseFade: 0.25,
  teaseFromScale: 0.6,
  teaseFromRotate: -6,
  teaseRotate: -2,
  teaseStiffness: 420,
  teaseDamping: 18,
  teaseHold: 1.4,
  teaseOutDelay: 0.6,

  fillLevel: 1,
  fillByAmount: false,
  fullAmount: 5000,
  minFillLevel: 0.35,
  fillDensity: 1.12,
  barSize: 80,
  barSizeVsWidth: 0.4,
  barAsset: 'both',
  barScaleMin: 0.8,
  barScaleMax: 1.6,
  pourDuration: 0.8,
  pourEase: 2.2,
  pourSpeedStart: 0.35,
  spawnHeight: 200,
  gravity: 24,
  dropSpeedMin: 1300,
  dropSpeedMax: 1900,
  terminalVelocity: 2600,
  bounce: 0.55,
  settleTime: 1.2,

  autoDrain: true,
  drainDelay: 0.5,
  drainMaxWait: 5,
  drainMode: 'smooth',
  drainFrontTime: 0.9,
  drainFrontPower: 3,
  drainReleaseJitter: 0.06,
  drainDrift: 40,
  drainSpin: 60,
  drainStagger: 0.16,
  drainStaggerEnd: 0.01,
  drainGravityStart: 0.35,
  drainGravityEnd: 3.5,
  drainRampTime: 1,
  drainRampPower: 3,

  headerText: 'You found gold!',
  headerSize: 26,
  headerColor: '#f4efe6',
  headerGap: 10,
  iconScale: 5.4,
  amountGap: 8,
  amountSize: 40,
  amountColor: '#e2c27a',
  amountLabel: 'GrailGold',
  labelSize: 34,
  labelColor: '#f4efe6',
  textTilt: -4,
  revealOffsetY: -24,
  revealAtCleared: 0.55,
  countDelay: 0.2,
  revealFade: 0.4,
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
  glowSize: 0.35,
  glowIntensity: 0.45,
  glowPulse: 0.5,
  iconLoop: true,
  iconLoopScale: 0.06,
  iconLoopSpeed: 0.8,
  iconLoopDelay: 0,

  shopBottom: 40,
  closingText: 'The Grail Shop is open. Treat yourself.',
  closingSize: 18,
  closingDelay: 0.5,
  closingFade: 0.35,
  closingMaxWidth: 300,
  button: true,
  buttonText: 'Go to the Grail Shop',
  buttonGap: 20,
  buttonDelay: 0.85,
  buttonSize: 1.1,
  buttonFromScale: 1.5,
  buttonFromRotate: -6,
  buttonRotate: 2,
  buttonStiffness: 230,
  buttonDamping: 38,
  buttonMass: 2.7,

  sound: true,
  volume: 0.85,
  pourSound: true,
  countSound: true,
  impactSound: true,
  musicTrack: 'belt-and-braces',
  musicVolume: 0.1,
  musicLoop: true,
  musicStart: 'impact',
  musicDelay: 0.5,

  teaseConfetti: 'cannons',
  teaseConfettiDelay: 0.1,
  teaseConfettiAmount: 1,
  teaseConfettiSpeed: 1,
  teaseConfettiBursts: 0,
  teaseConfettiSpread: 0,
  teaseConfettiRain: 0,
  teaseConfettiLoop: false,
  impactConfetti: 'goldRain',
  impactConfettiDelay: 0,
  impactConfettiAmount: 1,
  impactConfettiSpeed: 1,
  impactConfettiBursts: 0,
  impactConfettiSpread: 0,
  impactConfettiRain: 3,
  impactConfettiLoop: true,
  confettiRainGravity: CONFETTI_DEFAULT_CONFIG.rainGravity,
  confettiRainDrag: CONFETTI_DEFAULT_CONFIG.rainDrag,
  confettiRainFadeZone: CONFETTI_DEFAULT_CONFIG.rainFadeZone,
  confettiCannonGravity: 9,
  confettiCannonDrag: 1,
  confettiCannonFallVar: 0.35,
  confettiRainFallVar: 0,
  confettiCannonOffsetY: CONFETTI_DEFAULT_CONFIG.cannonOffsetY,
  confettiCannonAimX: CONFETTI_DEFAULT_CONFIG.cannonAimX,
  confettiCannonAimY: CONFETTI_DEFAULT_CONFIG.cannonAimY,
  confettiCannonAimBy: CONFETTI_DEFAULT_CONFIG.cannonAimBy,
  confettiCannonAngle: CONFETTI_DEFAULT_CONFIG.cannonAngle,
  confettiCannonKeepHeight: CONFETTI_DEFAULT_CONFIG.cannonKeepHeight,
  confettiCannonTime: CONFETTI_DEFAULT_CONFIG.cannonTime,
  confettiCannonSpeedVar: CONFETTI_DEFAULT_CONFIG.cannonSpeedVar,
  confettiCannonOrder: CONFETTI_DEFAULT_CONFIG.cannonOrder,
  confettiCannonStagger: CONFETTI_DEFAULT_CONFIG.cannonStagger,
  confettiCannonJitter: CONFETTI_DEFAULT_CONFIG.cannonJitter,
  confettiFlashOffsetX: CONFETTI_DEFAULT_CONFIG.flashOffsetX,
  confettiFlashOffsetY: CONFETTI_DEFAULT_CONFIG.flashOffsetY,
  confettiFlutter: CONFETTI_DEFAULT_CONFIG.flutterAmp,
  confettiGShare: CONFETTI_DEFAULT_CONFIG.gShare,
  confettiGSize: CONFETTI_DEFAULT_CONFIG.gSize,
  confettiPalette: CONFETTI_DEFAULT_CONFIG.palette,
  confettiPopExit: CONFETTI_DEFAULT_CONFIG.popExit,
  confettiPopExitStart: CONFETTI_DEFAULT_CONFIG.popExitStart,
  confettiPopExitDuration: CONFETTI_DEFAULT_CONFIG.popExitDuration,
  confettiPopExitVar: CONFETTI_DEFAULT_CONFIG.popExitVar,
  confettiFlash: 0.8,
  confettiFlashSize: 110,
  confettiFlashDuration: 0.35,
  confettiStar: 1,
  confettiStarStrokes: 12,
  confettiStarLayout: 'aimed',
  confettiStarFan: 150,
  confettiStarRadius: 120,
  confettiStarLength: 34,
  confettiStarWidth: 3,
  confettiStarDuration: 0.45,
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

const TAU = Math.PI * 2
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / Math.max(1e-6, e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

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

export type GoldRevealProps = {
  config?: Partial<GoldRevealConfig>
  paused?: boolean
  runKey?: string | number
  /** armed → tease (bump a counter) */
  startSignal?: number
  /** pull the floor out now (pour / piled → drain) */
  drainSignal?: number
  onState?: (s: GoldRevealState) => void
  /** the Grail Shop button was pressed */
  onShop?: () => void
  /** skip `armed` — start the sequence as soon as it mounts (a fresh runKey + this = restart) */
  autoStart?: boolean
}

export function GoldReveal({
  config,
  paused = false,
  runKey,
  startSignal = 0,
  drainSignal = 0,
  onState,
  onShop,
  autoStart = false,
}: GoldRevealProps) {
  const c: GoldRevealConfig = { ...GOLD_DEFAULT_CONFIG, ...config }
  const wrapRef = useRef<HTMLDivElement>(null)
  const fxRef = useRef<HTMLCanvasElement>(null)
  const teaseRef = useRef<HTMLDivElement>(null)
  const teaseSubRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const iconRef = useRef<HTMLDivElement>(null)
  const amountLineRef = useRef<HTMLDivElement>(null)
  const amountRef = useRef<HTMLSpanElement>(null)
  const shopRef = useRef<HTMLDivElement>(null)
  const closingRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLDivElement>(null)

  const cfgRef = useRef(c)
  cfgRef.current = c
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const autoStartRef = useRef(autoStart)
  autoStartRef.current = autoStart
  const onStateRef = useRef(onState)
  onStateRef.current = onState
  const musicRef = useRef<{ el: HTMLAudioElement | null; playing: boolean }>({ el: null, playing: false })

  // the pile: mounted fresh at each pour, sized to the stage at that moment
  const [pile, setPile] = useState<{ run: number; size: number; count: number } | null>(null)
  const [dump, setDump] = useState(0)
  const [teaseFire, setTeaseFire] = useState(0)
  const [impactFire, setImpactFire] = useState(0)
  const pileEvents = useRef({ settled: false, cleared: false, drained: 0 })

  // signals → counters the loop reads
  const sig = useRef({ start: 0, drain: 0 })
  const last = useRef({ start: startSignal, drain: drainSignal })
  useEffect(() => {
    if (startSignal !== last.current.start) {
      last.current.start = startSignal
      sig.current.start++
    }
    if (drainSignal !== last.current.drain) {
      last.current.drain = drainSignal
      sig.current.drain++
    }
  }, [startSignal, drainSignal])

  useEffect(() => {
    const wrap = wrapRef.current
    const fx = fxRef.current
    const teaseEl = teaseRef.current
    const teaseSubEl = teaseSubRef.current
    const headerEl = headerRef.current
    const iconEl = iconRef.current
    const amountLineEl = amountLineRef.current
    const amountEl = amountRef.current
    const shopEl = shopRef.current
    const closingEl = closingRef.current
    const btnEl = btnRef.current
    if (!shopEl || !wrap || !fx || !teaseEl || !teaseSubEl || !headerEl || !iconEl || !amountLineEl || !amountEl || !closingEl || !btnEl) return
    const ctx = fx.getContext('2d')
    if (!ctx) return

    setPile(null)
    pileEvents.current = { settled: false, cleared: false, drained: 0 }

    // ---- canvas sizing ----
    let size = { w: wrap.clientWidth, h: wrap.clientHeight }
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      size = { w: wrap.clientWidth, h: wrap.clientHeight }
      fx.width = Math.max(1, Math.round(size.w * dpr))
      fx.height = Math.max(1, Math.round(size.h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    // the tease lines' real heights (the subheader may wrap) — measured on change, not per frame
    const teaseH = { head: teaseEl.offsetHeight, sub: teaseSubEl.offsetHeight }
    const teaseRo = new ResizeObserver(() => {
      teaseH.head = teaseEl.offsetHeight
      teaseH.sub = teaseSubEl.offsetHeight
    })
    teaseRo.observe(teaseEl)
    teaseRo.observe(teaseSubEl)
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    // ---- audio ----
    const mk = (src: string, loop = false) => {
      const el = new Audio(src)
      el.preload = 'auto'
      el.loop = loop
      return el
    }
    const sfx = { pour: mk(pourUrl), ticker: mk(tickerUrl, true), chaChing: mk(chaChingUrl) }
    const play = (el: HTMLAudioElement, on: boolean) => {
      const cfg = cfgRef.current
      if (!cfg.sound || !on) return
      el.volume = clamp(cfg.volume, 0, 1)
      el.currentTime = 0
      el.play().catch(() => {})
    }
    const c0 = cfgRef.current
    const musicKeys = Object.keys(GEM_MUSIC) as (keyof typeof GEM_MUSIC)[]
    const musicKey =
      c0.musicTrack === 'off'
        ? null
        : c0.musicTrack === 'random'
          ? musicKeys[Math.floor(Math.random() * musicKeys.length)]
          : c0.musicTrack
    const music = musicKey ? mk(GEM_MUSIC[musicKey].url, c0.musicLoop) : null
    musicRef.current = { el: music, playing: false }
    let musicTimer = 0
    // confetti cues, on the loop's clock (so `paused` holds them too)
    let teaseConfettiAt = -1
    let impactConfettiAt = -1
    const startMusic = () => {
      if (!music) return
      window.clearTimeout(musicTimer)
      musicTimer = window.setTimeout(() => {
        const cfg = cfgRef.current
        if (!cfg.sound) return
        music.volume = clamp(cfg.musicVolume, 0, 1)
        music.loop = cfg.musicLoop
        music.currentTime = 0
        music.play().catch(() => {})
        musicRef.current.playing = true
      }, Math.max(0, cfgRef.current.musicDelay) * 1000)
    }

    // ---- state ----
    let state: GoldRevealState = 'armed'
    let t = 0
    let st = 0 // seconds in the current state (reset in setState)
    let revealAt = -1
    let impactPendingAt = -1
    let landedAt = -1
    let impactAt = -1
    let impactStarAngles: number[] = []
    let pileRun = 0
    const seen = { ...sig.current }
    const drained = () => (pileEvents.current.cleared ? 1 : pileEvents.current.drained)
    const setState = (s: GoldRevealState) => {
      state = s
      st = 0
      onStateRef.current?.(s)
      const cfg = cfgRef.current
      if (s === 'tease') {
        if (cfg.musicStart === 'start') startMusic()
        if (cfg.teaseConfetti !== 'off') teaseConfettiAt = t + cfg.teaseInDelay + Math.max(0, cfg.teaseConfettiDelay)
      }
      if (s === 'pour') {
        const p = goldPile(cfg, size.w, size.h)
        pileRun++
        pileEvents.current = { settled: false, cleared: false, drained: 0 }
        setPile({ run: pileRun, ...p })
        play(sfx.pour, cfg.pourSound)
      }
      if (s === 'drain') {
        setDump((d) => d + 1)
        if (cfg.musicStart === 'drain') startMusic()
      }
      if (s === 'count') {
        revealAt = t
        impactPendingAt = t + Math.max(0, cfg.impactDelay)
        play(sfx.ticker, cfg.countSound)
      }
      if (s === 'landed') {
        // the count is done: the ticker stops and the shop push comes in
        landedAt = t
        sfx.ticker.pause()
      }
    }
    // the impact — fired with the reveal (+ impactDelay), while the count keeps running
    const fireImpact = () => {
      const cfg = cfgRef.current
      impactAt = t
      // the impact starburst's stroke angles, fixed for this impact
      {
          const n = Math.max(1, Math.round(cfg.impactStarStrokes))
          const rot = (cfg.impactStarRotate * Math.PI) / 180
          impactStarAngles = Array.from({ length: n }, (_, i) =>
            cfg.impactStarLayout === 'random' ? Math.random() * TAU : rot - Math.PI / 2 + (i * TAU) / n,
          )
        }
      play(sfx.chaChing, cfg.impactSound)
      if (cfg.musicStart === 'impact') startMusic()
      if (cfg.impactConfetti !== 'off') impactConfettiAt = t + Math.max(0, cfg.impactConfettiDelay)
    }
    onStateRef.current?.('armed')
    if (autoStartRef.current) setState('tease')

    // springs
    let teaseS = c0.teaseFromScale
    let teaseSV = 0
    let teaseR = c0.teaseFromRotate
    let teaseRV = 0
    let subS = c0.teaseFromScale
    let subSV = 0
    let subR = c0.teaseFromRotate
    let subRV = 0
    let btnS = c0.buttonFromScale
    let btnSV = 0
    let btnR = c0.buttonFromRotate
    let btnRV = 0
    let btnO = 0
    let shownValue = NaN

    // per-frame style writes go through here: a value is only written when it
    // changes, so a settled screen stops touching the DOM (cheaper on mobile)
    const styleMemo = new Map<HTMLElement, Record<string, string>>()
    const css = (el: HTMLElement, prop: string, value: string) => {
      let m = styleMemo.get(el)
      if (!m) styleMemo.set(el, (m = {}))
      if (m[prop] === value) return
      m[prop] = value
      el.style.setProperty(prop, value)
    }
    let fxDirty = true // the fx canvas only needs clearing once something has been drawn on it

    let raf = 0
    let lastNow = performance.now()
    const loop = (now: number) => {
      const dt = Math.min((now - lastNow) / 1000, 1 / 30)
      lastNow = now
      const cfg = cfgRef.current
      const live = !pausedRef.current
      if (live) {
        t += dt
        st += dt
      }

      // ---- signals ----
      if (sig.current.start !== seen.start) {
        seen.start = sig.current.start
        if (state === 'armed') setState('tease')
      }
      if (sig.current.drain !== seen.drain) {
        seen.drain = sig.current.drain
        if (state === 'pour' || state === 'piled') setState('drain')
      }

      // ---- impact (with the reveal) ----
      if (impactPendingAt >= 0 && t >= impactPendingAt) {
        impactPendingAt = -1
        fireImpact()
      }

      // ---- confetti cues ----
      if (teaseConfettiAt >= 0 && t >= teaseConfettiAt) {
        teaseConfettiAt = -1
        setTeaseFire((n) => n + 1)
      }
      if (impactConfettiAt >= 0 && t >= impactConfettiAt) {
        impactConfettiAt = -1
        setImpactFire((n) => n + 1)
      }

      // ---- transitions ----
      if (live) {
        if (state === 'tease' && st >= cfg.teaseInDelay + cfg.teaseHold) setState('pour')
        else if (state === 'pour') {
          if (pileEvents.current.settled) setState('piled')
          else if (cfg.autoDrain && cfg.drainMaxWait > 0 && st >= cfg.drainMaxWait) setState('drain')
        } else if (state === 'piled' && cfg.autoDrain && st >= cfg.drainDelay) setState('drain')
        else if (state === 'drain') {
          if (st >= cfg.countDelay && drained() >= cfg.revealAtCleared) setState('count')
        } else if (state === 'count') {
          // the impact waits for the pile to (mostly) clear — never under the gold.
          // A safety cap stops a stuck bar from holding it forever.
          if (st >= cfg.countDuration && (drained() >= cfg.landAtCleared || st >= cfg.countDuration + 3)) setState('landed')
        }
      }
      const sinceImpact = impactAt >= 0 ? t - impactAt : -1
      const sinceLanded = landedAt >= 0 ? t - landedAt : -1
      const cx = size.w / 2
      const cy = size.h / 2 + cfg.revealOffsetY

      // ---- tease: pops in, buried by the pour, fades ----
      {
        let k = 0
        const teaseT = state === 'tease' ? st : -1
        if (state === 'tease') k = smooth(cfg.teaseInDelay, cfg.teaseInDelay + cfg.teaseFade, teaseT)
        else if (state === 'pour' || state === 'piled') {
          const pourT = state === 'pour' ? st : cfg.teaseOutDelay + cfg.teaseFade
          k = 1 - smooth(cfg.teaseOutDelay, cfg.teaseOutDelay + cfg.teaseFade, pourT)
        }
        // the subheader pops in its own beat later, on the same spring
        const subAt = cfg.teaseInDelay + Math.max(0, cfg.teaseSubDelay)
        let kSub = 0
        if (state === 'tease') kSub = smooth(subAt, subAt + cfg.teaseFade, teaseT)
        else if (state === 'pour' || state === 'piled') kSub = k
        if (live && state === 'tease') {
          if (teaseT >= cfg.teaseInDelay) {
            const fS = -cfg.teaseStiffness * (teaseS - 1) - cfg.teaseDamping * teaseSV
            teaseSV += fS * dt
            teaseS += teaseSV * dt
            const fR = -cfg.teaseStiffness * (teaseR - cfg.teaseRotate) - cfg.teaseDamping * teaseRV
            teaseRV += fR * dt
            teaseR += teaseRV * dt
          }
          if (teaseT >= subAt) {
            const fS = -cfg.teaseStiffness * (subS - 1) - cfg.teaseDamping * subSV
            subSV += fS * dt
            subS += subSV * dt
            const fR = -cfg.teaseStiffness * (subR - cfg.teaseRotate) - cfg.teaseDamping * subRV
            subRV += fR * dt
            subR += subRV * dt
          }
        } else if (state === 'armed') {
          teaseS = subS = cfg.teaseFromScale
          teaseR = subR = cfg.teaseFromRotate
          teaseSV = teaseRV = subSV = subRV = 0
        }
        // The headline arrives alone at the centre; as the subheader comes in it
        // slides up so the pair ends up centred together (measured heights, so a
        // wrapped subheader still centres).
        const hasSub = cfg.teaseSubText.trim() !== ''
        let slide = 0
        if (hasSub) {
          if (state === 'tease') {
            const u = clamp((teaseT - subAt) / Math.max(0.01, cfg.teaseSlideTime), 0, 1)
            slide = 1 - Math.pow(1 - u, 3)
          } else if (state !== 'armed') slide = 1
        }
        const pairShift = (cfg.teaseSubGap + teaseH.sub) / 2
        const headY = -pairShift * slide
        const subY = headY + teaseH.head / 2 + cfg.teaseSubGap + teaseH.sub / 2 + (1 - kSub) * 12 // rises in
        css(teaseEl, 'opacity', k.toFixed(3))
        css(teaseEl, 'font-size', `${cfg.teaseSize}px`)
        css(teaseEl, 'transform-origin', 'center center')
        css(teaseEl, 'transform', `translate(-50%, -50%) translate(0px, ${headY.toFixed(1)}px) scale(${teaseS.toFixed(4)}) rotate(${teaseR.toFixed(2)}deg)`)
        css(teaseSubEl, 'opacity', (hasSub ? kSub : 0).toFixed(3))
        css(teaseSubEl, 'font-size', `${cfg.teaseSubSize}px`)
        css(teaseSubEl, 'transform-origin', 'center center')
        css(teaseSubEl, 'transform', `translate(-50%, -50%) translate(0px, ${subY.toFixed(1)}px) scale(${subS.toFixed(4)}) rotate(${subR.toFixed(2)}deg)`)
      }

      // ---- impact curve: ease out to the peak, hold, ease slowly back ----
      let impactK = 1
      if (cfg.impact && sinceImpact >= 0) {
        const up = Math.max(0.01, cfg.impactUp)
        const peak = Math.max(0.1, cfg.impactScale)
        if (sinceImpact < up) impactK = lerp(1, peak, 1 - Math.pow(1 - sinceImpact / up, 3))
        else if (sinceImpact < up + cfg.impactHold) impactK = peak
        else impactK = lerp(peak, 1, easeInOut(clamp((sinceImpact - up - cfg.impactHold) / Math.max(0.01, cfg.impactDown), 0, 1)))
      }

      // ---- amount row ----
      {
        // scale in (ease-out-back) near the end of the drain, as the count starts
        const sinceReveal = revealAt >= 0 ? t - revealAt : -1
        const dur = Math.max(0.01, cfg.revealFade)
        const k = sinceReveal >= 0 ? smooth(0, dur * 0.5, sinceReveal) : 0
        const u = sinceReveal >= 0 ? clamp(sinceReveal / dur, 0, 1) : 0
        const back = cfg.revealOvershoot
        const eb = 1 + (back + 1) * Math.pow(u - 1, 3) + back * Math.pow(u - 1, 2)
        const scaleIn = lerp(cfg.revealFromScale, 1, eb)
        let value = cfg.countFrom
        if (state === 'count') {
          const u = clamp(st / Math.max(0.01, cfg.countDuration), 0, 1)
          value = lerp(cfg.countFrom, cfg.amount, 1 - Math.pow(1 - u, Math.max(1, cfg.countEasePower)))
        } else if (state === 'landed') value = cfg.amount
        const rounded = Math.round(value)
        if (rounded !== shownValue) {
          shownValue = rounded
          amountEl.textContent = fmt(rounded)
        }
        // the icon pulses; the heading + amount ride its edges
        const iconPx = goldIconPx(cfg)
        const half = (iconPx / 2) * impactK * scaleIn
        const op = k.toFixed(3)
        const sIn = scaleIn.toFixed(4)
        css(iconEl, 'opacity', op)
        css(iconEl, 'width', `${iconPx.toFixed(1)}px`)
        css(iconEl, 'height', `${iconPx.toFixed(1)}px`)
        // after the impact swell settles: a looping pulse on the icon alone (the text stays put)
        let loopK = 1
        if (cfg.iconLoop && sinceImpact >= 0) {
          const loopAt = (cfg.impact ? cfg.impactUp + cfg.impactHold + cfg.impactDown : 0) + Math.max(0, cfg.iconLoopDelay)
          const lt = sinceImpact - loopAt
          if (lt > 0) {
            const ease = smooth(0, 0.5, lt) // eases in, no jump
            loopK = 1 + cfg.iconLoopScale * ease * (0.5 - 0.5 * Math.cos(TAU * cfg.iconLoopSpeed * lt))
          }
        }
        css(iconEl, 'transform', `translate(-50%, -50%) translate(0px, ${cfg.revealOffsetY}px) scale(${(impactK * scaleIn * loopK).toFixed(4)})`)
        css(headerEl, 'opacity', op)
        css(headerEl, 'transform-origin', 'center bottom')
        css(headerEl, 'font-size', `${cfg.headerSize}px`)
        css(headerEl, 'transform', `translate(-50%, -100%) translate(0px, ${(cfg.revealOffsetY - half - cfg.headerGap).toFixed(1)}px) rotate(${cfg.textTilt}deg) scale(${sIn})`)
        css(amountLineEl, 'opacity', op)
        css(amountLineEl, 'transform-origin', 'center top')
        css(amountLineEl, 'transform', `translate(-50%, 0) translate(0px, ${(cfg.revealOffsetY + half + cfg.amountGap).toFixed(1)}px) rotate(${cfg.textTilt}deg) scale(${sIn})`)
      }

      // ---- fx canvas: glow, white burst, ring (all behind the amount) ----
      if (fxDirty || sinceImpact >= 0) ctx.clearRect(0, 0, size.w, size.h)
      fxDirty = sinceImpact >= 0
      if (sinceImpact >= 0) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        if (cfg.glow) {
          const on = smooth(0, 0.4, sinceImpact)
          const pulse = cfg.glowPulse > 0 ? 0.85 + 0.15 * Math.sin(TAU * cfg.glowPulse * sinceImpact) : 1
          const a = clamp(cfg.glowIntensity * on * pulse, 0, 1)
          const r = Math.max(10, cfg.glowSize * size.h) * impactK
          const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
          grd.addColorStop(0, hexToRgba(cfg.glowColor, a))
          grd.addColorStop(0.5, hexToRgba(cfg.glowColor, a * 0.35))
          grd.addColorStop(1, hexToRgba(cfg.glowColor, 0))
          ctx.fillStyle = grd
          ctx.fillRect(0, 0, size.w, size.h)
        }
        if (cfg.impact && cfg.impactFlash > 0) {
          const k = 1 - clamp(sinceImpact / Math.max(0.01, cfg.impactFlashDecay), 0, 1)
          if (k > 0) {
            const r = Math.max(10, cfg.impactFlashSize * size.h) * lerp(0.6, 1, 1 - k * k)
            const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
            const a = clamp(cfg.impactFlash * k * k, 0, 1)
            grd.addColorStop(0, hexToRgba('#ffffff', a))
            grd.addColorStop(0.35, hexToRgba('#ffffff', a * 0.45))
            grd.addColorStop(1, hexToRgba('#ffffff', 0))
            ctx.fillStyle = grd
            ctx.fillRect(0, 0, size.w, size.h)
          }
        }
        if (cfg.impact && cfg.impactStar > 0 && impactStarAngles.length) {
          // starburst: strokes fly out from the icon's edge, shortening + thinning + fading — one path
          const u = sinceImpact / Math.max(0.01, cfg.impactStarDuration)
          if (u < 1) {
            const e = 1 - Math.pow(1 - u, 3)
            const r0 = goldIconPx(cfg) * 0.38
            const head = r0 + cfg.impactStarRadius * e
            const tail = Math.max(r0 * 0.8, head - cfg.impactStarLength * (1 - u * 0.7))
            ctx.globalAlpha = clamp(cfg.impactStar * Math.pow(1 - u, 1.5), 0, 1)
            ctx.strokeStyle = cfg.impactStarColor
            ctx.lineWidth = Math.max(0.5, cfg.impactStarWidth * (1 - u * 0.6))
            ctx.lineCap = 'round'
            ctx.beginPath()
            for (const a of impactStarAngles) {
              const ca = Math.cos(a)
              const sa = Math.sin(a)
              ctx.moveTo(cx + ca * tail, cy + sa * tail)
              ctx.lineTo(cx + ca * head, cy + sa * head)
            }
            ctx.stroke()
            ctx.globalAlpha = 1
          }
        }
        if (cfg.impact && cfg.impactRing) {
          const u = clamp(sinceImpact / Math.max(0.01, cfg.impactRingDuration), 0, 1)
          if (u < 1) {
            const e = 1 - Math.pow(1 - u, 3)
            const r0 = goldIconPx(cfg) * 0.42
            ctx.strokeStyle = hexToRgba(cfg.impactRingColor, cfg.impactRingOpacity * (1 - u))
            ctx.lineWidth = Math.max(0.5, cfg.impactRingWidth * (1 - u * 0.7))
            ctx.beginPath()
            ctx.arc(cx, cy, r0 + cfg.impactRingSize * e, 0, TAU)
            ctx.stroke()
          }
        }
        ctx.restore()
      }

      // ---- shop push: closing line + button, hung under the (swelling) row ----
      {
        // the block sits at the bottom (in normal flow: line, then button); only the
        // fade / slide / spring are driven here
        css(shopEl, 'bottom', `calc(${cfg.shopBottom}px + env(safe-area-inset-bottom, 0px))`)
        // the shop push waits for the count to finish
        const ck = sinceLanded >= 0 ? smooth(cfg.closingDelay, cfg.closingDelay + cfg.closingFade, sinceLanded) : 0
        css(closingEl, 'opacity', ck.toFixed(3))
        css(closingEl, 'font-size', `${cfg.closingSize}px`)
        css(closingEl, 'max-width', cfg.closingMaxWidth > 0 ? `min(${cfg.closingMaxWidth}px, 100%)` : '100%')
        css(closingEl, 'transform', `translateY(${((1 - ck) * 8).toFixed(1)}px)`)

        if (cfg.button && sinceLanded >= cfg.buttonDelay) {
          if (live) {
            const m = Math.max(0.05, cfg.buttonMass)
            const fS = -cfg.buttonStiffness * (btnS - 1) - cfg.buttonDamping * btnSV
            btnSV += (fS / m) * dt
            btnS += btnSV * dt
            const fR = -cfg.buttonStiffness * (btnR - cfg.buttonRotate) - cfg.buttonDamping * btnRV
            btnRV += (fR / m) * dt
            btnR += btnRV * dt
            btnO = Math.min(1, btnO + dt / 0.15)
          }
        } else if (sinceLanded < 0) {
          btnS = cfg.buttonFromScale
          btnR = cfg.buttonFromRotate
          btnSV = btnRV = 0
          btnO = 0
        }
        const fs = 14 * Math.max(0.2, cfg.buttonSize)
        css(btnEl, 'margin-top', `${cfg.buttonGap}px`)
        css(btnEl, '--gem-btn-fs', `${fs.toFixed(2)}px`)
        css(btnEl, 'opacity', (cfg.button ? btnO : 0).toFixed(3))
        css(btnEl, 'pointer-events', cfg.button && btnO > 0.5 ? 'auto' : 'none')
        css(btnEl, 'transform', `scale(${btnS.toFixed(4)}) rotate(${btnR.toFixed(2)}deg)`)
      }

      raf =requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      teaseRo.disconnect()
      window.clearTimeout(musicTimer)
      for (const el of Object.values(sfx)) {
        el.pause()
        el.src = ''
      }
      if (music) {
        music.pause()
        music.src = ''
      }
      musicRef.current = { el: null, playing: false }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey])

  // live mute / volume for the soundtrack
  useEffect(() => {
    const m = musicRef.current
    if (!m.el) return
    m.el.volume = clamp(c.musicVolume, 0, 1)
    m.el.loop = c.musicLoop
    if (!c.sound) m.el.pause()
    else if (m.playing) m.el.play().catch(() => {})
  }, [c.sound, c.musicVolume, c.musicLoop])

  // the pile: Particle Rain's approved burst + floor + collisions, sized to the stage
  const rainConfig: Partial<ParticleRainConfig> | null = pile
    ? {
        mode: 'burst',
        count: pile.count,
        particleSize: pile.size,
        autoScale: false,
        burstWindow: c.pourDuration,
        burstEasePower: c.pourEase,
        burstSpeedStart: c.pourSpeedStart,
        spawnWidth: 1,
        spawnHeight: c.spawnHeight,
        gravity: c.gravity,
        velocityYMin: Math.min(c.dropSpeedMin, c.dropSpeedMax),
        velocityYMax: Math.max(c.dropSpeedMin, c.dropSpeedMax),
        terminalVelocity: c.terminalVelocity,
        floor: 'bounce',
        restitution: c.bounce,
        collideRestitution: c.bounce,
        collide: true,
        walls: true,
        asset: c.barAsset,
        scaleMin: c.barScaleMin,
        scaleMax: Math.max(c.barScaleMin, c.barScaleMax),
        dumpStagger: c.drainStagger,
        dumpStaggerEnd: c.drainStaggerEnd,
        dumpMode: c.drainMode === 'smooth' ? 'sequenced' : 'physics',
        dumpSequenceTime: c.drainFrontTime,
        dumpSequencePower: c.drainFrontPower,
        dumpReleaseJitter: c.drainReleaseJitter,
        dumpDrift: c.drainDrift,
        dumpSpin: c.drainSpin,
        dumpGravityStart: c.drainGravityStart,
        dumpGravityEnd: c.drainGravityEnd,
        dumpRampTime: c.drainRampTime,
        dumpRampPower: c.drainRampPower,
        forceSleepAfter: Math.max(0.05, c.settleTime),
      }
    : null

  const teaseConfetti = goldConfettiConfig(c, 'tease')
  const impactConfetti = goldConfettiConfig(c, 'impact')

  return (
    <div ref={wrapRef} className='gold-reveal'>
      <canvas ref={fxRef} className='gold-reveal__fx' />
      {teaseConfetti && (
        <Confetti
          key={`${runKey}:tease:${c.teaseConfetti}`}
          runKey={`${runKey}:tease:${c.teaseConfetti}`}
          config={teaseConfetti}
          fireSignal={teaseFire}
          paused={paused}
          intensity={c.teaseConfettiAmount}
        />
      )}
      {impactConfetti && (
        <Confetti
          key={`${runKey}:impact:${c.impactConfetti}`}
          runKey={`${runKey}:impact:${c.impactConfetti}`}
          config={impactConfetti}
          fireSignal={impactFire}
          paused={paused}
          intensity={c.impactConfettiAmount}
        />
      )}
      <div ref={teaseRef} className='gold-reveal__text gold-reveal__tease'>
        {c.teaseText}
      </div>
      <div ref={teaseSubRef} className='gold-reveal__text gold-reveal__tease-sub'>
        {c.teaseSubText}
      </div>
      <div ref={headerRef} className='gold-reveal__piece gold-reveal__caps' style={{ color: c.headerColor }}>
        {c.headerText}
      </div>
      <div ref={iconRef} className='gold-reveal__piece gold-reveal__icon'>
        <img src={goldbarUrl} alt='' draggable={false} />
      </div>
      <div ref={amountLineRef} className='gold-reveal__piece gold-reveal__caps gold-reveal__amount-line'>
        <span className='gold-reveal__amount' style={{ fontSize: c.amountSize, color: c.amountColor }}>
          {/* the final value sizes the box, so the line doesn't shift as it counts */}
          <span className='gold-reveal__amount-ghost' aria-hidden='true'>
            {fmt(c.amount)}
          </span>
          <span ref={amountRef} className='gold-reveal__amount-live'>
            {fmt(c.countFrom)}
          </span>
        </span>
        {c.amountLabel.trim() && (
          <span className='gold-reveal__label' style={{ fontSize: c.labelSize, color: c.labelColor }}>
            {c.amountLabel}
          </span>
        )}
      </div>
      {/* shop push: its own block, anchored to the bottom of the screen */}
      <div ref={shopRef} className='gold-reveal__shop'>
        <div ref={closingRef} className='gold-reveal__closing'>
          {c.closingText}
        </div>
        <div ref={btnRef} className='gem-reveal__btn gold-reveal__btn'>
          <FoldableButton onClick={onShop}>{c.buttonText}</FoldableButton>
        </div>
      </div>
      {pile && rainConfig && (
        <div className='gold-reveal__pile'>
          <ParticleRain
            key={`${runKey}:${pile.run}`}
            runKey={`${runKey}:${pile.run}`}
            config={rainConfig}
            paused={paused}
            dumpSignal={dump}
            onSettled={() => (pileEvents.current.settled = true)}
            onCleared={() => (pileEvents.current.cleared = true)}
            onDrain={(gone, total) => (pileEvents.current.drained = total > 0 ? gone / total : 1)}
          />
        </div>
      )}
    </div>
  )
}
