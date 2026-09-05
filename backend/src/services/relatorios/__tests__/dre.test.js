const { montarDre, buscarDre } = require('../dre');

describe('montarDre', () => {
  const planoContas = [
    { id: 'receitas', codigo: '1', descricao: 'Receitas', tipo: 'RECEITA', contaPaiId: null },
    { id: 'vendas', codigo: '1.1', descricao: 'Vendas', tipo: 'RECEITA', contaPaiId: 'receitas' },
    { id: 'despesas', codigo: '2', descricao: 'Despesas', tipo: 'DESPESA', contaPaiId: null },
    { id: 'aluguel', codigo: '2.1', descricao: 'Aluguel', tipo: 'DESPESA', contaPaiId: 'despesas' },
  ];

  test('rollup por planoContaId + transações sem classificação não somem do total', () => {
    const porPlanoConta = [
      { planoContaId: 'vendas', _sum: { valor: 1000 } },
      { planoContaId: 'aluguel', _sum: { valor: -300 } },
    ];
    const semClassificacao = [
      { tipo: 'RECEITA', _sum: { valor: 500 } },
      { tipo: 'DESPESA', _sum: { valor: -50 } },
    ];

    const dre = montarDre({ porPlanoConta, semClassificacao, planoContas });

    expect(dre.contas.find((c) => c.id === 'receitas').totalComFilhos).toBe(1000);
    expect(dre.contas.find((c) => c.id === 'despesas').totalComFilhos).toBe(-300);
    expect(dre.naoClassificado).toEqual([
      { tipo: 'RECEITA', total: 500 },
      { tipo: 'DESPESA', total: -50 },
    ]);

    // total geral inclui o classificado E o não classificado
    expect(dre.totalReceitas).toBe(1500); // 1000 (vendas) + 500 (não classificado)
    expect(dre.totalDespesas).toBe(-350); // -300 (aluguel) + -50 (não classificado)
    expect(dre.resultado).toBe(1150); // 1500 - 350
  });

  test('TRANSFERENCIA não entra no resultado, mas aparece nos totais separados', () => {
    const comTransferencia = [
      ...planoContas,
      { id: 'transf', codigo: '3', descricao: 'Transferências', tipo: 'TRANSFERENCIA', contaPaiId: null },
    ];
    const dre = montarDre({
      porPlanoConta: [{ planoContaId: 'transf', _sum: { valor: 200 } }],
      semClassificacao: [],
      planoContas: comTransferencia,
    });

    expect(dre.totalTransferencias).toBe(200);
    expect(dre.totalReceitas).toBe(0);
    expect(dre.totalDespesas).toBe(0);
    expect(dre.resultado).toBe(0); // transferência não conta no resultado
  });

  test('sem nenhuma transação no período → estrutura zerada, não erro', () => {
    const dre = montarDre({ porPlanoConta: [], semClassificacao: [], planoContas });
    expect(dre.totalReceitas).toBe(0);
    expect(dre.totalDespesas).toBe(0);
    expect(dre.resultado).toBe(0);
    expect(dre.contas.every((c) => c.totalComFilhos === 0)).toBe(true);
  });
});

describe('buscarDre', () => {
  test('sempre filtra statusDuplicata = UNICA (PROVAVEL_DUPLICATA não deve aparecer)', async () => {
    const wheresRecebidos = [];
    const prismaFake = {
      transacao: {
        groupBy: async ({ where }) => {
          wheresRecebidos.push(where);
          return [];
        },
      },
      planoConta: { findMany: async () => [] },
    };

    await buscarDre({ empresaIds: ['empresa-1'] }, prismaFake);

    expect(wheresRecebidos).toHaveLength(2); // porPlanoConta + semClassificacao
    wheresRecebidos.forEach((where) => expect(where.statusDuplicata).toBe('UNICA'));
  });
});
