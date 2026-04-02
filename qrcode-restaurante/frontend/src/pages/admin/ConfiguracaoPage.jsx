import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import api from '../../services/api'

function Input({ label, type = 'text', placeholder, disabled, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-400"
      />
    </div>
  )
}

export default function ConfiguracaoPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    nome: '', telefone: '', cep: '', logradouro: '', bairro: '', cidade: '', estado: ''
  })
  const [buscandoCep, setBuscandoCep] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const { data: restaurante, isLoading, isError, error, refetch } = useQuery('me', () => api.get('/api/admin/me').then(r => r.data))

  useEffect(() => {
    if (restaurante) {
      setForm({
        nome: restaurante.nome || '',
        telefone: restaurante.telefone || '',
        cep: restaurante.cep || '',
        logradouro: restaurante.logradouro || '',
        bairro: restaurante.bairro || '',
        cidade: restaurante.cidade || '',
        estado: restaurante.estado || '',
      })
    }
  }, [restaurante])

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
      toast.success('Endereço preenchido automaticamente!')
    } catch {
      toast.error('CEP não encontrado')
    } finally {
      setBuscandoCep(false)
    }
  }

  const salvar = useMutation(
    () => api.put('/api/admin/restaurante', form),
    {
      onSuccess: () => {
        qc.invalidateQueries('me')
        toast.success('Configurações salvas!')
      },
      onError: (err) => {
        if (!err?.response) toast.error('Servidor offline. Verifique o backend.')
        else if (err.response?.status === 503) toast.error(err?.response?.data?.erro || 'Banco indisponível. Tente novamente.')
        else toast.error('Erro ao salvar')
      },
    }
  )

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Configurações</h1>
        <p className="text-sm text-gray-500">Dados do seu restaurante</p>
      </div>

      {isError && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 border border-gray-100">
          <p className="font-semibold text-gray-900">
            {error?.response?.status === 503
              ? 'Banco indisponível'
              : !error?.response
                ? 'Servidor offline'
                : 'Erro ao carregar configurações'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {error?.response?.status === 503
              ? 'Não foi possível carregar seus dados agora. Tente novamente.'
              : !error?.response
                ? 'Verifique se o backend está rodando.'
                : 'Tente novamente.'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700"
          >
            🔄 Tentar novamente
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        {/* Dados do restaurante */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Informações gerais</h2>
          <div className="space-y-4">
            <Input label="Nome do restaurante" value={form.nome} onChange={v => set('nome', v)} placeholder="Ex: Sabor & Arte" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  value={restaurante?.email || ''}
                  disabled
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400"
                />
              </div>
              <Input label="Telefone" value={form.telefone} onChange={v => set('telefone', v)} placeholder="(11) 99999-0000" />
            </div>
          </div>
        </div>

        <hr />

        {/* Endereço com ViaCEP */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
            Endereço
            <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-normal normal-case">
              🔍 Busca automática via ViaCEP
            </span>
          </h2>
          <div className="space-y-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Input label="CEP" value={form.cep} onChange={v => set('cep', v)} placeholder="00000-000" />
              </div>
              <button
                type="button"
                onClick={buscarCep}
                disabled={buscandoCep}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {buscandoCep ? '⏳ Buscando...' : '🔍 Buscar CEP'}
              </button>
            </div>
            <Input label="Logradouro" value={form.logradouro} onChange={v => set('logradouro', v)} placeholder="Preenchido pelo CEP" />
            <div className="grid grid-cols-3 gap-4">
              <Input label="Bairro" value={form.bairro} onChange={v => set('bairro', v)} placeholder="Bairro" />
              <Input label="Cidade" value={form.cidade} onChange={v => set('cidade', v)} placeholder="Cidade" />
              <Input label="Estado" value={form.estado} onChange={v => set('estado', v)} placeholder="SP" />
            </div>
          </div>
        </div>

        <hr />

        <div className="flex justify-end gap-3">
          <button
            onClick={() => salvar.mutate()}
            disabled={salvar.isLoading || isLoading}
            className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {salvar.isLoading ? 'Salvando...' : '💾 Salvar alterações'}
          </button>
        </div>
      </div>

      {/* Informações de conta */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Sobre o sistema</h2>
        <div className="space-y-2 text-sm text-gray-500">
          <p>🔐 Autenticação via JWT (PyJWT + bcrypt)</p>
          <p>📡 Tempo real via Flask-SocketIO / WebSocket</p>
          <p>📍 Endereço preenchido automaticamente pela API ViaCEP</p>
          <p>🗄️ Banco de dados PostgreSQL hospedado no Supabase</p>
        </div>
      </div>
    </div>
  )
}
