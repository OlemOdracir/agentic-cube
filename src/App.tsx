import { PremiumCubePrototype } from './features/premium-cube/PremiumCubePrototype'
import { WaveFieldShowcase } from './features/premium-cube/WaveFieldShowcase'
import './App.css'

function readBgShowcaseFlag() {
  if (typeof window === 'undefined') return false
  const bg = new URLSearchParams(window.location.search).get('bg')
  return bg === 'only' || bg === 'city'
}

function App() {
  return readBgShowcaseFlag() ? <WaveFieldShowcase /> : <PremiumCubePrototype />
}

export default App
