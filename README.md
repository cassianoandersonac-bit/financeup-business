# FinanceUp Business

Versão B2B/multiempresa do FinanceUp: uma organização cadastra múltiplas
empresas, importa extratos bancários (OFX/QFX), classifica transações e
acompanha relatórios financeiros por empresa.

Especificação completa em
[prompt-claude-code-financeup-business.md](./prompt-claude-code-financeup-business.md).

## Estrutura

- `backend/` — API Node + Express + Prisma + PostgreSQL
- `frontend/` — Next.js (App Router, TypeScript, Tailwind)

## Rodando localmente

### 1. Banco de dados

Crie um banco PostgreSQL novo (ex: um projeto separado no
[Neon](https://neon.tech), free tier) — **não reaproveite o banco do
FinanceUp pessoal**.

### 2. Backend

```bash
cd backend
cp .env.example .env
# edite .env com a DATABASE_URL real e um JWT_SECRET forte
npm install
npm run db:push      # cria as tabelas a partir do prisma/schema.prisma
npm run dev           # http://localhost:3002
```

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev            # http://localhost:3000
```

Acesse `http://localhost:3000`, crie uma organização em **/registro** e
comece a cadastrar empresas.

## Status

Implementado: autenticação (organização + usuário admin), CRUD de
Empresas, Filiais e Contas Bancárias, todos isolados por organização.

Ainda não implementado (ver o prompt para a ordem sugerida): importação de
extrato OFX/QFX com deduplicação, listagem de Transações com filtros,
Plano de Contas, Relatórios agregados.
