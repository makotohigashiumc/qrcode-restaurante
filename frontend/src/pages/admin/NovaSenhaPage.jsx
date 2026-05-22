import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'

const REGRAS = [
  { label: 'Mínimo 8 caracteres',       test: s => s.length >= 8 },
  { label: 'Letra maiúscula (A-Z)',      test: s => /[A-Z]/.test(s) },
  { label: 'Letra minúscula (a-z)',      test: s => /[a-z]/.test(s) },
  { label: 'Número (0-9)',               test: s => /\d/.test(s) },
  { label: 'Caractere especial (!@#…)',  test: s => /[!@#$%^&*()\-_=+]/.test(s) },
]

export default function NovaSenhaPage() {
  const { token } = useParams()
  const nav = useNavigate()
  const [senha, setSenha]         = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [show1, setShow1]         = useState(false)
  const [show2, setShow2]         = useState(false)
  const [loading, setLoad]        = useState(false)
  const [tokenOk, setTokenOk]     = useState(null)

  useEffect(() => {
    api.get(`/api/validar-token-recuperacao/${token}`)
      .then(() => setTokenOk(true))
      .catch(() => setTokenOk(false))
  }, [token])

  const senhaValida = REGRAS.every(r => r.test(senha))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!senhaValida)         { toast.error('A senha não atende aos requisitos.'); return }
    if (senha !== confirmar)  { toast.error('Senhas não coincidem'); return }
    setLoad(true)
    try {
      await api.post('/api/nova-senha', { token, nova_senha: senha })
      toast.success('Senha redefinida!')
      nav('/admin/login')
    } catch (err) {
      toast.error(err?.response?.data?.erro || 'Erro ao redefinir senha.')
    } finally { setLoad(false) }
  }

  return (
    <div className="min-h-screen bg-washi flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <img src="/logo-makoto.png" alt="Makoto" className="w-14 h-14 object-contain mb-4" />
          <p className="font-display text-sumi text-lg font-bold tracking-wider-jp uppercase">MAKOTO</p>
          <p className="font-sans text-sumi/40 text-[9px] tracking-widest-jp uppercase">Comida Japonesa</p>
        </div>

        {tokenOk === null && (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 rounded-full border-2 border-sumi border-t-transparent animate-spin" />
          </div>
        )}

        {tokenOk === false && (
          <div className="border border-half border-washi-dark p-8 text-center">
            <div className="w-10 h-10 border border-half border-beni flex items-center justify-center mx-auto mb-4 text-beni text-lg">✕</div>
            <h2 className="font-display text-sumi text-xl font-light mb-3">Link inválido</h2>
            <p className="font-sans text-sumi/50 text-sm mb-6">Este link expirou ou já foi utilizado.</p>
            <Link to="/admin/esqueci-senha" className="block font-sans text-[9px] tracking-widest-jp uppercase text-beni hover:underline">
              Solicitar novo link →
            </Link>
          </div>
        )}

        {tokenOk === true && (
          <div className="border border-half border-washi-dark p-8">
            <h2 className="font-display text-sumi text-xl font-light mb-1">Nova senha</h2>
            <p className="font-sans text-sumi/50 text-xs tracking-wide mb-8">Escolha uma senha segura para sua conta.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block font-sans text-[9px] tracking-widest-jp uppercase text-sumi/50 mb-2">Nova senha</label>
                <div className="relative">
                  <input
                    type={show1 ? 'text' : 'password'} value={senha}
                    onChange={e => setSenha(e.target.value)} autoComplete="new-password"
                    className="w-full bg-transparent border-0 border-b border-half border-washi-dark pb-2 font-sans text-sm text-sumi outline-none placeholder:text-washi-deep focus:border-sumi transition-colors pr-16"
                  />
                  <button type="button" onClick={() => setShow1(v => !v)}
                    className="absolute right-0 top-0 font-sans text-[10px] text-sumi/40 hover:text-sumi transition-colors">
                    {show1 ? 'ocultar' : 'mostrar'}
                  </button>
                </div>
                {senha.length > 0 && (
                  <div className="border border-half border-washi-dark bg-washi-mid p-3 mt-2 space-y-1.5">
                    {REGRAS.map(r => (
                      <div key={r.label} className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.test(senha) ? 'bg-take' : 'bg-washi-dark'}`} />
                        <span className={`font-sans text-[10px] ${r.test(senha) ? 'text-take' : 'text-sumi/40'}`}>{r.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-sans text-[9px] tracking-widest-jp uppercase text-sumi/50 mb-2">Confirmar senha</label>
                <div className="relative">
                  <input
                    type={show2 ? 'text' : 'password'} value={confirmar}
                    onChange={e => setConfirmar(e.target.value)} autoComplete="new-password"
                    className="w-full bg-transparent border-0 border-b border-half border-washi-dark pb-2 font-sans text-sm text-sumi outline-none placeholder:text-washi-deep focus:border-sumi transition-colors pr-16"
                  />
                  <button type="button" onClick={() => setShow2(v => !v)}
                    className="absolute right-0 top-0 font-sans text-[10px] text-sumi/40 hover:text-sumi transition-colors">
                    {show2 ? 'ocultar' : 'mostrar'}
                  </button>
                </div>
                {confirmar.length > 0 && senha !== confirmar && (
                  <p className="font-sans text-[10px] text-beni mt-1">As senhas não coincidem.</p>
                )}
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-sumi text-washi font-sans text-[10px] tracking-widest-jp uppercase py-3.5 transition-opacity disabled:opacity-50 mt-2">
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
