import { useEffect, useState } from 'react'
import { Leva, useControls } from 'leva'
import { FlameBench } from '@/benches/FlameBench'
import { SheetBench } from '@/benches/SheetBench'
import { GaugeBench } from '@/benches/GaugeBench'
import { BannerBench } from '@/benches/BannerBench'
import { RainBench } from '@/benches/RainBench'
import { GemBench } from '@/benches/GemBench'
import { StatsHud } from '@/components/StatsHud'

const COMPONENTS = [
  'Flame Pictogram',
  'Feedback Sheet',
  'Gauge',
  'Banner Stack',
  'Particle Rain',
  'Gem Reveal',
] as const

const SLUG_OF: Record<string, string> = {
  'Flame Pictogram': 'flame',
  'Feedback Sheet': 'sheet',
  Gauge: 'gauge',
  'Banner Stack': 'banner',
  'Particle Rain': 'rain',
  'Gem Reveal': 'gem',
}

function initialComponent(): string {
  if (typeof window === 'undefined') return COMPONENTS[0]
  const c = new URLSearchParams(window.location.search).get('c')?.toLowerCase() ?? ''
  if (c.startsWith('sheet') || c.startsWith('feedback')) return 'Feedback Sheet'
  if (c.startsWith('gauge') || c.startsWith('meter')) return 'Gauge'
  if (c.startsWith('banner') || c.startsWith('stack') || c.startsWith('carousel')) return 'Banner Stack'
  if (c.startsWith('rain') || c.startsWith('particle') || c.startsWith('confetti')) return 'Particle Rain'
  if (c.startsWith('gem') || c.startsWith('reveal') || c.startsWith('crystal')) return 'Gem Reveal'
  if (c.startsWith('flame')) return 'Flame Pictogram'
  return COMPONENTS[0]
}

export function App() {
  // Start the Leva panel collapsed on small screens so it doesn't cover the stage.
  const [panelCollapsed, setPanelCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 720,
  )
  useEffect(() => {
    const onResize = () => setPanelCollapsed(window.innerWidth < 720)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const { component } = useControls({
    component: { value: initialComponent(), options: COMPONENTS as unknown as string[] },
  })

  // Keep the address bar in sync so a link to the current component is always
  // copy-pasteable.
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('c', SLUG_OF[component] ?? 'flame')
    window.history.replaceState(null, '', url)
    document.title = `${component} — Motion Preview`
  }, [component])

  return (
    <div className='shell' data-panel={panelCollapsed ? 'collapsed' : 'expanded'}>
      <Leva
        titleBar={{ title: component }}
        collapsed={{ collapsed: panelCollapsed, onChange: setPanelCollapsed }}
        theme={{ sizes: { rootWidth: 'min(340px, calc(100vw - 20px))' } }}
      />

      {component === 'Feedback Sheet' ? (
        <SheetBench key='sheet' />
      ) : component === 'Gauge' ? (
        <GaugeBench key='gauge' />
      ) : component === 'Banner Stack' ? (
        <BannerBench key='banner' />
      ) : component === 'Particle Rain' ? (
        <RainBench key='rain' />
      ) : component === 'Gem Reveal' ? (
        <GemBench key='gem' />
      ) : (
        <FlameBench key='flame' />
      )}

      <StatsHud />
    </div>
  )
}
