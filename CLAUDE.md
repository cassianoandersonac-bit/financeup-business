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
- **Decisões de arquitetura de módulos maiores são discutidas no Claude
  Chat antes de implementar aqui** (ver prompts `prompt-claude-code-*.md`
  na raiz — cada um documenta as decisões já fechadas de um módulo).
  Não reabrir essas decisões no Claude Code, só executar; se aparecer um
  ponto realmente estrutural não coberto pelo prompt, voltar pro Chat em
  vez de decidir sozinho.

## Estado atual

Implementado: auth (registro cria organização + usuário ADMIN, login),
CRUD de Empresas/Filiais/Contas Bancárias, e importação de extrato
OFX/QFX com deduplicação (`prompt-claude-code-import-ofx.md`) — parser
próprio de data (a lib `ofx-data-extractor` não é confiável pra isso,
ver comentários em `backend/src/services/ofx/ofxAdapter.js`),
sanitização de SGML malformado, dedup por `fitidOfx`/`hashDedup` em
lote, persistência em chunks com `status` (`PROCESSANDO`/`CONCLUIDO`/
`FALHOU_PARCIAL`) em `ImportacaoExtrato`. Testes em `backend` rodam com
`npm test` (Jest).

Próximo, na ordem sugerida pelo prompt original: Plano de Contas →
Relatórios.

Repositório git local ainda sem remoto — não criar/push para o GitHub sem
pedir autorização antes.

Também: listagem de Transações (`backend/src/routes/transacoes.js`) com
filtros (descrição, valor — faixa dinâmica ou exata, ver
`src/lib/filtroValor.js` — tipo, conta, data, status de duplicata),
ordenação com whitelist de campos, paginação por offset, ação de
conciliar e ação de resolver `PROVAVEL_DUPLICATA` (confirma como
duplicata real → arquiva sem mexer no saldo, ou marca como única →
soma no `saldoAtual`, mesma lógica de ajuste do import).

**Banco de dados:** Neon PostgreSQL real já configurado (`DATABASE_URL`
pooled + `DIRECT_URL` direct, ambos em `backend/.env`, gitignored),
migration inicial aplicada. Todo o fluxo (auth, CRUD de empresas/filiais/
contas, import de OFX com dedup, listagem/filtros/resolução de
duplicata em Transações) foi verificado ponta a ponta contra esse banco
de verdade — não é mais só teste com mock.
