import { useSyncExternalStore } from 'react'

export type Viewport = 'phone' | 'tablet' | 'full'
export const VIEWPORTS: Viewport[] = ['phone', 'tablet', 'full']

/**
 * The stage's device width, picked with the buttons top-left (ViewportButtons) or
 * `?vp=`. One choice for every component; picking one puts it in the address bar,
 * so the link can be shared as is. Until then each component uses its own default.
 */
let chosen: Viewport | null = (() => {
  if (typeof window === 'undefined') return null
  const vp = new URLSearchParams(window.location.search).get('vp')?.toLowerCase()
  return VIEWPORTS.find((v) => v === vp) ?? null
})()
const listeners = new Set<() => void>()

export function setViewport(next: Viewport) {
  chosen = next
  const url = new URL(window.location.href)
  url.searchParams.set('vp', next)
  window.history.replaceState(null, '', url)
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useViewport(fallback: Viewport = 'phone'): Viewport {
  return useSyncExternalStore(subscribe, () => chosen) ?? fallback
}
