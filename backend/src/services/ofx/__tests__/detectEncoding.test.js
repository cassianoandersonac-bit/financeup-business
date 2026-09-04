const { decodeBuffer } = require('../detectEncoding');

describe('decodeBuffer', () => {
  test('decodifica UTF-8 corretamente', () => {
    const buffer = Buffer.from('PAGAMENTO FORNECEDOR ÇÃO', 'utf-8');
    expect(decodeBuffer(buffer)).toBe('PAGAMENTO FORNECEDOR ÇÃO');
  });

  test('cai para ISO-8859-1 quando os bytes não são UTF-8 válido, mesmo se o header mentir', () => {
    // "MANUTENÇÃO" em ISO-8859-1: Ç = 0xC7, Ã = 0xC3 — sequência inválida em UTF-8
    const textoOriginal = 'MANUTENÇÃO PREDIAL';
    const bufferLatin1 = Buffer.from(textoOriginal, 'latin1');

    // confirma que o buffer realmente não é UTF-8 válido (senão o teste não prova nada)
    expect(() => new TextDecoder('utf-8', { fatal: true }).decode(bufferLatin1)).toThrow();

    expect(decodeBuffer(bufferLatin1)).toBe(textoOriginal);
  });
});
