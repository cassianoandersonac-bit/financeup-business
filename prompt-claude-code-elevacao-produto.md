# Prompt para Claude Code — Elevação de Produto (FinanceUp Business)

> Complemento aos prompts anteriores do FinanceUp Business. O sistema já
> está funcional e testado ponta a ponta em produção — este prompt NÃO é
> para corrigir bug, é para elevar sofisticação de UI e adicionar
> funcionalidades de produto B2B maduro. Executar fase por fase, não tudo
> de uma vez, para reduzir risco de regressão num sistema que já funciona.

## Contexto

- Backend: Node + Express + Prisma + PostgreSQL (Neon), multiempresa via
  middleware de tenant.
- Frontend: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind
  v4. Hoje sem biblioteca de componentes, sem sistema de ícones, CSS
  padrão de fábrica do create-next-app.
- Telas existentes (todas funcionais): login/registro, empresas, contas
  bancárias, plano de contas (CRUD hierárquico), transações (lista +
  filtros + classificação), dashboard (6 widgets), DRE, fluxo de caixa.

## Decisões já fechadas (não reabrir)

- Adotar **shadcn/ui** como base de componentes (CLI copia o código-
  fonte pro projeto, não é dependência opaca). Compatível com Tailwind
  v4 e React 19 nesta versão do ecossistema — confirmar via
  `npx shadcn@latest init` que não há erro de peer dependency antes de
  prosseguir; se houver, resolver antes de continuar, não ignorar com
  flag de force sem entender o motivo.
- Ícones: **lucide-react** (padrão do shadcn/ui).
- Gráficos: **Recharts** para dashboard, DRE e fluxo de caixa,
  substituindo o SVG manual atual do dashboard.
- Layout: sidebar fixa colapsável + topbar. Topbar contém seletor de
  empresa ativa sempre visível (não escondido em menu de configuração).
  Breadcrumb dentro da página é conceito separado do seletor de empresa
  — não misturar os dois num único componente.
- Números: sempre alinhados à direita, `font-variant-numeric:
  tabular-nums`, cor consistente verde/vermelho para positivo/negativo
  em todo o sistema (não só no dashboard).
- Tema claro/escuro: implementar DEPOIS que o design system (variáveis
  CSS do shadcn) estiver em pé — não é prioridade da Fase 1.
- Migração de tela: progressiva, começando pela casca de navegação
  (sidebar + topbar), não big-bang em todas as telas de uma vez.

## Fase 1 — Casca de navegação e design system

**Objetivo**: dar a primeira impressão de produto maduro assim que o
usuário loga, antes de tocar em qualquer tela de dado.

1. Rodar `npx shadcn@latest init`, resolver qualquer conflito de peer
   dependency que aparecer antes de prosseguir.
2. Instalar componentes base: `button`, `input`, `select`, `dialog`,
   `dropdown-menu`, `table`, `card`, `badge`, `separator`, `sidebar`.
3. Construir o shell de navegação: sidebar fixa colapsável com os itens
   já existentes (Dashboard, Fluxo de Caixa, Resultado por Empresa,
   Importar Extrato, Contas Bancárias, Transações, Plano de Contas,
   Empresas, Usuários, Configurações).
4. Topbar com seletor de empresa ativa (dropdown, sempre visível).
5. Não migrar o conteúdo interno das páginas ainda nesta fase — só a
   casca. As páginas continuam com o CSS atual por dentro, dentro do
   novo shell.
6. Definir a paleta de cores como variáveis CSS (tokens do shadcn),
   incluindo as cores semânticas de positivo/negativo para valores
   financeiros.

**Teste de aceite**: login → usuário cai no shell novo, sidebar e
topbar funcionam, troca de empresa ativa reflete nas páginas internas
(que continuam com visual antigo por enquanto).

## Fase 2 — Migração das telas de dado + tipografia numérica

1. Migrar tabelas de Transações, Contas Bancárias, Plano de Contas e
   Empresas para o componente `table` do shadcn.
2. Aplicar `tabular-nums` e alinhamento à direita em toda coluna
   monetária do sistema, sem exceção.
3. Aplicar cor verde/vermelho consistente para receita/despesa em
   todas as telas que mostram valor com sinal (Transações, DRE, Fluxo
   de Caixa, Dashboard) — criar um componente único de "valor
   monetário com cor semântica" reaproveitado em todas essas telas, não
   reimplementar a lógica de cor em cada tela separadamente.
4. Migrar formulários (criar/editar empresa, conta bancária, plano de
   contas) para os componentes de formulário do shadcn.

**Teste de aceite**: nenhuma tela deve regredir em funcionalidade —
todos os filtros, ordenações e ações que já existiam continuam
funcionando, só a apresentação muda.

