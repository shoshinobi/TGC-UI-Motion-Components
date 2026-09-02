import { useRef, useState } from 'react'

export function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

/** JSON of a motion config, keeping `Infinity` legible (for pasting back as a default). */
export function stringifyConfig(config: unknown): string {
  return JSON.stringify(config, (_k, v) => (v === Infinity ? 'Infinity' : v === -Infinity ? '-Infinity' : v), 2)
}

/**
 * Leva `button()` freezes its onClick closure at first render, so
 * `button(() => copyText(jsx))` would keep copying the *first* render's value.
 * This routes through a ref that's refreshed every render, so the Leva buttons
 * copy whatever is on screen now.
 *
 *   const copy = useLiveCopy({ jsx, json, config })
 *   useControls('Export', { 'copy JSON': button(copy('json')) })
 */
export function useLiveCopy<T extends Record<string, string>>(payload: T): (key: keyof T) => () => void {
  const ref = useRef(payload)
  ref.current = payload
  return (key) => () => copyText(ref.current[key])
}

/** Spec cards start collapsed; only an explicit '0' keeps one open across reloads. */
function readCollapsed(key: string): boolean {
  try {
    return localStorage.getItem(key) !== '0'
  } catch {
    return true
  }
}
function writeFlag(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? '1' : '0')
  } catch {
    /* storage blocked — fine */
  }
}

/** One copyable code panel in the bottom dock — collapsible, state persisted. */
export function SpecCard({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false)
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const flagKey = `tgc-bench:spec:${slug}`
  const [collapsed, setCollapsed] = useState(() => readCollapsed(flagKey))

  const toggle = () =>
    setCollapsed((c) => {
      writeFlag(flagKey, !c)
      return !c
    })

  const lines = text ? text.split('\n').length : 0

  return (
    <div className='spec' data-collapsed={collapsed}>
      <div className='spec-head'>
        <button
          type='button'
          className='spec-head__toggle'
          onClick={toggle}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <span className='spec-head__chevron' aria-hidden='true'>
            ▾
          </span>
          <span>{title}</span>
          {collapsed && lines > 0 && <span className='spec-head__count'>{lines} lines</span>}
        </button>
        <button
          className='copy-btn'
          data-copied={copied}
          onClick={() => {
            navigator.clipboard.writeText(text).then(
              () => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1200)
              },
              () => {},
            )
          }}
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      {!collapsed && <pre>{text}</pre>}
    </div>
  )
}
