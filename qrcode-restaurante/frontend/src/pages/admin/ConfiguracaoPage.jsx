import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import api from '../../services/api'

function Field({ label, type = 'text', placeholder, disabled, value, onChange }) {
  return (
    <div>
      <label className="block text-[10px] font-medium uppercase tracking-widest text-espresso-4 mb-1.5">{label}</label>
      <input
        type={type} value={value ?? ''} onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        className="w-full border border-creme-4 rounded-lg px-3.5 py-2.5 text-[13px] text-espresso
                   focus:outline-none focus:ring-2 focus:ring-brand-500
                   disabled:bg-creme disabled:text-espresso-4 placeholder:text-espresso-4/50"
      />
    </div>
  )
}

export default function ConfiguracaoPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ nome:'', telefone:'', cep:'', logradouro:'', bairro:'', cidade:'', estado:'' })
  const [buscandoCep, setBuscando] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const { data: rest, isLoading, isError, error, refetch } =
    useQuery('me', () => api.get('/api/admin/me').then(r => r.data))

  useEffect(() => {
    if (rest) setForm({
      nome: rest.nome||'', telefone: rest.telefone||'', cep: rest.cep||'',
      logradouro: rest.logradouro||'', bairro: rest.bairro||'', cidade: rest.cidade||'', estado: rest.estado||''
    })
  }, [rest])

  const buscarCep = async () => {
    const cep = form.cep.replace(/\D/g,'')
    if (cep.length !== 8) { toast.error('CEP inválido'); return }
    setBuscando(true)
    try {
      const { data: d } = await api.get(`/api/cep/${cep}`)
      setForm(p => ({ ...p, logradouro: d.logradouro||'', bairro: d.bairro||'', cidade: d.localidade||'', estado: d.uf||'' }))
      toast.success('Endereço preenchido!')
    } catch { toast.error('CEP não encontrado') }
    finally { setBuscando(false) }
  }

  const salvar = useMutation(
    () => api.put('/api/admin/restaurante', form),
    {
      onSuccess: () => { qc.invalidateQueries('me'); toast.success('Configurações salvas!') },
      onError: err => {
        if (!err?.response)                    toast.error('Servidor offline.')
        else if (err.response?.status === 503) toast.error('Banco indisponível.')
        else                                   toast.error('Erro ao salvar')
      }
    }
  )

  return (
    <div className="p-7 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-[22px] text-espresso">Configurações</h1>
        <p className="text-[12px] text-espresso-4">Dados do seu restaurante</p>
      </div>

      {isError && (
        <div className="bg-white border border-creme-4 rounded-xl p-4 mb-5">
          <p className="text-[13px] font-medium text-espresso">
            {error?.response?.status === 503 ? 'Banco indisponível' : !error?.response ? 'Servidor offline' : 'Erro ao carregar'}
          </p>
          <button onClick={() => refetch()} className="mt-1 text-[12px] text-brand-500 hover:underline">Tentar novamente</button>
        </div>
      )}

      <div className="bg-white border border-creme-4 rounded-xl p-6 space-y-6">

        {/* Informações gerais */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-espresso-4 mb-4">Informações gerais</p>
          <div className="space-y-4">
            <Field label="Nome do restaurante" value={form.nome} onChange={v => set('nome', v)} placeholder="Ex: Sabor & Arte" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-widest text-espresso-4 mb-1.5">E-mail</label>
                <input value={rest?.email || ''} disabled
                  className="w-full border border-creme-4 rounded-lg px-3.5 py-2.5 text-[13px] bg-creme text-espresso-4" />
              </div>
              <Field label="Telefone" value={form.telefone} onChange={v => set('telefone', v)} placeholder="(11) 99999-0000" />
            </div>
          </div>
        </div>

        <hr className="border-creme-3" />

        {/* Endereço */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-espresso-4">Endereço</p>
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Busca automática via ViaCEP</span>
          </div>
          <div className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Field label="CEP" value={form.cep} onChange={v => set('cep', v)} placeholder="00000-000" />
              </div>
              <button
                onClick={buscarCep} disabled={buscandoCep}
                className="bg-creme-2 hover:bg-creme-3 text-espresso-4 px-4 py-2.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {buscandoCep ? 'Buscando...' : 'Buscar CEP'}
              </button>
            </div>
            <Field label="Logradouro" value={form.logradouro} onChange={v => set('logradouro', v)} placeholder="Preenchido pelo CEP" />
            <div className="grid grid-cols-3 gap-3">
              <Field label="Bairro"  value={form.bairro}  onChange={v => set('bairro', v)}  placeholder="Bairro" />
              <Field label="Cidade"  value={form.cidade}  onChange={v => set('cidade', v)}  placeholder="Cidade" />
              <Field label="Estado"  value={form.estado}  onChange={v => set('estado', v)}  placeholder="SP" />
            </div>
          </div>
        </div>

        <hr className="border-creme-3" />

        <div className="flex justify-end">
          <button
            onClick={() => salvar.mutate()}
            disabled={salvar.isLoading || isLoading}
            className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-60"
          >
            {salvar.isLoading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>

      {/* Sobre o sistema */}
      <div className="bg-white border border-creme-4 rounded-xl p-6 mt-4">
        <p className="text-[10px] font-medium uppercase tracking-widest text-espresso-4 mb-4">Sobre o sistema</p>
        <ul className="space-y-2">
          {[
            'Autenticação via JWT (PyJWT + bcrypt)',
            'Tempo real via Flask-SocketIO / WebSocket',
            'Endereço preenchido automaticamente via ViaCEP',
            'Banco de dados PostgreSQL hospedado no Supabase',
          ].map(t => (
            <li key={t} className="flex items-center gap-2 text-[12px] text-espresso-4">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
