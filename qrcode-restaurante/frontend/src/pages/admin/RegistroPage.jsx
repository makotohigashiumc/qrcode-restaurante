import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'
import toast from 'react-hot-toast'

function Input({ label, value, onChange, type = 'text', placeholder, autoComplete }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  )
}

export default function RegistroPage() {
  const nav = useNavigate()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [form, setForm] = useState({
    nome: '', email: '', senha: '', confirmarSenha: '',
    telefone: '', cep: '', logradouro: '', bairro: '', cidade: '', estado: ''
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const buscarCep = async () => {
    const cep = form.cep.replace(/\D/g, '')
    if (cep.length !== 8) { toast.error('CEP inválido'); return }
    setBuscandoCep(true)
    try {
      const res = await api.get(`/api/cep/${cep}`)
      const d = res.data
      setForm(p => ({
        ...p,
        logradouro: d.logradouro || '',
        bairro: d.bairro || '',
        cidade: d.localidade || '',
        estado: d.uf || '',
      }))
      toast.success('Endereço preenchido!')
    } catch {
      toast.error('CEP não encontrado')
    } finally {
      setBuscandoCep(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.senha !== form.confirmarSenha) { toast.error('Senhas não coincidem'); return }
    setLoading(true)
    try {
      await api.post('/api/admin/registro', {
        nome: form.nome, email: form.email, senha: form.senha,
        telefone: form.telefone, cep: form.cep,
        logradouro: form.logradouro, bairro: form.bairro,
        cidade: form.cidade, estado: form.estado,
      })
      await login(form.email, form.senha)
      nav('/admin')
      toast.success('Restaurante cadastrado com sucesso!')
    } catch (err) {
      toast.error(err?.response?.data?.erro || 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🍴</div>
          <h1 className="text-2xl font-bold text-gray-900">Cadastrar Restaurante</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide pt-1">Dados do Restaurante</h3>
          <Input label="Nome do restaurante *" value={form.nome} onChange={v => set('nome', v)} placeholder="Ex: Sabor & Arte" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="E-mail *" value={form.email} onChange={v => set('email', v)} type="email" placeholder="admin@..." autoComplete="email" />
            <Input label="Telefone *" value={form.telefone} onChange={v => set('telefone', v)} placeholder="(11) 99999-0000" />
          </div>

          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide pt-2">Endereço</h3>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input label="CEP *" value={form.cep} onChange={v => set('cep', v)} placeholder="00000-000" />
            </div>
            <button
              type="button"
              onClick={buscarCep}
              disabled={buscandoCep}
              className="self-end bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {buscandoCep ? '...' : '🔍 Buscar'}
            </button>
          </div>
          <Input label="Logradouro" value={form.logradouro} onChange={v => set('logradouro', v)} placeholder="Preenchido automaticamente" />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Bairro" value={form.bairro} onChange={v => set('bairro', v)} placeholder="Bairro" />
            <Input label="Cidade" value={form.cidade} onChange={v => set('cidade', v)} placeholder="Cidade" />
            <Input label="UF" value={form.estado} onChange={v => set('estado', v)} placeholder="SP" />
          </div>

          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide pt-2">Acesso</h3>
          <Input label="Senha *" value={form.senha} onChange={v => set('senha', v)} type="password" placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
          <Input label="Confirmar senha *" value={form.confirmarSenha} onChange={v => set('confirmarSenha', v)} type="password" placeholder="••••••••" autoComplete="new-password" />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 disabled:opacity-60 transition-colors mt-2"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Já tem conta?{' '}
          <Link to="/admin/login" className="text-brand-600 font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
