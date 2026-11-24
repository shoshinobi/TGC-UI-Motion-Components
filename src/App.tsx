import { useEffect } from 'react'
import { Leva, useControls } from 'leva'
import { FlameBench } from '@/benches/FlameBench'
import { SheetBench } from '@/benches/SheetBench'
import { GaugeBench } from '@/benches/GaugeBench'
import { BannerBench } from '@/benches/BannerBench'
import { RainBench } from '@/benches/RainBench'
import { GemBench } from '@/benches/GemBench'
import { GemWheelBench } from '@/benches/GemWheelBench'
import { GoldRevealBench } from '@/benches/GoldRevealBench'
import { ConfettiBench } from '@/benches/ConfettiBench'
import { CosmeticRevealBench } from '@/benches/CosmeticRevealBench'
import { StatsHud } from '@/components/StatsHud'
import { ViewportButtons } from '@/components/ViewportButtons'
import type { Viewport } from '@/lib/viewport'
import { setPanelOpen, usePanelOpen } from '@/lib/panelOpen'

const COMPONENTS = [
  'Flame Pictogram',
  'Feedback Sheet',
  'Gauge',
  'Banner Stack',
  'Particle Rain',
  'Gem Reveal',
  'Gem Wheel',
  'Gold Reveal',
  'Confetti',
  'Cosmetic Reveal',
] as const

const SLUG_OF: Record<string, string> = {
  'Flame Pictogram': 'flame',
  'Feedback Sheet': 'sheet',
  Gauge: 'gauge',
  'Banner Stack': 'banner',
  'Particle Rain': 'rain',
  'Gem Reveal': 'gem',
  'Gem Wheel': 'wheel',
  'Gold Reveal': 'gold',
  Confetti: 'confetti',
  'Cosmetic Reveal': 'cosmetic',
}

/** the components framed at a device width, and the one each starts at */
const START_VIEWPORT: Record<string, Viewport> = {
  'Feedback Sheet': 'phone',
  'Banner Stack': 'phone',
  'Particle Rain': 'full',
  'Gem Wheel': 'phone',
  'Gold Reveal': 'phone',
  Confetti: 'phone',
  'Cosmetic Reveal': 'phone',
}

function initialComponent(): string {
  if (typeof window === 'undefined') return COMPONENTS[0]
  const c = new URLSearchParams(window.location.search).get('c')?.toLowerCase() ?? ''
  if (c.startsWith('sheet') || c.startsWith('feedback')) return 'Feedback Sheet'
  if (c.startsWith('gauge') || c.startsWith('meter')) return 'Gauge'
  if (c.startsWith('banner') || c.startsWith('stack') || c.startsWith('carousel')) return 'Banner Stack'
  if (c.startsWith('cosmetic') || c.startsWith('carousel-reveal')) return 'Cosmetic Reveal'
  if (c.startsWith('confetti') || c.startsWith('firework')) return 'Confetti'
  if (c.startsWith('rain') || c.startsWith('particle')) return 'Particle Rain'
  if (c.startsWith('gold') || c.startsWith('payday')) return 'Gold Reveal'
  if (c.startsWith('wheel') || c.startsWith('gemwheel') || c.startsWith('gem-wheel')) return 'Gem Wheel'
  if (c.startsWith('gem') || c.startsWith('reveal') || c.startsWith('crystal')) return 'Gem Reveal'
  if (c.startsWith('flame')) return 'Flame Pictogram'
  return COMPONENTS[0]
}

export function App() {
  // the controls start hidden behind the sliders icon on the stage (SpecsToggle)
  const panelOpen = usePanelOpen()

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
    <div className='shell' data-panel={panelOpen ? 'expanded' : 'collapsed'} data-viewports={component in START_VIEWPORT}>
      <Leva
        titleBar={{ title: component }}
        hidden={!panelOpen}
        // the title bar's arrow puts the panel away
        collapsed={{ collapsed: false, onChange: (c) => c && setPanelOpen(false) }}
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
      ) : component === 'Gem Wheel' ? (
        <GemWheelBench key='wheel' />
      ) : component === 'Gold Reveal' ? (
        <GoldRevealBench key='gold' />
      ) : component === 'Confetti' ? (
        <ConfettiBench key='confetti' />
      ) : component === 'Cosmetic Reveal' ? (
        <CosmeticRevealBench key='cosmetic' />
      ) : (
        <FlameBench key='flame' />
      )}

      {component in START_VIEWPORT && <ViewportButtons fallback={START_VIEWPORT[component]} />}
      <StatsHud />
    </div>
  )
}
