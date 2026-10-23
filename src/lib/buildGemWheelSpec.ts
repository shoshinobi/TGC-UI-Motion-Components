import { WHEEL_LABEL, WHEEL_ORDER, type GemWheelConfig } from '@/components/GemWheel'

const r = (v: number) => Math.round(v * 1000) / 1000

/** Framework-neutral tokens for the Gem Wheel sequence. */
export function buildGemWheelJsonSpec(c: GemWheelConfig): string {
  const colorOf: Record<string, string> = {
    notable: c.gcNotable,
    renowned: c.gcRenowned,
    storied: c.gcStoried,
    illustrious: c.gcIllustrious,
    mythic: c.gcMythic,
    holyGrail: c.gcHolyGrail,
  }
  return JSON.stringify(
    {
      name: 'gem-wheel',
      result: { finalGrade: c.finalGrade, note: 'preset by the app before the spin' },
      states: ['armed', 'found', 'lineup', 'ready', 'spinning', 'stopping', 'landed'],
      gems: WHEEL_ORDER.map((g, i) => ({
        grade: g,
        label: WHEEL_LABEL[g],
        hex: colorOf[g],
        sizePx: r(c.gemSize * Math.pow(1 - c.sizeStep, 5 - i)),
      })),
      gemsNote: 'bottom → top in the line-up; Holy Grail = gemSize, each grade down × (1 − sizeStep); each keeps its own size all the way round the drum',
      found: {
        color: c.foundColor,
        sizePx: r(c.gemSize * c.foundScale),
        entry: {
          fromBelowPx: c.entryDistance,
          spring: { stiffness: c.entryStiffness, damping: c.entryDamping, mass: c.entryMass },
        },
        autoLineupAfterSec: c.autoLineupAfter || 'trigger',
        flashOnArrival: c.foundFlash ? { delaySec: c.foundFlashDelay } : false,
        note: 'a live, spinning Lottie (full frame rate)',
      },
      jet: c.jet
        ? {
            color: c.jetColor,
            tracks: Math.round(c.jetTracks),
            trackWidthPx: c.jetTrackWidth,
            spacingPx: c.jetSpacing,
            lengthPx: c.jetLength,
            taper: c.jetTaper,
            opacity: { atGem: c.jetOpacityStart, atTail: c.jetOpacityEnd },
            retract: { afterReachingCentreSec: c.jetFadeDelay, durationSec: c.jetFadeDuration, direction: 'tail → head (head pinned to the gem)' },
          }
        : false,
      warp: c.warp
        ? {
            count: Math.round(c.warpCount),
            speed: `wheel speed × slot spacing × ${c.warpSpeedScale} (± ${c.warpSpeedVar})`,
            direction: 'with the gems',
            lengthPx: c.warpLength,
            widthPx: c.warpWidth,
            color: c.warpColor,
            colorVariation: c.warpColorVar,
            opacity: c.warpOpacity,
            opacityVariation: c.warpOpacityVar,
            intensity: `|wheel speed| / cruise, eased over ${c.warpFade}s`,
          }
        : false,
      text: {
        first: c.text,
        prompt: c.promptText || null,
        sizePx: c.textSize,
        inDelaySec: c.textInDelay,
        fadeSec: c.textFade,
        outDelayAfterLineupStartsSec: c.textOutDelay,
        promptInAfterLineupSec: c.promptDelay,
      },
      lineup: {
        foundGem: { durationSec: c.lineupDuration, ease: c.lineupEase, note: 'shrinks + slides into the Notable slot, white → Notable' },
        drop: { staggerSec: c.dropStagger, spring: { stiffness: c.dropStiffness, damping: c.dropDamping } },
        autoSpinAfterSec: c.autoSpinAfter || 'swipe / trigger',
      },
      strip: {
        slots: 6 * Math.max(1, Math.round(c.repeats)),
        spacing: c.lineupFit
          ? { fit: true, marginPx: c.lineupMargin, note: "Holy Grail's top point and Notable's bottom point both marginPx from the stage edges; equal spacing between" }
          : { fit: false, slotSpacingPx: c.slotSpacing, lineupCenterSlot: c.lineupCenter },
        fadeBeyondLineupSlots: c.fadeSlots,
        placement:
          'flat, equal spacing (no fake 3D): d = slot offset from the centre (wrapped round the loop); y = cy − d·pitch; full strength across the line-up span, alpha = 1 − smoothstep(0, fadeSlots, slots beyond either end)',
      },
      spin: {
        auto: { direction: c.spinDirection, cruiseSlotsPerSec: c.cruiseSpeed, easeInSec: c.spinUpDuration },
        flick: { gain: c.flickGain, minSlotsPerSec: c.flickMin, maxSlotsPerSec: c.flickMax, thresholdPxPerSec: c.flickThreshold },
        holdSec: c.spinDuration,
      },
      stop: {
        approxDurationSec: c.stopDuration,
        easeOutPower: c.stopEasePower,
        extraLoops: c.extraLoops,
        overshootSlots: c.overshoot,
        overshootNote: '0.5 = stops right on the division line with the next tier (in the spin direction), then snaps back',
        overshootHoldSec: c.overshootHold,
        snap: { stiffness: c.snapStiffness, damping: c.snapDamping },
        math:
          'D = ω0·stopDuration/n (+6·extraLoops); pick the landing slot ≡ finalGrade (mod 6) whose hold point (slot + dir·overshoot, i.e. PAST it in the travel direction) is ≥ D away; φ(t) = φ0 + dir·D·(1 − (1 − t/T)^n), T = n·D/ω0 (velocity-continuous); hold; spring back onto the slot',
      },
      landing: {
        flash: { delaySec: c.flashDelay, holdSec: c.flashHold, decaySec: c.flashDuration, bloomPx: c.flashBlur },
        othersFadeSec: c.othersFade,
        winnerSizePx: r(c.gemSize * c.winnerScale),
        winnerNote: 'the winner switches to a live, spinning Lottie at the flash (the wheel gems are still)',
        grow: { stiffness: c.growStiffness, damping: c.growDamping },
        glow: c.glow ? { sizePx: c.glowSize, intensity: c.glowIntensity } : false,
        label: c.label
          ? {
              text: c.labelOverride.trim() || 'the landed grade name',
              delayAfterFlashSec: c.labelDelay,
              offsetYPx: c.labelOffsetY,
              size: c.labelSize,
              from: { scale: c.labelFromScale, rotateDeg: c.labelFromRotate },
              settledRotateDeg: c.labelRotate,
              spring: { stiffness: c.labelStiffness, damping: c.labelDamping, mass: c.labelMass },
              impl: 'the Banner design’s folded button, as in Gem Reveal',
            }
          : false,
      },
      audio: {
        sfx: {
          start: 'GemReveal_start.mp3 — on found',
          ambient: c.ambient ? 'GemReveal_ambientLoop.mp3 — loop from found' : false,
          tick: `drip4.ogg — once per slot passing centre, rate ${c.tickPitchMin}→${c.tickPitchMax} with speed, ≤ ${c.tickMaxRate}/s`,
          end: 'GemReveal_end.mp3 — on landing',
          punch: 'GemReveal_punch.mp3 — on the flash',
        },
        music: c.musicTrack === 'off' ? false : { track: c.musicTrack, startsOn: c.musicStart, delaySec: c.musicDelay },
      },
      lineWork: c.lines
        ? { color: c.lineColor, opacity: c.lineOpacity, widthPx: c.lineWidth, slotLineHalfWidthPx: c.lineHalfWidth, fadeTowardEndsFrom: c.lineSideFade, centreArrows: c.bracket ? { halfWidthPx: c.bracketHalfWidth } : false, note: 'straight, evenly spaced horizontal slot lines (no side rails), fading toward their ends and past the line-up ends' }
        : false,
    },
    null,
    2,
  )
}

