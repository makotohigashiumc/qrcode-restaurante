// NovaSenhaPage.jsx
// Cole em: frontend/src/pages/admin/NovaSenhaPage.jsx
// Rota: /admin/nova-senha/:token

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

function RuleDot({ ok }) {
  return <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 inline-block ${ok ? 'bg-green-500' : 'bg-creme-4'}`} />
}

export default function NovaSenhaPage() {
  const { token }             = useParams()
  const navigate              = useNavigate()
  const [valido, setValido]   = useState(null) // null=checando, true, false
  const [senha, setSenha]     = useState('')
  const [confirma, setConf]   = useState('')
  const [show1, setShow1]     = useState(false)
  const [show2, setShow2]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState('')
  const [ok, setOk]           = useState(false)

  // Regras de senha (RF04) — validação em tempo real
  const regras = [
    { label: 'Mínimo 8 caracteres',      ok: senha.length >= 8 },
    { label: 'Letra maiúscula (A-Z)',     ok: /[A-Z]/.test(senha) },
    { label: 'Letra minúscula (a-z)',     ok: /[a-z]/.test(senha) },
    { label: 'Número (0-9)',              ok: /\d/.test(senha) },
    { label: 'Caractere especial (!@#…)', ok: /[!@#$%^&*()\-_=+]/.test(senha) },
  ]

  useEffect(() => {
    fetch(`/api/validar-token-recuperacao/${token}`)
      .then(r => r.json().then(d => ({ ok: r.ok, ...d })))
      .then(d => setValido(d.ok && d.valido))
      .catch(() => setValido(false))
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (senha !== confirma) { setErro('As senhas não coincidem.'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/nova-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nova_senha: senha }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detalhes ? d.detalhes.join(' ') : (d.erro || 'Erro.'))
      setOk(true)
      setTimeout(() => navigate('/admin/login'), 2500)
    } catch (err) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (valido === null) return (
    <div className="min-h-screen bg-creme flex items-center justify-center">
      <p className="text-[13px] text-espresso-4">Validando link...</p>
    </div>
  )

  if (!valido) return (
    <div className="min-h-screen bg-creme flex items-center justify-center p-6">
      <div className="bg-white border border-creme-4 rounded-xl p-10 w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5 text-2xl">✕</div>
        <h1 className="font-display text-[20px] text-espresso mb-3">Link inválido ou expirado</h1>
        <Link to="/admin/esqueci-senha"
          className="block w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg text-[13px] font-medium text-center transition-colors">
          Solicitar novo link
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-creme flex items-center justify-center p-6">
      <div className="bg-white border border-creme-4 rounded-xl p-10 w-full max-w-sm">
        <h1 className="font-display text-[22px] text-espresso mb-1">Nova senha</h1>
        <p className="text-[13px] text-espresso-4 mb-6">Escolha uma senha forte para sua conta.</p>

        {ok ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-[13px] text-green-700 text-center">
            Senha redefinida! Redirecionando...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-[12px] text-red-600">{erro}</div>
            )}

            {/* Indicador de regras — RF04 */}
            {senha.length > 0 && (
              <div className="bg-creme-2 rounded-lg p-3 space-y-1.5">
                {regras.map(r => (
                  <div key={r.label} className="flex items-center gap-2">
                    <RuleDot ok={r.ok} />
                    <span className={`text-[11px] ${r.ok ? 'text-green-700' : 'text-espresso-4'}`}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Nova senha */}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-widest text-espresso-4 mb-1.5">
                Nova senha
              </label>
              <div className="relative">
                <input
                  type={show1 ? 'text' : 'password'} value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="Mínimo 8 caracteres" required
                  className="w-full border border-creme-4 rounded-lg px-3.5 py-2.5 pr-16 text-[13px] text-espresso
                             focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-espresso-4/50"
                />
                <button type="button" onClick={() => setShow1(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-espresso-4 hover:text-espresso">
                  {show1 ? 'ocultar' : 'mostrar'}
                </button>
              </div>
            </div>

            {/* Confirmar senha */}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-widest text-espresso-4 mb-1.5">
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  type={show2 ? 'text' : 'password'} value={confirma}
                  onChange={e => setConf(e.target.value)}
                  placeholder="Repita a senha" required
                  className="w-full border border-creme-4 rounded-lg px-3.5 py-2.5 pr-16 text-[13px] text-espresso
                             focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-espresso-4/50"
                />
                <button type="button" onClick={() => setShow2(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-espresso-4 hover:text-espresso">
                  {show2 ? 'ocultar' : 'mostrar'}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-60"
            >
              {loading ? 'Salvando...' : 'Definir nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
