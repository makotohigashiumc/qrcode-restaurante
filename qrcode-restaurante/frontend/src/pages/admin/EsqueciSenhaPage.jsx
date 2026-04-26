// EsqueciSenhaPage.jsx
// Cole em: frontend/src/pages/admin/EsqueciSenhaPage.jsx
// Rota: /admin/esqueci-senha

import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function EsqueciSenhaPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const r = await fetch('/api/esqueci-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.erro || 'Erro ao processar.')
      setEnviado(true)
    } catch (err) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-creme flex items-center justify-center p-6">
      <div className="bg-white border border-creme-4 rounded-xl p-10 w-full max-w-sm">
        <h1 className="font-display text-[22px] text-espresso mb-1">Recuperar senha</h1>
        <p className="text-[13px] text-espresso-4 mb-7">
          Informe seu e-mail e enviaremos as instruções.
        </p>

        {enviado ? (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-[13px] text-green-700 mb-5">
              Enviamos as instruções para <strong>{email}</strong>.<br />
              Verifique sua caixa de entrada e a pasta de spam.
            </div>
            <Link to="/admin/login" className="text-[13px] text-brand-500 hover:underline">
              ← Voltar ao login
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-[12px] text-red-600">
                {erro}
              </div>
            )}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-widest text-espresso-4 mb-1.5">
                E-mail
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@restaurante.com" required
                className="w-full border border-creme-4 rounded-lg px-3.5 py-2.5 text-[13px] text-espresso
                           focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-espresso-4/50"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Enviar instruções'}
            </button>
            <Link to="/admin/login" className="block text-center text-[13px] text-espresso-4 hover:text-espresso mt-2">
              ← Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
