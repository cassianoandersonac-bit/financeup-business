// src/lib/normalizeDescricao.js
// Pipeline fixo (decisão já fechada, ver prompt-claude-code-import-ofx.md):
// 1. uppercase
// 2. remove diacríticos (NFD + strip marks)
// 3. mantém só [A-Z0-9 ]
// 4. colapsa espaços múltiplos, trim
//
// Não remove números tentando filtrar "ruído de protocolo bancário":
// preferir falso negativo (não bate o hash, entra como UNICA de novo) a
// falso positivo (duas transações reais diferentes colapsando no mesmo
// hash) — o fitidOfx é quem carrega a precisão real, isto é só rede de
// segurança grosseira.
function normalizeDescricao(descricao) {
  return String(descricao || '')
    .toUpperCase()
    .normalize('NFD') // decompõe acentos em letra base + marca combinante
    .replace(/[^A-Z0-9 ]/g, '') // já descarta as marcas combinantes junto com o resto
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { normalizeDescricao };
