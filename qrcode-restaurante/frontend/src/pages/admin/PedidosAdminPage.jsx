import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import api from '../../services/api'

const API_URL = import.meta.env.VITE_API_URL || ''

const STATUS = {
  recebido:   { label: 'Recebido',   cls: 'bg-blue-50 text-blue-700',   border: 'border-l-blue-400' },
  em_preparo: { label: 'Em preparo', cls: 'bg-amber-50 text-amber-700',  border: 'border-l-amber-400' },
  pronto:     { label: 'Pronto',     cls: 'bg-indigo-50 text-indigo-700',border: 'border-l-indigo-400' },
  entregue:   { label: 'Entregue',   cls: 'bg-green-50 text-green-700',  border: 'border-l-gray-300' },
  cancelado:  { label: 'Cancelado',  cls: 'bg-red-50 text-red-600',      border: 'border-l-red-300' },
}
const PROXIMO = { recebido: 'em_preparo', em_preparo: 'pronto', pronto: 'entregue' }
const PROXIMO_LABEL = { recebido: 'Iniciar', em_preparo: 'Pronto', pronto: 'Entregar' }

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''

export default function PedidosAdminPage() {
  const qc = useQueryClient()
  const [filtro, setFiltro]   = useState('todos')
  const [detalhe, setDetalhe] = useState(null)

  const { data: pedidos = [], isLoading, isError, error, refetch } = useQuery(
    ['pedidos', filtro],
    () => api.get(`/api/pedidos${filtro !== 'todos' ? `?status=${filtro}` : ''}`).then(r => r.data),
    { refetchInterval: 20000 }
  )

  useEffect(() => {
    const s = io(API_URL, { transports: ['polling'] })
    try {
      const token = localStorage.getItem('token') || ''
      const part  = token.split('.')[1] || ''
      const base64 = part.replace(/-/g,'+').replace(/_/g,'/')
      const id = JSON.parse(atob(base64 + '='.repeat((4 - base64.length % 4) % 4) || 'e30='))?.sub
      if (id) {
        s.on('connect', () => s.emit('entrar_sala', { restaurante_id: id }))
        s.on('novo_pedido',       () => { refetch(); toast('Novo pedido recebido!') })
        s.on('status_atualizado', () => refetch())
      }
    } catch {}
    return () => s.disconnect()
  }, [])

  const atualizarStatus = useMutation(
    ({ id, status }) => api.patch(`/api/pedidos/${id}/status`, { status }),
    { onSuccess: () => { qc.invalidateQueries('pedidos'); toast.success('Status atualizado') },
      onError:   () => toast.error('Erro ao atualizar status') }
  )

  const cancelar = id => {
    if (!confirm('Cancelar este pedido?')) return
    atualizarStatus.mutate({ id, status: 'cancelado' })
  }

  const FILTROS = [
    { key: 'todos',      label: 'Todos' },
    { key: 'recebido',   label: 'Recebidos' },
    { key: 'em_preparo', label: 'Em preparo' },
    { key: 'pronto',     label: 'Prontos' },
    { key: 'entregue',   label: 'Entregues' },
    { key: 'cancelado',  label: 'Cancelados' },
  ]

  return (
    <div className="p-7 max-w-5xl mx-auto">

      {/* Cabeçalho */}
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] text-espresso">Pedidos</h1>
          <p className="text-[12px] text-espresso-4">{pedidos.length} pedido(s)</p>
        </div>
        <button onClick={() => refetch()} className="text-[12px] text-espresso-4 hover:text-espresso transition-colors">
          Atualizar
        </button>
      </div>

      {isError && (
        <div className="bg-white border border-creme-4 rounded-xl p-4 mb-4">
          <p className="text-[13px] font-medium text-espresso">
            {error?.response?.status === 503 ? 'Banco indisponível' : !error?.response ? 'Servidor offline' : 'Erro ao carregar pedidos'}
          </p>
          <button onClick={() => refetch()} className="mt-1 text-[12px] text-brand-500 hover:underline">Tentar novamente</button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors
              ${filtro === f.key ? 'bg-espresso text-creme-3' : 'bg-white border border-creme-4 text-espresso-4 hover:border-espresso-4'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {pedidos.map(p => {
            const cfg     = STATUS[p.status] || STATUS.recebido
            const proximo = PROXIMO[p.status]
            return (
              <div key={p.id} className={`bg-white border-l-4 border border-creme-4 rounded-xl overflow-hidden ${cfg.border}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-creme-2 flex items-center justify-center text-[11px] font-medium text-espresso-4 flex-shrink-0">
                    M{p.mesa_numero}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-medium text-espresso">{p.nome_cliente}</span>
                      <span className="text-[11px] text-espresso-4">{fmtTime(p.criado_em)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(p.itens || []).map((it, i) => (
                        <span key={i} className="text-[10px] bg-creme-2 text-espresso-4 px-2 py-0.5 rounded-full">
                          {it.quantidade}× {it.item_nome || it.nome}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[14px] font-medium text-espresso">{fmt(p.total)}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setDetalhe(detalhe?.id === p.id ? null : p)}
                      className="text-[11px] bg-creme-2 hover:bg-creme-3 text-espresso-4 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      {detalhe?.id === p.id ? 'Fechar' : 'Detalhes'}
                    </button>
                    {proximo && (
                      <button
                        onClick={() => atualizarStatus.mutate({ id: p.id, status: proximo })}
                        className="text-[11px] bg-brand-500 hover:bg-brand-600 text-white px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        {PROXIMO_LABEL[p.status]}
                      </button>
                    )}
                    {!['cancelado','entregue'].includes(p.status) && (
                      <button
                        onClick={() => cancelar(p.id)}
                        className="text-[11px] text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {detalhe?.id === p.id && (
                  <div className="border-t border-creme-3 bg-creme px-5 py-4">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="text-espresso-4 text-[10px] uppercase">
                          <th className="text-left pb-2">Item</th>
                          <th className="text-center pb-2">Qtd</th>
                          <th className="text-right pb-2">Unit.</th>
                          <th className="text-right pb-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-creme-3">
                        {(p.itens || []).map((it, i) => (
                          <tr key={i}>
                            <td className="py-1.5 font-medium text-espresso">{it.item_nome || it.nome}</td>
                            <td className="py-1.5 text-center text-espresso-4">{it.quantidade}</td>
                            <td className="py-1.5 text-right text-espresso-4">{fmt(it.preco_unitario)}</td>
                            <td className="py-1.5 text-right font-medium text-espresso">{fmt(it.preco_unitario * it.quantidade)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-creme-3 font-medium">
                          <td colSpan={3} className="pt-2 text-right text-espresso-4">Total</td>
                          <td className="pt-2 text-right text-brand-500">{fmt(p.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
          {pedidos.length === 0 && (
            <div className="text-center py-16 text-espresso-4 text-[13px]">
              Nenhum pedido encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
