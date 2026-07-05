import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function ScannerModal({ isOpen, onClose, onScanSuccess }) {
  const scannerRef = useRef(null)
  const qrCodeInstanceRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      // Retrasar la inicialización un momento para asegurar que el div esté en el DOM
      const timer = setTimeout(() => {
        const html5QrCode = new Html5Qrcode('reader')
        qrCodeInstanceRef.current = html5QrCode

        const config = { fps: 10, qrbox: { width: 250, height: 250 } }

        html5QrCode
          .start(
            { facingMode: 'environment' }, // Cámara trasera
            config,
            (decodedText) => {
              // Éxito de lectura
              onScanSuccess(decodedText)
              // Detener cámara al leer con éxito
              detenerScanner()
            },
            (errorMessage) => {
              // Error de escaneo (silencioso, ocurre continuamente mientras busca)
            }
          )
          .catch((err) => {
            console.error('Error al iniciar cámara:', err)
          })
      }, 300)

      return () => {
        clearTimeout(timer)
        detenerScanner()
      }
    }
  }, [isOpen])

  const detenerScanner = () => {
    if (qrCodeInstanceRef.current && qrCodeInstanceRef.current.isScanning) {
      qrCodeInstanceRef.current
        .stop()
        .then(() => {
          console.log('Cámara detenida con éxito.')
        })
        .catch((err) => {
          console.error('Error al detener cámara:', err)
        })
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-between">
        <header className="flex justify-between items-center px-4 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white shrink-0 shadow-sm">
          <span className="font-bold text-base md:text-lg">📷 Escanear Código de Barra</span>
          <button
            onClick={() => {
              detenerScanner()
              onClose()
            }}
            className="text-slate-600 dark:text-slate-400 active:text-slate-900 dark:active:text-white px-3.5 py-1.5 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
          >
            Cerrar
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm aspect-square bg-slate-900 dark:bg-slate-950 rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-2xl flex items-center justify-center">
            {/* Contenedor del lector html5-qrcode */}
            <div id="reader" className="w-full h-full object-cover"></div>

            {/* Guía visual del scanner */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[230px] h-[230px] border-4 border-dashed border-emerald-400 rounded-xl animate-pulse flex items-center justify-center">
                <div className="w-full h-0.5 bg-red-500 animate-scanner-line shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
              </div>
            </div>
          </div>
        </div>

        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-6 text-center text-slate-500 dark:text-slate-400 text-sm shrink-0">
          Apuntá con la cámara trasera al código de barra del producto
        </footer>
      </div>
    </>
  )
}
