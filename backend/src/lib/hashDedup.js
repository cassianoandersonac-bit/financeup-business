// src/lib/hashDedup.js
const crypto = require('crypto');
const { normalizeDescricao } = require('./normalizeDescricao');

// Fallback de deduplicação quando não há fitidOfx confiável. Não é único
// no banco (só indexado) — colisão vira PROVAVEL_DUPLICATA pra revisão
// manual, nunca descarte automático.
function calcularHashDedup({ contaBancariaId, data, valorTexto, descricao }) {
  const dataIso = data instanceof Date ? data.toISOString().slice(0, 10) : String(data);
  const chave = [contaBancariaId, dataIso, valorTexto, normalizeDescricao(descricao)].join('|');
  return crypto.createHash('sha256').update(chave).digest('hex');
}

module.exports = { calcularHashDedup };
