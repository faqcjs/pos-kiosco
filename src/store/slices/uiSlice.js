export const createUiSlice = (set, get) => ({
  notificacion: null,
  sidebarCollapsed: false,
  cartCollapsed: false,

  mostrarNotificacion: (config) => set({ notificacion: config }),
  cerrarNotificacion: () => set({ notificacion: null }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleCart: () => set((state) => ({ cartCollapsed: !state.cartCollapsed })),
})

