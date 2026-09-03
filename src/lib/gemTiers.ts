/** The six gem grades from the reveal art. `hex` is the value written into the
 *  Lottie `gemColor` slot. Eyeballed from the reference image — adjust once we
 *  see it against the real art. */
export type GemGrade = 'holyGrail' | 'mythic' | 'illustrious' | 'storied' | 'renowned' | 'notable'

/** The default `hex` per grade. Overridable per grade in the bench — each grade's
 *  colour is a config value (`gc*` keys), so these are just the starting point. */
export const GEM_GRADES: { key: GemGrade; label: string; hex: string }[] = [
  { key: 'holyGrail', label: 'Holy Grail', hex: '#ffbf00' },
  { key: 'mythic', label: 'Mythic', hex: '#974EDB' },
  { key: 'illustrious', label: 'Illustrious', hex: '#035BDB' },
  { key: 'storied', label: 'Storied', hex: '#01FFFC' },
  { key: 'renowned', label: 'Renowned', hex: '#6A9394' },
  { key: 'notable', label: 'Notable', hex: '#DA6821' },
]

export const GEM_GRADE_KEYS = GEM_GRADES.map((g) => g.key)

/** grade → the `GemRevealConfig` key that holds its (overridable) colour. */
export const GRADE_COLOR_KEY: Record<GemGrade, string> = {
  holyGrail: 'gcHolyGrail',
  mythic: 'gcMythic',
  illustrious: 'gcIllustrious',
  storied: 'gcStoried',
  renowned: 'gcRenowned',
  notable: 'gcNotable',
}

/** The white impact flash isn't a grade — it's an event colour. */
export const FLASH_WHITE = '#FFFFFF'

const HEX_OF = Object.fromEntries(GEM_GRADES.map((g) => [g.key, g.hex])) as Record<GemGrade, string>

/** The default colour for a grade (before any bench override). */
export function gradeHex(grade: GemGrade): string {
  return HEX_OF[grade] ?? '#FFFFFF'
}

/** `#RRGGBB` → the normalised `[r, g, b]` (0–1) the Lottie slot wants. */
export function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

/** `#RRGGBB` → `rgba(r,g,b,a)` for canvas / CSS. */
export function hexToRgba(hex: string, alpha = 1): string {
  const [r, g, b] = hexToRgb01(hex)
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${clamp01(alpha)})`
}

/** shift a hex colour's hue by `deg` (for the warp-streak colour variation). */
export function shiftHue(hex: string, deg: number): string {
  const [r, g, b] = hexToRgb01(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  h = (h + deg + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let rr = 0
  let gg = 0
  let bb = 0
  if (h < 60) [rr, gg, bb] = [c, x, 0]
  else if (h < 120) [rr, gg, bb] = [x, c, 0]
  else if (h < 180) [rr, gg, bb] = [0, c, x]
  else if (h < 240) [rr, gg, bb] = [0, x, c]
  else if (h < 300) [rr, gg, bb] = [x, 0, c]
  else [rr, gg, bb] = [c, 0, x]
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to(rr)}${to(gg)}${to(bb)}`
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}
