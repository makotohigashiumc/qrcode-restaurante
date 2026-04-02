import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../hooks/useAuth'

const API_URL = import.meta.env.VITE_API_URL || ''

const STATUS_CONFIG = {
  recebido:   { label: 'Recebido',   cor: 'bg-blue-100 text-blue-800',   proximo: 'em_preparo', acaoLabel: '▶ Iniciar Preparo' },
  em_preparo: { label: 'Em Preparo', cor: 'bg-yellow-100 text-yellow-800', proximo: 'pronto',    acaoLabel: '✓ Marcar Pronto' },
  pronto:     { label: 'Pronto',     cor: 'bg-green-100 text-green-800',  proximo: 'entregue',   acaoLabel: '🚀 Marcar Entregue' },
  entregue:   { label: 'Entregue',   cor: 'bg-gray-100 text-gray-600',    proximo: null,          acaoLabel: '' },
  cancelado:  { label: 'Cancelado',  cor: 'bg-red-100 text-red-700',      proximo: null,          acaoLabel: '' },
}

function getRestauranteIdFromToken(token) {
  try {
    const part = (token || '').split('.')[1] || ''
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded || 'e30='))
    return payload?.sub || null
  } catch {
    return null
  }
}

function useSocket(restauranteId, enabled) {
  const [socket, setSocket] = useState(null)
  useEffect(() => {
    if (!enabled || !restauranteId) return
    const s = io(API_URL, { transports: ['polling'] })
    s.on('connect', () => {
      s.emit('entrar_sala', { restaurante_id: restauranteId })
    })
    setSocket(s)
    return () => s.disconnect()
  }, [restauranteId, enabled])
  return socket
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function CardPedido({ pedido, onAtualizar }) {
  const cfg = STATUS_CONFIG[pedido.status] || STATUS_CONFIG.recebido
  return (
    <div className={`bg-white rounded-2xl shadow-sm border-l-4 p-4 flex flex-col gap-3
      ${pedido.status === 'recebido' ? 'border-blue-500' :
        pedido.status === 'em_preparo' ? 'border-yellow-500' :
        pedido.status === 'pronto' ? 'border-green-500' : 'border-gray-300'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-gray-900 text-base">Mesa #{pedido.mesa_numero}</p>
          {pedido.nome_cliente && <p className="text-xs text-gray-500">👤 {pedido.nome_cliente}</p>}
          <p className="text-xs text-gray-400">{formatTime(pedido.criado_em)}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${cfg.cor}`}>{cfg.label}</span>
      </div>

      <ul className="space-y-1">
        {(pedido.itens || []).map((it, i) => (
          <li key={i} className="flex justify-between text-sm">
            <span className="text-gray-700">{it.item_nome || it.nome}</span>
            <span className="font-semibold text-gray-900">× {it.quantidade}</span>
          </li>
        ))}
      </ul>

      {cfg.proximo && (
        <button
          onClick={() => onAtualizar(pedido.id, cfg.proximo)}
          className={`w-full py-2 rounded-xl text-sm font-bold transition-colors
            ${pedido.status === 'recebido' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
              pedido.status === 'em_preparo' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
              'bg-green-600 hover:bg-green-700 text-white'}`}
        >
          {cfg.acaoLabel}
        </button>
      )}
    </div>
  )
}

export default function CozinhaPage() {
  const { user, loading } = useAuth()
  const token = localStorage.getItem('token') || ''
  const restauranteId = user?.id || getRestauranteIdFromToken(token)
  const socket = useSocket(restauranteId, !!token && !loading)
  const [filtro, setFiltro] = useState('ativos')

  const { data: pedidos = [], isError, error, refetch } = useQuery(
    ['pedidos-cozinha'],
    () => api.get('/api/pedidos').then(r => r.data),
    { refetchInterval: 30000, enabled: !!token && !loading }
  )

  useEffect(() => {
    if (!socket) return
    socket.on('novo_pedido', (p) => {
      toast('🆕 Novo pedido — Mesa #' + p.mesa_numero, { icon: '🔔' })
      refetch()
    })
    socket.on('status_atualizado', () => refetch())
    return () => { socket.off('novo_pedido'); socket.off('status_atualizado') }
  }, [socket, refetch])

  const atualizar = async (pedidoId, novoStatus) => {
    try {
      await api.patch(`/api/pedidos/${pedidoId}/status`, { status: novoStatus })
      refetch()
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const pedidosFiltrados = pedidos.filter(p => {
    if (filtro === 'ativos') return ['recebido', 'em_preparo', 'pronto'].includes(p.status)
    if (filtro === 'prontos') return p.status === 'pronto'
    return true
  })

  const counts = {
    recebido: pedidos.filter(p => p.status === 'recebido').length,
    em_preparo: pedidos.filter(p => p.status === 'em_preparo').length,
    pronto: pedidos.filter(p => p.status === 'pronto').length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-bold">👨‍🍳 Painel da Cozinha</h1>
          <p className="text-gray-300 text-sm mt-2">
            Para ver os pedidos, você precisa estar logado no painel admin.
          </p>
          <a
            href="/admin/login"
            className="inline-block mt-4 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-semibold"
          >
            Ir para o login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
        <div>
          <h1 className="text-xl font-bold">👨‍🍳 Painel da Cozinha</h1>
          <p className="text-gray-400 text-xs">Atualização em tempo real via WebSocket</p>
        </div>
        <div className="flex gap-3">
          {[
            { key: 'ativos', label: `Ativos (${counts.recebido + counts.em_preparo + counts.pronto})` },
            { key: 'prontos', label: `Prontos (${counts.pronto})` },
            { key: 'todos', label: 'Todos' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${filtro === f.key ? 'bg-brand-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {f.label}
            </button>
          ))}
          <button onClick={() => refetch()} className="px-3 py-1.5 bg-gray-700 rounded-lg text-sm hover:bg-gray-600">🔄</button>
        </div>
      </header>

      {/* Status bar */}
      <div className="bg-gray-800 px-6 py-3 flex gap-6 text-sm border-b border-gray-700">
        <span className="text-blue-400">🔵 Recebidos: <strong>{counts.recebido}</strong></span>
        <span className="text-yellow-400">🟡 Em Preparo: <strong>{counts.em_preparo}</strong></span>
        <span className="text-green-400">🟢 Prontos: <strong>{counts.pronto}</strong></span>
      </div>

      {isError && (
        <div className="px-6 pt-6">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
            <p className="font-semibold">
              {error?.response?.status === 503
                ? 'Banco indisponível'
                : !error?.response
                  ? 'Servidor offline'
                  : 'Erro ao carregar pedidos'}
            </p>
            <p className="text-sm text-gray-300 mt-1">
              {error?.response?.status === 503
                ? 'A cozinha pode ficar sem atualizar enquanto o banco estiver instável.'
                : !error?.response
                  ? 'Verifique se o backend está rodando.'
                  : 'Tente novamente.'}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-3 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"
            >
              🔄 Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Grid de pedidos */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {pedidosFiltrados.length === 0 ? (
          <div className="col-span-full text-center py-20 text-gray-500">
            <div className="text-5xl mb-3">🍽️</div>
            <p>Nenhum pedido no momento</p>
          </div>
        ) : (
          pedidosFiltrados.map(p => (
            <CardPedido key={p.id} pedido={p} onAtualizar={atualizar} />
          ))
        )}
      </div>
    </div>
  )
}
