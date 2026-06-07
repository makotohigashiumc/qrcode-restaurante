import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import api from '../../services/api'

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function Modal({ item, categorias, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome:         item?.nome         || '',
    descricao:    item?.descricao    || '',
    preco:        item?.preco        || '',
    categoria_id: item?.categoria_id || '',
    imagem_url:   item?.imagem_url   || '',
    disponivel:   item?.disponivel !== undefined ? item.disponivel : true,
  })
  const [enviandoImg, setEnviandoImg] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleImagemArquivo = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setEnviandoImg(true)
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        try {
          const res = await api.post('/api/admin/itens/upload-imagem', { imagem: ev.target.result })
          set('imagem_url', res.data.url)
          toast.success('Imagem enviada!')
        } catch {
          toast.error('Erro ao enviar imagem. Verifique a conexão com o servidor.')
        } finally {
          setEnviandoImg(false)
        }
      }
      reader.readAsDataURL(file)
    } catch {
      setEnviandoImg(false)
      toast.error('Erro ao ler arquivo.')
    }
  }

  return (
    <div className="fixed inset-0 bg-sumi/60 z-50 flex items-center justify-center p-4">
      <div className="bg-washi border border-half border-washi-dark w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[18px] text-sumi">{item ? 'Editar item' : 'Novo item'}</h2>
          <button onClick={onFechar} className="text-sumi/50 hover:text-sumi text-xl leading-none">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3">

          {}
          <div className="col-span-2">
            <label className="block text-[10px] font-medium uppercase tracking-widest text-sumi/50 mb-1.5">Nome *</label>
            <input
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
              className="w-full border border-washi-dark rounded-lg px-3 py-2.5 text-[13px] text-sumi focus:outline-none focus:ring-2 focus:ring-beni"
            />
          </div>

          {}
          <div className="col-span-2">
            <label className="block text-[10px] font-medium uppercase tracking-widest text-sumi/50 mb-1.5">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              rows={2}
              className="w-full border border-washi-dark rounded-lg px-3 py-2.5 text-[13px] text-sumi focus:outline-none focus:ring-2 focus:ring-beni resize-none"
            />
          </div>

          {}
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-widest text-sumi/50 mb-1.5">Preço (R$) *</label>
            <input
              type="number"
              step="0.01"
              value={form.preco}
              onChange={e => set('preco', e.target.value)}
              className="w-full border border-washi-dark rounded-lg px-3 py-2.5 text-[13px] text-sumi focus:outline-none focus:ring-2 focus:ring-beni"
            />
          </div>

          {}
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-widest text-sumi/50 mb-1.5">Categoria</label>
            <select
              value={form.categoria_id}
              onChange={e => set('categoria_id', e.target.value)}
              className="w-full border border-washi-dark rounded-lg px-3 py-2.5 text-[13px] text-sumi focus:outline-none focus:ring-2 focus:ring-beni"
            >
              <option value="">Sem categoria</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          {}
          <div className="col-span-2">
            <label className="block text-[10px] font-medium uppercase tracking-widest text-sumi/50 mb-1.5">Imagem</label>

            {}
            {form.imagem_url && (
              <div className="mb-2 flex items-center gap-3">
                <img
                  src={form.imagem_url}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded-lg border border-washi-dark"
                  onError={e => { e.target.style.display = 'none' }}
                />
                <button
                  type="button"
                  onClick={() => set('imagem_url', '')}
                  className="text-[11px] text-red-500 hover:underline"
                >
                  Remover imagem
                </button>
              </div>
            )}

            {}
            <input
              value={form.imagem_url}
              onChange={e => set('imagem_url', e.target.value)}
              placeholder="https://... (cole uma URL) ou use o botão abaixo"
              className="w-full border border-washi-dark rounded-lg px-3 py-2.5 text-[13px] text-sumi focus:outline-none focus:ring-2 focus:ring-beni mb-2"
            />

            {}
            <div className="relative">
              <label className={`flex items-center justify-center gap-2 w-full border border-dashed border-washi-dark rounded-lg px-3 py-3 text-[12px] cursor-pointer transition-colors
                ${enviandoImg ? 'opacity-50 cursor-not-allowed' : 'hover:border-beni hover:bg-washi'}`}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v8M4 4l3-3 3 3M2 11h10" stroke="#C8855A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sumi/50">
                  {enviandoImg ? 'Enviando...' : 'Enviar do computador (jpg, png, webp)'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImagemArquivo}
                  disabled={enviandoImg}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>
          </div>

          {}
          <div className="col-span-2 flex items-center gap-2.5">
            <input
              type="checkbox"
              id="disp"
              checked={form.disponivel}
              onChange={e => set('disponivel', e.target.checked)}
              className="accent-beni w-4 h-4"
            />
            <label htmlFor="disp" className="text-[13px] text-sumi/50">Item disponível no cardápio</label>
          </div>
        </div>

        <div className="flex gap-2.5 pt-1">
          <button
            onClick={onFechar}
            className="flex-1 border border-washi-dark py-2.5 rounded-lg text-[13px] text-sumi/50 hover:bg-washi transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSalvar(form)}
            disabled={enviandoImg}
            className="flex-1 bg-sumi hover:opacity-80 text-washi py-2.5 rounded-lg text-[13px] font-medium transition-opacity disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CardapioAdminPage() {
  const qc        = useQueryClient()
  const seededRef = useRef(false)
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
    const res = await api.delete(`/api/admin/itens/${id}`)
    return res.data
  }, {
    onSuccess: (data) => {
      qc.invalidateQueries('itens-admin')
      if (data?.aviso) toast(data.aviso, { duration: 5000 })
      else             toast.success('Item removido')
    },
    onError: () => toast.error('Erro ao remover item'),
  })

  const itensFiltrados = filtro === 'todas' ? itens : itens.filter(i => (i.categoria_id || '') === filtro)

  return (
    <div className="p-7 max-w-5xl mx-auto">

      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] text-sumi">Cardápio</h1>
          <p className="text-[12px] text-sumi/50">{itens.length} itens cadastrados</p>
        </div>
        <button
          onClick={() => setModal({})}
          className="bg-sumi hover:opacity-80 text-washi px-4 py-2 rounded-lg text-[13px] font-medium transition-opacity"
        >
          + Novo item
        </button>
      </div>

      {(catErr || itensErr) && (
        <div className="bg-white border border-washi-dark rounded-xl p-4 mb-4">
          <p className="text-[13px] font-medium text-sumi">
            {(catE?.response?.status === 503 || itensE?.response?.status === 503) ? 'Banco indisponível'
              : (!catE?.response && !itensE?.response) ? 'Servidor offline' : 'Erro ao carregar cardápio'}
          </p>
          <button onClick={() => { refetchCat(); refetchItens() }} className="mt-1 text-[12px] text-beni hover:underline">
            Tentar novamente
          </button>
        </div>
      )}

      <div className="flex gap-1.5 mb-5 flex-wrap">
        <button
          onClick={() => setFiltro('todas')}
          className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors
            ${filtro === 'todas' ? 'bg-sumi text-washi' : 'bg-white border border-washi-dark text-sumi/50 hover:border-washi-dark'}`}
        >
          Todas
        </button>
        {categorias.map(c => (
          <button
            key={c.id}
            onClick={() => setFiltro(c.id)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors
              ${filtro === c.id ? 'bg-sumi text-washi' : 'bg-white border border-washi-dark text-sumi/50 hover:border-washi-dark'}`}
          >
            {c.nome}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-beni border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-washi-dark rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-washi border-b border-washi-dark">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-sumi/50">Item</th>
                <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-sumi/50">Categoria</th>
                <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-sumi/50">Preço</th>
                <th className="px-5 py-3 text-center text-[10px] font-medium uppercase tracking-widest text-sumi/50">Disponível</th>
                <th className="px-5 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-sumi/50">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-creme-3">
              {itensFiltrados.map(item => (
                <tr key={item.id} className="hover:bg-washi/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {item.imagem_url && (
                        <img src={item.imagem_url} alt={item.nome}
                          className="w-10 h-10 object-cover rounded-lg border border-washi-dark flex-shrink-0"
                          onError={e => { e.target.style.display = 'none' }}
                        />
                      )}
                      <div>
                        <p className="font-medium text-sumi">{item.nome}</p>
                        {item.descricao && <p className="text-[11px] text-sumi/50 truncate max-w-xs">{item.descricao}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {item.categoria_nome
                      ? <span className="text-[11px] bg-washi-mid text-sumi/50 px-2 py-0.5 rounded-full">{item.categoria_nome}</span>
                      : <span className="text-sumi/50">—</span>}
                  </td>
                  <td className="px-5 py-3 font-medium text-beni">{fmt(item.preco)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${item.disponivel ? 'bg-green-500' : 'bg-washi-dark'}`} />
                  </td>
                  <td className="px-5 py-3 text-right space-x-3">
                    <button onClick={() => setModal({ item })} className="text-beni hover:underline text-[12px]">Editar</button>
                    <button onClick={() => deletar.mutate(item.id)} className="text-red-500 hover:underline text-[12px]">Remover</button>
                  </td>
                </tr>
              ))}
              {itensFiltrados.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-sumi/50 text-[13px]">Nenhum item encontrado</td></tr>
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
