import { PremiumCubePrototype } from './features/premium-cube/PremiumCubePrototype'
import { VECTOR_WORLD_PRESETS } from './features/premium-cube/scene/vectorWorldConfig'
import { WaveFieldShowcase } from './features/premium-cube/WaveFieldShowcase'
import './App.css'

function readBgShowcaseFlag() {
  if (typeof window === 'undefined') return false
  const bg = new URLSearchParams(window.location.search).get('bg')
  return bg === 'only' || (typeof bg === 'string' && bg in VECTOR_WORLD_PRESETS)
}

function App() {
  return readBgShowcaseFlag() ? <WaveFieldShowcase /> : <PremiumCubePrototype />
}

export default App
