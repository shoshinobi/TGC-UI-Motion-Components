import musicBeltUrl from '@/assets/mp3/GemReveal_music-belt-and-braces.mp3'
import chasingQuailsUrl from '@/assets/Chasing Quails.mp3'
import vogueUrl from '@/assets/Vogue.mp3'

/** Soundtracks for the Gold Reveal + Cosmetic Reveal (url + display name). */
export const REVEAL_MUSIC = {
  'chasing-quails': { url: chasingQuailsUrl, label: 'Chasing Quails' },
  vogue: { url: vogueUrl, label: 'Vogue' },
  'belt-and-braces': { url: musicBeltUrl, label: 'Belt and Braces' },
} as const
export type RevealMusicKey = keyof typeof REVEAL_MUSIC
export type RevealMusicTrack = 'off' | 'random' | RevealMusicKey

/** Leva options for the soundtrack picker */
export const REVEAL_MUSIC_OPTIONS: Record<string, RevealMusicTrack> = {
  off: 'off',
  random: 'random',
  'Chasing Quails': 'chasing-quails',
  Vogue: 'vogue',
  'Belt and Braces': 'belt-and-braces',
}
