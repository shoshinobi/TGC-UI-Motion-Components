import { useSyncExternalStore } from 'react'

/**
 * Whether the controls (Leva) panel is open. It starts hidden, so a shared link
 * shows only the component; the choice lasts for this browser tab (a reload keeps
 * it, a new tab starts hidden again).
 */
const KEY = 'tgc-bench:panel-open'

let open = (() => {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
})()
const listeners = new Set<() => void>()

export function setPanelOpen(next: boolean) {
  if (next === open) return
  open = next
  try {
    sessionStorage.setItem(KEY, next ? '1' : '0')
  } catch {
    /* storage blocked — still works until a reload */
  }
  listeners.forEach((l) => l())
}

export function usePanelOpen() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => open,
  )
}
