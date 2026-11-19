import { GOLD_REFERENCE_WIDTH, goldConfettiConfig, goldFillLevel, goldIconPx, goldPile, type GoldRevealConfig } from '@/components/GoldReveal'
import { PARTICLE_DEFAULT_CONFIG } from '@/components/ParticleRain'

const r = (v: number) => Math.round(v * 1000) / 1000

/** Framework-neutral tokens for the Gold Reveal sequence. */
export function buildGoldRevealJsonSpec(c: GoldRevealConfig): string {
  const phone = goldPile(c, 390, 760)
  const desktop = goldPile(c, 1100, 760)
  return JSON.stringify(
    {
      name: 'gold-reveal',
      amount: { value: c.amount, countFrom: c.countFrom, note: 'set by the app' },
      states: ['armed', 'tease', 'pour', 'piled', 'drain', 'count', 'landed'],
      tease: {
        text: c.teaseText,
        subheader: c.teaseSubText.trim()
          ? {
              text: c.teaseSubText,
              sizePx: c.teaseSubSize,
              afterHeadlineSec: c.teaseSubDelay,
              gapPx: c.teaseSubGap,
              pop: 'same spring as the headline, rising 12px as it fades in',
              layout: `the headline arrives alone at the centre, then slides up by (gap + subheader height) / 2 over ${c.teaseSlideTime}s (easeOutCubic) — the pair ends centred; heights measured, so a wrapped subheader still centres`,
            }
          : false,
        sizePx: c.teaseSize,
        inDelaySec: c.teaseInDelay,
        fadeSec: c.teaseFade,
        pop: {
          fromScale: c.teaseFromScale,
          fromRotateDeg: c.teaseFromRotate,
          settledRotateDeg: c.teaseRotate,
          spring: { stiffness: c.teaseStiffness, damping: c.teaseDamping, mass: 1 },
        },
        holdBeforePourSec: c.teaseHold,
        fadeOutAfterPourStartsSec: c.teaseOutDelay,
        layer: 'under the pile — it gets buried',
      },
      pile: {
        engine: 'Particle Rain (burst + bounce floor + walls + collide), approved defaults except the keys below',
        fillLevel: r(goldFillLevel(c)),
        fillLevelNote: c.fillByAmount
          ? `scales with amount: ${c.minFillLevel} at 0 → ${c.fillLevel} at ${c.fullAmount}+ (× stage height)`
          : '× stage height (1 = full screen)',
        barCount: 'fillDensity · (w − 2·wallInset) · (h·fillLevel − floorInset) / (2√3 · E[r²])',
        barCountNote: `r = collideRadius (${PARTICLE_DEFAULT_CONFIG.collideRadius}) × barSize/2 × scale; scale uniform ${c.barScaleMin}–${c.barScaleMax}`,
        fillDensity: c.fillDensity,
        barSize: {
          atReferenceWidthPx: c.barSize,
          referenceWidthPx: GOLD_REFERENCE_WIDTH,
          vsWidth: c.barSizeVsWidth,
          formula: `barSize × clamp(1 + (w/${GOLD_REFERENCE_WIDTH} − 1)·${c.barSizeVsWidth}, 0.5, 3)`,
        },
        examples: {
          phone390x760: { barSizePx: r(phone.size), bars: phone.count },
          desktop1100x760: { barSizePx: r(desktop.size), bars: desktop.count },
        },
        rainOverrides: {
          mode: 'burst',
          burstWindow: c.pourDuration,
          burstEasePower: c.pourEase,
          burstSpeedStart: c.pourSpeedStart,
          spawnHeight: c.spawnHeight,
          gravity: c.gravity,
          velocityYMin: c.dropSpeedMin,
          velocityYMax: c.dropSpeedMax,
          terminalVelocity: c.terminalVelocity,
          restitution: c.bounce,
          collideRestitution: c.bounce,
          asset: c.barAsset,
          scaleMin: c.barScaleMin,
          scaleMax: c.barScaleMax,
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
          forceSleepAfter: c.settleTime,
        },
        settleNote: `the pile is frozen ${c.settleTime}s after the last bar is released (a screen-deep pile never fully quietens) → onSettled`,
      },
      drain: {
        trigger: c.autoDrain ? `auto: ${c.drainDelay}s after the pile settles` : 'manual (drainSignal)',
        safetyCapSec: c.autoDrain ? c.drainMaxWait : false,
        how: 'Particle Rain dumpSignal — the floor goes, the pile cascades off the bottom',
        style:
          c.drainMode === 'smooth'
            ? {
                mode: 'smooth (ParticleRain dumpMode: sequenced) — collisions off for the drain',
                release: `bar at height h (0 = bottom of the pile, 1 = top) lets go at ${c.drainFrontTime}s · h^(1/${c.drainFrontPower}) ± ${c.drainReleaseJitter}s`,
                onRelease: `vx ± ${c.drainDrift} px/s, spin ± ${c.drainSpin}°/s, vy 0`,
              }
            : { mode: 'physics — collisions on, each bar lets go once unsupported (stagger below)' },
        ramp: {
          gravity: `× ${c.drainGravityStart} → × ${c.drainGravityEnd} over ${c.drainRampTime}s, eased in (u^${c.drainRampPower})`,
          staggerSec: `${c.drainStagger} → ${c.drainStaggerEnd} on the same curve`,
          formula: 'gMul = start + (end − start) · min(1, t / rampTime)^power; terminal velocity × max(1, gMul)',
        },
      },
      reveal: {
        layout: 'stacked, centred: heading / icon / number + label — heading and amount line ride the icon’s edges as it pulses',
        heading: { text: c.headerText, case: 'upper', sizePx: c.headerSize, color: c.headerColor, gapToIconPx: c.headerGap },
        icon: { file: 'GOLDBAR_X3.svg', sizePx: r(goldIconPx(c)), sizeXHeadingText: c.iconScale, offsetFromCentrePx: c.revealOffsetY },
        amountLine: {
          gapBelowIconPx: c.amountGap,
          number: { sizePx: c.amountSize, color: c.amountColor, numerals: 'tabular', format: 'en-US' },
          label: { text: c.amountLabel, case: 'upper', sizePx: c.labelSize, color: c.labelColor },
        },
        type: { style: 'italic', weight: 500, tiltDeg: c.textTilt },
        scaleIn: {
          onceDrained: c.revealAtCleared,
          earliestAfterFloorSec: c.countDelay,
          durationSec: c.revealFade,
          fromScale: c.revealFromScale,
          ease: `easeOutBack (overshoot ${c.revealOvershoot}); opacity in over the first half`,
          note: 'icon + heading + amount line scale in together; the count starts with it',
        },
        count: {
          startsWith: 'the scale-in',
          impactWaitsUntilDrained: c.landAtCleared,
          drainedNote: 'share of the bars gone off the bottom (ParticleRain onDrain); the count holds its final digits until the impact',
          durationSec: c.countDuration,
          ease: `1 − (1 − u)^${c.countEasePower}`,
          format: 'en-US thousands separators',
        },
      },
      impact: c.impact
        ? {
            at: `with the reveal (text + icon scaling in) + ${c.impactDelay}s — flash, ring, starburst, swell, glow, chaChing, impact confetti; the count keeps running past it`,
            peakScale: c.impactScale,
            upSec: c.impactUp,
            upEase: 'easeOutCubic',
            holdSec: c.impactHold,
            downSec: c.impactDown,
            downEase: 'easeInOut',
            whiteBurst: c.impactFlash > 0 ? { opacity: c.impactFlash, radiusXHeight: c.impactFlashSize, fadeSec: c.impactFlashDecay } : false,
            ring: c.impactRing
              ? { color: c.impactRingColor, travelPx: c.impactRingSize, widthPx: c.impactRingWidth, opacity: c.impactRingOpacity, durationSec: c.impactRingDuration }
              : false,
            target: 'GOLDBAR_X3 icon (burst + ring centred on it)',
            starburst:
              c.impactStar > 0
                ? {
                    intensity: c.impactStar,
                    strokes: c.impactStarStrokes,
                    distribution: c.impactStarLayout === 'even' ? `even (clock), rotated ${c.impactStarRotate}°` : 'random',
                    fromIconEdge: '0.38 × icon size',
                    radiusPx: c.impactStarRadius,
                    strokeLengthPx: c.impactStarLength,
                    strokeWidthPx: c.impactStarWidth,
                    durationSec: c.impactStarDuration,
                    color: c.impactStarColor,
                    motion: 'head = r0 + radius·easeOutCubic(u); tail = head − length·(1 − 0.7u); width × (1 − 0.6u); alpha = intensity·(1 − u)^1.5; additive',
                  }
                : false,
          }
        : false,
      glow: c.glow ? { color: c.glowColor, radiusXHeight: c.glowSize, intensity: c.glowIntensity, pulseHz: c.glowPulse } : false,
      iconLoop: c.iconLoop
        ? {
            startsSec: 'after the impact swell settles' + (c.iconLoopDelay ? ` + ${c.iconLoopDelay}s` : ''),
            scale: `× (1 + ${c.iconLoopScale} · (0.5 − 0.5·cos(2π·${c.iconLoopSpeed}·t))), eased in over 0.5s`,
            note: 'the icon only — the heading + amount line stay put',
          }
        : false,
      shopPush: {
        block: `its own container, anchored ${c.shopBottom}px (+ safe-area inset) from the bottom of the screen; line, then the button`,
        closing: { text: c.closingText, sizePx: c.closingSize, maxWidthPx: c.closingMaxWidth || 'screen', wrap: 'balanced', delayAfterCountSec: c.closingDelay, fadeSec: c.closingFade },
        button: c.button
          ? {
              text: c.buttonText,
              gapPx: c.buttonGap,
              delayAfterCountSec: c.buttonDelay,
              size: c.buttonSize,
              fromScale: c.buttonFromScale,
              fromRotateDeg: c.buttonFromRotate,
              settledRotateDeg: c.buttonRotate,
              spring: { stiffness: c.buttonStiffness, damping: c.buttonDamping, mass: c.buttonMass },
              action: 'open the Grail Shop',
            }
          : false,
      },
      celebration: {
        tease:
          c.teaseConfetti === 'off'
            ? false
            : { style: c.teaseConfetti, afterTeasePopsInSec: c.teaseConfettiDelay, amount: c.teaseConfettiAmount, config: goldConfettiConfig(c, 'tease') },
        impact:
          c.impactConfetti === 'off'
            ? false
            : { style: c.impactConfetti, afterImpactSec: c.impactConfettiDelay, amount: c.impactConfettiAmount, config: goldConfettiConfig(c, 'impact') },
        note: 'each cue = <Confetti config={…} intensity={amount} fireSignal /> behind the reveal text',
      },
      audio: c.sound
        ? {
            volume: c.volume,
            pour: c.pourSound ? 'dailyGold.mp3 on pour' : false,
            count: c.countSound ? 'GemReveal_ticker.mp3 (looped) during the count' : false,
            impact: c.impactSound ? 'chaChing.mp3 on impact' : false,
            music:
              c.musicTrack === 'off'
                ? false
                : { track: c.musicTrack, volume: c.musicVolume, loop: c.musicLoop, startsOn: c.musicStart, delaySec: c.musicDelay },
          }
        : false,
    },
    null,
    2,
  )
}

