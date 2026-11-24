import { setViewport, useViewport, type Viewport } from '@/lib/viewport'

const ICON: Record<Viewport, JSX.Element> = {
  phone: (
    <>
      <rect x='7' y='3' width='10' height='18' rx='2.4' />
      <path d='M11 17.8h2' />
    </>
  ),
  tablet: (
    <>
      <rect x='4.5' y='3' width='15' height='18' rx='2.4' />
      <path d='M10.8 17.8h2.4' />
    </>
  ),
  full: (
    <>
      <rect x='2.5' y='4.5' width='19' height='12.5' rx='2' />
      <path d='M9 20.5h6M12 17v3.5' />
    </>
  ),
}
const LABEL: Record<Viewport, string> = { phone: 'Phone', tablet: 'Tablet', full: 'Full width' }

/** Top-left of the screen: phone / tablet / full. */
export function ViewportButtons({ fallback }: { fallback: Viewport }) {
  const current = useViewport(fallback)
  return (
    <div className='viewport-buttons' role='group' aria-label='Viewport'>
      {(Object.keys(ICON) as Viewport[]).map((v) => (
        <button
          key={v}
          type='button'
          data-on={v === current}
          aria-pressed={v === current}
          aria-label={LABEL[v]}
          title={LABEL[v]}
          onClick={() => setViewport(v)}
        >
          <svg viewBox='0 0 24 24' width='19' height='19' aria-hidden='true' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
            {ICON[v]}
          </svg>
        </button>
      ))}
    </div>
  )
}
