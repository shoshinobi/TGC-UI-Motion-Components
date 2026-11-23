# Leva panel — every control, per component

The right-hand panel is [Leva](https://github.com/pmndrs/leva). It drives the live
preview and nothing else — the values it produces are what the **Export**
buttons copy out. Adjusting a control never touches the deliverable; it just
changes what you see so you can dial in numbers to hand back.

- **Folders** group related controls. Some open collapsed — click the folder name.
- **Sliders** drag or type a number. **Selects** are dropdowns. **Toggles** are
  checkboxes. **Colour** swatches open a picker.
- The `component` dropdown at the very top switches which preview loads (same as
  the `?c=` URL param: `?c=flame`, `?c=sheet`, `?c=gauge`, `?c=banner`, `?c=rain`, `?c=gem`, `?c=wheel`).

---

## Controls every bench shares

### Stage folder

| Control | Type | What it does |
|---|---|---|
| `background` | select `dark` / `light` / `ember` | Stage backdrop only — never exported. `ember` is a radial gradient rising from the bottom edge (default a dark-red glow) for checking how the gem reads against a tinted backdrop. |
| `ember colour` *(Gem)* | colour | The hot colour of the `ember` gradient. Pick anything to test the gem against different background tones. |
| `ember spread (%)` *(Gem)* | 10–140 | How far the ember gradient reaches — small = a tight glow at the bottom, large = the colour fills most of the frame (near-flat wash). |
| `paused` | toggle | Freezes the animation / simulation in place. |
| `start as` *(Flame Pictogram)* | select `looping` / `hidden` | `looping` — visible and looping from the start (default). `hidden` — starts at scale 0, invisible, loop not running, until the first **🔥 Daily Streak**. |
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
`localStorage` so it survives a reload), **`⤓ pull the floor out (clear
screen)`**, **`🪙 load "daily gold bonus" preset`**, and **`▶ play daily gold
sound`**. Flame Pictogram adds **`🔥 daily streak`**. Banner Stack adds
**`next banner ▸`**, **`★ save as approved (this viewport)`**, and **`reset
this viewport to code default`**.

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

### Daily Streak (the "ignite" entrance)

`Stage → start as` picks the idle state: **`looping`** (default) is already
visible and looping; **`hidden`** starts at scale 0 with the loop not running,
until the first trigger. Either way, pressing **🔥 Daily Streak** (stage +
Export button) plays `flameStreak.mp3` and springs each of the three layers in
— **staggered** (outer → middle → inner). Per layer:

1. **grows to full height first** — `scaleY` 0→1 (bottom-anchored);
2. **once that settles, widens** — `scaleX` from `from scaleX` → 1;
3. **colour**: starts at `start colour`, **holds** it for `hold (s)`, then
   **tweens** to the appearance `color` over `tween to colour (s)` — running
   the whole time alongside the scale, not after it.

Once every layer has widened out and coloured in, the flame just continues its
ordinary flicker loop underneath (starting it, in `hidden` mode).

| Control | Range | What it changes | Use it for |
|---|---|---|---|
| `layer stagger (s)` | 0–0.5 | Gap between each layer's entrance start (outer first). | Tighter = the three pop almost together; looser = a visible ripple outer→middle→inner. |
| `from scaleX` | 0.05–1 | How thin each layer starts (in width) before its height finishes growing. | Lower = a finer, whip-like initial lick. |
| **height spring (Y)** → `stiffness` / `damping` / `mass` | 40–1200 / 2–80 / 0.2–4 | The 0→1 `scaleY` spring — grows the layer to full height. Damping ≥ ≈2·√(stiffness·mass) = critically damped, no bounce (reads as ease-out). | How fast/snappy the flame shoots up. |
| **width spring (X)** → `stiffness` / `damping` / `mass` | 40–1200 / 2–80 / 0.2–4 | The `from scaleX`→1 spring — starts once that layer's height spring has settled. | How the flame flares out to full width; a touch of underdamping here gives a gentle overshoot/flare. |
| **colour flash** → `start colour` | colour | What each layer starts as when it ignites (default white). | A different "hot" colour, or match a brand accent. |
| **colour flash** → `hold (s)` | 0–1 | How long a layer holds `start colour` before it starts tweening away, measured from that layer's own entrance start. | Default **0.15s (150ms)** — a quick white flash before the real colour shows. |
| **colour flash** → `tween to colour (s)` | 0.02–1.5 | Duration of the `start colour` → `color` tween (`easeOut`). | Snappy vs a slow colour bloom. |

This lives in `FlamePictogram.tsx` as **additive, opt-in** props
(`entranceSignal` + `entrance` config + `startHidden`) — omit all three and
the component renders exactly as it always did. `FlameBench.tsx` just wires
the button + `start as` select to them and plays the cue alongside. Wire the
same entrance + cue wherever your real daily-streak moment shows the flame.

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
viewport** loads that viewport's config. **Only phone and tablet ship** —
`full` doesn't suit the real UI's layout, so tablet is the largest breakpoint
to wire up; `full` stays in the bench as a reference.

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
| `dump gravity × at start / at end` · `dump ramp (s)` · `dump ramp power` · `dump stagger at end` *(floor folder)* | | Optional "pull the floor" ramp: gravity eases (power 3 = cubic) from the start to the end multiplier, and the stagger to its end value. Defaults (1 / 1 / −1) leave the dump as it was. |
| `↳ release ease-in (1=steady)` / `↳ first bars speed ×` *(emission folder)* | | Burst only: ease the release rate in (a trickle that builds) and start the first bars slower. Defaults (1 / 1) leave the burst as it was. |
| `dump style` + `↳ seq: front time / front power / release jitter / drift / spin` *(floor folder)* | | `physics` (default) = the original collapse; `sequenced` = collisions off, bars released bottom → top on an eased front — the smooth drain the Gold Reveal uses. |
| `freeze pile after (s, 0=off)` | 0–10 | Seconds after the last bar drops in before the whole pile is frozen as settled. `0` = off (wait for it to go quiet). | A very deep pile that never quite stops jittering (the Gold Reveal sets it). |

### appearance

| Control | Range / options | What it changes |
|---|---|---|
| `asset` | `both` / `gbar` / `tinyBar` | Which gold-bar sprite(s) to use. |
| `size (px)` | 8–160 | Nominal bar size at scale 1, before the responsive width-scale. |
| `scale min` / `scale max` | 0.1–2 / 0.1–3 | Per-bar random size range. |
| `big=faster` | 0–1 | Couples bar size to fall speed — bigger bars drop faster (parallax). |
| `fade in (s)` | 0–1 | Spawn fade-in time. |
| `opacity` | 0–1 | Global peak opacity. |

### audio (not a Leva control — stage + Export buttons)

