import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

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
        {/* Logo */}
        <div className="flex items-center gap-4">
          <img src="/logo-makoto.png" alt="Makoto" className="w-12 h-12 object-contain" />
          <div>
            <p className="font-display text-washi tracking-wider-jp text-lg font-bold uppercase">MAKOTO</p>
            <p className="font-sans text-washi/40 text-[9px] tracking-widest-jp uppercase">Comida Japonesa</p>
          </div>
        </div>

        {/* Frase central */}
        <div>
          <h1 className="font-display text-washi text-4xl font-light leading-snug mb-6">
            Sabor que<br /><span className="text-beni font-semibold">honra</span><br />a tradição.
          </h1>
          <p className="font-sans text-washi/40 text-xs leading-relaxed tracking-wide max-w-xs">
            Cardápio digital, gestão de pedidos em tempo real e relatórios por mesa — tudo em um só painel.
          </p>
        </div>

        {/* Rodapé */}
        <p className="font-sans text-washi/20 text-[9px] tracking-widest-jp uppercase">
          Sistema de gestão — Makoto Restaurante
        </p>
      </div>

      <div className="flex items-center justify-center w-full md:w-[440px] px-10 py-12 bg-washi flex-shrink-0">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="flex md:hidden items-center gap-3 mb-10">
            <img src="/logo-makoto.png" alt="Makoto" className="w-10 h-10 object-contain" />
            <div>
              <p className="font-display text-sumi tracking-wider-jp text-base font-bold uppercase">MAKOTO</p>
              <p className="font-sans text-sumi/40 text-[9px] tracking-widest-jp uppercase">Comida Japonesa</p>
            </div>
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
                placeholder="admin@makoto.com.br"
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
