import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createProductSlice } from './slices/productSlice'
import { createCajaSlice } from './slices/cajaSlice'
import { createCartSlice } from './slices/cartSlice'
import { createClientSlice } from './slices/clientSlice'
import { createUiSlice } from './slices/uiSlice'
import { createAdminSlice } from './slices/adminSlice'
import storageAdapter from './storageAdapter'

const useKioskoStore = create(
  persist(
    (set, get) => ({
      ...createProductSlice(set, get),
      ...createCajaSlice(set, get),
      ...createCartSlice(set, get),
      ...createClientSlice(set, get),
      ...createUiSlice(set, get),
      ...createAdminSlice(set, get),
    }),
    {
      name: 'kiosko-pos-storage-v2',
      storage: createJSONStorage(() => ({
        getItem: (name) => storageAdapter.read(name),
        setItem: (name, value) => storageAdapter.write(name, value),
        removeItem: (name) => storageAdapter.delete(name),
      })),
    }
  )
)

export default useKioskoStore
