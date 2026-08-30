import { useRef, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { CanvasAddonMountContext } from '../generated/mywallpaper-runtime'

type LayerApi = CanvasAddonMountContext['layer']

function useSettings<T>(layer: LayerApi): T {
  const [settings, setSettings] = useState<T>(() => layer.settings.get() as T)

  useEffect(() => layer.settings.subscribe((next) => setSettings(next as T)), [layer])
  return settings
}

function useViewport(layer: LayerApi): { width: number; height: number } {
  const read = () => ({
    width: layer.root.clientWidth || window.innerWidth,
    height: layer.root.clientHeight || window.innerHeight,
  })
  const [viewport, setViewport] = useState(read)

  useEffect(() => {
    const update = () => setViewport(read())
    update()
    window.addEventListener('resize', update)
    const observer = new ResizeObserver(update)
    observer.observe(layer.root)
    return () => {
      window.removeEventListener('resize', update)
      observer.disconnect()
    }
  }, [layer])

  return viewport
}

interface RainSettings {
  rainColor: string
  rainIntensity: number
  rainSpeed: number
  dropLength: number
  dropWidth: number
  windAngle: number
  windVariation: number
  enableGlow: boolean
  glowIntensity: number
  opacity: number
}

const DEFAULTS: RainSettings = {
  rainColor: '#a8c8e8',
  rainIntensity: 200,
  rainSpeed: 1.7,
  dropLength: 42,
  dropWidth: 0.8,
  windAngle: -5,
  windVariation: 0,
  enableGlow: true,
  glowIntensity: 0.3,
  opacity: 0.6,
}

// ─── WGSL Shaders ───────────────────────────────────────────────────────────

const PARTICLE_STRUCT = /* wgsl */`struct Particle { x: f32, y: f32, sx: f32, sy: f32, dx: f32, dy: f32, len: f32, _p: f32 };`
const RNG_FNS = /* wgsl */`
fn hash(s: u32) -> u32 { var v=s; v^=v>>16u; v*=0x45d9f3bu; v^=v>>16u; v*=0x45d9f3bu; v^=v>>16u; return v; }
fn rng(s: ptr<function,u32>) -> f32 { *s=hash(*s); return f32(*s & 0x00FFFFFFu)/16777216.0; }
`

const INIT_WGSL = /* wgsl */`
${PARTICLE_STRUCT}
struct U { w: f32, h: f32, dropLen: f32, speed: f32, wind: f32, windVar: f32, seed: u32, start: u32, count: u32, _p1: u32, _p2: u32, _p3: u32 };

@group(0) @binding(0) var<storage, read_write> p: array<Particle>;
@group(0) @binding(1) var<uniform> u: U;

${RNG_FNS}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= u.count) { return; }
  let i = id.x + u.start;

  var s = u.seed * 7919u + i * 6271u;
  var d: Particle;
  d.len = u.dropLen * (0.7 + rng(&s) * 0.6);
  let bs = u.speed * (0.8 + rng(&s) * 0.4) * 15.0;
  let wr = (u.wind + (rng(&s) * 2.0 - 1.0) * u.windVar) * 0.01745329;
  let tx = tan(wr) * bs;
  let m = sqrt(tx * tx + bs * bs);
  d.sx = tx; d.sy = bs; d.dx = tx / m; d.dy = bs / m;
  d.x = rng(&s) * u.w;
  d.y = rng(&s) * u.h;
  d._p = 0.0;
  p[i] = d;
}
`

const COMPUTE_WGSL = /* wgsl */`
${PARTICLE_STRUCT}
struct U { w: f32, h: f32, dropLen: f32, speed: f32, wind: f32, windVar: f32, dt: f32, seed: u32, count: u32, _p1: u32, _p2: u32, _p3: u32 };

@group(0) @binding(0) var<storage, read_write> p: array<Particle>;
@group(0) @binding(1) var<uniform> u: U;

${RNG_FNS}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  if (i >= u.count) { return; }
  var d = p[i];

  d.x += d.sx * u.dt;
  d.y += d.sy * u.dt;

  if (d.y > u.h || d.x < -100.0 || d.x > u.w + 100.0) {
    var s = u.seed * 7919u + i * 6271u;
    d.len = u.dropLen * (0.7 + rng(&s) * 0.6);
    let bs = u.speed * (0.8 + rng(&s) * 0.4) * 15.0;
    let wr = (u.wind + (rng(&s) * 2.0 - 1.0) * u.windVar) * 0.01745329;
    let tx = tan(wr) * bs;
    let m = sqrt(tx * tx + bs * bs);
    d.sx = tx; d.sy = bs; d.dx = tx / m; d.dy = bs / m;

    let sp = rng(&s) * (u.w + u.h);
    if (sp < u.w) { d.x = sp; d.y = -(20.0 + rng(&s) * 80.0); }
    else { d.y = sp - u.w; d.x = select(u.w + 10.0 + rng(&s) * 40.0, -(10.0 + rng(&s) * 40.0), u.wind >= 0.0); }
  }
  p[i] = d;
}
`

const RENDER_WGSL = /* wgsl */`
${PARTICLE_STRUCT}
struct U { w: f32, h: f32, hw: f32, opacity: f32, r: f32, g: f32, b: f32, _p: f32 };

@group(0) @binding(0) var<storage, read> p: array<Particle>;
@group(0) @binding(1) var<uniform> u: U;

@vertex fn vs(@builtin(instance_index) inst: u32, @builtin(vertex_index) v: u32) -> @builtin(position) vec4<f32> {
  let d = p[inst];
  let hl = d.len * 0.5;
  let along = vec2f(d.dx, d.dy);
  let perp = vec2f(-d.dy, d.dx) * u.hw;
  let tip = vec2f(d.x, d.y) + along * hl;
  let tail = vec2f(d.x, d.y) - along * hl;
  var pos: vec2f;
  switch(v) {
    case 0u: { pos = tail + perp; }
    case 1u: { pos = tail - perp; }
    case 2u: { pos = tip + perp; }
    case 3u: { pos = tip + perp; }
    case 4u: { pos = tail - perp; }
    case 5u: { pos = tip - perp; }
    default: { pos = vec2f(0.0); }
  }
  return vec4f(pos.x / u.w * 2.0 - 1.0, 1.0 - pos.y / u.h * 2.0, 0.0, 1.0);
}

@fragment fn fs() -> @location(0) vec4<f32> {
  let a = u.opacity;
  return vec4f(u.r * a, u.g * a, u.b * a, a);
}
`

// ─── Component ──────────────────────────────────────────────────────────────

const PARTICLE_BYTES = 32
const BUF_USAGE = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC

export default function RainEffect({ layer }: { layer: LayerApi }) {
  const raw = useSettings<Partial<RainSettings>>(layer)
  const { width, height } = useViewport(layer)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gpuError, setGpuError] = useState('')

  const s: RainSettings = {
    rainColor: raw.rainColor ?? DEFAULTS.rainColor,
    rainIntensity: raw.rainIntensity ?? DEFAULTS.rainIntensity,
    rainSpeed: raw.rainSpeed ?? DEFAULTS.rainSpeed,
    dropLength: raw.dropLength ?? DEFAULTS.dropLength,
    dropWidth: raw.dropWidth ?? DEFAULTS.dropWidth,
    windAngle: raw.windAngle ?? DEFAULTS.windAngle,
    windVariation: raw.windVariation ?? DEFAULTS.windVariation,
    enableGlow: raw.enableGlow ?? DEFAULTS.enableGlow,
    glowIntensity: raw.glowIntensity ?? DEFAULTS.glowIntensity,
    opacity: raw.opacity ?? DEFAULTS.opacity,
  }

  const settingsRef = useRef(s)
  settingsRef.current = s

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0 || height === 0) return
    if (!navigator.gpu) { setGpuError('WebGPU not supported'); return }

    let alive = true
    let rafId = 0
    let device: GPUDevice | null = null
    let onVis: (() => void) | null = null
    setGpuError('')

    ;(async () => {
      const adapter = await navigator.gpu.requestAdapter()
      if (!alive) return
      if (!adapter) { setGpuError('No GPU adapter'); return }
      device = await adapter.requestDevice()
      if (!alive) { device.destroy(); return }

      device.lost.then((info) => {
        if (!alive) return
        setGpuError(`GPU device lost: ${info.message}`)
      })

      const dpr = Math.min(devicePixelRatio || 1, 2)
      canvas.width = width * dpr
      canvas.height = height * dpr

      const ctx = canvas.getContext('webgpu')
      if (!ctx) { setGpuError('No WebGPU context'); return }
      const format = navigator.gpu.getPreferredCanvasFormat()
      ctx.configure({ device, format, alphaMode: 'premultiplied' })

      // ─── Pipelines (created once, never change) ─────────────────
      const initPipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module: device.createShaderModule({ code: INIT_WGSL }), entryPoint: 'main' },
      })

      const computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module: device.createShaderModule({ code: COMPUTE_WGSL }), entryPoint: 'main' },
      })

      const renderModule = device.createShaderModule({ code: RENDER_WGSL })
      const renderPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: renderModule, entryPoint: 'vs' },
        fragment: {
          module: renderModule,
          entryPoint: 'fs',
          targets: [{
            format,
            blend: {
              color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
              alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
            },
          }],
        },
        primitive: { topology: 'triangle-list' },
      })

      // ─── Uniform buffers (fixed size, reused every frame) ───────
      const initUniBuf = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
      const compUniBuf = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
      const mainUniBuf = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
      const glowUniBuf = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })

      const initData = new ArrayBuffer(48)
      const initF = new Float32Array(initData)
      const initU = new Uint32Array(initData)
      const compData = new ArrayBuffer(48)
      const compF = new Float32Array(compData)
      const compU = new Uint32Array(compData)
      const mainF = new Float32Array(8)
      const glowF = new Float32Array(8)

      // ─── Dynamic particle buffer ───────────────────────────────
      let capacity = s.rainIntensity
      let particleBuf = device.createBuffer({ size: capacity * PARTICLE_BYTES, usage: BUF_USAGE })

      const gpuInit = (start: number, count: number, seed: number) => {
        const cur = settingsRef.current
        initF[0] = width; initF[1] = height
        initF[2] = cur.dropLength; initF[3] = cur.rainSpeed
        initF[4] = cur.windAngle; initF[5] = cur.windVariation
        initU[6] = seed; initU[7] = start; initU[8] = count
        device!.queue.writeBuffer(initUniBuf, 0, initData)

        const bg = device!.createBindGroup({
          layout: initPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: particleBuf } },
            { binding: 1, resource: { buffer: initUniBuf } },
          ],
        })
        const enc = device!.createCommandEncoder()
        const pass = enc.beginComputePass()
        pass.setPipeline(initPipeline)
        pass.setBindGroup(0, bg)
        pass.dispatchWorkgroups(Math.ceil(count / 256))
        pass.end()
        device!.queue.submit([enc.finish()])
      }

      // Init all particles on GPU
      gpuInit(0, capacity, 42)

      // ─── Bind groups (recreated when buffer grows) ──────────────
      let computeBG: GPUBindGroup
      let mainBG: GPUBindGroup
      let glowBG: GPUBindGroup

      const rebuildBindGroups = () => {
        computeBG = device!.createBindGroup({
          layout: computePipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: particleBuf } },
            { binding: 1, resource: { buffer: compUniBuf } },
          ],
        })
        mainBG = device!.createBindGroup({
          layout: renderPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: particleBuf } },
            { binding: 1, resource: { buffer: mainUniBuf } },
          ],
        })
        glowBG = device!.createBindGroup({
          layout: renderPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: particleBuf } },
            { binding: 1, resource: { buffer: glowUniBuf } },
          ],
        })
      }

      rebuildBindGroups()

      // ─── Color parsing (instance-local) ─────────────────────────
      let hexCache = ''
      let cr = 168 / 255, cg = 200 / 255, cb = 232 / 255
      const parseHex = (hex: string) => {
        if (hex === hexCache) return
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        if (m) { cr = parseInt(m[1], 16) / 255; cg = parseInt(m[2], 16) / 255; cb = parseInt(m[3], 16) / 255 }
        hexCache = hex
      }

      // ─── Animation loop ─────────────────────────────────────────
      let lastTime = performance.now()
      let frame = 0
      let paused = false

      onVis = () => {
        if (document.hidden) { paused = true; cancelAnimationFrame(rafId) }
        else { paused = false; lastTime = performance.now(); rafId = requestAnimationFrame(tick) }
      }

      const tick = (now: number) => {
        if (!alive || paused) return
        const dt = Math.min(now - lastTime, 50) * 0.06
        lastTime = now
        frame++

        const cur = settingsRef.current
        const count = cur.rainIntensity

        // ── Grow buffer if needed ──
        if (count > capacity) {
          const oldBuf = particleBuf
          const oldCap = capacity
          const newCap = Math.max(count, capacity * 2)

          particleBuf = device!.createBuffer({ size: newCap * PARTICLE_BYTES, usage: BUF_USAGE })

          const enc = device!.createCommandEncoder()
          enc.copyBufferToBuffer(oldBuf, 0, particleBuf, 0, oldCap * PARTICLE_BYTES)
          device!.queue.submit([enc.finish()])
          oldBuf.destroy()

          gpuInit(oldCap, newCap - oldCap, frame)
          capacity = newCap
          rebuildBindGroups()
        }

        const workgroups = Math.ceil(count / 256)
        parseHex(cur.rainColor)

        // Compute uniforms
        compF[0] = width; compF[1] = height
        compF[2] = cur.dropLength; compF[3] = cur.rainSpeed
        compF[4] = cur.windAngle; compF[5] = cur.windVariation
        compF[6] = dt; compU[7] = frame; compU[8] = count
        device!.queue.writeBuffer(compUniBuf, 0, compData)

        // Main render uniforms
        mainF[0] = width; mainF[1] = height
        mainF[2] = cur.dropWidth * 0.5; mainF[3] = cur.opacity
        mainF[4] = cr; mainF[5] = cg; mainF[6] = cb
        device!.queue.writeBuffer(mainUniBuf, 0, mainF)

        // Glow render uniforms
        if (cur.enableGlow) {
          glowF[0] = width; glowF[1] = height
          glowF[2] = cur.dropWidth * 1.5; glowF[3] = cur.opacity * cur.glowIntensity
          glowF[4] = cr; glowF[5] = cg; glowF[6] = cb
          device!.queue.writeBuffer(glowUniBuf, 0, glowF)
        }

        // Command buffer: compute → render
        const enc = device!.createCommandEncoder()

        const cp = enc.beginComputePass()
        cp.setPipeline(computePipeline)
        cp.setBindGroup(0, computeBG)
        cp.dispatchWorkgroups(workgroups)
        cp.end()

        const rp = enc.beginRenderPass({
          colorAttachments: [{
            view: ctx!.getCurrentTexture().createView(),
            loadOp: 'clear' as GPULoadOp,
            storeOp: 'store' as GPUStoreOp,
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
          }],
        })
        rp.setPipeline(renderPipeline)
        if (cur.enableGlow) {
          rp.setBindGroup(0, glowBG)
          rp.draw(6, count)
        }
        rp.setBindGroup(0, mainBG)
        rp.draw(6, count)
        rp.end()

        device!.queue.submit([enc.finish()])
        rafId = requestAnimationFrame(tick)
      }

      document.addEventListener('visibilitychange', onVis)
      rafId = requestAnimationFrame(tick)
    })()

    return () => {
      alive = false
      cancelAnimationFrame(rafId)
      if (onVis) document.removeEventListener('visibilitychange', onVis)
      device?.destroy()
    }
  }, [width, height])

  if (gpuError) {
    return <div style={{ color: '#ff6b6b', fontFamily: 'monospace', padding: 16 }}>{gpuError}</div>
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}

export function mount(context: CanvasAddonMountContext): () => void {
  const root = context.layer.root
  root.classList.add('mwa-rain-root')
  root.style.width = '100%'
  root.style.height = '100%'
  root.style.margin = '0'
  root.style.overflow = 'hidden'
  root.style.background = 'transparent'

  const reactRoot = createRoot(root)
  reactRoot.render(<RainEffect layer={context.layer} />)
  return () => {
    reactRoot.unmount()
    root.classList.remove('mwa-rain-root')
    root.replaceChildren()
  }
}
