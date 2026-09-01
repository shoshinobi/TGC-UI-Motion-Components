import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * Dummy stand-ins for the design-system components the developer's `Banner.tsx`
 * imports (`Typography`, `FoldableButton`, `Image`, `LinearGradient`). Only the
 * shape and rough look matter here — the bench is about the *stack motion*, not
 * these. Swap the real DS components back in on their side.
 */

export function Typography({
  children,
  className,
  style,
  fontVariant,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  fontVariant?: string
}) {
  return (
    <span className={cn('banner-type', className)} data-variant={fontVariant} style={style}>
      {children}
    </span>
  )
}

export function FoldableButton({
  children,
  onClick,
  className,
  tone = 'white',
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  tone?: 'white' | 'dark'
  size?: string
}) {
  return (
    <button type='button' onClick={onClick} className={cn('banner-fold-btn', className)} data-tone={tone}>
      <span className='banner-fold-btn__patch' aria-hidden='true' />
      <span className='banner-fold-btn__label'>{children}</span>
    </button>
  )
}

export function Image({
  src,
  alt,
  className,
  style,
  imageClassName,
}: {
  src?: string
  alt?: string
  className?: string
  style?: CSSProperties
  imageClassName?: string
  hasFallbackBackground?: boolean
}) {
  return (
    <div className={cn('banner-img', className)} style={style} role='img' aria-label={alt || undefined}>
      {src && /^(https?:|data:|blob:|\/)/.test(src) ? (
        <img src={src} alt='' className={imageClassName} />
      ) : (
        <span className='banner-img__ph' aria-hidden='true'>
          {src /* the bench passes an emoji here */ || '🖼️'}
        </span>
      )}
    </div>
  )
}

export function LinearGradient({ gradient, className }: { gradient?: string; className?: string }) {
  return <div className={cn('banner-grad', className)} data-gradient={gradient} aria-hidden='true' />
}
