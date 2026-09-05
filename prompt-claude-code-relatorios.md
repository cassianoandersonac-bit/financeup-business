# Prompt para Claude Code — Módulo de Relatórios (FinanceUp Business)

> Complemento aos prompts anteriores do FinanceUp Business. Cole isso no
> Claude Code quando for implementar Resultado por Empresa (DRE), Fluxo
> de Caixa e Dashboard. As decisões abaixo já foram tomadas — não
> reabrir esses pontos, só implementar.

## Contexto

Stack: Node/Express/Prisma/PostgreSQL, frontend Next.js. Os três
relatórios são queries agregadas sobre `Transacao` — sem tabela própria,
sem cache/materialização por enquanto (só considerar se performance virar
problema real e medido, não antes).

Já implementado e funcionando: CRUD de Empresa/Filial/Conta Bancária,
import de extrato OFX com dedup, listagem de Transações com filtros e
classificação manual por PlanoConta, CRUD hierárquico de Plano de Contas.

Não existe no sistema, e não faz parte deste módulo: lançamento futuro,
recorrente ou agendado. Todas as transações vêm de extrato bancário já
ocorrido (passado).

## Decisões de arquitetura já fechadas

### 1. Rollup do DRE hierárquico

- Fazer a soma pesada com um único `groupBy` do Prisma por
  `planoContaId` (filtrado por empresa, período, `statusDuplicata`).
- Subir o total das contas-folha pros pais **em memória, no Node**,
  percorrendo a árvore de `PlanoConta` (que tem poucas dezenas/centenas
  de linhas, não milhares).
- **Não** usar CTE recursiva / `$queryRaw` pra isso. A função de rollup
  deve ser pura e testável isoladamente, sem depender do banco no teste.

### 2. Transações sem `planoContaId`

- Nunca bloquear a geração do relatório por causa disso.
- Separar em dois grupos usando o campo `tipo` da transação (que é
  sempre preenchido, independente de classificação):
  - "Receitas não classificadas"
  - "Despesas não classificadas"
- Esses grupos aparecem no DRE como linhas próprias, não somem do total.

### 3. Filtro de duplicata

- DRE e Fluxo de Caixa incluem **somente** `statusDuplicata = UNICA` —
  mesma regra já usada no cálculo de `saldoAtual` da conta bancária.
- Ao resolver uma `PROVAVEL_DUPLICATA` como transação real (fluxo já
  existente na tela de Transações), o status deve transicionar para
  `UNICA` para passar a entrar nos relatórios.

### 4. "Saldo projetado" no Fluxo de Caixa

- É saldo acumulado (running balance) **dentro do período histórico
  selecionado** — `saldoInicial` do período + soma cumulativa das
  transações até cada data. Não é projeção de futuro.
- Renomear no frontend para **"saldo acumulado no período"** — não usar
  o termo "projetado" na interface, pra não criar expectativa de
  previsão que o sistema não oferece.
- Não implementar nada relacionado a lançamento futuro/recorrente neste
  módulo — é escopo de feature separada, se algum dia for necessária.

### 5. Período e granularidade

- Período: intervalo livre `dataInicial`/`dataFinal`, mesmo padrão já
  usado no filtro de Transações — não travar em mês calendário fixo.
- Granularidade do Fluxo de Caixa (dia/semana/mês): agregar **em JS**
  depois de buscar as transações do período, não via `date_trunc` em
  SQL bruto. Volume esperado (centenas a poucos milhares de transações
  por empresa) não justifica essa complexidade agora.

### 6. Cálculo do saldo no Fluxo de Caixa

- Reconstruir o saldo acumulado a partir de `saldoInicial` da conta +
  soma das transações válidas (`UNICA`) até cada data — não partir do
  `saldoAtual` e subtrair transações pra trás.
- Motivo: desacoplar o Fluxo de Caixa de qualquer bug futuro na lógica
  de incremento de `saldoAtual` (mantida no módulo de import). O
  relatório deve calcular sua própria verdade a partir da fonte
  primária.
- Não modelar ajuste manual de saldo agora — não existe essa
  necessidade hoje. Se aparecer no futuro, precisa virar uma entidade
  própria (ex: `AjusteSaldo`), não pode ser absorvida silenciosamente na
  lógica de incremento existente.

### 7. Widgets do Dashboard

Implementar estes seis:
1. Saldo consolidado (soma de `saldoAtual` de todas as contas ativas da
   empresa).
2. Receita/despesa do mês atual vs mês anterior.
3. Gráfico de fluxo de caixa dos últimos N meses.
4. Contador de transações `PROVAVEL_DUPLICATA` pendentes de resolução.
5. Contador de transações sem `planoContaId`.
6. Top categorias (contas do Plano de Contas) por valor absoluto
   movimentado no período — reaproveita a mesma agregação por
   `planoContaId` já usada no DRE, cortada para o topo N.

Os contadores dos itens 4 e 5 devem ser **clicáveis**, levando direto
para a tela de Transações já filtrada pelo respectivo critério — não só
números estáticos.

### 8. Granularidade de acesso

- Os três relatórios operam sempre sobre **uma empresa por vez**
  (`empresaId` único), nunca consolidado entre empresas de uma
  organização — está fora de escopo por enquanto.
- Escrever a função de agregação aceitando internamente uma **lista**
  de `empresaId` (mesmo que hoje só receba um único elemento nessa
  lista). Isso não deve mudar a assinatura pública do endpoint agora,
  só evita reescrever a lógica de agregação do zero se uma visão
  consolidada for pedida depois.

## Ordem de implementação sugerida

1. Função pura de rollup hierárquico do Plano de Contas (testável
   isoladamente, com árvore de teste fixa).
2. Query agregada de DRE (groupBy por planoContaId + tipo, filtro por
   empresa/período/statusDuplicata=UNICA) + aplicação do rollup.
3. Cálculo de saldo acumulado do Fluxo de Caixa (saldoInicial + soma
   cumulativa por data).
4. Agregação por granularidade (dia/semana/mês) em JS sobre o resultado
   do passo 3.
5. Endpoints de DRE e Fluxo de Caixa.
6. Widgets do Dashboard, reaproveitando as queries dos passos 2 e 3
   sempre que possível (não duplicar lógica de agregação).

## Testes que não podem faltar

- Árvore de Plano de Contas com 3+ níveis de profundidade → total do
  nível raiz bate com a soma de todas as folhas.
- Transações sem `planoContaId` aparecem separadas por tipo, sem sumir
  do total do relatório.
- Transação com `statusDuplicata = PROVAVEL_DUPLICATA` não aparece no
  DRE nem no Fluxo de Caixa até ser resolvida como `UNICA`.
- Saldo acumulado do Fluxo de Caixa bate com o cálculo manual
  (saldoInicial + soma das transações) num caso de teste simples.
- Empresa sem nenhuma transação no período → relatório retorna
  estrutura vazia/zerada, não erro.
