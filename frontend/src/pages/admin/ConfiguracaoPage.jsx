import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import api from '../../services/api'

const inputClass =
  'w-full bg-transparent border-0 border-b border-half border-washi-dark pb-2 font-sans text-sm text-sumi outline-none placeholder:text-washi-deep focus:border-sumi transition-colors disabled:opacity-40'

function Field({ label, value, onChange, type = 'text', placeholder, disabled }) {
  return (
    <div>
      <label className="block font-sans text-[9px] tracking-widest-jp uppercase text-sumi/50 mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClass}
      />
    </div>
  )
}

export default function ConfiguracaoPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    nome: '', telefone: '', cep: '',
    logradouro: '', bairro: '', cidade: '', estado: '',
  })
  const [buscando, setBuscando] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const { data: rest, isLoading, isError, error, refetch } =
    useQuery('me', () => api.get('/api/admin/me').then(r => r.data))

  useEffect(() => {
    if (rest) setForm({
      nome:       rest.nome       || '',
      telefone:   rest.telefone   || '',
      cep:        rest.cep        || '',
      logradouro: rest.logradouro || '',
      bairro:     rest.bairro     || '',
      cidade:     rest.cidade     || '',
      estado:     rest.estado     || '',
    })
  }, [rest])

  const buscarCep = async () => {
    const cep = form.cep.replace(/\D/g, '')
    if (cep.length !== 8) { toast.error('CEP inválido'); return }
    setBuscando(true)
    try {
      const { data: d } = await api.get(`/api/cep/${cep}`)
      setForm(p => ({
        ...p,
        logradouro: d.logradouro  || '',
        bairro:     d.bairro      || '',
        cidade:     d.localidade  || '',
        estado:     d.uf          || '',
      }))
      toast.success('Endereço preenchido!')
    } catch {
      toast.error('CEP não encontrado')
    } finally {
      setBuscando(false)
    }
  }

  const salvar = useMutation(
    () => api.put('/api/admin/restaurante', form),
    {
      onSuccess: () => { qc.invalidateQueries('me'); toast.success('Configurações salvas!') },
      onError: err => {
        if (!err?.response)                    toast.error('Servidor offline.')
        else if (err.response?.status === 503) toast.error('Banco indisponível.')
        else                                   toast.error('Erro ao salvar')
      },
    }
  )

  return (
    <div className="max-w-2xl mx-auto px-7 py-10">

      <div className="flex items-end justify-between mb-8 pb-5 border-b border-half border-washi-mid">
        <div>
          <h1 className="font-display text-sumi text-3xl font-light">Configurações</h1>
          <p className="font-sans text-sumi/40 text-xs tracking-wide mt-1">Dados do seu restaurante</p>
        </div>
      </div>

      {isError && (
        <div className="border border-half border-washi-dark bg-washi-mid px-5 py-4 mb-7">
          <p className="font-sans text-sm text-sumi">
            {error?.response?.status === 503
              ? 'Banco indisponível'
              : !error?.response
              ? 'Servidor offline'
              : 'Erro ao carregar'}
          </p>
          <button
            onClick={() => refetch()}
            className="font-sans text-xs text-beni mt-1 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 rounded-full border-2 border-sumi border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-10">

          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-beni text-sm">•</span>
              <span className="font-sans text-[9px] tracking-widest-jp uppercase text-sumi/50">Informações gerais</span>
              <div className="flex-1 h-[0.5px] bg-washi-mid" />
            </div>
            <div className="space-y-5">
              <Field
                label="Nome do restaurante"
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
                placeholder="Ex: Nagoya Garden"
              />
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block font-sans text-[9px] tracking-widest-jp uppercase text-sumi/50 mb-2">E-mail</label>
                  <p className="font-sans text-sm text-sumi/40 pb-2 border-b border-half border-washi-mid">{rest?.email || '—'}</p>
                </div>
                <Field
                  label="Telefone"
                  value={form.telefone}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                    set('telefone', digits)
                  }}
                  placeholder="11999990000"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-beni text-sm">•</span>
              <span className="font-sans text-[9px] tracking-widest-jp uppercase text-sumi/50">Endereço</span>
              <div className="flex-1 h-[0.5px] bg-washi-mid" />
            </div>
            <div className="space-y-5">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Field
                    label="CEP"
                    value={form.cep}
                    onChange={e => set('cep', e.target.value)}
                    placeholder="00000-000"
                  />
                </div>
                <button
                  type="button"
                  onClick={buscarCep}
                  disabled={buscando}
                  className="font-sans text-[9px] tracking-widest-jp uppercase text-sumi/50 border border-half border-washi-dark px-4 py-2 hover:border-sumi transition-colors disabled:opacity-40 whitespace-nowrap mb-0.5"
                >
                  {buscando ? '...' : 'Buscar'}
                </button>
              </div>
              <Field
                label="Logradouro"
                value={form.logradouro}
                onChange={e => set('logradouro', e.target.value)}
                placeholder="Rua, Av., Alameda..."
              />
              <div className="grid grid-cols-3 gap-4">
                <Field label="Bairro"  value={form.bairro}  onChange={e => set('bairro',  e.target.value)} placeholder="Bairro" />
                <Field label="Cidade"  value={form.cidade}  onChange={e => set('cidade',  e.target.value)} placeholder="Cidade" />
                <Field label="UF"      value={form.estado}  onChange={e => set('estado',  e.target.value)} placeholder="SP" />
              </div>
            </div>
          </div>

          <button
            onClick={() => salvar.mutate()}
            disabled={salvar.isLoading}
            className="w-full bg-sumi text-washi font-sans text-[10px] tracking-widest-jp uppercase py-3.5 transition-opacity disabled:opacity-50"
          >
            {salvar.isLoading ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </div>
      )}
    </div>
  )
}
