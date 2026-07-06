export const createUiSlice = (set, get) => ({
  notificacion: null,
  toast: null,
  sidebarCollapsed: false,
  cartCollapsed: false,

  mostrarNotificacion: (config) => set({ notificacion: config }),
  cerrarNotificacion: () => set({ notificacion: null }),
  mostrarToast: (mensaje, tipo = 'success') => {
    const id = Date.now()
    set({ toast: { id, mensaje, tipo } })
    setTimeout(() => {
      if (get().toast?.id === id) {
        set({ toast: null })
      }
    }, 2000)
  },
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleCart: () => set((state) => ({ cartCollapsed: !state.cartCollapsed })),
})

