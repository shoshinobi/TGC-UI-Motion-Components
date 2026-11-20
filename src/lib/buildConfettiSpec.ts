import { CONFETTI_PALETTES, type ConfettiConfig } from '@/components/confetti.config'

/** Framework-neutral tokens for the confetti system. */
export function buildConfettiJsonSpec(c: ConfettiConfig): string {
  const pop = c.mode === 'pop' || c.mode === 'both'
  const rain = c.mode === 'rain' || c.mode === 'both'
  return JSON.stringify(
    {
      name: 'confetti',
      mode: c.mode,
      trigger: c.autoFire ? { autoFireAfterSec: c.fireDelay, loopEverySec: c.loopEvery || false } : 'fireSignal',
      pop: pop
        ? {
            bursts: c.bursts,
            intervalSec: c.burstInterval,
            origin: c.burstOrigin,
            originNote:
              c.burstOrigin === 'sides'
                ? 'two cannons on the side edges that aim at a target (see sideCannons)'
                : c.burstOrigin === 'random'
                  ? 'successive bursts spread across the upper half'
                  : c.burstOrigin === 'center'
                    ? `at ${c.originX} × width, ${c.originY} × height`
                    : 'bottom centre',
            piecesPerBurst: c.burstPieces,
            speedPxS: [c.burstSpeedMin, c.burstSpeedMax],
            spreadDeg: c.burstSpread,
            angleDeg: c.burstAngle,
            fill: c.burstFill === 'sphere' ? 'speed = lerp(min, max, √random) — fills the shell' : 'speed ≈ 0.9–1 × max — a crisp ring',
            exit:
              c.popExit === 'off'
                ? false
                : { style: c.popExit, startsAfterSec: c.popExitStart, durationSec: c.popExitDuration, randomness: c.popExitVar, ease: 'smoothstep' },
            sideCannons: {
              at: `the side edges, y = ${c.cannonY} × height + ${c.cannonOffsetY}px`,
              flashAndStarAt: `cannon mouth + ${c.flashOffsetX}px inward (mirrored), ${c.flashOffsetY}px down`,
              reach: `${c.cannonAimX} × half-width in from each edge, in ${c.cannonTime}s: vx = dx·k/e`,
              aim:
                c.cannonAimBy === 'angle'
                  ? c.cannonKeepHeight
                    ? `launch angle ${c.cannonAngle}° as on a 390 px phone; same rise on every screen: vy = −(195·aimX·k/e)·tan(angle)`
                    : `launch angle ${c.cannonAngle}° on every screen: vy = −vx·tan(angle)`
                  : `aims at ${c.cannonAimY}px from ${c.cannonY} × height: vy = (dy − (g/k)(T − e/k))·k/e`,
              solve: `launch velocity so the burst's middle reaches the target in ${c.cannonTime}s under popDrag k + popGravity g: e = 1 − exp(−k·T); vx = dx·k/e; vy = (dy − (g/k)(T − e/k))·k/e`,
              power: c.cannonPower,
              speedSpread: `× (1 ± ${c.cannonSpeedVar}) per piece; cone = spread`,
              timing: c.cannonOrder === 'together' ? `both at once, ± ${c.cannonJitter}s jitter` : `${c.cannonOrder} side first, ${c.cannonStagger}s apart, ± ${c.cannonJitter}s jitter per shot`,
              note: 'burstSpeedMin / Max are not used by the side cannons',
            },
            originFlash:
              c.popFlash > 0
                ? { intensity: c.popFlash, radiusPx: c.popFlashSize, fadeSec: c.popFlashDuration, draw: 'white radial gradient, swells 0.5 → 1 × radius as it fades (k²)' }
                : false,
            originStarburst:
              c.starIntensity > 0
                ? {
                    intensity: c.starIntensity,
                    strokes: c.starStrokes,
                    distribution: c.starLayout === 'aimed' ? `fan of ${c.starFan}° centred on the shot direction` : c.starLayout,
                    radiusPx: c.starRadius,
                    strokeLengthPx: c.starLength,
                    strokeWidthPx: c.starWidth,
                    durationSec: c.starDuration,
                    color: c.starColor,
                    motion: 'head = 4 + radius·easeOutCubic(u); tail = head − length·(1 − 0.7u); width × (1 − 0.6u); alpha = intensity·(1 − u)^1.5; additive; one path per burst',
                  }
                : false,
          }
        : false,
      rain: rain
        ? { perSec: c.rainRate, durationSec: c.rainLoop ? 'loops until stopSignal' : c.rainDuration, spread: c.rainSpread, startSpeedPxS: c.rainSpeed }
        : false,
      physics: {
        rain: {
          gravity: `${c.rainGravity} m/s² × 143 px/m`,
          drag: `${c.rainDrag} /s — v *= exp(−drag·dt); falls at ≈ ${Math.round((c.rainGravity * 143) / Math.max(0.01, c.rainDrag))} px/s`,
          life: `until it leaves the bottom; fades over the bottom ${c.rainFadeZone} × height`,
          fallVariation: c.rainFallVar || false,
        },
        bursts: {
          gravity: `${c.popGravity} m/s² × 143 px/m`,
          drag: `${c.popDrag} /s — throws ≈ speed / drag px, then floats at ≈ ${Math.round((c.popGravity * 143) / Math.max(0.01, c.popDrag))} px/s`,
          fallVariation: c.popFallVar > 0 ? `per piece: r ∈ [−1, 1] → gravity × (1 + ${c.popFallVar}·r), drag × (1 − ${c.popFallVar / 2}·r), fall cap × (1 + ${c.popFallVar}·r) (± a little wobble)` : false,
        },
        terminalVelocityPxS: c.terminalVelocity,
        windPxS2: c.wind,
        flutter: { amplitudePx: c.flutterAmp, hz: c.flutterFreq, note: 'scaled by (1 − speed/700) — only once floating' },
        spinDegS: [c.spinMin, c.spinMax],
        flipTurnsS: [c.flipMin, c.flipMax],
        flipDraw: 'scaleY = |cos(flip)|; back face (cos < 0) darker by backShade',
      },
      pieces: {
        gShare: c.gShare,
        g: { file: 'GOLD_G.svg', heightPx: c.gSize, color: c.gTint === 'original' ? '#ff9d00' : 'palette' },
        paper: { stripLengthPx: c.paperSize, stripAspect: c.paperAspect, dotShare: c.dotShare, dotDiameter: '0.64 × length' },
        sizeVariation: c.sizeVar,
        palette: { name: c.palette, colors: CONFETTI_PALETTES[c.palette] },
        backShade: c.backShade,
      },
      life: { sec: [c.lifeMin, c.lifeMax], fadeOutSec: c.fadeOut, maxPieces: c.maxPieces },
      performance: 'rAF sleeps when idle · one setTransform per piece · pre-built shade table · swap-remove · G rasterised at drawn size · DPR ≤ 2',
      responsive: { countVsWidth: c.countVsWidth, formula: 'counts × clamp(1 + (w/390 − 1)·countVsWidth, 0.5, 3)' },
    },
    null,
    2,
  )
}
