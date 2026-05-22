import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { path: '/admin',              label: 'Dashboard'     },
  { path: '/admin/pedidos',      label: 'Pedidos'       },
  { path: '/admin/cardapio',     label: 'Cardápio'      },
  { path: '/admin/mesas',        label: 'Mesas'         },
  { path: '/cozinha',            label: 'Cozinha'       },
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
          <img src="/logo-makoto.png" alt="Makoto" className="w-8 h-8 object-contain" />
          <div className="hidden sm:block">
            <p className="font-display text-washi text-sm font-bold tracking-wider-jp uppercase leading-none">MAKOTO</p>
            <p className="font-sans text-washi/35 text-[8px] tracking-widest-jp uppercase leading-none mt-0.5">Comida Japonesa</p>
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
