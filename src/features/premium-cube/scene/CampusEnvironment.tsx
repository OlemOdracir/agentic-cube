import { useMemo } from 'react'
import { EquirectangularReflectionMapping, SRGBColorSpace, TextureLoader } from 'three'

const ENVIRONMENT_URL = '/environments/udec-frontis.jpg'

export function CampusEnvironment() {
  const environmentTexture = useMemo(() => {
    const texture = new TextureLoader().load(ENVIRONMENT_URL)
    texture.mapping = EquirectangularReflectionMapping
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 8
    texture.repeat.set(1.8, 1)
    texture.offset.set(0.18, 0)
    texture.needsUpdate = true
    return texture
  }, [])

  return <primitive object={environmentTexture} attach="environment" />
}
