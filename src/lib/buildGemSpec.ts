import type { GemRevealConfig } from '@/components/GemReveal'
import { GEM_GRADES, GEM_GRADE_KEYS, GRADE_COLOR_KEY, hexToRgb01, type GemGrade } from '@/lib/gemTiers'

function r(v: number): number {
  return Math.round(v * 10000) / 10000
}

/** the bench-set colour for a grade */
function gc(c: GemRevealConfig, grade: GemGrade): string {
  return (c[GRADE_COLOR_KEY[grade] as keyof GemRevealConfig] as string) || '#FFFFFF'
}

/** Framework-neutral tokens: the colour map, the reveal motion, the effects. */
export function buildGemJsonSpec(c: GemRevealConfig): string {
  return JSON.stringify(
    {
      name: 'gem-reveal',
      lottie: {
        file: 'gem.lottie',
        slot: 'gemColor',
        note: 'the `gemColor` slot is `[r,g,b]` normalised 0–1; lottie-web resolves slots at load, so a grade change reloads the animation at its current frame',
        fps: 60,
        loopFrames: [0, 60],
      },
      grades: Object.fromEntries(
        GEM_GRADES.map((g) => {
          const hex = gc(c, g.key)
          return [g.key, { label: g.label, hex, slotRGB: hexToRgb01(hex).map((n) => r(n)) }]
        }),
      ),
      current: { grade: c.tier, hex: gc(c, c.tier) },
      autoCycle: c.autoCycle
        ? {
            grades: GEM_GRADE_KEYS,
            startIntervalSec: c.cycleInterval,
            ramp: c.cycleRamp,
            rampNote: `each change shortens the interval by ${r(c.cycleRamp * 25)}%, floored at ${c.cycleMinInterval}s`,
            minIntervalSec: c.cycleMinInterval,
            whiteFlashBetween: c.cycleFlash,
          }
        : false,
      playback: {
        revealLoopSpeed: c.revealLoopSpeed,
        lockedLoopSpeed: c.loopSpeed,
        note: 'Lottie `setSpeed` — runs at `revealLoopSpeed` through the reveal loop, eases to `lockedLoopSpeed` across the lock transition (see `sequence.lockTransition.speed`)',
      },
      sequence: {
        note: 'a three-phase, developer-driven state machine (the `phase` prop)',
        phases: {
          armed: 'the gem waits off-screen below; nothing plays or renders until launch',
          reveal:
            'gem rises + hovers; jet on in the background; warp streaks fade on a beat after the gem reaches centre; gem streaks loop; grade auto-cycles; loop speed = revealLoopSpeed',
          locked:
            'dev has chosen the final grade → white blast, punch + white flash, snap to that grade, fade the streaks + warp + jet, ease the loop speed back, spring the folded grade button in',
        },
        trigger:
          'the app moves `phase` armed → reveal (launch) then reveal → locked (with the chosen grade set)',
        lockTransition: {
          whiteBlast: c.lockWhiteBlast
            ? {
                buildSec: c.lockWhiteBlastDuration,
                note: 'the gem colour swaps to pure white and the glow spikes, building over `buildSec`, then the grade colour bursts in under the flash — the rest of the transition timings below are measured from the end of the blast',
              }
            : false,
          punchDelaySec: c.lockPunchDelay,
          punchNote: 'the coupled punch + white flash fire this long after the blast (or after the lock if no blast)',
          speed: {
            delaySec: c.lockSpeedDelay,
            durationSec: c.lockSpeedDuration,
            ease: c.lockSpeedEase,
            note: 'currentSpeed eases revealLoopSpeed → lockedLoopSpeed, starting `delaySec` after the blast',
          },
          fade: {
            durationSec: c.lockFadeDuration,
            ease: c.lockFadeEase,
            note: 'gem streaks + warp streaks fade 1 → 0 over this (starts after the blast); the jet has its own fade (see `jet.fadeOff`)',
          },
        },
        gradeButton: c.button
          ? {
              label: c.buttonLabelOverride.trim() || 'the locked grade tier name',
              sizeMultiplier: c.buttonSize,
              sizeNote: 'scales the real font/height/padding (crisp when large); `settled.scale` is a transform on top for the pop',
              offsetPx: { x: c.buttonOffsetX, y: c.buttonOffsetY },
              offsetNote: 'y is the gap from the gem bottom point to the button top — negative overlaps the gem',
              delaySec: c.buttonDelay,
              delayNote: 'measured from the end of the blast',
              from: { scale: c.buttonFromScale, rotateDeg: c.buttonFromRotate },
              settled: { scale: c.buttonScale, rotateDeg: c.buttonRotate },
              spring: { stiffness: c.buttonStiffness, damping: c.buttonDamping, mass: c.buttonMass },
              impl: 'the Banner design’s folded button; scale + rotate spring in, opacity fades in over 0.15s',
            }
          : false,
      },
      entry: {
        fromBelowPx: c.entryDistance,
        fromScale: c.entryScale,
        delaySec: c.entryDelay,
        spring: { stiffness: c.entryStiffness, damping: c.entryDamping, mass: c.entryMass },
        note: 'Y and scale spring together from (below, small) to (centre, `scale`)',
      },
      hover: c.hover
        ? {
            sine: {
              x: { amplitudePx: c.hoverAmpX, frequencyHz: c.hoverFreqX },
              y: { amplitudePx: c.hoverAmpY, frequencyHz: c.hoverFreqY },
              rotateDeg: c.hoverRotate,
            },
            wander: c.hoverWander,
            note: 'faded in as the entry scale-in completes; `wander` drifts the sine phase so it never quite repeats',
          }
        : false,
      scale: {
        rest: c.scale,
        punch: {
          to: c.punchTo,
          mode: c.punchMode,
          ...(c.punchMode === 'tween'
            ? {
                tween: {
                  inSec: c.punchInDuration,
                  inEase: c.punchInEase,
                  holdSec: c.punchHold,
                  outSec: c.punchOutDuration,
                  outEase: c.punchOutEase,
                  note: 'scale ramps rest → to over inSec, holds at `to` for holdSec, eases back over outSec',
                },
              }
            : { spring: { stiffness: c.punchStiffness, damping: c.punchDamping, note: 'ballistic kick then relax to rest' } }),
          apexFlash:
            c.punchFlash === 'off'
              ? false
              : { colour: c.punchFlash === 'current' ? 'the current grade' : c.punchFlash, durationSec: c.punchFlashDuration },
          note: 'at the top of the punch it can flash a colour + fire the streak burst',
          coupledWithWhiteFlash: true,
          couplingNote: 'a punch trigger always fires the white flash, and a white-flash trigger always fires the punch — the two are one impact event',
        },
      },
      whiteFlash: {
        holdSec: c.flashHold,
        decaySec: c.flashDuration,
        blurPx: c.flashBlur,
        glowSpike: c.flashGlow,
        firesStreaks: c.flashStreaks,
        alsoPunches: true,
        atRevealStart: c.revealFlash
          ? { delayAfterArrivalSec: c.revealFlashDelay, note: 'ambient — flash + glow spike (+ streaks), no punch' }
          : false,
        impl: 'a diamond overlay (clip-path, normal blend) whites out the whole gem shape, hidden inside a wrapper that carries the CSS blur so the bloom spreads past the edge; hold at full then decay. Also kicks the punch scale, spikes the glow, and (optionally) fires the radial streak burst.',
      },
      glow: c.glow
        ? {
            colour: c.glowColor,
            intensity: c.glowIntensity,
            intensityNote: 'overall brightness multiplier (halo alpha 0.16·gain, core alpha 0.3·gain, gain = intensity·pulse·flashSpike)',
            reach: c.glowReach,
            reachNote: 'radial halo radius = max(gemW,gemH)/2 · reach + blurPx; the core diamond stays ~1× the gem so the shape still reads',
            blurPx: c.glowSize,
            corePasses: Math.round(c.glowStrength),
            pulseHz: c.glowPulse,
            impl: 'a radial-gradient halo wash (carries the reach + brightness) plus a soft core diamond via the off-canvas shadow trick (`shadowBlur` + `shadowOffsetX`, shape drawn off-screen so only its blurred shadow shows) stacked `corePasses` times — canvas `lighter` blend, no hard fill. `shadowBlur` not `ctx.filter`: the latter is a no-op on iOS Safari < 18.4. The white flash spikes the gain',
          }
        : false,
      gemStreaks: c.streaks
        ? {
            count: Math.round(c.streakCount),
            speedPxS: c.streakSpeed,
            deceleration: c.streakDecel,
            decelNote: 'radius(t) = r0 + (speed/k)·(1−e^(−k·t)), k = lerp(0.3, 9, deceleration)',
            delayAfterLandSec: c.streakDelay,
            lengthPx: c.streakLength,
            widthPx: c.streakWidth,
            opacity: c.streakOpacity,
            lifeSec: c.streakLife,
            colour: c.streakColor,
            loopDuringReveal: c.streakLoop ? { intervalSec: c.streakLoopInterval } : false,
            fires: [
              c.streakOnReveal && 'reveal arrival',
              c.streakLoop && `every ${c.streakLoopInterval}s during the reveal loop`,
              c.streakOnPunch && 'punch apex',
              c.flashStreaks && 'white flash',
              'lock (with the coupled punch/flash)',
              'manual trigger',
            ].filter(Boolean),
            fadesOnLock: 'burst alpha × the lock fade so in-flight streaks clear as the gem settles',
            impl: 'thin rounded rects radiating from the gem centre, oriented outward, `lighter` blend — the `GEM_streaks` starburst',
          }
        : false,
      warpStreaks: c.warp
        ? {
            count: Math.round(c.warpCount),
            speedPxS: c.warpSpeed,
            speedVariation: c.warpSpeedVar,
            lengthPx: c.warpLength,
            widthPx: c.warpWidth,
            colour: c.warpColor,
            colourVariation: c.warpColorVar,
            colourVariationNote: '± this × 60° hue jitter per streak',
            opacity: c.warpOpacity,
            opacityVariation: c.warpOpacityVar,
            fadeOn: { afterCentreSec: c.warpOnDelay, durationSec: c.warpOnDuration, ease: 'easeInOut' },
            intensityNote:
              'starts at 0; `warpOnDelay` seconds after the gem reaches centre it fades on over `warpOnDuration`; then fades 1 → 0 across the lock transition (see `sequence.lockTransition.fade`)',
            impl: 'vertical rounded rects streaming downward past the gem, `lighter` blend',
          }
        : false,
      jet: c.jet
        ? {
            tracks: Math.round(c.jetTracks),
            trackWidthPx: c.jetTrackWidth,
            spacingPx: Math.round(c.jetTracks) === 2 ? c.jetSpacing : undefined,
            lengthPx: c.jetLength,
            taper: c.jetTaper,
            opacityGradient: { atGem: c.jetOpacityStart, atTail: c.jetOpacityEnd },
            fadeOff: {
              startsSec: c.jetFadeDelay,
              startsNote: 'seconds after the grade is LOCKED — the jet stays fully on through the whole reveal loop',
              durationSec: c.jetFadeDuration,
              direction: 'the head stays pinned to the gem; the fade eats the stream inward from the tail toward the head',
            },
            colour: c.jetColor,
            impl: 'one or two tapering vertical gradient trapezoids from the gem downward, `lighter` blend',
          }
        : false,
    },
    null,
    2,
  )
}

