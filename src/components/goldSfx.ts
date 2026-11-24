/** The Gold Reveal's sound-effect clips (`src/assets/revealSFX/`). Drop another file in and it joins its set. */
const urls = (files: Record<string, unknown>) => Object.values(files) as string[]

/** every `goldbar*` / `goldbars*` clip — the pile-up and the spill */
export const GOLD_BAR_SFX = urls(
  import.meta.glob('@/assets/revealSFX/goldbar*.{wav,mp3}', { eager: true, query: '?url', import: 'default' }),
)

/** every `confetti*` clip — one per cannon shot */
export const GOLD_CONFETTI_SFX = urls(
  import.meta.glob('@/assets/revealSFX/confetti*.{wav,mp3}', { eager: true, query: '?url', import: 'default' }),
)
