// Vórtex Split - union de imagenes con Canvas + FileReader.
// Une dos o mas imagenes en vertical o horizontal, con control de calidad
// y salida PNG/JPG. 100% local: los archivos se leen y procesan en el navegador.

export interface SplitImage {
  id: string
  name: string
  dataUrl: string
  width: number
  height: number
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('imagen no valida'))
    img.src = src
  })
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('no se pudo leer'))
    r.readAsDataURL(file)
  })
}

export async function addFiles(files: FileList | null, maxPx = 3000): Promise<SplitImage[]> {
  if (!files) return []
  const out: SplitImage[] = []
  const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'))
  for (const f of imgs) {
    try {
      const dataUrl = await readFileAsDataUrl(f)
      const el = await loadImageEl(dataUrl)
      // limitar el lado mayor para evitar canvas gigantes
      const scale = Math.min(1, maxPx / Math.max(el.width, el.height))
      if (scale < 1) {
        const c = document.createElement('canvas')
        c.width = Math.round(el.width * scale)
        c.height = Math.round(el.height * scale)
        c.getContext('2d')!.drawImage(el, 0, 0, c.width, c.height)
        out.push({ id: newId(), name: f.name, dataUrl: c.toDataURL('image/jpeg', 0.95), width: c.width, height: c.height })
      } else {
        out.push({ id: newId(), name: f.name, dataUrl, width: el.width, height: el.height })
      }
    } catch {
      // ignora archivos invalidos
    }
  }
  return out
}

export type Direction = 'vertical' | 'horizontal'

export interface MergeOptions {
  direction: Direction
  gap: number // px de separacion
  bg: string // color de fondo del hueco
  fit: 'max' | 'min' // ajustar al ancho/altura maximo o minimo del grupo
  quality: number // 0.1 .. 1 (solo JPEG)
  format: 'png' | 'jpeg'
}

export interface MergeResult {
  dataUrl: string
  width: number
  height: number
  bytes: number
}

// Tamano final estimado del lienzo segun direccion y modo de ajuste.
export function computeCanvasSize(images: SplitImage[], opts: MergeOptions): { w: number; h: number } {
  if (!images.length) return { w: 0, h: 0 }
  const n = images.length
  const gaps = opts.gap * (n - 1)
  if (opts.direction === 'vertical') {
    const w = opts.fit === 'max' ? Math.max(...images.map((i) => i.width)) : Math.min(...images.map((i) => i.width))
    const scaled = images.map((i) => Math.round((i.height * w) / i.width))
    const h = scaled.reduce((a, b) => a + b, 0) + gaps
    return { w, h }
  }
  const h = opts.fit === 'max' ? Math.max(...images.map((i) => i.height)) : Math.min(...images.map((i) => i.height))
  const scaled = images.map((i) => Math.round((i.width * h) / i.height))
  const w = scaled.reduce((a, b) => a + b, 0) + gaps
  return { w, h }
}

// Une las imagenes en un canvas segun las opciones (pre-carga los elementos).
export async function mergeImagesAsync(images: SplitImage[], opts: MergeOptions): Promise<HTMLCanvasElement> {
  const els = await Promise.all(images.map((i) => loadImageEl(i.dataUrl)))
  const { w, h } = computeCanvasSize(images, opts)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = opts.bg
  ctx.fillRect(0, 0, w, h)

  let offset = 0
  for (let i = 0; i < els.length; i++) {
    const im = images[i]
    const el = els[i]
    const ratio = opts.direction === 'vertical' ? w / im.width : h / im.height
    const dw = Math.round(im.width * ratio)
    const dh = Math.round(im.height * ratio)
    if (opts.direction === 'vertical') {
      ctx.drawImage(el, 0, 0, im.width, im.height, (w - dw) / 2, offset, dw, dh)
      offset += dh + opts.gap
    } else {
      ctx.drawImage(el, 0, 0, im.width, im.height, offset, (h - dh) / 2, dw, dh)
      offset += dw + opts.gap
    }
  }
  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement, format: 'png' | 'jpeg', quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('fallo al codificar'))),
      format === 'png' ? 'image/png' : 'image/jpeg',
      quality
    )
  })
}

export function fmtBytes(n: number): string {
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / (1024 * 1024)).toFixed(2) + ' MB'
}

export function outFileName(format: 'png' | 'jpeg'): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `vortex-split-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.${format === 'png' ? 'png' : 'jpg'}`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 8000)
}
