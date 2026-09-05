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
npm test              # roda os testes (não precisa de banco real)
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

**Todo o roadmap original está implementado:** autenticação (organização
+ usuário admin), CRUD de Empresas/Filiais/Contas Bancárias, importação
de extrato OFX/QFX com deduplicação (`fitidOfx`/`hashDedup` — ver
`prompt-claude-code-import-ofx.md`), listagem de Transações com filtros/
ordenação/paginação/conciliação/resolução de duplicata, Plano de Contas
(CRUD hierárquico) e Relatórios — DRE hierárquico, Fluxo de Caixa (saldo
acumulado no período, nunca "projetado") e Dashboard com 6 widgets (ver
`prompt-claude-code-relatorios.md`).

Banco Neon configurado e migration aplicada — fluxo completo (registro →
empresa → conta → import de extrato → transações → plano de contas →
relatórios) testado ponta a ponta contra o banco de verdade.

**Falta só o deploy:** repositório remoto no GitHub + Vercel
(backend e frontend). Ainda não autorizado/feito.
