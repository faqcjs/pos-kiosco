import useCaja from '../hooks/useCaja'

export default function Caja() {
  const {
    cajaActiva,
    historialCajas,
    montoInicialInput,
    setMontoInicialInput,
    cajeroAperturaInput,
    setCajeroAperturaInput,
    montoCierre,
    setMontoCierre,
    cajeroCierreInput,
    setCajeroCierreInput,
    modalCierreAbierto,
    setModalCierreAbierto,
    montoMovimiento,
    setMontoMovimiento,
    tipoMovimiento,
    setTipoMovimiento,
    motivoMovimiento,
    setMotivoMovimiento,
    totalVentasEfectivo,
    totalVentasQR,
    totalCobrosClientes,
    totalIngresos,
    totalEgresos,
    saldoTeorico,
    handleAbrir,
    handleMovimiento,
    handleCerrar,
    formatFecha,
  } = useCaja()

  if (!cajaActiva) {
    return (
      <div className="w-full h-full overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-[#090b11] flex flex-col md:flex-row gap-6 justify-center items-start pb-6">
        {/* Formulario Apertura */}
        <div className="bg-white border border-slate-200 dark:bg-[#10141f] dark:border-slate-800 rounded-3xl p-6 shadow-xl max-w-md w-full text-center space-y-5 mx-auto md:mx-0 self-center">
          <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/25 rounded-full flex items-center justify-center mx-auto text-3xl animate-pulse">
            🔑
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Caja Cerrada</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Ingresá el efectivo inicial para abrir la caja y empezar a registrar ventas.
            </p>
          </div>
          <form onSubmit={handleAbrir} className="space-y-4">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nombre del cajero"
                value={cajeroAperturaInput}
                onChange={(e) => setCajeroAperturaInput(e.target.value)}
                className="w-full text-center text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:bg-white focus:border-indigo-500 dark:text-slate-200 dark:bg-[#090b11] dark:border-slate-800"
                required
              />
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400 dark:text-slate-500">
                  $
                </span>
                <input
                  type="number"
                  placeholder="Monto inicial"
                  value={montoInicialInput}
                  onChange={(e) => setMontoInicialInput(e.target.value)}
                  className="w-full text-center text-2xl font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-8 outline-none focus:bg-white focus:border-indigo-500 dark:text-slate-200 dark:bg-[#090b11] dark:border-slate-800"
                  required
                />
              </div>
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
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
              Historial de turnos anteriores
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[400px] pr-1 flex-1">
              {historialCajas.map((c) => (
                <div
                  key={c.id}
                  className="bg-white border border-slate-200 dark:bg-[#10141f] dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2 text-xs text-slate-500 dark:text-slate-400"
                >
                  <div className="flex justify-between font-bold text-slate-700 dark:text-slate-200">
                    <span>Turno finalizado</span>
                    <span>{formatFecha(c.fechaCierre)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Cajero: <b>{c.cajeroApertura || 'Desconocido'}</b> (Apertura) | <b>{c.cajeroCierre || 'Desconocido'}</b> (Cierre)
                  </div>
                  {(() => {
                    const cIngresos = (c.movimientos || [])
                      .filter((m) => m.tipo === 'ingreso')
                      .reduce((acc, m) => acc + m.monto, 0)
                    const cEgresos = (c.movimientos || [])
                      .filter((m) => m.tipo === 'egreso')
                      .reduce((acc, m) => acc + m.monto, 0)
                    const cVentas = (c.movimientos || [])
                      .filter((m) => m.tipo === 'venta' && m.motivo.includes('Efectivo'))
                      .reduce((acc, m) => acc + m.monto, 0)
                    
                    return (
                      <>
                        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2.5 mt-2">
                          <div>Inicial: <b>${c.montoApertura.toLocaleString('es-AR')}</b></div>
                          <div>Físico: <b>${c.montoCierreFisico.toLocaleString('es-AR')}</b></div>
                          <div>Ventas Ef: <b>+${cVentas.toLocaleString('es-AR')}</b></div>
                          <div>Agregado: <b>+${cIngresos.toLocaleString('es-AR')}</b></div>
                          <div>Retirado: <b>-${cEgresos.toLocaleString('es-AR')}</b></div>
                          <div>Teórico: <b>${c.saldoTeorico.toLocaleString('es-AR')}</b></div>
                        </div>
                        <div className={`text-right font-black border-t border-slate-100 dark:border-slate-800/80 pt-1.5 mt-1 text-[11px] ${
                          c.diferencia >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-600 dark:text-rose-455'
                        }`}>
                          Diferencia: {c.diferencia >= 0 ? '+' : ''}${c.diferencia.toLocaleString('es-AR')}
                        </div>
                      </>
                    )
                  })()}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50 dark:bg-[#090b11] pb-6">
      {/* 1. Header con Estado y Botón de Cierre */}
      <div className="flex justify-between items-center bg-white border border-slate-200 dark:bg-[#10141f] dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              Sesión de Caja Activa
            </span>
          </div>
          <p className="text-xxs text-slate-400 dark:text-slate-500">
            Abierta el {formatFecha(cajaActiva.fechaApertura)} por <b>{cajaActiva.cajeroApertura || 'Desconocido'}</b>
          </p>
        </div>
        <button
          onClick={() => setModalCierreAbierto(true)}
          className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all btn-interactive"
        >
          🔒 Finalizar Turno
        </button>
      </div>

      {/* 2. Grid de Resumen de Saldos (Responsive: 2 col en mobile, 8 col en desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-8 gap-3.5">
        <div className="bg-white border border-slate-205 dark:bg-[#10141f] dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Efectivo Inicial</span>
          <span className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1 block">
            ${cajaActiva.montoApertura.toLocaleString('es-AR')}
          </span>
        </div>
        <div className="bg-white border border-slate-205 dark:bg-[#10141f] dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Ventas (Efectivo)</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-450 mt-1 block">
            +${totalVentasEfectivo.toLocaleString('es-AR')}
          </span>
        </div>
        <div className="bg-white border border-slate-205 dark:bg-[#10141f] dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Ventas (QR / Transf.)</span>
          <span className="text-lg font-black text-blue-600 dark:text-blue-450 mt-1 block">
            +${totalVentasQR.toLocaleString('es-AR')}
          </span>
        </div>
        <div className="bg-white border border-slate-205 dark:bg-[#10141f] dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Cobros Clientes</span>
          <span className="text-lg font-black text-emerald-650 dark:text-emerald-500 mt-1 block">
            +${totalCobrosClientes.toLocaleString('es-AR')}
          </span>
        </div>
        <div className="bg-white border border-slate-205 dark:bg-[#10141f] dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Efectivo Agregado</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-455 mt-1 block">
            +${totalIngresos.toLocaleString('es-AR')}
          </span>
        </div>
        <div className="bg-white border border-slate-205 dark:bg-[#10141f] dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Vueltos Entregados</span>
          <span className="text-lg font-black text-amber-605 dark:text-amber-500 mt-1 block">
            ${(cajaActiva.totalVueltos || 0).toLocaleString('es-AR')}
          </span>
        </div>
        <div className="bg-white border border-slate-205 dark:bg-[#10141f] dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Pago Proveedores</span>
          <span className="text-lg font-black text-rose-600 dark:text-rose-455 mt-1 block">
            -${totalEgresos.toLocaleString('es-AR')}
          </span>
        </div>
        <div className="col-span-2 md:col-span-1 bg-indigo-50/60 dark:bg-indigo-500/10 border-2 border-indigo-200 dark:border-indigo-500/20 rounded-2xl p-4 flex flex-col justify-center shadow-sm">
          <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block text-center">Efectivo Teórico</span>
          <span className="text-xl font-black text-indigo-700 dark:text-indigo-300 mt-1 block text-center">
            ${saldoTeorico.toLocaleString('es-AR')}
          </span>
        </div>
      </div>

      {/* 3. Panel de Movimientos (Lado a lado en Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formulario de Ajuste de Efectivo */}
        <section className="bg-white border border-slate-200 dark:bg-[#10141f] dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-805 dark:text-slate-200 text-sm uppercase tracking-wider">
            💸 Ajuste de Efectivo
          </h3>
          
          <form onSubmit={handleMovimiento} className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTipoMovimiento('ingreso')}
                className={`flex-grow font-bold py-2.5 rounded-xl text-xs border-2 transition-all btn-interactive ${
                  tipoMovimiento === 'ingreso'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-450'
                    : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-[#151926] dark:border-slate-800'
                }`}
              >
                📥 Agregar Efectivo
              </button>
              <button
                type="button"
                onClick={() => setTipoMovimiento('egreso')}
                className={`flex-grow font-bold py-2.5 rounded-xl text-xs border-2 transition-all btn-interactive ${
                  tipoMovimiento === 'egreso'
                    ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-455'
                    : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-[#151926] dark:border-slate-800'
                }`}
              >
                💸 Retirar Efectivo
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide block pl-0.5">
                  Monto a ajustar *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-sm">$</span>
                  <input
                    type="number"
                    placeholder="Monto"
                    value={montoMovimiento}
                    onChange={(e) => setMontoMovimiento(e.target.value)}
                    className="w-full bg-slate-100/70 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:border-slate-800 dark:text-slate-200 rounded-xl py-2.5 pl-7 pr-3 text-xs outline-none font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center pl-0.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    Descripción / Motivo {tipoMovimiento === 'egreso' && <span className="text-rose-600 dark:text-rose-450">*</span>}
                  </label>
                  {tipoMovimiento === 'egreso' && (
                    <span className="text-[9px] text-rose-600 dark:text-rose-450/80 font-semibold uppercase tracking-wider">Obligatorio</span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={tipoMovimiento === 'egreso' ? "Ej. Retiro cambio, Articulos limpieza *" : "Ej. Ingreso cambio (Opcional)"}
                  value={motivoMovimiento}
                  onChange={(e) => setMotivoMovimiento(e.target.value)}
                  className={`w-full bg-slate-100/70 border text-slate-900 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:text-slate-200 rounded-xl py-2.5 px-3 text-xs outline-none ${
                    tipoMovimiento === 'egreso' && !motivoMovimiento.trim() ? 'border-rose-500/30' : 'border-slate-200 dark:border-slate-800'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-colors btn-interactive ${
                tipoMovimiento === 'egreso'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {tipoMovimiento === 'egreso' ? 'Confirmar Retiro' : 'Confirmar Ingreso'}
            </button>
          </form>
        </section>

        {/* Listado de movimientos de hoy */}
        <section className="bg-white border border-slate-200 dark:bg-[#10141f] dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-start">
          <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider mb-4">Registro del día</h3>
          <div className="space-y-2.5 overflow-y-auto max-h-[300px] flex-grow pr-1">
            {cajaActiva.movimientos.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 py-12">
                <span className="text-3xl">📝</span>
                <p className="text-xs font-semibold mt-2">No hay movimientos registrados hoy.</p>
              </div>
            ) : (
              cajaActiva.movimientos.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 text-xs animate-fade-in"
                >
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-300 leading-tight">
                      {m.motivo}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {formatFecha(m.timestamp)}
                    </span>
                  </div>
                  <span
                    className={`font-black shrink-0 ml-3 text-sm ${
                      m.tipo === 'venta' 
                        ? 'text-emerald-650 dark:text-emerald-450' 
                        : m.tipo === 'ingreso' 
                          ? 'text-indigo-600 dark:text-indigo-400' 
                          : 'text-rose-600 dark:text-rose-455'
                    }`}
                  >
                    {m.tipo === 'venta' || m.tipo === 'ingreso' ? '+' : '-'}${m.monto.toLocaleString('es-AR')}
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
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => setModalCierreAbierto(false)}
          />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border border-slate-205 dark:bg-[#10141f] dark:border-slate-800 rounded-t-3xl z-50 px-5 pb-8 pt-5 animate-slide-up shadow-2xl">
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-5" />
            <h3 className="text-center text-base font-bold text-slate-705 dark:text-slate-400 uppercase tracking-widest mb-1">
              Finalizar Turno
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mb-4 max-w-xs mx-auto">
              Contá el efectivo físico de la caja registradora e ingresalo acá.
            </p>

            <form onSubmit={handleCerrar} className="space-y-4">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Nombre del cajero"
                  value={cajeroCierreInput}
                  onChange={(e) => setCajeroCierreInput(e.target.value)}
                  className="w-full text-center text-sm font-semibold text-slate-900 bg-slate-100/70 border border-slate-205 focus:bg-white focus:border-rose-500 dark:text-slate-200 dark:bg-[#090b11] dark:border-slate-800 rounded-2xl py-3 px-4 outline-none"
                  required
                />
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400 dark:text-slate-500">
                    $
                  </span>
                  <input
                    type="number"
                    placeholder="Efectivo en caja física"
                    value={montoCierre}
                    onChange={(e) => setMontoCierre(e.target.value)}
                    className="w-full text-center text-3xl font-black text-slate-900 bg-slate-100/70 border border-slate-205 focus:bg-white focus:border-rose-500 dark:text-slate-205 dark:bg-[#090b11] dark:border-slate-800 rounded-2xl py-3 pl-8 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 text-slate-600 dark:bg-[#151926] dark:border-slate-800/80 dark:text-slate-400 rounded-2xl p-4 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Efectivo esperado (teórico):</span>
                  <span className="font-extrabold text-slate-850 dark:text-slate-200">${saldoTeorico}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCierreAbierto(false)}
                  className="py-3.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-200/80 dark:bg-slate-800 dark:active:bg-slate-755 text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-center btn-interactive"
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
