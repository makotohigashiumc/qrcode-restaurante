# QR Restaurante

Sistema web de cardápio digital e gerenciamento de pedidos via QR Code para restaurantes.

O cliente acessa o cardápio escaneando o QR Code da mesa — direto no navegador, sem instalar nenhum aplicativo. Os pedidos chegam à cozinha em tempo real via WebSocket. O administrador gerencia cardápio, mesas e pedidos por um painel completo.

**Demo em produção:** https://qrcode-restaurante.vercel.app

---

## Tecnologias

**Frontend**
- React 18 + Vite
- Tailwind CSS
- Hospedado na Vercel

**Backend**
- Python + Flask 3.0
- Flask-SocketIO (WebSocket)
- Flask-Limiter (rate limiting)
- JWT + bcrypt
- Hospedado no Render

**Banco de dados**
- PostgreSQL (Supabase)

---

## Como rodar localmente

### Pré-requisitos
- Python 3.11+
- Node.js 18+
- PostgreSQL

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Linux/Mac
venv\Scripts\Activate.ps1      # Windows
pip install -r requirements.txt
python run.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Variáveis de ambiente

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
JWT_SECRET=sua-chave-secreta
FRONTEND_URL=http://localhost:5173

# E-mail (Mailtrap para testes)
MAIL_SERVER=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USERNAME=seu-usuario
MAIL_PASSWORD=sua-senha
MAIL_DEFAULT_SENDER=noreply@qrrestaurante.com
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000
```

---

## Banco de dados

O schema é aplicado automaticamente na primeira execução via `database.py`.

Para popular o banco com dados de demonstração:

```bash
cd backend
python seed_dados.py
```

Isso gera: 20 mesas, 5 categorias, 50 itens de cardápio e 1200 pedidos distribuídos em 90 dias.

---

## Testes

```bash
cd backend
pytest tests/ -v
```

45 testes unitários cobrindo:
- `test_auth.py` — autenticação JWT e bcrypt
- `test_validators.py` — validação de dados
- `test_pedidos.py` — criação e listagem de pedidos
- `test_mesas.py` — verificação de mesa e token UUID

---

## Estrutura do projeto

```
qrcode-restaurante/
├── backend/
│   ├── app/
│   │   ├── controllers/    # Rotas e lógica de negócio
│   │   ├── repositories/   # Queries SQL
│   │   ├── services/       # QR Code, autenticação, e-mail
│   │   └── database.py     # Conexão com PostgreSQL
│   ├── tests/              # Testes unitários com pytest
│   ├── seed_dados.py       # Script para popular o banco
│   ├── run.py              # Ponto de entrada da aplicação
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/          # Páginas React (admin/, public/)
        ├── components/     # Componentes reutilizáveis
        └── hooks/          # Hooks customizados (useAuth)
```

---

## Funcionalidades principais

- QR Code com token UUID dinâmico por mesa — invalidado a cada liberação
- Pedidos em tempo real via WebSocket (Flask-SocketIO) — eventos: `novo_pedido`, `status_atualizado`, `mesa_liberada`
- Painel admin: dashboard, cardápio, mesas e pedidos
- Painel da cozinha com atualização em tempo real
- Rate limiting: 20 req/min por IP e 5 pedidos/min por mesa
- Autenticação JWT com verificação de e-mail e recuperação de senha
- Integração com API ViaCEP para preenchimento automático de endereço
- Conformidade com LGPD

---

## Autor

Eli Makoto Higashi Matias  
Bacharelado em Sistemas de Informação — Universidade de Mogi das Cruzes (2026)  
Orientador: Prof. Leonardo Cavalcante Alvino  
Coorientador: Prof. Alessandro Aparecido da Silva Horas
