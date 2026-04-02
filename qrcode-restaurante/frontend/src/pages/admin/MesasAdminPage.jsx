import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function MesasAdminPage() {
  const qc = useQueryClient()
  const [novoNumero, setNovoNumero] = useState('')
  const [qrModal, setQrModal] = useState(null)

  const { data: mesas = [], isLoading, isError, error, refetch } = useQuery('mesas',
    () => api.get('/api/mesas').then(r => r.data)
  )

  const criarMesa = useMutation(async () => {
    if (!novoNumero) { toast.error('Informe o número da mesa'); return }
    await api.post('/api/mesas', { numero: parseInt(novoNumero) })
    setNovoNumero('')
  }, {
    onSuccess: () => { qc.invalidateQueries('mesas'); toast.success('Mesa criada!') },
    onError: (err) => toast.error(err?.response?.data?.erro || 'Erro ao criar mesa'),
  })

  const deletarMesa = useMutation(async (id) => {
    if (!confirm('Remover esta mesa?')) return
    await api.delete(`/api/mesas/${id}`)
  }, {
    onSuccess: () => { qc.invalidateQueries('mesas'); toast.success('Mesa removida') },
  })

  const imprimirQR = (mesa) => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Mesa ${mesa.numero}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 40px; }
        img { width: 250px; height: 250px; }
        h2 { margin: 16px 0 4px; font-size: 28px; }
        p { color: #666; font-size: 14px; }
      </style></head>
      <body>
        <p style="font-size:18px;color:#ea580c;font-weight:600;">🍴 Escaneie para pedir</p>
        <img src="${mesa.qr_code}" />
        <h2>Mesa ${mesa.numero}</h2>
        <p>Aponte a câmera do celular para o QR Code</p>
        <script>window.onload=()=>window.print()</script>
      </body></html>
    `)
    win.document.close()
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🪑 Mesas & QR Codes</h1>
        <p className="text-sm text-gray-500">{mesas.length} mesa(s) cadastrada(s)</p>
      </div>

      {isError && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 border border-gray-100">
          <p className="font-semibold text-gray-900">
            {error?.response?.status === 503
              ? 'Banco indisponível'
              : !error?.response
                ? 'Servidor offline'
                : 'Erro ao carregar mesas'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {error?.response?.status === 503
              ? 'Tente novamente em alguns segundos.'
              : !error?.response
                ? 'Verifique se o backend está rodando.'
                : 'Não foi possível buscar as mesas.'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700"
          >
            🔄 Tentar novamente
          </button>
        </div>
      )}

      {/* Adicionar mesa */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Número da nova mesa</label>
          <input
            type="number"
            min="1"
            value={novoNumero}
            onChange={e => setNovoNumero(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && criarMesa.mutate()}
            placeholder="Ex: 10"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          onClick={() => criarMesa.mutate()}
          disabled={criarMesa.isLoading}
          className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {criarMesa.isLoading ? 'Criando...' : '+ Adicionar Mesa'}
        </button>
      </div>

      {/* Grid de mesas */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {mesas.map(mesa => (
            <div key={mesa.id} className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center gap-3 text-center">
              {mesa.qr_code ? (
                <img
                  src={mesa.qr_code}
                  alt={`QR Mesa ${mesa.numero}`}
                  className="w-24 h-24 cursor-pointer hover:scale-105 transition-transform rounded-lg"
                  onClick={() => setQrModal(mesa)}
                  title="Clique para ampliar"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300 text-3xl">
                  🔲
                </div>
              )}

              <div>
                <p className="font-bold text-gray-900 text-lg">Mesa #{mesa.numero}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${mesa.ativa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {mesa.ativa ? 'Ativa' : 'Inativa'}
                </span>
              </div>

              <div className="flex gap-2 w-full">
                {mesa.qr_code && (
                  <button
                    onClick={() => imprimirQR(mesa)}
                    className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded-lg transition-colors"
                  >
                    🖨️ Imprimir
                  </button>
                )}
                <button
                  onClick={() => deletarMesa.mutate(mesa.id)}
                  className="flex-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 py-1.5 rounded-lg transition-colors"
                >
                  🗑️ Remover
                </button>
              </div>
            </div>
          ))}

          {mesas.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">🪑</div>
              <p>Nenhuma mesa cadastrada ainda</p>
              <p className="text-sm mt-1">Adicione mesas acima para gerar os QR Codes</p>
            </div>
          )}
        </div>
      )}

      {/* Modal QR ampliado */}
      {qrModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setQrModal(null)}
        >
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-brand-600 font-semibold mb-3">🍴 Escaneie para pedir</p>
            <img src={qrModal.qr_code} alt={`QR Mesa ${qrModal.numero}`} className="w-64 h-64 mx-auto" />
            <h2 className="text-2xl font-bold mt-4">Mesa #{qrModal.numero}</h2>
            <p className="text-gray-400 text-sm mt-1">Aponte a câmera do celular para o QR Code</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => imprimirQR(qrModal)} className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-medium hover:bg-brand-700">
                🖨️ Imprimir
              </button>
              <button onClick={() => setQrModal(null)} className="flex-1 border border-gray-200 py-2.5 rounded-xl font-medium hover:bg-gray-50">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