/** lottie-web wiring reference — colour slot, the reveal → locked state machine. */
export function buildGemReactSpec(c: GemRevealConfig): string {
  const gradeLines = GEM_GRADES.map((g) => {
    const hex = gc(c, g.key)
    return `  ${g.key}: [${hexToRgb01(hex).map((n) => r(n)).join(', ')}],  // ${g.label} ${hex}`
  })
  return `import lottie from 'lottie-web'
import gemData from './gem.json'   // the JSON inside gem.lottie (a/Main Scene.json)

// --- the gem-colour slot, per grade (normalised RGB) ---
const GRADE_RGB = {
${gradeLines.join('\n')}
}

// lottie-web resolves the \`gemColor\` slot when the animation loads, so a grade
// change = reload at the current frame. A 32 KB JSON reload is a few ms.
function makeGem(host, grade, speed) {
  const data = structuredClone(gemData)
  data.slots.gemColor.p.k = GRADE_RGB[grade]
  const anim = lottie.loadAnimation({
    container: host, renderer: 'svg', loop: true, autoplay: true, animationData: data,
  })
  anim.setSpeed(speed)
  return anim
}

let currentSpeed = ${c.revealLoopSpeed}
let anim = makeGem(hostEl, '${c.tier}', currentSpeed)

function setGrade(grade) {
  const f = anim.currentFrame
  anim.destroy()
  anim = makeGem(hostEl, grade, currentSpeed)
  anim.goToAndPlay(f, true)
}

// --- three-phase state machine: 'armed' → 'reveal' → 'locked' -------------
// phase 'armed': gem waits off-screen; nothing runs. launch() starts it.
// phase 'reveal': gem rises + hovers, jet on, warp streaks fade on ${c.warpOnDelay}s
//   after the gem reaches centre (over ${c.warpOnDuration}s), gem streaks loop every
//   ${c.streakLoopInterval}s, grade auto-cycles, loop speed = ${c.revealLoopSpeed}.${
  c.revealFlash
    ? `\n//   on arrival (+${c.revealFlashDelay}s): an ambient white flash as it settles into the loop`
    : ''
}
// lock(grade): the dev picked the final grade —${
  c.lockWhiteBlast
    ? `\n//   0. blast: swap the gem to pure white + spike the glow, building over ${c.lockWhiteBlastDuration}s
//      (steps below are timed from the end of the blast)`
    : ''
}
//   1. after ${c.lockPunchDelay}s: punch the scale + fire the white flash (coupled) + streak burst
//   2. setGrade(grade) — snap to it (masked by the flash)
//   3. after ${c.lockSpeedDelay}s, ease currentSpeed ${c.revealLoopSpeed} → ${c.loopSpeed} over ${c.lockSpeedDuration}s (${c.lockSpeedEase})
//   4. fade gem + warp streaks 1 → 0 over ${c.lockFadeDuration}s (${c.lockFadeEase}); the jet retracts over ${c.jetFadeDuration}s (starts +${c.jetFadeDelay}s)
//   5. after ${c.buttonDelay}s: spring the folded grade button in (below the gem)
let phase = 'armed', lockedAt = -1

