# Prompt para Claude Code — Módulo de Importação OFX/QFX (FinanceUp Business)

> Complemento ao prompt inicial do FinanceUp Business. Cole isso no Claude
> Code quando for implementar especificamente o fluxo de importação de
> extrato. As decisões de arquitetura abaixo já foram tomadas — não
> reabrir esses pontos, só implementar.

## Contexto

Stack: Node/Express/Prisma/PostgreSQL, deploy na Vercel (functions
serverless). Volume esperado: extratos mensais de PMEs, centenas a poucos
milhares de transações por arquivo, arquivo até ~10MB.

Schema relevante já existe (`ContaBancaria`, `Transacao` com `fitidOfx` /
`hashDedup` / `statusDuplicata`, `ImportacaoExtrato`).

## Decisões de arquitetura já fechadas

### 1. Parser

- Não usar `node-ofx-parser` como dependência principal — está sem
  manutenção há anos (fork de fork, sem atualização real).
- Avaliar `ofx-data-extractor` (TypeScript, modos strict/lenient) como
  ponto de partida, mas por trás de uma interface própria
  (`OfxParserAdapter` ou similar) — não acoplar o resto do sistema
  diretamente à API da lib escolhida, pra poder trocar sem reescrever
  regra de negócio.
- Escrever uma camada de sanitização própria ANTES de passar o texto pro
  parser: normalizar quebra de linha, remover BOM, fechar tags SGML não
  fechadas via regex nos casos conhecidos.
- Encoding: tentar decodificar como UTF-8 primeiro; se aparecer sequência
  de byte inválida, refazer como ISO-8859-1. Não confiar no campo
  CHARSET/ENCODING do cabeçalho OFX — ele mente com frequência em
  exports de banco brasileiro.
- Datas: nunca usar `new Date(stringCrua)`. Escrever parser de data OFX
  dedicado via regex (`YYYYMMDD` ou `YYYYMMDDHHMMSS[timezone]`).
- Guardar o arquivo OFX original (ou pelo menos seus bytes) vinculado ao
  registro de `ImportacaoExtrato`, pra permitir reprocessar/diagnosticar
  falha sem pedir o arquivo de novo pro usuário.

### 2. Normalização da descrição (hashDedup)

Pipeline fixo, nesta ordem:
1. uppercase
2. `.normalize('NFD')` + remover marcas diacríticas (acentos)
3. remover tudo que não for `[A-Z0-9 ]`
4. colapsar espaços múltiplos, trim

**Não remover números da descrição** tentando filtrar "ruído de
protocolo bancário". Essa heurística aumenta risco de falso positivo
(duas transações reais diferentes colapsando no mesmo hash). Preferir
falso negativo (hash não bate, entra como UNICA de novo) a falso
positivo nesse fallback — o `fitidOfx` é quem carrega a precisão real,
o hash é só rede de segurança grosseira.

### 3. Verificação de duplicata em lote

Fluxo obrigatório:
1. Parsear o arquivo inteiro em memória.
2. Montar lista de `fitidOfx` não-nulos e lista de `hashDedup`
   calculados de todas as transações do arquivo.
3. Rodar duas queries em lote:
   `WHERE contaBancariaId = X AND fitidOfx IN (...)`
   `WHERE contaBancariaId = X AND hashDedup IN (...)`
4. Montar `Set`/`Map` em memória com os resultados e classificar cada
   transação parseada comparando contra esses sets.

**Não** carregar todas as transações existentes da conta em memória.
**Não** fazer uma query por linha do arquivo.

### 4. Atomicidade

- Processar em chunks de ~200-500 linhas por `createMany`, cada chunk em
  sua própria transação Prisma curta — não uma `$transaction` única
  envolvendo o arquivo inteiro.
- Adicionar campo `status` (enum: `PROCESSANDO` | `CONCLUIDO` |
  `FALHOU_PARCIAL`) em `ImportacaoExtrato` — hoje o schema não tem isso,
  e sem esse campo uma falha no meio do processamento fica invisível pro
  usuário.
- Dedup por `fitidOfx` já protege contra duplicação real numa
  reexecução após falha parcial — não precisa de lógica extra de
  idempotência além disso.

### 5. Atualização de saldoAtual

- Incrementar `saldoAtual` pela soma das transações inseridas como
  `UNICA` naquele import — não recalcular como soma total de tudo a
  cada import.
- Transações `PROVAVEL_DUPLICATA` **não entram no saldo** até serem
  resolvidas manualmente como únicas de verdade.
- `conciliado` não afeta o saldo — o saldo reflete todas as transações
  não-descartadas, independente de estarem conciliadas ou não.
- Implementar também uma operação separada de "recalcular saldo do
  zero" (soma real de todas as transações válidas), disponível como
  manutenção pontual, não rodando por padrão a cada import — serve pra
  corrigir drift se algum dia o incremento sair de sincronia.

### 6. Execução síncrona com teto, sem fila por enquanto

- Implementar o import como função pura (parse → dedup → persistência),
  desacoplada do handler HTTP, para poder mover pra assíncrono depois
  sem reescrever.
- Rejeitar arquivos com mais de 5.000 transações detectadas no parse,
  com mensagem clara — não deixar estourar timeout silenciosamente.
- Não implementar fila (BullMQ/Redis ou Upstash QStash) nesta fase.
  Só revisitar se um teste com arquivo real grande mostrar que o tempo
  de processamento está perto do limite de function da Vercel.

## Ordem de implementação deste módulo

1. Camada de sanitização + detecção de encoding (testável isoladamente,
   com arquivos de exemplo de pelo menos 2-3 bancos diferentes).
2. Adapter do parser OFX por cima da lib escolhida.
3. Parser de data OFX dedicado (regex, com testes de formato variando).
4. Função de normalização de descrição + cálculo de hashDedup.
5. Função pura de import (recebe texto OFX + contaBancariaId, devolve
   resumo de totais) com a lógica de dedup em lote.
6. Persistência em chunks + atualização incremental de saldoAtual.
7. Endpoint HTTP fino, só chamando a função pura acima e devolvendo o
   resultado.
8. Teste de ponta a ponta: reimportar o mesmo arquivo duas vezes → zero
   duplicata real inserida.

## Testes que não podem faltar

- Arquivo com encoding ISO-8859-1 declarado como CHARSET diferente do
  real → deve decodificar corretamente mesmo assim.
- SGML com tag não fechada → não deve derrubar o parser inteiro.
- Reimportação do mesmo arquivo → segunda vez, zero transação nova
  inserida via fitidOfx, saldoAtual não muda.
- Duas transações reais diferentes, mesmo valor, mesmo dia, descrição
  parecida → não podem virar hashDedup idêntico de forma que uma suma
  silenciosamente (elas devem aparecer, mesmo que uma fique marcada
  PROVAVEL_DUPLICATA pra revisão manual).
- Falha simulada no meio de um import de 1000+ linhas → status do
  `ImportacaoExtrato` deve refletir `FALHOU_PARCIAL`, não ficar como se
  tivesse concluído.
