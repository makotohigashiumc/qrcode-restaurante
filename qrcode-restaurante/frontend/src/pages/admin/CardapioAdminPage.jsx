import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import api from '../../services/api'

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function ModalItem({ item, categorias, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome: item?.nome || '',
    descricao: item?.descricao || '',
    preco: item?.preco || '',
    categoria_id: item?.categoria_id || '',
    imagem_url: item?.imagem_url || '',
    disponivel: item?.disponivel !== undefined ? item.disponivel : true,
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{item ? 'Editar Item' : 'Novo Item'}</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700">Nome *</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700">Descrição</label>
            <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={2}
              className="w-full border rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Preço (R$) *</label>
            <input type="number" step="0.01" value={form.preco} onChange={e => set('preco', e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Categoria</label>
            <select value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Sem categoria</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700">URL da imagem</label>
            <input value={form.imagem_url} onChange={e => set('imagem_url', e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="https://..." />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="disp" checked={form.disponivel} onChange={e => set('disponivel', e.target.checked)} className="accent-brand-600 w-4 h-4" />
            <label htmlFor="disp" className="text-sm text-gray-700">Item disponível no cardápio</label>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onFechar} className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button onClick={() => onSalvar(form)} className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-brand-700">Salvar</button>
        </div>
      </div>
    </div>
  )
}

export default function CardapioAdminPage() {
  const qc = useQueryClient()
  const [modalItem, setModalItem] = useState(null) // null | { item? }
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const seededRef = useRef(false)

  const {
    data: categorias = [],
    isLoading: categoriasLoading,
    isError: categoriasError,
    error: categoriasErr,
    refetch: refetchCategorias,
  } = useQuery('categorias', () => api.get('/api/admin/categorias').then(r => r.data))
  const {
    data: itens = [],
    isLoading,
    isError: itensError,
    error: itensErr,
    refetch: refetchItens,
  } = useQuery('itens-admin', () => api.get('/api/admin/itens').then(r => r.data))

  const criarCategoriasPadrao = useMutation(async () => {
    const defaults = [
      { nome: 'Entradas', ordem: 1 },
      { nome: 'Pratos Principais', ordem: 2 },
      { nome: 'Sobremesas', ordem: 3 },
      { nome: 'Bebidas', ordem: 4 },
    ]
    for (const c of defaults) {
      await api.post('/api/admin/categorias', c)
    }
  }, {
    onSuccess: () => {
      qc.invalidateQueries('categorias')
      toast.success('Categorias criadas!')
    },
    onError: () => toast.error('Erro ao criar categorias'),
  })

  useEffect(() => {
    if (seededRef.current) return
    if (categoriasLoading || categoriasError) return
    if (categorias.length > 0) { seededRef.current = true; return }

    seededRef.current = true
    toast('Criando categorias padrão...', { icon: '🗂️' })
    criarCategoriasPadrao.mutate()
  }, [categoriasLoading, categoriasError, categorias])

  const salvarItem = useMutation(async (form) => {
    const payload = { ...form, preco: parseFloat(form.preco) || 0, categoria_id: form.categoria_id || null }
    if (modalItem?.item) {
      await api.put(`/api/admin/itens/${modalItem.item.id}`, payload)
    } else {
      await api.post('/api/admin/itens', payload)
    }
  }, {
    onSuccess: () => { qc.invalidateQueries('itens-admin'); setModalItem(null); toast.success('Item salvo!') },
    onError: () => toast.error('Erro ao salvar item'),
  })

  const deletarItem = useMutation(async (id) => {
    if (!confirm('Remover este item?')) return
    await api.delete(`/api/admin/itens/${id}`)
  }, {
    onSuccess: () => { qc.invalidateQueries('itens-admin'); toast.success('Item removido') },
  })

  const itensFiltrados = categoriaFiltro === 'todas'
    ? itens
    : itens.filter(i => (i.categoria_id || '') === categoriaFiltro)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🍽️ Cardápio</h1>
          <p className="text-sm text-gray-500">{itens.length} itens cadastrados</p>
        </div>
        <button onClick={() => setModalItem({})} className="bg-brand-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-brand-700 transition-colors">
          + Novo Item
        </button>
      </div>

      {(categoriasError || itensError) && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 border border-gray-100">
          <p className="font-semibold text-gray-900">
            {(categoriasErr?.response?.status === 503 || itensErr?.response?.status === 503)
              ? 'Banco indisponível'
              : (!categoriasErr?.response && !itensErr?.response)
                ? 'Servidor offline'
                : 'Erro ao carregar cardápio'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {(categoriasErr?.response?.status === 503 || itensErr?.response?.status === 503)
              ? 'Tente novamente em alguns segundos.'
              : (!categoriasErr?.response && !itensErr?.response)
                ? 'Verifique se o backend está rodando.'
                : 'Não foi possível buscar categorias/itens.'}
          </p>
          <button
            onClick={() => { refetchCategorias(); refetchItens() }}
            className="mt-3 bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700"
          >
            🔄 Tentar novamente
          </button>
        </div>
      )}

      {/* Filtro de categorias */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setCategoriaFiltro('todas')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${categoriaFiltro === 'todas' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Todas
        </button>
        {categorias.map(c => (
          <button key={c.id} onClick={() => setCategoriaFiltro(c.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${categoriaFiltro === c.id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {c.nome}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-3 text-left font-semibold text-gray-600">Item</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-600">Categoria</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-600">Preço</th>
                <th className="px-5 py-3 text-center font-semibold text-gray-600">Disponível</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {itensFiltrados.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{item.nome}</p>
                    {item.descricao && <p className="text-xs text-gray-400 truncate max-w-xs">{item.descricao}</p>}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{item.categoria_nome || '—'}</td>
                  <td className="px-5 py-3 font-semibold text-brand-600">{formatCurrency(item.preco)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${item.disponivel ? 'bg-green-500' : 'bg-red-400'}`} />
                  </td>
                  <td className="px-5 py-3 text-right space-x-2">
                    <button onClick={() => setModalItem({ item })} className="text-brand-600 hover:underline">Editar</button>
                    <button onClick={() => deletarItem.mutate(item.id)} className="text-red-500 hover:underline">Remover</button>
                  </td>
                </tr>
              ))}
              {itensFiltrados.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-gray-400">Nenhum item encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalItem !== null && (
        <ModalItem
          item={modalItem?.item}
          categorias={categorias}
          onSalvar={form => salvarItem.mutate(form)}
          onFechar={() => setModalItem(null)}
        />
      )}
    </div>
  )
}
