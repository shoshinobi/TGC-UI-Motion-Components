# Leva panel — every control, per component

The right-hand panel is [Leva](https://github.com/pmndrs/leva). It drives the live
preview and nothing else — the values it produces are what the **Export**
buttons copy out. Adjusting a control never touches the deliverable; it just
changes what you see so you can dial in numbers to hand back.

- **Folders** group related controls. Some open collapsed — click the folder name.
- **Sliders** drag or type a number. **Selects** are dropdowns. **Toggles** are
  checkboxes. **Colour** swatches open a picker.
- The `component` dropdown at the very top switches which preview loads (same as
  the `?c=` URL param: `?c=flame`, `?c=sheet`, `?c=gauge`, `?c=banner`, `?c=rain`).

---

## Controls every bench shares

### Stage folder

| Control | Type | What it does |
|---|---|---|
| `background` | select `dark` / `light` / `ember` | Stage backdrop only — never exported. `ember` is a dark-red radial gradient for checking glow and contrast. |
| `paused` | toggle | Freezes the animation / simulation in place. |
| `viewport` | select `phone` / `tablet` / `full` | *(Feedback Sheet, Banner Stack, Particle Rain)* Frames the preview at a device width (≈390 / ≈640–720 / full). For Particle Rain it also feeds the responsive auto-scale, so you see real per-size counts. |

### Export folder (buttons)

| Button | What it does |
|---|---|
| `reset defaults` / `reset to approved spec` / `reset to code default` | Restore the baked-in config. |
| `replay` / `restart` / `drop again` | Re-run the animation from the start (remounts the component). |
| `copy Framer Motion` / `copy canvas loop` | Copy the ready-to-paste implementation. |
| `copy JSON tokens` | Copy the framework-neutral spec. |
| `copy config (for defaults)` | Copy the flat config object — send this back to bake in a new default. |

Particle Rain adds **`★ save settings`** (persist the current panel to
`localStorage` so it survives a reload) and **`⤓ pull the floor out (clear
screen)`**. Banner Stack adds **`next banner ▸`**, **`★ save as approved (this
viewport)`**, and **`reset this viewport to code default`**.

---

## Flame Pictogram

A looping squash-and-stretch flicker, rendered as three stacked `<motion.svg>`
layers so each can flicker slightly out of phase.

### Stage

| Control | Range / options | What it changes |
|---|---|---|
| `size (px)` | 16–360 | Render size of the flame. |
| `baseline` | toggle | The alignment guide line under the flame. |
| `context row` | toggle | The row of tiny flames at 16 / 24 / 40 px, for checking legibility small. |

### Appearance

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `color` | colour | The flame fill (`--color-error`). | Matching brand / error colour. |
| `transformOrigin` | `bottom` · `center` · `top` · `left bottom` · `right bottom` | The pivot the scale animates around. `bottom` keeps the roots planted and moves the tip. | Where the flicker "grows from". |

### Timing

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `duration` | 0.1–5 s | Length of one flicker cycle. | Faster / calmer flame. |
| `ease` | named curves + `custom` | Interpolation curve between keyframes. Picking `custom` activates the four cubic handles below. | Feel of the motion between poses. |
| `cubic x1 / y1 / x2 / y2` | sliders | The two control points of a custom cubic-bezier. Only used when `ease = custom`. | Hand-shaping the curve. |
| `loop` | toggle | Repeat forever vs play once. | |
| `repeatType` | `loop` · `mirror` · `reverse` | How each repeat restarts — jump back to frame 1, ping-pong, or play backwards. | Killing the tiny "tick" at the loop seam (`mirror`). |
| `repeatDelay` | 0–3 s | Pause between repeats. | |

### Keyframes (frames 1–4, one folder each)

| Control | Range | What it changes |
|---|---|---|
| `time` | 0–1 | Normalised position of this keyframe in the cycle. |
| `scaleX` | 0.2–3 | Horizontal scale at this keyframe. |
| `scaleY` | 0.2–3 | Vertical scale at this keyframe. The flicker is the sequence of these four squash/stretch poses. |

### Per-layer (outer / middle / inner, one folder each)

| Control | Range | What it changes | Use it for |
|---|---|---|---|
| `delay (s)` | 0–1 | Start offset for that flame layer. | Putting the three layers slightly out of phase so the flame shimmers instead of pulsing as one. |
| `speed ×` | 0.25–4 | Playback-rate multiplier for that layer (>1 = faster loop). | An inner core that licks quicker than the body. |

---

## Feedback Sheet

The enter animation for the error sheet that slides up from the bottom. One
folder per element: **sheet · gradient · icon · heading · body · button**. Every
layer folder has the same controls.

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `type` | `tween` / `spring` | Which transition model this layer uses — selects whether its **spring** or **tween** sub-folder applies. | Bouncy vs timed motion. |
| `from opac.` | 0–1 | Starting opacity (animates to 1). | Fade-in strength. |
| `from Y` | sheet: 0–150 **%** · others: −120–120 **px** | Starting vertical offset (animates to 0). Sheet `100%` = fully below the screen. | Slide distance / direction. |
| `from scale` | 0–6 (icon 0–12) | Starting scale (animates to 1). Icon default `5` = slams in from oversized. | Pop / slam intensity. |
| `delay` | 0–1.5 s | Start offset within the enter sequence. | Staggering the layers. |
| `wait for all` | toggle | Start this layer only once every other layer has settled. Used for the action button. | A CTA that appears after everything else lands. |
| **spring** → `stiffness` | 10–1000 | Spring tightness (higher = snappier). | *(type = spring)* |
| **spring** → `damping` | 1–60 | Bounce absorption (lower = more overshoot). | |
| **spring** → `mass` | 0.2–4 | Inertia (higher = slower, heavier). | |
| **tween** → `duration` | 0.05–2 s | Length of the move. | *(type = tween)* |
| **tween** → `ease` | named curves | Easing curve. | |
| **shake** → `rotate °` | 0–90 | Peak angle of a decaying rattle layered on top of the entrance. | The icon's alarm shake. |
| **shake** → `shift px` | 0–60 | Peak horizontal shake distance. | |
| **shake** → `swings` | 2–16 | Number of back-and-forth swings. | |
| **shake** → `duration` | 0.1–1.5 s | Total length of the rattle. | |
| **shake** → `decay` | 0.15–1 | How much each swing shrinks (`1` = no decay, constant rattle). | A hard sustained buzz vs a quick settle. |

---

## Gauge

The mount animation for the vertical bar meter.

### reading

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `value` / `min` / `max` | steppers | The reading and its scale — `fraction = (value − min) / (max − min)` drives the fill, pointer and pill position. | Testing different readings. |
| `format` | `compact` / `full` / `raw` | Pill number formatting: `7k` / `7,000` / `7000`. | |
| `count up` | toggle | Animate the pill number from `min` → `value` on its own timeline. | |
| `↳ hold past settle (s)` | 0–5 | How long after the bar settles the count-up finishes. | Keeping the number ticking a beat after the bar lands. |
| `↳ ease in to final` | named curves | Easing of the count-up. | |

### enter

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `delay (s)` | 0–2 | Offset before the fill starts. | |
| `type` | `spring` / `tween` / `ramp` | The fill model. `ramp` = a slow ease-in build-up, then a spring for the finish. | A gauge that accelerates then locks in vs a simple timed fill. |
| **ramp** → `build-up (s)` | 0.1–10 | Length of the ramp's first (ease-in) phase. | *(type = ramp)* |
| **ramp** → `build-up ease` | `linear` / `easeIn` / `circIn` / `backIn` | Curve of the build-up. | |
| **ramp** → `hand off at ×target` | 0.1–1 | Fraction of the target the ramp reaches before the spring takes over. | |
| **spring** → `stiffness` / `damping` / `mass` | 10–1000 / 1–80 / 0.2–5 | Spring constants for the fill (and the finish, in `ramp`). | |
| **tween** → `duration (s)` | 0.1–10 | Length of a plain timed fill. | *(type = tween)* |
| **tween** → `ease` | named curves | | |

### pill flash

A glow pulse on the value pill.

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `enabled` | toggle | The glow pulse. | |
| `offset vs settle (s)` | −0.6–1 | Fire time relative to when the bar settles. Negative fires *before* it lands. | A flash that anticipates the landing vs celebrates it. |
| `duration (s)` | 0.1–2 | Length of one pulse. | |
| `pulses` | 1–6 | How many times it flashes. | |
| `colour` | colour | Glow colour. **Only reads on a dark background.** | |
| `blend` | `plus-lighter` / `screen` / `normal` | `mix-blend-mode`. `plus-lighter` is additive (brightest), `screen` softer, `normal` just draws over. | Intensity / how it sits on the backdrop. |
| `intensity (>1 stacks)` | 0–4 | Peak opacity. Above `1` it stacks extra glow layers, so a `plus-lighter` flash keeps getting brighter. | A blown-out celebratory hit. |
| `blur (px)` | 0–80 | Glow softness. | |
| `spread (px)` | 0–40 | Glow size beyond the pill edge. | |

### appearance

| Control | Range / options | What it changes |
|---|---|---|
| `fill top` / `fill bottom` | colour | The two gradient stops of the fill bar. |
| `gradient stop %` | 0–100 | Where the bottom colour lands in the gradient. |
| `track width (px)` | 2–60 | Bar thickness. |
| `track height (px)` | 120–640 | Bar length. |
| `pointer` | toggle | The hairline + arrow marker riding the top of the empty zone. |
| `min label` | toggle | The static min-value label below the track. |

---

## Banner Stack

A swipeable, infinitely-looping stack of banner cards. Per-viewport — the
approved values differ for phone / tablet / full, and switching **Stage →
viewport** loads that viewport's config.

### drag / release

| Control | Range | What it changes | Use it for |
|---|---|---|---|
| `commit distance (px)` | 4–320 | How far you must drag before releasing counts as a swipe. | A deliberate drag on a small screen vs an easy flick on desktop. |
| `flick velocity (px/s)` | 50–2000 | Release speed that commits regardless of distance. | Letting a fast toss count even if it barely moved. |
| `snap-back stiffness` | 50–1200 | Spring tightness returning an *uncommitted* card to centre. | |
| `snap-back damping` | 4–80 | Overshoot on that return (lower = bouncier). | |

### fly-out (on release)

| Control | Range | What it changes | Use it for |
|---|---|---|---|
| `distance out (px)` | 20–1000 | How far the committed card slides sideways before receding to the back of the stack. | Clearing the frame on a wide layout. |
| `toward swipe direction` | toggle | Fly-out follows the drag direction, or always exits one way. | |
| `rotate out (°, × dir)` | −30–30 | Tilt applied during the fly-out. | A card that spins off. |
| `duration out (s)` | 0.05–1.2 | Length of the fly-out slide. | |
| `ease out` | named curves | Curve of the slide. | |

### stack fan-out

| Control | Range | What it changes | Use it for |
|---|---|---|---|
| `visible cards` | 2–5 | How many cards show in the fanned stack. | |
| `gap X — right edge (px)` | 0–120 | Horizontal offset per card further back, so the stacked edges peek out on the right. | The visible "there's more" edge. |
| `gap Y (px)` | −60–60 | Vertical offset per card further back. | |
| `scale − per step` | 0–0.2 | How much smaller each card back is. | Depth of the fan. |
| `opacity − per step` | 0–1 | Opacity drop per card back (`0` = all opaque). | |
| `fan rotate per step (°)` | −12–12 | Tilt added per card back. | A hand-of-cards spread. |
| `front card tilt (°)` | −15–15 | Resting rotation of the top card. | A casual "tossed on the table" look. |
| `darken cards behind` | 0–1 | Black-overlay opacity on every non-front card (also dims its border). | Pushing the back cards into shadow. |

### border

| Control | Range | What it changes |
|---|---|---|
| `colour` | colour | The solid edge stroke on every card. |
| `width (px)` | 0–10 | Stroke width. |

### shuffle

The transition when the remaining cards ease into their new slots after a swipe.

| Control | Range / options | What it changes |
|---|---|---|
| `shuffleType` | `tween` / `spring` | Which model the shuffle uses. |
| **shuffleTween** → `duration (s)` | 0.05–2 | Length of the reorder. |
| **shuffleTween** → `ease` | named curves | |
| **shuffleSpring** → `stiffness` / `damping` / `mass` | 20–1200 / 1–80 / 0.2–5 | Spring constants for the reorder. |

### CTA button

The FoldableButton, shown only on the front card.

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `scale in (front card only)` | toggle | Animate the button in when a card reaches the front. | |
| `delay (s)` | 0–2 | Offset before the button pops. | Letting the card settle first. |
| `from scale` | 0–1.5 | Starting scale (animates to 1). `0` = grows from nothing. | |
| `from opacity` | 0–1 | Starting opacity. | |
| `transform origin` | `center` · `bottom right` · … | Pivot of the scale. | Where the button "grows from". |
| `type` | `spring` / `tween` | Which model the pop uses. | Elastic vs timed. |
| **ctaTween** → `duration (s)` / `ease` | 0.05–2 / curves | Timed pop. | |
| **ctaSpring** → `stiffness` (↑ snappier) / `damping` (↓ more elastic) / `mass` | 20–1200 / 1–60 / 0.2–5 | Elastic pop constants. | A springy "boing" entrance. |

---

## Particle Rain

Gold bars burst from the top, fall, bounce and pile on the floor. Canvas-2D, no
library. See [the README section](../README.md#particle-rain) for the intended
integration flow.

### emission

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `mode` | `burst` / `stream` | One drop of `count` bars, or a continuous `spawnRate`/s stream. | **`burst`** is what we use — one payout reveal. |
| `count / pool` | 1–400 | **burst:** total bars that fall. **stream:** max alive at once. Scaled by width if `scale w/ width` is on (this is the count at `ref width`). | **The "how much gold" dial** — set it to roughly track the size of the reward. |
| `burst window (s)` | 0–4 | How long the burst takes to release every bar (`0` = all on one frame). | A sharp dump vs a pour. |
| `stream /s` | 1–200 | Bars per second in stream mode. | |
| `stream secs (0=∞)` | 0–30 | How long the stream runs (`0` = forever). | |
| `spawn band` | 0–1 | Fraction of the frame width bars drop from, centred. | On wide screens, drop to ~0.4–0.6 so the gold falls in a central column. |
| `spawn above (px)` | 0–800 | How far above the top edge bars start, randomised — staggers their entry. | |

### responsive

| Control | Range | What it changes |
|---|---|---|
| `scale w/ width` | toggle | Auto-scale `count` and `particleSize` with the live canvas width. |
| `ref width (px)` | 320–1920 | The width at which `count` / `particleSize` come out exactly as set. |
| `count vs width` | 0–1 | How hard count follows width. `1` = linear (constant density everywhere); lower = wide screens get denser. |
| `size vs width` | 0–1 | Same, for bar size. |
| `clamp min` / `clamp max` | 0.1–1 / 1–4 | Bounds on the width-scale factor so a tiny phone or an ultrawide doesn't over/under-do it. |

### physics

| Control | Range | What it changes | Use it for |
|---|---|---|---|
| `gravity (m/s²)` | 0–40 | Downward acceleration. `9.8` = Earth, `1.6` = Moon, `24.8` = Jupiter. (Engine ×143 internally for px/s².) | Weight / drop speed feel. |
| `start vy min` / `start vy max` | 0–1500 / 0–2000 px/s | Initial downward speed range at spawn. `0/0` = a pure drop from rest. | Bars flung down vs let go. |
| `start vx ±` | 0–800 px/s | Initial horizontal scatter. | A wide fan vs a tight column. |
| `air drag` | 0–4 (1/s) | Exponential velocity damping. `0` = vacuum. | Feathery vs bullet-like fall. |
| `terminal vel` | 0–3000 px/s | Hard cap on fall speed (`0` = none). | |
| `wind` | −2000–2000 px/s² | Constant sideways acceleration. | A drift as they fall. |
| **sway** → `amplitude (px)` | 0–120 | Horizontal flutter while falling (fades out as a bar slows). | A leaf-like wobble. |
| **sway** → `frequency (Hz)` | 0–6 | Flutter oscillations per second. | |
| **spin** → `spawn min °/s` / `spawn max °/s` | 0–720 / 0–1440 | Tumble speed range given at spawn. | |
| **spin** → `drag (1/s)` | 0–4 | Spin damping. | |
| **spin** → `airborne` | `keep` / `killOnContact` / `off` | Whether the spawn spin persists, is zeroed the first time a bar touches anything, or is never applied. | `killOnContact` = tumble in the air, freeze flat on landing. |
| **spin** → `from contacts` | 0–1 | How much a sliding contact (floor skid, bar-on-bar rub) converts to spin. | Bars that keep tumbling from what they hit. |

### floor

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `floor` | `fallThrough` / `bounce` | Bars pass through and despawn, or bounce and pile. | **`bounce`** is what we use. |
| `inset (px, −=below)` | −300–400 | Floor line offset from the bottom edge. Negative sinks the pile partly off-frame (bottom row clipped). | A pile that sits in a shallow tray at the bottom. |
| `bounce` | 0–1 | Vertical speed kept per bounce (restitution). | Lively bounce vs a dead thud. |
| `friction` | 0–1 | Horizontal + spin speed a bar loses on each floor contact. | The skid when a bar lands. |
| `settle < px/s` | 5–400 | Speed below which a supported bar locks into the pile. | Lower = bars keep jostling longer before freezing. |
| `fade-out (s)` | 0–2 | *(fallThrough)* Fade time after a bar passes the floor line. | |
| `dump stagger (s)` | 0–0.6 | **`dump()` only** — delay each pile layer waits after losing support before it lets go. Spreads the collapse into a bottom-up cascade. | A slow dramatic crumble vs a fast dump. |

### walls

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `side colliders` | toggle | Left + right colliders at the frame edges. | **On** in our setup — keeps the pile off the edges instead of clipping. |
| `inset (px, −=outside)` | −200–300 | How far each wall sits inside the frame edge; negative = outside the visible edge. | Narrowing the pile to a column (pair with a lower `spawn band`). Note: fixed px, so test across sizes. |
| `bounce` | 0–1 | Horizontal speed kept when a bar hits a wall. | |
| `friction` | 0–1 | Vertical + spin speed a bar loses sliding down a wall. | |

### collision

| Control | Range | What it changes | Use it for |
|---|---|---|---|
| `collide + stack` | toggle | Bars collide with each other and pile up (bounce mode). Off = flat single-layer heap. | **On** in our setup. |
| `hit radius` | 0.2–1.2 | Collision-circle radius as a fraction of a bar's half-size (bars aren't round, so keep < 1). | Looser or tighter packing. |
| `bounce` | 0–1 | Bounciness of bar-on-bar hits. Keep near 0 for a dense pile — bouncy hits never settle. | |
| `bar grip` | 0–1 | Tangential friction on **every** contact, resting ones too — bars catch on each other. | A pile that holds a steeper slope. |
| `pile friction` | 0–1 | Per-frame damping on any supported bar. **The pile-lock knob** — raise it if the pile keeps creeping outward. | |
| `iterations` | 1–6 | Position-solver passes per frame. Higher = firmer, less springy stacks (costs a little CPU). | Deep / high-count piles. |
| `wake px/s (0=off)` | 0–1200 | Impact speed that un-settles a rammed pile bar. `0` = the settled pile is never disturbed. | Letting a hard landing knock the pile loose. |

### appearance

| Control | Range / options | What it changes |
|---|---|---|
| `asset` | `both` / `gbar` / `tinyBar` | Which gold-bar sprite(s) to use. |
| `size (px)` | 8–160 | Nominal bar size at scale 1, before the responsive width-scale. |
| `scale min` / `scale max` | 0.1–2 / 0.1–3 | Per-bar random size range. |
| `big=faster` | 0–1 | Couples bar size to fall speed — bigger bars drop faster (parallax). |
| `fade in (s)` | 0–1 | Spawn fade-in time. |
| `opacity` | 0–1 | Global peak opacity. |

---

## Gem Reveal

The looping `gem.lottie` rises from below and hovers, tinted via its `gemColor`
slot. See [the README section](../README.md#gem-reveal). Colour / hover / effects
update live; the entry re-runs on **↻ Replay reveal**.

It plays as a **two-phase, developer-triggered sequence**:

- **reveal** — the gem rises and hovers; warp streaks + the jet stream run in the
  background; gem streaks loop; the grade auto-cycles; the Lottie loop runs at
  `reveal loop speed ×`. Optionally a white flash fires as it settles in
  (`white flash → flash on entering the loop`).
- **locked** — the **🔒 Lock grade** stage button (or the `phase` prop) fires the
  transition: a coupled punch + white flash, the grade snaps to the `grade`
  dropdown, gem + warp streaks fade off, the jet retracts (its own timing), the
  loop speed eases to `locked loop speed ×`, and the folded grade button springs
  in below the gem. **↻ Replay reveal** returns to phase 1.

### colour / token

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `grade` | Holy Grail · Mythic · Illustrious · Storied · Renowned · Notable | Which grade colour is on the gem — written into the Lottie `gemColor` slot. | Showing a given grade. |
| `grade colours →` | 6 colour pickers | The hex for each grade (`#ffbf00` … `#da6821` by default). Editable, saved with the config. | Dialling in the exact grade palette — send it back to lock in. |
| `auto-cycle grades` | toggle | Step through the six grades automatically. | A "rolling" reveal that lands on a grade. |
| `start interval (s)` | 0.05–4 | The first gap between colour changes. | |
| `speed-up ramp` | 0–1 | How hard the interval shortens after each change (`0` = constant rate). | The cycle accelerating to a blur then stopping. |
| `min interval (s)` | 0.03–1 | Floor the accelerating interval can't drop below. | |
| `white-flash between` | toggle | Fire the white flash on every grade change. | Extra impact on the cycle. |

### playback

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `reveal loop speed ×` | 0.1–4 | Lottie playback rate during the reveal loop (`1` = authored). Defaults to `2` — a fast shimmer while the grade cycles. | The energy of the reveal. |
| `locked loop speed ×` | 0.1–4 | Playback rate once the grade is locked. The loop eases from `reveal` → this across the lock transition (see **lock transition → speed revert**). | A calm settled gem. |

### entry

| Control | Range | What it changes | Use it for |
|---|---|---|---|
| `from below (px)` | 0–1200 | How far below centre the gem starts. | Distance of the pop-up. |
| `from scale` | 0–1 | Scale the gem starts at (springs to `rest scale`). | A gem that grows in vs one that's already full-size. |
| `delay (s)` | 0–2 | Pause before the pop begins. | Timing against other reveal elements. |
| `spring stiffness` | 20–900 | Pop tightness (higher = snappier). | |
| `spring damping` | 2–60 | Overshoot (lower = more bounce past centre). | An overshoot-and-settle landing. |
| `spring mass` | 0.2–4 | Inertia (higher = slower, heavier). | |

### hover

| Control | Range | What it changes | Use it for |
|---|---|---|---|
| `sine hover` | toggle | The gentle drift once the gem has arrived. | |
| `amp X` / `amp Y` | 0–80 px | Sine amplitude horizontally / vertically. | How much it floats. |
| `freq X` / `freq Y` | 0–2 Hz | Sine oscillations per second. Different X/Y frequencies make a lazy figure-8. | |
| `rotate sway (°)` | 0–20 | Peak gentle rotation. | A gem that lists as it hovers. |
| `randomness` | 0–1 | Drifts the sine phases each frame so the hover never quite repeats. | Organic float vs a mechanical loop. |

### scale + punch

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `rest scale` | 0.2–3 | Resting gem size (applied instantly). | Overall size. |
| `punch to ×` | 0.5–**12** | Where the **✦ punch scale** trigger springs the scale to (then it relaxes back). | A hit / emphasis pulse — now up to a huge slam. |
| `punch stiffness` | 40–1200 | Punch spring tightness. | |
| `punch damping` | 2–60 | Punch overshoot. | |
| `apex colour flash` | `off` / `current grade` / a grade | At the **peak** of the punch, briefly flash the gem that colour (via the flash overlay) and fire the gem-streak burst. | A colour pop at the top of the slam. |
| `↳ flash (s)` | 0.05–1 | Length of the apex flash. | |

**Punch and white flash are one event** — a ✦ punch always fires the white flash, and a ⚡ white flash always kicks the punch scale. Tune them together.

### white flash

The **⚡ white flash** button / `flashSignal` prop, the **✦ punch scale** trigger (coupled), or between grades in the auto-cycle. Whites the gem out, kicks the punch, fires the streak burst, spikes the glow.

| Control | Range | What it changes | Use it for |
|---|---|---|---|
| `hold full (s)` | 0–0.6 | How long the gem stays solid white before it starts fading back. | A hard freeze-frame flash vs an instant pop. |
| `decay (s)` | 0.05–2 | How long the white takes to fade off. | |
| `blur / bloom (px)` | 0–60 | CSS blur on the flash overlay (on an unclipped wrapper, so the white blooms *past* the gem silhouette). Also applies to the punch's apex flash. | A soft blown-out bloom vs a crisp white cut-out. |
| `glow spike ×` | 0–3 | How hard the glow blooms during the flash. | A blown-out impact. |
| `emit gem streaks` | toggle | Fire the radial streak burst with the flash. | |
| `flash on entering the loop` | toggle | Fire a white flash as the gem finishes its entry and settles into the reveal loop. **Ambient** — flash + glow spike (+ streaks), *no punch*. | A "charge-up" pop as the loop begins. |
| `↳ delay after arrival (s)` | 0–2 | Beat between the gem arriving and that flash. | |

### glow

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `glow` | toggle | A soft **radial halo wash** (reach + brightness) plus a **CSS-blurred core diamond** that keeps the gem's silhouette (canvas, `lighter` blend) — no hard fill, so it never leaves a solid shape behind the gem. | |
| `colour (tier / hex)` | `tier` or `#RRGGBB` | `tier` matches the current grade; or pin a colour. | A glow that's always gold, say. |
| `intensity` | 0–6 | Overall brightness multiplier for the whole glow (halo + core). Was hard to see before — push it up. | A faint ambient sheen vs a blazing aura. |
| `reach (× gem)` | 0.5–4 | How far the halo spreads past the gem, as a multiple of the gem silhouette. | Keeping the glow tight to the gem vs filling the frame. |
| `blur (px)` | 0–200 | Softness of the core diamond (and adds to the halo radius). | A crisp diamond glow vs a diffuse cloud. |
| `core passes` | 1–4 | How many times the core diamond is stacked — higher = a brighter, more saturated core that reads as the gem shape. | |
| `pulse (Hz)` | 0–4 | Breathe the glow. `0` = steady. | A gem that throbs. |

### gem streaks (radial starburst)

The `GEM_streaks` shape — thin rects radiating from the gem centre, expanding and fading.

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `radial streak burst` | toggle | The effect on/off. | |
| `count` | 2–24 | How many spokes (8 = the reference SVG). | A tight cross vs a dense sunburst. |
| `speed (px/s)` | 40–2000 | Initial outward speed. | |
| `deceleration` | 0–1 | `0` = they fly out at constant speed · `1` = they snap to a near-instant stop. | A soft drift vs a sharp pop-and-hold. |
| `delay after land (s)` | 0–1.5 | Wait after the gem arrives before the reveal burst fires. | Landing the burst on a beat. |
| `length (px)` / `width (px)` | 4–120 / 1–20 | The rect dimensions. | |
| `opacity` | 0.05–1 | Starting opacity (fades to 0 over `life`). | |
| `life (s)` | 0.1–2 | Fade duration. | |
| `colour (tier / hex)` | `tier` or hex (default white) | | |
| `fire on reveal` | toggle | Burst once when the gem lands. | |
| `fire on punch apex` | toggle | Burst at the peak of a ✦ punch. | |
| `loop during reveal` | toggle | Keep re-firing bursts on an interval through the reveal loop (on by default). | The pulsing "charging" look before the lock. |
| `↳ interval (s)` | 0.15–3 | Gap between the reveal-loop bursts. | |

*(Also fires on the white flash and on the lock's coupled punch/flash, and on the **✷ emit streaks** button. In-flight bursts fade with the lock transition.)*

### warp streaks (upward-flight lines)

Vertical speed lines streaming down past the gem — relative motion reads as the gem flying up. **On at full through the reveal loop** (ramps up over ~0.3s), then fades 1 → 0 across the lock transition (**lock transition → streak/warp fade**).

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `upward-flight lines` | toggle | The effect on/off (on by default). | |
| `count` | 0–160 | How many streaks fill the frame. | Sparse motion lines vs a dense warp field. |
| `speed (px/s)` | 100–3000 | Base downward speed. | |
| `↳ speed variation` | 0–1 | Per-streak speed spread. | A layered, parallax feel. |
| `length (px)` / `width (px)` | 10–400 / 0.5–12 | The streak element size. | Long thin warp lines vs short dashes. |
| `colour (tier / hex)` | `tier` or hex (default white) | | |
| `↳ colour variation` | 0–1 | Per-streak hue jitter (± this × 60°). | A prismatic warp. |
| `opacity` | 0.02–1 | Base opacity. | |
| `↳ opacity variation` | 0–1 | Per-streak opacity spread. | Depth. |

### jet

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `jet stream` | toggle | Gradient tail(s) streaming down from the gem. | A "launched from below" look. |
| `tracks` | 1 or 2 | One centred track, or two parallel tracks. | A twin-exhaust look. |
| `track width (px)` | 4–240 | Width of each track at the gem. | |
| `spacing (2-track)` | 0–200 | Gap between the two tracks (ignored for 1 track). | |
| `length (px)` | 0–800 | How far the tail reaches. | |
| `taper` | 0–1 | How much each track narrows toward its end (`1` = to a point). | A jet flame vs a wide beam. |
| `opacity at gem` / `opacity at tail` | 0–1 each | The tail's **gradient opacity** — strong at the gem, fading down (or set both for a flat band). | |
| `fade delay after lock (s)` | 0–4 | The jet stays fully on through the whole reveal loop; this is the beat **after the grade is locked** before it starts retracting. | Letting the jet linger past the lock then retract. |
| `fade duration (s)` | 0–4 | Over this long the stream **retracts from the tail toward the head** — the head stays pinned to the gem the whole time, the far end disappears first. | The jet drawing back into the gem as it settles. |
| `colour (tier / hex)` | `tier` or hex | | |

### lock transition

What happens when the reveal moves to **locked** (the **🔒 Lock grade** button / `phase` prop).

| Control | Range | What it changes | Use it for |
|---|---|---|---|
| `punch/flash delay (s)` | 0–2 | Beat between the lock trigger and the coupled punch + white flash firing. | Letting the cycle stop before the impact hits. |
| `speed revert delay (s)` | 0–3 | Beat after the lock before the loop-speed wind-down *starts*. | Holding the fast loop through the punch, then winding down. |
| `speed revert (s)` | 0–5 | How long the Lottie loop then takes to ease `reveal loop speed ×` → `locked loop speed ×`. | A slow wind-down vs a quick settle. |
| `↳ ease` | `linear` / `easeIn` / `easeOut` / `easeInOut` | Curve of the speed wind-down. | |
| `streak/warp fade (s)` | 0–4 | How long the gem streaks + warp streaks take to fade to nothing (the jet has its own timing — see **jet**). | Holding the sparkle a beat longer, or cutting it fast. |
| `↳ ease` | `linear` / `easeIn` / `easeOut` / `easeInOut` | Curve of the fade. | |

### grade button

The Banner design's **folded button**, centred just below the gem, labelled with the grade tier name. Springs in after the lock.

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `folded button on lock` | toggle | Show it at all (on by default). | |
| `label (blank = tier name)` | text | Override the label; blank uses the locked grade's name (e.g. "HOLY GRAIL"). | A custom CTA instead of the tier name. |
| `offset X (px)` | −200–200 | Horizontal nudge from centre. | |
| `offset Y — overlap (px)` | −120–160 | Gap from the gem's bottom point to the button's top edge. **Negative overlaps** the gem. | How much it tucks under the gem. |
| `delay after lock (s)` | 0–2 | Beat before it starts springing in. | Landing it after the punch settles. |
| `from scale` / `from rotate (°)` | 0–1.5 / −45–45 | Where the scale + rotation spring in from. | A pop-and-straighten vs a straight grow. |
| `settled rotate (°)` | −20–20 | Resting tilt. | A jaunty angle. |
| `settled scale` | 0.3–2.5 | Resting size. | |
| `spring stiffness / damping / mass` | 40–1200 / 2–60 / 0.2–4 | The scale + rotate spring (same for both). | Snappy vs loose entrance. |

| Where | Control | What it does |
|---|---|---|
| Top-left of the stage | **Stats HUD** | FPS (rolling), JS heap (Chrome only), and the bench bundle size. Click the header to collapse it to a pill. |
| Below the Stats HUD | **↻ Replay / Drop again** | Re-runs the animation. |
| Top-right of the stage | **Next ▸** *(Banner)* · **⤓ Pull the floor out** *(Rain)* · **🔒 Lock grade** + **⚡ White flash** *(Gem, stacked)* | Advance the stack / dump the pile / run the gem's lock transition or fire the coupled punch+flash. **🔒 Lock grade** disables once locked; **↻ Replay reveal** returns to phase 1. |
| Gem Export folder | **🔒 lock grade** · **✦ punch scale** · **⚡ white flash** · **✷ emit streaks** | Same lock trigger as the stage button, plus the individual punch / flash / streak triggers. |
| Bottom dock | **spec cards** | The `copy` panels start **collapsed**; click a card header to expand it. The `copy` button works either way. |
