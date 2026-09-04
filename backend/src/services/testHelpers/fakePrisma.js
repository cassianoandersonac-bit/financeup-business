// Prisma fake, só com o que importarExtrato.js usa. Mantém estado em
// memória entre chamadas pra permitir testar reimportação do mesmo
// arquivo (a segunda chamada precisa "ver" o que a primeira gravou).
const { Prisma } = require('@prisma/client');

function createFakePrisma({ contaBancariaId = 'conta-1', saldoInicial = '0' } = {}) {
  const state = {
    transacoes: [],
    importacoes: [],
    conta: { id: contaBancariaId, saldoAtual: new Prisma.Decimal(saldoInicial) },
    proximoImportacaoId: 1,
    chunksProcessados: 0,
  };

  let falharNoChunkIndice = null;

  const prisma = {
    transacao: {
      findMany: async ({ where }) => {
        return state.transacoes.filter((t) => {
          if (t.contaBancariaId !== where.contaBancariaId) return false;
          if (where.fitidOfx) return where.fitidOfx.in.includes(t.fitidOfx);
          if (where.hashDedup) return where.hashDedup.in.includes(t.hashDedup);
          return false;
        });
      },
      createMany: async ({ data }) => {
        const indiceAtual = state.chunksProcessados;
        state.chunksProcessados += 1;
        if (falharNoChunkIndice === indiceAtual) {
          throw new Error(`Falha simulada no chunk ${indiceAtual}`);
        }
        data.forEach((d) => state.transacoes.push(d));
        return { count: data.length };
      },
    },
    contaBancaria: {
      update: async ({ data }) => {
        if (data.saldoAtual && data.saldoAtual.increment !== undefined) {
          state.conta.saldoAtual = state.conta.saldoAtual.add(data.saldoAtual.increment);
        }
        return state.conta;
      },
    },
    importacaoExtrato: {
      create: async ({ data }) => {
        const registro = { id: `imp-${state.proximoImportacaoId++}`, ...data };
        state.importacoes.push(registro);
        return registro;
      },
      update: async ({ where, data }) => {
        const registro = state.importacoes.find((i) => i.id === where.id);
        Object.assign(registro, data);
        return registro;
      },
    },
    $transaction: async (operacoes) => Promise.all(operacoes),
  };

  return {
    prisma,
    state,
    setFalharNoChunk: (indice) => {
      falharNoChunkIndice = indice;
    },
  };
}

module.exports = { createFakePrisma };
