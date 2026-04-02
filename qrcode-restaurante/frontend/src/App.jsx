import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'

// Páginas públicas
import CardapioPage from './pages/CardapioPage'
import CozinhaPage from './pages/CozinhaPage'

// Páginas admin
import LoginPage from './pages/admin/LoginPage'
import RegistroPage from './pages/admin/RegistroPage'
import DashboardPage from './pages/admin/DashboardPage'
import CardapioAdminPage from './pages/admin/CardapioAdminPage'
import MesasAdminPage from './pages/admin/MesasAdminPage'
import PedidosAdminPage from './pages/admin/PedidosAdminPage'
import ConfiguracaoPage from './pages/admin/ConfiguracaoPage'
import AdminLayout from './components/AdminLayout'

function RotaProtegida({ children }) {
  const { user, loading } = useAuth()
  const token = localStorage.getItem('token')
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>
  if (!token) return <Navigate to="/admin/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Cardápio público */}
          <Route path="/" element={<CardapioPage />} />
          {/* Painel da cozinha */}
          <Route path="/cozinha" element={<CozinhaPage />} />
          {/* Admin */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin/registro" element={<RegistroPage />} />
          <Route path="/admin" element={<RotaProtegida><AdminLayout /></RotaProtegida>}>
            <Route index element={<DashboardPage />} />
            <Route path="cardapio" element={<CardapioAdminPage />} />
            <Route path="mesas" element={<MesasAdminPage />} />
            <Route path="pedidos" element={<PedidosAdminPage />} />
            <Route path="configuracao" element={<ConfiguracaoPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
