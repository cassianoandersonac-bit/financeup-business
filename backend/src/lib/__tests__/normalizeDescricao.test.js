const { normalizeDescricao } = require('../normalizeDescricao');

describe('normalizeDescricao', () => {
  test('uppercase, remove acento, remove pontuação, colapsa espaços', () => {
    expect(normalizeDescricao('Pagto  Fornecedor Ção-Ltda #123')).toBe('PAGTO FORNECEDOR CAOLTDA 123');
  });

  test('não remove números', () => {
    expect(normalizeDescricao('PIX 12345678')).toBe('PIX 12345678');
  });

  test('trata vazio/nulo sem lançar', () => {
    expect(normalizeDescricao('')).toBe('');
    expect(normalizeDescricao(null)).toBe('');
  });
});
