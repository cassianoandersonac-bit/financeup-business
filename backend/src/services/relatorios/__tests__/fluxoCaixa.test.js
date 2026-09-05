const { calcularSaldoAcumulado, buscarFluxoCaixa } = require('../fluxoCaixa');

describe('calcularSaldoAcumulado', () => {
  test('bate com o cálculo manual num caso simples (granularidade dia)', () => {
    const transacoes = [
      { data: '2026-01-05', valor: -100 },
      { data: '2026-01-05', valor: 50 },
      { data: '2026-01-10', valor: 200 },
    ];

    const baldes = calcularSaldoAcumulado({ saldoInicioPeriodo: 1000, transacoes, granularidade: 'dia' });

    // dia 1: 1000 - 100 + 50 = 950
    expect(baldes[0]).toEqual({ periodo: '2026-01-05', entradas: 50, saidas: -100, saldoAcumulado: 950 });
    // dia 2: 950 + 200 = 1150
    expect(baldes[1]).toEqual({ periodo: '2026-01-10', entradas: 200, saidas: 0, saldoAcumulado: 1150 });
  });

  test('agrupa por mês quando granularidade=mes', () => {
    const transacoes = [
      { data: '2026-01-05', valor: -100 },
      { data: '2026-01-20', valor: 300 },
      { data: '2026-02-01', valor: -50 },
    ];
    const baldes = calcularSaldoAcumulado({ saldoInicioPeriodo: 0, transacoes, granularidade: 'mes' });

    expect(baldes).toEqual([
      { periodo: '2026-01', entradas: 300, saidas: -100, saldoAcumulado: 200 },
      { periodo: '2026-02', entradas: 0, saidas: -50, saldoAcumulado: 150 },
    ]);
  });

  test('sem transações no período → lista vazia, não erro', () => {
    expect(calcularSaldoAcumulado({ saldoInicioPeriodo: 500, transacoes: [] })).toEqual([]);
  });
});

describe('buscarFluxoCaixa', () => {
  test('filtra statusDuplicata = UNICA na busca de transações do período', async () => {
    let whereRecebido;
    const prismaFake = {
      contaBancaria: { findMany: async () => [{ saldoInicial: 0 }] },
      transacao: {
        aggregate: async () => ({ _sum: { valor: 0 } }),
        findMany: async ({ where }) => {
          whereRecebido = where;
          return [];
        },
      },
    };

    await buscarFluxoCaixa({ empresaIds: ['empresa-1'], dataInicial: '2026-01-01', dataFinal: '2026-01-31' }, prismaFake);

    expect(whereRecebido.statusDuplicata).toBe('UNICA');
  });
});
