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

## Not in Leva

| Where | Control | What it does |
|---|---|---|
| Top-left of the stage | **Stats HUD** | FPS (rolling), JS heap (Chrome only), and the bench bundle size. Click the header to collapse it to a pill. |
| Below the Stats HUD | **↻ Replay / Drop again** | Re-runs the animation. |
| Top-right of the stage | **Next ▸** *(Banner)* / **⤓ Pull the floor out** *(Rain)* | Advance the stack without dragging / trigger the dump. |
| Bottom dock | **spec cards** | The `copy` panels start **collapsed**; click a card header to expand it. The `copy` button works either way. |
