# 🍴 QR Code Restaurante

Sistema web de cardápio digital e gerenciamento de pedidos via QR Code para restaurantes.

**Stack:** React.js (Vercel) · Flask/Python (Render) · PostgreSQL (Supabase)

---

## 📁 Estrutura do Projeto

```
qrcode-restaurante/
├── backend/          # Flask/Python — API REST + WebSocket
├── frontend/         # React.js — SPA (cardápio, cozinha, admin)
└── database/         # Scripts SQL (schema + seed)
```

---

## 🗄️ 1. Banco de Dados (Supabase)

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. No **SQL Editor**, execute os scripts em ordem:
   ```
   database/schema.sql   ← cria as tabelas
   database/seed.sql     ← popula dados de exemplo
   ```
3. Anote a **Database URL** em: Project Settings → Database → Connection string (URI)

---

## ⚙️ 2. Backend (Flask)

### Instalar dependências

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com suas credenciais:
# DATABASE_URL=postgresql://...
# JWT_SECRET=sua-chave-secreta-longa
# FRONTEND_URL=http://localhost:5173
```

### Rodar localmente

```bash
python run.py
# API disponível em http://localhost:5000
# Health check: http://localhost:5000/health
```

---

## 🎨 3. Frontend (React)

### Instalar dependências

```bash
cd frontend
npm install
```

### Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite .env:
# VITE_API_URL=http://localhost:5000
# VITE_RESTAURANTE_ID=11111111-1111-1111-1111-111111111111
```

### Rodar localmente

```bash
npm run dev
# App disponível em http://localhost:5173
```

---

## 🌐 Páginas

| URL | Descrição |
|-----|-----------|
| `/?mesa=1&restaurante=ID` | Cardápio digital (público, via QR Code) |
| `/cozinha` | Painel da cozinha (tempo real) |
| `/admin/login` | Login do restaurante |
| `/admin/registro` | Cadastro de novo restaurante |
| `/admin` | Dashboard |
| `/admin/pedidos` | Gerenciar pedidos |
| `/admin/cardapio` | Gerenciar itens do cardápio |
| `/admin/mesas` | Gerenciar mesas e QR Codes |
| `/admin/configuracao` | Dados do restaurante |

**Credenciais demo:** `admin@saborarte.com.br` / `admin123`

---

## 🔌 Endpoints da API

### Público
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check |
| GET | `/api/cardapio/{restaurante_id}` | Cardápio por categoria |
| POST | `/api/pedidos` | Criar pedido |
| GET | `/api/mesas/verificar?restaurante=&numero=` | Verificar mesa |
| GET | `/api/cep/{cep}` | Buscar CEP (ViaCEP proxy) |

### Admin (JWT obrigatório)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/admin/login` | Autenticar |
| POST | `/api/admin/registro` | Cadastrar restaurante |
| GET | `/api/admin/me` | Dados do restaurante |
| PUT | `/api/admin/restaurante` | Atualizar dados |
| GET/POST | `/api/admin/categorias` | Categorias |
| PUT/DELETE | `/api/admin/categorias/{id}` | Editar/remover categoria |
| GET/POST | `/api/admin/itens` | Itens do cardápio |
| PUT/DELETE | `/api/admin/itens/{id}` | Editar/remover item |
| GET | `/api/mesas` | Listar mesas |
| POST | `/api/mesas` | Criar mesa + gerar QR Code |
| DELETE | `/api/mesas/{id}` | Remover mesa |
| GET | `/api/pedidos` | Listar pedidos |
| PATCH | `/api/pedidos/{id}/status` | Atualizar status |

### WebSocket (Flask-SocketIO)
| Evento | Direção | Descrição |
|--------|---------|-----------|
| `entrar_sala` | cliente → server | Entrar na sala do restaurante |
| `novo_pedido` | server → cliente | Novo pedido criado |
| `status_atualizado` | server → cliente | Status de pedido alterado |

---

## 🚀 Deploy

### Backend → Render
1. Crie um **Web Service** no Render apontando para `/backend`
2. Build command: `pip install -r requirements.txt`
3. Start command: `gunicorn --worker-class eventlet -w 1 run:app`
4. Configure as variáveis de ambiente no painel do Render

### Frontend → Vercel
1. Importe o repositório no Vercel
2. Root directory: `frontend`
3. Framework preset: Vite
4. Configure `VITE_API_URL` com a URL do backend no Render

---

## 🏗️ Arquitetura

```
[Cliente / QR Code]
        │
        ▼ HTTPS
[VERCEL — React SPA]
  ├── Cardápio Digital (QR Code)
  ├── Painel da Cozinha (WebSocket)
  └── Painel Admin (JWT)
        │
        ▼ REST API + WebSocket
[RENDER — Flask/Python]
  ├── Controller → Service → Repository
  ├── Flask-SocketIO (novo_pedido, status_atualizado)
  ├── Auth: PyJWT + bcrypt
  └── QRCode: lib qrcode (base64 PNG)
        │
        ▼ SQL
[SUPABASE — PostgreSQL]
  ├── restaurantes
  ├── mesas
  ├── categorias
  ├── itens_cardapio
  ├── pedidos
  └── itens_pedido
        │
        ▼ HTTPS GET
[ViaCEP — API Externa]
  └── Busca automática de endereço por CEP
```

---

## 🛡️ Segurança

- Senhas armazenadas com **bcrypt** (hash salt 12 rounds)
- Autenticação via **JWT** (expiração 8h)
- CORS configurado para aceitar apenas o domínio do frontend
- Princípio da minimização de dados (LGPD)
- UUIDs como identificadores primários (imprevisíveis)
