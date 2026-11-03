import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { diffComponents, getDraftMetrics, validateDraft } from '@/lib/combo-draft'
import { useStore } from '@/lib/store'

/** Persists combo drafts and deletions through the store, reporting the outcome with toasts. */
export function useComboActions() {
  const { state, addProduct, updateProduct, deleteProduct, addComboItem, deleteComboItem } = useStore()
  const toast = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const products = state.products ?? []
  const comboItems = state.comboItems ?? []

  async function updateExistingCombo(draft, fields) {
    const saved = products.find((p) => p.id === draft.id)
    // Spread the saved product: sanitizeProduct resets every field that is not sent.
    await updateProduct({ ...saved, ...fields })

    const existing = comboItems.filter((ci) => ci.comboId === draft.id)
    const { toDelete, toAdd } = diffComponents(existing, draft.components)
    // Insert before deleting so a failure halfway never leaves the combo without components.
    for (const component of toAdd) {
      await addComboItem({ comboId: draft.id, ...component })
    }
    for (const id of toDelete) {
      await deleteComboItem(id)
    }
  }

  async function createCombo(draft, fields) {
    const created = await addProduct(fields)
    if (!created?.id) throw new Error('No se pudo crear el combo')
    for (const component of draft.components) {
      await addComboItem({ comboId: created.id, ...component })
    }
  }

  async function saveCombo(draft) {
    const error = validateDraft(draft)
    if (error) {
      toast(error, 'error')
      return false
    }

    const { cost } = getDraftMetrics(draft.components, products, draft.price)
    const fields = {
      name: draft.name.trim(),
      price: Number(draft.price),
      category: draft.category,
      barcode: draft.barcode.trim() || undefined,
      cost,
      // Combo stock is virtual (derived from components); the stored value is always 0.
      stock: 0,
      isCombo: true,
    }

    setIsSaving(true)
    try {
      if (draft.id) {
        await updateExistingCombo(draft, fields)
        toast(`Combo "${fields.name}" guardado`, 'success')
      } else {
        await createCombo(draft, fields)
        toast(`Combo "${fields.name}" creado`, 'success')
      }
      return true
    } catch (err) {
      console.error(err)
      toast(err.message || 'No se pudo guardar el combo', 'error')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteCombo(combo) {
    try {
      await deleteProduct(combo.id)
      toast(`Combo "${combo.name}" eliminado`, 'info')
    } catch (err) {
      console.error(err)
      toast('No se pudo eliminar el combo', 'error')
    }
  }

  return { products, comboItems, isSaving, saveCombo, deleteCombo }
}
