import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import api from '../../services/api'

const API_URL = import.meta.env.VITE_API_URL || ''

const STATUS = {
  recebido:   { label: 'Recebido',   cls: 'bg-blue-50 text-blue-700',    border: 'border-l-blue-400' },
  em_preparo: { label: 'Em preparo', cls: 'bg-amber-50 text-amber-700',   border: 'border-l-amber-400' },
  pronto:     { label: 'Pronto',     cls: 'bg-indigo-50 text-indigo-700', border: 'border-l-indigo-400' },
  entregue:   { label: 'Entregue',   cls: 'bg-green-50 text-green-700',   border: 'border-l-gray-300' },
  cancelado:  { label: 'Cancelado',  cls: 'bg-red-50 text-red-600',       border: 'border-l-red-300' },
}
const PROXIMO       = { recebido: 'em_preparo', em_preparo: 'pronto', pronto: 'entregue' }
const PROXIMO_LABEL = { recebido: 'Iniciar', em_preparo: 'Pronto', pronto: 'Entregar' }

const fmt     = v   => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('pt-BR') : ''
const hoje    = ()  => new Date().toISOString().slice(0, 10)

// ── Agrupa pedidos em sessões de atendimento ──────────────────
// Lógica: o campo "sessao_ativa" já vem do backend.
// Pedidos com sessao_ativa=true → atendimento atual.
// Pedidos com sessao_ativa=false → sessões históricas.
// Agrupamos pedidos históricos por "bloco de tempo" usando
// ultima_liberacao_mesa como marcador de fronteira entre sessões.
// Como o banco só guarda 1 ultima_liberacao (a mais recente),
// os históricos formam 1 bloco "Atendimentos anteriores".
function agruparPorSessao(pedidosDaMesa) {
  const ativos    = pedidosDaMesa.filter(p => p.sessao_ativa)
  const historico = pedidosDaMesa.filter(p => !p.sessao_ativa)

  const sessoes = []

  if (ativos.length > 0) {
    sessoes.push({ tipo: 'ativo', pedidos: ativos })
  }
  if (historico.length > 0) {
    sessoes.push({ tipo: 'historico', pedidos: historico })
  }

  return sessoes
}

