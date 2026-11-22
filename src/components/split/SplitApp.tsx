'use client'

// Vortex Split - Une dos o mas imagenes (frente y dorso de documentos)
// en vertical u horizontal, con control de compresion y salida PNG/JPG.
// Canvas + FileReader, 100% local en el navegador.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Combine,
  Upload,
  ArrowUp,
  ArrowDown,
  Trash2,
  Rows3,
  Columns3,
  Download,
  X,
  Images,
  Loader2,
} from 'lucide-react'
import {
  SplitImage,
  MergeOptions,
  MergeResult,
  addFiles,
  computeCanvasSize,
  mergeImagesAsync,
  canvasToBlob,
  fmtBytes,
  outFileName,
  downloadBlob,
} from '@/lib/split'

const SUPPORT_EMAIL = 'vortexmusic.soporte.app@gmail.com'

function VortexLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="10" fill="#161616" />
      <circle cx="24" cy="24" r="17" fill="none" stroke="#f59e0b" strokeWidth="3.5" />
      <path d="M24 10a14 14 0 1 1-9.9 4.1" fill="none" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M24 17a7 7 0 1 0 7 7" fill="none" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="3" fill="#fbbf24" />
    </svg>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-[#2b2b31] bg-[#141416] px-6 py-4">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-1 text-center">
        <p className="text-[11px] text-[#9b9ba4]">
          Vórtex Split · Derechos Reservados © 2026 Vortex Company ·{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#fbbf24] hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="text-[11px] text-[#9b9ba4]">Gratis · Sin anuncios · 100% local en tu navegador</p>
      </div>
    </footer>
  )
}

