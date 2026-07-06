export const createAdminSlice = (set, get) => ({
  adminPassword: 'admin123',
  isAdminAuthenticated: false,

  loginAdmin: async (password) => {
    // Simular un delay para simular comportamiento asincrónico (async-ready)
    await new Promise((resolve) => setTimeout(resolve, 300))
    const state = get()
    if (password === state.adminPassword) {
      set({ isAdminAuthenticated: true })
      return true
    }
    return false
  },

  logoutAdmin: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100))
    set({ isAdminAuthenticated: false })
  },

  changeAdminPassword: async (newPassword) => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    if (!newPassword || newPassword.trim().length === 0) {
      return false
    }
    set({ adminPassword: newPassword })
    return true
  }
})
