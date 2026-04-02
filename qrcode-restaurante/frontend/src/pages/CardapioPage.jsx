import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import api from '../services/api'

const RESTAURANTE_ID = import.meta.env.VITE_RESTAURANTE_ID || null

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

// ── Tela de acompanhamento do pedido ─────────────────────────────────────────
const STATUS_INFO = {
  recebido:   { label: 'Pedido recebido',   emoji: '🔵', desc: 'Aguardando a cozinha iniciar o preparo.' },
  em_preparo: { label: 'Em preparo',        emoji: '🟡', desc: 'Sua comida está sendo preparada.' },
  pronto:     { label: 'Pronto!',           emoji: '🟢', desc: 'Seu pedido está pronto. O garçom trará em breve!' },
  entregue:   { label: 'Entregue',          emoji: '✅', desc: 'Pedido entregue. Bom apetite!' },
  cancelado:  { label: 'Cancelado',         emoji: '❌', desc: 'Este pedido foi cancelado.' },
}

function AcompanhamentoPedido({ pedidoId, mesa, onNovosPedidos }) {
  const { data: pedido, isLoading, isError, refetch } = useQuery(
    ['acompanhamento', pedidoId],
    () => api.get(`/api/pedidos/${pedidoId}`).then(r => r.data),
    { refetchInterval: 10000 } // atualiza a cada 10s automaticamente
  )

  const info = STATUS_INFO[pedido?.status] || STATUS_INFO.recebido

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (isError || !pedido) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Não foi possível carregar</h2>
          <p className="text-gray-500 mb-6 text-sm">Verifique sua conexão e tente novamente.</p>
          <button onClick={() => refetch()} className="w-full bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors mb-3">
            🔄 Tentar novamente
          </button>
          <button onClick={onNovosPedidos} className="w-full border border-gray-200 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
            ← Voltar ao cardápio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="text-6xl mb-4">{info.emoji}</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{info.label}</h2>
        <p className="text-gray-500 text-sm mb-2">{info.desc}</p>
        <p className="text-xs text-gray-400 mb-6">
          Mesa <span className="font-bold text-brand-600">#{mesa}</span>
          {pedido.nome_cliente ? ` — ${pedido.nome_cliente}` : ''}
        </p>

        {/* Itens do pedido */}
        {pedido.itens?.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-1">
            {pedido.itens.map((it, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{it.quantidade}× {it.item_nome || it.nome}</span>
                <span className="text-gray-500">{formatCurrency(it.preco_unitario * it.quantidade)}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between text-sm font-bold mt-2">
              <span>Total</span>
              <span className="text-brand-600">{formatCurrency(pedido.total)}</span>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 mb-4">Atualizando automaticamente a cada 10 segundos</p>

        <div className="flex gap-3">
          <button onClick={() => refetch()} className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            🔄 Atualizar
          </button>
          {['entregue', 'cancelado'].includes(pedido.status) && (
            <button onClick={onNovosPedidos} className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors">
              + Novo pedido
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function CardapioPage() {
  const [params] = useSearchParams()
  const mesa = params.get('mesa') || '1'
  const restauranteId = params.get('restaurante') || RESTAURANTE_ID

  const [carrinho, setCarrinho] = useState([])
  const [nomeCliente, setNomeCliente] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState(null)
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)
  const [pedidoCriado, setPedidoCriado] = useState(null) // guarda o objeto do pedido após finalizar
  const [enviando, setEnviando] = useState(false)

  // ── Validação: restaurante não identificado ───────────────────────────────
  if (!restauranteId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">📷</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Escaneie o QR Code</h2>
          <p className="text-gray-500 text-sm">
            Para acessar o cardápio, aponte a câmera do seu celular para o QR Code disponível na mesa.
          </p>
        </div>
      </div>
    )
  }

  const {
    data: categorias = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(
    ['cardapio', restauranteId],
    () => api.get(`/api/cardapio/${restauranteId}`).then(r => r.data),
    { staleTime: 1000 * 60 * 5 }
  )

  useEffect(() => {
    if (categorias.length && !categoriaAtiva) {
      setCategoriaAtiva(categorias[0]?.id || null)
    }
  }, [categorias])

  const totalItens = carrinho.reduce((s, i) => s + i.quantidade, 0)
  const subtotal = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0)
  const taxa = subtotal * 0.1
  const total = subtotal + taxa

  const adicionar = (item) => {
    setCarrinho(prev => {
      const ex = prev.find(i => i.id === item.id)
      if (ex) return prev.map(i => i.id === item.id ? { ...i, quantidade: i.quantidade + 1 } : i)
      return [...prev, { ...item, quantidade: 1 }]
    })
    toast.success(`${item.nome} adicionado!`, { duration: 1500 })
  }

  const remover = (id) => {
    setCarrinho(prev => {
      const ex = prev.find(i => i.id === id)
      if (ex?.quantidade === 1) return prev.filter(i => i.id !== id)
      return prev.map(i => i.id === id ? { ...i, quantidade: i.quantidade - 1 } : i)
    })
  }

  const finalizar = async () => {
    if (!nomeCliente.trim()) { toast.error('Informe seu nome'); return }
    if (carrinho.length === 0) { toast.error('Adicione itens ao pedido'); return }
    setEnviando(true)
    try {
      const res = await api.post(
        '/api/pedidos',
        {
          restaurante_id: restauranteId,
          mesa_numero: parseInt(mesa),
          nome_cliente: nomeCliente,
          itens: carrinho.map(i => ({ item_id: i.id, quantidade: i.quantidade })),
        },
        { timeout: 60000 }
      )
      // ✅ CORREÇÃO: salva o pedido retornado para mostrar o acompanhamento
      setPedidoCriado(res.data)
      setCarrinho([])
      setCarrinhoAberto(false)
    } catch (err) {
      if (err?.code === 'ECONNABORTED') {
        toast.error('Pedido demorou para confirmar. Aguarde e tente novamente se necessário.')
      } else {
        toast.error(err?.response?.data?.erro || 'Erro ao enviar pedido. Tente novamente.')
      }
    } finally {
      setEnviando(false)
    }
  }

  // ── Tela de acompanhamento ────────────────────────────────────────────────
  if (pedidoCriado) {
    return (
      <AcompanhamentoPedido
        pedidoId={pedidoCriado.id}
        mesa={mesa}
        onNovosPedidos={() => setPedidoCriado(null)}
      />
    )
  }

  const itensDaCategoriaAtiva = categorias.find(c => c.id === categoriaAtiva)?.itens || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🍴 Cardápio Digital</h1>
            <p className="text-xs text-gray-400">Mesa <span className="font-semibold text-brand-600">#{mesa}</span></p>
          </div>
          <button
            onClick={() => setCarrinhoAberto(true)}
            className="relative bg-brand-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-brand-700 transition-colors"
          >
            🛒 Pedido
            {totalItens > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {totalItens}
              </span>
            )}
          </button>
        </div>

        {/* Nome do cliente */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
            <span className="text-sm">👤</span>
            <input
              value={nomeCliente}
              onChange={e => setNomeCliente(e.target.value)}
              placeholder="Seu nome (obrigatório para o pedido)"
              className="bg-transparent flex-1 text-sm outline-none placeholder-gray-400"
            />
          </div>
        </div>

        {/* Filtro de categorias */}
        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {categorias.map(cat => (
            <button
              key={cat.id || 'sem-cat'}
              onClick={() => setCategoriaAtiva(cat.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                ${categoriaAtiva === cat.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cat.nome}
            </button>
          ))}
        </div>
      </header>

      {/* Itens */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
          </div>
        ) : isError ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            {error?.response?.status === 503 ? (
              <>
                <h2 className="text-base font-semibold text-gray-900">Banco indisponível</h2>
                <p className="text-sm text-gray-500 mt-2">O cardápio não carregou. Tente novamente.</p>
              </>
            ) : !error?.response ? (
              <>
                <h2 className="text-base font-semibold text-gray-900">Servidor offline</h2>
                <p className="text-sm text-gray-500 mt-2">Verifique se o backend está rodando.</p>
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold text-gray-900">Não foi possível carregar o cardápio</h2>
                <p className="text-sm text-gray-500 mt-2">Tente novamente.</p>
              </>
            )}
            <button onClick={() => refetch()} className="mt-5 bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-brand-700 transition-colors">
              🔄 Tentar novamente
            </button>
          </div>
        ) : categorias.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <h2 className="text-base font-semibold text-gray-900">Cardápio vazio</h2>
            <p className="text-sm text-gray-500 mt-2">Nenhum item disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {itensDaCategoriaAtiva.map(item => {
              const noCarrinho = carrinho.find(i => i.id === item.id)
              return (
                <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  {item.imagem_url ? (
                    <img src={item.imagem_url} alt={item.nome} className="h-40 w-full object-cover" />
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-5xl">
                      🍽️
                    </div>
                  )}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-gray-900">{item.nome}</h3>
                    {item.descricao && <p className="text-xs text-gray-500 mt-1 flex-1">{item.descricao}</p>}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-brand-600 font-bold text-lg">{formatCurrency(item.preco)}</span>
                      {noCarrinho ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => remover(item.id)} className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors">−</button>
                          <span className="font-bold text-sm w-4 text-center">{noCarrinho.quantidade}</span>
                          <button onClick={() => adicionar(item)} className="w-7 h-7 rounded-full bg-brand-600 text-white font-bold hover:bg-brand-700 transition-colors">+</button>
                        </div>
                      ) : (
                        <button onClick={() => adicionar(item)} className="bg-brand-600 text-white text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-brand-700 transition-colors">
                          + Adicionar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Carrinho - drawer */}
      {carrinhoAberto && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setCarrinhoAberto(false)} />
          <div className="w-full max-w-sm bg-white flex flex-col shadow-2xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg">🛒 Meu Pedido</h2>
              <button onClick={() => setCarrinhoAberto(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {carrinho.length === 0 ? (
                <p className="text-center text-gray-400 py-10">Nenhum item ainda</p>
              ) : (
                carrinho.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.nome}</p>
                      <p className="text-xs text-brand-600">{formatCurrency(item.preco)} × {item.quantidade}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => remover(item.id)} className="w-6 h-6 rounded-full bg-gray-100 text-xs font-bold hover:bg-gray-200">−</button>
                      <span className="text-sm font-bold w-4 text-center">{item.quantidade}</span>
                      <button onClick={() => adicionar(item)} className="w-6 h-6 rounded-full bg-brand-100 text-xs font-bold hover:bg-brand-200">+</button>
                    </div>
                    <span className="text-sm font-semibold w-20 text-right">{formatCurrency(item.preco * item.quantidade)}</span>
                  </div>
                ))
              )}
            </div>

            {carrinho.length > 0 && (
              <div className="p-4 border-t space-y-3">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Taxa de serviço (10%)</span><span>{formatCurrency(taxa)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-1 border-t">
                    <span>Total</span><span className="text-brand-600">{formatCurrency(total)}</span>
                  </div>
                </div>
                <button
                  onClick={finalizar}
                  disabled={enviando}
                  className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 disabled:opacity-60 transition-colors"
                >
                  {enviando ? 'Enviando...' : 'Finalizar Pedido'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
