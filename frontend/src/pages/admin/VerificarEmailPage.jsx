import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../services/api'

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
        <div className="flex flex-col items-center mb-10">
          <img src="/logo-nagoya.png" alt="Nagoya Garden" className="w-14 h-14 object-contain mb-4" />
          <p className="font-display text-sumi text-lg font-bold tracking-wider-jp uppercase">NAGOYA GARDEN</p>
          <p className="font-sans text-sumi/40 text-[9px] tracking-widest-jp uppercase">Comida Japonesa</p>
        </div>

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
