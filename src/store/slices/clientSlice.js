export const createClientSlice = (set, get) => ({
  clientes: [],
  proveedores: [],

  agregarCliente: (nombre, telefono = '') => {
    const id = `cli-${Date.now()}`
    set((state) => ({
      clientes: [
        ...state.clientes,
        { id, nombre, telefono, deuda: 0, historial: [] },
      ],
    }))
    return id
  },

  registrarPagoCliente: (clienteId, monto) =>
    set((state) => {
      const numMonto = Number(monto)
      if (numMonto <= 0) return {}

      // Si es pago en efectivo, ingresa a la caja activa
      if (state.cajaActiva) {
        state.registrarMovimientoCaja('ingreso', numMonto, `Cobro Deuda Cliente — ID: ${clienteId}`)
      }

      return {
        clientes: state.clientes.map((c) => {
          if (c.id === clienteId) {
            const nuevoMovimiento = {
              id: `pago-${Date.now()}`,
              tipo: 'pago',
              monto: numMonto,
              detalle: 'Pago de deuda',
              timestamp: new Date().toISOString(),
            }
            return {
              ...c,
              deuda: Math.max(0, c.deuda - numMonto),
              historial: [nuevoMovimiento, ...c.historial],
            }
          }
          return c
        }),
      }
    }),

  agregarProveedor: (nombre) =>
    set((state) => ({
      proveedores: [
        ...state.proveedores,
        { id: `prov-${Date.now()}`, nombre, deuda: 0, historialPagos: [] },
      ],
    })),

  registrarRecepcionMercaderia: (proveedorId, montoDeuda, detalle = '', pagadoEnMomento = false) => {
    const state = get()
    const proveedor = state.proveedores.find((p) => p.id === proveedorId)
    if (!proveedor) return false

    const numMonto = Number(montoDeuda)
    if (numMonto <= 0) return false

    if (pagadoEnMomento) {
      if (!state.cajaActiva) {
        alert('⚠️ No se puede pagar en el momento porque la caja está cerrada.')
        return false
      }

      // Registrar egreso en caja
      state.registrarMovimientoCaja('egreso', numMonto, `Pago Proveedor: ${proveedor.nombre}`)

      // Registrar en historial sin alterar deuda
      set((state) => ({
        proveedores: state.proveedores.map((p) => {
          if (p.id === proveedorId) {
            const nowIso = new Date().toISOString()
            const movRecepcion = {
              id: `mercaderia-${Date.now()}`,
              tipo: 'recepcion',
              monto: numMonto,
              detalle: `${detalle} (Pagado al contado de caja)`,
              timestamp: nowIso,
            }
            const movPago = {
              id: `pago-${Date.now() + 1}`,
              tipo: 'pago',
              monto: numMonto,
              detalle: 'Pago al contado (Caja chica)',
              timestamp: nowIso,
            }
            return {
              ...p,
              historialPagos: [movPago, movRecepcion, ...p.historialPagos],
            }
          }
          return p
        }),
      }))
    } else {
      // Registrar como deuda
      set((state) => ({
        proveedores: state.proveedores.map((p) => {
          if (p.id === proveedorId) {
            const nuevoMovimiento = {
              id: `mercaderia-${Date.now()}`,
              tipo: 'recepcion',
              monto: numMonto,
              detalle,
              timestamp: new Date().toISOString(),
            }
            return {
              ...p,
              deuda: p.deuda + numMonto,
              historialPagos: [nuevoMovimiento, ...p.historialPagos],
            }
          }
          return p
        }),
      }))
    }
    return true
  },

  registrarPagoProveedor: (proveedorId, montoPago, deCajaChica = false) =>
    set((state) => {
      const numMonto = Number(montoPago)
      if (numMonto <= 0) return {}

      // Si el pago sale de la caja chica del kiosko, registrar el egreso
      if (deCajaChica && state.cajaActiva) {
        state.registrarMovimientoCaja(
          'egreso',
          numMonto,
          `Pago Proveedor — ID: ${proveedorId}`
        )
      }

      return {
        proveedores: state.proveedores.map((p) => {
          if (p.id === proveedorId) {
            const nuevoMovimiento = {
              id: `pago-${Date.now()}`,
              tipo: 'pago',
              monto: numMonto,
              detalle: `Pago realizado ${deCajaChica ? '(De caja chica)' : ''}`,
              timestamp: new Date().toISOString(),
            }
            return {
              ...p,
              deuda: Math.max(0, p.deuda - numMonto),
              historialPagos: [nuevoMovimiento, ...p.historialPagos],
            }
          }
          return p
        }),
      }
    }),

  eliminarProveedor: (id) =>
    set((state) => ({
      proveedores: state.proveedores.filter((p) => p.id !== id),
    })),
})
