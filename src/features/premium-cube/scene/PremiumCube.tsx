import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { AdditiveBlending, CanvasTexture, Color, SRGBColorSpace } from 'three'
import type { Mesh, MeshBasicMaterial } from 'three'

const FACE_LABELS = ['WORK', 'SYSTEMS', 'DESIGN', 'CONTACT', 'ABOUT', 'LAB']

function createFaceTexture(label: string, index: number) {
  const size = 768
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  ctx.clearRect(0, 0, size, size)

  const glow = ctx.createRadialGradient(size * 0.5, size * 0.43, 0, size * 0.5, size * 0.43, size * 0.56)
  glow.addColorStop(0, 'rgba(128, 184, 224, 0.24)')
  glow.addColorStop(0.44, 'rgba(42, 55, 92, 0.12)')
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, size, size)

  ctx.strokeStyle = 'rgba(210, 228, 242, 0.34)'
  ctx.lineWidth = 2
  ctx.strokeRect(54, 54, size - 108, size - 108)
  ctx.strokeStyle = 'rgba(193, 139, 90, 0.4)'
  ctx.strokeRect(78, 78, size - 156, size - 156)

  ctx.save()
  ctx.translate(size * 0.5, size * 0.42)
  ctx.rotate((Math.PI / 4) * (index % 2 === 0 ? 1 : -1))
  ctx.strokeStyle = 'rgba(228, 239, 248, 0.82)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.rect(-74, -74, 148, 148)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(132, 198, 236, 0.78)'
  ctx.beginPath()
  ctx.moveTo(-104, 0)
  ctx.lineTo(104, 0)
  ctx.moveTo(0, -104)
  ctx.lineTo(0, 104)
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = 'rgba(238, 244, 250, 0.94)'
  ctx.font = '500 34px Inter, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.letterSpacing = '10px'
  ctx.fillText(label, size * 0.5, size * 0.68)

  ctx.fillStyle = 'rgba(154, 203, 242, 0.72)'
  ctx.font = '500 13px Inter, Arial, sans-serif'
  ctx.fillText(`FACE 0${index + 1}`, size * 0.5, size * 0.77)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function createShineTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  const gradient = ctx.createRadialGradient(size * 0.5, size * 0.5, 0, size * 0.5, size * 0.5, size * 0.5)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.12, 'rgba(196,236,255,0.95)')
  gradient.addColorStop(0.34, 'rgba(109,187,245,0.26)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  ctx.save()
  ctx.translate(size * 0.5, size * 0.5)
  ctx.strokeStyle = 'rgba(230,248,255,0.9)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(-86, 0)
  ctx.lineTo(86, 0)
  ctx.moveTo(0, -86)
  ctx.lineTo(0, 86)
  ctx.stroke()
  ctx.restore()

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function ShineGlints() {
  const shineTexture = useMemo(() => createShineTexture(), [])
  const glints = useMemo(
    () => [
      { position: [0.9, 0.86, 1.13] as const, rotation: [0.12, 0.18, 0.22] as const, scale: 0.18, delay: 0 },
      { position: [1.13, 0.05, 0.72] as const, rotation: [0.08, 1.58, -0.12] as const, scale: 0.22, delay: 1.2 },
      { position: [-0.72, -0.36, 1.13] as const, rotation: [0.1, -0.05, 0.62] as const, scale: 0.16, delay: 2.1 },
      { position: [0.2, 1.13, 0.28] as const, rotation: [-1.48, 0, 0.72] as const, scale: 0.2, delay: 3 },
    ],
    [],
  )
  const meshRefs = useMemo(() => [] as Mesh[], [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    meshRefs.forEach((mesh, index) => {
      const material = mesh.material as MeshBasicMaterial
      const pulse = Math.max(0, Math.sin(t * 1.65 + glints[index].delay)) ** 3
      const scale = glints[index].scale * (0.76 + pulse * 0.5)

      material.opacity = 0.1 + pulse * 0.82
      mesh.scale.setScalar(scale)
      mesh.rotation.z += 0.002 + pulse * 0.004
    })
  })

  return (
    <>
      {glints.map((glint, index) => (
        <mesh
          key={index}
          position={glint.position}
          rotation={glint.rotation}
          ref={(node) => {
            if (node) {
              meshRefs[index] = node
            }
          }}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={shineTexture}
            transparent
            opacity={0.3}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  )
}

export function PremiumCube() {
  const faceTextures = useMemo(() => FACE_LABELS.map(createFaceTexture), [])
  const facePanels = [
    { position: [0, 0, 1.096] as const, rotation: [0, 0, 0] as const, texture: faceTextures[0] },
    { position: [1.096, 0, 0] as const, rotation: [0, Math.PI / 2, 0] as const, texture: faceTextures[1] },
    { position: [0, 1.096, 0] as const, rotation: [-Math.PI / 2, 0, 0] as const, texture: faceTextures[2] },
  ]

  return (
    <group>
      <RoundedBox args={[2.18, 2.18, 2.18]} radius={0.105} smoothness={9} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={new Color('#12151e')}
          metalness={0.88}
          roughness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.045}
          emissive={new Color('#0a1726')}
          emissiveIntensity={0.36}
          reflectivity={0.96}
        />
      </RoundedBox>

      {facePanels.map((panel, index) => (
        <mesh key={FACE_LABELS[index]} position={panel.position} rotation={panel.rotation}>
          <planeGeometry args={[1.58, 1.58]} />
          <meshBasicMaterial map={panel.texture} transparent opacity={0.88} depthWrite={false} />
        </mesh>
      ))}

      <mesh position={[0, 0, 0]} scale={1.012}>
        <boxGeometry args={[2.18, 2.18, 2.18]} />
        <meshBasicMaterial color="#dff5ff" transparent opacity={0.045} wireframe blending={AdditiveBlending} />
      </mesh>

      <ShineGlints />
    </group>
  )
}
