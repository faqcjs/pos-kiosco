import useKioskoStore from '../store/kioskoStore'

export default function NotificacionModal() {
  const { notificacion, cerrarNotificacion } = useKioskoStore()

  if (!notificacion) return null

  const { tipo, titulo, mensaje, alAceptar, alCancelar } = notificacion

  const handleAceptar = () => {
    if (alAceptar) alAceptar()
    cerrarNotificacion()
  }

  const handleCancelar = () => {
    if (alCancelar) alCancelar()
    cerrarNotificacion()
  }

  // Estilos según el tipo
  const getIcon = () => {
    switch (tipo) {
      case 'success':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'error':
        return '❌'
      default:
        return 'ℹ️'
    }
  }

  const getTitleColor = () => {
    switch (tipo) {
      case 'success':
        return 'text-emerald-600 dark:text-emerald-400'
      case 'warning':
        return 'text-amber-600 dark:text-amber-400'
      case 'error':
        return 'text-rose-600 dark:text-rose-400'
      default:
        return 'text-indigo-600 dark:text-indigo-400'
    }
  }

  const getBorderColor = () => {
    switch (tipo) {
      case 'success':
        return 'border-emerald-200 dark:border-emerald-500/30'
      case 'warning':
        return 'border-amber-200 dark:border-amber-500/30'
      case 'error':
        return 'border-rose-200 dark:border-rose-500/30'
      default:
        return 'border-indigo-200 dark:border-indigo-500/30'
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/75 z-999 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div
          className={`bg-white dark:bg-[#10141f] border ${getBorderColor()} rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-slide-up`}
        >
          {/* Icono */}
          <div className="text-4xl">{getIcon()}</div>

          {/* Título */}
          <h4 className={`text-base font-black uppercase tracking-wider ${getTitleColor()}`}>
            {titulo}
          </h4>

          {/* Mensaje */}
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {mensaje}
          </p>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            {alCancelar && (
              <button
                type="button"
                onClick={handleCancelar}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-200/80 dark:bg-slate-800 dark:active:bg-slate-750 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-2xl transition-all btn-interactive"
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={handleAceptar}
              className={`flex-1 py-3 text-xs font-extrabold text-white rounded-2xl shadow-lg transition-all btn-interactive ${
                tipo === 'error' || tipo === 'warning'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
