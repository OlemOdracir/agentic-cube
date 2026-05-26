import { PremiumCubePrototype } from './features/premium-cube/PremiumCubePrototype'
import { WaveFieldShowcase } from './features/premium-cube/WaveFieldShowcase'
import './App.css'

function readBgOnlyFlag() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('bg') === 'only'
}

function App() {
  return readBgOnlyFlag() ? <WaveFieldShowcase /> : <PremiumCubePrototype />
}

export default App
