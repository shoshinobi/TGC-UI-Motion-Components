# TGC UI Motion Components — Preview

Local preview + [Leva](https://github.com/pmndrs/leva) tuning bench for the app's
motion components. We tweak the animations live here, sign them off, and hand you
the finished spec in the format you need.

**Live:** https://tgc-ui-motion-components.vercel.app — auto-deploys from `main`.

---

## Components

Switch with the **`component`** dropdown at the top of the Leva panel, or
deep-link with `?c=`.

| Component | Open | Approved spec | Status |
|---|---|---|---|
| **Flame Pictogram** | [`?c=flame`](https://tgc-ui-motion-components.vercel.app/?c=flame) | [↓](#flame-pictogram) | ✅ 2026-08-31 |
| **Feedback Sheet** (error) | [`?c=sheet`](https://tgc-ui-motion-components.vercel.app/?c=sheet) | [↓](#feedback-sheet) | ✅ 2026-08-31 |
| **Gauge** | [`?c=gauge`](https://tgc-ui-motion-components.vercel.app/?c=gauge) | [↓](#gauge) | ✅ 2026-08-31 |
| **Banner Stack** | [`?c=banner`](https://tgc-ui-motion-components.vercel.app/?c=banner) | [↓](#banner-stack) | ✅ phone · tablet · full — 2026-09-01 |
| **Particle Rain** | [`?c=rain`](https://tgc-ui-motion-components.vercel.app/?c=rain) | [↓](#particle-rain) | 🔧 approach locked (burst + floor + walls), tuning `count` |
| **Gem Reveal** | [`?c=gem`](https://tgc-ui-motion-components.vercel.app/?c=gem) | [↓](#gem-reveal) | 🔧 exploring — core (pop-up + hover + 8 colour tokens) done, effects opt-in |

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

Single screen: **stage** (top), **Leva panel** (right, collapses under 720px),
**spec dock** (bottom). Every component tab has **Export** buttons that print the
exact spec locked in below — `copy Framer Motion`, `copy JSON tokens`, and
`copy config`.

---

## How to read this doc

Each component section has two parts:

1. **In your code** — what (if anything) changed in the files you sent, or what
   this bench's component is a stand-in for.
2. **Bring this over** — the approved values. This is the deliverable. Everything
   else in the repo (`App.tsx`, `src/benches/`, `src/lib/build*Spec.ts`, Leva,
   Vite) is just the tuning harness — you don't need it.

Each component's approved values are also baked in as its `*_DEFAULT_CONFIG`
constant, so the bench component renders the approved animation with no props.

---

# Flame Pictogram

## In your code

`src/components/FlamePictogram.tsx` is **your component, near-verbatim**. Changes
are additive:

| Change | Why | Impact |
|---|---|---|
| Optional props `motionConfig?: Partial<FlameMotionConfig>`, `paused?: boolean` | lets Leva drive it live | none — omit both, it uses `FLAME_DEFAULT_CONFIG` |
| `FLAME_DEFAULT_CONFIG` = the approved spec (was your delivered values; those are in git `f6a4dd5`) | sign-off 2026-08-31 | this is what ships |
| 3 `<path>` `d` strings + gradient coords pulled into a `FLAME_LAYERS` array | needed to render layers on separate timelines | cosmetic — same paths, same gradients |
| `--color-error` set inline from `motionConfig.color` | tweakable in isolation | keep your global `--color-error`; don't pass `color` and it's a no-op |
| **Second render path**: one stacked `<motion.svg>` per flame layer | `motion/react` can't animate `scale` on SVG children (`<path>`/`<g>`) — only on an `<svg>` root. The approved spec staggers layers, so it needs this path. | a non-layered spec would stay a single `<motion.svg>` |

## Bring this over

> Approved 2026-08-31. **Layered** — the three flame shapes run on separate
> timelines, so implement as three stacked `<motion.svg>` layers. A single
> `<motion.svg>` does not reproduce it.

**Shared animation (all three layers):**

```tsx
const FLAME_ANIMATE = {
  scaleX: [0.75, 1.005, 0.93, 0.75],
  scaleY: [1, 0.8325, 0.93, 0.98],
}

const FLAME_TRANSITION = {
  duration: 0.4,            // overridden per layer
  times: [0, 0.5, 0.75, 1],
  repeat: Infinity,
  ease: 'linear',
} as const
```

**Per-layer timing:**

| Layer | delay | duration | note |
|---|---|---|---|
| outer  | `0`    | `0.4`    | base |
| middle | `0.05` | `0.4`    | lags 50 ms |
| inner  | `0`    | `0.3636` | `0.4 / 1.1` — runs 1.1× faster |

**Render pattern:**

```tsx
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

**JSON tokens:**

```json
{
  "name": "flame-pictogram",
  "keyframes": {
    "scaleX": [0.75, 1.005, 0.93, 0.75],
    "scaleY": [1, 0.8325, 0.93, 0.98],
    "times": [0, 0.5, 0.75, 1]
  },
  "transition": { "duration": 0.4, "repeat": "infinite", "repeatType": "loop", "repeatDelay": 0, "ease": "linear" },
  "layered": true,
  "layerDelays": { "outer": 0, "middle": 0.05, "inner": 0 },
  "layerSpeeds": { "outer": 1, "middle": 1, "inner": 1.1 },
  "layerDurations": { "outer": 0.4, "middle": 0.4, "inner": 0.3636 },
  "transformOrigin": "bottom",
  "color": "#FF5053"
}
```

**Note:** on the `loop` repeat, `scaleY` steps from the last keyframe (`0.98`)
back to the first (`1`) each cycle — a ~2% jump. Subtle at `0.4 s` / `linear`,
but if it reads as a tick, set the last `scaleY` keyframe to `1` or switch
`repeatType` to `mirror`.

---

# Feedback Sheet

## In your code

No source was handed over. `src/components/FeedbackSheet.tsx` is a **rebuild**
from the story `design-system-feedbacksheet--error` in plain scoped CSS
(`.fsheet-*` in `src/index.css`) — visually faithful but **not** your DS
component. Use it only as the motion reference.

Each layer is already its own element in your real component (panel, gradient,
icon, `h1`, body `p`, button). Make each a `motion.*` and paste the matching
block below. Two things to carry over:

- Put the resting tilts on the motion element as `rotate` (`initial` **and**
  `animate`: heading `2`, body + button `1`), not a CSS `transform` — motion owns
  the transform once it animates `y`/`scale`.
- The icon's `rotate` is a keyframe array with its own sub-transition
  (`transition={{ ...spring, rotate: { duration, ease, times } }}`).

## Bring this over

> Approved 2026-08-31. The **enter** animation for the `feedback-sheet` (error
> variant), one `motion.*` element per layer.

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

| Layer | from | motion | delay |
|---|---|---|---|
| sheet panel | `y: 100%` | spring `260 / 30` | 0 |
| gradient wash | `opacity 0`, `y 20` | tween `0.5s easeOut` | 0.06 s |
| icon | `opacity 0`, `scale 5` | spring `720 / 40`, mass `2.8` + `rotate` rattle `±16°` × 10 swings over `0.8s`, no decay | 0 |
| heading | `opacity 0`, `y 16` | tween `0.4s easeOut` | 0.24 s |
| body | `opacity 0`, `y 16` | tween `0.4s easeOut` | 0.30 s |
| action button | `opacity 0`, `scale 0` | spring `750 / 29`, mass `0.9` | **0.7 s** (after all other layers settle) |

**JSON tokens:**

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

**Note:** the button's `delay: 0.7` is derived from when the other layers settle.
If you retune the icon/content the bench recomputes it — hard-code the number you
ship.

---

# Gauge

## In your code

`src/components/Gauge.tsx` is a **rebuild** from `design-system-gauge--default`
(scoped `.gauge-*` CSS) — not your DS `Gauge`. Your real component already has
the fill / pointer / label elements. The deliverable is the single `fraction`
motion value, its two-phase enter animation, the count-up, and the pill flash.

**Structure** (from the story): `role="meter"` track containing a bottom-anchored
gradient **fill box** (`height = fraction`), a `pointer-events-none` **pointer
zone** above it (`height = 1 − fraction`) with a top-fading hair-line + arrow cap,
a **value pill** at `bottom = fraction`, and a static **min label** below.

## Bring this over

> Approved 2026-08-31. Mount animation for the vertical bar `gauge`.

**The fill — one `fraction`, 0 → target, in two phases (`ramp`):**

```tsx
// target = (value - min) / (max - min)   e.g. 7000 of 0–10000 → 0.7
const fraction = useMotionValue(0)

useEffect(() => {
  // phase 1 — slow, accelerating build-up to 40% of the target
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

The fill settles ~1.34 s after mount. `build.then(…)` — `animate(motionValue, …)`
returns a thenable; there is **no `.finished`** on it. `type` also offers plain
`spring` and `tween` (`duration` up to 10 s) if you don't want the build-up.

**Count-up** runs on its own timeline — a `min → value` tween finishing
`countUpDelay` (0.05 s) after the fill settles, `easeInOut`:

```tsx
const count = useMotionValue(min)
useEffect(() => {
  const c = animate(count, value, { duration: 1.19, ease: 'easeInOut', delay: 0.2 })
  return () => c.stop()
}, [])
// pill text = useTransform(count, v => Math.round(v).toLocaleString('en-US'))  // format 'full' → "7,000"
```

**Value-pill flash** — a light-blue glow pulse **behind** the opaque pill, fired
at `delay + fillRunTime + flashOffset` with `flashOffset: -0.32` so it peaks
*just before* the bar lands (~1.02 s). `mixBlendMode` composites it with the dark
stage, not the white pill — **only reads on a dark background.**

```tsx
<motion.span
  aria-hidden
  style={{
    position: 'absolute', inset: -2, borderRadius: 8, pointerEvents: 'none',
    mixBlendMode: 'plus-lighter',           // additive; 'screen' softer; 'normal' just draws over
    boxShadow: '0 0 24px 4px #A5C4D8',
  }}
  initial={{ opacity: 0 }}
  animate={{ opacity: [0, 1, 0] }}
  transition={{ delay: 1.02, duration: 0.8, times: [0, 0.11, 1], ease: 'easeOut' }}
/>
```

`intensity` is peak opacity 0–1; above 1 it **stacks that many glow layers** so a
`plus-lighter` flash keeps getting brighter.

**Reading + appearance:**

| | value |
|---|---|
| default reading | `7000` of `0`–`10000` → fraction `0.7` |
| value format | `full` → `7,000`; also `compact` (`7k`) / `raw` |
| enter | `ramp` — 0.8 s `easeIn` to `×0.4`, then spring `795 / 51 / 2.1`; `delay 0.2` |
| count-up | on · holds `0.05 s` past the fill settle · `easeInOut` |
| pill flash | on · `#A5C4D8` · `plus-lighter` · blur 24 / spread 4 · intensity 1 · 0.8 s · 1 pulse · **offset −0.32 s** |
| fill gradient | `#E0B678` (top) → `#204C68` at `75%` |
| track | `12 px` wide × `384 px` tall |
| pointer / min-label | shown |

**JSON tokens:**

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

# Banner Stack

## In your code

`src/components/BannerStack.tsx` + `Banner.tsx` started from **your files**. Two
changes:

1. Every motion number now comes from a `motionConfig` object
   (`BannerStackMotionConfig`, 36 keys).
2. The `AnimatePresence` mount/unmount model was replaced with a **persistent,
   infinitely-looping stack** — cards never unmount; position derives from a
   monotonic step (`pos = (i − active + n) % n`, `active` from a monotonic
   counter so keys never repeat); on release the front card flies out then
   recedes onto the back while the rest shuffle forward. This fixed a freeze
   after ~3 banners.

`Typography` / `FoldableButton` / `Image` / `LinearGradient` are dummy stubs in
`banner-stubs.tsx` — swap your real DS components back in. The banner count is
your preset (the `banners` array; the bench ships 3).

**The interaction** (modelled on [codepen.io/tahazsh/pen/yLWPNrG](https://codepen.io/tahazsh/pen/yLWPNrG)):
the front card follows the pointer while dragging. On release, if the drag
cleared `swipeOffsetPx` **or** was a flick over `swipeVelocity`:

1. **fly-out** — the card slides out to `flyOutDistance` px from centre, toward
   the swipe direction (`flyOutDuration` / `flyOutEase`), on top of the stack;
2. **recede** — it drops in z, shrinks and fades onto the **back** slot (using
   `shuffle` timing) while every other card eases one slot forward.

If the drag doesn't commit, the card springs back to centre
(`snapBackStiffness / snapBackDamping`).

**Card chrome** (`Banner.tsx` + `.banner-card` in `src/index.css`): every card
has a solid `borderWidth`px `borderColor` border and sits at `frontRotate`°
resting tilt (`transform: rotate(var(--banner-rotate))`). Cards behind the front
one (`pos > 0`) are dimmed **equally** (not per-depth) by `stackDarken`: a
full-bleed black overlay at that opacity over the content, and
`color-mix(in srgb, borderColor, #000 <stackDarken*100>%)` into the border so it
dims by the same amount.

## Parameters

| Group | Parameter | What it does |
|---|---|---|
| **drag / release** | `swipeOffsetPx` | px of drag that commits on release |
| | `swipeVelocity` | px/s flick that commits with barely any distance (either wins) |
| | `snapBackStiffness` / `snapBackDamping` | spring when a drag *doesn't* commit |
| **fly-out** | `flyOutDistance` | px from centre the card slides out to before receding |
| | `directionAware` | fly-out goes toward the swipe direction |
| | `flyOutRotate` | degrees (× dir) it tilts on the way out |
| | `flyOutDuration` + `flyOutEase` | fly-out timing (the recede then uses `shuffle`) |
| **stack fan-out** | `stackCount` | cards visible in the fan |
| | `stackGapX` / `stackGapY` | px each card further back is offset right / down |
| | `stackScaleStep` | scale shrink per step back |
| | `stackOpacityStep` | opacity drop per step back (`0` = all opaque) |
| | `stackRotateStep` | degrees of fan per step back |
| | `frontRotate` | top card's resting tilt (° — either direction); fan adds `stackRotateStep` on top |
| | `stackDarken` | 0–1 — dims every card behind the front one equally (overlay + border) |
| **border** | `borderColor` / `borderWidth` | solid edge stroke, every card |
| **shuffle** | `shuffleType` + timing | the recede-to-back + the other cards easing forward one slot |
| **CTA button** | `ctaAnimate` · `ctaDelay` · `ctaFromScale` / `ctaFromOpacity` | scale the FoldableButton in (front card only) |
| | `ctaType` (`spring` low-damping = elastic / `tween` `backOut`) · `ctaOrigin` | the pop |

## Bring this over — one config per viewport

> Approved 2026-09-01, per screen size. **Shared across all three:** everything
> except the 8 fan / drag / tilt values in the diff table. Those 8 are tuned per
> viewport.

All three are exported from `src/components/BannerStack.tsx` as
`BANNER_CONFIG_PHONE` (= `BANNER_DEFAULT_CONFIG`), `BANNER_CONFIG_TABLET`,
`BANNER_CONFIG_FULL`. Tablet and full are `{ ...BANNER_CONFIG_PHONE, ...overrides }`.

| | phone | tablet | full |
|---|---|---|---|
| `swipeOffsetPx` | 140 | 150 | 200 |
| `flyOutDistance` | 300 | 500 | 800 |
| `flyOutEase` | `circOut` | `easeInOut` | `circOut` |
| `stackGapX` | 28 | 25 | 52 |
| `stackGapY` | 2 | 1 | 0 |
| `stackScaleStep` | 0.1 | 0.05 | 0.095 |
| `stackRotateStep` | 3 | 2 | 2.5 |
| `frontRotate` | −2 | −1.5 | −1 |

### Phone (base)

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
  "stackGapX": 28,
  "stackGapY": 2,
  "stackScaleStep": 0.1,
  "stackOpacityStep": 0,
  "stackRotateStep": 3,
  "frontRotate": -2,
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

Commit needs a deliberate drag (`140 px`) or flick (`450 px/s`) — no accidental
swipes on a small screen. The card is thrown hard and fast (`flyOutDistance 300`,
`0.16 s`, `circOut`) to clear the phone frame, then the stack snaps forward
quickly (`shuffle 0.2 s`). Resting stack is a deep opaque fan (`stackOpacityStep 0`),
top card tilted `−2°`.

### Tablet

```json
{
  "swipeOffsetPx": 150,
  "swipeVelocity": 450,
  "snapBackStiffness": 680,
  "snapBackDamping": 22,
  "directionAware": true,
  "flyOutDistance": 500,
  "flyOutRotate": 8,
  "flyOutDuration": 0.16,
  "flyOutEase": "easeInOut",
  "stackCount": 3,
  "stackGapX": 25,
  "stackGapY": 1,
  "stackScaleStep": 0.05,
  "stackOpacityStep": 0,
  "stackRotateStep": 2,
  "frontRotate": -1.5,
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

### Full width

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
  "stackGapX": 52,
  "stackGapY": 0,
  "stackScaleStep": 0.095,
  "stackOpacityStep": 0,
  "stackRotateStep": 2.5,
  "frontRotate": -1,
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

### Switching configs — yours to wire

```tsx
import { BANNER_CONFIG_PHONE, BANNER_CONFIG_TABLET, BANNER_CONFIG_FULL } from './BannerStack'

const config =
  width >= FULL_BP ? BANNER_CONFIG_FULL : width >= TABLET_BP ? BANNER_CONFIG_TABLET : BANNER_CONFIG_PHONE

<BannerStack banners={banners} motionConfig={config} />
```

The breakpoints and switch are yours. **Export → copy Framer Motion** prints the
whole persistent-stack render (the `slot(pos)` function, per-card `animate`, the
drag handler with `dragConstraints` + `dragTransition`, the CTA), ready to drop
in. **copy JSON tokens** is the same framework-neutral.

---

# Particle Rain

> 🔧 **Approach locked, numbers still tuning.** The setup below — burst mode,
> floor + side walls, the physics in [Current config](#current-config) — is what
> we're going with. The exact values (especially `count`) get dialled in once we
> see the rain against the real reward reveal. Everything's live-tweakable on the
> bench; send a `copy config` back when it looks right.

The gold bars in `src/assets/` (`gbar.svg`, `tinyBar.svg`) burst from the top of
the screen, fall under gravity, bounce once and **pile up on the floor** — for
the reward / payout reveal. Side walls keep the pile off the screen edges. When
the reveal screen closes, one call **pulls the floor out** and the whole pile
spills off the bottom.

## The reveal-screen flow

1. **On the reveal** — create the system (`createParticleRain(canvas, urls)`, or
   mount `<ParticleRain>`). All `count` bars drop in over `burstWindow` (~0.75 s),
   fall, bounce, and stack into a pile on the floor between the side walls. Once
   it settles the whole thing **auto-sleeps** and sits perfectly still — no CPU,
   no drift.
2. **`count` is your quantity dial.** Set it to *roughly* track how much gold the
   reveal showed — not one bar per unit, just enough that a big payout visibly
   drops more bars than a small one. `burst` mode, so `count` = the exact number
   that falls (before the responsive width-scale, below). Pick a number now, we
   retune after seeing it live.
3. **Leaving the screen** — call `dump()` (React: bump the `dumpSignal` prop).
   The floor is removed and the pile collapses from the bottom up, tumbling and
   draining off the bottom edge. It's one-way — unmount or re-create the system
   for the next reveal.

## Chosen configuration

| | setting |
|---|---|
| mode | **`burst`** |
| floor | **on** (`bounce`) — bars bounce once and settle |
| side walls | **on** (`walls: true`) — pile stays off the edges |
| everything else | the values in [Current config](#current-config) — treat as approved |

**What you'll actually adjust:**

| param | why |
|---|---|
| `count` | match the gold quantity (see flow step 2). Default is **56** (at `referenceWidth` 570); scale it up/down with the payout |
| `spawnWidth` | on wide screens, drop to **~0.4–0.6** so the gold falls in a central column instead of spanning the whole frame |
| `wallInset` | if you narrow `spawnWidth`, bring the walls in to hug that column. **It's a fixed px value**, not a fraction — so if you use it, test phone → desktop and consider scaling it with width yourself |

Leave the physics (gravity, bounce, friction, collision, spin, sway) at the
Current-config values unless the reveal calls for a different feel.

## Responsive — automatic, but sanity-check the walls

`autoScale` (on) reads the live canvas width every frame and scales `count` and
`particleSize` against `referenceWidth`, so the downpour keeps the same
**density** on a 390 px phone as on a 1440 px desktop. `spawnWidth` is a fraction
of width, so the spawn band tracks automatically. The physics never change with
width — a bar falls and stacks identically at every size; there are just more or
fewer of them. **One config, no breakpoints.**

The one thing to test across sizes: the **side walls**. They sit at
`wallInset` px from each edge — the *position* updates with the canvas width
(they're always `wallInset` from the current edge), but the inset is a fixed
pixel amount, so it eats a bigger fraction of a narrow screen. At the default
`wallInset: 0` they're exactly on the edges and this is a non-issue; only matters
if you inset them.

**The width-scale maths.** Each frame the engine computes one factor and applies
it to `count` and `particleSize`:

```
raw    = canvasWidth / referenceWidth
factor = clamp(1 + (raw − 1) · strength, minScale, maxScale)   // strength = countScale or sizeScale
effectiveCount = round(count · factor_with_countScale)
effectiveSize  = particleSize · factor_with_sizeScale
```

| param | what it does |
|---|---|
| `autoScale` | master switch — `false` = `count` / `particleSize` used literally at every width |
| `referenceWidth` | the width (px) at which `count` / `particleSize` come out exactly as set (factor = 1). Default `570` — tuned so the phone frame is close to 1:1 |
| `countScale` | how hard `count` follows width, 0–1. `1` = linear (constant density — same bars-per-px on any screen); `0` = count never changes; `0.5` = wider screens get somewhat denser |
| `sizeScale` | same, for `particleSize`. `1` = a bar is the same fraction of the frame everywhere; `0` = always `particleSize` px; default `0.3` = grows gently |
| `minScale` / `maxScale` | hard clamp on the factor (both count and size) so a tiny phone or an ultrawide doesn't over/under-do it. Defaults `0.35` / `2.2` |

Worked example with the current defaults (`referenceWidth 570`, `count 56`, `countScale 0.55`, `particleSize 80`, `sizeScale 0.3`): a 390 px phone → **~46 bars @ 72 px**; 720 px tablet → **~64 @ 86 px**; 1400 px full → **~101 @ 115 px**. The `countScale 0.55` means a wide desktop gets more bars but not proportionally more — the payout still reads as "a lot" without burying the frame.

## How the engine works — you don't need Pixi.js

At these counts (50–150) a single **canvas-2D `requestAnimationFrame` loop** is
the right tool: real, tunable physics (gravity, initial velocity, air drag,
terminal velocity, spin, sinusoidal sway, wind, floor bounce, **particle-particle
collision + stacking**), no dependencies, ~220 lines. Pixi (WebGL) only earns its
~450 KB at thousands of sprites or when you want shaders — not here. If you ever
do need it, the physics port cleanly.

**Export → copy canvas loop** gives you a standalone `createParticleRain(canvas, urls)`
with this config's numbers baked in — drop it onto a `<canvas>` overlay:

```ts
const rain = createParticleRain(canvasEl, { gbar: '/gbar.svg', tinyBar: '/tinyBar.svg' })
rain.dump()   // "pull the floor out" — the pile collapses bottom-up + drains off-screen (see below)
rain.stop()   // cancel the rAF loop + ResizeObserver; re-create to start over
```

The engine: semi-implicit Euler, `dt` clamped to `1/30 s` (no tunnelling through
the floor on a slow frame); DPR-aware canvas sizing via `ResizeObserver` (which
also drives the responsive re-scale); burst mode pre-creates the pool with
staggered `releaseAt` times, stream mode spawns against an accumulator and
recycles dead slots.

**Sprites: SVG, rasterised once.** The SVGs are drawn to an offscreen canvas at a
fixed high resolution (384 px longest edge × DPR) at startup, then that bitmap is
blitted per particle — vector-crisp bars at any size, with **no per-frame SVG
re-rasterisation** (a real canvas perf trap). `createParticleRain` takes the
sprite URLs and does this for you. The `.png` copies are unused now.

**Stacking (`collide`).** Each particle is a circle (radius = `collideRadius` ×
its half-size — bars aren't round, so keep it under 1). Every frame, a spatial
hash buckets the particles and overlapping pairs are resolved with position
separation (with a 0.5 px slop, so a resting stack isn't nudged every frame) + a
normal/tangential impulse. In `bounce` floor mode this makes them **pile up** — a
supported particle (resting on the floor or a settled particle below it) that
drops under `restThreshold` locks into the pile after ~0.1 s and becomes
immovable, until a hit faster than `collideWake` knocks it loose (`0` = the pile
is never disturbed).

**Making the pile settle and hold (not slowly spread).** Two friction terms:
`collideFriction` is the tangential grip applied on **every** contact, resting
ones included — bars catch on each other instead of sliding apart.
`pileFriction` bleeds a fraction of a **supported** particle's horizontal, spin
*and downward* speed every frame (floor *or* pile), so it comes to rest in a few
frames and locks in place. Turn `pileFriction` up if the pile keeps creeping
outward; turn it down for a looser, more slumping pile. `collideIterations` (2–3)
is how firm the stack is.

**No snap at the end.** A particle that's resting stops receiving gravity (so it
doesn't keep drip-accelerating into the pile and jittering), its last bit of
motion is eased out with a critical glide, and it only flips to "settled" once
both its travel and its spin are near zero — so it *arrives* at rest rather than
being frozen mid-motion. The sway flutter also scales with speed, so the
side-to-side drift fades to nothing as the particle slows instead of vanishing
in one frame.

**Jitter / drift at high counts.** Position-based collision resolution on a deep
stack has the corrections fight each other frame to frame, which shows up as a
big pile slowly shimmering or creeping. Three things keep it still:

1. **Auto-sleep** (built in, no knob). Once every particle is barely moving and
   none are still waiting to be released, they're all force-settled and the
   collision solver is **skipped entirely** — a finished pile of any size holds
   perfectly still because nothing is touching it. A new particle, or a
   `dump()`, wakes it.
2. **Partial correction.** Each pass resolves 90 % of an overlap (plus a 0.5 px
   slop), so stacked corrections don't oscillate.
3. If you're pushing `count` into the many-hundreds and the pile still churns
   *before* it sleeps: keep **`collideIterations`** high (default `6`), lean on
   **`pileFriction`** (default is maxed at `1`), and drop **`collideRestitution`**
   — bouncy particle-particle hits in a dense pile never settle.

It's a circle approximation, not a rigid-body engine, so piles read as "tossed in
a heap," not perfectly interlocked — right for this, and still zero-dependency.
Turn `collide` off for the old flat single-layer heap.

**Side walls (`walls`, optional).** Left and right colliders at the frame edges,
given the same clamp / reflect / friction treatment as the floor: particles
bounce off them and — with `collide` on — pile against them into a bounded column
instead of spreading to the edges and clipping. `wallInset` moves each wall in
from (or, negative, past) the frame edge; `wallRestitution` is the bounce,
`wallFriction` is how much a bar sliding down a wall is slowed.

## Clearing the screen — `rain.dump()`

Call `dump()` (bench: **⤓ Pull the floor out**) when the dev needs everything
gone — the reward's been claimed, the view is closing. It:

- **stops spawning** (stream mode included);
- **removes the floor** — nothing holds the bottom of the pile up any more;
- keeps **particle collisions on**, so the pile *collapses* rather than dropping
  as a block: the bottom layer falls, then whatever was resting on it loses its
  support and follows, and so on — a cascade from the bottom up. `dumpStagger`
  is a short, jittered delay each layer waits before it lets go (`0` = fast
  cascade, higher = a slow crumble). Bars tumble and knock each other loose as
  they fall, so it drains off the screen.

It's one-way: to run the effect again, re-create the system (bench:
**↻ Drop again**). In React the trigger is a `dumpSignal` prop you bump; the
standalone loop returns `{ stop, dump }`.

## Full parameter reference

Most of these are locked at the [Current config](#current-config) values — see
[What you'll actually adjust](#chosen-configuration) for the short list you touch.
This is the complete set for when you need it.

| Group | Parameter | What it does |
|---|---|---|
| **emission** | `mode` | `burst` (one drop — **what we use**) or `stream` (continuous) |
| | `count` | burst: total bars that fall · stream: max alive at once. **The gold-quantity dial.** This is the count at `referenceWidth`; it scales with actual width |
| | `burstWindow` | s to release a full burst over (`0` = all on frame 1) |
| | `spawnRate` / `streamDuration` | stream: particles/s, and how long the emitter runs (`0` = ∞) |
| | `spawnWidth` | 0–1 of stage width — the centred band they drop from |
| | `spawnHeight` | px above the top edge they start within (staggers entry) |
| **physics** | `gravity` | downward acceleration in **m/s²** — `9.8` Earth, `1.6` Moon, `24.8` Jupiter. The engine ×143 (a fixed px-per-metre scale) to get px/s²; every other speed below stays in px/s |
| | `velocityYMin` / `velocityYMax` | initial downward speed at spawn, px/s (`0/0` = pure drop) |
| | `velocityXSpread` | ± initial horizontal speed — lateral scatter |
| | `airDrag` | exponential velocity damping, 1/s (`0` = vacuum) |
| | `terminalVelocity` | hard fall-speed cap, px/s (`0` = none) |
| | `wind` | constant horizontal acceleration, px/s² |
| | `swayAmplitude` / `swayFrequency` | leaf-like horizontal flutter while falling (px, Hz) |
| | `spinMin` / `spinMax` / `spinDrag` | airborne tumble at spawn (deg/s, random direction) + damping |
| | `airborneSpin` | `keep` = spawn spin persists (decays via `spinDrag`) · `killOnContact` = zeroed the **first** time a particle touches anything, then it only rotates from what it hits · `off` = no airborne spin at all |
| | `contactSpin` | 0–1 — fraction of each sliding contact (floor skid, bar-on-bar rub) turned into spin. `> 0` = bars keep tumbling from what they hit; `0` (the current default) = with `airborneSpin: killOnContact` they spin in the air then **freeze their rotation on first touch** |
| **floor** | `floor` | `fallThrough` (exit + despawn) or `bounce` |
| | `floorInset` | px the floor line sits above the bottom edge — **negative = below the visible edge**, so a `bounce` pile settles partly off-frame (bars sink past the border) |
| | `restitution` | bounce: vertical speed kept per bounce, 0–1 |
| | `floorFriction` | bounce: horizontal + spin speed lost per contact, 0–1 |
| | `restThreshold` | bounce: speed below which a supported particle settles (stops), px/s |
| | `fadeOut` | fallThrough: s a particle fades over after passing the floor line |
| | `dumpStagger` | `dump()` only — s each pile layer waits after losing support before it lets go. Spreads the collapse into a bottom-up cascade; `0` = fast cascade, higher = slow crumble |
| **walls** (optional) | `walls` | on = left + right colliders at the frame edges — particles bounce off and pile against them, same treatment as the floor |
| | `wallInset` | px each wall sits **inside** the frame edge — negative = outside the visible edge |
| | `wallRestitution` | fraction of horizontal speed kept when a particle hits a wall, 0–1 |
| | `wallFriction` | vertical + spin speed a particle loses sliding along a wall, 0–1 |
| **collision** | `collide` | on = particles collide + **stack into a pile** (bounce mode); off = flat heap |
| | `collideRadius` | collision-circle radius as a fraction of the particle half-size (`< 1` — bars aren't round) |
| | `collideRestitution` | bounciness of particle-particle hits, 0–1 |
| | `collideFriction` | tangential grip on **every** contact (resting ones too) — bars catch on each other, 0–1 |
| | `pileFriction` | per-frame horizontal + spin + downward damping on any **supported** particle — **the pile-lock knob**: raise it if the pile keeps spreading, 0–1 |
| | `collideIterations` | position-solver passes per frame — higher = firmer, less springy stacks (current default `6`); drop it if you need the CPU back at very high counts |
| | `collideWake` | relative impact speed (px/s) that un-settles a rammed pile particle (`0` = pile never disturbed — the default) |
| **appearance** | `asset` | `both` / `gbar` / `tinyBar` |
| | `particleSize` | on-screen size (longest edge) of a scale-1 particle, px — **at `referenceWidth`; scales with actual width** |
| | `scaleMin` / `scaleMax` | per-particle size variance |
| | `bigFallFaster` | 0–1 — couples size to fall speed (parallax) |
| | `fadeIn` / `opacity` | spawn fade-in seconds · global peak opacity |
| **responsive** | `autoScale` | on = `count` + `particleSize` scale with width; off = literal |
| | `referenceWidth` | width (px) at which `count` / `particleSize` are used exactly as set |
| | `countScale` / `sizeScale` | 0–1 — how strongly each tracks width (`1` = linear) |
| | `minScale` / `maxScale` | clamp on the width-scale factor |

## Current config

The approved starting point — `PARTICLE_DEFAULT_CONFIG` in
`src/components/ParticleRain.tsx`, and what `createParticleRain` bakes in. `count`
and (on wide screens) `spawnWidth` are yours to set; the rest holds until we see
it live.

```json
{
  "mode": "burst",
  "count": 56,
  "burstWindow": 0.75,
  "spawnRate": 30,
  "streamDuration": 0,
  "spawnWidth": 1,
  "spawnHeight": 200,
  "gravity": 14,
  "velocityYMin": 600,
  "velocityYMax": 1200,
  "velocityXSpread": 500,
  "airDrag": 1,
  "terminalVelocity": 1540,
  "wind": 0,
  "swayAmplitude": 0,
  "swayFrequency": 0,
  "spinMin": 200,
  "spinMax": 500,
  "spinDrag": 0.75,
  "airborneSpin": "killOnContact",
  "contactSpin": 0,
  "floor": "bounce",
  "floorInset": -16,
  "restitution": 0.55,
  "floorFriction": 0.55,
  "restThreshold": 5,
  "fadeOut": 0,
  "dumpStagger": 0.2,
  "walls": true,
  "wallInset": -24,
  "wallRestitution": 0.5,
  "wallFriction": 0.15,
  "collide": true,
  "collideRadius": 0.64,
  "collideRestitution": 0.55,
  "collideFriction": 0.76,
  "pileFriction": 1,
  "collideIterations": 6,
  "collideWake": 0,
  "asset": "both",
  "particleSize": 80,
  "scaleMin": 0.8,
  "scaleMax": 1.6,
  "bigFallFaster": 1,
  "fadeIn": 0.15,
  "opacity": 1,
  "autoScale": true,
  "referenceWidth": 570,
  "countScale": 0.55,
  "sizeScale": 0.3,
  "minScale": 0.35,
  "maxScale": 2.2
}
```

**Tuning on the bench.** **Stage → viewport** (phone ≈ 390 / tablet ≈ 720 / full)
frames the canvas so you can watch the auto-scale at each width; `?c=rain&vp=phone`
deep-links a viewport. **Export → ★ save settings** stashes the current panel in
`localStorage` so an in-progress tune survives a reload; **copy config** emits the
JSON above with your changes — send that back to lock it in; **reset to code
default** restores the committed values.

---

# Gem Reveal

> 🔧 **Exploring.** The reveal sequence works end to end — reveal loop → dev
> triggers the lock → punch, grade snaps, effects fade, folded button drops in.
> The individual effect values and the transition timings are still being dialled;
> nothing here is signed off.

The looping **`gem.lottie`** (256 × 256, 60 fps) rises from the bottom of the
screen and hovers in the centre, tinted to one of the six grades.

## The sequence (armed → reveal → locked)

The component plays as a **three-phase state machine the developer drives** with
the `phase` prop (`'armed'` → `'reveal'` → `'locked'`). The final grade is
whatever the `grade` prop / dropdown is set to when the lock fires.

**Phase 0 — armed:** the gem waits off-screen below; nothing plays or renders.
The dev flips `phase` to `'reveal'` (bench: **🚀 Launch**) to start it.

**Phase 1 — reveal loop:**

- the gem springs up from below and hovers (`entry` + `hover`);
- **warp streaks** fade on a beat after the gem reaches centre
  (`warp streaks → fade-on delay / fade-on (s)`);
- the **jet stream** runs from the gem downward (stays fully on the whole loop);
- **gem streaks** loop — a burst every `gem streaks → ↳ interval (s)`;
- the grade **auto-cycles** through the six;
- the Lottie loop runs at **`reveal loop speed ×`** (default 2);
- optionally, a **white flash** fires as the gem settles in
  (`white flash → flash on entering the loop` + `↳ delay after arrival (s)` —
  ambient, no punch).

**Phase 2 — locked** (dev flips `phase`, having set the final `grade`):

1. after `lock transition → punch/flash delay (s)`: a **punch scale + white
   flash** (coupled) + streak burst — the impact;
2. the grade **snaps** to the chosen one (masked by the flash);
3. gem + warp streaks **fade off** over `streak/warp fade (s)` (`ease`); the
   **jet retracts** on its own timing — `jet → fade delay after lock (s)` then
   `fade duration (s)`, tail-to-head;
4. after `speed revert delay (s)` the loop speed **eases** `reveal loop speed ×`
   → **`locked loop speed ×`** over `speed revert (s)` (`ease`);
5. after `grade button → delay after lock (s)`: the **folded grade button**
   springs in below the gem (scale + rotate spring, label = the tier name).

Setting `phase` back to `'reveal'` (the bench's **↻ Replay reveal**) restarts
phase 1 from the top.

## The Lottie + the colour token

`gem.lottie` is a dotLottie (`gem.json` is the animation inside it — `a/Main Scene.json`).
It exposes **one slot, `gemColor`** — the fill on the "Gem Color" layer
(`slots.gemColor.p.k`, a normalised `[r, g, b]`). Each grade's colour is a config
value, editable in the **`colour / token → grade colours`** folder:

| grade | hex | `gemColor` slot `[r, g, b]` |
|---|---|---|
| Holy Grail | `#ffbf00` | `[1, 0.749, 0]` |
| Mythic | `#974EDB` | `[0.592, 0.306, 0.859]` |
| Illustrious | `#035BDB` | `[0.012, 0.357, 0.859]` |
| Storied | `#01FFFC` | `[0.004, 1, 0.988]` |
| Renowned | `#6A9394` | `[0.416, 0.576, 0.580]` |
| Notable | `#DA6821` | `[0.855, 0.408, 0.129]` |

The **white flash** (below) isn't a grade — it's an event that whites the gem
out entirely.

> The bench's **`grade colours`** pickers, `copy config` and `copy JSON tokens`
> all round-trip whatever you set — tweak the six and send them back to lock in.

**How the colour changes.** `lottie-web` resolves slots when the animation
loads, so a grade change **reloads the JSON at the current frame** (`anim.currentFrame`
→ `destroy` → `loadAnimation` with the patched slot → `goToAndPlay(frame)`). A
32 KB reload is a few ms and invisible in the loop. The bench uses `lottie-web`'s
SVG renderer (`lottie_light` build); use whatever player you like — the slot
patch is the same.

## The reveal

| what | control | notes |
|---|---|---|
| **entry** | `from below (px)` · `from scale` · `delay` · spring `stiffness / damping / mass` | Y and scale spring together from (below, small) → (centre, `rest scale`) — held frozen until **🚀 Launch** (phase `armed` → `reveal`). |
| **hover** | `sine hover` on/off · `amp X/Y` · `freq X/Y` · `rotate sway` · `randomness` | A sine drift, faded in as the entry scale-in finishes. `randomness` drifts the sine phase each frame so it never quite repeats. |
| **scale** | `rest scale` (instant) · `punch to ×` (up to **12×**) — the **✦ punch scale** button / `scaleSignal` prop. `punch model`: **spring** (ballistic kick + relax, `spring: stiffness/damping`) or **tween** (`tween: in (s)` + ease → `hold at full (s)` → `out (s)` + ease). | Punch drives the scale toward `punch to ×` and returns to rest. **`apex colour flash`** — `off` / current / a grade — flashes the gem that colour at the top of the punch and fires the gem-streak burst. **Punch and the white flash are coupled** — either trigger fires both. |

## Playback

Two speeds, phase-driven: **`reveal loop speed ×`** during phase 1, **`locked
loop speed ×`** after. The lock eases from one to the other over `lock transition
→ speed revert (s)` with a `linear` / `easeIn` / `easeOut` / `easeInOut` curve —
all via `anim.setSpeed`.

## Auto-cycle

During **phase 1 only**, `auto-cycle grades` steps through the six grades.
`start interval (s)` is the first gap; each change shortens it — `speed-up ramp`
(0–1) sets how hard — floored at `min interval (s)`. `white-flash between` fires
the white flash on each grade change. On lock the grade snaps to the chosen one
and the cycle stops.

## Grade button

The Banner design's **folded button** (`FoldableButton`), centred just below the
gem and slightly overlapping it, labelled with the locked grade's tier name (or
a `label` override). It springs in `grade button → delay after lock (s)` after
the reveal: scale + rotation spring (`from` → `settled`, shared `stiffness /
damping / mass`), opacity over 0.15 s. **`size (crisp)`** scales the real
font/height/padding — use it to make the button large without the transform-scale
blur; **`settled scale (pop)`** is a small transform on top for the entrance.
`offset X / Y` place it — negative Y overlaps the gem. In the bench it's
non-interactive (`pointer-events: none`); the dev wires the real button.

## White flash

An impact event — the **⚡ white flash** button / `flashSignal` prop, the **✦
punch scale** trigger (the two are coupled — either fires both), the **lock**
(after the white blast + `punch/flash delay`), or between grades in the
auto-cycle. There's also an **ambient** flash option as the gem enters the loop
(`flash on entering the loop` — whiteout + glow spike + optional streaks, but
**no punch**), and the lock's optional **white blast** (`lock transition → white
blast before reveal`): the gem's colour swaps to pure white and the glow spikes,
building over `↳ blast build (s)`, before the grade colour bursts in — a hard
beat between the cycling grades and the locked one. On fire, all at once:

- a **solid white diamond** covers the whole gem shape (clip-path overlay),
  hiding every facet, held for `hold full (s)` then decaying over `decay (s)`;
  `blur / bloom (px)` sits on an unclipped wrapper so the white spills *past* the
  silhouette (also applies to the punch's `apex colour flash`);
- the **punch scale** kicks (coupled);
- the **gem-streak burst** goes off (if `emit gem streaks` is on);
- the **glow spikes** by `glow spike ×` for the duration of the flash.

## Effects

All drawn on one canvas **behind** the gem (plus the flash overlay on top). Each
`colour` is `tier` (match the current grade) or a hex string.

| effect | what it draws |
|---|---|
| **glow** | A soft **radial halo wash** + a **CSS-blurred core diamond** that keeps the gem's silhouette (canvas, `lighter` blend). `intensity` (0–6, overall brightness) · `reach` (0.5–4× the gem, how far the halo spreads) · `blur (px)` (core softness) · `core passes` (1–4, core density) · `pulse (Hz)`. **No hard fill** — never a solid shape behind the gem. The halo is a gradient (no per-frame filter) so `reach` / `intensity` scale freely without a framerate hit. |
| **gem streaks** | The radial **`GEM_streaks` starburst** — `count` thin rounded rects radiating from the gem centre, expanding at `speed (px/s)`, slowing per `deceleration` (0 = constant → 1 = snaps to a stop), fading over `life`. Fires on **reveal arrival**, **every `↳ interval (s)` through the reveal loop** (`loop during reveal`), **punch apex**, **white flash / lock**, and the **✷ emit streaks** trigger. In-flight bursts fade with the lock transition. |
| **warp streaks** | Vertical speed lines streaming down past the gem (relative motion = gem flying up). `count` · `speed` + `speed variation` · `length` / `width` · `colour` + `colour variation` (hue jitter) · `opacity` + `opacity variation`. **Off until the gem reaches centre**, then fades on after `fade-on delay (s)` over `fade-on (s)`; fades 1 → 0 across the lock transition (`lock transition → streak/warp fade`). |
| **jet stream** | **1 or 2** tapering vertical gradient tracks from the gem downward (on by default). `track width` · `spacing` (2-track) · `length` · `taper`. **Gradient opacity** — `opacity at gem` → `opacity at tail`. **Stays fully on through the whole reveal loop**; only after the grade is **locked** does it retract — `fade delay after lock (s)` then over `fade duration (s)` the stream **pulls back from the tail toward the head**; the head stays pinned to the gem, the far end goes first. |

## Config

`GEM_DEFAULT_CONFIG` in `src/components/GemReveal.tsx`. **copy JSON tokens** for
the framework-neutral spec (colour map, reveal springs, effect params);
**copy lottie-web wiring** for a reference of the slot patch + speed ramp + the
reveal rAF; **copy config** for the flat object to send back.

---

## Panel reference (bench operators)

Pick the component from the `component` dropdown at the top of the Leva panel.
`↻ Replay` sits on the stage, just below the Stats HUD (FPS / heap / bundle size,
top-left). The dock's spec cards start collapsed — click a header to expand.

> **Full control-by-control reference:** [`docs/leva-controls.md`](docs/leva-controls.md)
> — every slider, select and toggle in every bench, what it changes, and when
> you'd reach for it. The tables below are the quick index.

**Flame Pictogram**

| Group | Controls |
|---|---|
| Stage | size (px), background (dark / light / ember), baseline, context row, pause |
| Appearance | `color` (→ `--color-error`), `transformOrigin` |
| Timing | `duration`, `ease` (named + `custom`), cubic-bezier handles, `loop`, `repeatType`, `repeatDelay` |
| Keyframes | frames 1–4 → `time` / `scaleX` / `scaleY` |
| Per-layer | outer / middle / inner → `delay (s)`, `speed ×` |
| Export | reset to approved spec · restart animation · copy Framer Motion · copy JSON tokens |

**Feedback Sheet**

| Group | Controls |
|---|---|
| Stage | viewport (phone / tablet / full), scrim, paused |
| Layers | one folder per layer (sheet · gradient · icon · heading · body · button); each has `type`, `from opac.`, `from Y`, `from scale`, `delay`, `wait for all`, and sub-folders **spring** (stiffness / damping / mass), **tween** (duration / ease), **shake** (rotate° / shift px / swings / duration / decay) |
| Export | reset defaults · replay · copy Framer Motion · copy JSON tokens · copy config |

**Gauge**

| Group | Controls |
|---|---|
| Stage | background (dark / light / ember), paused |
| reading | `value`, `min`, `max`, `format` (compact / full / raw), `count up` + hold past settle (s) + ease in to final |
| enter | `delay (s)`, `type` (spring / tween / **ramp**); sub-folders **ramp** (build-up s / ease / hand off at ×target), **spring**, **tween** (duration ≤ 10 s / ease) |
| pill flash | `enabled`, `offset vs settle (s)`, `duration (s)`, `pulses`, `colour`, `blend` (plus-lighter / screen / normal), `intensity` (0–4, >1 stacks), `blur (px)`, `spread (px)` |
| appearance | `fill top`, `fill bottom`, `gradient stop %`, `track width / height (px)`, `pointer`, `min label` |
| Export | reset defaults · replay · copy Framer Motion · copy JSON tokens · copy config |

**Banner Stack**

| Group | Controls |
|---|---|
| Stage | viewport (phone / tablet / full), background, paused |
| drag / release | commit distance (px), flick velocity (px/s), snap-back stiffness / damping |
| fly-out (on release) | distance out (px), toward swipe direction, rotate out (°), duration out (s), ease out |
| stack fan-out | visible cards, gap X / gap Y, scale − per step, opacity − per step, fan rotate per step, front card tilt (°), darken cards behind |
| border | colour, width (px) |
| shuffle | type; **shuffleTween** (duration / ease), **shuffleSpring** (stiffness / damping / mass) |
| CTA button | scale in, delay, from scale / opacity, transform origin, type; **ctaTween**, **ctaSpring** |
| Export | next banner ▸ · **★ save as approved (this viewport)** · reset this viewport to code default · replay · copy Framer Motion / JSON tokens / config |

Switching **Stage → viewport** loads that viewport's approved config into the
panel (unsaved tweaks for the one you leave are discarded).
**★ save as approved (this viewport)** persists the current panel as that
viewport's config (per-viewport `localStorage`); **reset this viewport to code
default** clears it back to the baked-in config. `copy config` captures all 36
parameters — send that back to bake in permanently.

**Particle Rain**

Folders collapsed by default: **responsive**, **walls**, **appearance**, and the
physics sub-folders **sway** / **spin**. Labels are trimmed to fit the panel.

| Group | Controls |
|---|---|
| Stage | **viewport (phone / tablet / full)**, background (dark / light / ember), paused |
| emission | mode (burst / stream), count / pool, burst window, stream /s, stream secs, spawn band, spawn above |
| responsive | scale w/ width, ref width, count vs width, size vs width, clamp min / max |
| physics | **gravity (m/s²)**, start vy min / max, start vx ±, air drag, terminal vel, wind; **sway** (amplitude / frequency), **spin** (spawn min / max °/s, drag, airborne: keep / killOnContact / off, from contacts) |
| floor | floor (fallThrough / bounce), inset, restitution, **friction**, settle threshold, fade-out, **dump stagger** |
| walls | **side colliders** (on/off), inset, bounce, **friction** |
| collision | collide + stack, hit radius, bounce, bar grip, **pile friction**, iterations, wake |
| appearance | asset (both / gbar / tinyBar), size, scale min / max, big=faster, fade in, opacity |
| Export | **★ save settings** (localStorage, survives reload) · reset to code default · drop again · **⤓ pull the floor out** · copy canvas loop · copy JSON tokens · copy config |

Stage buttons: **↻ Drop again** (re-run from scratch) and **⤓ Pull the floor
out** (clear the screen — see [above](#clearing-the-screen--raindump)).

Physics / floor / collision / appearance update **live**; emission, the Stage
viewport, and the responsive knobs (or **drop again**) re-drop the whole system.
The Stage viewport frames the canvas at ~390 / ~720 / full px so you see the
auto-scale; `?c=rain&vp=phone` deep-links one.

**Gem Reveal**

| Group | Controls |
|---|---|
| Stage | background (dark / light / **ember**) · **ember colour** · **ember spread (%)** · paused |
| colour / token | **grade** (6, = the final locked grade) · **grade colours** (6 pickers) · auto-cycle grades · start / min interval · speed-up ramp · white-flash between |
| playback | **reveal loop speed ×** · **locked loop speed ×** |
| entry | from below (px) · from scale · delay · spring stiffness / damping / mass |
| hover | sine hover · amp X/Y · freq X/Y · rotate sway · randomness |
| scale + punch | rest scale · punch to × (≤ 12) · **punch model** (spring / tween) · spring: stiffness / damping · tween: in (s) + ease / hold at full (s) / out (s) + ease · **apex colour flash** (off / current / grade) · flash (s) |
| white flash | hold full (s) · decay (s) · **blur / bloom (px)** · glow spike × · emit gem streaks — *(coupled with ✦ punch scale + the lock)* · **flash on entering the loop + ↳ delay** *(ambient, no punch)* |
| glow | on/off · colour (tier/hex) · **intensity (0–6)** · **reach (0.5–4× gem)** · blur (≤ 200) · core passes (1–4) · pulse (Hz) — *radial halo + blurred core diamond, no hard shape* |
| gem streaks | on/off · count · speed · deceleration · delay after land · length / width · opacity · life · colour · fire on reveal / punch apex · **loop during reveal + ↳ interval (s)** |
| warp streaks | on/off *(on by default)* · count · speed + variation · length / width · colour + variation · opacity + variation · **fade-on delay (s)** / **fade-on (s)** — *off until the gem reaches centre, fades on, then fades on lock* |
| jet | on/off *(on by default)* · **tracks (1–2)** · track width · spacing · length · taper · opacity at gem / at tail · **fade delay after lock** / duration · colour — *on all reveal, retracts tail→head after lock* |
| **lock transition** | **white blast before reveal + ↳ blast build (s)** · punch/flash delay (s) · speed revert delay (s) · speed revert (s) + ease · streak/warp fade (s) + ease |
| **grade button** | on/off · label override · offset X / Y (overlap) · delay after lock (s) · from scale / rotate · settled rotate · **size (crisp)** · **settled scale (pop)** · spring stiffness / damping / mass |
| Export | ★ save settings · reset to code default · **↻ replay reveal** · **🚀 launch** · **🔒 lock grade** · **✦ punch scale** · **⚡ white flash** · **✷ emit streaks** · copy lottie-web wiring · copy JSON tokens · copy config |

Colour / hover / effects update **live**; entry re-runs on **↻ Replay reveal**.
Stage buttons (top-right, stacked): **🔒 Lock grade** (reveal → locked), **⚡
White flash** (coupled punch + flash), **🚀 Launch** (armed → reveal). `★ save settings`
persists the panel to `localStorage`. Full descriptions in
[`docs/leva-controls.md`](docs/leva-controls.md).

## File map

| Component | File | Default constant |
|---|---|---|
| Flame Pictogram | [src/components/FlamePictogram.tsx](src/components/FlamePictogram.tsx) | `FLAME_DEFAULT_CONFIG` |
| Feedback Sheet | [src/components/FeedbackSheet.tsx](src/components/FeedbackSheet.tsx) | `SHEET_DEFAULT_CONFIG` |
| Gauge | [src/components/Gauge.tsx](src/components/Gauge.tsx) | `GAUGE_DEFAULT_CONFIG` |
| Banner Stack | [src/components/BannerStack.tsx](src/components/BannerStack.tsx) | `BANNER_CONFIG_{PHONE,TABLET,FULL}` |
| Particle Rain | [src/components/ParticleRain.tsx](src/components/ParticleRain.tsx) | `PARTICLE_DEFAULT_CONFIG` |
| Gem Reveal | [src/components/GemReveal.tsx](src/components/GemReveal.tsx) | `GEM_DEFAULT_CONFIG` (+ `src/lib/gemTiers.ts` for the grade colours) |