function launch() { if (phase === 'armed') phase = 'reveal' }
function lock(grade) {
  if (phase !== 'reveal') return
  phase = 'locked'; lockedAt = t
  ${c.lockWhiteBlast ? "setGrade('#ffffff')   // white blast; setGrade(grade) again when it ends" : 'setGrade(grade)   // snap to the final grade (masked by the flash)'}
}

const ENTRY = { stiffness: ${c.entryStiffness}, damping: ${c.entryDamping}, mass: ${c.entryMass} }
let y = ${c.entryDistance}, vy = 0, s = ${c.entryScale}, sv = 0, t = 0

function frame(dt) {
  if (phase === 'armed') return   // frozen until launch()
  t += dt

  // loop speed — reveal speed, easing to the locked speed after lock (+ delay)
  let target = ${c.revealLoopSpeed}
  if (phase === 'locked' && t - lockedAt >= ${c.lockSpeedDelay}) {
    const rt = Math.min((t - lockedAt - ${c.lockSpeedDelay}) / ${c.lockSpeedDuration}, 1)
    const e = ${'{ linear: (x)=>x, easeIn: (x)=>x*x, easeOut: (x)=>1-(1-x)*(1-x), easeInOut: (x)=>x<.5?2*x*x:1-(-2*x+2)**2/2 }'}['${c.lockSpeedEase}'](rt)
    target = ${c.revealLoopSpeed} + (${c.loopSpeed} - ${c.revealLoopSpeed}) * e
  }
  if (Math.abs(target - currentSpeed) > 0.01) { currentSpeed = target; anim.setSpeed(currentSpeed) }

  // lock fade — multiplies the streak + warp alpha
  const lockFade = phase === 'locked'
    ? 1 - Math.min((t - lockedAt) / ${c.lockFadeDuration}, 1)   // apply ${c.lockFadeEase}
    : 1

  // entry spring — Y and scale toward (0, ${c.scale})  [F = -k·(p-target) - c·v]
  if (t >= ${c.entryDelay}) {
    const fY = -ENTRY.stiffness * y - ENTRY.damping * vy;  vy += (fY / ENTRY.mass) * dt;  y += vy * dt
    const fS = -ENTRY.stiffness * (s - ${c.scale}) - ENTRY.damping * sv;  sv += (fS / ENTRY.mass) * dt;  s += sv * dt
  }
${
  c.hover
    ? `
  // hover — sine drift, faded in as the scale-in finishes
  const arrive = Math.min(1, (s - ${c.entryScale}) / (${c.scale} - ${c.entryScale}))
  const hx = Math.sin(t * 2*Math.PI * ${c.hoverFreqX}) * ${c.hoverAmpX} * arrive
  const hy = Math.sin(t * 2*Math.PI * ${c.hoverFreqY}) * ${c.hoverAmpY} * arrive
  gemEl.style.transform = \`translate(\${hx}px, \${y + hy}px) scale(\${s})\``
    : `
  gemEl.style.transform = \`translate(0, \${y}px) scale(\${s})\``
}
}

