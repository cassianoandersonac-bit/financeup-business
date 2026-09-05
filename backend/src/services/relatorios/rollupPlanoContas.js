// src/services/relatorios/rollupPlanoContas.js
// Sobe o total das contas-folha do Plano de Contas pros pais, em
// memória (a árvore tem poucas dezenas/centenas de linhas, não
// justifica CTE recursiva no banco). Pura — não toca no Prisma.

// planoContas: [{ id, contaPaiId }]
// totaisPorContaId: Map<planoContaId, number> (soma direta, sem filhos)
// devolve: Map<id, { totalProprio: number, totalComFilhos: number }>
function rollupPlanoContas(planoContas, totaisPorContaId) {
  const filhosPorPai = new Map();
  for (const conta of planoContas) {
    const lista = filhosPorPai.get(conta.contaPaiId) || [];
    lista.push(conta.id);
    filhosPorPai.set(conta.contaPaiId, lista);
  }

  const resultado = new Map();

  function calcular(id) {
    if (resultado.has(id)) return resultado.get(id).totalComFilhos;

    const totalProprio = totaisPorContaId.get(id) || 0;
    const filhos = filhosPorPai.get(id) || [];
    const totalFilhos = filhos.reduce((acc, filhoId) => acc + calcular(filhoId), 0);
    const totalComFilhos = totalProprio + totalFilhos;

    resultado.set(id, { totalProprio, totalComFilhos });
    return totalComFilhos;
  }

  for (const conta of planoContas) calcular(conta.id);
  return resultado;
}

module.exports = { rollupPlanoContas };
