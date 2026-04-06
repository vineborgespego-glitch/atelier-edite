# 🧵 Atelier Édite — Sistema de Gestão SaaS

Sistema completo de gestão para ateliers de costura, cobrindo o ciclo **Order-to-Cash (O2C)**: entrada de pedido → validação automática → produção → recibo em PDF → notificação via WhatsApp → cupons de fidelização.

## Stack

- **Frontend:** React 18 + Vite + TypeScript + Framer Motion + Chart.js
- **Backend:** Node.js + Express + TypeScript + Prisma ORM
- **Banco de Dados:** PostgreSQL 15
- **PDF:** PDFKit
- **Auth:** JWT + bcrypt
- **DevOps:** Docker + Docker Compose (pronto para EasyPanel)

---

## 🚀 Início Rápido (Desenvolvimento Local)

### Pré-requisitos
- Node.js 18+
- Docker Desktop (para o banco de dados)

### 1. Configure as variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com seus dados reais
```

### 2. Inicie o banco de dados

```bash
docker-compose up postgres -d
```

### 3. Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
# API disponível em http://localhost:3001
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
# App disponível em http://localhost:5173
```

---

## 🐳 Deploy Completo com Docker

```bash
cp .env.example .env
# Edite .env com seus dados de produção
docker-compose up --build -d
# Frontend: http://localhost:80
# Backend:  http://localhost:3001
```

---

## 📦 Deploy no EasyPanel

1. Faça upload do repositório no seu servidor
2. No EasyPanel, crie 3 serviços:
   - **postgres** — imagem `postgres:15-alpine`, configure vars de env
   - **backend** — Dockerfile em `./backend`, porta `3001`
   - **frontend** — Dockerfile em `./frontend`, porta `80`
3. Configure as variáveis de ambiente conforme `.env.example`
4. Exponha o frontend na porta 80 (ou configure HTTPS via EasyPanel)

---

## 📋 Módulos do Sistema

| Módulo | Descrição |
|--------|-----------|
| 🏠 **Dashboard** | KPIs, gráficos de receita e pedidos por status |
| 📦 **Pedidos (OMS)** | Pipeline Kanban visual com 6 estágios |
| 👥 **Clientes (CRM)** | Cadastro completo com histórico de medidas |
| 🧾 **Recibos** | PDF profissional com CPF/CNPJ, valor por extenso, assinatura |
| 🎫 **Cupons** | Geração automática de cupons de fidelização |
| 🔔 **Notificações** | Integração WhatsApp via WhatsHelp |
| ⚙️ **Admin** | Configurações do atelier |

---

## 🔐 Variáveis de Ambiente Necessárias

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret aleatório de 64+ chars |
| `ATELIER_NAME` | ✅ | Nome do atelier (aparece nos recibos) |
| `ATELIER_CPF` | ✅ | CPF ou CNPJ do atelier |
| `WHATSAPP_API_KEY` | ⬜ | Chave da API WhatsHelp (opcional) |
