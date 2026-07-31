import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent default Chrome prompt
      e.preventDefault()
      // Save event so it can be triggered later
      setDeferredPrompt(e)
      // Check if user dismissed it recently
      const dismissed = localStorage.getItem('pwa_prompt_dismissed')
      if (!dismissed) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      console.log('User installed the PWA')
    }
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa_prompt_dismissed', 'true')
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-3.5 text-white shadow-2xl backdrop-blur-md dark:bg-slate-950/95">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-bold shadow-sm">
            📱
          </div>
          <div>
            <h4 className="text-sm font-bold leading-tight">Instalar eKiosco</h4>
            <p className="text-xs text-slate-400">Usalo sin navegador y sin conexión</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            onClick={handleInstall}
            size="sm"
            className="h-8 gap-1 rounded-xl bg-emerald-500 text-xs font-bold text-slate-950 hover:bg-emerald-400"
          >
            <Download className="h-3.5 w-3.5" />
            Instalar
          </Button>
          <button
            onClick={handleDismiss}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
