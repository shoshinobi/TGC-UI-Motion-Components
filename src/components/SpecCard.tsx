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

/** One scrollable, copyable code panel in the bottom dock. */
export function SpecCard({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className='spec'>
      <div className='spec-head'>
        <span>{title}</span>
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
      <pre>{text}</pre>
    </div>
  )
}
