import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const STATUS_CLS = {
  recebido:   'bg-blue-50   text-blue-700',
  em_preparo: 'bg-amber-50  text-amber-700',
  pronto:     'bg-indigo-50 text-indigo-700',
  entregue:   'bg-green-50  text-green-700',
  cancelado:  'bg-red-50    text-red-600',
}

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: pedidos = [], isError, error, refetch } = useQuery(
    'pedidos-dash',
    () => api.get('/api/pedidos').then(r => r.data),
    { refetchInterval: 30000 }
  )

  const hoje       = new Date().toDateString()
  const doDia      = pedidos.filter(p => new Date(p.criado_em).toDateString() === hoje)
  const faturamento = doDia.filter(p => p.status !== 'cancelado').reduce((s, p) => s + p.total, 0)
  const pendentes  = pedidos.filter(p => ['recebido', 'em_preparo'].includes(p.status)).length
  const entregues  = doDia.filter(p => p.status === 'entregue').length

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="p-7 max-w-6xl mx-auto">

      {/* ── Cabeçalho ── */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[26px] text-espresso leading-tight mb-1">
            {saudacao}, {user?.nome}.
          </h1>
          <span className="text-[12px] text-espresso-4 bg-creme-3 px-3 py-1 rounded-full">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          Restaurante aberto
        </div>
      </div>

      {/* ── Erro de conexão ── */}
      {isError && (
        <div className="bg-white border border-creme-4 rounded-xl p-4 mb-5">
          <p className="font-medium text-espresso text-[13px]">
            {error?.response?.status === 503 ? 'Banco indisponível' : !error?.response ? 'Servidor offline' : 'Erro ao carregar dados'}
          </p>
          <button onClick={() => refetch()} className="mt-2 text-[12px] text-brand-500 hover:underline">
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── Métricas ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Pedidos hoje',  value: doDia.length },
          { label: 'Faturamento',   value: fmt(faturamento), accent: true },
          { label: 'Em andamento',  value: pendentes,    sub: 'recebidos + cozinha' },
          { label: 'Entregues',     value: entregues },
        ].map(({ label, value, accent, sub }) => (
          <div key={label} className="bg-white border border-creme-4 rounded-xl px-4 py-4">
            <p className="text-[10px] font-medium uppercase tracking-[.08em] text-espresso-4 mb-2">{label}</p>
            <p className={`text-[24px] font-light leading-none ${accent ? 'text-brand-500' : 'text-espresso'}`}>{value}</p>
            {sub && <p className="text-[11px] text-espresso-4 mt-1.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Conteúdo ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">

        {/* Últimos pedidos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-medium uppercase tracking-[.08em] text-espresso">Últimos pedidos</span>
            <Link to="/admin/pedidos" className="text-[12px] text-brand-500 hover:underline font-medium">Ver todos →</Link>
          </div>
          <div className="bg-white border border-creme-4 rounded-xl divide-y divide-creme-3">
            {doDia.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-espresso-4">Nenhum pedido hoje ainda.</p>
            ) : (
              doDia.slice(0, 6).map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-creme-2 flex items-center justify-center text-[11px] font-medium text-espresso-4 flex-shrink-0">
                    M{p.mesa_numero}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-espresso truncate">{p.nome_cliente}</p>
                    <p className="text-[11px] text-espresso-4 truncate">
                      {(p.itens || []).map(i => `${i.quantidade}× ${i.item_nome || i.nome}`).join(', ')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[12px] text-espresso-4 mb-1">
                      {new Date(p.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_CLS[p.status] || ''}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[13px] font-medium text-espresso w-16 text-right flex-shrink-0">
                    {fmt(p.total)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Atalhos */}
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[.08em] text-espresso mb-3">Atalhos</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: '/admin/cardapio',     label: 'Cardápio',  sub: 'Editar itens' },
                { to: '/admin/mesas',        label: 'QR Codes',  sub: 'Mesas' },
                { to: '/admin/pedidos',      label: 'Pedidos',   sub: 'Todos os status' },
                { to: '/admin/configuracao', label: 'Config.',   sub: 'Restaurante' },
              ].map(({ to, label, sub }) => (
                <Link
                  key={to}
                  to={to}
                  className="block bg-espresso hover:bg-espresso-2 rounded-xl p-3.5 transition-colors no-underline"
                >
                  <p className="text-[12px] font-medium text-creme-3">{label}</p>
                  <p className="text-[10px] text-espresso-4 mt-0.5">{sub}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Pendentes destaque */}
          {pendentes > 0 && (
            <Link
              to="/admin/pedidos"
              className="block bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 no-underline"
            >
              <p className="text-[10px] font-medium uppercase tracking-widest text-amber-700 mb-1">Atenção</p>
              <p className="text-[22px] font-light text-amber-800 leading-none">{pendentes}</p>
              <p className="text-[12px] text-amber-700 mt-1">pedido(s) aguardando ação</p>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
