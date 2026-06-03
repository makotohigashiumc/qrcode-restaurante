import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

function Logo({ dark = false }) {
  return (
    <div className="flex items-center gap-3">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="8" fill={dark ? '#F5F0EB' : '#1A1410'} />
        <path d="M10 10h6v6h-6zM10 20h6v6h-6zM20 10h6v6h-6z" fill={dark ? '#1A1410' : '#F5F0EB'} />
        <rect x="22" y="22" width="4" height="4" fill={dark ? '#1A1410' : '#F5F0EB'} />
        <rect x="20" y="20" width="2" height="2" fill={dark ? '#1A1410' : '#F5F0EB'} />
        <rect x="24" y="20" width="2" height="2" fill={dark ? '#1A1410' : '#F5F0EB'} />
        <rect x="20" y="24" width="2" height="2" fill={dark ? '#1A1410' : '#F5F0EB'} />
      </svg>
      <div>
        <p className={`font-display text-lg font-bold uppercase tracking-widest-jp ${dark ? 'text-sumi' : 'text-washi'}`}>
          QR RESTAURANTE
        </p>
        <p className={`font-sans text-[9px] tracking-widest-jp uppercase ${dark ? 'text-sumi/40' : 'text-washi/40'}`}>
          Sistema de pedidos
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { login }  = useAuth()
  const nav        = useNavigate()
  const [form, setForm]       = useState({ email: '', senha: '' })
  const [showPass, setShow]   = useState(false)
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
    <div className="min-h-screen bg-washi flex">

      <div className="hidden md:flex flex-col justify-between flex-1 px-14 py-12 bg-sumi">
        <Logo dark={false} />

        <div>
          <h1 className="font-display text-washi text-4xl font-light leading-snug mb-6">
            Gerencie seu<br />restaurante com<br /><span className="text-beni font-semibold">simplicidade.</span>
          </h1>
          <p className="font-sans text-washi/40 text-xs leading-relaxed tracking-wide max-w-xs">
            Cardápio digital, gestão de pedidos em tempo real e relatórios por mesa — tudo em um só painel.
          </p>
        </div>

        <p className="font-sans text-washi/20 text-[9px] tracking-widest-jp uppercase">
          QR Restaurante — Sistema de gestão
        </p>
      </div>

      <div className="flex items-center justify-center w-full md:w-[440px] px-10 py-12 bg-washi flex-shrink-0">
        <div className="w-full max-w-sm">

          <div className="flex md:hidden items-center gap-3 mb-10">
            <Logo dark={true} />
          </div>

          <h2 className="font-display text-sumi text-2xl font-light mb-1">Acesso ao painel</h2>
          <p className="font-sans text-sumi/50 text-xs tracking-wide mb-9">Restrito ao administrador</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-sans text-[9px] tracking-widest-jp uppercase text-sumi/50 mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="admin@seurestaurante.com.br"
                autoComplete="email"
                className="w-full bg-transparent border-0 border-b border-half border-washi-dark pb-2 font-sans text-sm text-sumi outline-none placeholder:text-washi-deep focus:border-sumi transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-sans text-[9px] tracking-widest-jp uppercase text-sumi/50">
                  Senha
                </label>
                <Link to="/admin/esqueci-senha" className="font-sans text-[10px] text-beni hover:text-beni-mid transition-colors">
                  Esqueceu? Recuperar →
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.senha}
                  onChange={e => setForm(p => ({ ...p, senha: e.target.value }))}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-transparent border-0 border-b border-half border-washi-dark pb-2 font-sans text-sm text-sumi outline-none placeholder:text-washi-deep focus:border-sumi transition-colors pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShow(v => !v)}
                  className="absolute right-0 top-0 font-sans text-[10px] text-sumi/40 hover:text-sumi transition-colors"
                >
                  {showPass ? 'ocultar' : 'mostrar'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sumi text-washi font-sans text-[10px] tracking-widest-jp uppercase py-3.5 transition-opacity disabled:opacity-50 mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar no painel'}
            </button>
          </form>

          <p className="font-sans text-center text-xs text-sumi/40 mt-8">
            Novo restaurante?{' '}
            <Link to="/admin/registro" className="text-beni hover:text-beni-mid transition-colors">
              Cadastre-se aqui
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
