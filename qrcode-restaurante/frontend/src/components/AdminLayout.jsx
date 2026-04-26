import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { to: '/admin',              label: 'Painel',     end: true },
  { to: '/admin/pedidos',      label: 'Pedidos' },
  { to: '/admin/cardapio',     label: 'Cardápio' },
  { to: '/admin/mesas',        label: 'Mesas & QR' },
  { to: '/admin/configuracao', label: 'Config.' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const initials = (user?.nome || 'R')
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <div className="min-h-screen flex flex-col bg-creme">

      {/* ── TopBar ── */}
      <header className="sticky top-0 z-50 flex items-center h-14 px-6 bg-espresso gap-0">

        {/* Logo */}
        <NavLink to="/admin" className="flex items-center gap-2 mr-9 no-underline flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="2" width="6" height="14" rx="1.5" fill="#C8855A"/>
            <rect x="10" y="2" width="6" height="9"  rx="1.5" fill="#C8855A" opacity="0.45"/>
          </svg>
          <span className="font-display text-[17px] text-creme-3 tracking-wide leading-none">
            {user?.nome?.split(' ')[0] || 'Restaurante'}
          </span>
        </NavLink>

        {/* Nav */}
        <nav className="flex gap-0.5 flex-1 overflow-x-auto scrollbar-hide">
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-[13px] font-medium transition-all whitespace-nowrap
                 ${isActive
                   ? 'bg-brand-500 text-white'
                   : 'text-espresso-4 hover:text-creme-3 hover:bg-white/5'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Direita */}
        <div className="flex items-center gap-3 ml-auto flex-shrink-0">
          {/* Indicador cozinha */}
          <a
            href="/cozinha"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[12px] text-espresso-4 hover:text-creme-3 transition-colors"
            title="Abrir painel da cozinha"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            Cozinha
          </a>

          {/* Avatar + sair */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-espresso-3 flex items-center justify-center text-[11px] font-medium text-brand-400">
              {initials}
            </div>
            <button
              onClick={() => { logout(); navigate('/admin/login') }}
              className="text-[12px] text-espresso-4 hover:text-red-400 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* ── Conteúdo ── */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
