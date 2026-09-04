const { parseOfxDate, DataOfxInvalidaError } = require('../parseOfxDate');

describe('parseOfxDate', () => {
  test('data sem hora (YYYYMMDD)', () => {
    const d = parseOfxDate('20260105');
    expect(d.toISOString()).toBe('2026-01-05T00:00:00.000Z');
  });

  test('data com hora (YYYYMMDDHHMMSS) — hora é ignorada, fica a data civil', () => {
    const d = parseOfxDate('20260105235900');
    expect(d.toISOString().slice(0, 10)).toBe('2026-01-05');
  });

  test('data com timezone no fim — não deve "virar o dia"', () => {
    // 23:59 no fuso -3 seria ~02:59 UTC do dia seguinte se alguém convertesse
    // fuso; aqui o parser ignora fuso de propósito e fica no dia civil do OFX.
    const d = parseOfxDate('20260105235900[-3:BRT]');
    expect(d.toISOString().slice(0, 10)).toBe('2026-01-05');
  });

  test('data com milissegundos e timezone', () => {
    const d = parseOfxDate('20260228120000.500[-3:BRT]');
    expect(d.toISOString().slice(0, 10)).toBe('2026-02-28');
  });

  test('lança DataOfxInvalidaError para lixo', () => {
    expect(() => parseOfxDate('não é uma data')).toThrow(DataOfxInvalidaError);
  });

  test('lança DataOfxInvalidaError para data calendário impossível (30/02)', () => {
    expect(() => parseOfxDate('20260230')).toThrow(DataOfxInvalidaError);
  });

  test('lança DataOfxInvalidaError para vazio/nulo', () => {
    expect(() => parseOfxDate('')).toThrow(DataOfxInvalidaError);
    expect(() => parseOfxDate(null)).toThrow(DataOfxInvalidaError);
  });
});
