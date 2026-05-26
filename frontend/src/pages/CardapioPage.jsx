import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import api from '../services/api'

const RESTAURANTE_ID = import.meta.env.VITE_RESTAURANTE_ID || null

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const STATUS_INFO = {
  recebido:   { label: 'Pedido recebido',  desc: 'Aguardando a cozinha iniciar o preparo.' },
  em_preparo: { label: 'Em preparo',       desc: 'Sua comida está sendo preparada.' },
  pronto:     { label: 'Pronto!',          desc: 'Seu pedido está pronto. O garçom trará em breve!' },
  entregue:   { label: 'Entregue',         desc: 'Pedido entregue. Bom apetite!' },
  cancelado:  { label: 'Cancelado',        desc: 'Este pedido foi cancelado.' },
}

const STATUS_COR = {
  recebido:   'bg-blue-50 text-blue-700 border-blue-200',
  em_preparo: 'bg-amber-50 text-amber-700 border-amber-200',
  pronto:     'bg-green-50 text-green-700 border-green-200',
  entregue:   'bg-gray-50 text-gray-600 border-gray-200',
  cancelado:  'bg-red-50 text-red-600 border-red-200',
}

function PedidoCard({ pedidoId, refetchKey }) {
  const { data: pedido, isLoading, isError, refetch } = useQuery(
    ['acompanhamento', pedidoId, refetchKey],
    () => api.get(`/api/pedidos/${pedidoId}/publico`).then(r => r.data),
    { refetchInterval: 10000 }
  )
  const info = STATUS_INFO[pedido?.status] || STATUS_INFO.recebido
  const cor  = STATUS_COR[pedido?.status]  || STATUS_COR.recebido

  if (isLoading) return (
    <div className="bg-white rounded-2xl p-6 border border-washi-dark flex justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-beni border-t-transparent animate-spin" />
    </div>
  )
  if (isError || !pedido) return (
    <div className="bg-white rounded-2xl p-4 border border-washi-dark text-center">
      <p className="text-sm text-sumi/50">Não foi possível carregar este pedido.</p>
      <button onClick={() => refetch()} className="text-xs text-beni mt-1 hover:underline">Tentar novamente</button>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl p-5 border border-washi-dark">
      <div className="flex items-start justify-between mb-3">
        <div>
          {pedido.nome_cliente && <p className="text-sm font-semibold text-sumi">{pedido.nome_cliente}</p>}
          <p className="text-xs text-sumi/50 mt-0.5">{info.desc}</p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium flex-shrink-0 ml-2 ${cor}`}>
          {info.label}
        </span>
      </div>
      {pedido.itens?.length > 0 && (
        <div className="bg-washi rounded-xl p-3 space-y-1.5">
          {pedido.itens.map((it, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-sumi">{it.quantidade}× {it.item_nome || it.nome}</span>
              <span className="text-sumi/50">{fmt(it.preco_unitario * it.quantidade)}</span>
            </div>
          ))}
          <div className="border-t border-washi-dark pt-1.5 flex justify-between text-sm font-semibold">
            <span className="text-sumi">Total</span>
            <span className="text-beni">{fmt(pedido.total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function AcompanhamentoPedidos({ pedidosIds, mesa, onVoltar, onNovoPedido }) {
  const [refetchKey, setRefetchKey] = useState(0)
  const todosIds = pedidosIds.filter(Boolean)

  return (
    <div className="min-h-screen bg-washi">
      <header className="bg-white border-b border-washi-dark sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl text-sumi">Meus Pedidos</h1>
            <p className="text-xs text-sumi/50">Mesa <span className="font-semibold text-beni">#{mesa}</span></p>
          </div>
          <button onClick={onVoltar}
            className="border border-washi-dark text-sumi/50 px-4 py-2 rounded-xl text-sm font-medium hover:bg-washi transition-colors">
            Voltar ao cardápio
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-widest text-sumi/50">
            {todosIds.length} pedido(s) nesta mesa
          </p>
          <button onClick={() => setRefetchKey(k => k + 1)}
            className="text-[12px] text-beni hover:underline">
            Atualizar todos
          </button>
        </div>

        {todosIds.map(id => (
          <PedidoCard key={id} pedidoId={id} refetchKey={refetchKey} />
        ))}

        <p className="text-[11px] text-sumi/50 text-center pt-2">
          Atualiza automaticamente a cada 10 segundos
        </p>

        <button onClick={onNovoPedido}
          className="w-full bg-beni text-white py-3 rounded-xl font-bold hover:bg-beni-mid transition-colors">
          Fazer novo pedido
        </button>
      </main>
    </div>
  )
}

export default function CardapioPage() {
  const [params]      = useSearchParams()
  const mesa          = params.get('mesa') || '1'
  const restauranteId = params.get('restaurante') || RESTAURANTE_ID

  const PEDIDO_KEY = `pedido_em_andamento_mesa_${mesa}_rest_${restauranteId}`
  const HIST_KEY   = `historico_pedidos_mesa_${mesa}_rest_${restauranteId}`

  const [carrinho, setCarrinho]           = useState([])
  const [nomeCliente, setNomeCliente]     = useState('')
  const [categoriaAtiva, setCat]          = useState('')
  const [carrinhoAberto, setCarrinho2]    = useState(false)
  const [pedidoCriado, setPedidoCriado]   = useState(null)
  const [pedidosFeitos, setPedidosFeitos] = useState([])
  const [enviando, setEnviando]           = useState(false)
  const [acordando, setAcordando]         = useState(false)

  // ── Verificação de sessão na montagem ──────────────────────────────────────
  // IMPORTANTE: o estado começa vazio ([], null) intencionalmente.
  // Só populamos após confirmar com o backend quais pedidos pertencem
  // à sessão atual. Isso evita mostrar pedidos antigos por qualquer instante.
  useEffect(() => {
    if (!restauranteId || !mesa) return

    const hoje = new Date().toISOString().slice(0, 10)

    // Lê o localStorage
    const lerLocalStorage = () => {
      let historico = []
      let pedidoAndamento = null

      try {
        const saved = JSON.parse(localStorage.getItem(HIST_KEY) || '[]')
        if (Array.isArray(saved)) {
          historico = saved.filter(p => p && typeof p.id === 'string' && p.id.length > 0 && p._dia === hoje)
        }
      } catch { localStorage.removeItem(HIST_KEY) }

      try {
        const p = JSON.parse(localStorage.getItem(PEDIDO_KEY) || 'null')
        if (p && p._dia === hoje) pedidoAndamento = p
        else if (p) localStorage.removeItem(PEDIDO_KEY)
      } catch { localStorage.removeItem(PEDIDO_KEY) }

      return { historico, pedidoAndamento }
    }

    // Consulta o backend para obter ultima_liberacao
    api.get(`/api/mesas/verificar?restaurante=${restauranteId}&numero=${mesa}`)
      .then(r => {
        const ultimaLib = r.data?.ultima_liberacao
        const { historico, pedidoAndamento } = lerLocalStorage()

        if (!ultimaLib) {
          // Mesa nunca foi liberada — usa tudo do localStorage
          setPedidosFeitos(historico)
          setPedidoCriado(pedidoAndamento)
          if (historico.length !== JSON.parse(localStorage.getItem(HIST_KEY) || '[]').length) {
            localStorage.setItem(HIST_KEY, JSON.stringify(historico))
          }
          return
        }

        const libTs = new Date(ultimaLib).getTime()

        // Filtra apenas pedidos criados DEPOIS da última liberação
        const historicoValido = historico.filter(p => {
          const criadoEm = p.criado_em ? new Date(p.criado_em).getTime() : 0
          return criadoEm > libTs
        })

        localStorage.setItem(HIST_KEY, JSON.stringify(historicoValido))
        setPedidosFeitos(historicoValido)

        // Verifica se o pedido em andamento é da sessão atual
        if (pedidoAndamento) {
          const criadoEm = pedidoAndamento.criado_em ? new Date(pedidoAndamento.criado_em).getTime() : 0
          if (criadoEm > libTs) {
            setPedidoCriado(pedidoAndamento)
          } else {
            localStorage.removeItem(PEDIDO_KEY)
            // pedidoCriado permanece null
          }
        }
      })
      .catch(() => {
        // Sem conexão: usa localStorage normalmente (melhor que tela vazia)
        const { historico, pedidoAndamento } = lerLocalStorage()
        setPedidosFeitos(historico)
        setPedidoCriado(pedidoAndamento)
      })
  }, [restauranteId, mesa])

  // ── Keep-alive: mantém o backend Render acordado ──────────────────────────
  useEffect(() => {
    const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    const ping = () => fetch(`${BACKEND}/health`).catch(() => {})
    ping()
    const id = setInterval(ping, 4 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  if (!restauranteId) {
    return (
      <div className="min-h-screen bg-washi flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-10 max-w-sm w-full text-center border border-washi-dark">
          <h2 className="text-xl font-semibold text-sumi mb-2">Escaneie o QR Code</h2>
          <p className="text-sm text-sumi/50">
            Para acessar o cardápio, aponte a câmera do seu celular para o QR Code disponível na mesa.
          </p>
        </div>
      </div>
    )
  }

  const { data: categorias = [], isLoading, isError, error, refetch } = useQuery(
    ['cardapio', restauranteId],
    () => api.get(`/api/cardapio/${restauranteId}`).then(r => r.data),
    { staleTime: 1000 * 60 * 5, retry: 3 }
  )

  useEffect(() => {
    if (categorias.length && !categoriaAtiva) setCat(String(categorias[0]?.id || ''))
  }, [categorias])

  const totalItens = carrinho.reduce((s, i) => s + i.quantidade, 0)
  const subtotal   = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0)

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
          mesa_numero:    parseInt(mesa),
          nome_cliente:   nomeCliente.trim(),
          itens:          carrinho.map(i => ({ item_id: i.id, quantidade: i.quantidade })),
        },
        { timeout: 60000 }
      )
      const novoPedido = res.data

      const hoje = new Date().toISOString().slice(0, 10)
      const pedidoParaSalvar = { ...novoPedido, _dia: hoje }

      localStorage.setItem(PEDIDO_KEY, JSON.stringify(pedidoParaSalvar))
      const novoHistorico = [pedidoParaSalvar, ...pedidosFeitos].slice(0, 10)
      localStorage.setItem(HIST_KEY, JSON.stringify(novoHistorico))
      setPedidosFeitos(novoHistorico)
      setPedidoCriado(novoPedido)
      setCarrinho([])
      setCarrinho2(false)
    } catch (err) {
      if (err?.code === 'ECONNABORTED') {
        toast.error('Pedido demorou para confirmar. Tente novamente.')
      } else if (!err?.response) {
        setAcordando(true)
        toast('Servidor reiniciando. Aguarde 30 segundos e tente de novo.', { duration: 8000 })
        setTimeout(() => setAcordando(false), 30000)
      } else {
        toast.error(err?.response?.data?.erro || 'Erro ao enviar pedido.')
      }
    } finally {
      setEnviando(false)
    }
  }

  if (pedidoCriado) {
    return (
      <AcompanhamentoPedidos
        pedidosIds={pedidosFeitos.map(p => p.id).filter(Boolean)}
        mesa={mesa}
        onVoltar={() => setPedidoCriado(null)}
        onNovoPedido={() => {
          localStorage.removeItem(PEDIDO_KEY)
          setPedidoCriado(null)
        }}
      />
    )
  }

  const itensDaCategoriaAtiva = categorias.find(c => String(c.id) === String(categoriaAtiva))?.itens || []

  return (
    <div className="min-h-screen bg-washi">
      {acordando && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-2 text-sm font-medium">
          Servidor reiniciando... aguarde alguns segundos
        </div>
      )}

      <header className="bg-white border-b border-washi-dark sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl text-sumi">Cardápio Digital</h1>
            <p className="text-xs text-sumi/50">Mesa <span className="font-semibold text-beni">#{mesa}</span></p>
          </div>
          <div className="flex items-center gap-2">
            {pedidosFeitos.length > 0 && (
              <button
                onClick={() => setPedidoCriado(pedidosFeitos[0])}
                className="relative text-xs border border-beni text-beni px-3 py-1.5 rounded-xl font-medium hover:bg-beni-soft transition-colors"
              >
                Meus pedidos
                <span className="absolute -top-2 -right-2 bg-beni text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {pedidosFeitos.length}
                </span>
              </button>
            )}
            <button onClick={() => setCarrinho2(true)}
              className="relative bg-beni text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-beni-mid transition-colors">
              Pedido
              {totalItens > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {totalItens}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 pb-3">
          <input
            value={nomeCliente}
            onChange={e => setNomeCliente(e.target.value)}
            placeholder="Seu nome (obrigatório para o pedido)"
            className="w-full bg-washi border border-washi-dark rounded-xl px-4 py-2.5 text-sm text-sumi outline-none focus:ring-2 focus:ring-beni placeholder:text-sumi/50/60"
          />
        </div>

        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {categorias.map(cat => (
            <button key={cat.id} onClick={() => setCat(String(cat.id))}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                ${String(categoriaAtiva) === String(cat.id) ? 'bg-beni text-white' : 'bg-washi-mid text-sumi/50 hover:bg-washi-dark'}`}>
              {cat.nome}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-beni border-t-transparent animate-spin" />
          </div>
        ) : isError ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-washi-dark">
            <h2 className="text-base font-semibold text-sumi">
              {!error?.response ? 'Servidor offline' : 'Não foi possível carregar o cardápio'}
            </h2>
            <p className="text-sm text-sumi/50 mt-2">Tente novamente em alguns segundos.</p>
            <button onClick={() => refetch()}
              className="mt-5 bg-beni text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-beni-mid transition-colors">
              Tentar novamente
            </button>
          </div>
        ) : categorias.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-washi-dark">
            <h2 className="text-base font-semibold text-sumi">Cardápio vazio</h2>
            <p className="text-sm text-sumi/50 mt-2">Nenhum item disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {itensDaCategoriaAtiva.map(item => {
              const noCarrinho = carrinho.find(i => i.id === item.id)
              return (
                <div key={item.id} className="bg-white rounded-2xl overflow-hidden flex flex-col border border-washi-dark">
                  {item.imagem_url ? (
                    <img src={item.imagem_url} alt={item.nome} className="h-40 w-full object-cover"
                      onError={e => { e.target.style.display = 'none' }} />
                  ) : (
                    <div className="h-40 bg-washi-mid flex items-center justify-center">
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <path d="M8 36V20a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v16" stroke="#C8855A" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M4 36h40" stroke="#C8855A" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="24" cy="22" r="4" stroke="#C8855A" strokeWidth="2"/>
                      </svg>
                    </div>
                  )}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-sumi">{item.nome}</h3>
                    {item.descricao && <p className="text-xs text-sumi/50 mt-1 flex-1">{item.descricao}</p>}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-beni font-bold text-lg">{fmt(item.preco)}</span>
                      {noCarrinho ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => remover(item.id)}
                            className="w-7 h-7 rounded-full bg-washi-mid text-sumi font-bold hover:bg-washi-dark transition-colors">−</button>
                          <span className="font-bold text-sm w-4 text-center text-sumi">{noCarrinho.quantidade}</span>
                          <button onClick={() => adicionar(item)}
                            className="w-7 h-7 rounded-full bg-beni text-white font-bold hover:bg-beni-mid transition-colors">+</button>
                        </div>
                      ) : (
                        <button onClick={() => adicionar(item)}
                          className="bg-beni text-white text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-beni-mid transition-colors">
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

      {carrinhoAberto && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setCarrinho2(false)} />
          <div className="w-full max-w-sm bg-white flex flex-col">
            <div className="p-4 border-b border-washi-dark flex items-center justify-between">
              <h2 className="font-semibold text-lg text-sumi">Meu Pedido</h2>
              <button onClick={() => setCarrinho2(false)} className="text-sumi/50 hover:text-sumi text-2xl leading-none">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {carrinho.length === 0 ? (
                <>
                  <p className="text-center text-sumi/50 py-6 text-sm">Nenhum item no carrinho</p>
                  {pedidosFeitos.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-widest text-sumi/50 mb-3">
                        Pedidos desta sessão
                      </p>
                      {pedidosFeitos.map((p, i) => (
                        <button
                          key={p.id || i}
                          onClick={() => { setPedidoCriado(p); setCarrinho2(false) }}
                          className="w-full text-left bg-washi rounded-xl p-3 mb-2 hover:bg-washi-mid transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[12px] font-medium text-sumi">
                              {p.itens ? p.itens.map(it => it.item_nome || it.nome).slice(0, 2).join(', ') : 'Pedido'}
                              {p.itens?.length > 2 ? ` +${p.itens.length - 2}` : ''}
                            </span>
                            <span className="text-[11px] text-beni font-semibold">{fmt(p.total)}</span>
                          </div>
                          <p className="text-[11px] text-sumi/50 mt-0.5">Ver status</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                carrinho.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-sumi">{item.nome}</p>
                      <p className="text-xs text-beni">{fmt(item.preco)} × {item.quantidade}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => remover(item.id)} className="w-6 h-6 rounded-full bg-washi-mid text-xs font-bold hover:bg-washi-dark">−</button>
                      <span className="text-sm font-bold w-4 text-center text-sumi">{item.quantidade}</span>
                      <button onClick={() => adicionar(item)} className="w-6 h-6 rounded-full bg-washi-mid text-xs font-bold hover:bg-washi-dark">+</button>
                    </div>
                    <span className="text-sm font-semibold w-20 text-right text-sumi">{fmt(item.preco * item.quantidade)}</span>
                  </div>
                ))
              )}
            </div>

            {carrinho.length > 0 && (
              <div className="p-4 border-t border-washi-dark space-y-3">
                <div className="flex justify-between font-bold text-base">
                  <span className="text-sumi">Total</span>
                  <span className="text-beni">{fmt(subtotal)}</span>
                </div>
                <button onClick={finalizar} disabled={enviando || acordando}
                  className="w-full bg-beni text-white py-3 rounded-xl font-bold hover:bg-beni-mid disabled:opacity-60 transition-colors">
                  {enviando ? 'Enviando...' : acordando ? 'Aguarde...' : 'Finalizar Pedido'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
