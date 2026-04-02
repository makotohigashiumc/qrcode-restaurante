import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import api from '../../services/api'

const API_URL = import.meta.env.VITE_API_URL || ''

const STATUS_LABELS = {
  recebido:   { label: 'Recebido',    cor: 'bg-blue-100 text-blue-800' },
  em_preparo: { label: 'Em Preparo',  cor: 'bg-yellow-100 text-yellow-800' },
  pronto:     { label: 'Pronto',      cor: 'bg-green-100 text-green-800' },
  entregue:   { label: 'Entregue',    cor: 'bg-gray-100 text-gray-500' },
  cancelado:  { label: 'Cancelado',   cor: 'bg-red-100 text-red-700' },
}

const PROXIMOS = {
  recebido: 'em_preparo',
  em_preparo: 'pronto',
  pronto: 'entregue',
}

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}
function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function PedidosAdminPage() {
  const qc = useQueryClient()
  const [filtro, setFiltro] = useState('todos')
  const [detalhe, setDetalhe] = useState(null)

  const { data: pedidos = [], isLoading, isError, error, refetch } = useQuery(
    ['pedidos', filtro],
    () => {
      const params = filtro !== 'todos' ? `?status=${filtro}` : ''
      return api.get(`/api/pedidos${params}`).then(r => r.data)
    },
    { refetchInterval: 20000 }
  )

  // WebSocket para atualizações em tempo real
  useEffect(() => {
    const s = io(API_URL, { transports: ['polling'] })
    let restauranteId = null
    try {
      const token = localStorage.getItem('token') || ''
      const part = token.split('.')[1] || ''
      const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
      restauranteId = JSON.parse(atob(padded || 'e30='))?.sub
    } catch {
      restauranteId = null
    }
    if (restauranteId) {
      s.on('connect', () => s.emit('entrar_sala', { restaurante_id: restauranteId }))
      s.on('novo_pedido', () => { refetch(); toast('🔔 Novo pedido recebido!', { icon: '🆕' }) })
      s.on('status_atualizado', () => refetch())
    }
    return () => s.disconnect()
  }, [])

  const atualizarStatus = useMutation(async ({ id, status }) => {
    await api.patch(`/api/pedidos/${id}/status`, { status })
  }, {
    onSuccess: () => { qc.invalidateQueries('pedidos'); toast.success('Status atualizado') },
    onError: () => toast.error('Erro ao atualizar status'),
  })

  const cancelar = async (id) => {
    if (!confirm('Cancelar este pedido?')) return
    atualizarStatus.mutate({ id, status: 'cancelado' })
  }

  const filtros = [
    { key: 'todos', label: 'Todos' },
    { key: 'recebido', label: '🔵 Recebidos' },
    { key: 'em_preparo', label: '🟡 Em Preparo' },
    { key: 'pronto', label: '🟢 Prontos' },
    { key: 'entregue', label: '✅ Entregues' },
    { key: 'cancelado', label: '❌ Cancelados' },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🧾 Pedidos</h1>
          <p className="text-sm text-gray-500">{pedidos.length} pedido(s)</p>
        </div>
        <button onClick={() => refetch()} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          🔄 Atualizar
        </button>
      </div>

      {isError && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 border border-gray-100">
          <p className="font-semibold text-gray-900">
            {error?.response?.status === 503
              ? 'Banco indisponível'
              : !error?.response
                ? 'Servidor offline'
                : 'Erro ao carregar pedidos'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {error?.response?.status === 503
              ? 'Tente novamente em alguns segundos.'
              : !error?.response
                ? 'Verifique se o backend está rodando.'
                : 'Não foi possível buscar os pedidos.'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700"
          >
            🔄 Tentar novamente
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filtros.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
              ${filtro === f.key ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map(pedido => {
            const cfg = STATUS_LABELS[pedido.status] || STATUS_LABELS.recebido
            const proximo = PROXIMOS[pedido.status]
            return (
              <div key={pedido.id}
                className={`bg-white rounded-2xl shadow-sm border-l-4 overflow-hidden
                  ${pedido.status === 'recebido' ? 'border-blue-500' :
                    pedido.status === 'em_preparo' ? 'border-yellow-500' :
                    pedido.status === 'pronto' ? 'border-green-500' :
                    pedido.status === 'entregue' ? 'border-gray-300' : 'border-red-400'}`}
              >
                <div className="p-4 flex items-center gap-4">
                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-gray-900">Mesa #{pedido.mesa_numero}</span>
                      {pedido.nome_cliente && (
                        <span className="text-sm text-gray-500">👤 {pedido.nome_cliente}</span>
                      )}
                      <span className="text-xs text-gray-400">🕐 {formatTime(pedido.criado_em)}</span>
                    </div>

                    {/* Itens resumidos */}
                    <div className="flex flex-wrap gap-1">
                      {(pedido.itens || []).map((it, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {it.quantidade}× {it.item_nome || it.nome}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Valor */}
                  <div className="text-right">
                    <p className="font-bold text-brand-600">{formatCurrency(pedido.total)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cor}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDetalhe(detalhe?.id === pedido.id ? null : pedido)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {detalhe?.id === pedido.id ? '▲ Fechar' : '▼ Detalhes'}
                    </button>

                    {proximo && (
                      <button
                        onClick={() => atualizarStatus.mutate({ id: pedido.id, status: proximo })}
                        className={`text-xs text-white px-3 py-1.5 rounded-lg transition-colors font-medium
                          ${pedido.status === 'recebido' ? 'bg-blue-600 hover:bg-blue-700' :
                            pedido.status === 'em_preparo' ? 'bg-yellow-500 hover:bg-yellow-600' :
                            'bg-green-600 hover:bg-green-700'}`}
                      >
                        {pedido.status === 'recebido' ? '▶ Iniciar' :
                         pedido.status === 'em_preparo' ? '✓ Pronto' : '🚀 Entregar'}
                      </button>
                    )}

                    {!['cancelado', 'entregue'].includes(pedido.status) && (
                      <button onClick={() => cancelar(pedido.id)}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg transition-colors">
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Detalhe expandido */}
                {detalhe?.id === pedido.id && (
                  <div className="border-t bg-gray-50 px-5 py-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 text-xs uppercase">
                          <th className="text-left pb-2">Item</th>
                          <th className="text-center pb-2">Qtd</th>
                          <th className="text-right pb-2">Unit.</th>
                          <th className="text-right pb-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(pedido.itens || []).map((it, i) => (
                          <tr key={i}>
                            <td className="py-1.5">
                              <p className="font-medium">{it.item_nome || it.nome}</p>
                              {it.observacao && <p className="text-xs text-gray-400">{it.observacao}</p>}
                            </td>
                            <td className="text-center py-1.5">{it.quantidade}</td>
                            <td className="text-right py-1.5">{formatCurrency(it.preco_unitario)}</td>
                            <td className="text-right py-1.5 font-medium">{formatCurrency(it.preco_unitario * it.quantidade)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t font-bold">
                          <td colSpan={3} className="pt-2 text-right">Total</td>
                          <td className="pt-2 text-right text-brand-600">{formatCurrency(pedido.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )
          })}

          {pedidos.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3">🧾</div>
              <p>Nenhum pedido encontrado</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
