import { useEffect, useState } from 'react'
import { Leva, useControls } from 'leva'
import { FlameBench } from '@/benches/FlameBench'
import { SheetBench } from '@/benches/SheetBench'

const COMPONENTS = ['Flame Pictogram', 'Feedback Sheet'] as const

const SLUG_OF: Record<string, string> = { 'Flame Pictogram': 'flame', 'Feedback Sheet': 'sheet' }

function initialComponent(): string {
  if (typeof window === 'undefined') return COMPONENTS[0]
  const c = new URLSearchParams(window.location.search).get('c')?.toLowerCase() ?? ''
  if (c.startsWith('sheet') || c.startsWith('feedback')) return 'Feedback Sheet'
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

      {component === 'Feedback Sheet' ? <SheetBench key='sheet' /> : <FlameBench key='flame' />}
    </div>
  )
}
