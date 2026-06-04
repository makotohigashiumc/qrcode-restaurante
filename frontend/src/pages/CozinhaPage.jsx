import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import api from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || ''

const STATUS_CONFIG = {
  recebido:   { label: 'Recebido',   cor: 'bg-blue-100 text-blue-800',    proximo: 'em_preparo', acaoLabel: 'Iniciar Preparo' },
  em_preparo: { label: 'Em Preparo', cor: 'bg-yellow-100 text-yellow-800', proximo: 'pronto',     acaoLabel: 'Marcar Pronto'   },
  pronto:     { label: 'Pronto',     cor: 'bg-green-100 text-green-800',   proximo: null,          acaoLabel: ''                },
  entregue:   { label: 'Entregue',   cor: 'bg-gray-100 text-gray-600',     proximo: null,          acaoLabel: ''                },
  cancelado:  { label: 'Cancelado',  cor: 'bg-red-100 text-red-700',       proximo: null,          acaoLabel: ''                },
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function CardPedido({ pedido, onAtualizar }) {
  const cfg = STATUS_CONFIG[pedido.status] || STATUS_CONFIG.recebido
  const borderColor =
    pedido.status === 'recebido'   ? 'border-l-blue-500' :
    pedido.status === 'em_preparo' ? 'border-l-yellow-500' :
    pedido.status === 'pronto'     ? 'border-l-green-500' :
                                     'border-l-gray-300'

  return (
    <div className={`bg-white rounded-xl border border-washi-dark border-l-4 ${borderColor} p-4 flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-sumi text-base">Mesa #{pedido.mesa_numero}</p>
          {pedido.nome_cliente && <p className="text-xs text-sumi/50">{pedido.nome_cliente}</p>}
          <p className="text-xs text-sumi/40">{formatTime(pedido.criado_em)}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${cfg.cor}`}>
          {cfg.label}
        </span>
      </div>

      <ul className="space-y-1">
        {(pedido.itens || []).map((it, i) => (
          <li key={i} className="flex justify-between text-sm">
            <span className="text-sumi">{it.item_nome || it.nome}</span>
            <span className="font-semibold text-sumi">× {it.quantidade}</span>
          </li>
        ))}
      </ul>

      {cfg.proximo && (
        <button
          onClick={() => onAtualizar(pedido.id, cfg.proximo)}
          className={`w-full py-2 rounded-xl text-sm font-bold transition-colors
            ${pedido.status === 'recebido'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`}
        >
          {cfg.acaoLabel}
        </button>
      )}
    </div>
  )
}

export default function CozinhaPage() {
  const [filtro, setFiltro] = useState('ativos')

  const hoje = new Date().toISOString().slice(0, 10)

  const { data: pedidos = [], isError, error, refetch } = useQuery(
    ['pedidos-cozinha'],
    () => api.get(`/api/pedidos?data=${hoje}`).then(r => r.data),
    { refetchInterval: 20000 }
  )

  // WebSocket para receber pedidos em tempo real
  useEffect(() => {
    const token = localStorage.getItem('token') || ''
    const s = io(API_URL, { transports: ['polling'] })
    try {
      const part   = token.split('.')[1] || ''
      const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
      const id = JSON.parse(atob(base64 + '='.repeat((4 - base64.length % 4) % 4) || 'e30='))?.sub
      if (id) {
        s.on('connect', () => s.emit('entrar_sala', { restaurante_id: id }))
        s.on('novo_pedido',       () => { refetch(); toast('Novo pedido recebido!') })
        s.on('status_atualizado', () => refetch())
        s.on('mesa_liberada',     () => refetch())
      }
    } catch {}
    return () => s.disconnect()
  }, [])

  const atualizar = async (pedidoId, novoStatus) => {
    try {
      await api.patch(`/api/pedidos/${pedidoId}/status`, { status: novoStatus })
      refetch()
      toast.success('Status atualizado!')
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  // Filtra só pedidos da sessão ativa
  const pedidosFiltrados = pedidos
    .filter(p => p.sessao_ativa !== false)
    .filter(p => {
      if (filtro === 'ativos')  return ['recebido', 'em_preparo', 'pronto'].includes(p.status)
      if (filtro === 'prontos') return p.status === 'pronto'
      return ['recebido', 'em_preparo', 'pronto'].includes(p.status)
    })

  const counts = {
    recebido:   pedidos.filter(p => p.sessao_ativa !== false && p.status === 'recebido').length,
    em_preparo: pedidos.filter(p => p.sessao_ativa !== false && p.status === 'em_preparo').length,
    pronto:     pedidos.filter(p => p.sessao_ativa !== false && p.status === 'pronto').length,
  }

  return (
    <div className="min-h-screen bg-washi">

      {/* Barra de contadores */}
      <div className="bg-sumi px-6 py-3 flex gap-6 text-sm">
        <span className="text-blue-300">Recebidos: <strong>{counts.recebido}</strong></span>
        <span className="text-yellow-300">Em Preparo: <strong>{counts.em_preparo}</strong></span>
        <span className="text-green-300">Prontos: <strong>{counts.pronto}</strong></span>
      </div>

      {/* Filtros */}
      <div className="px-6 py-4 flex gap-2 border-b border-washi-dark bg-white">
        {[
          { key: 'ativos',  label: `Ativos (${counts.recebido + counts.em_preparo + counts.pronto})` },
          { key: 'prontos', label: `Prontos (${counts.pronto})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors
              ${filtro === f.key ? 'bg-sumi text-washi' : 'bg-washi-mid text-sumi/50 hover:bg-washi-dark'}`}>
            {f.label}
          </button>
        ))}
        <button onClick={() => refetch()}
          className="ml-auto px-3 py-1.5 bg-washi-mid text-sumi/50 rounded-full text-[12px] hover:bg-washi-dark transition-colors">
          Atualizar
        </button>
      </div>

      {isError && (
        <div className="px-6 pt-6">
          <div className="border border-washi-dark bg-washi-mid rounded-xl p-4">
            <p className="font-semibold text-sumi text-sm">
              {error?.response?.status === 503 ? 'Banco indisponível' : !error?.response ? 'Servidor offline' : 'Erro ao carregar pedidos'}
            </p>
            <button onClick={() => refetch()} className="mt-2 text-beni text-xs hover:underline">
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Grid de pedidos */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {pedidosFiltrados.length === 0 ? (
          <div className="col-span-full text-center py-20 text-sumi/30">
            <p className="font-sans text-sm">Nenhum pedido no momento</p>
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
