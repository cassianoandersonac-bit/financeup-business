# FinanceUp Business

Especificação completa (schema, fluxos, prioridades): leia
[prompt-claude-code-financeup-business.md](./prompt-claude-code-financeup-business.md)
antes de mexer no projeto.

## Decisões já confirmadas (não perguntar de novo)

- Stack: Node + Express + Prisma + PostgreSQL no backend; Next.js
  (App Router, TypeScript, Tailwind) no frontend.
- Projeto novo, separado do FinanceUp pessoal (`financas-backend-eight`) —
  repositório, banco de dados e deploy próprios.
- Frontend construído desde o início (não é uma fase só de API).
- Nome "FinanceUp Business" é definitivo.
- `tipoConexao` de Conta Bancária é sempre `MANUAL` nesta fase — não expor
  opção de conexão automática na interface, mesmo o campo existindo no
  schema (reservado para Open Finance futuro).
- Fora de escopo por enquanto: Open Finance, cobrança/assinatura via
  Stripe, qualquer IA/chat embutido.

## Convenções do projeto

- **Isolamento multiempresa**: toda rota de dados do backend fica sob
  `/organizacoes/:organizacaoId/...` e passa pelo middleware
  `src/middleware/tenant.js`, que confirma o vínculo
  `UsuarioOrganizacao` antes de liberar a rota. Nunca adicionar uma rota
  de dados que pule esse middleware.
- CNPJ é validado por dígito verificador (`src/lib/cnpj.js`), não só
  máscara — no cadastro de Empresa e Filial.
- Campos monetários são sempre `Decimal` no Prisma, nunca `Float`.
- Erros da API respondem `{ erro: '...' }` (mesmo padrão do FinanceUp
  pessoal).
- Frontend guarda `token`/`usuario`/`organizacoes` em `localStorage` via
  `src/lib/auth.tsx` (`useAuth()`), não em cookies.

## Estado atual

Implementado: auth (registro cria organização + usuário ADMIN, login),
CRUD de Empresas/Filiais/Contas Bancárias.

Próximo, na ordem sugerida pelo prompt: import de OFX/QFX + dedup →
Transações com filtros → Plano de Contas → Relatórios.

Repositório git local ainda sem remoto — não criar/push para o GitHub sem
pedir autorização antes.
