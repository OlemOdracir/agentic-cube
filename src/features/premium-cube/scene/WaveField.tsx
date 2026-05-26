import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  LinearFilter,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
} from 'three'
import type { Mesh, Points } from 'three'

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uAmp1;
  uniform float uAmp2;
  uniform float uAmp3;
  varying float vDisplacement;
  varying vec2 vUv;

  float wave(vec2 p, float t) {
    float a = sin(p.x * 0.42 + t * 0.45) * uAmp1;
    float b = sin(p.y * 0.36 + t * 0.55 + 1.3) * uAmp2;
    float c = sin((p.x + p.y) * 0.22 + t * 0.7 + 0.8) * uAmp3;
    float d = sin((p.x * 0.13 - p.y * 0.21) + t * 0.32) * uAmp1 * 0.4;
    return a + b + c + d;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    float displacement = wave(pos.xy, uTime);
    pos.z += displacement;
    vDisplacement = displacement;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = mix(1.0, 3.6, smoothstep(-0.6, 0.9, displacement)) * (320.0 / -mvPosition.z);
  }
`

const LINES_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vDisplacement;
  varying vec2 vUv;

  void main() {
    float crestBoost = smoothstep(-0.4, 0.9, vDisplacement);
    float radial = 1.0 - smoothstep(0.18, 0.78, distance(vUv, vec2(0.5, 0.42)));
    float verticalFade = smoothstep(0.02, 0.36, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y));
    float alpha = (0.18 + crestBoost * 0.45) * radial * verticalFade;
    gl_FragColor = vec4(uColor, alpha);
  }
`

const POINTS_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform sampler2D uMap;
  varying float vDisplacement;
  varying vec2 vUv;

  void main() {
    vec2 coord = gl_PointCoord;
    vec4 sprite = texture2D(uMap, coord);
    float crestBoost = smoothstep(-0.2, 0.9, vDisplacement);
    float radial = 1.0 - smoothstep(0.18, 0.8, distance(vUv, vec2(0.5, 0.42)));
    float verticalFade = smoothstep(0.02, 0.32, vUv.y) * (1.0 - smoothstep(0.74, 1.0, vUv.y));
    float alpha = sprite.a * (0.32 + crestBoost * 0.58) * radial * verticalFade;
    gl_FragColor = vec4(uColor, alpha);
  }
`

function createDotTexture() {
  const s = 64
  const canvas = document.createElement('canvas')
  canvas.width = s
  canvas.height = s
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.45, 'rgba(220,210,255,0.7)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const t = new CanvasTexture(canvas)
  t.colorSpace = SRGBColorSpace
  t.magFilter = LinearFilter
  t.minFilter = LinearFilter
  return t
}

type WaveFieldProps = {
  position?: [number, number, number]
  rotation?: [number, number, number]
  width?: number
  height?: number
  segmentsX?: number
  segmentsY?: number
  paused?: boolean
}

export function WaveField({
  position = [0, -1.6, -3.5],
  rotation = [-Math.PI / 2.4, 0, 0],
  width = 28,
  height = 16,
  segmentsX = 96,
  segmentsY = 56,
  paused = false,
}: WaveFieldProps) {
  const planeGeometry = useMemo(() => new PlaneGeometry(width, height, segmentsX, segmentsY), [width, height, segmentsX, segmentsY])

  const pointsGeometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(planeGeometry.attributes.position.array.slice(), 3))
    geo.setAttribute('uv', new BufferAttribute(planeGeometry.attributes.uv.array.slice(), 2))
    return geo
  }, [planeGeometry])

  const dotTexture = useMemo(() => createDotTexture(), [])

  const lineMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: LINES_FRAGMENT,
        transparent: true,
        depthWrite: false,
        wireframe: true,
        blending: AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uAmp1: { value: 0.32 },
          uAmp2: { value: 0.22 },
          uAmp3: { value: 0.16 },
          uColor: { value: new Color('#7a6dff') },
        },
      }),
    [],
  )

  const pointMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: POINTS_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uAmp1: { value: 0.32 },
          uAmp2: { value: 0.22 },
          uAmp3: { value: 0.16 },
          uColor: { value: new Color('#c8c0ff') },
          uMap: { value: dotTexture },
        },
      }),
    [dotTexture],
  )

  const lineMeshRef = useRef<Mesh>(null)
  const pointMeshRef = useRef<Points>(null)

  useFrame(({ clock }) => {
    if (paused) return
    const t = clock.getElapsedTime()
    const lineMat = lineMeshRef.current?.material as ShaderMaterial | undefined
    const pointMat = pointMeshRef.current?.material as ShaderMaterial | undefined
    if (lineMat) lineMat.uniforms.uTime.value = t
    if (pointMat) pointMat.uniforms.uTime.value = t
  })

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={planeGeometry} material={lineMaterial} ref={lineMeshRef} />
      <points geometry={pointsGeometry} material={pointMaterial} ref={pointMeshRef} />
    </group>
  )
}
