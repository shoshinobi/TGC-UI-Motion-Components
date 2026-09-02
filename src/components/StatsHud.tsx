import { useEffect, useRef, useState } from 'react'

type PerfWithMemory = Performance & {
  memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number }
}

/** Rolling frames-per-second, refreshed twice a second (not per frame). */
function useFps(): number {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    let raf = 0
    let frames = 0
    let last = performance.now()
    const tick = (now: number) => {
      frames++
      const elapsed = now - last
      if (elapsed >= 500) {
        setFps(Math.round((frames * 1000) / elapsed))
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return fps
}

/** Used JS heap in MB — Chrome/Edge only; null elsewhere. */
function useHeapMB(): number | null {
  const [mb, setMb] = useState<number | null>(null)
  useEffect(() => {
    const perf = performance as PerfWithMemory
    if (!perf.memory) return
    const read = () => setMb(perf.memory!.usedJSHeapSize / 1048576)
    read()
    const id = window.setInterval(read, 1000)
    return () => window.clearInterval(id)
  }, [])
  return mb
}

type Weight = { js: number; css: number }

const isJs = (url: string) => /\.m?js($|\?)/.test(url)
const isCss = (url: string) => /\.css($|\?)/.test(url)

/** Resource Timing sum — accurate under `vite dev` and on an uncached prod load. */
function fromResourceTiming(): Weight {
  let js = 0
  let css = 0
  for (const r of performance.getEntriesByType('resource') as PerformanceResourceTiming[]) {
    const size = r.encodedBodySize || r.transferSize || 0
    if (!size) continue
    if (isJs(r.name)) js += size
    else if (isCss(r.name)) css += size
  }
  return { js, css }
}

/** HEAD the actual <script>/<link> tags and sum Content-Length — works even when
 *  the hashed bundle is served from cache (where Resource Timing reads 0). */
async function fromHeadRequests(): Promise<Weight> {
  const tags = Array.from(
    document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>('script[src], link[rel="stylesheet"]'),
  )
  let js = 0
  let css = 0
  await Promise.all(
    tags.map(async (el) => {
      const url = el instanceof HTMLScriptElement ? el.src : el.href
      if (!url || !url.startsWith(location.origin)) return
      try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-store' })
        const len = Number(res.headers.get('content-length')) || 0
        if (isCss(url)) css += len
        else js += len
      } catch {
        /* HEAD not supported (some dev servers) — ignore */
      }
    }),
  )
  return { js, css }
}

/** App JS + CSS download weight in **bytes**. Tries both measurement paths, keeps the larger total. */
function useDownloadBytes(): Weight | null {
  const [w, setW] = useState<Weight | null>(null)
  useEffect(() => {
    let cancelled = false
    const apply = (next: Weight) => {
      if (cancelled) return
      setW((prev) => (!prev || next.js + next.css > prev.js + prev.css ? next : prev))
    }
    apply(fromResourceTiming())
    window.setTimeout(() => apply(fromResourceTiming()), 1500)
    fromHeadRequests()
      .then(apply)
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return w
}

const COLLAPSE_KEY = 'tgc-bench:stats-collapsed'
const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`

/** Top-left read-out: FPS, JS heap, bench bundle size. Publishes its own height
 *  as `--stats-hud-h` so the stage's replay button can sit just below it. */
export function StatsHud() {
  const fps = useFps()
  const heap = useHeapMB()
  const weight = useDownloadBytes()
  const rootRef = useRef<HTMLElement | null>(null)
  const setRoot = (el: HTMLElement | null) => {
    rootRef.current = el
  }
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const publish = () =>
      document.documentElement.style.setProperty('--stats-hud-h', `${Math.round(el.getBoundingClientRect().height)}px`)
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => {
      ro.disconnect()
      document.documentElement.style.removeProperty('--stats-hud-h')
    }
  }, [collapsed])

  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      } catch {
        /* fine */
      }
      return !c
    })

  const slow = fps > 0 && fps < 50

  if (collapsed) {
    return (
      <button
        ref={setRoot}
        type='button'
        className='stats-hud stats-hud--pill'
        onClick={toggle}
        title='Show stats'
      >
        <span data-warn={slow}>{fps}</span> fps
      </button>
    )
  }

  return (
    <div ref={setRoot} className='stats-hud'>
      <button type='button' className='stats-hud__bar' onClick={toggle} title='Hide stats'>
        stats <span aria-hidden='true'>×</span>
      </button>
      <dl>
        <div>
          <dt>fps</dt>
          <dd data-warn={slow}>{fps || '—'}</dd>
        </div>
        <div>
          <dt>heap</dt>
          <dd>{heap == null ? '—' : `${heap.toFixed(1)} MB`}</dd>
        </div>
        <div title='The bench bundle (React + Leva + motion + all benches). The exported createParticleRain / motion specs are a few KB.'>
          <dt>bundle</dt>
          <dd>{weight == null ? '—' : kb(weight.js + weight.css)}</dd>
        </div>
        {weight != null && weight.js + weight.css > 0 && (
          <div className='stats-hud__sub'>
            <dt />
            <dd>
              js {kb(weight.js)} · css {kb(weight.css)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}
