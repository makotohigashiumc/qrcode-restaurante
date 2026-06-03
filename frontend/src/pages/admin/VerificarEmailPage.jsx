import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../services/api'

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

export default function VerificarEmailPage() {
  const { token }   = useParams()
  const [status, setStatus] = useState('loading')
  const [msg, setMsg]       = useState('')
  const chamado = useRef(false)

  useEffect(() => {
    if (chamado.current) return
    chamado.current = true
    api.get(`/api/verificar-email/${token}`)
      .then(r => { setStatus('ok'); setMsg(r.data.mensagem || 'E-mail confirmado!') })
      .catch(err => {
        const texto = err?.response?.data?.mensagem || err?.response?.data?.erro || ''
        const jaConfirmado = texto.toLowerCase().includes('já confirmado')
        setStatus(jaConfirmado ? 'ok' : 'erro')
        setMsg(jaConfirmado ? 'E-mail já confirmado. Você pode fazer login.' : (texto || 'Link inválido ou expirado.'))
      })
  }, [token])

  return (
    <div className="min-h-screen bg-washi flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Logo />

        <div className="border border-half border-washi-dark p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-8 h-8 rounded-full border-2 border-sumi border-t-transparent animate-spin" />
              </div>
              <p className="font-display text-sumi text-xl font-light">Verificando...</p>
            </>
          )}

          {status === 'ok' && (
            <>
              <div className="w-10 h-10 border border-half border-take flex items-center justify-center mx-auto mb-4 text-take text-lg">✓</div>
              <h2 className="font-display text-sumi text-xl font-light mb-3">E-mail confirmado!</h2>
              <p className="font-sans text-sumi/50 text-sm mb-7">{msg}</p>
              <Link to="/admin/login"
                className="block w-full bg-sumi text-washi font-sans text-[10px] tracking-widest-jp uppercase py-3.5 text-center transition-opacity">
                Ir para o login
              </Link>
            </>
          )}

          {status === 'erro' && (
            <>
              <div className="w-10 h-10 border border-half border-beni flex items-center justify-center mx-auto mb-4 text-beni text-lg">✕</div>
              <h2 className="font-display text-sumi text-xl font-light mb-3">Link inválido</h2>
              <p className="font-sans text-sumi/50 text-sm mb-7">{msg}</p>
              <Link to="/admin/login" className="block font-sans text-[10px] tracking-widest-jp uppercase text-beni hover:underline">
                ← Voltar ao login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
