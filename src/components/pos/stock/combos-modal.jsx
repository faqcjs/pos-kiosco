import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/kit'
import { draftFromCombo, emptyDraft, validateDraft } from '@/lib/combo-draft'
import { ComboEditor } from './combos/combo-editor'
import { ComboList } from './combos/combo-list'
import { useComboActions } from './combos/use-combo-actions'

const LIST_SUBTITLE = 'Productos que se venden juntos como uno solo. El stock sale de sus componentes.'

/** Combo manager: a list of saved combos and an editor to create or change one. */
export function CombosModal({ open, onClose }) {
  const { products, comboItems, isSaving, saveCombo, deleteCombo } = useComboActions()
  // null shows the list; a draft object shows the editor.
  const [draft, setDraft] = useState(null)

  const combos = useMemo(() => products.filter((p) => p.isCombo), [products])
  const componentCandidates = useMemo(() => products.filter((p) => !p.isCombo), [products])

  const isEditing = draft !== null
  const validationError = isEditing ? validateDraft(draft) : null

  function closeModal() {
    setDraft(null)
    onClose()
  }

  async function handleSave() {
    const saved = await saveCombo(draft)
    if (saved) setDraft(null)
  }

  const editorFooter = isEditing && (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
      <p aria-live="polite" className="flex-1 text-sm text-muted-foreground">
        {validationError}
      </p>
      <Button variant="outline" size="lg" onClick={() => setDraft(null)} disabled={isSaving}>
        Volver a combos
      </Button>
      <Button size="lg" onClick={handleSave} disabled={isSaving || validationError !== null}>
        {isSaving ? 'Guardando…' : draft.id ? 'Guardar cambios' : 'Crear combo'}
      </Button>
    </div>
  )

  return (
    <Modal
      open={open}
      // Escape or X inside the editor goes back to the list instead of closing everything.
      onClose={isEditing ? () => !isSaving && setDraft(null) : closeModal}
      title={!isEditing ? 'Combos' : draft.id ? `Editar ${draft.name || 'combo'}` : 'Nuevo combo'}
      subtitle={isEditing ? undefined : LIST_SUBTITLE}
      variant="large"
      footer={editorFooter}
    >
      {isEditing ? (
        <ComboEditor draft={draft} onChange={setDraft} products={componentCandidates} />
      ) : (
        <ComboList
          combos={combos}
          comboItems={comboItems}
          products={products}
          onCreate={() => setDraft(emptyDraft())}
          onEdit={(combo) => setDraft(draftFromCombo(combo, comboItems, componentCandidates))}
          onDelete={deleteCombo}
        />
      )}
    </Modal>
  )
}
