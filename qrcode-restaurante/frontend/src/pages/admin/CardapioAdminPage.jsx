import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import api from '../../services/api'

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function Modal({ item, categorias, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome:        item?.nome        || '',
    descricao:   item?.descricao   || '',
    preco:       item?.preco       || '',
    categoria_id:item?.categoria_id|| '',
    imagem_url:  item?.imagem_url  || '',
    disponivel:  item?.disponivel !== undefined ? item.disponivel : true,
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 bg-espresso/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4 border border-creme-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[18px] text-espresso">{item ? 'Editar item' : 'Novo item'}</h2>
          <button onClick={onFechar} className="text-espresso-4 hover:text-espresso text-xl leading-none">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-[10px] font-medium uppercase tracking-widest text-espresso-4 mb-1.5">Nome *</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)}
              className="w-full border border-creme-4 rounded-lg px-3 py-2.5 text-[13px] text-espresso focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-medium uppercase tracking-widest text-espresso-4 mb-1.5">Descrição</label>
            <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={2}
              className="w-full border border-creme-4 rounded-lg px-3 py-2.5 text-[13px] text-espresso focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-widest text-espresso-4 mb-1.5">Preço (R$) *</label>
            <input type="number" step="0.01" value={form.preco} onChange={e => set('preco', e.target.value)}
              className="w-full border border-creme-4 rounded-lg px-3 py-2.5 text-[13px] text-espresso focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-widest text-espresso-4 mb-1.5">Categoria</label>
            <select value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}
              className="w-full border border-creme-4 rounded-lg px-3 py-2.5 text-[13px] text-espresso focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Sem categoria</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-medium uppercase tracking-widest text-espresso-4 mb-1.5">URL da imagem</label>
            <input value={form.imagem_url} onChange={e => set('imagem_url', e.target.value)}
              placeholder="https://..."
              className="w-full border border-creme-4 rounded-lg px-3 py-2.5 text-[13px] text-espresso focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="col-span-2 flex items-center gap-2.5">
            <input type="checkbox" id="disp" checked={form.disponivel} onChange={e => set('disponivel', e.target.checked)}
              className="accent-brand-500 w-4 h-4" />
            <label htmlFor="disp" className="text-[13px] text-espresso-4">Item disponível no cardápio</label>
          </div>
        </div>
        <div className="flex gap-2.5 pt-1">
          <button onClick={onFechar}
            className="flex-1 border border-creme-4 py-2.5 rounded-lg text-[13px] text-espresso-4 hover:bg-creme transition-colors">
            Cancelar
          </button>
          <button onClick={() => onSalvar(form)}
            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg text-[13px] font-medium transition-colors">
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CardapioAdminPage() {
  const qc         = useQueryClient()
  const seededRef  = useRef(false)
  const [modal, setModal]   = useState(null)
  const [filtro, setFiltro] = useState('todas')

  const { data: categorias = [], isLoading: catLoading, isError: catErr, error: catE, refetch: refetchCat } =
    useQuery('categorias', () => api.get('/api/admin/categorias').then(r => r.data))
  const { data: itens = [], isLoading, isError: itensErr, error: itensE, refetch: refetchItens } =
    useQuery('itens-admin', () => api.get('/api/admin/itens').then(r => r.data))

  const criarCatPadrao = useMutation(async () => {
    for (const c of [{ nome:'Entradas',ordem:1},{ nome:'Pratos Principais',ordem:2},{ nome:'Sobremesas',ordem:3},{ nome:'Bebidas',ordem:4}])
      await api.post('/api/admin/categorias', c)
  }, { onSuccess: () => { qc.invalidateQueries('categorias'); toast.success('Categorias criadas!') } })

  useEffect(() => {
    if (seededRef.current || catLoading || catErr) return
    if (categorias.length > 0) { seededRef.current = true; return }
    seededRef.current = true
    criarCatPadrao.mutate()
  }, [catLoading, catErr, categorias])

  const salvar = useMutation(async (form) => {
    const payload = { ...form, preco: parseFloat(form.preco) || 0, categoria_id: form.categoria_id || null }
    if (modal?.item) await api.put(`/api/admin/itens/${modal.item.id}`, payload)
    else             await api.post('/api/admin/itens', payload)
  }, {
    onSuccess: () => { qc.invalidateQueries('itens-admin'); setModal(null); toast.success('Item salvo!') },
    onError:   () => toast.error('Erro ao salvar item'),
  })

  const deletar = useMutation(async id => {
    if (!confirm('Remover este item?')) return
    await api.delete(`/api/admin/itens/${id}`)
  }, { onSuccess: () => { qc.invalidateQueries('itens-admin'); toast.success('Item removido') } })

  const itensFiltrados = filtro === 'todas' ? itens : itens.filter(i => (i.categoria_id || '') === filtro)

  return (
    <div className="p-7 max-w-5xl mx-auto">

      {/* Cabeçalho */}
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] text-espresso">Cardápio</h1>
          <p className="text-[12px] text-espresso-4">{itens.length} itens cadastrados</p>
        </div>
        <button
          onClick={() => setModal({})}
          className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
        >
          + Novo item
        </button>
      </div>

      {(catErr || itensErr) && (
        <div className="bg-white border border-creme-4 rounded-xl p-4 mb-4">
          <p className="text-[13px] font-medium text-espresso">
            {(catE?.response?.status === 503 || itensE?.response?.status === 503) ? 'Banco indisponível'
              : (!catE?.response && !itensE?.response) ? 'Servidor offline' : 'Erro ao carregar cardápio'}
          </p>
          <button onClick={() => { refetchCat(); refetchItens() }} className="mt-1 text-[12px] text-brand-500 hover:underline">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        <button
          onClick={() => setFiltro('todas')}
          className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors
            ${filtro === 'todas' ? 'bg-espresso text-creme-3' : 'bg-white border border-creme-4 text-espresso-4 hover:border-espresso-4'}`}
        >
          Todas
        </button>
        {categorias.map(c => (
          <button
            key={c.id}
            onClick={() => setFiltro(c.id)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors
              ${filtro === c.id ? 'bg-espresso text-creme-3' : 'bg-white border border-creme-4 text-espresso-4 hover:border-espresso-4'}`}
          >
            {c.nome}
          </button>
        ))}
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-creme-4 rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-creme border-b border-creme-4">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-espresso-4">Item</th>
                <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-espresso-4">Categoria</th>
                <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-espresso-4">Preço</th>
                <th className="px-5 py-3 text-center text-[10px] font-medium uppercase tracking-widest text-espresso-4">Disponível</th>
                <th className="px-5 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-espresso-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-creme-3">
              {itensFiltrados.map(item => (
                <tr key={item.id} className="hover:bg-creme/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-espresso">{item.nome}</p>
                    {item.descricao && <p className="text-[11px] text-espresso-4 truncate max-w-xs">{item.descricao}</p>}
                  </td>
                  <td className="px-5 py-3">
                    {item.categoria_nome
                      ? <span className="text-[11px] bg-creme-2 text-espresso-4 px-2 py-0.5 rounded-full">{item.categoria_nome}</span>
                      : <span className="text-espresso-4">—</span>}
                  </td>
                  <td className="px-5 py-3 font-medium text-brand-500">{fmt(item.preco)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${item.disponivel ? 'bg-green-500' : 'bg-creme-4'}`} />
                  </td>
                  <td className="px-5 py-3 text-right space-x-3">
                    <button onClick={() => setModal({ item })} className="text-brand-500 hover:underline text-[12px]">Editar</button>
                    <button onClick={() => deletar.mutate(item.id)} className="text-red-500 hover:underline text-[12px]">Remover</button>
                  </td>
                </tr>
              ))}
              {itensFiltrados.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-espresso-4 text-[13px]">Nenhum item encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <Modal item={modal?.item} categorias={categorias} onSalvar={f => salvar.mutate(f)} onFechar={() => setModal(null)} />
      )}
    </div>
  )
}
