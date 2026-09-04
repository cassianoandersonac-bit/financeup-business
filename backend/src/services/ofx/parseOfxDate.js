// src/services/ofx/parseOfxDate.js
// Nunca usar `new Date(stringCrua)` num campo OFX: formatos variam por
// banco (com/sem hora, com/sem timezone) e `new Date` de string com fuso
// horário pode "virar o dia" ao converter pra UTC. Aqui só interessa a
// data civil (YYYYMMDD) do início da string — hora/timezone são
// ignorados de propósito, sempre construindo a data em UTC.

class DataOfxInvalidaError extends Error {
  constructor(valorCru) {
    super(`Data OFX inválida: "${valorCru}"`);
    this.name = 'DataOfxInvalidaError';
    this.valorCru = valorCru;
  }
}

const FORMATO_DATA_OFX = /^(\d{4})(\d{2})(\d{2})/;

function parseOfxDate(valorCru) {
  const match = FORMATO_DATA_OFX.exec(String(valorCru || '').trim());
  if (!match) throw new DataOfxInvalidaError(valorCru);

  const [, anoStr, mesStr, diaStr] = match;
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  const dia = Number(diaStr);

  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const valido =
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  if (!valido) throw new DataOfxInvalidaError(valorCru);

  return data;
}

module.exports = { parseOfxDate, DataOfxInvalidaError };
