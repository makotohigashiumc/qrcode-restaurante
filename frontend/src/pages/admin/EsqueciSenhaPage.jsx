import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'

function Logo() {
  return (
    <div className="flex flex-col items-center mb-10">
      <svg width="48" height="48" viewBox="0 0 36 36" fill="none" className="mb-4">
        <rect width="36" height="36" rx="8" fill="#1A1410" />
        <path d="M10 10h6v6h-6zM10 20h6v6h-6zM20 10h6v6h-6z" fill="#F5F0EB" />
        <rect x="22" y="22" width="4" height="4" fill="#F5F0EB" />
        <rect x="20" y="20" width="2" height="2" fill="#F5F0EB" />
        <rect x="24" y="20" width="2" height="2" fill="#F5F0EB" />
        <rect x="20" y="24" width="2" height="2" fill="#F5F0EB" />
      </svg>
      <p className="font-display text-sumi text-lg font-bold tracking-wider-jp uppercase">QR RESTAURANTE</p>
      <p className="font-sans text-sumi/40 text-[9px] tracking-widest-jp uppercase">Sistema de pedidos</p>
    </div>
  )
}

export function EsqueciSenhaPage() {
  const [email, setEmail]   = useState('')
  const [enviado, setEnv]   = useState(false)
  const [loading, setLoad]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) { toast.error('Informe o e-mail'); return }
    setLoad(true)
    try {
      await api.post('/api/esqueci-senha', { email: email.trim().toLowerCase() })
      setEnv(true)
    } catch { toast.error('Erro ao processar. Tente novamente.') }
    finally { setLoad(false) }
  }

  return (
    <div className="min-h-screen bg-washi flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Logo />

        {enviado ? (
          <div className="border border-half border-washi-dark p-8 text-center">
            <div className="w-10 h-10 border border-half border-take flex items-center justify-center mx-auto mb-4 text-take text-lg">✓</div>
            <h2 className="font-display text-sumi text-xl font-light mb-3">E-mail enviado</h2>
            <p className="font-sans text-sumi/50 text-sm leading-relaxed mb-6">
              Se o endereço <strong className="text-sumi">{email}</strong> estiver cadastrado, você receberá as instruções em breve.
            </p>
            <p className="font-sans text-sumi/30 text-xs bg-washi-mid p-3 mb-6">Verifique também a pasta de spam.</p>
            <Link to="/admin/login" className="block font-sans text-[9px] tracking-widest-jp uppercase text-beni hover:underline">
              ← Voltar ao login
            </Link>
          </div>
        ) : (
          <div className="border border-half border-washi-dark p-8">
            <h2 className="font-display text-sumi text-xl font-light mb-1">Recuperar senha</h2>
            <p className="font-sans text-sumi/50 text-xs tracking-wide mb-8">Informe seu e-mail para receber o link.</p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block font-sans text-[9px] tracking-widest-jp uppercase text-sumi/50 mb-2">E-mail</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@seurestaurante.com.br" autoComplete="email"
                  className="w-full bg-transparent border-0 border-b border-half border-washi-dark pb-2 font-sans text-sm text-sumi outline-none placeholder:text-washi-deep focus:border-sumi transition-colors"
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-sumi text-washi font-sans text-[10px] tracking-widest-jp uppercase py-3.5 transition-opacity disabled:opacity-50">
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
            <Link to="/admin/login" className="block font-sans text-[10px] tracking-wide text-beni mt-6 hover:underline">
              ← Voltar ao login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default EsqueciSenhaPage
