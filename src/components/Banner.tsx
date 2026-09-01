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
  className,
  style,
}: BannerProps) {
  const cta = !isPeeking && (
    <FoldableButton tone='white' size='md' onClick={onCtaClick} className='banner-card__cta'>
      {ctaLabel}
    </FoldableButton>
  )

  return (
    <div className={cn('banner', className)} style={style}>
      <div className='banner-card' style={{ ['--banner-tint' as string]: tint } as CSSProperties}>
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
