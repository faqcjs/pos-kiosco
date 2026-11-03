import { useState, useEffect, useMemo } from 'react'
import { uid } from '@/lib/format'
import { useToast } from '@/components/ui/toast'
import { searchProducts } from '@/lib/utils'
import { useBarcodeScanner } from '@/lib/use-barcode-scanner'
import { findItemsWithoutUnitCost } from '@/lib/purchase-cost'
import {
  addProductToDraft,
  buildPurchasePayload,
  getDraftTotal,
  removeDraftItem,
  resolveEditingSupplierId,
  updateDraftItemQty,
  updateDraftItemUnitCost,
} from './purchase-draft'

const MAX_PRODUCT_SUGGESTIONS = 10

/** Draft state and actions of the new/edit purchase modal. */
export function usePurchaseDraft({
  open,
  onClose,
  onReceive,
  onDeleteEntry,
  products,
  canReceive,
  initialSupplierId,
  editingPurchase,
}) {
  const toast = useToast()

  const [supplierId, setSupplierId] = useState(initialSupplierId || '')
  const [items, setItems] = useState([])
  const [showCostErrors, setShowCostErrors] = useState(false)
  const [prodQuery, setProdQuery] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)

  // Reset or populate the draft when the modal opens
  useEffect(() => {
    if (!open) return
    if (editingPurchase) {
      setSupplierId(resolveEditingSupplierId(editingPurchase))
      setItems(editingPurchase.items || [])
    } else {
      setSupplierId(initialSupplierId || '')
      setItems([])
    }
    setProdQuery('')
    setShowCostErrors(false)
  }, [open, initialSupplierId, editingPurchase])

  const productSuggestions = useMemo(
    () => searchProducts(products, prodQuery).slice(0, MAX_PRODUCT_SUGGESTIONS),
    [products, prodQuery],
  )

  const totalAmount = useMemo(() => getDraftTotal(items), [items])

  function addProduct(product) {
    const result = addProductToDraft(items, product, uid())
    setItems(result.items)
    toast(result.incremented ? `+1 a ${product.name}` : `Agregado: ${product.name}`, 'success')
    setProdQuery('')
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (productSuggestions.length > 0) {
        addProduct(productSuggestions[0])
      }
    } else if (e.key === 'Escape') {
      setProdQuery('')
    }
  }

  function handleScan(code) {
    setScannerOpen(false)
    const trimmed = (code || '').trim()
    if (!trimmed) return
    const prod = products.find((p) => p.barcode?.trim().toLowerCase() === trimmed.toLowerCase())
    if (prod) {
      addProduct(prod)
    } else {
      toast('Producto no encontrado en el catálogo', 'error')
    }
  }

  useBarcodeScanner({
    onScan: handleScan,
    enabled: open && !scannerOpen,
  })

  const updateQty = (id, nextQty) => setItems(updateDraftItemQty(items, id, nextQty))
  const updateUnitCost = (id, nextUnitCost) => setItems(updateDraftItemUnitCost(items, id, nextUnitCost))
  const removeItem = (id) => setItems(removeDraftItem(items, id))

  async function submit() {
    if (!canReceive) {
      toast('No tenés permisos para realizar esta acción.', 'destructive')
      return
    }

    if (items.length === 0) {
      toast('Agregá al menos un producto a la compra.', 'error')
      return
    }

    const withoutCost = findItemsWithoutUnitCost(items)
    if (withoutCost.length > 0) {
      setShowCostErrors(true)
      toast(`Cargá el costo unitario de la factura: ${withoutCost.map((it) => it.name).join(', ')}`, 'error')
      return
    }

    const payload = buildPurchasePayload({
      items,
      supplierId,
      invoiceDate: editingPurchase?.date,
      now: new Date().toISOString(),
    })

    if (editingPurchase && onDeleteEntry) {
      await onDeleteEntry(editingPurchase.supplierId, editingPurchase.id)
    }

    onReceive(payload.supplierId, payload.total, payload.detail, false, payload.items)
    onClose()

    toast(
      editingPurchase
        ? 'Compra actualizada exitosamente'
        : 'Compra registrada, stock y costos de productos actualizados',
      'success',
    )
  }

  return {
    supplierId,
    setSupplierId,
    items,
    showCostErrors,
    prodQuery,
    setProdQuery,
    productSuggestions,
    totalAmount,
    scannerOpen,
    setScannerOpen,
    handleScan,
    handleSearchKeyDown,
    addProduct,
    updateQty,
    updateUnitCost,
    removeItem,
    submit,
  }
}
