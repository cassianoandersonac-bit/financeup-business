const { importarExtrato } = require('../importarExtrato');
const { createFakePrisma } = require('../testHelpers/fakePrisma');
const { buildOfx } = require('../ofx/testHelpers/buildOfx');

const CONTA_ID = 'conta-1';
const CONTEXTO_BASE = { contaBancariaId: CONTA_ID, empresaId: 'empresa-1', filialId: null, nomeArquivo: 'extrato.ofx' };

describe('importarExtrato', () => {
  test('reimportar o mesmo arquivo duas vezes não duplica nada e não mexe no saldo na 2ª vez', async () => {
    const { prisma, state } = createFakePrisma({ contaBancariaId: CONTA_ID, saldoInicial: '1000.00' });

    const texto = buildOfx([
      { trntype: 'DEBIT', dtposted: '20260105120000', trnamt: '-150.00', fitid: 'F1', memo: 'FORNECEDOR X' },
      { trntype: 'CREDIT', dtposted: '20260110120000', trnamt: '2500.00', fitid: 'F2', memo: 'CLIENTE Y' },
    ]);

    const primeira = await importarExtrato({ ...CONTEXTO_BASE, textoDecodificado: texto }, prisma);
    expect(primeira.status).toBe('CONCLUIDO');
    expect(primeira.totalImportadas).toBe(2);
    expect(primeira.totalDuplicadas).toBe(0);
    expect(state.conta.saldoAtual.toFixed(2)).toBe('3350.00'); // 1000 - 150 + 2500
    expect(state.transacoes).toHaveLength(2);

    const saldoAposPrimeira = state.conta.saldoAtual.toFixed(2);

    const segunda = await importarExtrato({ ...CONTEXTO_BASE, textoDecodificado: texto }, prisma);
    expect(segunda.status).toBe('CONCLUIDO');
    expect(segunda.totalImportadas).toBe(0);
    expect(segunda.totalDuplicadas).toBe(2);
    expect(state.transacoes).toHaveLength(2); // nada novo inserido
    expect(state.conta.saldoAtual.toFixed(2)).toBe(saldoAposPrimeira); // saldo não mudou
  });

  test('duas transações reais diferentes, mesmo valor/dia e descrição parecida: ambas entram, uma fica PROVAVEL_DUPLICATA', async () => {
    const { prisma, state } = createFakePrisma({ contaBancariaId: CONTA_ID });

    const texto = buildOfx([
      { trntype: 'DEBIT', dtposted: '20260105120000', trnamt: '-50.00', fitid: 'F1', memo: 'PIX RECEBIDO JOAO' },
      { trntype: 'DEBIT', dtposted: '20260105120000', trnamt: '-50.00', fitid: 'F2', memo: 'PIX  RECEBIDO   JOAO' },
    ]);

    const resultado = await importarExtrato({ ...CONTEXTO_BASE, textoDecodificado: texto }, prisma);

    expect(resultado.totalImportadas).toBe(2); // nenhuma foi descartada
    expect(resultado.totalDuplicadas).toBe(0); // nenhuma é CONFIRMADA_DUPLICATA (FITID diferente)
    expect(state.transacoes).toHaveLength(2);

    const statusList = state.transacoes.map((t) => t.statusDuplicata).sort();
    expect(statusList).toEqual(['PROVAVEL_DUPLICATA', 'UNICA']);

    // só a UNICA entra no saldo
    expect(state.conta.saldoAtual.toFixed(2)).toBe('-50.00');
  });

  test('falha no meio de um import grande marca FALHOU_PARCIAL com totais parciais corretos', async () => {
    const { prisma, state, setFalharNoChunk } = createFakePrisma({ contaBancariaId: CONTA_ID });

    const transacoes = Array.from({ length: 1000 }, (_, i) => ({
      trntype: i % 2 === 0 ? 'DEBIT' : 'CREDIT',
      dtposted: '20260105120000',
      trnamt: i % 2 === 0 ? '-10.00' : '10.00',
      fitid: `F${i}`,
      memo: `TRANSACAO ${i}`,
    }));
    const texto = buildOfx(transacoes);

    // chunk de 300: chunks 0 e 1 (linhas 0-599) passam, falha no chunk 2 (linhas 600-899)
    setFalharNoChunk(2);

    await expect(importarExtrato({ ...CONTEXTO_BASE, textoDecodificado: texto }, prisma)).rejects.toThrow(
      'Falha simulada no chunk 2'
    );

    expect(state.importacoes).toHaveLength(1);
    const importacao = state.importacoes[0];
    expect(importacao.status).toBe('FALHOU_PARCIAL');
    expect(importacao.totalImportadas).toBe(600); // 2 chunks de 300 antes de falhar
    expect(state.transacoes).toHaveLength(600);
  });
});