const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2b2b31] bg-[#1e1e22] px-3 py-2 text-xs font-medium text-[#ececf1] hover:bg-[#26262b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

export default function SplitApp() {
  const [images, setImages] = useState<SplitImage[]>([])
  const [direction, setDirection] = useState<'vertical' | 'horizontal'>('vertical')
  const [gap, setGap] = useState(0)
  const [fit, setFit] = useState<'max' | 'min'>('max')
  const [format, setFormat] = useState<'png' | 'jpeg'>('jpeg')
  const [quality, setQuality] = useState(90)
  const [result, setResult] = useState<MergeResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // revoca el blob-url anterior al salir
  useEffect(
    () => () => {
      if (result) URL.revokeObjectURL(URL.createObjectURL(new Blob()))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const onFiles = useCallback(
    async (files: FileList | null) => {
      setError(null)
      setBusy(true)
      try {
        const added = await addFiles(files)
        if (added.length) {
          setImages((prev) => [...prev, ...added])
          setResult(null)
        } else {
          setError('No se encontraron imágenes válidas.')
        }
      } finally {
        setBusy(false)
      }
    },
    []
  )

  const move = (id: string, dir: -1 | 1) => {
    setImages((prev) => {
      const i = prev.findIndex((p) => p.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setResult(null)
  }

  const remove = (id: string) => {
    setImages((prev) => prev.filter((p) => p.id !== id))
    setResult(null)
  }

  const opts: MergeOptions = { direction, gap, bg: '#ffffff', fit, quality: quality / 100, format }
  const size = computeCanvasSize(images, { direction, gap, bg: '#ffffff', fit, quality: 1, format })
  const tooBig = size.w * size.h > 40_000_000 || size.w > 16384 || size.h > 16384

  const merge = async () => {
    if (images.length < 2 || busy) return
    if (tooBig) {
      setError('El resultado sería demasiado grande. Reduce el número de imágenes o usa "Ajustar al mínimo".')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const canvas = await mergeImagesAsync(images, opts)
      const blob = await canvasToBlob(canvas, format, quality / 100)
      const res: MergeResult = {
        dataUrl: canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', quality / 100),
        width: canvas.width,
        height: canvas.height,
        bytes: blob.size,
      }
      setResult(res)
    } catch {
      setError('No se pudo combinar. Prueba con menos imágenes o menor calidad.')
    } finally {
      setBusy(false)
    }
  }

  const download = async () => {
    if (!result) return
    const canvas = await mergeImagesAsync(images, opts)
    const blob = await canvasToBlob(canvas, format, quality / 100)
    downloadBlob(blob, outFileName(format))
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0f0f10] text-[#ececf1]">
      <header className="border-b border-[#2b2b31] bg-[#141416] px-4 sm:px-6 h-12 flex items-center gap-2.5 shrink-0">
        <VortexLogo className="w-6 h-6" />
        <span className="text-sm font-semibold tracking-wide">
          <span className="text-[#fbbf24]">Vórtex</span> Split
        </span>
        <span className="text-[11px] text-[#9b9ba4] hidden sm:inline">· Une imágenes en una sola</span>
        <span className="ml-auto text-[11px] text-[#9b9ba4] hidden md:inline">Gratis · Sin anuncios · 100% local</span>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
        {/* zona de carga */}
        <section
          className={
            'rounded-xl border-2 border-dashed p-8 flex flex-col items-center gap-3 text-center transition-colors ' +
            (dragOver ? 'border-[#f59e0b] bg-[#f59e0b]/10' : 'border-[#2b2b31] bg-[#17171a]')
          }
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            onFiles(e.dataTransfer.files)
          }}
        >
          <Images className="w-8 h-8 text-[#fbbf24] opacity-70" aria-hidden />
          <p className="text-sm text-[#9b9ba4]">
            Arrastra aquí dos o más imágenes (frente y dorso de un documento, capturas, fotos…)
          </p>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#f59e0b] px-4 py-2 text-xs font-semibold text-[#27190a] hover:bg-[#fbbf24] transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-4 h-4" aria-hidden /> Elegir imágenes
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              onFiles(e.target.files)
              e.currentTarget.value = ''
            }}
          />
          {busy && (
            <p className="text-xs text-[#fbbf24] flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> Leyendo archivos…
            </p>
          )}
        </section>

        {error && <p className="text-xs text-red-400">{error}</p>}

        {/* lista de imagenes */}
        {images.length > 0 && (
          <section className="rounded-xl border border-[#2b2b31] bg-[#17171a] p-4 flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-[#9b9ba4] uppercase tracking-wider">
              Imágenes ({images.length}) · el orden de la lista es el orden de la unión
            </h2>
            <div className="flex flex-col gap-2">
              {images.map((im, i) => (
                <div key={im.id} className="flex items-center gap-3 rounded-lg bg-[#1e1e22] p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.dataUrl} alt={im.name} className="h-14 w-14 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{im.name}</p>
                    <p className="text-[10px] text-[#9b9ba4]">
                      {i + 1} · {im.width}×{im.height}
                    </p>
                  </div>
                  <button className="p-1.5 text-[#9b9ba4] hover:text-white disabled:opacity-30" disabled={i === 0} onClick={() => move(im.id, -1)} title="Subir">
                    <ArrowUp className="w-4 h-4" aria-hidden />
                  </button>
                  <button className="p-1.5 text-[#9b9ba4] hover:text-white disabled:opacity-30" disabled={i === images.length - 1} onClick={() => move(im.id, 1)} title="Bajar">
                    <ArrowDown className="w-4 h-4" aria-hidden />
                  </button>
                  <button className="p-1.5 text-[#9b9ba4] hover:text-red-400" onClick={() => remove(im.id)} title="Quitar">
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ajustes */}
        {images.length >= 2 && (
          <section className="rounded-xl border border-[#2b2b31] bg-[#17171a] p-4 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                className={direction === 'vertical' ? 'inline-flex items-center gap-1.5 rounded-lg bg-[#f59e0b] px-3.5 py-2 text-xs font-semibold text-[#27190a]' : btn}
                onClick={() => {
                  setDirection('vertical')
                  setResult(null)
                }}
              >
                <Rows3 className="w-4 h-4" aria-hidden /> Vertical (apilar)
              </button>
              <button
                className={direction === 'horizontal' ? 'inline-flex items-center gap-1.5 rounded-lg bg-[#f59e0b] px-3.5 py-2 text-xs font-semibold text-[#27190a]' : btn}
                onClick={() => {
                  setDirection('horizontal')
                  setResult(null)
                }}
              >
                <Columns3 className="w-4 h-4" aria-hidden /> Horizontal (lado a lado)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#9b9ba4]">
              <label className="flex flex-col gap-1">
                Separación entre imágenes: {gap}px
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={2}
                  value={gap}
                  className="accent-[#f59e0b]"
                  onChange={(e) => {
                    setGap(Number(e.target.value))
                    setResult(null)
                  }}
                />
              </label>
              <div className="flex flex-col gap-1">
                Ajuste de tamaño:
                <div className="flex gap-2">
                  <button className={fit === 'max' ? 'rounded-lg bg-[#f59e0b] px-2.5 py-1.5 font-semibold text-[#27190a]' : btn} onClick={() => { setFit('max'); setResult(null) }}>
                    Al máximo
                  </button>
                  <button className={fit === 'min' ? 'rounded-lg bg-[#f59e0b] px-2.5 py-1.5 font-semibold text-[#27190a]' : btn} onClick={() => { setFit('min'); setResult(null) }}>
                    Al mínimo
                  </button>
                </div>
              </div>
              <label className="flex flex-col gap-1">
                Formato de salida:
                <div className="flex gap-2">
                  <button className={format === 'jpeg' ? 'rounded-lg bg-[#f59e0b] px-2.5 py-1.5 font-semibold text-[#27190a]' : btn} onClick={() => { setFormat('jpeg'); setResult(null) }}>
                    JPG (comprime)
                  </button>
                  <button className={format === 'png' ? 'rounded-lg bg-[#f59e0b] px-2.5 py-1.5 font-semibold text-[#27190a]' : btn} onClick={() => { setFormat('png'); setResult(null) }}>
                    PNG (sin pérdidas)
                  </button>
                </div>
              </label>
              <label className={'flex flex-col gap-1 ' + (format === 'png' ? 'opacity-40 pointer-events-none' : '')}>
                Calidad de compresión: {quality}%
                <input
                  type="range"
                  min={30}
                  max={100}
                  step={5}
                  value={quality}
                  className="accent-[#f59e0b]"
                  onChange={(e) => {
                    setQuality(Number(e.target.value))
                    setResult(null)
                  }}
                />
                <span className="text-[10px]">
                  Menos calidad = archivo más ligero. 80–90% suele ser ideal para documentos.
                </span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#f59e0b] px-4 py-2.5 text-sm font-semibold text-[#27190a] hover:bg-[#fbbf24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                onClick={merge}
                disabled={busy || tooBig}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Combine className="w-4 h-4" aria-hidden />}
                {busy ? 'Combinando…' : `Combinar ${images.length} imágenes`}
              </button>
              <span className="text-[11px] text-[#9b9ba4]">
                Resultado aproximado: {size.w}×{size.h}px
                {tooBig && ' · demasiado grande: usa «Al mínimo» o menos imágenes'}
              </span>
            </div>
          </section>
        )}

        {/* resultado */}
        {result && (
          <section className="rounded-xl border border-[#2b2b31] bg-[#17171a] p-4 flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-[#9b9ba4] uppercase tracking-wider">
              Resultado · {result.width}×{result.height}px · {fmtBytes(result.bytes)} · {format === 'png' ? 'PNG' : 'JPG ' + quality + '%'}
            </h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.dataUrl} alt="Imagen combinada" className="w-full max-h-[440px] object-contain rounded-lg border border-[#2b2b31] bg-white" />
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#f59e0b] px-3.5 py-2 text-xs font-semibold text-[#27190a] hover:bg-[#fbbf24] transition-colors"
                onClick={download}
              >
                <Download className="w-4 h-4" aria-hidden /> Descargar {format === 'png' ? 'PNG' : 'JPG'}
              </button>
              <button className={btn} onClick={() => setResult(null)}>
                <X className="w-4 h-4" aria-hidden /> Descartar
              </button>
            </div>
            <p className="text-[11px] text-[#9b9ba4]">
              Todo se procesa en tu navegador: las imágenes no se suben a ningún servidor.
            </p>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
