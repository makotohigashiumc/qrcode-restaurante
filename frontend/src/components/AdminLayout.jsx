import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { path: '/admin',              label: 'Dashboard'     },
  { path: '/admin/pedidos',      label: 'Pedidos'       },
  { path: '/admin/cardapio',     label: 'Cardápio'      },
  { path: '/admin/mesas',        label: 'Mesas'         },
  { path: '/admin/cozinha',      label: 'Cozinha'       },
  { path: '/admin/configuracao', label: 'Configurações' },
]

export default function AdminLayout() {
  const { logout, user } = useAuth()
  const location         = useLocation()
  const nav              = useNavigate()

  const handleLogout = () => { logout(); nav('/admin/login') }

  return (
    <div className="min-h-screen bg-washi">
      <header className="bg-sumi h-14 flex items-center justify-between px-7 sticky top-0 z-40">

        <Link to="/admin" className="flex items-center gap-3 flex-shrink-0">
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="8" fill="#F5F0EB" />
            <path d="M10 10h6v6h-6zM10 20h6v6h-6zM20 10h6v6h-6z" fill="#1A1410" />
            <rect x="22" y="22" width="4" height="4" fill="#1A1410" />
            <rect x="20" y="20" width="2" height="2" fill="#1A1410" />
            <rect x="24" y="20" width="2" height="2" fill="#1A1410" />
            <rect x="20" y="24" width="2" height="2" fill="#1A1410" />
          </svg>
          <div className="hidden sm:block">
            <p className="font-display text-washi text-sm font-bold tracking-wider-jp uppercase leading-none">QR RESTAURANTE</p>
            <p className="font-sans text-washi/35 text-[8px] tracking-widest-jp uppercase leading-none mt-0.5">Sistema de pedidos</p>
          </div>
        </Link>

        <nav className="flex items-stretch h-14 overflow-x-auto scrollbar-hide">
          {NAV.map(item => {
            const active = item.path === '/admin'
              ? location.pathname === '/admin'
              : location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 font-sans text-[9px] tracking-widest-jp uppercase whitespace-nowrap border-b-2 transition-colors
                  ${active
                    ? 'text-washi border-beni'
                    : 'text-washi/40 border-transparent hover:text-washi/70'
                  }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="hidden lg:block font-sans text-[9px] tracking-wide text-washi/35 truncate max-w-[160px]">
            {user?.email || 'Painel Admin'}
          </span>
          <button
            onClick={handleLogout}
            className="font-sans text-[9px] tracking-widest-jp uppercase text-washi/35 hover:text-washi transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <main><Outlet /></main>
    </div>
  )
}
