import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function StatCard({ icon, title, value, sub, color }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-6 border-l-4 ${color}`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: pedidos = [], isError, error, refetch } = useQuery('pedidos-dash',
    () => api.get('/api/pedidos').then(r => r.data),
    { refetchInterval: 30000 }
  )

  const hoje = new Date().toDateString()
  const pedidosHoje = pedidos.filter(p => new Date(p.criado_em).toDateString() === hoje)
  const faturamentoHoje = pedidosHoje.filter(p => p.status !== 'cancelado').reduce((s, p) => s + p.total, 0)
  const pendentes = pedidos.filter(p => ['recebido', 'em_preparo'].includes(p.status))

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Olá, {user?.nome} 👋</h1>
        <p className="text-gray-500 text-sm">Resumo do dia — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {isError && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 border border-gray-100">
          <p className="font-semibold text-gray-900">
            {error?.response?.status === 503
              ? 'Banco indisponível'
              : !error?.response
                ? 'Servidor offline'
                : 'Erro ao carregar dados'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {error?.response?.status === 503
              ? 'Algumas informações podem não aparecer enquanto o banco estiver instável.'
              : !error?.response
                ? 'Verifique se o backend está rodando.'
                : 'Tente novamente.'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700"
          >
            🔄 Tentar novamente
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon="🧾" title="Pedidos hoje" value={pedidosHoje.length} color="border-brand-500" />
        <StatCard icon="💰" title="Faturamento hoje" value={formatCurrency(faturamentoHoje)} color="border-green-500" />
        <StatCard icon="🔔" title="Pendentes" value={pendentes.length} sub="recebidos + em preparo" color="border-yellow-500" />
        <StatCard icon="✅" title="Entregues hoje" value={pedidosHoje.filter(p => p.status === 'entregue').length} color="border-blue-500" />
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { to: '/admin/pedidos', icon: '🧾', label: 'Ver Pedidos', desc: 'Gerenciar todos os pedidos' },
          { to: '/admin/cardapio', icon: '🍽️', label: 'Editar Cardápio', desc: 'Adicionar / remover itens' },
          { to: '/admin/mesas', icon: '🪑', label: 'Mesas & QR', desc: 'Gerenciar mesas e QR codes' },
        ].map(({ to, icon, label, desc }) => (
          <Link key={to} to={to} className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow group">
            <span className="text-3xl">{icon}</span>
            <div>
              <p className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Últimos pedidos */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Últimos pedidos do dia</h2>
          <Link to="/admin/pedidos" className="text-sm text-brand-600 hover:underline">Ver todos →</Link>
        </div>
        <div className="divide-y">
          {pedidosHoje.slice(0, 8).map(p => (
            <div key={p.id} className="px-5 py-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="font-semibold">Mesa #{p.mesa_numero}</span>
                <span className="text-gray-500">{p.nome_cliente}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium">{formatCurrency(p.total)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                  ${p.status === 'recebido' ? 'bg-blue-100 text-blue-700' :
                    p.status === 'em_preparo' ? 'bg-yellow-100 text-yellow-700' :
                    p.status === 'pronto' ? 'bg-green-100 text-green-700' :
                    p.status === 'entregue' ? 'bg-gray-100 text-gray-600' :
                    'bg-red-100 text-red-700'}`}>
                  {p.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
          {pedidosHoje.length === 0 && (
            <p className="p-8 text-center text-gray-400">Nenhum pedido hoje ainda</p>
          )}
        </div>
      </div>
    </div>
  )
}