**🪙 Daily Gold** loads the [daily gold bonus preset](../README.md#daily-gold-bonus--stream-preset),
re-drops, and plays `dailyGold.mp3`. **`▶ play daily gold sound`** (Export
only) plays the same cue on its own, no config change. Both live in the bench
(`RainBench.tsx`).

> **Dev note — syncing the cha-ching to your avatar.** `dailyGold.mp3` is a
> combined cue (the gold-drop chime **+** a baked-in cha-ching). If that
> cha-ching doesn't land in sync with an avatar reaction elsewhere in your
> screen, use the two split files instead: `dailyGoldChime.mp3` (the drop
> sound only) tied to the gold appearing, and `chaChing.mp3` fired on its own,
> timed to whenever the avatar's reaction actually happens. All three are in
> `src/assets/mp3/`; only `dailyGold.mp3` is wired into this bench.

---

## Gem Reveal

The looping `gem.lottie` rises from below and hovers, tinted via its `gemColor`
slot. See [the README section](../README.md#gem-reveal). Colour / hover / effects
update live; the entry re-runs on **↻ Replay reveal**.

It plays as a **three-phase, developer-triggered sequence** (the `phase` prop):

- **armed** — the gem waits off-screen; nothing plays or renders. The **🚀
  Launch** stage button starts it.
- **reveal** — the gem rises and hovers; warp streaks + the jet stream run in the
  background; gem streaks loop; the grade auto-cycles; the Lottie loop runs at
  `reveal loop speed ×`. Optionally a white flash fires as it settles in
  (`white flash → flash on entering the loop`).
- **locked** — the **🔒 Lock grade** stage button (or the `phase` prop) fires the
  transition: an optional **white blast** (the gem flares pure white for a beat),
  then a coupled punch + white flash, the grade snaps to the `grade` dropdown,
  gem + warp streaks fade off, the jet retracts, the loop speed eases to `locked
  loop speed ×`, and the folded grade button springs in below the gem. **↻
  Replay reveal** returns to phase 1 (armed).

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
| `punch to ×` | 0.5–**12** | Peak scale the **✦ punch scale** trigger drives to. | A hit / emphasis pulse — up to a huge slam. |
| `punch model` | `spring` / `tween` | **spring** = one ballistic kick that overshoots toward `punch to ×` and relaxes back (uses the two *spring:* rows). **tween** = keyframed: ramp up, hold at full, ease back (uses the five *tween:* rows). | A loose bouncy hit vs a precisely-timed hold. |
| `spring: stiffness` | 40–1200 | Spring tightness. | *(spring model)* |
| `spring: damping` | 2–60 | Overshoot — lower = more bounce past the peak. | *(spring model)* |
| `tween: in (s)` | 0.01–2 | Time to ramp `rest scale` → `punch to ×`. | How fast it slams up. |
| `tween: in ease` | `linear` / `easeIn` / `easeOut` / `easeInOut` | Curve of the ramp-up. | `easeOut` = a fast punch that decelerates into the peak. |
| `tween: hold at full (s)` | 0–2 | How long it sits at `punch to ×` before easing back. | A held "frozen at max" beat. |
| `tween: out (s)` | 0.01–3 | Time to ease `punch to ×` → `rest scale`. | A slow melt back vs a quick snap. |
| `tween: out ease` | `linear` / `easeIn` / `easeOut` / `easeInOut` | Curve of the return. | `easeOut` = decelerate into rest. |
| `apex colour flash` | `off` / `current grade` / a grade | At the **top** of the punch (peak scale / start of the hold), briefly flash the gem that colour and fire the gem-streak burst. | A colour pop at the top of the slam. |
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

Vertical speed lines streaming down past the gem — relative motion reads as the gem flying up. **Off until the gem reaches centre**, then fades on a beat later; fades 1 → 0 across the lock transition (**lock transition → streak/warp fade**).

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
| `fade-on delay (after centre) (s)` | 0–3 | Beat between the gem reaching centre and the warp starting to appear. | Letting the gem settle before the speed lines kick in. |
| `fade-on (s)` | 0.05–3 | How long the warp takes to fade on (easeInOut). | A gentle build vs a snap. |

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

What happens when the reveal moves to **locked** (the **🔒 Lock grade** button / `phase` prop). Everything below `blast build` is timed from the *end* of the blast.

| Control | Range | What it changes | Use it for |
|---|---|---|---|
| `white blast before reveal` | toggle | On lock, swap the gem to **pure white** and spike the glow, building for `↳ blast build (s)`, *then* the grade colour bursts in under the flash. | A hard "transformation" beat between the cycling grades and the locked one. |
| `↳ blast build (s)` | 0–1.5 | How long the white blast builds before the punch + grade reveal. | A quick strobe vs a held charge-up. |
| `punch/flash delay (s)` | 0–2 | Beat between the blast ending and the coupled punch + white flash firing. | |
| `speed revert delay (s)` | 0–3 | Beat after the blast before the loop-speed wind-down *starts*. | Holding the fast loop through the punch, then winding down. |
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
| `delay after lock (s)` | 0–2 | Beat (from the end of the blast) before it starts springing in. | Landing it after the punch settles. |
| `from scale` / `from rotate (°)` | 0–1.5 / −45–45 | Where the scale + rotation spring in from. | A pop-and-straighten vs a straight grow. |
| `settled rotate (°)` | −20–20 | Resting tilt. | A jaunty angle. |
| `size (crisp)` | 0.5–6 | Scales the button's **real** font / height / padding, so it stays sharp at any size. Use this to make it big. | A large legible tier badge. |
| `settled scale (pop)` | 0.3–2.5 | A transform scale *on top of* `size` — keep near 1 (transform scale blurs when large). | The resting point of the pop-in. |
| `spring stiffness / damping / mass` | 40–1200 / 2–60 / 0.2–4 | The scale + rotate spring (same for both). | Snappy vs loose entrance. |

### sound

The `GemReveal_*.mp3` files. Playback needs a user gesture — **🚀 Launch** is the first one, so nothing is audible until you launch.

| Control | Range / options | What it changes | Use it for |
|---|---|---|---|
| `sound on (master)` | toggle | Master enable — SFX **and** soundtrack. Off pauses everything; on resumes the loops if you're mid-reveal. **On by default** — the 🔊 icon in the stage's bottom-left corner toggles the same value. | Muting the bench. |
| `SFX volume` | 0–1 | One gain for the five `GemReveal_*` clips (not the soundtrack). | |
| `reveal loop` | `endless` / `timed` | `endless` — the reveal runs until you press **🔒 Lock grade**. `timed` — it auto-locks after the duration below (ticker stops, `end` plays, grade locks — same as the button). | A fixed-length daily reveal vs a dev-paced one. |
| `↳ timed: lock after (s)` | 1–30 | The reveal length in `timed` mode. | |
| `soundtrack` | `off` / `random` / `Belt and Braces` / `Chasing Quails` | The music bed. `random` re-rolls one of the two each reveal (changing this or `starts on` replays). | Auditioning either track, or leaving it to chance. |
| `↳ volume` | 0–1 | Soundtrack gain, **independent** of `SFX volume`. Sits under the SFX by default. | |
| `↳ loop` | toggle | Loop the track (it's ~2 min) or let it play once. | |
| `↳ starts on` | `launch` / `lock` | Begin the track with the launch, or after the grade locks. | An intro bed vs a "you won" outro. |
| `↳ lock: delay (s)` | 0–10 | With `starts on = lock`: wait this long after the lock before the track comes in. | Letting `end` land first. |

**SFX cues** (fixed, not in Leva): `ambientLoop` starts on launch and loops through to the end; `start` fires on launch; `ticker` loops from launch until the lock; `end` fires on the lock; `punch` fires on every **⚡ White flash** / **✦ Punch scale** trigger (not the lock's internal one, not the auto-cycle flash).

---

## Gem Wheel

"You found a gem" → spin a six-gem strip → land on the developer's preset grade. Seven states, each moved on by a stage button, a timer, or (for the spin) a swipe. The wheel gems are still images on one canvas (a cached rest frame per grade), so the drum stays at 60 fps; only one live, spinning Lottie runs — the found gem, then the landed winner.


**Hesitation → `before final gem`** (its own **Hesitation** section, between Stage and Wheel; toggle) — **Off (default):** the slowdown eases straight into the final resting position on the preset grade, no tease. **On:** it goes past, hangs, and snaps back (`go past by` / `hang there` / snap spring in **stop + suspense**).
### result

| Control | Options | What it changes |
|---|---|---|
| `lands on (preset)` | the six grades | The grade the wheel stops on. In the app this comes from the backend; the wheel's stop is calculated to land it exactly at the centre. |

### grade colours

Six pickers (defaults = Gem Reveal's approved grade colours) plus **`found gem`** — the colour of the gem in state 1 before it becomes Notable (white). Changing any colour re-caches the sprites (the wheel replays).

### found (1)

| Control | Range | What it changes |
|---|---|---|
| `size × Holy Grail` | 0.3–3 | Size of the found gem, × the Holy Grail size. It spins at full frame rate (live Lottie). |
| `from below (px)` + spring `stiffness / damping / mass` | | Its rise from the bottom of the screen. |
| `auto line-up after (s, 0 = trigger)` | 0–10 | Move to the line-up on a timer, counted from Start (default **2 s**); **⇣ Line up** still works sooner. `0` = wait for **⇣ Line up**. |
| `white flash on arrival` + `↳ delay after arrival (s)` | | The white flash (a solid white gem shape with a bloom) as the found gem lands; uses the landing folder's hold / decay / bloom. |

### jet (entry trail)

Gradient tracks trailing the found gem as it rises — the Gem Reveal jet. The head stays pinned to the gem; as soon as the gem first reaches the centre the stream retracts tail → head.

| Control | Range | What it changes |
|---|---|---|
| `jet trail` / `colour` | | On/off and colour (white by default, to match the found gem). |
| `tracks` / `track width` / `spacing` / `length` / `taper` | | Shape — 1 or 2 tracks. |
| `opacity at gem` / `opacity at tail` | 0–1 | The gradient. |
| `retract after reaching centre (s)` / `retract (s)` | | When the stream pulls back into the gem, and how long that takes. |

### warp (spin speed lines)

Vertical lines streaming past while the wheel spins, in the same direction as the gems — the Gem Reveal warp.

| Control | Range | What it changes |
|---|---|---|
| `speed lines` | toggle | On/off. |
| `count` | 0–160 | How many lines. |
| `speed × wheel` + `↳ speed variation` | | Line speed relative to the wheel's speed (× the slot spacing) — they speed up and slow down with it. |
| `length` / `width (px)` | | Line size. |
| `colour` + `↳ colour variation` / `opacity` + `↳ opacity variation` | | Look. |
| `fade in / out (s)` | 0.05–2 | How quickly the lines come on as the spin starts and leave as it stops (intensity also follows the wheel speed). |

### text

| Control | Range / options | What it changes |
|---|---|---|
| `text` | `You found a gem!` / `Spin the wheel` | The line under the found gem. |
| `then show (blank = none)` | text | A second line that fades in after the first fades out, while the wheel waits for a spin. |
| `size (px)` / `gap below gem (px)` | | Type size and spacing. |
| `fade-in delay (s)` | 0–3 | How long after the gem starts rising before the text fades in. |
| `fade (s)` | 0.05–2 | Fade duration (in and out). |
| `fade-out after line-up starts (s)` | 0–3 | When "You found a gem!" fades out, counted from the start of the line-up (default 0 = immediately). |
| `prompt in after line-up (s)` | 0–3 | How long after all six gems settle before "Spin the wheel" fades in. |
| `prompt position` | center / bottom | **center** (default): in the middle of the stage, between the two arrows. **bottom**: in the bottom margin, under Notable. |

### line-up (2)

| Control | Range | What it changes |
|---|---|---|
| `Holy Grail size (px)` | 40–560 | The biggest gem (default 88) — the anchor for every other size. |
| `shrink per grade down` | 0–0.4 | Each grade down is this much smaller than the one above (default 0.15 → Notable ≈ 0.44 × Holy Grail, ~39 px). Scaled evenly in both axes. Each gem keeps its own size the whole way round. |
| `found → Notable (s)` + `↳ ease` | | The found gem shrinking + sliding into the Notable slot while it colour-tweens white → Notable; its spin crossfades out so all six are still once lined up. |
| `drop-in stagger (s)` | 0–0.6 | Gap between each of the other five dropping in from the top. |
| `drop spring stiffness / damping` | | The drop-in spring. |
| `auto spin after (s, 0 = swipe)` | 0–10 | Spin on a timer instead of waiting for a swipe or **⟳ Spin**. |

### strip (spacing + fade)

A flat strip with equal spacing — no faked 3D.

| Control | Range | What it changes |
|---|---|---|
| `fit line-up to stage` | toggle | On (default): Holy Grail's top point and Notable's bottom point sit the same distance from the top / bottom edges, with equal spacing between. |
| `↳ margin top / bottom (px)` | 0–160 | That distance (default 42). |
| `slot spacing (px, not fitted)` / `line-up centre (slot, not fitted)` | | Set the spacing and the line-up position by hand when fitting is off. |
| `fade beyond line-up (slots)` | 0.1–4 | Gems further along the loop show past either end of the line-up, fading out over this many slots. |
| `sequence repeats` | 1–4 | How many times the six-gem sequence goes round the loop (3 = 18 slots). |

### spin (3)

| Control | Range | What it changes |
|---|---|---|
| `auto direction` | `down` / `up` | Direction for **⟳ Spin** / the auto timer (a swipe picks its own). |
| `auto speed (slots/s)` + `auto ease-in (s)` | | Cruise speed and how long the auto spin takes to reach it. |
| `spin before slowdown (s)` | 0–15 | **The spin timer** — how long it spins at speed (after a swipe or the auto ease-in) before the controlled slowdown starts. **■ Stop now** skips the rest. |
| `flick → speed ×` | 0.1–4 | How strongly swipe speed turns into wheel speed. |
| `flick min / max (slots/s)` | | Clamp on the swiped speed. |
| `flick threshold (px/s)` | 0–2000 | A release slower than this isn't a flick — the drum springs back to the line-up. |

### stop + suspense (4–5)

| Control | Range | What it changes |
|---|---|---|
| `slowdown (≈ s)` | 0.3–8 | Roughly how long the slowdown takes. The exact length is adjusted so it lands on the preset grade with no speed jump. |
| `ease-out power` | 1.5–6 | Shape of the slowdown: 2 = gentle, 5+ = a long crawl at the end. |
| `extra loops` | 0–4 | Extra full trips round the sequence during the slowdown. Loops are also added automatically when the target is too close. |
| *(Hesitation → `before final gem` — the toggle in the **Hesitation** section — switches the three settings below on/off)* | | |
| `go past by (slots)` | 0–0.95 | **The tease** — how far it carries on past the preset grade, in the direction it's spinning, before snapping back (`0` = no tease; default **0.5 = stops right on the division line with the next tier**; higher = the next gem is nearly in the slot). It always lands on the preset grade. |
| `hang there (s)` | 0–2 | How long it hangs at the creep-past point. |
| `snap-back stiffness / damping` | | The spring back onto the grade. |

### landing (6)

| Control | Range | What it changes |
|---|---|---|
| `flash delay / hold / decay (s)` + `flash bloom (px)` | | The white flash: a solid white gem shape over the winner, with a bloom. The winner starts spinning under it. |
| `others fade (s)` | 0.05–2 | The other gems + the line work fading out. |
| `winner size × Holy Grail` | 0.3–3 | The final size the winner grows to, alone in the centre. |
| `grow stiffness / damping` | | The grow spring. |
| `glow` + `↳ size / intensity` | | A grade-coloured halo behind the winner. |

### impact (6b)

On the landing flash, the winner swells past its resting size and settles back — the "impact" — while a white burst and a shockwave ring fire behind it.

| Control | Range | What it changes |
|---|---|---|
| `impact swell` | toggle | On/off. |
| `peak size × resting` | 1–4 | How big it gets at the peak (default 2× the resting winner size). |
| `ease out to peak (s)` / `hold at peak (s)` / `ease back down (s)` | | The swell: a fast ease-out to the peak, a brief hold, then a slow ease back to the resting size. |
| `white burst (0 = off)` + `↳ radius × height` / `↳ fade (s)` | | A big white radial flash behind the gem. |
| `shockwave ring` + `↳ colour / travel / width / opacity / duration` | | A ring that expands from the gem and fades. |
| `starburst (0 = off)` + `↳ strokes / distribution / rotate / burst radius / stroke length / stroke width / duration / colour` | | Straight strokes flying out from the icon's edge like clock hands, with the ring (default 16 gold strokes, even, 170 px, 0.55 s). |

### grade label

The folded button from Gem Reveal, springing in under the winner with the landed grade's name.

| Control | Range | What it changes |
|---|---|---|
| `folded label on landing` | toggle | On/off. |
| `text (blank = grade name)` | text | Override the label. |
| `delay after flash (s)` | 0–2 | When it springs in. |
| `offset Y — overlap (px)` | −120–160 | Gap from the winner's bottom point (negative overlaps). |
| `size (crisp)` | 0.5–6 | Real size of the button. |
| `from scale` / `from rotate` / `settled rotate` / spring | | The pop-in. |

### line work

| Control | Range | What it changes |
|---|---|---|
| `slot lines` | toggle | A straight horizontal line between each slot, evenly spaced, moving with the gems and fading past the line-up's ends (no vertical rails). |
| `colour` / `opacity` / `width (px)` | | Line style. |
| `line half-width (px)` | 30–400 | How far the lines reach toward the sides (capped at the stage edge). |
| `fade toward ends from` | 0–1 | Where along the line the fade to the ends starts (0 = from the centre, 1 = hard ends). |
| `centre arrows` + `↳ distance from centre (px)` / `↳ colour / opacity` | | The two pointers marking the landing spot. |
| `arrows pulse with the prompt` + `↳ travel (px)` / `↳ pulses per second` | | While "Spin the wheel" shows, the arrows pulse outward and back in toward it in a loop (default 10 px, 1.2 per second); eased in with the prompt and out when the spin starts. |
| `fade in after line-up settles (s)` + `↳ fade-in (s)` | 0–2 | The lines and arrows stay hidden while the gems move into the line-up, then fade in this long after they've settled (default 0 s, over 0.4 s). |

### gem animation

| Control | Range | What it changes |
|---|---|---|
| `wheel rest frame` | 0–59 | Which frame of the gem Lottie the still wheel gems show. |
| `cached res (px)` | 128–512 | Resolution of the cached wheel gems. |
| `spin speed × (found + winner)` | 0.1–4 | Loop speed of the live, spinning Lottie (the found gem and the winner). |
| `hover amp / freq / stagger` | | The up-and-down bob (off while spinning; back on the winner). |

### sound

| Control | Range / options | What it changes |
|---|---|---|
| `sound on` | toggle | Master (= the 🔊 stage icon). |
| `SFX volume` | 0–1 | start / ambient / end / punch. |
| `ambient loop` | toggle | `GemReveal_ambientLoop.mp3` from **▶ Start**. |
| `tick volume` | 0–1 | `drip4.ogg`, played **once per slot passing the centre**, so it runs at the wheel's speed. |
| `tick rate at rest / at speed` | 0.25–3 | Playback rate (pitch) of the tick, from slow to cruise speed. |
| `max ticks / s` | 2–40 | Cap so a very fast spin doesn't machine-gun. |
| `soundtrack` + `↳ volume / loop / starts on / delay` | | The Gem Reveal music, from **start**, the **spin**, or the **landing**. Default: Belt and Braces (as Gem Reveal), 0.5 s after the landing, volume 0.25. |

**SFX cues** (fixed): `start` on **▶ Start**; `end` when the wheel settles on the grade; `punch` on the flash.

| Where | Control | What it does |
|---|---|---|
| Top-left of the stage | **Stats HUD** | FPS (rolling), JS heap (Chrome only), and the bench bundle size. Click the header to collapse it to a pill. |
| Below the Stats HUD | **↻ Replay / Drop again** | Re-runs the animation. |
| Bottom-left of the stage | **🔊 audio toggle** *(Gem, Gem Wheel)* | Mute / unmute all audio (= the `sound` folder's `sound on` master). **On by default.** |
| Top-right of the stage | **Next ▸** *(Banner)* · **⤓ Pull the floor out** *(Rain)* · **🔒 Lock grade** + **⚡ White flash** + **🚀 Launch** *(Gem, stacked)* | Advance the stack / dump the pile / run the gem's lock transition, fire the coupled punch+flash, or start the reveal. **🚀 Launch** (armed → reveal) and **🔒 Lock grade** (reveal → locked) each disable once past their phase; **↻ Replay reveal** returns to armed. |
| Top-right of the stage *(Gold Reveal)* | **▶ Start** · **↻ Restart** · **⤓ Pull the floor** | Start the sequence; restart it from the top in one click (replay + start); pull the floor out early (enabled while pouring / piled). The state + estimated bar count show bottom-right. |
| Top-right of the stage *(Gem Wheel)* | **▶ Start** · **⇣ Line up** · **⟳ Spin** · **■ Stop now** (stacked) | Move the wheel through its states; each is only enabled in the state it applies to. A **vertical swipe on the stage** also spins it. The current state shows bottom-right. |
| Gem Export folder | **🚀 launch** · **🔒 lock grade** · **✦ punch scale** · **⚡ white flash** · **✷ emit streaks** | Same phase triggers as the stage buttons, plus the individual punch / flash / streak triggers. |
| Bottom-left of the stage | **Developer specs** (copy icon) | Shows / hides the spec boxes (wiring reference + JSON tokens) at the bottom. **Hidden by default**; the choice is remembered across components and reloads. Sits beside the 🔊 icon where there is one. |
| Bottom dock (when opened) | **spec cards** | The `copy` panels start **collapsed**; click a card header to expand it. The `copy` button works either way. The Export panel's copy buttons work whether or not the boxes are shown. |

## Gold Reveal

Tease → gold pile-up → the floor is pulled out → the amount (next to
`GOLDBAR_X3.svg`) counts up and lands with an impact → the Grail Shop push. The
pile is the Particle Rain engine, sized to fill whatever stage it's in.

### amount

| Control | Range | What it changes |
|---|---|---|
| `random amount each run` + `↳ from / to / round to` | | Bench only: a new random amount every run (default 100–10,000, rounded to 10). In the app the amount is the real payout. |
| `fixed amount (random off)` | 100–10000 | The amount used when random is off. |
| `count from` | 0–10000 | Where the count-up starts (0, or the old balance). |

### tease (1)

| Control | Range | What it changes |
|---|---|---|
| `line (headline / subheader)` | random each time / one pair | Which tease pair: **random each time** (default — a new pair every run, never the same twice in a row) or pin one of the 8 while tuning: *Ka-ching! / Someone's buying something nice* · *Heads up! / It's raining gold* · *Payday! / Brace yourself* · *Gold rush! / Your pockets are about to get heavy* · *Look out below! / Something shiny is headed your way* · *Big catch! / Hope you brought a bigger wallet* · *Clear some space! / This one's a big one* · *Jackpot! / Get ready to go shopping*. |
| `headline size (px on phone, shrinks to fit)` / `subheader size (px on phone)` | | Sizes on a 390 px phone (41 / 20). The headline stays on one line and shrinks if it wouldn't fit (e.g. *Clear some space!* on a phone); the subheader wraps onto balanced lines. |
| `↳ grow on wider screens` / `↳ max × phone size` | 0–1 / 1–3 | Responsive, no breakpoints: both sizes × (1 + (width / 390 − 1) × grow), capped at max (defaults 0.35 / 1.8 → ≈ 1.3× on a tablet, 1.6× on a 1100 px screen). |
| `subheader max width (px on phone, wraps)` | 100–600 | A subheader longer than this wraps onto two balanced lines (default 240; it grows with the text on wider screens). |
| `↳ comes in after headline (s)` / `↳ gap under headline (px)` | | When the subheader follows (1 s) and the space between the lines (6 px). |
| `↳ headline slides up over (s)` | 0.05–1.5 | The headline arrives alone at the centre; as the subheader comes in it slides up over this long (0.4 s) so the pair ends up centred together (heights are measured, so a wrapped subheader still centres). |
| `size (px)` | 12–48 | Text size. |
| `pop-in delay (s)` / `fade (s)` | | When it appears after Start, and its fade. |
| `pop from scale` / `pop from rotate (°)` / `settled tilt (°)` / `pop stiffness` / `pop damping` | | The springy pop-in — a little overshoot and a tilt for character. |
| `alone before the pour (s)` | 0–5 | How long the line is on its own before the gold starts. |
| `fade after pour starts (s)` | 0–3 | It sits under the pile, so it's buried anyway; this fades it out. |

### pile-up (2)

| Control | Range | What it changes |
|---|---|---|
| `fill level × height` | 0.2–1.3 | How high the settled pile reaches (1 = the whole screen). |
| `smaller amount → smaller pile` + `↳ full pile at amount` / `↳ smallest pile × height` | | Scale the pile with the amount: the smallest pile at 0, the full `fill level` at the set amount and above. |
| `packing (bar count ×)` | 0.4–2 | Fudge on the computed bar count — raise it if the pile comes up short of the fill level. |
| `bar size on phone (px)` | 24–200 | Bar size on a 390-wide phone. |
| `bar size vs width` | 0–1 | How much bars grow on wider screens (0 = same px everywhere → many more bars on desktop). |
| `bars` / `scale min` / `scale max` | | Which bar images, and their size spread. |
| `pour (release over, s)` | 0–5 | All the bars are released over this long. |
| `↳ ease-in (1 = steady)` | 1–6 | Ease-in on the release rate: the share released by time t is (t / pour)^ease, so it starts as a trickle and builds to a downpour (default 1.4). |
| `↳ first bars speed ×` | 0–1 | The first bars drop in at this × the drop-in speed, building to full speed on the same curve (default 1 = off). |
| `drop in from above (px)` | 0–1200 | How far above the top edge they start. |
| `gravity (m/s²)` / `bounce` | | Fall acceleration and bounciness (default 16). |
| `drop-in speed min / max (px/s)` | 0–4000 | Bars enter already falling this fast (default 950–1600). |
| `top fall speed (px/s)` | 500–5000 | Terminal velocity while pouring (default 2200). |
| `settle after last bar (s)` | 0.1–5 | After the last bar drops in, the pile is frozen as settled this long later. |

### drain (3)

| Control | Range | What it changes |
|---|---|---|
| `auto pull the floor` | toggle | On = pull it automatically once the pile settles; off = wait for **⤓ Pull the floor** / `drainSignal`. |
| `hold settled pile (s)` | 0–5 | Beat between the pile settling and the floor going. |
| `pull anyway after (s, 0 = off)` | 0–15 | Safety cap from the pour start. |
| `gravity × as the floor goes` | 0.05–3 | Gravity multiplier at the moment the floor goes — below 1 = the collapse starts slowly (default 0.1). |
| `gravity × at full ramp` | 0.5–10 | Gravity multiplier once the ramp completes — higher = the pile is off screen sooner (default 2.5). Top fall speed scales up with it. |
| `ramp time (s)` | 0.05–4 | How long the ramp takes from start to full (default 1 s). |
| `ramp power (3 = cubic)` | 1–6 | Shape of the ramp: 1 = steady, 3 = cubic (slow, then sharply faster), higher = a longer slow start and a harder kick (default 1.2). |
| `drain style` | `smooth` / `physics` | **smooth** (default): collisions switch off for the drain and bars let go bottom → top on a timed sweep, each falling freely — no jitter. **physics**: collisions stay on and each bar lets go once nothing holds it — a truer collapse, but bars shove each other and it jitters. |
| `↳ smooth: bottom → top sweep (s)` | 0.1–4 | How long the release front takes to travel from the bottom of the pile to the top (default 0.9). |
| `↳ smooth: sweep power (3 = cubic)` | 1–6 | Shape of the sweep: creeps off the bottom, then races up. |
| `↳ smooth: release jitter (s)` | 0–0.4 | Random ± on each bar's release so it doesn't go in neat rows. |
| `↳ smooth: drift ± (px/s)` / `↳ smooth: spin ± (°/s)` | | A little sideways drift and tumble as each bar lets go. |
| `↳ physics: stagger at start / at full ramp (s)` | 0–0.6 | Physics style only: how long each layer waits once nothing holds it, easing from start to end on the ramp. |

### reveal + count (4)

| Control | Range | What it changes |
|---|---|---|
| `heading (above icon)` + `↳ size / colour / gap to icon` | | *YOU FOUND GOLD!* — shown upper-case. |
| `icon size × heading text` | 1–12 | `GOLDBAR_X3.svg`, centred, sized as a multiple of the heading's text size (5.4 = the reference proportion — 140 px at 26 px text); the heading and amount line hang off its top / bottom edges. |
| `amount gap below icon (px)` | −40–80 | Space between the icon and the amount line. |
| `number size (px)` / `number colour` | | The counting number (muted gold). |
| `label after number` + `↳ size / colour` | | *GOLD* — shown upper-case, after the number. |
| `text tilt (°)` | −15–15 | Tilt on the heading and amount line (italic caps, as the reference). |
| `icon offset from centre (px)` | −300–300 | Moves the whole stack up / down. |
| `offset from centre (px)` | −300–300 | Moves the whole reveal up / down. |
| `scale in once drained (share)` | 0–1 | The icon, heading and amount line scale in together — and the count starts — once this share of the bars has fallen off the bottom (default 0.7: near the end of the drain, with the last bars still falling past). |
| `↳ scale-in time (s)` / `↳ from scale` / `↳ overshoot (0 = none)` | | The scale-in: 0.3 s from 0.4×, ease-out-back with a small overshoot; it fades in over the first half. |
| `count after floor goes (s)` | 0–3 | Earliest the scale-in + count can start after the floor goes. |
| `impact once drained (share)` | 0–1 | The impact waits until this share has gone, so it never lands under the gold (the count holds its final value). |
| `count duration (s)` / `count ease-out power` | | The count-up (default 2 s — it runs on past the impact effects; the shop push comes in when it's done). |

### impact (5)

| Control | Range | What it changes |
|---|---|---|
| `impact delay after text (s)` | 0–2 | The impact (flash, ring, starburst, swell, glow, cha-ching, impact confetti) fires **with the reveal** — as the text + icon scale in — plus this delay (default 0). The count keeps running on past it. |
| `impact swell` + `peak size × resting` / `ease out to peak` / `hold at peak` / `ease back down` | | The same swell curve as the gem, on the icon — the heading and amount line ride its edges. |
| `white burst (0 = off)` + `↳ radius × height` / `↳ fade (s)` | | White radial flash behind. |
| `shockwave ring` + `↳ colour / travel / width / opacity / duration` | | Expanding ring. |
| `warm glow behind` + `↳ colour / radius × height / intensity / pulse` | | A soft gold glow that stays behind the amount. |
| `icon pulse loop (after impact)` | toggle | Once the impact swell settles, the gold bars keep pulsing — the icon only; the text stays put. |
| `↳ size (+ × at peak)` / `↳ speed (pulses / s)` / `↳ starts after swell (s)` | | How much bigger at the top of each pulse (0.06 = +6 %), how fast (0.8 / s), and an extra wait before it starts (it eases in). |

### shop push (6)

| Control | Range | What it changes |
|---|---|---|
| `block: up from the bottom (px)` | 0–240 | The closing line + shop button are their own block, anchored to the bottom of the screen — this is the padding (default 40, plus the device's safe-area inset). |
| `closing line` + `↳ size / delay after the count / fade` | random each time / one line | **random each time** (default, never twice in a row) or pin one: *The Grail Shop is open. Treat yourself.* · *Go on. You've earned it.* · *Your next favourite thing is in the Grail Shop.* · *Time to spend it.* · *Shop's open. Go make it rain.* · *Burning a hole in your pocket? The Grail Shop can help.* · *Treat yourself. We won't tell.* |
| `↳ max width (px, wraps; 0 = screen)` | 0–600 | A longer closing line wraps onto balanced lines at this width (default 300). |
| `buttons` | toggle | The two folded buttons under the closing line. **Example only** — the developer builds them from the existing design-system buttons; these show layout, colours, labels and motion. |
| `top: label` + `↳ colour / text colour / settled tilt` | | **Go to the shop** — gold `#e0b678`, black text, −2°. Fires `onShop`. Springs in first. |
| `bottom: label` + `↳ colour / text colour / settled tilt` | | **Open another chest** — navy `#204c68`, white text, +1°. Fires `onBuy`. |
| `buttons: width (px, ≤ screen)` / `↳ size (text + height, crisp)` | | Width 338 px (capped to the screen) and size 1.1. |
| `↳ gap under line (px)` / `↳ gap between (px, − = overlap)` | | Space under the closing line (20) and between the buttons (0; negative overlaps them — the top one stays above). |
| `↳ delay after the count (s)` / `↳ second one after (s)` | | The top button springs in 0.85 s after the count, the bottom one 0.12 s later. |

### sound

| Control | Range / options | What it changes |
|---|---|---|
| `sound on` / `SFX volume` | | Master (= the 🔊 stage icon) and SFX level. |
| `pour (dailyGold)` | toggle | `dailyGold.mp3` as the bars pour in. |
| `count ticker` | toggle | `GemReveal_ticker.mp3`, looped under the count-up. |
| `impact (chaChing)` | toggle | `chaChing.mp3` on the impact. |
| `soundtrack` + `↳ volume / loop / starts on / delay` | | Chasing Quails / Vogue / Belt and Braces (or random), from **start**, the **drain**, or the **impact** (default: **Chasing Quails**, 0.5 s after the impact, 0.2 volume). |

### avatar (placeholder) *(Gold Reveal)*

A PNG stand-in for the Rive avatar: he springs up with the side cannons, the gold pours over him, and he slides back out at about half-pour.

| Control | Range | What it changes |
|---|---|---|
| `avatar` | toggle | On/off. |
| `↳ pose` | random / pointing up / fist raised | Which PNG (random = a new pick each run). |
| `↳ height (× screen)` | 0.15–0.9 | His height as a share of the stage height (0.6; never wider than 80 % of it). |
| `↳ across (0.5 = centre)` / `↳ feet above bottom (px)` | | Where he stands — his feet are anchored to the bottom edge. |
| `↳ springs up after Start (s)` + `↳ spring stiffness / damping` | | When he pops up (0.3 s = with the side cannons) and the spring (a little overshoot). |
| `↳ slides out at pour (share)` / `↳ slide out (s)` | | He slides back down once the pour (+ settle) is this far done (0.5 = halfway), over this long. |
| `↳ min space below the text (px)` | 0–200 | The least space between the bottom of the tease text and the top of the avatar (56). The text grows on tablet / wide screens; if it would come closer, he sits lower by the difference — the phone layout is unchanged. |

### confetti — tease / confetti — impact *(Gold Reveal)*

Two confetti cues, each a Confetti preset with its own tweaks. Defaults: **side cannons** as the tease comes up, **gold rain** on the impact.

| Control | Range | What it changes |
|---|---|---|
| `with the tease` / `on the impact` | off / side cannons / gold rain / fireworks | The style for that cue. |
| `↳ delay (s)` | 0–4 | Tease: after the line pops in (default 0.1). Impact: after the impact (default 0). |
| `↳ amount ×` | 0.1–4 | × the piece counts (pop) or rain rate. |
| `↳ launch speed ×` | 0.2–3 | × how hard bursts throw / how fast the rain starts. |
| `↳ pop: bursts (0 = style)` | 0–10 | Pop styles: volleys / pops. 0 = the style's own (cannons 2, fireworks 3). |
| `↳ pop: spread ° (0 = style)` | 0–360 | Pop styles: cone width. 0 = the style's own (cannons 34°, fireworks 360°). |
| `↳ rain: seconds (0 = style)` | 0–10 | Rain style: how long it rains (0 = the preset's 2.5 s). |
| `↳ rain: loop (keeps raining)` | toggle | Rain style: keep raining until the reveal is replayed (seconds ignored). **On** for the impact by default. |

### confetti — flash + starburst *(Gold Reveal)*

At each cannon mouth (and each firework pop, if a cue uses fireworks).

| Control | Range | What it changes |
|---|---|---|
| `position: in from cannon (px)` / `position: below cannon (px, − = up)` | | Where the flash + starburst sit relative to each cannon mouth — x is inward (mirrored for the right cannon), so you can keep them fully on-screen while the cannons fire from the edge. |
| `white flash (0 = off)` | 0–2 | Intensity of the white bloom at each cannon mouth / firework pop (default 1). |
| `↳ radius (px)` / `↳ fade (s)` | | How big the flash gets (it swells to this as it fades; default 180) and how long it takes (0.25 s). |
| `starburst (0 = off)` | 0–1.5 | Intensity of the starburst — straight strokes flying outward from the origin like clock hands (default 1). |
| `↳ strokes` | 1–40 | How many (default 6). |
| `↳ distribution` | aimed fan / even (clock) / random | **aimed fan** = spread evenly across a fan centred on the shot direction (best for edge cannons — nothing wasted off-screen); **even** = equal gaps round the full circle; **random** = scattered angles. |
| `↳ fan width (°, aimed)` | 10–360 | Width of the aimed fan (default 180). |
| `↳ burst radius (px)` | 10–500 | How far the strokes fly out (default 125). |
| `↳ stroke length (px)` / `↳ stroke width (px)` | | Stroke size (42 / 3); each one shortens and thins as it flies. |
| `↳ duration (s)` / `↳ colour` | | How long the burst lasts (0.75 s) and its colour (white). |

### confetti look (both) *(Gold Reveal)*

| Control | Range | What it changes |
|---|---|---|
| `rain: gravity (m/s²)` / `rain: air drag (float)` | | How the rain falls: ≈ gravity × 143 ÷ drag px/s (≈ 250 at the defaults). |
| `rain: fade at bottom (× height)` | 0–0.5 | Rain falls until it leaves the screen and only fades over this bottom share of the height (default 0.12; 0 = no fade). |
| `side cannons: gravity (arc)` / `side cannons: air drag (low = long arc)` | | The cannons' own physics (defaults 15.5 / 4.3): drag and gravity, so they launch up, gravity takes over, and they arc down over the middle. Raise drag for a punchier stall-and-float. Fireworks keep their own (5 / 2.8). The aim still lands on target either way. |
| `side cannons: fall speed variation` | 0–1 | Each piece gets its own gravity, drag and top fall speed, so they don't fall in lockstep — some drop quickly, some hang and drift (default 0.35; 0 = all the same). |
| `rain: fall speed variation` | 0–1 | The same for the rain (default 0). |
| `side cannons: below centre (px)` | −400–400 | The cannons sit on the side edges at the vertical centre plus this (default 0). |
| `↳ aim in (× way to middle)` | 0–1.5 | **The cannons aim at a target** — this is how far in from each edge it is (1 = dead centre, default 0.58). They solve their own angle + speed for each screen size, so phone, tablet and widescreen all land the same. |
| `↳ aim by` | launch angle / aim at a height | **launch angle** (default): you set the angle. **aim at a height**: the cannons aim at `aim height` and work the angle out. |
| `↳ launch angle (° up)` | 0–85 | The launch angle above horizontal, inward (default 60). The speed is worked out so the burst still reaches `aim in` in `time to target`. |
| `↳ keep the phone’s height on wider screens` | toggle | On (default): the angle is how it looks on a phone, and wider screens keep that same rise — the shot just travels further and flattens, so it lands on the text everywhere. Off: the exact angle on every screen (a wide screen throws much higher). |
| `↳ aim height vs text (px, height mode)` | −400–400 | Height mode only: target height relative to the tease line (default 14). |
| `↳ time to target (s)` | 0.1–2 | How long the middle of the burst takes to get there — shorter = a harder, flatter shot; longer = a softer lob (default 0.55). |
| `↳ speed spread` | 0–0.9 | ± per-piece speed, so pieces land short of and past the target (default 0.5). The cue's `launch speed ×` overshoots (> 1) or falls short (< 1). |
| `↳ firing order` | random side first / alternate / together | Which cannon leads each volley — a random side, alternating sides, or both at once (default). |
| `↳ gap between sides (s)` | 0–1 | How long after the first cannon the second fires (default 0.12). |
| `↳ timing jitter ± (s)` | 0–0.5 | Random ± on every shot, so the rhythm isn't mechanical (default 0.18). |
| `flutter (px)` | 0–80 | Sideways sway once floating. |
| `gold G share` / `G size (px)` / `palette` | | The mix and colours, shared by both cues. |
| `pop exit (fireworks / cannons)` | fade + shrink / fade / shrink / off | How burst pieces leave. `off` = they just fall and fade at the end of their life. |
| `↳ starts after (s)` / `↳ takes (s)` / `↳ randomness` | | When the exit starts after launch (1.1 s), how long it takes (0.8 s), and how much that start varies per piece (0.5) so they don't vanish together. |

## Confetti

Rain-down or firework-pop confetti — gold G's (`GOLD_G.svg`) and paper strips / dots. Stage buttons: **🎆 Fire**, **Fireworks**, **Side cannons**, **Gold rain** (load the preset and fire), **↻ Clear + replay**.

### style

| Control | Range | What it changes |
|---|---|---|
| `style` | pop / rain / both | Firework bursts, a rain from the top, or both at once. |
| `fire on replay` + `↳ delay (s)` | | Fire automatically when the bench replays. |
| `repeat every (s, 0 = once)` | 0–10 | Keep re-firing — handy while tuning. |

### pop (firework)

| Control | Range | What it changes |
|---|---|---|
| `bursts` / `↳ random up to (0 = fixed)` / `between bursts (s)` | | How many pops (or a random count per volley, from `bursts` up to this), and the gap between them. |
| `from` | random / center / sides / bottom | Where they pop: random spots (`↳ random: top / bottom`, × height), a set point (`↳ centre x / y`), two cannons in the bottom corners aimed up and inward, or the bottom centre. |
| `pieces per burst` | 5–300 | Pieces per pop (split between the two cannons for `sides`). |
| `speed min / max (px/s)` | | Launch speed range — drag stalls them quickly, so this sets how far a burst throws. |
| `spread (°, 360 = ring)` / `aim (°, −90 = up)` | | 360 = a full firework shell; less = a cone, aimed by `aim` (sides aim themselves). |
| `shape` | sphere / ring | `sphere` fills the burst; `ring` keeps pieces near top speed for a crisp ring. |
| `flash at origin (0 = off)` + `↳ colour` / `↳ radius (px)` / `↳ fade (s)` | | A soft bloom at each pop / cannon mouth — **random from palette** (fireworks) or **white** (side cannons). |
| `starburst at origin (0 = off)` + `↳ strokes / distribution / fan width / burst radius / stroke length / stroke width / duration / colour` | | Straight strokes flying outward from each origin like clock hands — aimed fan, even (clock face) or random. On in the fireworks preset (even, all the way round) and the side-cannons preset (aimed fan). |
| `exit` | fade + shrink / fade / shrink / off | How burst pieces leave (rain pieces aren't affected). `off` = they fall and fade at the end of their life. |
| `↳ starts after (s)` / `↳ takes (s)` / `↳ randomness` | | Exit timing after launch, its length, and per-piece variation on the start. |
| `side cannons: height (0.5 = middle)` + `↳ offset (px)` | | Where the two edge cannons sit. |
| `flash + star: offset x / y (px)` | | Where the flash + starburst sit relative to each burst origin (x inward for the side cannons). |
| `↳ firing order` / `↳ gap between sides` / `↳ timing jitter` | | Which side leads each volley (random / alternate / together), the gap before the other side, and ± jitter per shot. |
| `↳ aim by` / `↳ launch angle` / `↳ keep the phone’s height` | | Set the launch angle yourself (kept to the phone's rise on wider screens by default), or aim at a height. |
| `↳ aim in` / `↳ aim height` / `↳ time to target` / `↳ power` / `↳ speed spread` | | The cannons aim at a target (in from each edge × half-width, at the cannon height + aim height) and solve their own launch angle + speed so the burst's middle arrives in `time to target` under the burst drag + gravity — consistent on every screen. `power` 1 lands on the target; `speed min / max` don't apply to them. |

### rain

| Control | Range | What it changes |
|---|---|---|
| `pieces / s` / `duration (s)` | | How dense, how long. |
| `spread (× width)` / `start speed (px/s)` | | How wide the rain band is, and the initial fall speed. |
| `loop (until stopped)` | toggle | Keep raining until **■ stop rain** (Export) / `stopSignal`; duration is ignored. |
| `fade at bottom (× height)` | 0–0.5 | Rain lives until it leaves the screen — whatever its height — and fades only over this bottom share. |

### physics

| Control | Range | What it changes |
|---|---|---|
| `rain: gravity` / `rain: air drag` | | Rain only: fall speed ≈ gravity × 143 ÷ drag px/s. High drag = papery. |
| `bursts: gravity` / `bursts: air drag (throw + float)` | | Pop pieces only: drag sets how far a burst throws (≈ speed ÷ drag) and the float afterwards. |
| `bursts: fall speed variation` / `rain: fall speed variation` | 0–1 | Per-piece variation in gravity, drag and top fall speed, so pieces don't fall in lockstep. |
| `top fall speed (px/s)` | 0–2000 | Cap on the fall (it never trims a burst's launch speed). |
| `wind (px/s²)` | ±600 | Constant sideways push. |
| `flutter (px)` / `↳ per second` | | Sideways sway once a piece is floating (fades in as it slows). |
| `spin min / max (°/s)` | | In-plane rotation. |
| `3D flip min / max (turns/s)` | | The tumble — the piece squashes edge-on and shows its darker back. |

### pieces

| Control | Range | What it changes |
|---|---|---|
| `gold G share` + `↳ G size (px)` / `↳ G colour` | | How many pieces are the G mark, its size, and its own orange or tinted from the palette. |
| `dots (of paper)` | 0–1 | Share of the paper pieces that are dots (the rest are strips). |
| `paper size (px)` / `↳ strip width ÷ length` | | Strip size and shape. |
| `size variation` | 0–0.9 | Random ± on every piece's size. |
| `palette` | goldWhite / gold / grail / party | Paper (and tinted G) colours — `grail` = the six gem-grade colours. |
| `back face darker by` | 0–0.9 | How dark the back face is as pieces flip. |

### life

| Control | Range | What it changes |
|---|---|---|
| `burst life min / max (s)` / `fade out (s)` | | How long a burst piece lives, then fades (rain pieces live until they leave the screen). |
| `max pieces` | 50–3000 | Hard cap on live pieces. |
| `more pieces on wider screens` | 0–1 | Counts × (1 + (width/390 − 1) × this), so a desktop isn't sparse. |

## Cosmetic Reveal

Paparazzi tease → swipeable carousel → controlled stop on the chosen item → spotlight + tier sticker → the avatar wearing it. Stage buttons: **▶ Start**, **↻ Restart**, **⟳ Spin** (when ready). Swipe the carousel horizontally either way.

| Folder | What's in it |
|---|---|
| `result` | **item they get** (random on the bench, or any of the 98) · **tier** (random each run on the bench, or Common / Rare / Grail) · **cards in the carousel** (10) · **other cards** — item names, comma-separated, to show what else is out there (blank / short = random top-up) · **no swipe? auto-spin after (s)** — if they haven't swiped this long after the cards arrive, it spins on its own (2.5; 0 = swipe only). |
| `tease (1)` | The two-part teaser, as the Gold Reveal: line (random / pin one of 8), headline + subheader sizes on a phone, subheader max width, grow on wider screens + cap, pop timing + spring, **carousel comes in at (s)**. |
| `paparazzi (1)` | **flashes / s** during the tease (none after it) · **random timing** (0 = even, 1 = bursty) · flash size + **random size (±)** / intensity / fade · **gold colour + white → gold mix** (each flash a random mix) · **lens glint** — a star that tapers from the middle to its tips (points, length, thickness at the middle). Every flash plays a random camera shutter. |
| `carousel (2)` | Card size on a phone + growth on wider screens · gap · corner radius · border width / colour / opacity · fill (transparent by default) · **space around the item** · centre card scale · edge opacity · offset · slide-in timing · the *Swipe to spin* hint. |
| `spin + stop (3)` | Auto direction / speed / ease-in / spin time · swipe gain, min, max, threshold · slowdown length + ease power · extra loops · **hesitate** (go past, hang, snap back) + its settings · snap spring. |
| `speed lines (3)` | The Gem Wheel's warp, **horizontal**, behind the cards while the carousel spins (they speed up and slow down with it, in the same direction): on / off · count (24) · speed × carousel (1.5) + variation · length (255 px) · width (2 px) · colour + variation · opacity (0.24) + variation · fade in / out (0.2 s) · band height (0.35 × screen). |
| `spotlight (4)` | Winner scale + spring · others fade · white burst · shockwave ring (colour, travel, width, opacity, duration) — as the Gold Reveal's `impact (5)` (gold `#ffe269`) · **tapered star** in front of the item, like the camera flashes' glint (points, length 260 px, thickness, rotate, duration, **when it starts fading** — 0.6 × its duration, colour). |
| `single firework (4)` | One firework (the end fireworks' look, its own settings) exploding **from the centre of the revealed item**, in front of the cards: on / off · start after the reveal (0 s) · colour palette (goldWhite) · radius (465 px) · particle size — gold G (32 px), paper (24 px), random ± · particles × · fade after · flash (intensity, colour, radius, fade) · streaks (intensity, how many, radius, length, width, duration, colour). |
| `rarity (5)` | Sticker timing / size / tilt · **Rare** + **Grail** sticker colours · the line per tier (Common blank = none) · line size, **position** (below the card 48 px, left / right) + timing. |
| `fireworks (4–6)` | The Confetti component's fireworks, **the same for every tier**: on / off · **start after the reveal** (3 s) · **colour palette** (grail) · **firework radius** (325 px) · **particle size** — gold G (18 px), paper (16 px), random ± · particles per firework × · **fireworks per volley** (random 3–4, rolled each volley) · new volley every (1.8 s) · particles fade after (0.7 s) · the band they burst in (6–30 % of the height, above the item) · **flash** (intensity, colour — random from the palette or white — radius) · **white streaks** (intensity, how many, radius, length, width). |
| `outro (6)` | **Starts after the reveal** (2.2 s, every tier) · cards slide off · **avatar** (placeholder, random pose) height / **centre height** (0.42 — slightly above the middle) / across / timing / spring · closing pair (random / pin one of 4) — sits **just above the buttons** (gap), sizes, timing. |
| `buttons (6)` | *Try the item on* (gold, top) + *Buy another chest* (navy, bottom) — labels, colours, tilts, width, size, gaps, timing, spring. **Example only** — the developer uses the design-system buttons. |
| `sound (temporary)` | Master + SFX volume · camera shutters · carousel ticks · reveal hit · soundtrack (default **Vogue**; also Chasing Quails / Belt and Braces / random). |

