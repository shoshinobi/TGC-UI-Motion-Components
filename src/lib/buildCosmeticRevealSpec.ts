import { CONFETTI_PALETTES } from '@/components/confetti.config'
import {
  COSMETIC_CLOSING_LINES,
  COSMETIC_REFERENCE_WIDTH,
  COSMETIC_TEASE_LINES,
  COSMETIC_RARITY_LINES,
  tierOf,
  type CosmeticRevealConfig,
} from '@/components/cosmeticReveal.config'

const DEV_NOTES = [
  'IMPORTANT: use the existing design system for ALL text, fonts and buttons — the copy, the tier sticker and both buttons are CSS stand-ins showing layout, size, colour and motion.',
  'IMPORTANT: integrate the existing avatar system — the avatar here is a placeholder PNG pose; the real avatar should appear WEARING the revealed item.',
  'Audio is temporary (camera shutters, ticks, reveal sound, music) — it will be replaced in the final release; keep the cue points.',
  'The winning item + its odds are set by the app (the component only displays them); the other carousel items can be set (to show what else is out there) or left random.',
]

/** Framework-neutral tokens for the Cosmetic Reveal sequence. */
export function buildCosmeticRevealJsonSpec(c: CosmeticRevealConfig): string {
  const tiers = (['common', 'rare', 'grail'] as const).map((t) => {
    const tr = tierOf(c, t)
    const sticker = c.oddsSticker
      ? { text: `the item's odds: ${c.oddsFormat.toUpperCase()}`, fill: tr.sticker?.color ?? c.commonColor, ink: tr.sticker?.ink ?? c.commonTextColor }
      : tr.sticker
        ? { text: tr.sticker.text.toUpperCase(), fill: tr.sticker.color, ink: tr.sticker.ink }
        : 'none'
    return { tier: t, sticker, presetLine: tr.line || 'none', randomLines: COSMETIC_RARITY_LINES[t] }
  })
  return JSON.stringify(
    {
      name: 'cosmetic-reveal',
      developerNotes: DEV_NOTES,
      states: ['armed', 'tease', 'carousel', 'ready', 'spinning', 'stopping', 'spotlight', 'outro'],
      result: {
        winner: c.winnerItem === 'random' ? 'set by the app (random on the bench)' : c.winnerItem,
        tier: c.winnerTier === 'random' ? 'set by the app (random on the bench)' : c.winnerTier,
        odds: c.odds > 0 ? `1 in ${c.odds}` : 'set by the app per item (random on the bench)',
        tierFromOdds: `1 in ${c.oddsGrailFrom} or longer = grail; 1 in ${c.oddsRareFrom} or longer = rare; otherwise common. Sets the sticker colour and the line; the tier above is used only when no odds are set`,
        sticker: c.oddsSticker ? `shows the odds: ${c.oddsFormat}` : 'shows the tier name (none for common)',
        rarityLine: c.rarityLineText.trim() || (c.rarityLine === 'tier' ? 'the tier’s preset line (or set by the app per item)' : c.rarityLine === 'random' ? 'random from the tier’s list, never twice in a row' : c.rarityLine),
        carouselItems: c.itemCount,
        otherItems: c.teaserItems.trim() ? c.teaserItems.split(',').map((s) => s.trim()).filter(Boolean) : 'random from the pool (can be set)',
        winnerPlacement: 'already one of the cards, at a random slot',
      },
      tease: {
        lines: COSMETIC_TEASE_LINES.map(([headline, subheader]) => ({ headline, subheader })),
        pick: c.teaseLine === 'random' ? 'a random pair each run (never twice in a row)' : COSMETIC_TEASE_LINES[Number(c.teaseLine)],
        layout: 'as the Gold Reveal: headline pops in at the centre, the subheader rises in under it as the headline slides up; headline one line (shrinks to fit), subheader wraps; sizes grow with the width',
        holdSec: c.teaseHold,
      },
      paparazzi: {
        flashesPerSec: c.flashRate,
        timing: `random intervals (jitter ${c.flashJitter}: mean·(1 − j + j·Exp(1)))`,
        when: 'the tease only — none on the carousel or in the outro',
        colour: `a random mix of white and ${c.flashGold} per flash (up to ${Math.round(c.flashGoldMix * 100)}% gold)`,
        flash: { radiusPx: `${c.flashSize} × (1 ± ${c.flashSizeVar})`, intensity: c.flashIntensity, fadeSec: c.flashDuration, glint: c.flashGlint ? `${c.flashGlintPoints} points, length ${c.flashGlintSize} × radius, ${c.flashGlintWidth} × radius thick at the middle, tapering to a tip` : false },
        placement: 'random anywhere on screen, over everything (additive)',
        sound: 'one random camSFX/camShutter0X.wav per flash, ±7% pitch — overlaps freely',
      },
      carousel: {
        card: {
          sizePx: `${c.cardSize} on a ${COSMETIC_REFERENCE_WIDTH}px phone × clamp(1 + (w/${COSMETIC_REFERENCE_WIDTH} − 1)·${c.cardSizeVsWidth}, 1, ${c.cardSizeMax}), ≤ 55% of the width`,
          gapPx: c.cardGap,
          radiusPx: c.cardRadius,
          border: `${c.cardBorderWidth}px ${c.cardBorderColor} @ ${c.cardBorderOpacity}`,
          fill: c.cardFillOpacity > 0 ? `${c.cardFill} @ ${c.cardFillOpacity}` : 'transparent',
          itemFit: `every item's VISIBLE box (trimmed of its PNG padding — see cosmeticItems.ts) fitted into the card with ${c.itemPadding} × card padding, so all items take the same space`,
        },
        loop: 'a looping horizontal strip; the centre card scales to ' + c.focusScale + '×; cards fade to ' + c.edgeOpacity + ' toward the edges',
        in: `cards fly in from the right over ${c.carouselIn}s, ${c.carouselInStagger}s apart`,
        prompt: c.promptText ? `"${c.promptText}" under the carousel while it waits` : false,
        autoSpinAfterSec: c.autoSpinAfter ? `if they haven't swiped ${c.autoSpinAfter}s after the cards arrive, it spins on its own` : 'swipe only',
      },
      spin: {
        swipe: 'either direction; flick speed → spin speed (gain ' + c.flickGain + ', ' + c.flickMin + '–' + c.flickMax + ' cards/s); under ' + c.flickThreshold + ' px/s it settles back',
        auto: `${c.spinDirection}, ${c.cruiseSpeed} cards/s, ease-in ${c.spinUpDuration}s, then ${c.spinDuration}s at speed`,
        stop: `controlled ease-out (power ${c.stopEasePower}, ≈ ${c.stopDuration}s) that always lands the winner at the centre — as the Gem Wheel` + (c.hesitate ? `; hesitate: go past by ${c.overshoot} card, hang ${c.overshootHold}s, snap back` : ''),
      },
      speedLines: c.warp
        ? {
            like: 'the Gem Wheel’s warp, horizontal, behind the cards',
            count: Math.round(c.warpCount),
            speed: `carousel speed × card spacing × ${c.warpSpeedScale} (± ${c.warpSpeedVar})`,
            direction: 'with the cards',
            lengthPx: c.warpLength,
            widthPx: c.warpWidth,
            color: c.warpColor,
            colorVariation: c.warpColorVar,
            opacity: c.warpOpacity,
            opacityVariation: c.warpOpacityVar,
            intensity: `|carousel speed| / cruise, eased over ${c.warpFade}s`,
            bandXHeight: c.warpBand,
          }
        : false,
      spotlight: {
        winnerScale: c.spotScale,
        spring: { stiffness: c.spotStiffness, damping: c.spotDamping },
        othersFadeSec: c.othersFade,
        burst: c.spotFlash > 0 ? { intensity: c.spotFlash, radiusXHeight: c.spotFlashSize, fadeSec: c.spotFlashDecay } : false,
        ring: c.spotRing ? { color: c.spotRingColor, travelPx: c.spotRingSize, widthPx: c.spotRingWidth, opacity: c.spotRingOpacity, durationSec: c.spotRingDuration } : false,
        taperedStar: c.spotGlint > 0 ? { like: 'the camera flashes’ glint: full size at once, shrinks to half over its life, fades late', where: 'in front of the item', intensity: c.spotGlint, points: c.spotGlintPoints, lengthPx: c.spotGlintLength, thicknessAtMiddleXLength: c.spotGlintWidth, rotateDeg: c.spotGlintRotate, durationSec: c.spotGlintDuration, fadeStartsXDuration: c.spotGlintFadeAt, color: c.spotGlintColor } : false,
        singleFirework: c.spotPop
          ? {
              where: 'one firework (the Confetti component’s) from the centre of the item, in front of the cards',
              delaySec: c.spotPopDelay,
              palette: { name: c.spotPopPalette, colors: CONFETTI_PALETTES[c.spotPopPalette] },
              radiusPx: c.spotPopRadius,
              particles: { goldGPx: c.spotPopGSize, paperPx: c.spotPopPaperSize, randomSize: `± ${c.spotPopSizeVar}`, amountX: c.spotPopAmount, fadeAfterSec: c.spotPopLife },
              flash: c.spotPopFlash > 0 ? { color: c.spotPopFlashColor === 'palette' ? 'a random palette colour' : 'white', intensity: c.spotPopFlash, radiusPx: c.spotPopFlashSize, fadeSec: c.spotPopFlashDuration } : false,
              streaks: c.spotPopStreaks > 0 ? { intensity: c.spotPopStreaks, count: c.spotPopStreakCount, radiusPx: c.spotPopStreakRadius, lengthPx: c.spotPopStreakLength, widthPx: c.spotPopStreakWidth, durationSec: c.spotPopStreakDuration, color: c.spotPopStreakColor } : false,
            }
          : false,
        sticker: { delaySec: c.stickerDelay, rotateDeg: c.stickerRotate, pop: 'spring 0 → 1 (overshoot)', where: "the winner card's top-right corner" },
        rarityLine: { delayAfterStickerSec: c.lineDelay, sizePx: c.lineSize, centreBelowCardPx: c.lineGap, offsetXPx: c.lineOffsetX },
      },
      tiers,
      fireworks: c.fireworks
        ? {
            note: 'the Confetti component’s fireworks — the same for every tier',
            startsOn: c.fireworksDelay + 's after the item is revealed (the spotlight), then a volley every ' + c.confettiLoop + 's through the outro',
            fireworksPerVolley: { min: c.fireworksBurstsMin, max: c.fireworksBurstsMax, pick: 'random, rolled for every volley' },
            radiusPx: c.fireworksRadius,
            bandXHeight: [c.fireworksTop, c.fireworksBottom],
            particles: { goldGPx: c.fireworksGSize, paperPx: c.fireworksPaperSize, randomSize: `± ${c.fireworksSizeVar}`, amountX: c.confettiAmount, fadeAfterSec: c.fireworksLife },
            palette: { name: c.fireworksPalette, colors: CONFETTI_PALETTES[c.fireworksPalette] },
            flash: c.fireworksFlash > 0 ? { color: c.fireworksFlashColor === 'palette' ? 'a random palette colour per firework' : 'white', intensity: c.fireworksFlash, radiusPx: c.fireworksFlashSize } : false,
            whiteStreaks: c.fireworksStreaks > 0
              ? { intensity: c.fireworksStreaks, count: c.fireworksStreakCount, radiusPx: c.fireworksStreakRadius, lengthPx: c.fireworksStreakLength, widthPx: c.fireworksStreakWidth, layout: 'even, all the way round' }
              : false,
          }
        : false,
      outro: {
        startsAfterRevealSec: c.revealHold,
        cards: `all slide off to the left (ease-in, ${c.outroDuration}s, ${c.outroStagger}s apart)`,
        avatar: c.avatar
          ? `springs up from the bottom ${c.avatarDelay}s in — PLACEHOLDER pose (random of 3), wearing the item; ${c.avatarHeight} × height, centred at ${c.avatarCenterY} × height from the top (slightly above the middle)`
          : false,
        closing: {
          lines: COSMETIC_CLOSING_LINES.map(([headline, subheader]) => ({ headline, subheader })),
          pick: c.closingLine === 'random' ? 'a random pair each run' : COSMETIC_CLOSING_LINES[Number(c.closingLine)],
          position: `just above the buttons (${c.closingGap}px gap), as the Gold Reveal's closing line`,
          delaySec: c.closingDelay,
        },
        buttons: c.button
          ? {
              note: 'EXAMPLE ONLY — build them from the design-system buttons; keep the motion + wiring',
              top: { text: c.tryText, fill: c.tryColor, ink: c.tryTextColor, tiltDeg: c.tryRotate, action: 'onTry' },
              bottom: { text: c.buyText, fill: c.buyColor, ink: c.buyTextColor, tiltDeg: c.buyRotate, action: 'onBuy' },
              delaySec: c.buttonDelay,
              secondAfterSec: c.buttonStagger,
              anchoredPxFromBottom: c.shopBottom,
            }
          : false,
      },
      audio: c.sound
        ? {
            note: 'TEMPORARY — replaced in the final release',
            crowd: c.crowdSound === 'off' ? false : { clip: c.crowdSound === 'random' ? 'random per run: revealSFX/oooh.mp3 or aaah.mp3' : `revealSFX/${c.crowdSound}.mp3`, volume: c.crowdVolume, afterFirstFlashSec: c.crowdDelay },
            spotlightFirework: c.spotPopSound ? { clip: 'one random revealSFX/fireworks*', volume: c.spotPopSoundVolume } : false,
            endFireworks: c.fireworksSound
              ? {
                  clip: 'a random revealSFX/fireworks* per firework (every clip once before a repeat), on the burst itself',
                  volume: `${c.fireworksSoundVolume}, settling to × ${c.fireworksSoundFadeTo} over ${c.fireworksSoundFadeTime}s (± ${c.fireworksSoundVolumeVar})`,
                  limits: { shareWithSound: c.fireworksSoundShare, mostAtOnce: c.fireworksSoundMax, shortestGapSec: c.fireworksSoundGap, tailSec: c.fireworksSoundLength, lowpassHz: c.fireworksSoundMuffle },
                  pitchVar: c.fireworksSoundPitchVar,
                  panFollows: c.fireworksSoundPan,
                }
              : false,
            shutters: `camSFX/*.wav (7), random per flash, × ${c.shutterVolume}`,
            tick: `drip4.ogg per card passing the centre, × ${c.tickVolume}`,
            reveal: c.revealSound ? 'GemReveal_punch.mp3 on the spotlight' : false,
            music: c.musicTrack === 'off' ? false : { track: c.musicTrack, volume: c.musicVolume, startsOn: c.musicStart, delaySec: c.musicDelay },
          }
        : false,
    },
    null,
    2,
  )
}