// White flash: fade a diamond overlay (clip-path) over the gem, inside a wrapper
// that carries blur(${c.flashBlur}px) so the bloom spreads past the edge — full for
// ${c.flashHold}s then decay over ${c.flashDuration}s. Also kicks the punch scale
// (the two are coupled), fires the streak burst, and spikes the glow ×${c.flashGlow}.
${
  c.autoCycle
    ? `
// auto-cycle (phase 'reveal' only) — steps the grades, interval shrinks ${r(c.cycleRamp * 25)}% each time (floor ${c.cycleMinInterval}s)
const GRADES = [${GEM_GRADE_KEYS.map((g) => `'${g}'`).join(', ')}]
// in frame(): if (phase==='reveal' && t >= nextAt) { i=(i+1)%GRADES.length; setGrade(GRADES[i]); ${c.cycleFlash ? 'fireWhiteFlash(); ' : ''}interval = Math.max(${c.cycleMinInterval}, interval * ${r(1 - c.cycleRamp * 0.25)}); nextAt = t + interval }`
    : "// auto-cycle off — call setGrade(grade) when the grade changes"
}

// folded grade button (Banner FoldableButton), label = the tier name — springs
// in ${c.buttonDelay}s after lock: scale ${c.buttonFromScale}→${c.buttonScale}, rotate ${c.buttonFromRotate}°→${c.buttonRotate}°,
// spring { stiffness: ${c.buttonStiffness}, damping: ${c.buttonDamping}, mass: ${c.buttonMass} }, opacity over 0.15s.
// Positioned centre-x + ${c.buttonOffsetX}px, ${c.buttonOffsetY}px from the gem's bottom point.

// gem streaks, warp streaks, jet stream, glow — canvas behind the gem; see the
// JSON tokens for every parameter.`
}
