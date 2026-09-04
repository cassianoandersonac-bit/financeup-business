const { parseOfx } = require('../ofxAdapter');
const { buildOfx } = require('../testHelpers/buildOfx');

describe('parseOfx', () => {
  test('extrai transações de um OFX bem formado', () => {
    const texto = buildOfx([
      { trntype: 'DEBIT', dtposted: '20260105120000', trnamt: '-150.00', fitid: 'A1', memo: 'FORNECEDOR X' },
      { trntype: 'CREDIT', dtposted: '20260110120000', trnamt: '2500.00', fitid: 'A2', memo: 'CLIENTE Y' },
    ]);

    const { tipoConta, transacoes, avisos } = parseOfx(texto);

    expect(tipoConta).toBe('BANK');
    expect(avisos).toHaveLength(0);
    expect(transacoes).toHaveLength(2);
    expect(transacoes[0]).toMatchObject({ tipo: 'DESPESA', fitidOfx: 'A1', valorTexto: '-150.00' });
    expect(transacoes[0].data.toISOString().slice(0, 10)).toBe('2026-01-05');
    expect(transacoes[1]).toMatchObject({ tipo: 'RECEITA', fitidOfx: 'A2', valorTexto: '2500.00' });
  });

  test('não trava com SGML colado numa linha só (sem quebra entre tags)', () => {
    const textoMalformado = [
      'OFXHEADER:100',
      'DATA:OFXSGML',
      'VERSION:102',
      '',
      '<OFX><SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS><DTSERVER>20260101120000<LANGUAGE>POR</SONRS></SIGNONMSGSRSV1>',
      '<BANKMSGSRSV1><STMTTRNRS><TRNUID>1<STATUS><CODE>0<SEVERITY>INFO</STATUS><STMTRS><CURDEF>BRL<BANKACCTFROM><BANKID>1<ACCTID>1<ACCTTYPE>CHECKING</BANKACCTFROM><BANKTRANLIST><DTSTART>20260101<DTEND>20260131<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260105120000<TRNAMT>-10.00<FITID>X1<MEMO>TESTE</STMTTRN></BANKTRANLIST><LEDGERBAL><BALAMT>0<DTASOF>20260131</LEDGERBAL></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>',
    ].join('\n');

    const { transacoes } = parseOfx(textoMalformado);
    expect(transacoes).toHaveLength(1);
    expect(transacoes[0].fitidOfx).toBe('X1');
  });

  test('TRNTYPE XFER vira TRANSFERENCIA independente do sinal', () => {
    const texto = buildOfx([{ trntype: 'XFER', dtposted: '20260105120000', trnamt: '-500.00', fitid: 'A1', memo: 'TED ENTRE CONTAS' }]);
    const { transacoes } = parseOfx(texto);
    expect(transacoes[0].tipo).toBe('TRANSFERENCIA');
  });

  test('MEMO em branco não derruba o parser (a lib falha silenciosamente com valor vazio)', () => {
    const texto = buildOfx([{ trntype: 'DEBIT', dtposted: '20260105120000', trnamt: '-20.00', fitid: 'A1', memo: '' }]);
    const { transacoes } = parseOfx(texto);
    expect(transacoes).toHaveLength(1);
    expect(transacoes[0].descricao).toBe('(sem descrição)');
  });
});
