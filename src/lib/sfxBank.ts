/**
 * A small Web Audio one-shot player for layered sound effects: many short clips,
 * overlapping freely, each with its own level / pitch / pan.
 *
 * - One shared AudioContext, unlocked by the first tap, click or key press.
 * - Clips are decoded once and kept, so a replay costs nothing.
 * - Each clip's loudest peak and leading silence are measured, so a random pick
 *   starts on its hit and can be level-matched against the others.
 * - A bus per run (gain → limiter): muting is live, and disposing it silences
 *   whatever is still ringing.
 */

type Clip = { buf: AudioBuffer; peak: number; onset: number }

/** level-matched clips are brought toward this peak */
const TARGET_PEAK = 0.5
const MAX_BOOST = 6
/** leading silence = anything before the first sample above this share of the peak */
const ONSET_SHARE = 0.05
const ONSET_PREROLL = 0.004

let shared: AudioContext | null = null
function context(): AudioContext | null {
  if (!shared) {
    try {
      shared = new AudioContext()
    } catch {
      return null
    }
  }
  if (shared.state !== 'running') shared.resume().catch(() => {})
  return shared
}
if (typeof window !== 'undefined') {
  const unlock = () => {
    if (context()?.state === 'running') for (const e of UNLOCK) window.removeEventListener(e, unlock)
  }
  const UNLOCK = ['pointerup', 'click', 'keydown'] as const
  for (const e of UNLOCK) window.addEventListener(e, unlock)
}

const clips = new Map<string, Promise<Clip | null>>()
function loadClip(url: string): Promise<Clip | null> {
  let p = clips.get(url)
  if (!p) {
    p = fetch(url)
      .then((r) => r.arrayBuffer())
      // an offline context decodes before any tap has unlocked the real one
      .then((b) => new OfflineAudioContext(1, 1, 44100).decodeAudioData(b))
      .then((buf) => {
        const chans = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i))
        let peak = 0
        for (const d of chans) for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]))
        let first = 0
        find: for (; first < buf.length; first++) for (const d of chans) if (Math.abs(d[first]) > peak * ONSET_SHARE) break find
        return { buf, peak, onset: Math.max(0, first / buf.sampleRate - ONSET_PREROLL) }
      })
      .catch(() => {
        clips.delete(url) // let the next run try again
        return null
      })
    clips.set(url, p)
  }
  return p
}

export type SfxShot = {
  /** 0–1.5 */
  volume: number
  /** playback rate (1 = as recorded) */
  rate?: number
  /** −1 left … 1 right */
  pan?: number
  /** seconds from now */
  delay?: number
  /** 0 = as recorded, 1 = every clip brought to the same peak */
  levelMatch?: number
  /** low-pass cutoff, Hz — lower = duller, further away (≥ 20000 = off) */
  lowpass?: number
  /** fade the clip out by this many seconds (0 = its full length) */
  length?: number
}

/** a set of clips drawn at random, each once before any repeats (a shuffle bag) */
export type SfxGroup = {
  play: (shot: SfxShot) => void
  /** how many of this group's clips are sounding (or about to) */
  playing: () => number
}

export function createSfxBus() {
  let bus: { gain: GainNode; out: GainNode } | null = null
  let level = 1
  const ensure = () => {
    const ctx = context()
    if (!ctx) return null
    if (!bus) {
      const gain = ctx.createGain()
      const limiter = ctx.createDynamicsCompressor()
      limiter.threshold.value = -8
      limiter.knee.value = 4
      limiter.ratio.value = 12
      limiter.attack.value = 0.002
      limiter.release.value = 0.12
      // the node adds its own make-up gain (~4 dB here): take it back off
      const out = ctx.createGain()
      out.gain.value = 0.6
      gain.gain.value = level
      gain.connect(limiter)
      limiter.connect(out)
      out.connect(ctx.destination)
      bus = { gain, out }
    }
    return { ctx, ...bus }
  }

  const group = (urls: string[]): SfxGroup => {
    const loaded: Clip[] = []
    for (const u of urls) loadClip(u).then((c) => c && loaded.push(c))
    let bag: Clip[] = []
    let prev: Clip | null = null
    let voices = 0
    const draw = () => {
      if (!bag.length) {
        bag = [...loaded]
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[bag[i], bag[j]] = [bag[j], bag[i]]
        }
        // never the same clip twice in a row across two bags
        if (bag.length > 1 && bag[bag.length - 1] === prev) bag.unshift(bag.pop()!)
      }
      return (prev = bag.pop() ?? null)
    }
    return {
      play: ({ volume, rate = 1, pan = 0, delay = 0, levelMatch = 0, lowpass = 20000, length = 0 }) => {
        // muted, or the context hasn't been unlocked: skip rather than queue up
        if (volume <= 0 || level <= 0) return
        const b = ensure()
        const clip = draw()
        if (!b || !clip || b.ctx.state !== 'running') return
        const src = b.ctx.createBufferSource()
        src.buffer = clip.buf
        src.playbackRate.value = Math.max(0.25, rate)
        const g = b.ctx.createGain()
        const boost = Math.min(MAX_BOOST, TARGET_PEAK / Math.max(0.001, clip.peak))
        g.gain.value = Math.max(0, volume) * Math.pow(boost, Math.min(1, Math.max(0, levelMatch)))
        const p = b.ctx.createStereoPanner()
        p.pan.value = Math.min(1, Math.max(-1, pan))
        if (lowpass < 20000) {
          const lp = b.ctx.createBiquadFilter()
          lp.type = 'lowpass'
          lp.frequency.value = Math.max(100, lowpass)
          src.connect(lp)
          lp.connect(g)
        } else src.connect(g)
        g.connect(p)
        p.connect(b.gain)
        const at = b.ctx.currentTime + Math.max(0, delay)
        voices++
        src.onended = () => voices--
        src.start(at, clip.onset)
        const full = (clip.buf.duration - clip.onset) / src.playbackRate.value
        if (length > 0 && length < full) {
          // the second half of the allowed length fades to silence
          g.gain.setValueAtTime(g.gain.value, at + length * 0.5)
          g.gain.linearRampToValueAtTime(0, at + length)
          src.stop(at + length)
        }
      },
      playing: () => voices,
    }
  }

  return {
    group,
    /** live master level (0 = muted) */
    setLevel: (v: number) => {
      const next = Math.min(1, Math.max(0, v))
      if (next === level) return
      level = next
      if (bus && shared) bus.gain.gain.setTargetAtTime(level, shared.currentTime, 0.01)
    },
    dispose: () => {
      bus?.gain.disconnect()
      bus?.out.disconnect()
      bus = null
      level = 0
    },
  }
}
