# Fix Completo — qrcode-restaurante
## Aplique TODOS os arquivos deste pacote

### FRONTEND — substituir em frontend/src/
| Arquivo | Destino |
|---|---|
| `services/api.js` | `frontend/src/services/api.js` |
| `pages/CardapioPage.jsx` | `frontend/src/pages/CardapioPage.jsx` |
| `pages/admin/DashboardPage.jsx` | `frontend/src/pages/admin/DashboardPage.jsx` |
| `pages/admin/PedidosAdminPage.jsx` | `frontend/src/pages/admin/PedidosAdminPage.jsx` |
| `pages/admin/CardapioAdminPage.jsx` | `frontend/src/pages/admin/CardapioAdminPage.jsx` |

### BACKEND — substituir em backend/app/
| Arquivo | Destino |
|---|---|
| `__init__.py` | `backend/app/__init__.py` |
| `controllers/pedidos_controller.py` | `backend/app/controllers/pedidos_controller.py` |
| `controllers/cardapio_controller.py` | `backend/app/controllers/cardapio_controller.py` |
| `services/auth_service.py` | `backend/app/services/auth_service.py` |

## O que foi corrigido

### Bug principal — botões de categoria somem
O UUID das categorias vinha da API como string, mas `categoriaAtiva` iniciava como `null`.
A comparação `cat.id === categoriaAtiva` falhava silenciosamente, fazendo o botão ativo ficar
sem a classe `bg-beni` (transparente). Corrigido com `String()` em todas as comparações.

### Timeout muito curto (10s → 30s)
O Render Free pode levar até 15s para acordar do modo de espera.
Com timeout de 10s o axios cancelava a requisição antes do servidor responder,
gerando "Erro ao carregar dados" mesmo quando o backend estava OK.

### Histórico de pedidos antigos
Entradas inválidas ou de sessões anteriores no localStorage causavam exibição de pedidos
antigos em "Meus pedidos". Agora o histórico valida cada entrada e descarta as inválidas.

### CORS e WebSocket em produção
SocketIO configurado com ping_timeout e ping_interval para manter conexões estáveis
no Render. CORS aceita origins de preview deployments do Vercel.

### Retry inteligente no Dashboard e Pedidos
Retry com backoff exponencial: 1ª tentativa após 2s, 2ª após 4s, 3ª após 8s.
Evita "erro ao carregar" após inatividade curta.

### Comparação de timezone no relatório da mesa
criado_em vindo do banco sem timezone era comparado com ultima_liberacao com timezone,
gerando erro silencioso no filtro de sessão. Normalizado para UTC antes da comparação.
