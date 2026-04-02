import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ email: '', senha: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.senha) { toast.error('Preencha todos os campos'); return }
    setLoading(true)
    try {
      await login(form.email, form.senha)
      nav('/admin')
    } catch (err) {
      if (!err?.response) {
        toast.error('Servidor offline. Verifique se o backend está rodando.')
      } else if (err.response?.status === 503) {
        toast.error(err?.response?.data?.erro || 'Banco indisponível. Tente novamente.')
      } else {
        toast.error(err?.response?.data?.erro || 'Credenciais inválidas')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍴</div>
          <h1 className="text-2xl font-bold text-gray-900">Painel Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Acesso restrito ao restaurante</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="admin@restaurante.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={form.senha}
              onChange={e => setForm(p => ({ ...p, senha: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 disabled:opacity-60 transition-colors mt-2"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Novo restaurante?{' '}
          <Link to="/admin/registro" className="text-brand-600 font-medium hover:underline">Cadastre-se</Link>
        </p>

        {/* <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-400 text-center">
          Demo: admin@saborarte.com.br / admin123
        </div> */}
      </div>
    </div>
  )
}
