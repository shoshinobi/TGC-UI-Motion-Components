/** Every `fireworks*` clip in `src/assets/revealSFX/`. Drop another file in and it joins the set. */
export const FIREWORK_SFX = Object.values(
  import.meta.glob('@/assets/revealSFX/fireworks*.{wav,mp3}', { eager: true, query: '?url', import: 'default' }),
) as string[]