/** Wiring reference — how the app drives it. */
export function buildCosmeticRevealWiringSpec(c: CosmeticRevealConfig): string {
  return `// Cosmetic Reveal — wiring reference
//
// IMPORTANT
//   • Use the existing design system for ALL text, fonts and buttons (these are stand-ins).
//   • Integrate the existing avatar system — the avatar should appear wearing the revealed item.
//   • Audio is temporary — it will be replaced in the final release; keep the cue points.
//
// <CosmeticReveal
//   config={{
//     winnerItem: 'Crown Regal',          // the item they got (set by the app)
//     winnerTier: '${c.winnerTier === 'random' ? 'grail' : c.winnerTier}',             // 'common' | 'rare' | 'grail' — only used when odds is 0
//     odds: ${c.odds > 0 ? c.odds : 100},                          // this item's odds, 1 in this many — sets the tier (grail from ${c.oddsGrailFrom}, rare from ${c.oddsRareFrom})
//     oddsSticker: ${c.oddsSticker},                  // true = "1 in 100" on the sticker, false = the tier name
//     rarityLine: '${c.rarityLine === 'tier' || c.rarityLine === 'random' ? c.rarityLine : 'tier'}',             // 'tier' = the tier's preset, 'random' = from the tier's list, or the line itself ({odds} fills in)
//     rarityLineText: '',              // optional: a line written for this item (wins over rarityLine)
//     itemCount: ${c.itemCount},
//     teaserItems: 'Halo, Grail Hoodie',  // optional: what else is out there (rest random)
//   }}
//   startSignal={n}    // armed → tease
//   spinSignal={n}     // ready → spinning (or a horizontal swipe, or autoSpinAfter = ${c.autoSpinAfter}s)
//   onState={(s) => …} // 'armed' | 'tease' | 'carousel' | 'ready' | 'spinning' | 'stopping' | 'spotlight' | 'outro'
//   onBuy={() => buyAnotherChest()}   // "${c.buyText}"
//   onTry={() => tryItemOn()}         // "${c.tryText}"
// />

// --- controlled stop: land the winner (slot w of N) at the centre ---
function planStop(phi, omega, w, N) {
  const n = ${c.stopEasePower}, o = ${c.hesitate ? c.overshoot : 0}
  const dir = Math.sign(omega), w0 = Math.abs(omega)
  const want = (w0 * ${c.stopDuration}) / n + N * ${Math.round(c.extraLoops)}
  const target = dir > 0 ? w + N * Math.ceil((phi + want - o - w) / N) : w + N * Math.floor((phi - want + o - w) / N)
  const hold = target + dir * o, D = Math.abs(hold - phi)
  return { phi0: phi, dir, D, T: (n * D) / w0, n, hold, target }
}
// each frame: phi = phi0 + dir·D·(1 − (1 − t/T)^n); card i sits at x = centre + wrap(i − phi)·pitch

// --- item fit: every card holds the item's VISIBLE box (cosmeticItems.ts → box), contain-fit ---
// k = (1 − 2·${c.itemPadding}) / max(boxW, boxH)   (card-fractions per image px)

// --- per tier ---
${(['common', 'rare', 'grail'] as const)
  .map((t) => {
    const tr = tierOf(c, t)
    return `// ${t.padEnd(6)} sticker ${c.oddsSticker ? c.oddsFormat.toUpperCase() : tr.sticker ? tr.sticker.text.toUpperCase() : '—'}${tr.line ? `, line "${tr.line}"` : ''}`
  })
  .join('\n')}
`
}
