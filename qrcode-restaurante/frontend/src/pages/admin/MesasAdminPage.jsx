import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function MesasAdminPage() {
  const qc = useQueryClient()
  const [numero, setNumero] = useState('')
  const [qrModal, setQrModal] = useState(null)

  const { data: mesas = [], isLoading, isError, error, refetch } =
    useQuery('mesas', () => api.get('/api/mesas').then(r => r.data))

  const criar = useMutation(async () => {
    if (!numero) { toast.error('Informe o número da mesa'); return }
    await api.post('/api/mesas', { numero: parseInt(numero) })
    setNumero('')
  }, {
    onSuccess: () => { qc.invalidateQueries('mesas'); toast.success('Mesa criada!') },
    onError: err => toast.error(err?.response?.data?.erro || 'Erro ao criar mesa'),
  })

  const deletar = useMutation(async id => {
    if (!confirm('Remover esta mesa?')) return
    await api.delete(`/api/mesas/${id}`)
  }, { onSuccess: () => { qc.invalidateQueries('mesas'); toast.success('Mesa removida') } })

  const imprimir = mesa => {
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>Mesa ${mesa.numero}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:40px}img{width:250px;height:250px}
      h2{margin:16px 0 4px;font-size:28px}p{color:#666;font-size:14px}</style></head>
      <body><p style="font-size:18px;color:#C8855A;font-weight:600">Escaneie para pedir</p>
      <img src="${mesa.qr_code}" /><h2>Mesa ${mesa.numero}</h2>
      <p>Aponte a câmera do celular para o QR Code</p>
      <script>window.onload=()=>window.print()</script></body></html>`)
    win.document.close()
  }

  return (
    <div className="p-7 max-w-4xl mx-auto">

      {/* Cabeçalho */}
      <div className="mb-5">
        <h1 className="font-display text-[22px] text-espresso">Mesas & QR Codes</h1>
        <p className="text-[12px] text-espresso-4">{mesas.length} mesa(s) cadastrada(s)</p>
      </div>

      {isError && (
        <div className="bg-white border border-creme-4 rounded-xl p-4 mb-4">
          <p className="text-[13px] font-medium text-espresso">
            {error?.response?.status === 503 ? 'Banco indisponível' : !error?.response ? 'Servidor offline' : 'Erro ao carregar mesas'}
          </p>
          <button onClick={() => refetch()} className="mt-1 text-[12px] text-brand-500 hover:underline">Tentar novamente</button>
        </div>
      )}

      {/* Adicionar mesa */}
      <div className="bg-white border border-creme-4 rounded-xl px-4 py-4 mb-6 flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-[10px] font-medium uppercase tracking-widest text-espresso-4 mb-1.5">
            Número da nova mesa
          </label>
          <input
            type="number" min="1" value={numero}
            onChange={e => setNumero(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && criar.mutate()}
            placeholder="Ex: 10"
            className="w-full border border-creme-4 rounded-lg px-3.5 py-2.5 text-[13px] text-espresso
                       focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-espresso-4/50"
          />
        </div>
        <button
          onClick={() => criar.mutate()}
          disabled={criar.isLoading}
          className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-60"
        >
          {criar.isLoading ? 'Criando...' : '+ Adicionar'}
        </button>
      </div>

      {/* Grid mesas */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {mesas.map(mesa => (
            <div key={mesa.id} className="bg-white border border-creme-4 rounded-xl p-4 flex flex-col items-center gap-3 text-center">
              {mesa.qr_code ? (
                <img
                  src={mesa.qr_code}
                  alt={`QR Mesa ${mesa.numero}`}
                  className="w-20 h-20 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setQrModal(mesa)}
                />
              ) : (
                <div className="w-20 h-20 bg-creme-2 rounded-lg flex items-center justify-center text-espresso-4 text-[11px]">
                  Sem QR
                </div>
              )}
              <div>
                <p className="font-medium text-espresso text-[15px]">Mesa #{mesa.numero}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                  ${mesa.ativa ? 'bg-green-50 text-green-700' : 'bg-creme-2 text-espresso-4'}`}>
                  {mesa.ativa ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <div className="flex gap-1.5 w-full">
                {mesa.qr_code && (
                  <button onClick={() => imprimir(mesa)}
                    className="flex-1 text-[11px] bg-creme-2 hover:bg-creme-3 text-espresso-4 py-1.5 rounded-lg transition-colors">
                    Imprimir
                  </button>
                )}
                <button onClick={() => deletar.mutate(mesa.id)}
                  className="flex-1 text-[11px] bg-red-50 hover:bg-red-100 text-red-600 py-1.5 rounded-lg transition-colors">
                  Remover
                </button>
              </div>
            </div>
          ))}
          {mesas.length === 0 && (
            <div className="col-span-full text-center py-16 text-espresso-4 text-[13px]">
              Nenhuma mesa cadastrada ainda.<br />
              <span className="text-[12px]">Adicione mesas acima para gerar os QR Codes.</span>
            </div>
          )}
        </div>
      )}

      {/* Modal QR ampliado */}
      {qrModal && (
        <div className="fixed inset-0 bg-espresso/70 z-50 flex items-center justify-center p-4" onClick={() => setQrModal(null)}>
          <div className="bg-white rounded-xl p-8 text-center border border-creme-4" onClick={e => e.stopPropagation()}>
            <p className="text-[13px] text-brand-500 font-medium mb-4">Escaneie para pedir</p>
            <img src={qrModal.qr_code} alt={`QR Mesa ${qrModal.numero}`} className="w-56 h-56 mx-auto rounded-lg" />
            <h2 className="font-display text-[22px] text-espresso mt-4">Mesa #{qrModal.numero}</h2>
            <p className="text-[12px] text-espresso-4 mt-1">Aponte a câmera do celular</p>
            <div className="flex gap-2.5 mt-5">
              <button onClick={() => imprimir(qrModal)}
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg text-[13px] font-medium transition-colors">
                Imprimir
              </button>
              <button onClick={() => setQrModal(null)}
                className="flex-1 border border-creme-4 py-2.5 rounded-lg text-[13px] text-espresso-4 hover:bg-creme transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