## Fase 3 — Gráficos ricos (Dashboard, DRE, Fluxo de Caixa)

1. Substituir o SVG manual do dashboard por Recharts.
2. Adicionar gráfico ao DRE (barras ou waterfall, mostrando receita,
   despesa e resultado por categoria do período).
3. Adicionar gráfico de linha/área ao Fluxo de Caixa mostrando o saldo
   acumulado ao longo do período selecionado.
4. Ajustar o shape de resposta dos endpoints de DRE/Fluxo de Caixa se
   necessário para facilitar o consumo em formato de série temporal —
   isso é ajuste de shape de resposta, não mudança de schema de banco.

**Teste de aceite**: gráficos refletem os mesmos números que já
aparecem nas tabelas — nenhuma divergência entre o valor tabular e o
valor plotado.

## Fase 4 — Busca global (cmd+K)

1. Implementar o componente `command` do shadcn (baseado em `cmdk`)
   acionado por atalho Cmd/Ctrl+K.
2. Backend: endpoint de busca agregando resultado sobre Empresas,
   Contas Bancárias e Transações (por descrição), escopado à
   organização e, quando aplicável, à empresa ativa.
3. Resultado da busca navega direto para o registro (ex: clicar numa
   transação encontrada leva para a tela de Transações já filtrada por
   ela).

**Teste de aceite**: buscar por trecho de descrição de uma transação
real retorna o resultado e navega corretamente.

## Fase 5 — Permissões multiusuário

> ⚠️ Antes de começar esta fase, o Claude Code deve auditar o schema
> Prisma e o middleware de tenant atuais em produção para confirmar se
> `UsuarioOrganizacao.papel` já existe e está sendo lido em algum lugar
> da lógica de autorização, ou se hoje qualquer usuário autenticado tem
> acesso irrestrito independente de papel. O escopo desta fase muda
> dependendo da resposta — reportar o que encontrar antes de
> implementar.

1. Se a tabela/papel já existir no schema mas não for aplicada: focar
   em (a) enforcement real no backend — middleware que verifica papel
   antes de permitir ação de escrita — e (b) UI que esconde ações não
   permitidas para o papel do usuário logado.
2. Se não existir: criar a modelagem (`UsuarioOrganizacao` com campo
   `papel`, enum `ADMIN | EDITOR | VISUALIZADOR`), migration, e então
   os itens do passo 1.
3. Construir tela de gestão de membros da organização (listar membros,
   convidar novo usuário por e-mail, alterar papel, remover membro).
4. Fluxo de convite: gerar link/token de convite associado a um e-mail
   e a uma organização, com expiração.

**Teste de aceite**: usuário com papel VISUALIZADOR não consegue criar,
editar ou excluir nada via API diretamente (não só escondido na UI) —
testar chamando o endpoint direto, não só clicando na interface.

## Fase 6 — Exportação de relatórios (PDF/Excel)

1. Exportação de Excel: DRE e Fluxo de Caixa, reaproveitando os dados
   já calculados pelos endpoints existentes — gerar arquivo no backend
   (lib madura de geração de xlsx), não no frontend.
2. Exportação de PDF: mesmo conteúdo, formatado para impressão/
   compartilhamento (cabeçalho com nome da empresa e período,
   rodapé com data de geração).
3. Botão de exportação nas telas de DRE e Fluxo de Caixa, com opção de
   escolher formato.

**Teste de aceite**: arquivo exportado abre corretamente em Excel/
leitor de PDF e os números batem exatamente com o que aparece na tela.

## Fase 7 — Auditoria de alterações

1. Criar tabela `HistoricoAlteracao` (entidade, entidadeId, campo,
   valorAntes, valorDepois, usuarioId, organizacaoId, timestamp, ação:
   CRIACAO | EDICAO | EXCLUSAO).
2. Registrar histórico nas ações de escrita sobre: Transacao
   (principalmente mudança de classificação/planoContaId), PlanoConta,
   ContaBancaria, Empresa.
3. Tela de histórico por registro (ex: na tela de detalhe de uma
   transação, mostrar "alterado por X em [data], classificação mudou
   de Y para Z").

**Teste de aceite**: editar a classificação de uma transação gera uma
entrada de histórico visível, com usuário e timestamp corretos.

## Notas gerais para todas as fases

- Não pular fase para chegar direto em alguma funcionalidade "mais
  interessante" — a ordem foi pensada para reduzir risco de regressão
  em um sistema já em produção.
- Cada fase deve ser um commit/PR separado, testável isoladamente.
- Nenhuma fase deve quebrar funcionalidade já existente — se algum
  teste de aceite de fase anterior parar de passar depois de uma fase
  posterior, tratar como regressão a corrigir antes de prosseguir.
