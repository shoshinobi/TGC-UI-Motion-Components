import type { CSSProperties } from 'react'
import { motion, type MotionProps } from 'motion/react'
import type { Props } from '@/lib/types'
import { cn } from '@/lib/utils/cn'
import { LinearGradient } from '@/components/banner-stubs'
import { FoldableButton } from '@/components/banner-stubs'
import { Image } from '@/components/banner-stubs'
import { Typography } from '@/components/banner-stubs'

export type BannerProps = Props<{
  title: string
  subtitle: string
  imageUrl: string
  ctaLabel: string
  onCtaClick?: () => void
  /** Hides the CTA button — for the dimmed peeking card behind the active one in BannerStack, so
   * only the top banner offers an actionable button. Title/subtitle/image still render. */
  isPeeking?: boolean
  /** preview-only: subtitle accent colour + a stand-in "image". */
  tint?: string
  subtitleColor?: string
  /** When set, the CTA (top card only) scales/fades in with these motion props. */
  ctaMotion?: MotionProps | null
  ctaOrigin?: string
  /** 0–1 — opacity of a dark overlay (BannerStack dims the cards behind the front one; border included). */
  dim?: number
  borderColor?: string
  borderWidth?: number
  /** resting tilt of the card, degrees */
  rotate?: number
}>

export function Banner({
  title,
  subtitle,
  imageUrl,
  ctaLabel,
  onCtaClick,
  isPeeking = false,
  tint = '#20304a',
  subtitleColor = 'var(--color-primary)',
  ctaMotion = null,
  ctaOrigin = 'bottom right',
  dim = 0,
  borderColor = '#FFFFFF',
  borderWidth = 2,
  rotate = 2,
  className,
  style,
}: BannerProps) {
  // Solid border, darkened by the same amount as the dim overlay on cards behind the front one.
  const dimmedBorder =
    dim > 0 ? `color-mix(in srgb, ${borderColor}, #000 ${Math.round(dim * 100)}%)` : borderColor

  const cta = !isPeeking && (
    <FoldableButton tone='white' size='md' onClick={onCtaClick} className='banner-card__cta'>
      {ctaLabel}
    </FoldableButton>
  )

  return (
    <div className={cn('banner', className)} style={style}>
      <div
        className='banner-card'
        style={
          {
            ['--banner-tint']: tint,
            ['--banner-border-color']: dimmedBorder,
            ['--banner-border-width']: `${borderWidth}px`,
            ['--banner-rotate']: `${rotate}deg`,
          } as CSSProperties
        }
      >
        <LinearGradient gradient='banner-fade' className='banner-card__grad' />
        <div className='banner-card__body'>
          <Typography fontVariant='h4' className='banner-card__title' style={{ fontSize: 'clamp(16px, 4vw, 20px)' }}>
            {title}
          </Typography>
          <Typography
            fontVariant='h2'
            className='banner-card__subtitle'
            style={{ fontSize: 'clamp(24px, 6vw, 32px)', color: subtitleColor }}
          >
            {subtitle}
          </Typography>
        </div>
        <Image
          src={imageUrl}
          alt=''
          className='banner-card__image'
          style={{ height: 'clamp(80px, 25vw, 144px)', right: 'clamp(-40px, -9vw, -20px)' }}
          imageClassName='banner-card__image-el'
          hasFallbackBackground={false}
        />
        <div className='banner-card__scrim' style={{ opacity: dim }} aria-hidden='true' />
      </div>

      {cta &&
        (ctaMotion ? (
          <motion.div className='banner-card__cta-wrap' style={{ transformOrigin: ctaOrigin }} {...ctaMotion}>
            {cta}
          </motion.div>
        ) : (
          <div className='banner-card__cta-wrap'>{cta}</div>
        ))}
    </div>
  )
}
