// App.jsx — ATUALIZADO com rotas RF02 e RF05
// Substitui o App.jsx atual do projeto

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'

// Páginas públicas
import CardapioPage           from './pages/CardapioPage'
import CozinhaPage            from './pages/CozinhaPage'
import PoliticaPrivacidadePage from './pages/PoliticaPrivacidadePage'

// Páginas admin
import LoginPage              from './pages/admin/LoginPage'
import RegistroPage           from './pages/admin/RegistroPage'
import DashboardPage          from './pages/admin/DashboardPage'
import CardapioAdminPage      from './pages/admin/CardapioAdminPage'
import MesasAdminPage         from './pages/admin/MesasAdminPage'
import PedidosAdminPage       from './pages/admin/PedidosAdminPage'
import ConfiguracaoPage       from './pages/admin/ConfiguracaoPage'
import AdminLayout            from './components/AdminLayout'

// ── NOVAS PÁGINAS RF02 + RF05 ──
import VerificarEmailPage     from './pages/admin/VerificarEmailPage'
import EsqueciSenhaPage       from './pages/admin/EsqueciSenhaPage'
import NovaSenhaPage          from './pages/admin/NovaSenhaPage'

function RotaProtegida({ children }) {
  const { user, loading } = useAuth()
  const token = localStorage.getItem('token')
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    </div>
  )
  if (!token) return <Navigate to="/admin/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Cardápio público */}
          <Route path="/"                         element={<CardapioPage />} />
          {/* Cozinha */}
          <Route path="/cozinha"                  element={<CozinhaPage />} />
          {/* Políticas */}
          <Route path="/politica-de-privacidade"  element={<PoliticaPrivacidadePage />} />

          {/* Auth públicas */}
          <Route path="/admin/login"              element={<LoginPage />} />
          <Route path="/admin/registro"           element={<RegistroPage />} />
          <Route path="/admin/esqueci-senha"      element={<EsqueciSenhaPage />} />
          <Route path="/admin/nova-senha/:token"  element={<NovaSenhaPage />} />
          <Route path="/verificar-email/:token"   element={<VerificarEmailPage />} />

          {/* Admin protegido */}
          <Route path="/admin" element={<RotaProtegida><AdminLayout /></RotaProtegida>}>
            <Route index                          element={<DashboardPage />} />
            <Route path="cardapio"                element={<CardapioAdminPage />} />
            <Route path="mesas"                   element={<MesasAdminPage />} />
            <Route path="pedidos"                 element={<PedidosAdminPage />} />
            <Route path="configuracao"            element={<ConfiguracaoPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
