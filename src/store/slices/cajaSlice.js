export const createCajaSlice = (set, get) => ({
  cajaActiva: null,
  historialCajas: [],

  abrirCaja: (montoInicial, cajeroApertura) =>
    set(() => {
      if (montoInicial < 0) return {}
      return {
        cajaActiva: {
          id: `caja-${Date.now()}`,
          fechaApertura: new Date().toISOString(),
          montoApertura: Number(montoInicial),
          cajeroApertura: cajeroApertura || 'Desconocido',
          movimientos: [],
          totalVueltos: 0,
        },
      }
    }),

  registrarMovimientoCaja: (tipo, monto, motivo) => {
    const state = get()
    if (!state.cajaActiva) {
      state.mostrarNotificacion({
        tipo: 'error',
        titulo: 'Caja Cerrada',
        mensaje: 'No se pueden registrar movimientos porque la caja está cerrada.'
      })
      return
    }
    set((state) => {
      const nuevoMovimiento = {
        id: `mov-${Date.now()}`,
        tipo, // 'ingreso', 'egreso', 'venta'
        monto: Number(monto),
        motivo,
        timestamp: new Date().toISOString(),
      }
      return {
        cajaActiva: {
          ...state.cajaActiva,
          movimientos: [...state.cajaActiva.movimientos, nuevoMovimiento],
        },
      }
    })
  },

  cerrarCaja: (montoFisico, cajeroCierre) =>
    set((state) => {
      if (!state.cajaActiva) return {}
      
      const totalVentasEfectivo = state.cajaActiva.movimientos
        .filter((m) => m.tipo === 'venta' && m.motivo.includes('Efectivo'))
        .reduce((acc, m) => acc + m.monto, 0)
      
      const totalEgresos = state.cajaActiva.movimientos
        .filter((m) => m.tipo === 'egreso')
        .reduce((acc, m) => acc + m.monto, 0)

      const saldoTeorico = state.cajaActiva.montoApertura + totalVentasEfectivo - totalEgresos
      const diferencia = Number(montoFisico) - saldoTeorico

      const cajaCerrada = {
        ...state.cajaActiva,
        cajeroCierre: cajeroCierre || 'Desconocido',
        fechaCierre: new Date().toISOString(),
        montoCierreFisico: Number(montoFisico),
        saldoTeorico,
        diferencia,
      }

      return {
        cajaActiva: null,
        historialCajas: [cajaCerrada, ...state.historialCajas],
      }
    }),
})
