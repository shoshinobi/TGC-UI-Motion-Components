import type { CSSProperties } from 'react'

// Stand-in for the app's shared Props helper (adds `className` / `style` to a
// component's own props), so the component code your developer sent compiles
// unchanged inside this preview.
export type Props<T> = T & {
  className?: string
  style?: CSSProperties
}
