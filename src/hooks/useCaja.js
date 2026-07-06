import { useState } from 'react'
import useKioskoStore from '../store/kioskoStore'

export default function useCaja() {
  const cajaActiva = useKioskoStore(state => state.cajaActiva)
  const historialCajas = useKioskoStore(state => state.historialCajas)
  const abrirCaja = useKioskoStore(state => state.abrirCaja)
  const cerrarCaja = useKioskoStore(state => state.cerrarCaja)
  const registrarMovimientoCaja = useKioskoStore(state => state.registrarMovimientoCaja)
  const mostrarNotificacion = useKioskoStore(state => state.mostrarNotificacion)

  // State local
  const [montoInicialInput, setMontoInicialInput] = useState('')
  const [cajeroAperturaInput, setCajeroAperturaInput] = useState('')
  const [montoCierre, setMontoCierre] = useState('')
  const [cajeroCierreInput, setCajeroCierreInput] = useState('')
  const [modalCierreAbierto, setModalCierreAbierto] = useState(false)
  const [montoMovimiento, setMontoMovimiento] = useState('')
  const [tipoMovimiento, setTipoMovimiento] = useState('ingreso') // 'ingreso' (Agregar), 'egreso' (Sacar)
  const [motivoMovimiento, setMotivoMovimiento] = useState('')

  // Totales de la sesión activa
  const totalVentasEfectivo = cajaActiva
    ? cajaActiva.movimientos
        .filter((m) => m.tipo === 'venta' && m.motivo.includes('Efectivo'))
        .reduce((acc, m) => acc + m.monto, 0)
    : 0

  const totalVentasQR = cajaActiva
    ? cajaActiva.movimientos
        .filter((m) => m.tipo === 'venta' && m.motivo.includes('QR / Transferencia'))
        .reduce((acc, m) => acc + m.monto, 0)
    : 0

  const totalCobrosClientes = cajaActiva
    ? cajaActiva.movimientos
        .filter((m) => m.tipo === 'ingreso' && m.motivo.includes('Cobro Deuda Cliente'))
        .reduce((acc, m) => acc + m.monto, 0)
    : 0

  const totalIngresos = cajaActiva
    ? cajaActiva.movimientos
        .filter((m) => m.tipo === 'ingreso' && !m.motivo.includes('Cobro Deuda Cliente'))
        .reduce((acc, m) => acc + m.monto, 0)
    : 0

  const totalEgresos = cajaActiva
    ? cajaActiva.movimientos
        .filter((m) => m.tipo === 'egreso')
        .reduce((acc, m) => acc + m.monto, 0)
    : 0

  const saldoTeorico = cajaActiva
    ? cajaActiva.montoApertura + totalVentasEfectivo + totalCobrosClientes + totalIngresos - totalEgresos
    : 0

  const handleAbrir = (e) => {
    e.preventDefault()
    if (!cajeroAperturaInput.trim()) {
      mostrarNotificacion({
        tipo: 'warning',
        titulo: 'Cajero Requerido',
        mensaje: 'Por favor ingresá el nombre del cajero que abre la caja.'
      })
      return
    }
    const num = parseFloat(montoInicialInput)
    if (!isNaN(num) && num >= 0) {
      abrirCaja(num, cajeroAperturaInput.trim())
      setMontoInicialInput('')
      setCajeroAperturaInput('')
    }
  }

  const handleMovimiento = (e) => {
    e.preventDefault()
    const monto = parseFloat(montoMovimiento)
    if (isNaN(monto) || monto <= 0) {
      mostrarNotificacion({
        tipo: 'warning',
        titulo: 'Monto Inválido',
        mensaje: 'Por favor ingresá un monto mayor a 0.'
      })
      return
    }

    if (tipoMovimiento === 'egreso' && !motivoMovimiento.trim()) {
      mostrarNotificacion({
        tipo: 'warning',
        titulo: 'Motivo Requerido',
        mensaje: 'Para retirar dinero es obligatorio indicar el por qué o una descripción.'
      })
      return
    }

    const descripcionFinal = tipoMovimiento === 'egreso'
      ? `Retiro de Caja - ${motivoMovimiento.trim()}`
      : (motivoMovimiento.trim() || 'Ajuste de caja (Ingreso)')
    registrarMovimientoCaja(tipoMovimiento, monto, descripcionFinal)

    // Limpiar formulario
    setMontoMovimiento('')
    setMotivoMovimiento('')
  }

  const handleCerrar = (e) => {
    e.preventDefault()
    if (!cajeroCierreInput.trim()) {
      mostrarNotificacion({
        tipo: 'warning',
        titulo: 'Cajero Requerido',
        mensaje: 'Por favor ingresá el nombre del cajero que cierra la caja.'
      })
      return
    }
    const monto = parseFloat(montoCierre)
    if (!isNaN(monto) && monto >= 0) {
      cerrarCaja(monto, cajeroCierreInput.trim())
      setMontoCierre('')
      setCajeroCierreInput('')
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

  return {
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
  }
}
