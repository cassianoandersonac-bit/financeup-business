const { construirFiltroPrismaValor } = require('../filtroValor');

describe('construirFiltroPrismaValor', () => {
  test('"2000" busca faixa 2000-2999 (exemplo do prompt)', () => {
    expect(construirFiltroPrismaValor('2000')).toEqual({
      OR: [{ valor: { gte: 2000, lt: 3000 } }, { valor: { gt: -3000, lte: -2000 } }],
    });
  });

  test('"2500" (2 zeros à direita) busca faixa 2500-2599', () => {
    expect(construirFiltroPrismaValor('2500')).toEqual({
      OR: [{ valor: { gte: 2500, lt: 2600 } }, { valor: { gt: -2600, lte: -2500 } }],
    });
  });

  test('"25" (sem zero à direita) fica quase exato (largura 1)', () => {
    expect(construirFiltroPrismaValor('25')).toEqual({
      OR: [{ valor: { gte: 25, lt: 26 } }, { valor: { gt: -26, lte: -25 } }],
    });
  });

  test('"2000.50" com decimal busca valor exato, nos dois sinais', () => {
    expect(construirFiltroPrismaValor('2000.50')).toEqual({ OR: [{ valor: 2000.5 }, { valor: -2000.5 }] });
  });

  test('vírgula como separador decimal também funciona', () => {
    expect(construirFiltroPrismaValor('2000,50')).toEqual({ OR: [{ valor: 2000.5 }, { valor: -2000.5 }] });
  });

  test('texto vazio ou inválido não filtra nada (null)', () => {
    expect(construirFiltroPrismaValor('')).toBeNull();
    expect(construirFiltroPrismaValor('   ')).toBeNull();
    expect(construirFiltroPrismaValor('abc')).toBeNull();
  });
});
