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
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;700&family=Outfit:wght@400;500&display=swap');
        body{font-family:'Outfit',sans-serif;text-align:center;padding:48px;background:#F5F0EB;color:#1A1410;}
        img{width:220px;height:220px;border:0.5px solid #D6CAB8;}
        h2{font-family:'Noto Serif JP',serif;font-size:32px;font-weight:700;margin:16px 0 4px;letter-spacing:0.12em;}
        .sub{font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(26,20,16,0.4);}
        .inst{font-size:11px;color:rgba(26,20,16,0.4);margin-top:8px;}
        .dot{color:#C41230;font-size:20px;}
      </style></head>
      <body>
        <p class="sub">Escaneie para pedir</p>
        <p class="dot">•</p>
        <img src="${mesa.qr_code}" />
        <h2>Mesa ${mesa.numero}</h2>
        <p class="inst">Aponte a câmera do celular para o QR Code</p>
        <script>window.onload=()=>window.print()</script>
      </body></html>`)
    win.document.close()
  }

  return (
    <div className="max-w-4xl mx-auto px-7 py-10">

      <div className="flex items-end justify-between mb-8 pb-5 border-b border-half border-washi-mid">
        <div>
          <h1 className="font-display text-sumi text-3xl font-light">Mesas & QR Codes</h1>
          <p className="font-sans text-sumi/40 text-xs tracking-wide mt-1">{mesas.length} mesa(s) cadastrada(s)</p>
        </div>
      </div>

      {isError && (
        <div className="border border-half border-washi-dark bg-washi-mid px-5 py-4 mb-7">
          <p className="font-sans text-sm text-sumi">
            {error?.response?.status === 503 ? 'Banco indisponível' : !error?.response ? 'Servidor offline' : 'Erro ao carregar mesas'}
          </p>
          <button onClick={() => refetch()} className="font-sans text-xs text-beni mt-1 hover:underline">Tentar novamente</button>
        </div>
      )}

      {/* Adicionar mesa */}
      <div className="border border-half border-washi-dark p-5 mb-8 flex items-end gap-4">
        <div className="flex-1">
          <label className="block font-sans text-[9px] tracking-widest-jp uppercase text-sumi/50 mb-2">
            Número da nova mesa
          </label>
          <input
            type="number" min="1" value={numero}
            onChange={e => setNumero(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && criar.mutate()}
            placeholder="Ex: 10"
            className="w-full bg-transparent border-0 border-b border-half border-washi-dark pb-2 font-sans text-sm text-sumi outline-none placeholder:text-washi-deep focus:border-sumi transition-colors"
          />
        </div>
        <button
          onClick={() => criar.mutate()}
          disabled={criar.isLoading}
          className="bg-sumi text-washi font-sans text-[9px] tracking-widest-jp uppercase px-6 py-2.5 transition-opacity disabled:opacity-50"
        >
          {criar.isLoading ? 'Criando...' : '+ Adicionar mesa'}
        </button>
      </div>

      {/* Grid mesas */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 rounded-full border-2 border-sumi border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {mesas.map(mesa => (
            <div key={mesa.id} className="border border-half border-washi-dark p-4 flex flex-col items-center gap-3 text-center">
              {mesa.qr_code ? (
                <img
                  src={mesa.qr_code}
                  alt={`QR Mesa ${mesa.numero}`}
                  className="w-20 h-20 cursor-pointer hover:opacity-70 transition-opacity"
                  onClick={() => setQrModal(mesa)}
                />
              ) : (
                <div className="w-20 h-20 bg-washi-mid flex items-center justify-center font-sans text-[10px] text-sumi/30">
                  Sem QR
                </div>
              )}
              <div>
                <p className="font-display text-sumi text-base font-semibold">Mesa #{mesa.numero}</p>
                <span className={`font-sans text-[9px] px-2 py-0.5 tracking-wide uppercase
                  ${mesa.ativa ? 'text-take' : 'text-sumi/30'}`}>
                  {mesa.ativa ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <div className="flex gap-2 w-full">
                {mesa.qr_code && (
                  <button onClick={() => imprimir(mesa)}
                    className="flex-1 font-sans text-[9px] tracking-wide uppercase text-sumi/50 border border-half border-washi-dark py-1.5 hover:border-sumi transition-colors">
                    Imprimir
                  </button>
                )}
                <button onClick={() => deletar.mutate(mesa.id)}
                  className="flex-1 font-sans text-[9px] tracking-wide uppercase text-beni border border-half border-beni/30 py-1.5 hover:bg-beni-soft transition-colors">
                  Remover
                </button>
              </div>
            </div>
          ))}
          {mesas.length === 0 && (
            <div className="col-span-full text-center py-16">
              <p className="font-display text-sumi/20 text-xl font-light">Nenhuma mesa cadastrada ainda</p>
              <p className="font-sans text-sumi/30 text-xs mt-2">Adicione mesas acima para gerar os QR Codes.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal QR */}
      {qrModal && (
        <div className="fixed inset-0 bg-sumi/70 z-50 flex items-center justify-center p-4" onClick={() => setQrModal(null)}>
          <div className="bg-washi border border-half border-washi-dark p-8 text-center max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <p className="font-sans text-[9px] tracking-widest-jp uppercase text-beni mb-4">Escaneie para pedir</p>
            <img src={qrModal.qr_code} alt={`QR Mesa ${qrModal.numero}`} className="w-52 h-52 mx-auto border border-half border-washi-dark" />
            <h2 className="font-display text-sumi text-2xl font-light mt-4">Mesa #{qrModal.numero}</h2>
            <p className="font-sans text-sumi/40 text-xs mt-1 mb-5">Aponte a câmera do celular</p>
            <div className="flex gap-3">
              <button onClick={() => imprimir(qrModal)}
                className="flex-1 bg-sumi text-washi font-sans text-[9px] tracking-widest-jp uppercase py-3 transition-opacity">
                Imprimir
              </button>
              <button onClick={() => setQrModal(null)}
                className="flex-1 border border-half border-washi-dark font-sans text-[9px] tracking-widest-jp uppercase text-sumi/50 py-3 hover:border-sumi transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
