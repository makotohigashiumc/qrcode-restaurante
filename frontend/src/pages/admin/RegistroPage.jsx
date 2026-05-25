import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'

const REGRAS = [
  { label: 'Mínimo 8 caracteres',       test: s => s.length >= 8 },
  { label: 'Letra maiúscula (A-Z)',      test: s => /[A-Z]/.test(s) },
  { label: 'Letra minúscula (a-z)',      test: s => /[a-z]/.test(s) },
  { label: 'Número (0-9)',               test: s => /\d/.test(s) },
  { label: 'Caractere especial (!@#…)',  test: s => /[!@#$%^&*()\-_=+]/.test(s) },
]

function SenhaField({ label, value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block font-sans text-[9px] tracking-widest-jp uppercase text-sumi/50 mb-2">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder} autoComplete={autoComplete}
          className="w-full bg-transparent border-0 border-b border-half border-washi-dark pb-2 font-sans text-sm text-sumi outline-none placeholder:text-washi-deep focus:border-sumi transition-colors pr-16"
        />
        <button type="button" onClick={() => setShow(v => !v)}
          className="absolute right-0 top-0 font-sans text-[10px] text-sumi/40 hover:text-sumi transition-colors">
          {show ? 'ocultar' : 'mostrar'}
        </button>
      </div>
    </div>
  )
}

function SenhaRules({ senha }) {
  return (
    <div className="border border-half border-washi-dark bg-washi-mid p-3 mt-2 space-y-1.5">
      {REGRAS.map(r => (
        <div key={r.label} className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.test(senha) ? 'bg-take' : 'bg-washi-dark'}`} />
          <span className={`font-sans text-[10px] ${r.test(senha) ? 'text-take' : 'text-sumi/40'}`}>{r.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function RegistroPage() {
  const nav = useNavigate()
  const [loading, setLoading]       = useState(false)
  const [buscando, setBuscando]     = useState(false)
  const [aceite, setAceite]         = useState(false)
  const [cadastrado, setCadastrado] = useState(false)
  const [form, setForm] = useState({
    nome: '', email: '', senha: '', confirmar: '',
    telefone: '', cep: '', logradouro: '', bairro: '', cidade: '', estado: ''
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const senhaValida = REGRAS.every(r => r.test(form.senha))

  const buscarCep = async () => {
    const cep = form.cep.replace(/\D/g, '')
    if (cep.length !== 8) { toast.error('CEP inválido'); return }
    setBuscando(true)
    try {
      const { data: d } = await api.get(`/api/cep/${cep}`)
      setForm(p => ({ ...p, logradouro: d.logradouro||'', bairro: d.bairro||'', cidade: d.localidade||'', estado: d.uf||'' }))
      toast.success('Endereço preenchido!')
    } catch { toast.error('CEP não encontrado') }
    finally { setBuscando(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!senhaValida)                    { toast.error('A senha não atende aos requisitos.'); return }
    if (form.senha !== form.confirmar)   { toast.error('Senhas não coincidem'); return }
    if (!aceite)                         { toast.error('Aceite a Política de Privacidade'); return }
    setLoading(true)
    try {
      await api.post('/api/admin/registro', {
        nome: form.nome, email: form.email, senha: form.senha,
        telefone: form.telefone, cep: form.cep,
        logradouro: form.logradouro, bairro: form.bairro,
        cidade: form.cidade, estado: form.estado,
      })
      setCadastrado(true)
    } catch (err) {
      toast.error(err?.response?.data?.erro || 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  const Field = ({ label, k, type='text', placeholder, disabled }) => (
    <div>
      <label className="block font-sans text-[9px] tracking-widest-jp uppercase text-sumi/50 mb-2">{label}</label>
      <input type={type} value={form[k]||''} onChange={e => set(k, e.target.value)}
        placeholder={placeholder} disabled={disabled}
        className="w-full bg-transparent border-0 border-b border-half border-washi-dark pb-2 font-sans text-sm text-sumi outline-none placeholder:text-washi-deep focus:border-sumi transition-colors disabled:opacity-40" />
    </div>
  )

  return (
    <div className="min-h-screen bg-washi flex">
      {/* Painel esquerdo */}
      <div className="hidden md:flex flex-col justify-between flex-1 px-14 py-12 bg-sumi">
        <div className="flex items-center gap-4">
          <img src="/logo-nagoya.png" alt="Nagoya Garden" className="w-12 h-12 object-contain" />
          <div>
            <p className="font-display text-washi tracking-wider-jp text-lg font-bold uppercase">NAGOYA GARDEN</p>
            <p className="font-sans text-washi/40 text-[9px] tracking-widest-jp uppercase">Comida Japonesa</p>
          </div>
        </div>
        <div>
          <h1 className="font-display text-washi text-4xl font-light leading-snug mb-6">
            Comece a usar<br />em <span className="text-beni font-semibold">minutos.</span>
          </h1>
          <p className="font-sans text-washi/40 text-xs leading-relaxed max-w-xs">
            Cadastre seu restaurante e tenha cardápio digital, gestão de pedidos e painel da cozinha funcionando hoje.
          </p>
        </div>
        <p className="font-sans text-washi/20 text-[9px] tracking-widest-jp uppercase">Sistema de gestão — Nagoya Garden</p>
      </div>

      {/* Formulário */}
      <div className="flex items-start justify-center w-full md:w-[500px] px-10 py-12 bg-washi flex-shrink-0 overflow-y-auto">
        <div className="w-full max-w-sm">
          {cadastrado ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 border border-half border-take flex items-center justify-center mx-auto mb-5 text-take text-2xl">✓</div>
              <h2 className="font-display text-sumi text-2xl font-light mb-3">Cadastro realizado!</h2>
              <p className="font-sans text-sumi/50 text-sm leading-relaxed mb-4">
                Enviamos um link de confirmação para <strong className="text-sumi">{form.email}</strong>.
                Clique em <strong className="text-sumi">"Confirmar e-mail"</strong> para ativar sua conta.
              </p>
              <p className="font-sans text-sumi/35 text-xs bg-washi-mid p-3 mb-6">
                Não recebeu? Verifique a pasta de spam.
              </p>
              <Link to="/admin/login"
                className="block w-full bg-sumi text-washi font-sans text-[10px] tracking-widest-jp uppercase py-3.5 text-center transition-opacity">
                Ir para o login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-display text-sumi text-2xl font-light mb-1">Cadastrar restaurante</h2>
              <p className="font-sans text-sumi/50 text-xs tracking-wide mb-9">Preencha os dados para criar sua conta.</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <p className="font-sans text-[9px] tracking-widest-jp uppercase text-sumi/35 pt-1">Dados do restaurante</p>
                <Field label="Nome do restaurante *" k="nome" placeholder="Ex: Nagoya Garden" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="E-mail *" k="email" type="email" placeholder="admin@..." />
                  <Field label="Telefone *" k="telefone" placeholder="(11) 99999-0000" />
                </div>

                <p className="font-sans text-[9px] tracking-widest-jp uppercase text-sumi/35 pt-2">Endereço</p>
                <div className="flex gap-3 items-end">
                  <div className="flex-1"><Field label="CEP *" k="cep" placeholder="00000-000" /></div>
                  <button type="button" onClick={buscarCep} disabled={buscando}
                    className="font-sans text-[9px] tracking-widest-jp uppercase text-sumi/50 border border-half border-washi-dark px-3 py-2 hover:border-sumi transition-colors disabled:opacity-40 whitespace-nowrap mb-0.5">
                    {buscando ? '...' : 'Buscar'}
                  </button>
                </div>
                <Field label="Logradouro" k="logradouro" placeholder="Preenchido automaticamente" disabled={!!form.logradouro} />
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Bairro" k="bairro" placeholder="Bairro" />
                  <Field label="Cidade" k="cidade" placeholder="Cidade" />
                  <Field label="UF" k="estado" placeholder="SP" />
                </div>

                <p className="font-sans text-[9px] tracking-widest-jp uppercase text-sumi/35 pt-2">Acesso</p>
                <div>
                  <SenhaField label="Senha *" value={form.senha} onChange={v => set('senha', v)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
                  {form.senha.length > 0 && <SenhaRules senha={form.senha} />}
                </div>
                <SenhaField label="Confirmar senha *" value={form.confirmar} onChange={v => set('confirmar', v)} placeholder="Repita a senha" autoComplete="new-password" />
                {form.confirmar.length > 0 && form.senha !== form.confirmar && (
                  <p className="font-sans text-[10px] text-beni">As senhas não coincidem.</p>
                )}

                <div className="flex items-start gap-3 pt-1">
                  <input type="checkbox" id="politica" checked={aceite} onChange={e => setAceite(e.target.checked)} className="accent-beni w-4 h-4 mt-0.5 flex-shrink-0" />
                  <label htmlFor="politica" className="font-sans text-xs text-sumi/50 leading-relaxed">
                    Li e concordo com a{' '}
                    <Link to="/politica-de-privacidade" target="_blank" className="text-beni hover:underline">Política de Privacidade</Link>
                    , em conformidade com a LGPD (Lei nº 13.709/2018).
                  </label>
                </div>

                <button type="submit" disabled={loading || !aceite}
                  className="w-full bg-sumi text-washi font-sans text-[10px] tracking-widest-jp uppercase py-3.5 transition-opacity disabled:opacity-50 mt-1">
                  {loading ? 'Cadastrando...' : 'Cadastrar'}
                </button>
              </form>

              <p className="font-sans text-center text-xs text-sumi/40 mt-8">
                Já tem conta?{' '}
                <Link to="/admin/login" className="text-beni hover:underline">Entrar</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
