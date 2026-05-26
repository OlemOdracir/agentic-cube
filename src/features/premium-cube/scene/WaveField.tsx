import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  LinearFilter,
  NormalBlending,
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
  varying float vDepth;
  varying vec2 vUv;

  float wave(vec2 p, float t) {
    float a = sin(p.x * 0.18 + t * 0.32) * uAmp1;
    float b = sin(p.y * 0.24 + t * 0.42 + 1.3) * uAmp2;
    float c = sin((p.x * 0.6 + p.y * 0.22) + t * 0.5 + 0.8) * uAmp3;
    float d = sin(p.y * 0.55 + t * 0.28) * uAmp2 * 0.35;
    return a + b + c + d;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    float displacement = wave(pos.xy, uTime);
    pos.z += displacement;
    vDisplacement = displacement;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = mix(0.6, 2.4, smoothstep(-0.2, 0.95, displacement)) * (220.0 / vDepth);
  }
`

const LINES_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vDisplacement;
  varying float vDepth;
  varying vec2 vUv;

  void main() {
    float peak = smoothstep(-0.05, 0.5, vDisplacement);
    float crestBoost = peak * peak;
    float radial = 1.0 - smoothstep(0.42, 1.05, distance(vUv, vec2(0.5, 0.5)));
    float verticalFade = smoothstep(0.0, 0.04, vUv.y) * (1.0 - smoothstep(0.78, 1.0, vUv.y));
    float depthFade = mix(1.0, 0.6, smoothstep(3.0, 22.0, vDepth));
    float alpha = (0.55 + crestBoost * 0.45) * radial * verticalFade;
    vec3 rgb = uColor * depthFade;
    gl_FragColor = vec4(rgb, alpha);
  }
`

const POINTS_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform sampler2D uMap;
  varying float vDisplacement;
  varying float vDepth;
  varying vec2 vUv;

  void main() {
    vec4 sprite = texture2D(uMap, gl_PointCoord);
    float peak = smoothstep(0.0, 0.5, vDisplacement);
    float crestBoost = peak * peak;
    float radial = 1.0 - smoothstep(0.42, 1.05, distance(vUv, vec2(0.5, 0.5)));
    float verticalFade = smoothstep(0.0, 0.04, vUv.y) * (1.0 - smoothstep(0.78, 1.0, vUv.y));
    float depthFade = mix(1.0, 0.55, smoothstep(3.0, 22.0, vDepth));
    float alpha = sprite.a * (0.7 + crestBoost * 0.9) * radial * verticalFade;
    vec3 rgb = uColor * depthFade;
    gl_FragColor = vec4(rgb, alpha);
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
  g.addColorStop(0.4, 'rgba(220,210,255,0.55)')
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
  position = [0, -1.35, -3.4],
  rotation = [-Math.PI / 2.3, 0, 0],
  width = 32,
  height = 22,
  segmentsX = 120,
  segmentsY = 96,
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
        blending: NormalBlending,
        uniforms: {
          uTime: { value: 0 },
          uAmp1: { value: 0.08 },
          uAmp2: { value: 0.62 },
          uAmp3: { value: 0.12 },
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
          uAmp1: { value: 0.08 },
          uAmp2: { value: 0.62 },
          uAmp3: { value: 0.12 },
          uColor: { value: new Color('#8a78ff') },
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
