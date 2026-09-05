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

**Todo o roadmap original do prompt-claude-code-financeup-business.md
está implementado.** Só falta deploy (ver abaixo).

Repositório remoto: https://github.com/cassianoandersonac-bit/financeup-business
(⚠️ está público — foi criado assim por engano, o pedido original era
privado; corrigir em Settings → Danger Zone → Change visibility se ainda
não tiver sido feito). Deploy automático a cada push em `main`.

Também: listagem de Transações (`backend/src/routes/transacoes.js`) com
filtros (descrição, valor — faixa dinâmica ou exata, ver
`src/lib/filtroValor.js` — tipo, conta, data, status de duplicata),
ordenação com whitelist de campos, paginação por offset, ação de
conciliar e ação de resolver `PROVAVEL_DUPLICATA` (confirma como
duplicata real → arquiva sem mexer no saldo, ou marca como única →
soma no `saldoAtual`, mesma lógica de ajuste do import).

Também: Plano de Contas (`backend/src/routes/planoContas.js`) — CRUD
hierárquico por empresa (`contaPaiId` auto-relação), com checagem de
ciclo ao editar o pai e unicidade de `codigo` por empresa. Frontend
recebe lista plana e monta a árvore no cliente. Já integrado com
Transações (filtro de Classificação + seletor por linha).

Também: Relatórios (`backend/src/services/relatorios/`,
`backend/src/routes/relatorios.js`) — DRE hierárquico (rollup em
memória, não SQL bruto/CTE), Fluxo de Caixa ("saldo acumulado" —
**nunca "projetado" na UI**, não existe lançamento futuro no sistema) e
Dashboard com 6 widgets. Ambos os relatórios só contam
`statusDuplicata = UNICA`. Gráfico do dashboard é SVG próprio (sem lib
nova), seguindo a skill `dataviz` (paleta validada, hover com
crosshair+tooltip, fallback textual). `frontend/src/lib/arvore.ts` é o
util de árvore compartilhado entre Plano de Contas e DRE.

**Banco de dados:** Neon PostgreSQL real já configurado (`DATABASE_URL`
pooled + `DIRECT_URL` direct, ambos em `backend/.env`, gitignored),
migration inicial aplicada. Todo o fluxo (auth, CRUD de empresas/filiais/
contas, import de OFX com dedup, Transações, Plano de Contas,
Relatórios) foi verificado ponta a ponta contra esse banco de verdade —
não é mais só teste com mock.

## Deploy (feito em 2026-09-04)

- Backend: https://financeup-business-backend.vercel.app (projeto Vercel
  `financeup-business-backend`, Root Directory `backend`)
- Frontend: https://financeup-business-frontend.vercel.app (projeto
  Vercel `financeup-business-frontend`, Root Directory `frontend`,
  `NEXT_PUBLIC_API_URL` apontando pro backend acima)
- Ambos ligados ao repo GitHub, deploy automático a cada push em `main`.
- Variáveis de ambiente (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` no
  backend) foram configuradas manualmente pelo usuário no painel da
  Vercel — não existe ferramenta de API pra isso nesta sessão, então
  qualquer variável nova precisa do mesmo processo manual.
- `JWT_SECRET` de produção é diferente do usado em `backend/.env` local
  (gerado com `crypto.randomBytes(32).toString('hex')`).

Verificado ponta a ponta contra produção: login retornando 401 correto
(prova que Prisma conectou no Neon), e o bundle do frontend com a URL
certa do backend embutida (`NEXT_PUBLIC_API_URL` foi lido no build).
