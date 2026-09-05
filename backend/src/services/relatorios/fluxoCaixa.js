// src/services/relatorios/fluxoCaixa.js
// "Saldo acumulado" — nunca chamar de "projetado" na interface: é o
// efeito cumulativo de somar entradas/saídas ao saldo de abertura do
// período, sempre olhando pra trás (extrato importado), nunca previsão
// de futuro. Recalculado do zero a partir de saldoInicial + transações
// — não parte do saldoAtual, pra não herdar bug futuro do incremento
// mantido no import.
const { PrismaClient } = require('@prisma/client');
const { construirFiltroData } = require('../../lib/periodo');

const prismaPadrao = new PrismaClient();

function chaveBalde(data, granularidade) {
  const d = new Date(data);
  if (granularidade === 'mes') return d.toISOString().slice(0, 7); // YYYY-MM

  if (granularidade === 'semana') {
    const diaSemana = d.getUTCDay(); // 0 = domingo
    const diffParaSegunda = (diaSemana === 0 ? -6 : 1) - diaSemana;
    const inicioSemana = new Date(d);
    inicioSemana.setUTCDate(d.getUTCDate() + diffParaSegunda);
    return inicioSemana.toISOString().slice(0, 10);
  }

  return d.toISOString().slice(0, 10); // dia
}

// Pura — agrupa transações {data, valor} em baldes (dia/semana/mês) e
// devolve o saldo acumulado a partir do saldo de abertura do período.
function calcularSaldoAcumulado({ saldoInicioPeriodo, transacoes, granularidade = 'dia' }) {
  const baldes = new Map();

  for (const t of transacoes) {
    const chave = chaveBalde(t.data, granularidade);
    const atual = baldes.get(chave) || { entradas: 0, saidas: 0 };
    const valor = Number(t.valor);
    if (valor >= 0) atual.entradas += valor;
    else atual.saidas += valor;
    baldes.set(chave, atual);
  }

  let saldoAcumulado = Number(saldoInicioPeriodo);
  return [...baldes.keys()].sort().map((periodo) => {
    const { entradas, saidas } = baldes.get(periodo);
    saldoAcumulado += entradas + saidas;
    return { periodo, entradas, saidas, saldoAcumulado };
  });
}

async function buscarFluxoCaixa({ empresaIds, dataInicial, dataFinal, granularidade = 'dia' }, prisma = prismaPadrao) {
  const [contas, transacoesAnteriores, transacoesPeriodo] = await Promise.all([
    prisma.contaBancaria.findMany({ where: { empresaId: { in: empresaIds } }, select: { saldoInicial: true } }),
    dataInicial
      ? prisma.transacao.aggregate({
          where: {
            empresaId: { in: empresaIds },
            statusDuplicata: 'UNICA',
            data: { lt: new Date(`${dataInicial}T00:00:00.000Z`) },
          },
          _sum: { valor: true },
        })
      : Promise.resolve({ _sum: { valor: null } }),
    prisma.transacao.findMany({
      where: {
        empresaId: { in: empresaIds },
        statusDuplicata: 'UNICA',
        data: construirFiltroData(dataInicial, dataFinal),
      },
      select: { data: true, valor: true },
      orderBy: { data: 'asc' },
    }),
  ]);

  const saldoBaseContas = contas.reduce((acc, c) => acc + Number(c.saldoInicial), 0);
  const saldoInicioPeriodo = saldoBaseContas + Number(transacoesAnteriores._sum.valor || 0);

  const baldes = calcularSaldoAcumulado({ saldoInicioPeriodo, transacoes: transacoesPeriodo, granularidade });

  return { saldoInicioPeriodo, baldes };
}

module.exports = { calcularSaldoAcumulado, buscarFluxoCaixa };
