# TGC UI Motion Components — Preview

Local preview + [Leva](https://github.com/pmndrs/leva) tuning bench for the app's
motion components. Tweak parameters live, then hand the developer the spec in the
format they need.

**Live:** https://tgc-ui-motion-components.vercel.app — auto-deploys from `main`
(Vercel project `intsub/tgc-ui-motion-components`, Vite preset, no config needed
beyond `vercel.json`).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

The UI is a single screen: **stage** (top, scrolls), **Leva panel** (right,
collapses under 720px), **spec dock** (bottom — each card scrolls independently
in both axes).

---

## For the developer — what changed in the code you provided

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

Everything else in the repo — `App.tsx`, `src/lib/buildSpec.ts`, Leva, Vite — is
just the tuning harness. You don't need any of it.

## For the developer — how to implement an approved spec

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

## Panel reference

| Group | Controls |
|---|---|
| **Stage** | size (px), background (dark / light / ember), baseline, context row, pause |
| **Appearance** | `color` (→ `--color-error`), `transformOrigin` |
| **Timing** | `duration`, `ease` (named + `custom`), cubic-bezier handles, `loop`, `repeatType`, `repeatDelay` |
| **Keyframes** | frames 1–4 → `time` / `scaleX` / `scaleY` |
| **Per-layer** | outer / middle / inner → `delay (s)` and `speed ×` |
| **Export** | reset to approved spec · restart animation · copy Framer Motion · copy JSON tokens |

## Components

| Component | File | Source of truth |
|---|---|---|
| Flame Pictogram | [src/components/FlamePictogram.tsx](src/components/FlamePictogram.tsx) | `FLAME_DEFAULT_CONFIG` |
