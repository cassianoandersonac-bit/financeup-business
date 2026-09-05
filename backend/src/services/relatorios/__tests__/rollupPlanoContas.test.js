const { rollupPlanoContas } = require('../rollupPlanoContas');

describe('rollupPlanoContas', () => {
  test('soma sobe até a raiz numa árvore de 3 níveis', () => {
    // 1 (raiz) -> 1.1 -> 1.1.1
    //          -> 1.2
    const planoContas = [
      { id: 'raiz', contaPaiId: null },
      { id: '1.1', contaPaiId: 'raiz' },
      { id: '1.1.1', contaPaiId: '1.1' },
      { id: '1.2', contaPaiId: 'raiz' },
    ];
    const totaisPorContaId = new Map([
      ['raiz', 10],
      ['1.1', 20],
      ['1.1.1', 5],
      ['1.2', 7],
    ]);

    const resultado = rollupPlanoContas(planoContas, totaisPorContaId);

    expect(resultado.get('1.1.1')).toEqual({ totalProprio: 5, totalComFilhos: 5 });
    expect(resultado.get('1.1')).toEqual({ totalProprio: 20, totalComFilhos: 25 }); // 20 + 5
    expect(resultado.get('1.2')).toEqual({ totalProprio: 7, totalComFilhos: 7 });
    expect(resultado.get('raiz')).toEqual({ totalProprio: 10, totalComFilhos: 42 }); // 10+25+7 = soma de todas as folhas + próprio

    // total da raiz bate com a soma direta de todos os totais próprios da árvore
    const somaTotal = [...totaisPorContaId.values()].reduce((a, b) => a + b, 0);
    expect(resultado.get('raiz').totalComFilhos).toBe(somaTotal);
  });

  test('conta sem nenhuma transação (não está no Map) fica com total zero', () => {
    const planoContas = [{ id: 'a', contaPaiId: null }];
    const resultado = rollupPlanoContas(planoContas, new Map());
    expect(resultado.get('a')).toEqual({ totalProprio: 0, totalComFilhos: 0 });
  });

  test('lista vazia não lança erro', () => {
    expect(rollupPlanoContas([], new Map()).size).toBe(0);
  });
});
