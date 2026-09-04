const { calcularHashDedup } = require('../hashDedup');

describe('calcularHashDedup', () => {
  const base = {
    contaBancariaId: 'conta1',
    data: new Date('2026-01-05T00:00:00.000Z'),
    valorTexto: '-150.00',
    descricao: 'PAGAMENTO FORNECEDOR X',
  };

  test('é determinístico para os mesmos dados', () => {
    expect(calcularHashDedup(base)).toBe(calcularHashDedup({ ...base }));
  });

  test('muda se a conta bancária for diferente (não vaza entre contas)', () => {
    expect(calcularHashDedup(base)).not.toBe(calcularHashDedup({ ...base, contaBancariaId: 'conta2' }));
  });

  test('pequena variação de formatação na descrição ainda bate o hash (normalização)', () => {
    const variante = { ...base, descricao: '  pagamento   fornecedor x  ' };
    expect(calcularHashDedup(base)).toBe(calcularHashDedup(variante));
  });

  test('descrições realmente diferentes não colidem', () => {
    const outra = { ...base, descricao: 'PAGAMENTO FORNECEDOR Y' };
    expect(calcularHashDedup(base)).not.toBe(calcularHashDedup(outra));
  });
});