function RelatorioModal({ mesa, onClose }) {
  const { data, isLoading } = useQuery(
    ['relatorio-mesa', mesa],
    () => api.get(`/api/pedidos/mesa/${mesa}/relatorio`).then(r => r.data),
    { enabled: !!mesa }
  )

  const imprimir = () => {
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>Relatório Mesa ${mesa}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;max-width:600px;margin:0 auto}
      h2{font-size:18px;margin-bottom:4px}
      h3{font-size:14px;margin:16px 0 4px;border-bottom:1px solid #eee;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px}
      th{text-align:left;padding:4px 8px;background:#f5f5f5;font-size:11px}
      td{padding:4px 8px;border-bottom:1px solid #f0f0f0}
      .total{font-weight:bold;font-size:13px;margin-top:4px;text-align:right}
      .geral{font-size:16px;font-weight:bold;margin-top:16px;text-align:right;border-top:2px solid #333;padding-top:8px}
    </style></head><body>
    <h2>Relatório — Mesa ${mesa}</h2>
    <p style="font-size:12px;color:#666">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
    ${(data?.clientes || []).map(c => `
      <h3>${c.nome}</h3>
      ${c.pedidos.map(p => `
        <table>
          <tr><th>Item</th><th>Qtd</th><th>Valor</th></tr>
          ${p.itens.map(i => `<tr><td>${i.item_nome}</td><td>${i.quantidade}</td><td>R$ ${(i.subtotal||0).toFixed(2)}</td></tr>`).join('')}
        </table>
        <div class="total">R$ ${(p.total||0).toFixed(2)}</div>
      `).join('')}
      <p style="font-size:13px;font-weight:bold;text-align:right">Total ${c.nome}: R$ ${(c.total||0).toFixed(2)}</p>
    `).join('')}
    <div class="geral">Total Geral: R$ ${(data?.total_geral||0).toFixed(2)}</div>
    <script>window.onload=()=>window.print()</script>
    </body></html>`)
    win.document.close()
  }

  return (
    <div className="fixed inset-0 bg-sumi/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col border border-washi-dark">
        <div className="flex items-center justify-between p-4 border-b border-washi-mid">
          <h2 className="font-display text-[18px] text-sumi">Relatório — Mesa {mesa}</h2>
          <button onClick={onClose} className="text-sumi/50 hover:text-sumi">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 rounded-full border-2 border-beni border-t-transparent animate-spin" />
            </div>
          ) : (data?.clientes || []).length === 0 ? (
            <p className="text-[13px] text-sumi/50 text-center py-8">Nenhum pedido ativo nesta mesa.</p>
          ) : (
            <>
              {(data.clientes || []).map(c => (
                <div key={c.nome} className="border border-washi-dark rounded-lg overflow-hidden">
                  <div className="bg-washi px-3 py-2 flex justify-between items-center">
                    <span className="text-[13px] font-medium text-sumi">{c.nome}</span>
                    <span className="text-[12px] font-medium text-beni">{fmt(c.total)}</span>
                  </div>
                  {c.pedidos.map(p => (
                    <div key={p.id} className="px-3 py-2 border-t border-washi-mid">
                      {p.itens.map((it, i) => (
                        <div key={i} className="flex justify-between text-[12px] py-0.5">
                          <span className="text-sumi">{it.quantidade}× {it.item_nome}</span>
                          <span className="text-sumi/50">{fmt(it.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex justify-between font-semibold text-[14px] pt-2 border-t border-washi-dark">
                <span className="text-sumi">Total Geral</span>
                <span className="text-beni">{fmt(data.total_geral)}</span>
              </div>
            </>
          )}
        </div>
        <div className="p-4 border-t border-washi-mid flex gap-2">
          <button onClick={imprimir}
            className="flex-1 bg-beni hover:bg-beni-mid text-white py-2.5 rounded-lg text-[13px] font-medium transition-colors">
            Imprimir relatório
          </button>
          <button onClick={onClose}
            className="flex-1 border border-washi-dark py-2.5 rounded-lg text-[13px] text-sumi/50 hover:bg-washi transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Card de pedido individual ─────────────────────────────────
function PedidoRow({ p, onAtualizarStatus, onCancelar, ehHistorico }) {
  const [expandido, setExpandido] = useState(false)
  const cfg     = STATUS[p.status] || STATUS.recebido
  const proximo = !ehHistorico ? PROXIMO[p.status] : null

  return (
    <div className={`border-l-4 ${cfg.border} ${ehHistorico ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-medium text-sumi">{p.nome_cliente || 'Sem nome'}</span>
            <span className="text-[10px] text-sumi/40">{fmtTime(p.criado_em)}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(p.itens || []).map((it, i) => (
              <span key={i} className="text-[10px] bg-washi-mid text-sumi/60 px-2 py-0.5 rounded-full">
                {it.quantidade}× {it.item_nome || it.nome}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[13px] font-semibold text-sumi">{fmt(p.total)}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
          {proximo && (
            <button
              onClick={() => onAtualizarStatus(p.id, proximo)}
              className="text-[11px] bg-beni hover:bg-beni-mid text-white px-2.5 py-1 rounded-lg transition-colors font-medium">
              {PROXIMO_LABEL[p.status]}
            </button>
          )}
          {!ehHistorico && !['cancelado','entregue'].includes(p.status) && (
            <button onClick={() => onCancelar(p.id)}
              className="text-[11px] text-red-400 hover:text-red-600 px-1.5 py-1 transition-colors">
              ✕
            </button>
          )}
          <button onClick={() => setExpandido(!expandido)}
            className="text-[10px] text-sumi/40 hover:text-sumi/70 transition-colors ml-1">
            {expandido ? '▲' : '▼'}
          </button>
        </div>
      </div>
      {expandido && (
        <div className="px-4 pb-3 border-t border-washi-mid bg-washi/40 mx-0">
          <table className="w-full text-[12px] mt-2">
            <thead>
              <tr className="text-sumi/40 text-[10px] uppercase">
                <th className="text-left pb-1.5">Item</th>
                <th className="text-center pb-1.5">Qtd</th>
                <th className="text-right pb-1.5">Unit.</th>
                <th className="text-right pb-1.5">Total</th>
              </tr>
            </thead>
            <tbody>
              {(p.itens || []).map((it, i) => (
                <tr key={i} className="border-t border-washi-mid">
                  <td className="py-1 text-sumi">{it.item_nome || it.nome}</td>
                  <td className="py-1 text-center text-sumi/50">{it.quantidade}</td>
                  <td className="py-1 text-right text-sumi/50">{fmt(it.preco_unitario)}</td>
                  <td className="py-1 text-right font-medium text-sumi">{fmt(it.preco_unitario * it.quantidade)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-2 text-right text-sumi/50 text-[11px]">Total</td>
                <td className="pt-2 text-right font-bold text-beni">{fmt(p.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Bloco de atendimento (sessão) ─────────────────────────────
// "ativo" → tem botão Liberar mesa
// "historico" → só mostra registros + relatório
function BlocoAtendimento({ mesa, sessao, onAtualizarStatus, onCancelar, onLiberar, onRelatorio, liberandoMesa }) {
  const { tipo, pedidos } = sessao
  const ehAtivo    = tipo === 'ativo'
  const totalSessao = pedidos
    .filter(p => p.status !== 'cancelado')
    .reduce((s, p) => s + p.total, 0)

  return (
    <div className={`border rounded-xl overflow-hidden ${ehAtivo ? 'border-washi-dark' : 'border-washi-mid opacity-75'}`}>
      {/* Cabeçalho do bloco de atendimento */}
      <div className={`px-4 py-2.5 flex items-center justify-between ${ehAtivo ? 'bg-washi' : 'bg-washi/50'}`}>
        <div className="flex items-center gap-2">
          {ehAtivo ? (
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
          )}
          <span className="text-[12px] font-medium text-sumi">
            {ehAtivo ? 'Atendimento ativo' : 'Atendimento encerrado'}
          </span>
          <span className="text-[11px] text-sumi/40">
            — {fmt(totalSessao)}
          </span>
        </div>
        <div className="flex gap-2">
          {/* Relatório sempre disponível */}
          <button onClick={onRelatorio}
            className="text-[11px] bg-washi-mid hover:bg-washi-dark text-sumi/60 px-2.5 py-1.5 rounded-lg transition-colors">
            Relatório
          </button>
          {/* Liberar mesa SOMENTE no atendimento ativo */}
          {ehAtivo && (
            <button
              onClick={onLiberar}
              disabled={liberandoMesa}
              className="text-[11px] bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-lg transition-colors font-medium">
              Liberar mesa
            </button>
          )}
        </div>
      </div>

      {/* Pedidos do bloco */}
      <div className="divide-y divide-washi-mid">
        {pedidos.map(p => (
          <PedidoRow
            key={p.id}
            p={p}
            onAtualizarStatus={onAtualizarStatus}
            onCancelar={onCancelar}
            ehHistorico={!ehAtivo}
          />
        ))}
      </div>
    </div>
  )
}

export default function PedidosAdminPage() {
  const qc = useQueryClient()
  const [filtro, setFiltro]     = useState('todos')
  const [viewMode, setViewMode] = useState('mesas')
  const [dataFiltro, setData]   = useState(hoje())
  const [relatorioMesa, setRel] = useState(null)

  const { data: pedidos = [], isLoading, isError, refetch } = useQuery(
    ['pedidos', filtro, dataFiltro],
    () => {
      let url = '/api/pedidos'
      const params = []
      if (filtro !== 'todos') params.push(`status=${filtro}`)
      if (dataFiltro)         params.push(`data=${dataFiltro}`)
      if (params.length)      url += '?' + params.join('&')
      return api.get(url).then(r => r.data)
    },
    { refetchInterval: 20000, retry: 3 }
  )

  // Socket.IO para atualizações em tempo real
  useEffect(() => {
    const s = io(API_URL, { transports: ['polling'] })
    try {
      const token  = localStorage.getItem('token') || ''
      const part   = token.split('.')[1] || ''
      const base64 = part.replace(/-/g,'+').replace(/_/g,'/')
      const pad    = base64 + '='.repeat((4 - base64.length % 4) % 4)
      const id     = JSON.parse(atob(pad || 'e30='))?.sub
      if (id) {
        s.on('connect', () => s.emit('entrar_sala', { restaurante_id: id }))
        s.on('novo_pedido',       () => { refetch(); toast('🔔 Novo pedido recebido!') })
        s.on('status_atualizado', () => refetch())
        s.on('mesa_liberada',     () => { refetch(); toast.success('Mesa liberada!') })
      }
    } catch {}
    return () => s.disconnect()
  }, [])

  const atualizarStatus = useMutation(
    ({ id, status }) => api.patch(`/api/pedidos/${id}/status`, { status }),
    {
      onSuccess: () => { qc.invalidateQueries('pedidos'); toast.success('Status atualizado') },
      onError:   () => toast.error('Erro ao atualizar status'),
    }
  )

  const liberarMesa = useMutation(
    (mesa) => api.post(`/api/pedidos/mesa/${mesa}/liberar`),
    {
      onSuccess: (_, mesa) => {
        qc.invalidateQueries('pedidos')
        qc.invalidateQueries('relatorio-mesa')
        toast.success(`Mesa ${mesa} liberada!`)
      },
      onError: () => toast.error('Erro ao liberar mesa'),
    }
  )

  const cancelar = id => {
    if (!confirm('Cancelar este pedido?')) return
    atualizarStatus.mutate({ id, status: 'cancelado' })
  }

  const confirmarLiberacao = (mesa) => {
    if (!confirm(`Liberar Mesa ${mesa}?\nTodos os pedidos pendentes serão marcados como entregue.\nIsso encerrará o atendimento atual.`)) return
    liberarMesa.mutate(mesa)
  }

  const FILTROS = [
    { key: 'todos',      label: 'Todos' },
    { key: 'recebido',   label: 'Recebidos' },
    { key: 'em_preparo', label: 'Em preparo' },
    { key: 'pronto',     label: 'Prontos' },
    { key: 'entregue',   label: 'Entregues' },
    { key: 'cancelado',  label: 'Cancelados' },
  ]

  // Agrupa pedidos por mesa, depois por sessão dentro de cada mesa
  const porMesa = pedidos.reduce((acc, p) => {
    const key = p.mesa_numero
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  return (
    <div className="p-7 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] text-sumi">Pedidos</h1>
          <p className="text-[12px] text-sumi/50">{pedidos.length} pedido(s)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={dataFiltro} onChange={e => setData(e.target.value)}
            className="border border-washi-dark rounded-lg px-3 py-2 text-[12px] text-sumi focus:outline-none focus:ring-2 focus:ring-beni" />
          <button onClick={() => setData('')}
            className="text-[12px] text-sumi/50 hover:text-sumi border border-washi-dark px-3 py-2 rounded-lg transition-colors">
            Todos os dias
          </button>
          <div className="flex border border-washi-dark rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('lista')}
              className={`px-3 py-2 text-[12px] transition-colors ${viewMode==='lista' ? 'bg-sumi text-washi' : 'text-sumi/50 hover:bg-washi'}`}>
              Lista
            </button>
            <button onClick={() => setViewMode('mesas')}
              className={`px-3 py-2 text-[12px] transition-colors ${viewMode==='mesas' ? 'bg-sumi text-washi' : 'text-sumi/50 hover:bg-washi'}`}>
              Por mesa
            </button>
          </div>
        </div>
      </div>

      {isError && (
        <div className="bg-white border border-washi-dark rounded-xl p-4 mb-4">
          <p className="text-[13px] font-medium text-sumi">Erro ao carregar pedidos</p>
          <button onClick={() => refetch()} className="mt-1 text-[12px] text-beni hover:underline">Tentar novamente</button>
        </div>
      )}

      {/* Filtros de status */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {FILTROS.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors
              ${filtro===f.key ? 'bg-sumi text-washi' : 'bg-white border border-washi-dark text-sumi/50 hover:border-sumi/30'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-beni border-t-transparent animate-spin" />
        </div>
      ) : viewMode === 'mesas' ? (

        // ══ View por mesa ══════════════════════════════════════
        <div className="space-y-8">
          {Object.keys(porMesa).length === 0 ? (
            <div className="text-center py-16 text-sumi/50 text-[13px]">Nenhum pedido encontrado.</div>
          ) : Object.entries(porMesa)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([mesaNum, pedidosDaMesa]) => {
                const sessoes = agruparPorSessao(pedidosDaMesa)
                return (
                  <div key={mesaNum}>
                    {/* Título da mesa */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-beni flex items-center justify-center text-white font-semibold text-[14px]">
                        {mesaNum}
                      </div>
                      <h2 className="text-[16px] font-semibold text-sumi">Mesa {mesaNum}</h2>
                      <div className="flex-1 h-px bg-washi-dark" />
                    </div>

                    {/* Blocos de atendimento — um por sessão */}
                    <div className="space-y-3 ml-0">
                      {sessoes.map((sessao, idx) => (
                        <BlocoAtendimento
                          key={`${mesaNum}-${sessao.tipo}-${idx}`}
                          mesa={Number(mesaNum)}
                          sessao={sessao}
                          onAtualizarStatus={(id, status) => atualizarStatus.mutate({ id, status })}
                          onCancelar={cancelar}
                          onLiberar={() => confirmarLiberacao(Number(mesaNum))}
                          onRelatorio={() => setRel(Number(mesaNum))}
                          liberandoMesa={liberarMesa.isLoading}
                        />
                      ))}
                    </div>
                  </div>
                )
              })
          }
        </div>

      ) : (

        // ══ View lista ══════════════════════════════════════════
        <div className="space-y-2">
          {pedidos.length === 0 ? (
            <div className="text-center py-16 text-sumi/50 text-[13px]">Nenhum pedido encontrado.</div>
          ) : pedidos.map(p => {
            const cfg     = STATUS[p.status] || STATUS.recebido
            const proximo = p.sessao_ativa ? PROXIMO[p.status] : null
            return (
              <div key={p.id}
                className={`bg-white border-l-4 border border-washi-dark rounded-xl overflow-hidden ${cfg.border} ${!p.sessao_ativa ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-washi-mid flex items-center justify-center text-[11px] font-semibold text-sumi/60 flex-shrink-0">
                    M{p.mesa_numero}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[13px] font-medium text-sumi">{p.nome_cliente}</span>
                      <span className="text-[11px] text-sumi/40">{fmtTime(p.criado_em)}</span>
                      {!p.sessao_ativa && (
                        <span className="text-[10px] text-sumi/30 bg-washi-mid px-1.5 py-0.5 rounded">histórico</span>
                      )}
                      {!dataFiltro && (
                        <span className="text-[10px] text-sumi/40 bg-washi-mid px-1.5 py-0.5 rounded">{fmtDate(p.criado_em)}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(p.itens || []).map((it, i) => (
                        <span key={i} className="text-[10px] bg-washi-mid text-sumi/50 px-2 py-0.5 rounded-full">
                          {it.quantidade}× {it.item_nome || it.nome}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[14px] font-semibold text-sumi">{fmt(p.total)}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {proximo && (
                      <button onClick={() => atualizarStatus.mutate({ id: p.id, status: proximo })}
                        className="text-[11px] bg-beni hover:bg-beni-mid text-white px-2.5 py-1.5 rounded-lg transition-colors font-medium">
                        {PROXIMO_LABEL[p.status]}
                      </button>
                    )}
                    {p.sessao_ativa && !['cancelado','entregue'].includes(p.status) && (
                      <button onClick={() => cancelar(p.id)}
                        className="text-[11px] text-red-400 hover:text-red-600 px-2 py-1.5 rounded-lg transition-colors">
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {relatorioMesa !== null && (
        <RelatorioModal mesa={relatorioMesa} onClose={() => setRel(null)} />
      )}
    </div>
  )
}
