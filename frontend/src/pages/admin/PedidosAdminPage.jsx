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
const hoje    = () => new Date().toISOString().slice(0, 10)

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
      .total{font-weight:bold;font-size:13px;margin-top:4px}
      .geral{font-size:16px;font-weight:bold;margin-top:16px;text-align:right;border-top:2px solid #333;padding-top:8px}
    </style></head><body>
    <h2>Relatório — Mesa ${mesa}</h2>
    <p style="font-size:12px;color:#666">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
    ${(data?.clientes || []).map(c => `
      <h3>${c.nome}</h3>
      ${c.pedidos.map(p => `
        <table>
          <tr><th>Item</th><th>Qtd</th><th>Valor</th></tr>
          ${p.itens.map(i => `<tr><td>${i.item_nome}</td><td>${i.quantidade}</td><td>R$ ${i.subtotal.toFixed(2)}</td></tr>`).join('')}
        </table>
        <div class="total">Subtotal: R$ ${p.total.toFixed(2)}</div>
      `).join('')}
      <p style="font-size:13px;font-weight:bold;text-align:right">Total ${c.nome}: R$ ${c.total.toFixed(2)}</p>
    `).join('')}
    <div class="geral">Total Geral: R$ ${data?.total_geral?.toFixed(2) || '0,00'}</div>
    <script>window.onload=()=>window.print()</script>
    </body></html>`)
    win.document.close()
  }

  return (
    <div className="fixed inset-0 bg-sumi/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col border border-washi-dark">
        <div className="flex items-center justify-between p-4 border-b border-washi-mid">
          <div>
            <h2 className="font-display text-[18px] text-sumi">Relatório — Mesa {mesa}</h2>
            {data?.sessao_desde && (
              <p className="text-[11px] text-sumi/50 mt-0.5">
                Sessão desde {new Date(data.sessao_desde).toLocaleString('pt-BR')}
              </p>
            )}
            {!data?.sessao_desde && data && (
              <p className="text-[11px] text-sumi/50 mt-0.5">Mesa nunca liberada — mostrando todos os pedidos</p>
            )}
          </div>
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

export default function PedidosAdminPage() {
  const qc = useQueryClient()
  const [filtro, setFiltro]     = useState('todos')
  const [viewMode, setViewMode] = useState('mesas')   // 'lista' | 'mesas'
  const [detalhe, setDetalhe]   = useState(null)
  const [dataFiltro, setData]   = useState(hoje())    // filtro por dia
  const [relatorioMesa, setRel] = useState(null)

  const { data: pedidos = [], isLoading, isError, error, refetch } = useQuery(
    ['pedidos', filtro, dataFiltro],
    () => {
      let url = '/api/pedidos'
      const params = []
      if (filtro !== 'todos') params.push(`status=${filtro}`)
      if (dataFiltro)         params.push(`data=${dataFiltro}`)
      if (params.length)      url += '?' + params.join('&')
      return api.get(url).then(r => r.data)
    },
    { refetchInterval: 20000, retry: 3, retryDelay: attemptIndex => Math.min(2000 * 2 ** attemptIndex, 10000) }
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
        toast.success(`Mesa ${mesa} liberada!`)
      },
      onError: () => toast.error('Erro ao liberar mesa'),
    }
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

  // Agrupar por mesa para view de mesas
  const porMesa = pedidos.reduce((acc, p) => {
    const key = `Mesa ${p.mesa_numero}`
    if (!acc[key]) acc[key] = { mesa: p.mesa_numero, pedidos: [] }
    acc[key].pedidos.push(p)
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
        <div className="flex items-center gap-2">
          {/* Filtro de data */}
          <input
            type="date"
            value={dataFiltro}
            onChange={e => setData(e.target.value)}
            className="border border-washi-dark rounded-lg px-3 py-2 text-[12px] text-sumi focus:outline-none focus:ring-2 focus:ring-beni"
          />
          <button onClick={() => setData('')}
            className="text-[12px] text-sumi/50 hover:text-sumi border border-washi-dark px-3 py-2 rounded-lg transition-colors">
            Todos os dias
          </button>
          {/* Toggle view */}
          <div className="flex border border-washi-dark rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('lista')}
              className={`px-3 py-2 text-[12px] transition-colors ${viewMode === 'lista' ? 'bg-sumi text-washi' : 'text-sumi/50 hover:bg-washi'}`}>
              Lista
            </button>
            <button onClick={() => setViewMode('mesas')}
              className={`px-3 py-2 text-[12px] transition-colors ${viewMode === 'mesas' ? 'bg-sumi text-washi' : 'text-sumi/50 hover:bg-washi'}`}>
              Por mesa
            </button>
          </div>

        </div>
      </div>

      {isError && (
        <div className="bg-white border border-washi-dark rounded-xl p-4 mb-4">
          <p className="text-[13px] font-medium text-sumi">
            {error?.response?.status === 503 ? 'Banco indisponível' : !error?.response ? 'Servidor offline' : 'Erro ao carregar pedidos'}
          </p>
          <button onClick={() => refetch()} className="mt-1 text-[12px] text-beni hover:underline">Tentar novamente</button>
        </div>
      )}

      {/* Filtros de status */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {FILTROS.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors
              ${filtro === f.key ? 'bg-sumi text-washi' : 'bg-white border border-washi-dark text-sumi/50 hover:border-washi-dark'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-beni border-t-transparent animate-spin" />
        </div>
      ) : viewMode === 'mesas' ? (

        /* ── View por mesa ── */
        <div className="space-y-6">
          {Object.values(porMesa).length === 0 ? (
            <div className="text-center py-16 text-sumi/50 text-[13px]">Nenhum pedido encontrado.</div>
          ) : Object.values(porMesa).map(({ mesa, pedidos: mp }) => {
            const totalMesa = mp.filter(p => p.status !== 'cancelado').reduce((s, p) => s + p.total, 0)
            const temAtivos = mp.some(p => p.status !== 'cancelado')
            return (
              <div key={mesa} className="bg-white border border-washi-dark rounded-xl overflow-hidden">
                {/* Header da mesa */}
                <div className="bg-washi px-4 py-3 flex items-center justify-between border-b border-washi-dark">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-beni flex items-center justify-center text-white font-medium text-[13px]">
                      {mesa}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-sumi">Mesa {mesa}</p>
                      <p className="text-[11px] text-sumi/50">{mp.length} pedido(s) — Total: {fmt(totalMesa)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setRel(mesa)}
                      className="text-[11px] bg-washi-mid hover:bg-washi-dark text-sumi/50 px-2.5 py-1.5 rounded-lg transition-colors">
                      Relatório
                    </button>
                    {temAtivos && (
                      <button
                        onClick={() => { if (confirm(`Liberar Mesa ${mesa}? Todos os pedidos serão marcados como entregue.`)) liberarMesa.mutate(mesa) }}
                        className="text-[11px] bg-green-500 hover:bg-green-600 text-white px-2.5 py-1.5 rounded-lg transition-colors font-medium">
                        Liberar mesa
                      </button>
                    )}
                  </div>
                </div>

                {/* Pedidos da mesa agrupados por cliente */}
                {Object.entries(
                  mp.reduce((acc, p) => {
                    const k = p.nome_cliente || 'Sem nome'
                    if (!acc[k]) acc[k] = []
                    acc[k].push(p)
                    return acc
                  }, {})
                ).map(([nome, peds]) => (
                  <div key={nome} className="border-b border-washi-mid last:border-0">
                    <div className="px-4 py-2 bg-washi/50">
                      <span className="text-[12px] font-medium text-sumi">{nome}</span>
                    </div>
                    {peds.map(p => {
                      const cfg     = STATUS[p.status] || STATUS.recebido
                      const proximo = PROXIMO[p.status]
                      return (
                        <div key={p.id} className={`border-l-4 ${cfg.border} px-4 py-2.5 flex items-center gap-3`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-1">
                              {(p.itens || []).map((it, i) => (
                                <span key={i} className="text-[10px] bg-washi-mid text-sumi/50 px-2 py-0.5 rounded-full">
                                  {it.quantidade}× {it.item_nome || it.nome}
                                </span>
                              ))}
                            </div>
                            <p className="text-[10px] text-sumi/50 mt-0.5">{fmtTime(p.criado_em)}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[13px] font-medium text-sumi">{fmt(p.total)}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                            {proximo && (
                              <button onClick={() => atualizarStatus.mutate({ id: p.id, status: proximo })}
                                className="text-[11px] bg-beni hover:bg-beni-mid text-white px-2 py-1 rounded-lg transition-colors">
                                {PROXIMO_LABEL[p.status]}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

      ) : (

        /* ── View lista ── */
        <div className="space-y-4">
          {/* Resumo de mesas com pedidos ativos — botão liberar */}
          {(() => {
            const mesasAtivas = {}
            pedidos.forEach(p => {
              if (!['entregue','cancelado'].includes(p.status)) {
                if (!mesasAtivas[p.mesa_numero]) mesasAtivas[p.mesa_numero] = 0
                mesasAtivas[p.mesa_numero]++
              }
            })
            const nums = Object.keys(mesasAtivas).map(Number).sort((a,b) => a-b)
            if (nums.length === 0) return null
            return (
              <div className="bg-white border border-washi-dark rounded-xl p-3 flex flex-wrap gap-2 items-center">
                <span className="text-[11px] font-medium uppercase tracking-widest text-sumi/50 mr-1">Mesas com pedidos:</span>
                {nums.map(n => (
                  <div key={n} className="flex items-center gap-1.5">
                    <span className="text-[12px] font-medium text-sumi bg-washi px-2 py-1 rounded-lg">
                      Mesa {n} ({mesasAtivas[n]})
                    </span>
                    <button
                      onClick={() => { if (confirm(`Liberar Mesa ${n}? Todos os pedidos serão marcados como entregue.`)) liberarMesa.mutate(n) }}
                      className="text-[11px] bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-lg transition-colors font-medium">
                      Liberar
                    </button>
                    <button onClick={() => setRel(n)}
                      className="text-[11px] bg-washi-mid hover:bg-washi-dark text-sumi/50 px-2 py-1 rounded-lg transition-colors">
                      Relatório
                    </button>
                  </div>
                ))}
              </div>
            )
          })()}
          <div className="space-y-2">
          {pedidos.map(p => {
            const cfg     = STATUS[p.status] || STATUS.recebido
            const proximo = PROXIMO[p.status]
            return (
              <div key={p.id} className={`bg-white border-l-4 border border-washi-dark rounded-xl overflow-hidden ${cfg.border}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-washi-mid flex items-center justify-center text-[11px] font-medium text-sumi/50 flex-shrink-0">
                    M{p.mesa_numero}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-medium text-sumi">{p.nome_cliente}</span>
                      <span className="text-[11px] text-sumi/50">{fmtTime(p.criado_em)}</span>
                      {dataFiltro === '' && (
                        <span className="text-[10px] text-sumi/50 bg-washi-mid px-1.5 py-0.5 rounded">{fmtDate(p.criado_em)}</span>
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
                    <p className="text-[14px] font-medium text-sumi">{fmt(p.total)}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => setDetalhe(detalhe?.id === p.id ? null : p)}
                      className="text-[11px] bg-washi-mid hover:bg-washi-dark text-sumi/50 px-2.5 py-1.5 rounded-lg transition-colors">
                      {detalhe?.id === p.id ? 'Fechar' : 'Detalhes'}
                    </button>
                    {proximo && (
                      <button onClick={() => atualizarStatus.mutate({ id: p.id, status: proximo })}
                        className="text-[11px] bg-beni hover:bg-beni-mid text-white px-2.5 py-1.5 rounded-lg transition-colors font-medium">
                        {PROXIMO_LABEL[p.status]}
                      </button>
                    )}
                    {!['cancelado','entregue'].includes(p.status) && (
                      <button onClick={() => cancelar(p.id)}
                        className="text-[11px] text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors">
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {detalhe?.id === p.id && (
                  <div className="border-t border-washi-mid bg-washi px-5 py-4">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="text-sumi/50 text-[10px] uppercase">
                          <th className="text-left pb-2">Item</th>
                          <th className="text-center pb-2">Qtd</th>
                          <th className="text-right pb-2">Unit.</th>
                          <th className="text-right pb-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-creme-3">
                        {(p.itens || []).map((it, i) => (
                          <tr key={i}>
                            <td className="py-1.5 font-medium text-sumi">{it.item_nome || it.nome}</td>
                            <td className="py-1.5 text-center text-sumi/50">{it.quantidade}</td>
                            <td className="py-1.5 text-right text-sumi/50">{fmt(it.preco_unitario)}</td>
                            <td className="py-1.5 text-right font-medium text-sumi">{fmt(it.preco_unitario * it.quantidade)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-washi-mid font-medium">
                          <td colSpan={3} className="pt-2 text-right text-sumi/50">Total</td>
                          <td className="pt-2 text-right text-beni">{fmt(p.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
          {pedidos.length === 0 && (
            <div className="text-center py-16 text-sumi/50 text-[13px]">Nenhum pedido encontrado.</div>
          )}
          </div>
        </div>
      )}

      {/* Modal relatório */}
      {relatorioMesa && (
        <RelatorioModal mesa={relatorioMesa} onClose={() => setRel(null)} />
      )}
    </div>
  )
}
