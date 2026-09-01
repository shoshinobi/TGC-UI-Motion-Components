# TGC UI Motion Components — Preview

Local preview + [Leva](https://github.com/pmndrs/leva) tuning bench for the app's
motion components. Tweak parameters live, then hand the developer the spec in the
format they need.

**Live:** https://tgc-ui-motion-components.vercel.app — auto-deploys from `main`
(Vercel project `intsub/tgc-ui-motion-components`, Vite preset, no config needed
beyond `vercel.json`).

## Components in this bench

More than one — switch with the **`component`** dropdown at the top of the Leva
panel, or deep-link with `?c=`. The address bar updates as you switch, so it's
always copy-pasteable.

| Component | Open it | Spec | Status |
|---|---|---|---|
| **Flame Pictogram** | [`?c=flame`](https://tgc-ui-motion-components.vercel.app/?c=flame) | [Approved spec ↓](#-approved-motion-specs--flame-pictogram) | ✅ approved 2026-08-31 |
| **Feedback Sheet** (error) | [`?c=sheet`](https://tgc-ui-motion-components.vercel.app/?c=sheet) | [Approved spec ↓](#-approved-motion-specs--feedback-sheet) | ✅ approved 2026-08-31 |
| **Gauge** | [`?c=gauge`](https://tgc-ui-motion-components.vercel.app/?c=gauge) | [Approved spec ↓](#-approved-motion-specs--gauge) | ✅ approved 2026-08-31 |
| **Banner Stack** | [`?c=banner`](https://tgc-ui-motion-components.vercel.app/?c=banner) | [Approved spec ↓](#-approved-motion-specs--banner-stack) | ✅ phone · tablet · full width |

Each component's tab has its own **Export** buttons — `copy Framer Motion` and
`copy JSON tokens` — that produce exactly the spec locked in below.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

The UI is a single screen: **stage** (top, scrolls), **Leva panel** (right,
collapses under 720px), **spec dock** (bottom — each card scrolls independently
in both axes).

---

## For the developer — the code

### Flame Pictogram — your code, near-verbatim

Your `FlamePictogram` component is used **almost verbatim** — the changes are
additive. The one behavioural change: `FLAME_DEFAULT_CONFIG` now holds the
**approved spec** (below), not the values you delivered, so the component
animates the approved way with no `motionConfig` passed. Your original delivered
values are in git history (commit `f6a4dd5`).

`src/components/FlamePictogram.tsx`:

| Change | Why | Impact on your code |
|---|---|---|
| Added optional props `motionConfig?: Partial<FlameMotionConfig>` and `paused?: boolean` | Lets the Leva panel drive the animation live | None — omit both and it uses `FLAME_DEFAULT_CONFIG` (= the approved spec). |
| `FLAME_DEFAULT_CONFIG` updated to the approved spec | Sign-off 2026-08-31 | This is the animation to ship. It's **layered** (see below), so the default render path is now the stacked-`<motion.svg>` one. |
| Extracted the 3 `<path>` `d` strings + gradient coords into a `FLAME_LAYERS` array | Needed to render layers individually | Cosmetic — same paths, same gradients |
| `--color-error` is set inline on the SVG from `motionConfig.color` | So the colour is tweakable in isolation | In the app, keep your global `--color-error`; don't pass `color` and this is a no-op |
| **Second render path** for per-layer stagger / speed | **`motion/react` cannot animate `scale` on SVG child nodes (`<path>`, `<g>`) — only on an `<svg>` root.** When any layer has a non-default `delay`/`speed`, each flame layer is rendered as its own stacked `<motion.svg>`. | This is the path the approved spec uses. A non-layered spec would stay a single `<motion.svg>`. |

Everything else in the repo — `App.tsx`, `src/benches/`, `src/lib/build*Spec.ts`,
Leva, Vite — is just the tuning harness. You don't need any of it.

### Feedback Sheet — rebuilt from Storybook

No source was handed over, so `src/components/FeedbackSheet.tsx` is a **rebuild**
from the story `design-system-feedbacksheet--error`, in plain scoped CSS
(`.fsheet-*` in `src/index.css`) — visually faithful but **not** your design-system
component. Use it only as the motion reference: the **✅ Approved motion specs —
Feedback Sheet** section below is the deliverable — the per-layer `initial` /
`animate` / `transition` to apply to your real `FeedbackSheet`'s elements.

### Gauge — rebuilt from Storybook

Same deal: `src/components/Gauge.tsx` is a rebuild from `design-system-gauge--default`
(scoped `.gauge-*` CSS). Your real DS `Gauge` already has the fill / pointer /
label elements — the deliverable is the single `fraction` motion value and the
three `useTransform` bindings in the **✅ Approved motion specs — Gauge** section.

### Banner Stack — your code, near-verbatim

`src/components/BannerStack.tsx` + `Banner.tsx` started from **your files**. Two
changes: every motion number now comes from a `motionConfig` object, and — per
Malcolm's feedback — the `AnimatePresence` mount/unmount model was replaced with
a **persistent, infinitely-looping stack** (cards never unmount; position derives
from a monotonic step; on release the front card flies out then recedes onto the
back while the rest shuffle forward). `Typography` / `FoldableButton` / `Image` /
`LinearGradient` are dummy stubs in `banner-stubs.tsx` — swap the real DS
components back in. **Approved** (per viewport) — see below; the switching logic
between configs is yours.

## For the developer — how to implement an approved spec

### Flame Pictogram

**If the spec is not layered** (one shared `animate` / `transition`): keep your
component exactly as you wrote it and paste the values from the **Framer Motion**
block below into your `animate` / `transition` / `style` props. Nothing structural
changes.

**If the spec is layered** (per-layer `delay` and/or `speed`): motion can't scale
SVG children, so split the three flame shapes into stacked `<motion.svg>` layers,
each with its own `transition`. The Framer Motion block prints the exact pattern
and a `LAYERS` array of `{ duration, delay }` per shape:

```tsx
<span style={{ position: 'relative', display: 'inline-block' }}>
  {LAYERS.map((layer, i) => (
    <motion.svg
      key={i}
      viewBox="0 0 16 32"
      preserveAspectRatio="none"
      overflow="visible"
      animate={{ scaleX, scaleY }}                         // shared
      transition={{ ...transition, duration: LAYERS[i].duration, delay: LAYERS[i].delay }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transformOrigin: 'bottom' }}
    >
      <path d={layer.d} fill={`url(#${layer.gradientId})`} />
    </motion.svg>
  ))}
</span>
```

The **JSON motion tokens** block is the same information framework-neutral
(`transition`, `layerDelays`, `layerSpeeds`, resolved `layerDurations`).

### Feedback Sheet

Each layer is already its own element in your component (panel, gradient, icon,
`h1`, body `p`, button). Make each a `motion.*` and paste the matching block from
the approved spec. Two things to carry over:

- Move the resting tilts onto the motion element (`initial`/`animate` `rotate: 2`
  for the heading, `1` for body + button) instead of a CSS `transform` — motion
  owns the transform once it animates `y`/`scale`.
- The icon's `rotate` is a keyframe array with its own sub-transition
  (`transition={{ ...spring, rotate: { duration, ease, times } }}`).

---

## ✅ Approved motion specs — Flame Pictogram

> **Approved by Malcolm — 2026-08-31.** This spec is **layered**: the three flame
> shapes run on separate timelines, so it must be implemented as three stacked
> `<motion.svg>` layers (motion can't animate `scale` on SVG children). The
> single-`<motion.svg>` form does **not** reproduce it.
>
> These values are also the component's built-in default
> (`FLAME_DEFAULT_CONFIG` in `src/components/FlamePictogram.tsx`) and the bench's
> starting state — "reset to approved spec" in the Leva panel restores them.

### Shared animation (all three layers)

```tsx
const FLAME_ANIMATE = {
  scaleX: [0.75, 1.005, 0.93, 0.75],
  scaleY: [1, 0.8325, 0.93, 0.98],
}

const FLAME_TRANSITION = {
  duration: 0.4,            // overridden per layer below
  times: [0, 0.5, 0.75, 1],
  repeat: Infinity,
  ease: 'linear',
} as const
```

### Per-layer timing

| Layer | delay | duration | note |
|---|---|---|---|
| outer  | `0`    | `0.4`    | base |
| middle | `0.05` | `0.4`    | lags 50 ms |
| inner  | `0`    | `0.3636` | `0.4 / 1.1` — runs 1.1× faster |

### Render

```tsx
// paths / gradientIds: outer, middle, inner (unchanged from your component)
const FLAME_LAYERS = [
  { delay: 0,    duration: 0.4 },
  { delay: 0.05, duration: 0.4 },
  { delay: 0,    duration: 0.4 / 1.1 },
]

<span style={{ position: 'relative', display: 'inline-block' }} className={className}>
  {paths.map((d, i) => (
    <motion.svg
      key={i}
      viewBox="0 0 16 32"
      fill="none"
      preserveAspectRatio="none"
      overflow="visible"
      animate={FLAME_ANIMATE}
      transition={{ ...FLAME_TRANSITION, duration: FLAME_LAYERS[i].duration, delay: FLAME_LAYERS[i].delay }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transformOrigin: 'bottom' }}
    >
      <path d={d} fill={`url(#${gradientIds[i]})`} />
      <defs>{/* that layer's linearGradient, as in your original */}</defs>
    </motion.svg>
  ))}
</span>
```

### JSON motion tokens

```json
{
  "name": "flame-pictogram",
  "keyframes": {
    "scaleX": [0.75, 1.005, 0.93, 0.75],
    "scaleY": [1, 0.8325, 0.93, 0.98],
    "times": [0, 0.5, 0.75, 1]
  },
  "transition": {
    "duration": 0.4,
    "repeat": "infinite",
    "repeatType": "loop",
    "repeatDelay": 0,
    "ease": "linear"
  },
  "layered": true,
  "layerDelays": { "outer": 0, "middle": 0.05, "inner": 0 },
  "layerSpeeds": { "outer": 1, "middle": 1, "inner": 1.1 },
  "layerDurations": { "outer": 0.4, "middle": 0.4, "inner": 0.3636 },
  "transformOrigin": "bottom",
  "color": "#FF5053"
}
```

| Property | Value |
|---|---|
| Colour (`--color-error`) | `#FF5053` |
| Transform origin | `bottom` |
| Base duration | 0.4 s |
| Keyframe times | 0 · 0.5 · 0.75 · 1 |
| scaleX keyframes | 0.75 · 1.005 · 0.93 · 0.75 |
| scaleY keyframes | 1 · 0.8325 · 0.93 · 0.98 |
| Easing | `linear` |
| Repeat | infinite, `loop` |
| Per-layer delay | outer 0 · middle 0.05 s · inner 0 |
| Per-layer speed | outer 1× · middle 1× · inner 1.1× |

**Note for implementation:** on the `loop` repeat, `scaleY` steps from the last
keyframe (`0.98`) back to the first (`1`) each cycle — a ~2% jump. It's subtle at
`0.4 s` / `linear` but if it reads as a tick, set the last `scaleY` keyframe to
`1` or switch `repeatType` to `mirror`.

---

## ✅ Approved motion specs — Feedback Sheet

> **Approved by Malcolm — 2026-08-31.** The **enter** animation for the
> `feedback-sheet` (error variant). Each layer is a separate `motion.*` element.
> These values are the component's built-in default
> (`SHEET_DEFAULT_CONFIG` in `src/components/FeedbackSheet.tsx`) and the bench's
> starting state — "reset defaults" in the Leva panel restores them.

Structure (outer → in): overlay `flex items-end justify-center` → **sheet panel**
(`role="dialog"`, `overflow-hidden`, `rounded-t-2xl`, `backdrop-blur-[25px]`) →
gradient wash + content column. The resting tilts (heading `2°`, body/button
`1°`) are carried on the motion element as `rotate`, not CSS, so they compose
with `scale`.

### Framer Motion (`motion/react`) — one block per layer

```tsx
// Sheet panel (slides up)
initial={{ y: '100%' }}
animate={{ y: 0 }}
transition={{ type: 'spring', stiffness: 260, damping: 30 }}

// Gradient wash
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.06, duration: 0.5, ease: 'easeOut' }}

// Icon — slam in + hard rattle
initial={{ opacity: 0, scale: 5 }}
animate={{ opacity: 1, scale: 1, rotate: [0, -16, 16, -16, 16, -16, 16, -16, 16, -16, 16, 0] }}
transition={{
  type: 'spring', stiffness: 720, damping: 40, mass: 2.8,
  rotate: { duration: 0.8, ease: 'easeOut', times: [0, 0.091, 0.182, 0.273, 0.364, 0.455, 0.545, 0.636, 0.727, 0.818, 0.909, 1] },
}}

// Heading
initial={{ opacity: 0, y: 16, rotate: 2 }}
animate={{ opacity: 1, y: 0, rotate: 2 }}
transition={{ delay: 0.24, duration: 0.4, ease: 'easeOut' }}

// Body copy
initial={{ opacity: 0, y: 16, rotate: 1 }}
animate={{ opacity: 1, y: 0, rotate: 1 }}
transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}

// Action button — starts after every other layer has settled (~0.7 s)
initial={{ opacity: 0, scale: 0, rotate: 1 }}
animate={{ opacity: 1, scale: 1, rotate: 1 }}
transition={{ delay: 0.7, type: 'spring', stiffness: 750, damping: 29, mass: 0.9 }}
```

### Per-layer summary

| Layer | from | motion | delay |
|---|---|---|---|
| sheet panel | `y: 100%` | spring `260 / 30` | 0 |
| gradient wash | `opacity 0`, `y 20` | tween `0.5s easeOut` | 0.06 s |
| icon | `opacity 0`, `scale 5` | spring `720 / 40`, mass `2.8` + `rotate` rattle `±16°` × 10 swings over `0.8s`, no decay | 0 |
| heading | `opacity 0`, `y 16` | tween `0.4s easeOut` | 0.24 s |
| body | `opacity 0`, `y 16` | tween `0.4s easeOut` | 0.30 s |
| action button | `opacity 0`, `scale 0` | spring `750 / 29`, mass `0.9` | **0.7 s** (auto: after all other layers settle) |

### JSON motion tokens

```json
{
  "name": "feedback-sheet",
  "enter": {
    "sheet":    { "from": { "opacity": 1, "y": "100%", "scale": 1, "rotate": 0 }, "delay": 0,    "type": "spring", "stiffness": 260, "damping": 30, "mass": 1 },
    "gradient": { "from": { "opacity": 0, "y": 20,     "scale": 1, "rotate": 0 }, "delay": 0.06, "type": "tween",  "duration": 0.5, "ease": "easeOut" },
    "icon":     { "from": { "opacity": 0, "y": 0,      "scale": 5, "rotate": 0 }, "delay": 0,    "type": "spring", "stiffness": 720, "damping": 40, "mass": 2.8,
                  "shake": { "duration": 0.8, "times": [0,0.091,0.182,0.273,0.364,0.455,0.545,0.636,0.727,0.818,0.909,1],
                             "rotateKeyframes": [0,-16,16,-16,16,-16,16,-16,16,-16,16,0] } },
    "heading":  { "from": { "opacity": 0, "y": 16,     "scale": 1, "rotate": 2 }, "delay": 0.24, "type": "tween",  "duration": 0.4, "ease": "easeOut" },
    "body":     { "from": { "opacity": 0, "y": 16,     "scale": 1, "rotate": 1 }, "delay": 0.3,  "type": "tween",  "duration": 0.4, "ease": "easeOut" },
    "button":   { "from": { "opacity": 0, "y": 0,      "scale": 0, "rotate": 1 }, "delay": 0.7,  "startAfterAll": true, "type": "spring", "stiffness": 750, "damping": 29, "mass": 0.9 }
  }
}
```

**Note:** the button's `delay: 0.7` is derived from when the other layers settle
(spring settle-time estimate + tween end). If you retune the icon/content, the
bench recomputes it; hard-code the number you ship.

---

## ✅ Approved motion specs — Gauge

> **Approved by Malcolm — 2026-08-31.** The mount animation for the vertical bar
> `gauge`. `SHEET`-style: `GAUGE_DEFAULT_CONFIG` in
> `src/components/Gauge.tsx` holds it; the bench's "reset defaults" restores it.

**Structure** (from the story): `role="meter"` track (`w-3`, `h-full`) containing
a bottom-anchored gradient **fill box** (`height = fraction`), a
`pointer-events-none` **pointer zone** above it (`height = 1 − fraction`) with a
1px top-fading hair-line + a small arrow cap, a **value pill** absolutely placed
at `bottom = fraction`, and a static **min label** below the track. Fill gradient
is `linear-gradient(180deg, --color-primary 0%, --color-secondary 75%)`.

### The fill animation — one `fraction`, 0 → target, in two phases (`ramp`)

```tsx
// target = (value - min) / (max - min)   e.g. 7000 of 0–10000 → 0.7
const fraction = useMotionValue(0)

useEffect(() => {
  // phase 1 — slow, accelerating build-up to 40% of the target (0.8 s, easeIn)
  const build = animate(fraction, target * 0.4, { duration: 0.8, ease: 'easeIn', delay: 0.2 })
  build.then(() => {
    // phase 2 — a heavily-damped spring covers the last 60% + a small overshoot
    animate(fraction, target, { type: 'spring', stiffness: 795, damping: 51, mass: 2.1 })
  })
  return () => build.stop()
}, [])

// fill box     style={{ height: useTransform(fraction, f => `${f * 100}%`) }}
// pointer zone style={{ height: useTransform(fraction, f => `${(1 - f) * 100}%`) }}
// value pill   style={{ bottom: useTransform(fraction, f => `${f * 100}%`) }}
```

> `build.then(…)` — `animate(motionValue, …)` returns a thenable; there is **no
> `.finished`** on it (that's the element/selector form).

The whole fill settles ~1.34 s after mount. `type` also offers plain **`spring`**
and **`tween`** (`duration` up to 10 s / `ease`) if you don't want the build-up.

### Count-up (on)

The pill number runs on **its own timeline** — a `min → value` tween that
**finishes `countUpDelay` (0.05 s) after the fill settles** and eases in with
`easeInOut`. `format: 'full'` → `7,000` (comma-grouped); `raw` / `compact` also
available.

```tsx
const count = useMotionValue(min)
useEffect(() => {
  // duration = fill run-time (~0.99 s) + countUpDelay (0.05 s)
  const c = animate(count, value, { duration: 1.19, ease: 'easeInOut', delay: 0.2 })
  return () => c.stop()
}, [])
// pill text = useTransform(count, v => value.toLocaleString('en-US'))
```

### Value-pill flash

A **light-blue** (`#A5C4D8`) glow pulses on the pill. The fire time is derived —
`delay + fill run-time + flashOffset` — with `flashOffset: -0.32`, so it fires
**as the fill is rushing in** (~1.02 s), peaking just before the bar lands, not
after.

It's a glow layer **behind** the (opaque) pill with `mix-blend-mode` so it
composites with the dark stage, not the white pill. `blend: plus-lighter` is
additive (default); `screen` is softer; `normal` just draws over. **Only reads on
a dark background.** `intensity` is peak opacity 0–1; values above 1 **stack that
many glow layers** so a `plus-lighter` flash keeps getting brighter.

```tsx
// glow layer BEHIND the pill (pill is opaque; label wrapper is the positioning context)
<motion.span
  aria-hidden
  style={{
    position: 'absolute', inset: -2, borderRadius: 8, pointerEvents: 'none',
    mixBlendMode: 'plus-lighter',
    boxShadow: '0 0 24px 4px #A5C4D8',
  }}
  initial={{ opacity: 0 }}
  animate={{ opacity: [0, 1, 0] }}
  transition={{ delay: 1.02, duration: 0.8, times: [0, 0.11, 1], ease: 'easeOut' }}
/>
```

### Reading + appearance

| | value |
|---|---|
| default reading | `7000` of `0`–`10000` → fraction `0.7` |
| value format | **`full`** → `7,000`; also `compact` (`7k`) / `raw` |
| enter | **`ramp`** — 0.8 s `easeIn` to `×0.4`, then spring `795 / 51 / 2.1`; `delay 0.2` |
| count-up | **on** · holds `0.05 s` past the fill settle · `easeInOut` into the final |
| pill flash | on · `#A5C4D8` · `plus-lighter` blend · blur 24 / spread 4 · intensity 1 · 0.8 s · 1 pulse · **offset −0.32 s** (fires before settle) |
| fill gradient | `#E0B678` (top) → `#204C68` at `75%` |
| track | `12 px` wide × `384 px` tall |
| pointer / min-label | shown |

### JSON motion tokens

```json
{
  "name": "gauge",
  "reading": { "value": 7000, "min": 0, "max": 10000, "fraction": 0.7, "format": "full" },
  "enter": {
    "property": "fraction", "from": 0, "to": 0.7, "delay": 0.2, "type": "ramp",
    "phase1": { "to": 0.28, "type": "tween", "duration": 0.8, "ease": "easeIn" },
    "phase2": { "to": 0.7, "type": "spring", "stiffness": 795, "damping": 51, "mass": 2.1 },
    "drives": ["fill height = fraction", "pointer height = 1 - fraction", "value-pill bottom = fraction"]
  },
  "countUp": {
    "target": "value-pill number", "from": 0, "to": 7000,
    "type": "tween", "duration": 1.19, "ease": "easeInOut",
    "note": "finishes 0.05s after the fill settles (~1.34s)"
  },
  "flash": {
    "target": "value-pill glow, behind the pill (box-shadow opacity)",
    "at": 1.02, "note": "delay 0.2 + run 1.14 - 0.32 offset",
    "boxShadow": "0 0 24px 4px #A5C4D8", "blend": "plus-lighter",
    "duration": 0.8, "opacityKeyframes": [0, 1, 0], "times": [0, 0.11, 1]
  },
  "appearance": {
    "fillGradient": "linear-gradient(180deg, #E0B678 0%, #204C68 75%)",
    "trackWidth": 12, "trackHeight": 384, "showPointer": true, "showMinLabel": true
  }
}
```

---

## ✅ Approved motion specs — Banner Stack

> **Per-viewport.** A config per screen size. **Phone** approved 2026-09-01
> (`BANNER_DEFAULT_CONFIG` / `BANNER_CONFIG_PHONE` in
> `src/components/BannerStack.tsx`) — the base. **Full width** to follow; the app
> swaps configs at a breakpoint.
>
> On the bench, **switching the Stage `viewport`** loads that viewport's approved
> config into the panel (unsaved tweaks for the one you leave are discarded).
> **`★ save as approved (this viewport)`** persists the current panel as that
> viewport's config (per-viewport `localStorage`); **`reset this viewport to code
> default`** clears it back to the baked-in config. `copy config` captures all 32
> parameters — send that back for me to bake in permanently.

**The interaction** (modelled on [codepen.io/tahazsh/pen/yLWPNrG](https://codepen.io/tahazsh/pen/yLWPNrG)):
the front card **follows the pointer** while dragging. On release, if the drag
cleared a *small* distance **or** was a flick, an automatic two-phase move plays:

1. **fly-out** — the card slides out to `flyOutDistance` px from centre, toward
   the swipe direction (`flyOutDuration`, on top of the stack);
2. **recede** — it then drops in z, shrinks and fades onto the **back** slot
   (using the `shuffle` timing), while every other card eases one slot forward.

If the drag *doesn't* commit, the card springs back to centre. You only ever
nudge it; the rest plays itself.

**Infinite loop, no mount/unmount.** Every banner is a persistent `motion.div`;
its transform comes from its position in the cycle (`pos = (i − active + n) % n`),
`active` from a **monotonic** step — so the keys never repeat, and swiping past
the last banner wraps to the first. The banner count is the developer's preset
(the `banners` array; the bench ships 3).

| Group | Parameter | What it does |
|---|---|---|
| **drag / release** | `swipeOffsetPx` | px of drag that commits on release |
| | `swipeVelocity` | px/s flick that commits with barely any distance (either wins) |
| | `snapBackStiffness / snapBackDamping` | the spring when a drag *doesn't* commit |
| **fly-out** (on release) | `flyOutDistance` | px from centre the card automatically slides out to before receding |
| | `directionAware` | the fly-out goes toward the swipe direction |
| | `flyOutRotate` | degrees (× dir) it tilts on the way out |
| | `flyOutDuration` + `flyOutEase` | the fly-out timing (the recede then uses `shuffle`) |
| **stack fan-out** | `stackCount` | how many cards are visible in the fan |
| | `stackGapX` / `stackGapY` | px each card further back is offset right / down |
| | `stackScaleStep` | scale shrink per step back |
| | `stackOpacityStep` | opacity drop per step back (`0` = all opaque) |
| | `stackRotateStep` | degrees of fan per step back |
| | `frontRotate` | top card's resting tilt (° — either direction); the fan adds `stackRotateStep` on top |
| | `stackDarken` | 0–1 — black overlay on **every** card behind the front one, equal for all — **dims the border too** |
| **border** (every card) | `borderColor` / `borderWidth` | the edge stroke (inset box-shadow so the dim covers it) |
| **shuffle** | `shuffleType` + timing | the recede-to-back + the other cards easing forward one slot |
| **CTA button** | `ctaAnimate` · `ctaDelay` · `ctaFromScale/Opacity` | scale the FoldableButton in (front card only) |
| | `ctaType` (`spring` low-damping = elastic / `tween` `backOut`) · `ctaOrigin` | the pop |

### Phone (default / base)

```json
{
  "swipeOffsetPx": 140,
  "swipeVelocity": 450,
  "snapBackStiffness": 680,
  "snapBackDamping": 22,
  "directionAware": true,
  "flyOutDistance": 300,
  "flyOutRotate": 8,
  "flyOutDuration": 0.16,
  "flyOutEase": "circOut",
  "stackCount": 3,
  "stackGapX": 16,
  "stackGapY": 2,
  "stackScaleStep": 0.05,
  "stackOpacityStep": 0,
  "stackRotateStep": 4,
  "frontRotate": 2,
  "stackDarken": 0.4,
  "borderColor": "#FFFFFF",
  "borderWidth": 2,
  "shuffleType": "tween",
  "shuffleDuration": 0.2,
  "shuffleEase": "easeInOut",
  "shuffleStiffness": 320,
  "shuffleDamping": 32,
  "shuffleMass": 1,
  "ctaAnimate": true,
  "ctaDelay": 0.3,
  "ctaFromScale": 0,
  "ctaFromOpacity": 0,
  "ctaType": "spring",
  "ctaDuration": 0.5,
  "ctaEase": "backOut",
  "ctaStiffness": 600,
  "ctaDamping": 29,
  "ctaMass": 1,
  "ctaOrigin": "center"
}
```

`frontRotate 2` = the top card's resting tilt (° — negative tilts the other way);
the fan adds `stackRotateStep` per card behind it. `stackDarken 0.4` = a
solid-black overlay at 0.4 opacity on **every** card behind the front one (equal,
not per-depth) — **it covers the border too**, so implement the border as an
inset box-shadow (or a wrapper) with the overlay on top. Every card's border is
`2 px #FFFFFF`. `frontRotate` / `stackDarken` / border are shared across all three
viewport configs.

**What's distinctive about the phone tune:** commit needs a **deliberate drag**
(`140 px`) or a flick (`450 px/s`) — no accidental swipes on a small screen. The
card is **thrown hard and fast** (`flyOutDistance 300`, `flyOutDuration 0.16 s`,
`circOut`) — it clears the phone frame — then the stack snaps forward quickly
(`shuffle 0.2 s`). The resting stack is a **tight opaque fan**: `stackOpacityStep 0`
(every card full opacity), `stackRotateStep 4°` and `stackGapX 16` / `stackGapY 2`
— reads like a hand of cards rather than a receding pile. Snap-back is springy
(`680 / 22`); the CTA pop is firmer than the base (`ctaDamping 29`).

### Full width

Same motion as phone — only the **five size-driven values** change (a longer
commit drag, a much larger fly-out for the wide frame, a wider + flatter fan):

| | phone | full |
|---|---|---|
| `swipeOffsetPx` | 140 | **200** |
| `flyOutDistance` | 300 | **800** |
| `stackGapX` | 16 | **30** |
| `stackGapY` | 2 | **0** |
| `stackRotateStep` | 4 | **1.5** |

```json
{
  "swipeOffsetPx": 200,
  "swipeVelocity": 450,
  "snapBackStiffness": 680,
  "snapBackDamping": 22,
  "directionAware": true,
  "flyOutDistance": 800,
  "flyOutRotate": 8,
  "flyOutDuration": 0.16,
  "flyOutEase": "circOut",
  "stackCount": 3,
  "stackGapX": 30,
  "stackGapY": 0,
  "stackScaleStep": 0.05,
  "stackOpacityStep": 0,
  "stackRotateStep": 1.5,
  "frontRotate": 2,
  "stackDarken": 0.4,
  "borderColor": "#FFFFFF",
  "borderWidth": 2,
  "shuffleType": "tween",
  "shuffleDuration": 0.2,
  "shuffleEase": "easeInOut",
  "shuffleStiffness": 320,
  "shuffleDamping": 32,
  "shuffleMass": 1,
  "ctaAnimate": true,
  "ctaDelay": 0.3,
  "ctaFromScale": 0,
  "ctaFromOpacity": 0,
  "ctaType": "spring",
  "ctaDuration": 0.5,
  "ctaEase": "backOut",
  "ctaStiffness": 600,
  "ctaDamping": 29,
  "ctaMass": 1,
  "ctaOrigin": "center"
}
```

`BANNER_CONFIG_FULL` in `src/components/BannerStack.tsx` (spread over
`BANNER_CONFIG_PHONE` with the five overrides).

### Tablet

Between phone and full — **6 overrides** on the phone base (note `flyOutEase` is
`easeInOut` here, not the `circOut` phone/full use):

| | phone | **tablet** | full |
|---|---|---|---|
| `swipeOffsetPx` | 140 | **150** | 200 |
| `flyOutDistance` | 300 | **500** | 800 |
| `flyOutEase` | circOut | **easeInOut** | circOut |
| `stackGapX` | 16 | **25** | 30 |
| `stackGapY` | 2 | **1** | 0 |
| `stackRotateStep` | 4 | **2** | 1.5 |

`BANNER_CONFIG_TABLET` in `src/components/BannerStack.tsx`.

### For the developer — switching configs

All three configs are exported from `src/components/BannerStack.tsx`; **the
switching logic is yours**. Pass the right one as `motionConfig`:

```tsx
import { BANNER_CONFIG_PHONE, BANNER_CONFIG_TABLET, BANNER_CONFIG_FULL } from './BannerStack'

const config =
  width >= FULL_BP ? BANNER_CONFIG_FULL : width >= TABLET_BP ? BANNER_CONFIG_TABLET : BANNER_CONFIG_PHONE
<BannerStack banners={banners} motionConfig={config} />
```

Only ~6 values differ between neighbours, so spreading deltas onto one base works
too if that's cleaner in your setup.

---

The **Export → copy Framer Motion** button prints the whole persistent-stack
render (the `slot(pos)` function, the per-card `animate`, the drag handler with
`dragConstraints` + `dragTransition`, the CTA), ready to drop into your
`BannerStack`. **copy JSON tokens** is the same, framework-neutral. **copy config**
gives the flat object above.

---

## Panel reference

Pick the component from the `component` dropdown at the top of the Leva panel
(or `?c=flame` / `?c=sheet`). `↻ Replay` sits on the stage.

**Flame Pictogram**

| Group | Controls |
|---|---|
| **Stage** | size (px), background (dark / light / ember), baseline, context row, pause |
| **Appearance** | `color` (→ `--color-error`), `transformOrigin` |
| **Timing** | `duration`, `ease` (named + `custom`), cubic-bezier handles, `loop`, `repeatType`, `repeatDelay` |
| **Keyframes** | frames 1–4 → `time` / `scaleX` / `scaleY` |
| **Per-layer** | outer / middle / inner → `delay (s)` and `speed ×` |
| **Export** | reset to approved spec · restart animation · copy Framer Motion · copy JSON tokens |

**Feedback Sheet**

| Group | Controls |
|---|---|
| **Stage** | viewport (phone / tablet / full), scrim, paused |
| **Layers** | one folder per layer (sheet · gradient · icon · heading · body · button); each has `type`, `from opac.`, `from Y`, `from scale`, `delay`, `wait for all`, and sub-folders **spring** (stiffness / damping / mass), **tween** (duration / ease), **shake** (rotate° / shift px / swings / duration / decay) |
| **Export** | reset defaults · replay animation · copy Framer Motion · copy JSON tokens · copy config (for defaults) |

**Gauge**

| Group | Controls |
|---|---|
| **Stage** | background (dark / light / ember), paused |
| **Gauge → reading** | `value`, `min`, `max`, `format` (compact / full / raw), `count up` + `↳ hold past settle (s)` + `↳ ease in to final` |
| **Gauge → enter** | `delay (s)`, `type` (spring / tween / **ramp**); sub-folders **ramp** (build-up s / build-up ease / hand off at ×target), **spring** (stiffness / damping / mass), **tween** (duration ≤ 10 s / ease) |
| **Gauge → pill flash** | `enabled`, `offset vs settle (s)`, `duration (s)`, `pulses`, `colour`, `blend` (plus-lighter / screen / normal), `intensity` (0–4, >1 stacks layers), `blur (px)`, `spread (px)` |
| **Gauge → appearance** | `fill top`, `fill bottom`, `gradient stop %`, `track width (px)`, `track height (px)`, `pointer`, `min label` |
| **Export** | reset defaults · replay animation · copy Framer Motion · copy JSON tokens · copy config (for defaults) |

**Banner Stack**

| Group | Controls |
|---|---|
| **Stage** | viewport (phone / tablet / full), background, paused |
| **BannerStack → drag / release** | commit distance (px), flick velocity (px/s), snap-back stiffness / damping |
| **BannerStack → fly-out (on release)** | distance out (px), toward swipe direction, rotate out (°), duration out (s), ease out |
| **BannerStack → stack fan-out** | visible cards, gap X (right edge) / gap Y, scale − per step, opacity − per step, fan rotate per step, **front card tilt (°)**, **darken cards behind** |
| **BannerStack → border** | colour, width (px) — every card |
| **BannerStack → shuffle** | type; **shuffleTween** (duration / ease), **shuffleSpring** (stiffness / damping / mass) |
| **BannerStack → CTA button** | scale in (front card only), delay, from scale / opacity, transform origin (**center**), type; **ctaTween** (duration / ease), **ctaSpring** (stiffness ↑ snappier / damping ↓ elastic / mass) |
| **BannerStack → Export** | next banner ▸ · **★ save as approved (this viewport)** · reset this viewport to code default · replay · copy Framer Motion / JSON tokens / config |

Switching the **Stage → viewport** (phone / tablet / full) loads that viewport's approved config.
| **Export** | next banner ▸ · reset defaults · replay animation · copy Framer Motion · copy JSON tokens · copy config (for defaults) |

Stage buttons: `↻ Replay` (reset to first card + re-enter) and `Next ▸` (advance the stack without dragging).

## Components

| Component | File | Source of truth | Spec |
|---|---|---|---|
| Flame Pictogram | [src/components/FlamePictogram.tsx](src/components/FlamePictogram.tsx) | `FLAME_DEFAULT_CONFIG` | ✅ approved 2026-08-31 |
| Feedback Sheet | [src/components/FeedbackSheet.tsx](src/components/FeedbackSheet.tsx) | `SHEET_DEFAULT_CONFIG` | ✅ approved 2026-08-31 |
| Gauge | [src/components/Gauge.tsx](src/components/Gauge.tsx) | `GAUGE_DEFAULT_CONFIG` | ✅ approved 2026-08-31 |
| Banner Stack | [src/components/BannerStack.tsx](src/components/BannerStack.tsx) | `BANNER_CONFIG_{PHONE,TABLET,FULL}` | ✅ 3 viewports 2026-09-01 |
