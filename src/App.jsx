import { useState, useEffect } from 'react'
import Venta from './components/Venta'
import Caja from './components/Caja'
import Stock from './components/Stock'
import Clientes from './components/Clientes'
import Proveedores from './components/Proveedores'
import useKioskoStore from './store/kioskoStore'
import NotificacionModal from './components/NotificacionModal'

export default function App() {
  const [activeTab, setActiveTab] = useState('venta')
  const { cajaActiva } = useKioskoStore()

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
    
    // Detect system preference and set it as default on first load
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return systemPrefersDark ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    
    if (theme === 'dark') {
      root.classList.add('dark')
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#090b11') // match bg-slate-950 / #090b11
    } else {
      root.classList.remove('dark')
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#f8fafc') // match bg-slate-50
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const getThemeIcon = () => {
    return theme === 'light' ? '☀️' : '🌙'
  }

  const getThemeLabel = () => {
    return theme === 'light' ? 'Claro' : 'Oscuro'
  }

  const tabs = [
    { id: 'venta', label: 'Venta', icon: '🛒', emoji: '🛍️' },
    { id: 'caja', label: 'Caja', icon: '💰', emoji: '💵' },
    { id: 'stock', label: 'Stock', icon: '📦', emoji: '📦' },
    { id: 'clientes', label: 'Fiar', icon: '📓', emoji: '📓' },
    { id: 'proveedores', label: 'Proveedores', icon: '🚛', emoji: '🚛' },
  ]

  return (
    <div className="h-screen w-full flex bg-slate-50 dark:bg-[#090b11] text-slate-800 dark:text-slate-100 overflow-hidden font-sans">
      {/* 1. PC SIDEBAR NAVIGATION (Visible only on md screens and up) */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-[#10141f] border-r border-slate-200 dark:border-slate-800/80 flex-col shrink-0 justify-between p-5 z-20">
        <div className="space-y-6">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3 px-2 py-1">
            <span className="text-3xl animate-bounce">🏪</span>
            <div>
              <h1 className="text-lg font-black bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 dark:from-indigo-400 dark:via-purple-400 dark:to-emerald-400 bg-clip-text text-transparent">
                Kiosko POS
              </h1>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500">
                Turno Inteligente
              </span>
            </div>
          </div>

          {/* Caja Status Badge */}
          <div className="px-2">
            {cajaActiva ? (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs px-3.5 py-2.5 rounded-2xl">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                CAJA ABIERTA
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-extrabold text-xs px-3.5 py-2.5 rounded-2xl">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                CAJA CERRADA
              </div>
            )}
          </div>

          {/* Nav Items */}
          <nav className="space-y-1.5 pt-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm btn-interactive border transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/25'
                    : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Footer & Theme Controls for Desktop */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Tema</span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900/60 dark:hover:bg-slate-800/60 text-xs font-black text-slate-700 dark:text-slate-350 transition-all btn-interactive"
            >
              <span>{getThemeIcon()}</span>
              <span>{getThemeLabel()}</span>
            </button>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800/40 rounded-2xl p-3.5 text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-600 dark:text-slate-400">Kiosko Inteligente v1.2</p>
            <p className="text-[10px]">Local Storage Persist</p>
          </div>
        </div>
      </aside>

      {/* 2. MAIN APPLICATION CONTAINER (Handles both mobile frame & responsive wide desktop views) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header (Visible only on mobile/tablet) */}
        <header className="flex md:hidden bg-white dark:bg-[#10141f] border-b border-slate-200 dark:border-slate-800/80 px-4 py-3 justify-between items-center shrink-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏪</span>
            <span className="font-black bg-gradient-to-r from-indigo-650 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              Kiosko POS
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme selector for Mobile */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 text-sm transition-all btn-interactive"
              title={`Tema: ${getThemeLabel()}`}
            >
              {getThemeIcon()}
            </button>

            {cajaActiva ? (
              <span className="bg-emerald-500/10 text-emerald-605 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                ABIERTA
              </span>
            ) : (
              <span className="bg-rose-500/10 text-rose-605 dark:text-rose-400 border border-rose-500/20 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                CERRADA
              </span>
            )}
          </div>
        </header>

        {/* Tab Content Canvas */}
        <div className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-[#090b11]">
          {activeTab === 'venta' && <Venta />}
          {activeTab === 'caja' && <Caja />}
          {activeTab === 'stock' && <Stock />}
          {activeTab === 'clientes' && <Clientes />}
          {activeTab === 'proveedores' && <Proveedores />}
        </div>

        {/* Mobile Bottom Navigation (Visible only on screens below md) */}
        <nav className="flex md:hidden absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-[#10141f]/95 border-t border-slate-200 dark:border-slate-800/70 h-16 shrink-0 grid grid-cols-5 z-20 backdrop-blur-md">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[9px] uppercase font-black tracking-wider">{tab.label === 'Proveedores' ? 'Prov' : tab.label}</span>
            </button>
          ))}
        </nav>
      </main>
      <NotificacionModal />
    </div>
  )
}