/** Wiring reference — how the app drives it. */
export function buildGoldRevealWiringSpec(c: GoldRevealConfig): string {
  return `// Gold Reveal — wiring reference
//
// <GoldReveal
//   config={{ amount: ${c.amount} }}       // set by the app
//   startSignal={n}    // armed → tease           (bump a counter)
//   drainSignal={n}    // pull the floor out now  (${c.autoDrain ? `or automatic, ${c.drainDelay}s after the pile settles` : 'auto drain is OFF — the app must send this'})
//   onState={(s) => …} // 'armed' | 'tease' | 'pour' | 'piled' | 'drain' | 'count' | 'landed'
//   onShop={() => openGrailShop()}
// />
//
// Timeline (auto): tease ${c.teaseInDelay}s + ${c.teaseHold}s → pour (${c.pourDuration}s release + ${c.settleTime}s settle)
//   → hold ${c.drainDelay}s → drain → icon + text scale in and the count starts once ${Math.round(c.revealAtCleared * 100)}% drained (≥${c.countDelay}s), count ${c.countDuration}s
//   → the IMPACT fires with the reveal (+${c.impactDelay}s): flash, ring, starburst, swell, chaChing
//   → the count runs on (${c.countDuration}s); it ends once done AND ${Math.round(c.landAtCleared * 100)}% of the bars have gone (onDrain)
//   → closing line +${c.closingDelay}s → button +${c.buttonDelay}s after the count

// --- the pile: fill the stage, whatever its size ---
function goldPile(w, h) {
  const size = ${c.barSize} * clamp(1 + (w / ${GOLD_REFERENCE_WIDTH} - 1) * ${c.barSizeVsWidth}, 0.5, 3)
  const a = ${c.barScaleMin}, b = ${c.barScaleMax}
  const r2 = ((${PARTICLE_DEFAULT_CONFIG.collideRadius} * size) / 2) ** 2 * (a * a + a * b + b * b) / 3
  const floorW = w - 2 * (${PARTICLE_DEFAULT_CONFIG.wallInset})        // walls sit just outside the frame
  const pileH = h * ${r(goldFillLevel(c))} - (${PARTICLE_DEFAULT_CONFIG.floorInset})         // fill level × height, floor just below
  return { size, count: Math.round(${c.fillDensity} * floorW * pileH / (2 * Math.sqrt(3) * r2)) }
}
// → <ParticleRain config={{ mode: 'burst', count, particleSize: size, burstWindow: ${c.pourDuration}, forceSleepAfter: ${c.settleTime}, … }} />
//   onSettled → hold → dumpSignal++ (pull the floor) ; onCleared → the screen is clear

// --- count-up ---
// value = from + (amount − from) · (1 − (1 − u)^${c.countEasePower}),  u = t / ${c.countDuration}s

// --- impact (same curve as the gem) ---
// k = t < up ? lerp(1, ${c.impactScale}, easeOutCubic(t/${c.impactUp}))
//   : t < up + ${c.impactHold} ? ${c.impactScale}
//   : lerp(${c.impactScale}, 1, easeInOut((t − up − hold) / ${c.impactDown}))
// icon scale = k (burst + ring centred on it); heading + amount line ride its top / bottom edge;
// closing line + button hang under the amount line
`
}
