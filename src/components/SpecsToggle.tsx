import { useEffect, useState } from 'react'

const KEY = 'tgc-bench:specs-open'

function readOpen() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/**
 * "Developer specs" — the copy-icon button on every stage (bottom-left, beside the
 * speaker icon where there is one). The spec boxes in the bottom dock are hidden by
 * default; this shows / hides them. The choice is remembered, so it carries across
 * components and reloads.
 *
 * Visibility is a CSS switch on <html data-specs="open">, so the dock stays hidden
 * from the very first paint until the developer opens it.
 */
export function SpecsToggle() {
  const [open, setOpen] = useState(readOpen)
  useEffect(() => {
    document.documentElement.dataset.specs = open ? 'open' : 'closed'
    try {
      localStorage.setItem(KEY, open ? '1' : '0')
    } catch {
      /* storage blocked — still works for this session */
    }
  }, [open])

  return (
    <button
      type='button'
      className='stage-specs'
      data-on={open}
      aria-pressed={open}
      aria-label={open ? 'Hide developer specs' : 'Show developer specs'}
      title={open ? 'Hide developer specs' : 'Developer specs (wiring + JSON tokens)'}
      onClick={() => setOpen((o) => !o)}
    >
      {/* copy icon: two overlapping sheets */}
      <svg viewBox='0 0 24 24' width='19' height='19' aria-hidden='true'>
        <rect x='8.5' y='8.5' width='11' height='12' rx='2.2' fill='none' stroke='currentColor' strokeWidth='1.8' />
        <path d='M15.5 8.5V6a2.2 2.2 0 0 0-2.2-2.2H6.7A2.2 2.2 0 0 0 4.5 6v8.3a2.2 2.2 0 0 0 2.2 2.2h1.8' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' />
      </svg>
    </button>
  )
}