/** Reference wiring for the state machine + the controlled stop. */
export function buildGemWheelWiringSpec(c: GemWheelConfig): string {
  return `// Gem Wheel — reference wiring (the bench component is src/components/GemWheel.tsx)
//
// <GemWheel
//   config={{ finalGrade: '${c.finalGrade}' }}   // preset by the app
//   startSignal={n}    // armed → found        (bump a counter)
//   lineupSignal={n}   // found → lineup       (or config.autoLineupAfter = seconds)
//   spinSignal={n}     // ready → spinning     (or a vertical swipe, or autoSpinAfter)
//   stopSignal={n}     // spinning → stopping  (or after spinDuration = ${c.spinDuration}s)
//   onState={(s) => …} // 'armed' | 'found' | 'lineup' | 'ready' | 'spinning' | 'stopping' | 'landed'
// />
//
// Landed → bring your next components on once onState('landed') fires (+ the
// flash ≈ ${r(c.flashDelay + c.flashHold + c.flashDuration)}s, the grow spring settles shortly after).

// --- controlled stop: land the preset grade at the centre, with the tease ---
function planStop(phi, omega, gradeIndex /* 0 = Notable … 5 = Holy Grail */) {
  const n = ${c.stopEasePower}, o = ${c.overshoot}
  const dir = Math.sign(omega), w0 = Math.abs(omega)
  const want = (w0 * ${c.stopDuration}) / n + 6 * ${Math.round(c.extraLoops)}
  const target = dir > 0
    ? gradeIndex + 6 * Math.ceil((phi + want - o - gradeIndex) / 6)
    : gradeIndex + 6 * Math.floor((phi - want + o - gradeIndex) / 6)
  const hold = target + dir * o                // carry on PAST the grade in the travel direction
  const D = Math.abs(hold - phi)
  return { phi0: phi, dir, D, T: (n * D) / w0, n, hold, target }
}
// each frame: u = t/T; phi = phi0 + dir·D·(1 − (1 − u)^n)
// at u = 1: hold ${c.overshootHold}s, then spring phi → target (k ${c.snapStiffness}, c ${c.snapDamping})

// --- strip placement (per slot i, ${6 * Math.max(1, Math.round(c.repeats))} slots, grade = i % 6) — flat, equal spacing ---
// fitted pitch: yTop = margin + HGsize·(0.5 − gemTop), yBot = H − margin − NotableSize·(gemBottom − 0.5)
//   (gemTop / gemBottom = the gem's visible top / bottom inside its sprite, 0–1)
//   pitch = (yBot − yTop) / 5;  line-up centre slot = (yBot − H/2) / pitch;  margin = ${c.lineupMargin}px
// d = wrap(i − phi) to ±slots/2;  y = H/2 − d·pitch
// alpha = 1 − smoothstep(0, ${c.fadeSlots}, slots beyond the line-up's ends)
// size(grade) = ${c.gemSize}px × (1 − ${c.sizeStep})^(5 − gradeIndex)   // Holy Grail = ${c.gemSize}px

// --- tick: one drip4.ogg per slot crossing the centre ---
// if (Math.round(phi) !== lastSlot) play(drip, rate = lerp(${c.tickPitchMin}, ${c.tickPitchMax}, |omega| / ${c.cruiseSpeed}))
`
}
