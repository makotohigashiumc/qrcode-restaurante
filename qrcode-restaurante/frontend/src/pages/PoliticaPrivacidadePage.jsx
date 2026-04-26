import { Link } from 'react-router-dom'

export default function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-8">
        <div className="mb-6">
          <Link to="/admin/registro" className="text-sm text-brand-600 hover:underline">← Voltar ao cadastro</Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Política de Privacidade</h1>
        <p className="text-sm text-gray-400 mb-6">Última atualização: abril de 2026</p>

        <div className="space-y-6 text-sm text-gray-600 leading-relaxed">

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">1. Quais dados coletamos</h2>
            <p>Ao cadastrar seu restaurante na plataforma, coletamos as seguintes informações:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Nome do restaurante</li>
              <li>Endereço de e-mail</li>
              <li>Número de telefone</li>
              <li>Endereço (CEP, logradouro, bairro, cidade e estado)</li>
              <li>Senha (armazenada de forma criptografada via bcrypt — nunca em texto simples)</li>
            </ul>
            <p className="mt-2">
              Dos clientes que realizam pedidos, coletamos apenas o nome informado voluntariamente no momento do pedido.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">2. Para que usamos os dados</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Identificar e autenticar o restaurante no painel administrativo</li>
              <li>Associar pedidos à mesa e ao cliente correto</li>
              <li>Permitir o funcionamento do sistema de cardápio digital e gerenciamento de pedidos</li>
            </ul>
            <p className="mt-2">Não utilizamos os dados para fins publicitários nem os compartilhamos com terceiros.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">3. Como protegemos seus dados</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Senhas armazenadas com hash bcrypt (custo 12)</li>
              <li>Autenticação via JWT com expiração de 8 horas</li>
              <li>Comunicação entre frontend e backend via HTTPS</li>
              <li>Banco de dados PostgreSQL hospedado no Supabase com backups automáticos</li>
              <li>Princípio da minimização de dados: coletamos apenas o necessário para o serviço</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">4. Seus direitos (LGPD)</h2>
            <p>Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Acessar os dados cadastrados</li>
              <li>Corrigir dados incompletos ou desatualizados</li>
              <li>Solicitar a exclusão dos seus dados</li>
            </ul>
            <p className="mt-2">Para exercer esses direitos, entre em contato pelo e-mail do suporte da plataforma.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">5. Cookies e armazenamento local</h2>
            <p>
              O sistema utiliza <strong>localStorage</strong> do navegador para armazenar o token de autenticação JWT,
              necessário para manter a sessão ativa no painel administrativo. Nenhum cookie de rastreamento é utilizado.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">6. Alterações nesta política</h2>
            <p>
              Esta política pode ser atualizada periodicamente. Em caso de alterações relevantes,
              os usuários serão notificados pelo e-mail cadastrado.
            </p>
          </section>

        </div>

        <div className="mt-8 pt-6 border-t text-center">
          <Link
            to="/admin/registro"
            className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-brand-700 transition-colors"
          >
            ← Voltar ao cadastro
          </Link>
        </div>
      </div>
    </div>
  )
}
