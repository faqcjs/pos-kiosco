import { useState, useRef, useEffect } from 'react'
import useKioskoStore from '../store/kioskoStore'

export default function useVenta() {
  const productos = useKioskoStore(state => state.productos)
  const carrito = useKioskoStore(state => state.carrito)
  const cajaActiva = useKioskoStore(state => state.cajaActiva)
  const clientes = useKioskoStore(state => state.clientes)
  const agregarAlCarrito = useKioskoStore(state => state.agregarAlCarrito)
  const agregarMontoRapido = useKioskoStore(state => state.agregarMontoRapido)
  const actualizarCantidadCarrito = useKioskoStore(state => state.actualizarCantidadCarrito)
  const eliminarDelCarrito = useKioskoStore(state => state.eliminarDelCarrito)
  const procesarCobro = useKioskoStore(state => state.procesarCobro)
  const agregarCliente = useKioskoStore(state => state.agregarCliente)
  const mostrarNotificacion = useKioskoStore(state => state.mostrarNotificacion)
  const mostrarToast = useKioskoStore(state => state.mostrarToast)

  // State local
  const [buscarProducto, setBuscarProducto] = useState('')
  const [montoRapidoInput, setMontoRapidoInput] = useState('')
  const [scannerAbierto, setScannerAbierto] = useState(false)
  const [modalCobroAbierto, setModalCobroAbierto] = useState(false)
  const [metodoSeleccionado, setMetodoSeleccionado] = useState('')
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState('')
  const [pagaCon, setPagaCon] = useState('')
  const [creandoClienteInline, setCreandoClienteInline] = useState(false)
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('')
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState('')
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('')
  const [visibleCount, setVisibleCount] = useState(12)
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)

  const inputMontoRef = useRef(null)
  const scrollRef = useRef(null)

  const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0)

  // Auto-scroll del carrito cuando se agregan items
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [carrito])

  // Escuchar inputs del buscador para código de barra exacto
  useEffect(() => {
    if (buscarProducto) {
      const prodEncontrado = productos.find(
        (p) => p.id === buscarProducto.trim()
      )
      if (prodEncontrado) {
        agregarAlCarrito(prodEncontrado.id, 1)
        mostrarToast(`Agregado ${prodEncontrado.nombre}`, 'success')
        setBuscarProducto('') // Limpiar buscador
      }
    }
  }, [buscarProducto])

  // Resetear paginado al cambiar filtros
  useEffect(() => {
    setVisibleCount(12)
  }, [buscarProducto, categoriaSeleccionada])

  const handleAgregarMontoRapido = () => {
    const num = parseFloat(montoRapidoInput)
    if (!isNaN(num) && num > 0) {
      agregarMontoRapido(num)
      setMontoRapidoInput('')
      inputMontoRef.current?.focus()
    }
  }

  const handleKeyDownMonto = (e) => {
    if (e.key === 'Enter') handleAgregarMontoRapido()
  }

  const handleScanSuccess = (codigo) => {
    const prod = productos.find((p) => p.id === codigo)
    if (prod) {
      agregarAlCarrito(prod.id, 1)
      mostrarToast(`Agregado ${prod.nombre}`, 'success')
    } else {
      mostrarToast('Producto no encontrado', 'error')
    }
    setScannerAbierto(false)
  }

  const handleCobrar = () => {
    if (!cajaActiva) {
      mostrarNotificacion({
        tipo: 'warning',
        titulo: 'Caja Cerrada',
        mensaje: 'Primero debés abrir la caja desde la pestaña de Caja.'
      })
      return
    }
    setModalCobroAbierto(true)
  }

  const confirmarCobro = () => {
    if (!metodoSeleccionado) {
      mostrarNotificacion({
        tipo: 'warning',
        titulo: 'Método de Pago',
        mensaje: 'Por favor seleccioná un método de pago.'
      })
      return
    }

    if (metodoSeleccionado === 'Fiado' && !clienteSeleccionadoId) {
      mostrarNotificacion({
        tipo: 'warning',
        titulo: 'Cliente Requerido',
        mensaje: 'Por favor seleccioná qué cliente va a fiar.'
      })
      return
    }

    const clienteNombre = metodoSeleccionado === 'Fiado'
      ? clientes.find((c) => c.id === clienteSeleccionadoId)?.nombre
      : null

    const items = carrito
      .map((p) => `${p.nombre} x${p.cantidad} = $${p.precio * p.cantidad}`)
      .join('\n')

    const exito = procesarCobro(
      metodoSeleccionado,
      metodoSeleccionado === 'Fiado' ? clienteSeleccionadoId : null,
      metodoSeleccionado === 'Efectivo' ? Number(pagaCon) || 0 : 0
    )

    if (exito) {
      mostrarNotificacion({
        tipo: 'success',
        titulo: 'Venta Completada',
        mensaje: `Venta procesada con éxito!\n\nMétodo: ${metodoSeleccionado} ${clienteNombre ? `(${clienteNombre})` : ''}\nTotal: $${total.toLocaleString('es-AR')}\n\n${items}`
      })
      setModalCobroAbierto(false)
      setMetodoSeleccionado('')
      setClienteSeleccionadoId('')
      setPagaCon('')
      setCreandoClienteInline(false)
      setNuevoClienteNombre('')
      setNuevoClienteTelefono('')
    }
  }

  const esVistaMasVendidos = !buscarProducto.trim() && !categoriaSeleccionada

  // Filtrado de productos por búsqueda y categoría
  const listadoFiltrado = esVistaMasVendidos
    ? productos.filter((p) => p.stock > 0).slice(0, 10)
    : productos.filter((p) => {
        const coincideBusqueda = !buscarProducto.trim() || 
          p.nombre.toLowerCase().includes(buscarProducto.trim().toLowerCase()) ||
          p.id.toLowerCase().includes(buscarProducto.trim().toLowerCase())
        
        const coincideCategoria = !categoriaSeleccionada || p.categoria === categoriaSeleccionada
        
        return coincideBusqueda && coincideCategoria
      })

  const listadoProductosGrid = esVistaMasVendidos 
    ? listadoFiltrado
    : listadoFiltrado.slice(0, visibleCount)

  const handleLeftScroll = (e) => {
    if (esVistaMasVendidos) return
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop - clientHeight < 150) {
      setVisibleCount((prev) => Math.min(prev + 12, listadoFiltrado.length))
    }
  }

  return {
    productos,
    carrito,
    cajaActiva,
    clientes,
    agregarAlCarrito,
    actualizarCantidadCarrito,
    eliminarDelCarrito,
    agregarCliente,
    buscarProducto,
    setBuscarProducto,
    montoRapidoInput,
    setMontoRapidoInput,
    scannerAbierto,
    setScannerAbierto,
    modalCobroAbierto,
    setModalCobroAbierto,
    metodoSeleccionado,
    setMetodoSeleccionado,
    clienteSeleccionadoId,
    setClienteSeleccionadoId,
    pagaCon,
    setPagaCon,
    creandoClienteInline,
    setCreandoClienteInline,
    nuevoClienteNombre,
    setNuevoClienteNombre,
    nuevoClienteTelefono,
    setNuevoClienteTelefono,
    categoriaSeleccionada,
    setCategoriaSeleccionada,
    cartDrawerOpen,
    setCartDrawerOpen,
    inputMontoRef,
    scrollRef,
    total,
    handleAgregarMontoRapido,
    handleKeyDownMonto,
    handleScanSuccess,
    handleCobrar,
    confirmarCobro,
    listadoFiltrado,
    listadoProductosGrid,
    handleLeftScroll,
    esVistaMasVendidos,
  }
}
