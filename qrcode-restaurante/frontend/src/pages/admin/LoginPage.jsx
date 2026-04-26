import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login }  = useAuth()
  const nav        = useNavigate()
  const [form, setForm]     = useState({ email: '', senha: '' })
  const [showPass, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.senha) { toast.error('Preencha todos os campos'); return }
    setLoading(true)
    try {
      await login(form.email, form.senha)
      nav('/admin')
    } catch (err) {
      if (!err?.response)                    toast.error('Servidor offline.')
      else if (err.response?.status === 503) toast.error('Banco indisponível.')
      else if (err.response?.status === 403) toast.error('Confirme seu e-mail antes de entrar.')
      else                                   toast.error(err?.response?.data?.erro || 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Painel esquerdo ── */}
      <div className="hidden md:flex flex-col justify-center px-14 bg-espresso flex-1">
        <div className="max-w-sm">
          <div className="flex items-center gap-3 mb-12">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="3" y="3" width="10" height="26" rx="2.5" fill="#C8855A"/>
              <rect x="17" y="3" width="10" height="16" rx="2.5" fill="#C8855A" opacity="0.45"/>
            </svg>
            <span className="font-display text-xl text-creme-3 tracking-wide">
              qrcode<span className="text-brand-500">restaurante</span>
            </span>
          </div>

          <h1 className="font-display text-3xl text-creme-3 leading-snug mb-5">
            Gestão de restaurante,<br />simples e em tempo real.
          </h1>

          <p className="text-[14px] text-espresso-4 leading-relaxed mb-10">
            Cardápio digital via QR code. Pedidos integrados à cozinha.
            Dashboard completo para o seu restaurante.
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-espresso-2 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="5" height="5" rx="0.8" stroke="#C8855A" strokeWidth="1.2"/>
                  <rect x="8" y="1" width="5" height="5" rx="0.8" stroke="#C8855A" strokeWidth="1.2"/>
                  <rect x="1" y="8" width="5" height="5" rx="0.8" stroke="#C8855A" strokeWidth="1.2"/>
                  <rect x="9" y="9" width="3" height="3" rx="0.4" fill="#C8855A"/>
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-medium text-creme-3">Cardápio via QR Code</p>
                <p className="text-[12px] text-espresso-4 mt-0.5">Clientes escaneiam e fazem pedidos direto da mesa</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-espresso-2 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="#C8855A" strokeWidth="1.2"/>
                  <path d="M7 4v3l2 2" stroke="#C8855A" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-medium text-creme-3">Pedidos em tempo real</p>
                <p className="text-[12px] text-espresso-4 mt-0.5">Cozinha recebe os pedidos instantaneamente</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-espresso-2 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="#C8855A" strokeWidth="1.2"/>
                  <path d="M4 7h6M4 9.5h3" stroke="#C8855A" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-medium text-creme-3">Dashboard completo</p>
                <p className="text-[12px] text-espresso-4 mt-0.5">Faturamento, pedidos e mesas em um só lugar</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Painel direito — formulário ── */}
      <div className="flex items-center justify-center w-full md:w-[440px] px-8 bg-creme flex-shrink-0">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-[24px] text-espresso mb-1">Entrar no painel</h2>
          <p className="text-[13px] text-espresso-4 mb-8">Acesso restrito ao administrador.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-widest text-espresso-4 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="admin@restaurante.com"
                autoComplete="email"
                className="w-full border border-creme-4 rounded-lg px-3.5 py-2.5 text-[13px] bg-white text-espresso
                           focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-espresso-4/50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium uppercase tracking-widest text-espresso-4">
                  Senha
                </label>
                <Link to="/admin/esqueci-senha" className="text-[12px] text-brand-500 hover:text-brand-600">
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.senha}
                  onChange={e => setForm(p => ({ ...p, senha: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="current-password"
                  className="w-full border border-creme-4 rounded-lg px-3.5 py-2.5 pr-16 text-[13px] bg-white text-espresso
                             focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-espresso-4/50"
                />
                <button
                  type="button"
                  onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-espresso-4 hover:text-espresso transition-colors"
                >
                  {showPass ? 'ocultar' : 'mostrar'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-lg text-[14px] font-medium
                         transition-colors disabled:opacity-60 mt-1"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-[13px] text-espresso-4 mt-6">
            Novo restaurante?{' '}
            <Link to="/admin/registro" className="text-brand-500 font-medium hover:underline">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
