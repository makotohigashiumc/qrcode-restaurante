// VerificarEmailPage.jsx
// Cole em: frontend/src/pages/admin/VerificarEmailPage.jsx
// Rota: /verificar-email/:token

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

export default function VerificarEmailPage() {
  const { token } = useParams()
  const [status, setStatus] = useState('loading') // loading | ok | erro
  const [msg, setMsg]       = useState('')

  useEffect(() => {
    fetch(`/api/verificar-email/${token}`)
      .then(r => r.json().then(d => ({ ok: r.ok, ...d })))
      .then(d => { setStatus(d.ok ? 'ok' : 'erro'); setMsg(d.mensagem || d.erro || '') })
      .catch(() => { setStatus('erro'); setMsg('Erro de conexão.') })
  }, [token])

  return (
    <div className="min-h-screen bg-creme flex items-center justify-center p-6">
      <div className="bg-white border border-creme-4 rounded-xl p-10 w-full max-w-sm text-center">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl
          ${status === 'ok' ? 'bg-green-50' : status === 'loading' ? 'bg-creme-2' : 'bg-red-50'}`}>
          {status === 'loading' ? '⏳' : status === 'ok' ? '✓' : '✕'}
        </div>
        <h1 className="font-display text-[22px] text-espresso mb-3">
          {status === 'loading' ? 'Verificando...' : status === 'ok' ? 'E-mail confirmado!' : 'Link inválido'}
        </h1>
        <p className="text-[13px] text-espresso-4 mb-6">{msg}</p>
        {status === 'ok' && (
          <Link to="/admin/login"
            className="block w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg text-[13px] font-medium text-center transition-colors">
            Ir para o login
          </Link>
        )}
        {status === 'erro' && (
          <Link to="/admin/login" className="text-[13px] text-brand-500 hover:underline">
            ← Voltar ao login
          </Link>
        )}
      </div>
    </div>
  )
}
