'use client'

import { Camera, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function ScannerModal({
  open,
  onClose,
  onDetect,
}: {
  open: boolean
  onClose: () => void
  onDetect: (code: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    let rafId = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let detector: any = null

    async function start() {
      setError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const BD = (window as any).BarcodeDetector
        if (BD) {
          detector = new BD({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
          })
          const scan = async () => {
            if (cancelled || !videoRef.current) return
            try {
              const codes = await detector.detect(videoRef.current)
              if (codes && codes.length > 0 && codes[0].rawValue) {
                onDetect(codes[0].rawValue)
                return
              }
            } catch {
              // keep scanning
            }
            rafId = requestAnimationFrame(scan)
          }
          rafId = requestAnimationFrame(scan)
        } else {
          setError('Detección automática no disponible en este navegador. Ingresá el código manualmente.')
        }
      } catch {
        setError('No se pudo acceder a la cámara. Verificá los permisos o ingresá el código manualmente.')
      }
    }

    start()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [open, onDetect])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2 font-semibold">
          <Camera className="size-5" />
          Escanear código
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar escáner"
          className="rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 size-full object-cover opacity-90"
        />
        {/* reticle */}
        <div className="relative z-10 h-48 w-72 max-w-[80vw] overflow-hidden rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
          <span className="absolute left-0 top-0 size-6 rounded-tl-lg border-l-4 border-t-4 border-primary" />
          <span className="absolute right-0 top-0 size-6 rounded-tr-lg border-r-4 border-t-4 border-primary" />
          <span className="absolute bottom-0 left-0 size-6 rounded-bl-lg border-b-4 border-l-4 border-primary" />
          <span className="absolute bottom-0 right-0 size-6 rounded-br-lg border-b-4 border-r-4 border-primary" />
          <div className="animate-scanline absolute inset-x-0 h-0.5 bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.8)]" />
        </div>
      </div>

      <div className="space-y-3 px-4 pb-8 pt-4">
        {error && <p className="text-center text-sm text-amber-300">{error}</p>}
        <p className="text-center text-sm text-white/70">
          Apuntá al código de barras dentro del recuadro
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (manual.trim()) {
              onDetect(manual.trim())
              setManual('')
            }
          }}
          className="flex gap-2"
        >
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            inputMode="numeric"
            placeholder="Ingresar código manualmente"
            className="h-11 flex-1 rounded-xl border border-white/20 bg-white/10 px-3.5 text-base text-white outline-none placeholder:text-white/50 focus-visible:border-white/50"
          />
          <button
            type="submit"
            className="h-11 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
          >
            Buscar
          </button>
        </form>
      </div>
    </div>
  )
}
