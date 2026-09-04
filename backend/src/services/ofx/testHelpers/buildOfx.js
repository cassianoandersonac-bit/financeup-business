// Monta um texto OFX (BANK) válido a partir de uma lista de transações,
// pra não precisar escrever arquivo de exemplo à mão em cada teste.
function buildOfx(transacoes) {
  const linhasTransacoes = transacoes
    .map(
      (t) => `<STMTTRN>
<TRNTYPE>${t.trntype || 'DEBIT'}
<DTPOSTED>${t.dtposted}
<TRNAMT>${t.trnamt}
<FITID>${t.fitid}
<MEMO>${t.memo || ''}
</STMTTRN>`
    )
    .join('\n');

  return `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20260101120000
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>001
<ACCTID>12345-6
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260101
<DTEND>20260131
${linhasTransacoes}
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>0.00
<DTASOF>20260131
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;
}

module.exports = { buildOfx };
