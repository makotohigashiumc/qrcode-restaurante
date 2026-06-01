import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import api from '../../services/api'

export default function MesaDisplayPage() {
  const { numero }    = useParams()
  const [params]      = useSearchParams()
  const restauranteId = params.get('restaurante')

  const { data: mesa, refetch } = useQuery(
    ['mesa-display', numero, restauranteId],
    () => api.get(`/api/mesas/display?restaurante=${restauranteId}&numero=${numero}`).then(r => r.data),
    { refetchInterval: 10000, enabled: !!restauranteId && !!numero }
  )

  useEffect(() => {
    document.title = `Mesa ${numero}`
  }, [numero])

  if (!restauranteId) {
    return (
      <div className="min-h-screen bg-sumi flex items-center justify-center">
        <p className="text-washi/50 text-sm">Parâmetros inválidos.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-washi flex flex-col items-center justify-center p-8 text-center">
      <p className="text-sumi/40 text-[10px] tracking-widest uppercase mb-6">
        Escaneie para pedir
      </p>

      {mesa?.qr_code ? (
        <img
          src={mesa.qr_code}
          alt={`QR Code Mesa ${numero}`}
          className="w-64 h-64 border border-washi/10"
        />
      ) : (
        <div className="w-64 h-64 bg-washi/5 border border-washi/10 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-washi/20 border-t-washi/60 animate-spin" />
        </div>
      )}

      <h1 className="font-display text-sumi text-4xl font-light mt-8 tracking-widest">
        Mesa {numero}
      </h1>

      <p className="text-sumi/30 text-xs mt-3">
        Aponte a câmera do celular para o QR Code
      </p>
    </div>
  )
}
