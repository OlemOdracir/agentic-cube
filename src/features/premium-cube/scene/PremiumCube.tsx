import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { AdditiveBlending, CanvasTexture, Color, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'
import type { Mesh, MeshBasicMaterial } from 'three'
import type { CubeSection } from '../cubeSections'

const FACE_ACCENT = 'rgba(140, 130, 255, 0.94)'
const FACE_ACCENT_SOFT = 'rgba(170, 160, 255, 0.6)'

function drawDiamondGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save()
  ctx.translate(x, y)

  ctx.shadowBlur = size * 1.2
  ctx.shadowColor = FACE_ACCENT

  ctx.strokeStyle = FACE_ACCENT
  ctx.lineWidth = Math.max(2, size * 0.06)
  ctx.lineJoin = 'miter'
  ctx.beginPath()
  ctx.moveTo(0, -size)
  ctx.lineTo(size, 0)
  ctx.lineTo(0, size)
  ctx.lineTo(-size, 0)
  ctx.closePath()
  ctx.stroke()

  ctx.shadowBlur = size * 1.6
  ctx.shadowColor = 'rgba(220, 220, 255, 0.9)'
  ctx.fillStyle = 'rgba(245, 244, 255, 0.96)'
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2)
  ctx.fill()

  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.08, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function createFaceTexture(section: CubeSection) {
  const size = 1536
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  ctx.clearRect(0, 0, size, size)

  const outerInset = 110
  const innerInset = 200
  const innerW = size - innerInset * 2
  const innerH = size - innerInset * 2
  const bracketLen = 90

  const baseShade = ctx.createLinearGradient(0, 0, 0, size)
  baseShade.addColorStop(0, 'rgba(20, 22, 50, 0.28)')
  baseShade.addColorStop(0.5, 'rgba(6, 8, 22, 0.1)')
  baseShade.addColorStop(1, 'rgba(2, 3, 10, 0.22)')
  ctx.fillStyle = baseShade
  ctx.fillRect(0, 0, size, size)

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(outerInset, outerInset + bracketLen)
  ctx.lineTo(outerInset, outerInset)
  ctx.lineTo(outerInset + bracketLen, outerInset)
  ctx.moveTo(size - outerInset - bracketLen, outerInset)
  ctx.lineTo(size - outerInset, outerInset)
  ctx.lineTo(size - outerInset, outerInset + bracketLen)
  ctx.moveTo(outerInset, size - outerInset - bracketLen)
  ctx.lineTo(outerInset, size - outerInset)
  ctx.lineTo(outerInset + bracketLen, size - outerInset)
  ctx.moveTo(size - outerInset - bracketLen, size - outerInset)
  ctx.lineTo(size - outerInset, size - outerInset)
  ctx.lineTo(size - outerInset, size - outerInset - bracketLen)
  ctx.strokeStyle = 'rgba(170, 165, 220, 0.32)'
  ctx.lineWidth = 2.5
  ctx.stroke()
  ctx.restore()

  const innerShadow = ctx.createLinearGradient(0, innerInset, 0, size - innerInset)
  innerShadow.addColorStop(0, 'rgba(0, 0, 4, 0.32)')
  innerShadow.addColorStop(0.22, 'rgba(0, 0, 4, 0.06)')
  innerShadow.addColorStop(0.6, 'rgba(0, 0, 4, 0)')
  innerShadow.addColorStop(1, 'rgba(0, 0, 4, 0.22)')
  ctx.fillStyle = innerShadow
  ctx.fillRect(innerInset, innerInset, innerW, innerH)

  ctx.strokeStyle = 'rgba(0, 0, 6, 0.6)'
  ctx.lineWidth = 3
  ctx.strokeRect(innerInset, innerInset, innerW, innerH)
  ctx.strokeStyle = 'rgba(190, 185, 235, 0.38)'
  ctx.lineWidth = 1.2
  ctx.strokeRect(innerInset - 2, innerInset - 2, innerW + 4, innerH + 4)

  ctx.save()
  ctx.beginPath()
  ctx.rect(innerInset, innerInset, innerW, 18)
  const topBevel = ctx.createLinearGradient(0, innerInset, 0, innerInset + 18)
  topBevel.addColorStop(0, 'rgba(230, 230, 255, 0.28)')
  topBevel.addColorStop(1, 'rgba(230, 230, 255, 0)')
  ctx.fillStyle = topBevel
  ctx.fill()
  ctx.restore()

  const innerGlow = ctx.createRadialGradient(size * 0.5, size * 0.42, 0, size * 0.5, size * 0.5, size * 0.46)
  innerGlow.addColorStop(0, 'rgba(140, 130, 255, 0.24)')
  innerGlow.addColorStop(0.46, 'rgba(60, 50, 140, 0.08)')
  innerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = innerGlow
  ctx.fillRect(innerInset, innerInset, innerW, innerH)

  drawDiamondGlyph(ctx, size * 0.5, size * 0.38, 150)

  ctx.fillStyle = 'rgba(244, 245, 255, 0.98)'
  ctx.font = '300 116px "Inter", "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.letterSpacing = '28px'
  ctx.shadowBlur = 28
  ctx.shadowColor = 'rgba(140, 130, 255, 0.5)'
  ctx.fillText(section.label, size * 0.5, size * 0.6)

  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(220, 218, 250, 0.78)'
  ctx.font = '300 58px "Inter", "Helvetica Neue", Arial, sans-serif'
  ctx.letterSpacing = '20px'
  ctx.fillText('OBSIDIAN CUBE', size * 0.5, size * 0.69)

  ctx.fillStyle = FACE_ACCENT_SOFT
  const dotY = size * 0.78
  const dotR = 8
  const dotGap = 40
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath()
    ctx.arc(size * 0.5 + i * dotGap, dotY, dotR, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 16
  texture.generateMipmaps = true
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
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
  gradient.addColorStop(0.12, 'rgba(214,214,255,0.95)')
  gradient.addColorStop(0.3, 'rgba(132,123,255,0.38)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  ctx.save()
  ctx.translate(size * 0.5, size * 0.5)
  ctx.strokeStyle = 'rgba(220,222,255,0.92)'
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

type ShineGlintsProps = {
  animate: boolean
}

function ShineGlints({ animate }: ShineGlintsProps) {
  const shineTexture = useMemo(() => createShineTexture(), [])
  const glints = useMemo(
    () => [
      { position: [0.9, 0.86, 1.13] as const, rotation: [0.12, 0.18, 0.22] as const, scale: 0.18, delay: 0 },
      { position: [1.13, 0.05, 0.72] as const, rotation: [0.08, 1.58, -0.12] as const, scale: 0.22, delay: 1.2 },
      { position: [-0.72, -0.36, 1.13] as const, rotation: [0.1, -0.05, 0.62] as const, scale: 0.16, delay: 2.1 },
      { position: [0.2, 1.13, 0.28] as const, rotation: [-1.48, 0, 0.72] as const, scale: 0.2, delay: 3 },
      { position: [-1.13, 0.48, -0.24] as const, rotation: [0.06, -1.52, 0.4] as const, scale: 0.14, delay: 4 },
    ],
    [],
  )
  const meshRefs = useMemo(() => [] as Mesh[], [])

  useFrame(({ clock }) => {
    if (!animate) {
      return
    }

    const t = clock.getElapsedTime()

    meshRefs.forEach((mesh, index) => {
      const material = mesh.material as MeshBasicMaterial
      const pulse = (Math.sin(t * 0.42 + glints[index].delay) + 1) * 0.5
      const scale = glints[index].scale * (0.94 + pulse * 0.12)

      material.opacity = 0.22 + pulse * 0.16
      mesh.scale.setScalar(scale)
      mesh.rotation.z += 0.0008 + pulse * 0.0005
    })
  })

  return (
    <>
      {glints.map((glint, index) => (
        <mesh
          key={index}
          position={glint.position}
          rotation={glint.rotation}
          scale={glint.scale}
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

type PremiumCubeProps = {
  animateGlints: boolean
  sections: CubeSection[]
  shadows: boolean
}

export function PremiumCube({ animateGlints, sections, shadows }: PremiumCubeProps) {
  const faceTextures = useMemo(() => sections.map(createFaceTexture), [sections])
  const facePanels = [
    { position: [0, 0, 1.118] as const, rotation: [0, 0, 0] as const, texture: faceTextures[0] },
    { position: [1.118, 0, 0] as const, rotation: [0, Math.PI / 2, 0] as const, texture: faceTextures[1] },
    { position: [0, 1.118, 0] as const, rotation: [-Math.PI / 2, 0, 0] as const, texture: faceTextures[2] },
    { position: [0, 0, -1.118] as const, rotation: [0, Math.PI, 0] as const, texture: faceTextures[3] },
    { position: [-1.118, 0, 0] as const, rotation: [0, -Math.PI / 2, 0] as const, texture: faceTextures[4] },
    { position: [0, -1.118, 0] as const, rotation: [Math.PI / 2, 0, 0] as const, texture: faceTextures[5] },
  ]

  return (
    <group>
      <RoundedBox args={[2.18, 2.18, 2.18]} radius={0.1} smoothness={10} castShadow={shadows} receiveShadow={shadows}>
        <meshPhysicalMaterial
          color={new Color('#010208')}
          metalness={0.92}
          roughness={0.13}
          clearcoat={1}
          clearcoatRoughness={0.05}
          emissive={new Color('#020410')}
          emissiveIntensity={0.1}
          envMapIntensity={0.95}
          reflectivity={1}
          transmission={0.02}
          thickness={0.32}
          ior={1.6}
        />
      </RoundedBox>

      {facePanels.map((panel, index) => (
        <mesh key={sections[index].id} position={panel.position} rotation={panel.rotation}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial
            map={panel.texture}
            transparent
            opacity={0.92}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}

      <ShineGlints animate={animateGlints} />
    </group>
  )
}
