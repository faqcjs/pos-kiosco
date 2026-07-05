import { useState } from 'react'
import useKioskoStore from '../store/kioskoStore'

export default function Caja() {
  const {
    cajaActiva,
    historialCajas,
    abrirCaja,
    cerrarCaja,
    registrarMovimientoCaja,
  } = useKioskoStore()

  // State local
  const [montoInicialInput, setMontoInicialInput] = useState('')
  const [montoMovimiento, setMontoMovimiento] = useState('')
  const [tipoMovimiento, setTipoMovimiento] = useState('egreso')
  const [motivoMovimiento, setMotivoMovimiento] = useState('')
  const [montoCierre, setMontoCierre] = useState('')
  const [modalCierreAbierto, setModalCierreAbierto] = useState(false)

  // Totales de la sesión activa
  const totalVentasEfectivo = cajaActiva
    ? cajaActiva.movimientos
        .filter((m) => m.tipo === 'venta' && m.motivo.includes('Efectivo'))
        .reduce((acc, m) => acc + m.monto, 0)
    : 0

  const totalOtrosIngresos = cajaActiva
    ? cajaActiva.movimientos
        .filter((m) => m.tipo === 'ingreso')
        .reduce((acc, m) => acc + m.monto, 0)
    : 0

  const totalEgresos = cajaActiva
    ? cajaActiva.movimientos
        .filter((m) => m.tipo === 'egreso')
        .reduce((acc, m) => acc + m.monto, 0)
    : 0

  const saldoTeorico = cajaActiva
    ? cajaActiva.montoApertura + totalVentasEfectivo + totalOtrosIngresos - totalEgresos
    : 0

  const handleAbrir = (e) => {
    e.preventDefault()
    const num = parseFloat(montoInicialInput)
    if (!isNaN(num) && num >= 0) {
      abrirCaja(num)
      setMontoInicialInput('')
    }
  }

  const handleMovimiento = (e) => {
    e.preventDefault()
    const monto = parseFloat(montoMovimiento)
    if (!isNaN(monto) && monto > 0 && motivoMovimiento.trim()) {
      registrarMovimientoCaja(tipoMovimiento, monto, motivoMovimiento.trim())
      setMontoMovimiento('')
      setMotivoMovimiento('')
    }
  }

  const handleCerrar = (e) => {
    e.preventDefault()
    const monto = parseFloat(montoCierre)
    if (!isNaN(monto) && monto >= 0) {
      cerrarCaja(monto)
      setMontoCierre('')
      setModalCierreAbierto(false)
    }
  }

  const formatFecha = (isoString) => {
    return new Date(isoString).toLocaleString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    })
  }

  if (!cajaActiva) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#090b11] flex flex-col md:flex-row gap-6 justify-center items-start pb-20 md:pb-6">
        {/* Formulario Apertura */}
        <div className="bg-[#10141f] border border-slate-800 rounded-3xl p-6 shadow-xl max-w-md w-full text-center space-y-5 mx-auto md:mx-0 self-center">
          <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/25 rounded-full flex items-center justify-center mx-auto text-3xl animate-pulse">
            🔑
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-100">Caja Cerrada</h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Ingresá el efectivo inicial para abrir la caja y empezar a registrar ventas.
            </p>
          </div>
          <form onSubmit={handleAbrir} className="space-y-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-500">
                $
              </span>
              <input
                type="number"
                placeholder="Monto inicial"
                value={montoInicialInput}
                onChange={(e) => setMontoInicialInput(e.target.value)}
                className="w-full text-center text-2xl font-black text-slate-200 bg-[#090b11] border border-slate-800 rounded-2xl py-3 pl-8 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all btn-interactive"
            >
              Abrir Turno de Caja
            </button>
          </form>
        </div>

        {/* Historial de Turnos */}
        {historialCajas.length > 0 && (
          <div className="w-full max-w-md space-y-3 self-stretch flex flex-col justify-start">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">
              Historial de turnos anteriores
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[400px] pr-1 flex-1">
              {historialCajas.map((c) => (
                <div
                  key={c.id}
                  className="bg-[#10141f] border border-slate-800 rounded-2xl p-4 shadow-sm space-y-2 text-xs text-slate-400"
                >
                  <div className="flex justify-between font-bold text-slate-200">
                    <span>Turno finalizado</span>
                    <span>{formatFecha(c.fechaCierre)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-2.5 mt-2">
                    <div>Inicial: <b>${c.montoApertura}</b></div>
                    <div>Físico: <b>${c.montoCierreFisico}</b></div>
                    <div>Teórico: <b>${c.saldoTeorico}</b></div>
                    <div className={c.diferencia >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      Diferencia: {c.diferencia >= 0 ? '+' : ''}${c.diferencia}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#090b11] pb-20 md:pb-6">
      {/* 1. Header con Estado y Botón de Cierre */}
      <div className="flex justify-between items-center bg-[#10141f] border border-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">
              Sesión de Caja Activa
            </span>
          </div>
          <p className="text-xxs text-slate-500">
            Abierta el {formatFecha(cajaActiva.fechaApertura)}
          </p>
        </div>
        <button
          onClick={() => setModalCierreAbierto(true)}
          className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all btn-interactive"
        >
          🔒 Finalizar Turno
        </button>
      </div>

      {/* 2. Grid de Resumen de Saldos (Responsive: 2 col en mobile, 6 col en desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
        <div className="bg-[#10141f] border border-slate-800/80 rounded-2xl p-4">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Efectivo Inicial</span>
          <span className="text-lg font-black text-slate-200 mt-1 block">
            ${cajaActiva.montoApertura.toLocaleString('es-AR')}
          </span>
        </div>
        <div className="bg-[#10141f] border border-slate-800/80 rounded-2xl p-4">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Ventas (Efectivo)</span>
          <span className="text-lg font-black text-emerald-400 mt-1 block">
            +${totalVentasEfectivo.toLocaleString('es-AR')}
          </span>
        </div>
        <div className="bg-[#10141f] border border-slate-800/80 rounded-2xl p-4">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Vueltos Entregados</span>
          <span className="text-lg font-black text-amber-500 mt-1 block">
            ${(cajaActiva.totalVueltos || 0).toLocaleString('es-AR')}
          </span>
        </div>
        <div className="bg-[#10141f] border border-slate-800/80 rounded-2xl p-4">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Ingresos Extra</span>
          <span className="text-lg font-black text-indigo-400 mt-1 block">
            +${totalOtrosIngresos.toLocaleString('es-AR')}
          </span>
        </div>
        <div className="bg-[#10141f] border border-slate-800/80 rounded-2xl p-4">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Egresos / Retiros</span>
          <span className="text-lg font-black text-rose-400 mt-1 block">
            -${totalEgresos.toLocaleString('es-AR')}
          </span>
        </div>
        <div className="col-span-2 md:col-span-1 bg-indigo-500/10 border-2 border-indigo-500/20 rounded-2xl p-4 flex flex-col justify-center">
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block text-center">Efectivo Teórico</span>
          <span className="text-xl font-black text-indigo-300 mt-1 block text-center">
            ${saldoTeorico.toLocaleString('es-AR')}
          </span>
        </div>
      </div>

      {/* 3. Panel de Movimientos (Lado a lado en Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registrar Movimiento */}
        <section className="bg-[#10141f] border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-200 text-sm uppercase tracking-wider">Nuevo Movimiento de Caja</h3>
          
          <form onSubmit={handleMovimiento} className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTipoMovimiento('egreso')}
                className={`flex-1 font-bold py-2.5 rounded-xl text-xs border-2 transition-all btn-interactive ${
                  tipoMovimiento === 'egreso'
                    ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                    : 'bg-[#151926] border-slate-800 text-slate-500'
                }`}
              >
                💸 Retiro (Egreso)
              </button>
              <button
                type="button"
                onClick={() => setTipoMovimiento('ingreso')}
                className={`flex-1 font-bold py-2.5 rounded-xl text-xs border-2 transition-all btn-interactive ${
                  tipoMovimiento === 'ingreso'
                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                    : 'bg-[#151926] border-slate-800 text-slate-500'
                }`}
              >
                📥 Depósito (Ingreso)
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                  $
                </span>
                <input
                  type="number"
                  placeholder="Monto"
                  value={montoMovimiento}
                  onChange={(e) => setMontoMovimiento(e.target.value)}
                  className="w-full bg-[#090b11] border border-slate-800 rounded-xl py-2.5 pl-6 pr-2 text-xs font-bold text-slate-250 outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Motivo (ej. Compra facturas, Retiro cambio)"
                  value={motivoMovimiento}
                  onChange={(e) => setMotivoMovimiento(e.target.value)}
                  className="w-full bg-[#090b11] border border-slate-800 rounded-xl py-2.5 px-3 text-xs outline-none focus:border-indigo-500 text-slate-250"
                  required
                />
              </div>
            </div>

            {/* Quick tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Ingreso cambio', 'Retiro cambio', 'Artículos limpieza', 'Retiro para depósito'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setMotivoMovimiento(tag)
                    if (tag.toLowerCase().includes('ingreso')) setTipoMovimiento('ingreso')
                    if (tag.toLowerCase().includes('retiro') || tag.toLowerCase().includes('gasto')) setTipoMovimiento('egreso')
                  }}
                  className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-colors btn-interactive ${
                tipoMovimiento === 'egreso'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/20'
              }`}
            >
              Registrar Movimiento
            </button>
          </form>
        </section>

        {/* Listado de movimientos de hoy */}
        <section className="bg-[#10141f] border border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-start">
          <h3 className="font-extrabold text-slate-200 text-sm uppercase tracking-wider mb-4">Registro del día</h3>
          <div className="space-y-2.5 overflow-y-auto max-h-[300px] flex-grow pr-1">
            {cajaActiva.movimientos.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
                <span className="text-3xl">📝</span>
                <p className="text-xs font-semibold mt-2">No hay movimientos registrados hoy.</p>
              </div>
            ) : (
              cajaActiva.movimientos.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 text-xs animate-fade-in"
                >
                  <div>
                    <p className="font-bold text-slate-350 leading-tight">
                      {m.motivo}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      {formatFecha(m.timestamp)}
                    </span>
                  </div>
                  <span
                    className={`font-black shrink-0 ml-3 text-sm ${
                      m.tipo === 'egreso'
                        ? 'text-rose-400'
                        : m.tipo === 'ingreso'
                        ? 'text-indigo-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {m.tipo === 'egreso' ? '-' : '+'}${m.monto}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Modal para Cierre de Caja */}
      {modalCierreAbierto && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => setModalCierreAbierto(false)}
          />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#10141f] border border-slate-800 rounded-t-3xl z-50 px-5 pb-8 pt-5 animate-slide-up shadow-2xl">
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-5" />
            <h3 className="text-center text-base font-bold text-slate-400 uppercase tracking-widest mb-1">
              Finalizar Turno
            </h3>
            <p className="text-[11px] text-slate-500 text-center mb-4 max-w-xs mx-auto">
              Contá el efectivo físico de la caja registradora e ingresalo acá.
            </p>

            <form onSubmit={handleCerrar} className="space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-500">
                  $
                </span>
                <input
                  type="number"
                  placeholder="Efectivo en caja física"
                  value={montoCierre}
                  onChange={(e) => setMontoCierre(e.target.value)}
                  className="w-full text-center text-3xl font-black text-slate-200 bg-[#090b11] border border-slate-800 rounded-2xl py-3 pl-8 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                  required
                />
              </div>

              <div className="bg-[#151926] border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Efectivo esperado (teórico):</span>
                  <span className="font-extrabold text-slate-200">${saldoTeorico}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCierreAbierto(false)}
                  className="py-3.5 bg-slate-800 active:bg-slate-750 text-slate-300 font-bold rounded-2xl text-center btn-interactive"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-2xl text-center shadow-lg shadow-rose-950/20 btn-interactive"
                >
                  Cerrar Caja
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
