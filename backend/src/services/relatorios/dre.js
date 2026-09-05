// src/services/relatorios/dre.js
const { PrismaClient } = require('@prisma/client');
const { rollupPlanoContas } = require('./rollupPlanoContas');
const { construirFiltroData } = require('../../lib/periodo');

const prismaPadrao = new PrismaClient();

function numero(decimal) {
  return decimal == null ? 0 : Number(decimal);
}

// Combina o groupBy por planoContaId (já rollado pros pais) com os
// grupos "não classificado" por tipo. Pura — não toca no Prisma, então
// é testável com fixtures fixas.
function montarDre({ porPlanoConta, semClassificacao, planoContas }) {
  const totaisPorContaId = new Map(porPlanoConta.map((r) => [r.planoContaId, numero(r._sum.valor)]));
  const rollup = rollupPlanoContas(planoContas, totaisPorContaId);

  const contas = planoContas.map((c) => {
    const totais = rollup.get(c.id) || { totalProprio: 0, totalComFilhos: 0 };
    return {
      id: c.id,
      codigo: c.codigo,
      descricao: c.descricao,
      tipo: c.tipo,
      contaPaiId: c.contaPaiId,
      totalProprio: totais.totalProprio,
      totalComFilhos: totais.totalComFilhos,
    };
  });

  const naoClassificado = semClassificacao.map((r) => ({ tipo: r.tipo, total: numero(r._sum.valor) }));

  // total geral = soma das contas RAIZ (pra não contar filho duas vezes,
  // já que totalComFilhos da raiz já inclui toda a subárvore) + o que
  // não tem classificação. TRANSFERENCIA não entra no resultado (não é
  // receita nem despesa de verdade, é só movimentação entre contas
  // próprias) mas ainda aparece nas listas acima pra não sumir do relatório.
  const totalPorTipo = (tipo) => {
    const dasContasRaiz = contas
      .filter((c) => c.tipo === tipo && !c.contaPaiId)
      .reduce((acc, c) => acc + c.totalComFilhos, 0);
    const daoClassificacao = naoClassificado.find((n) => n.tipo === tipo)?.total || 0;
    return dasContasRaiz + daoClassificacao;
  };

  const totalReceitas = totalPorTipo('RECEITA');
  const totalDespesas = totalPorTipo('DESPESA');
  const totalTransferencias = totalPorTipo('TRANSFERENCIA');

  return {
    contas,
    naoClassificado,
    totalReceitas,
    totalDespesas,
    totalTransferencias,
    resultado: totalReceitas + totalDespesas,
  };
}

// Busca os dados no Prisma e monta o DRE. `empresaIds` é sempre uma
// lista (hoje sempre com 1 elemento) pra já deixar pronto pra uma visão
// consolidada futura sem reescrever a agregação.
async function buscarDre({ empresaIds, dataInicial, dataFinal }, prisma = prismaPadrao) {
  const baseWhere = {
    empresaId: { in: empresaIds },
    statusDuplicata: 'UNICA',
    ...(dataInicial || dataFinal ? { data: construirFiltroData(dataInicial, dataFinal) } : {}),
  };

  const [porPlanoConta, semClassificacao, planoContas] = await Promise.all([
    prisma.transacao.groupBy({
      by: ['planoContaId'],
      where: { ...baseWhere, planoContaId: { not: null } },
      _sum: { valor: true },
    }),
    prisma.transacao.groupBy({
      by: ['tipo'],
      where: { ...baseWhere, planoContaId: null },
      _sum: { valor: true },
    }),
    prisma.planoConta.findMany({ where: { empresaId: { in: empresaIds } } }),
  ]);

  return montarDre({ porPlanoConta, semClassificacao, planoContas });
}

module.exports = { montarDre, buscarDre };
