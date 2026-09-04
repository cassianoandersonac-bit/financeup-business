// src/services/ofx/ofxAdapter.js
// OfxParserAdapter: isola o resto do sistema da API da lib escolhida
// (ofx-data-extractor). Se um dia trocar de lib, só este arquivo muda.
//
// A lib já resolve tipo de extrato, valor (como string, sem virar float)
// e FITID (como string, sem perder zero à esquerda) com segurança. Mas
// o campo de data que ela devolve já vem silenciosamente reformatado
// (testado: "20260105120000" virou "2026-01-05", perdendo a hora) mesmo
// nos métodos "crus" — por isso a data é extraída aqui via regex direto
// do texto saneado, tag por tag, na mesma ordem em que os blocos
// <STMTTRN> aparecem no documento (mesma tag em extrato de conta
// corrente e de cartão de crédito).
const { Ofx } = require('ofx-data-extractor');
const { sanitizeOfxText } = require('./sanitize');
const { parseOfxDate } = require('./parseOfxDate');

class OfxInvalidoError extends Error {
  constructor(mensagem, causa) {
    super(mensagem);
    this.name = 'OfxInvalidoError';
    this.causa = causa;
  }
}

function extrairDatasBrutas(textoSaneado) {
  const blocos = textoSaneado.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g) || [];
  return blocos.map((bloco) => {
    const match = bloco.match(/<DTPOSTED>([^\n<]+)/);
    return match ? match[1].trim() : null;
  });
}

function inferirTipoTransacao(trntype, valor) {
  if (trntype === 'XFER') return 'TRANSFERENCIA';
  return valor < 0 ? 'DESPESA' : 'RECEITA';
}

// Recebe o texto OFX já decodificado (encoding correto), devolve:
// { tipoConta: 'BANK'|'CREDITCARD', transacoes: [...], avisos: [...] }
function parseOfx(textoDecodificado) {
  const textoSaneado = sanitizeOfxText(textoDecodificado);

  let ofx;
  try {
    ofx = new Ofx(textoSaneado, { nativeTypes: false, parserMode: 'lenient' });
  } catch (err) {
    throw new OfxInvalidoError('Não foi possível interpretar o arquivo OFX', err);
  }

  const tipo = ofx.getType();
  const listaBruta =
    tipo === 'CREDITCARD' ? ofx.getCreditCardTransferList() : ofx.getBankTransferList();

  if (!Array.isArray(listaBruta)) {
    throw new OfxInvalidoError('Arquivo OFX não contém uma lista de transações reconhecível');
  }

  const datasBrutas = extrairDatasBrutas(textoSaneado);
  const avisos = [];

  const transacoes = listaBruta.map((item, indice) => {
    const dataCrua = datasBrutas[indice];
    let data;
    try {
      data = parseOfxDate(dataCrua);
    } catch (err) {
      avisos.push({ indice, mensagem: err.message });
      return null;
    }

    const valorTexto = String(item.TRNAMT ?? '').trim();
    const valor = Number(valorTexto.replace(',', '.'));
    if (!valorTexto || Number.isNaN(valor)) {
      avisos.push({ indice, mensagem: `Valor inválido: "${item.TRNAMT}"` });
      return null;
    }

    const descricao = String(item.MEMO || item.NAME || '').trim() || '(sem descrição)';
    const fitidOfx = item.FITID != null && String(item.FITID).trim() !== '' ? String(item.FITID).trim() : null;

    return {
      data,
      valor, // number, só pra classificar sinal/tipo — persistência usa valorTexto (Decimal-safe)
      valorTexto, // string exata do arquivo (ex: "-150.00"), preserva sinal e precisão
      descricao,
      fitidOfx,
      tipo: inferirTipoTransacao(item.TRNTYPE, valor),
    };
  }).filter(Boolean);

  return { tipoConta: tipo, transacoes, avisos };
}

module.exports = { parseOfx, OfxInvalidoError };
