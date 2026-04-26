import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'

const REGRAS = [
  { label: 'Mínimo 8 caracteres',      test: s => s.length >= 8 },
  { label: 'Letra maiúscula (A-Z)',     test: s => /[A-Z]/.test(s) },
  { label: 'Letra minúscula (a-z)',     test: s => /[a-z]/.test(s) },
  { label: 'Número (0-9)',              test: s => /\d/.test(s) },
  { label: 'Caractere especial (!@#…)', test: s => /[!@#$%^&*()\-_=+]/.test(s) },
]

function SenhaRules({ senha }) {
  return (
    <div className="bg-creme-2 border border-creme-4 rounded-lg p-3 space-y-1.5 mt-2">
      {REGRAS.map(r => (
        <div key={r.label} className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 inline-block ${r.test(senha) ? 'bg-green-500' : 'bg-creme-4'}`} />
          <span className={`text-[11px] ${r.test(senha) ? 'text-green-700' : 'text-espresso-4'}`}>{r.label}</span>
        </div>
      ))}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, autoComplete }) {
  return (
    <div>
      <label className="block text-[10px] font-medium uppercase tracking-widest text-espresso-4 mb-1.5">{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete}
        className="w-full border border-creme-4 rounded-lg px-3.5 py-2.5 text-[13px] text-espresso focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-espresso-4/50 bg-white"
      />
    </div>
  )
}

function SenhaField({ label, value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-[10px] font-medium uppercase tracking-widest text-espresso-4 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder} autoComplete={autoComplete}
          className="w-full border border-creme-4 rounded-lg px-3.5 py-2.5 pr-16 text-[13px] text-espresso focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-espresso-4/50 bg-white"
        />
        <button type="button" onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-espresso-4 hover:text-espresso transition-colors">
          {show ? 'ocultar' : 'mostrar'}
        </button>
      </div>
    </div>
  )
}

export default function RegistroPage() {
  const nav = useNavigate()
  const [loading, setLoading]        = useState(false)
  const [buscandoCep, setBuscando]   = useState(false)
  const [aceitouPolitica, setAceite] = useState(false)
  const [cadastrado, setCadastrado]  = useState(false)
  const [form, setForm] = useState({
    nome: '', email: '', senha: '', confirmarSenha: '',
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
    finally  { setBuscando(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!senhaValida)                       { toast.error('A senha não atende aos requisitos.'); return }
    if (form.senha !== form.confirmarSenha) { toast.error('Senhas não coincidem'); return }
    if (!aceitouPolitica)                   { toast.error('Aceite a Política de Privacidade'); return }
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

  return (
    <div className="min-h-screen flex">

      {/* Painel esquerdo */}
      <div className="hidden md:flex flex-col justify-center px-14 bg-espresso flex-1">
        <div className="max-w-sm">
          <div className="flex items-center gap-3 mb-12">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="3" y="3" width="10" height="26" rx="2.5" fill="#C8855A"/>
              <rect x="17" y="3" width="10" height="16" rx="2.5" fill="#C8855A" opacity="0.45"/>
            </svg>
            <span className="font-display text-xl text-creme-3 tracking-wide">
              qrcode<span className="text-brand-500">restaurante</span>
            </span>
          </div>
          <h1 className="font-display text-3xl text-creme-3 leading-snug mb-4">
            Comece a usar<br />em minutos.
          </h1>
          <p className="text-[14px] text-espresso-4 leading-relaxed">
            Cadastre seu restaurante e tenha cardápio digital,
            gestão de pedidos e painel da cozinha funcionando hoje.
          </p>
        </div>
      </div>

      {/* Painel direito */}
      <div className="flex items-start justify-center w-full md:w-[500px] px-8 py-10 bg-creme flex-shrink-0 overflow-y-auto">
        <div className="w-full max-w-sm">

          {cadastrado ? (
            /* Tela de sucesso */
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5 text-3xl">✓</div>
              <h2 className="font-display text-[22px] text-espresso mb-3">Cadastro realizado!</h2>
              <p className="text-[13px] text-espresso-4 leading-relaxed mb-4">
                Enviamos um link de confirmação para <strong>{form.email}</strong>.
                Acesse seu e-mail e clique em <strong>"Confirmar e-mail"</strong> para ativar sua conta.
              </p>
              <p className="text-[11px] text-espresso-4 bg-creme-2 rounded-lg p-3 mb-6">
                Não recebeu? Verifique a pasta de spam.
              </p>
              <Link to="/admin/login"
                className="block w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg text-[13px] font-medium text-center transition-colors">
                Ir para o login
              </Link>
            </div>
          ) : (
            /* Formulário de cadastro */
            <>
              <h2 className="font-display text-[22px] text-espresso mb-1">Cadastrar restaurante</h2>
              <p className="text-[13px] text-espresso-4 mb-7">Preencha os dados para criar sua conta.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-[10px] font-medium uppercase tracking-widest text-espresso-4 pt-1">Dados do restaurante</p>

                <Field label="Nome do restaurante *" value={form.nome} onChange={v => set('nome', v)} placeholder="Ex: Sabor & Arte" />

                <div className="grid grid-cols-2 gap-3">
                  <Field label="E-mail *"   value={form.email}    onChange={v => set('email', v)}    type="email" placeholder="admin@..."        autoComplete="email" />
                  <Field label="Telefone *" value={form.telefone} onChange={v => set('telefone', v)} placeholder="(11) 99999-0000" />
                </div>

                <p className="text-[10px] font-medium uppercase tracking-widest text-espresso-4 pt-2">Endereço</p>

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Field label="CEP *" value={form.cep} onChange={v => set('cep', v)} placeholder="00000-000" />
                  </div>
                  <button type="button" onClick={buscarCep} disabled={buscandoCep}
                    className="self-end bg-creme-2 hover:bg-creme-3 text-espresso-4 px-3.5 py-2.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-60 whitespace-nowrap">
                    {buscandoCep ? '...' : 'Buscar'}
                  </button>
                </div>

                <Field label="Logradouro" value={form.logradouro} onChange={v => set('logradouro', v)} placeholder="Preenchido automaticamente" />

                <div className="grid grid-cols-3 gap-2">
                  <Field label="Bairro" value={form.bairro} onChange={v => set('bairro', v)} placeholder="Bairro" />
                  <Field label="Cidade" value={form.cidade} onChange={v => set('cidade', v)} placeholder="Cidade" />
                  <Field label="UF"     value={form.estado} onChange={v => set('estado', v)} placeholder="SP" />
                </div>

                <p className="text-[10px] font-medium uppercase tracking-widest text-espresso-4 pt-2">Acesso</p>

                <div>
                  <SenhaField label="Senha *" value={form.senha} onChange={v => set('senha', v)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
                  {form.senha.length > 0 && <SenhaRules senha={form.senha} />}
                </div>

                <SenhaField label="Confirmar senha *" value={form.confirmarSenha} onChange={v => set('confirmarSenha', v)} placeholder="Repita a senha" autoComplete="new-password" />

                {form.confirmarSenha.length > 0 && form.senha !== form.confirmarSenha && (
                  <p className="text-[11px] text-red-500">As senhas não coincidem.</p>
                )}

                <div className="flex items-start gap-3 pt-1">
                  <input type="checkbox" id="politica" checked={aceitouPolitica} onChange={e => setAceite(e.target.checked)}
                    className="accent-brand-500 w-4 h-4 mt-0.5 flex-shrink-0" />
                  <label htmlFor="politica" className="text-[12px] text-espresso-4 leading-relaxed">
                    Li e concordo com a{' '}
                    <Link to="/politica-de-privacidade" target="_blank" className="text-brand-500 hover:underline font-medium">
                      Política de Privacidade
                    </Link>
                    , em conformidade com a LGPD (Lei nº 13.709/2018).
                  </label>
                </div>

                <button type="submit" disabled={loading || !aceitouPolitica}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-60 mt-1">
                  {loading ? 'Cadastrando...' : 'Cadastrar'}
                </button>
              </form>

              <p className="text-center text-[13px] text-espresso-4 mt-5">
                Já tem conta?{' '}
                <Link to="/admin/login" className="text-brand-500 font-medium hover:underline">Entrar</Link>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
