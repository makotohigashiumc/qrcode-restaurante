import { useQuery } from 'react-query'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''

const STATUS = {
  recebido:   { label: 'Recebido',   cls: 'text-kin border-kin bg-kin-soft'  },
  em_preparo: { label: 'Em preparo', cls: 'text-beni border-beni bg-beni-soft' },
  pronto:     { label: 'Pronto',     cls: 'text-take border-take bg-take-soft' },
  entregue:   { label: 'Entregue',   cls: 'text-sumi/40 border-washi-dark bg-washi-mid' },
  cancelado:  { label: 'Cancelado',  cls: 'text-sumi/30 border-washi-dark bg-washi-mid'  },
}

const hoje = new Date().toISOString().slice(0, 10)

function useKeepAlive() {
  useEffect(() => {
    const BACKEND = import.meta.env.VITE_API_URL || ''
    const ping = () => fetch(`${BACKEND}/health`).catch(() => {})
    ping()
    const id = setInterval(ping, 4 * 60 * 1000)
    return () => clearInterval(id)
  }, [])
}
const diaSemana = new Date().toLocaleDateString('pt-BR', { weekday: 'long' })
const dataFormatada = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

export default function DashboardPage() {
  useKeepAlive()
  const { data: pedidos = [], isLoading, isError, error, refetch } = useQuery(
    'dashboard-pedidos',
    () => api.get(`/api/pedidos?data=${hoje}`).then(r => r.data),
    { refetchInterval: 30000, retry: 3, retryDelay: attemptIndex => Math.min(2000 * 2 ** attemptIndex, 10000) }
  )

  const ativos     = pedidos.filter(p => !['entregue', 'cancelado'].includes(p.status))
  const emPreparo  = pedidos.filter(p => p.status === 'em_preparo')
  const entregues  = pedidos.filter(p => p.status === 'entregue')
  const faturamento = entregues.reduce((s, p) => s + (p.total || 0), 0)
  const mesasAtivas = new Set(ativos.map(p => p.mesa_numero)).size
  const recentes   = [...pedidos].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)).slice(0, 6)

  return (
    <div className="max-w-5xl mx-auto px-7 py-10">

      {}
      <div className="flex items-end justify-between mb-8 pb-5 border-b border-half border-washi-mid">
        <div>
          <h1 className="font-display text-sumi text-3xl font-light">
            Boa tarde!
          </h1>
          <p className="font-sans text-sumi/40 text-xs tracking-wide mt-1 capitalize">
            {diaSemana}, {dataFormatada}
          </p>
        </div>
        <button onClick={() => refetch()} className="font-sans text-[9px] tracking-widest-jp uppercase text-sumi/35 hover:text-sumi transition-colors">
          Atualizar
        </button>
      </div>

      {isError && (
        <div className="border border-half border-washi-dark bg-washi-mid rounded px-5 py-4 mb-7">
          <p className="font-sans text-sm text-sumi">
            {error?.response?.status === 503 ? 'Banco indisponível' : !error?.response ? 'Servidor offline' : 'Erro ao carregar dados'}
          </p>
          <button onClick={() => refetch()} className="font-sans text-xs text-beni mt-1 hover:underline">Tentar novamente</button>
        </div>
      )}

      {}
      <div className="grid grid-cols-4 border border-half border-washi-dark mb-10">
        {[
          { n: pedidos.length, label: 'Pedidos hoje', color: '' },
          { n: fmt(faturamento), label: 'Faturamento', color: 'text-kin' },
          { n: mesasAtivas, label: 'Mesas ativas', color: 'text-take' },
          { n: emPreparo.length, label: 'Em preparo', color: 'text-beni' },
        ].map((m, i) => (
          <div key={i} className={`px-5 py-5 ${i < 3 ? 'border-r border-half border-washi-dark' : ''}`}>
            <div className={`font-display text-4xl font-light leading-none mb-2 ${m.color || 'text-sumi'}`}>
              {isLoading ? '—' : m.n}
            </div>
            <div className="font-sans text-[9px] tracking-widest-jp uppercase text-sumi/40">{m.label}</div>
          </div>
        ))}
      </div>

      {}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-beni text-sm">•</span>
          <span className="font-sans text-[9px] tracking-widest-jp uppercase text-sumi/50">Últimos pedidos</span>
          <div className="flex-1 h-[0.5px] bg-washi-mid" />
          <Link to="/admin/pedidos" className="font-sans text-[9px] tracking-wide text-beni hover:underline">
            Ver todos →
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 border-sumi border-t-transparent animate-spin" />
          </div>
        ) : recentes.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-display text-sumi/20 text-xl font-light">Nenhum pedido hoje</p>
          </div>
        ) : (
          <div>
            {}
            <div className="grid grid-cols-[48px_1fr_1.4fr_80px_100px] gap-4 py-2 border-b border-half border-washi-dark">
              {['Mesa', 'Cliente', 'Itens', 'Total', 'Status'].map(h => (
                <span key={h} className="font-sans text-[8px] tracking-widest-jp uppercase text-sumi/40">{h}</span>
              ))}
            </div>

            {recentes.map(p => {
              const cfg = STATUS[p.status] || STATUS.recebido
              return (
                <div key={p.id} className="grid grid-cols-[48px_1fr_1.4fr_80px_100px] gap-4 py-3.5 border-b border-half border-washi-mid items-center">
                  <div className="font-display text-xl font-semibold text-sumi leading-none">
                    {String(p.mesa_numero).padStart(2, '0')}
                  </div>
                  <div>
                    <p className="font-sans text-sm text-sumi">{p.nome_cliente || '—'}</p>
                    <p className="font-sans text-[10px] text-sumi/40">{fmtTime(p.criado_em)}</p>
                  </div>
                  <div className="font-sans text-xs text-sumi/50 truncate">
                    {(p.itens || []).map(i => `${i.quantidade}× ${i.item_nome || i.nome}`).join(', ') || '—'}
                  </div>
                  <div className="font-display text-sm font-semibold text-sumi text-right">
                    {fmt(p.total)}
                  </div>
                  <div>
                    <span className={`font-sans text-[8px] tracking-wide uppercase px-2 py-1 border border-half ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
