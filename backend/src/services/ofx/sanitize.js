// src/services/ofx/sanitize.js
// Camada de sanitização antes de qualquer parser tocar no texto.
// SGML mal formado (linhas coladas, sem quebra entre tags) já foi
// observado derrubando o parser mesmo em modo lenient — normalizar aqui
// evita ter que confiar só na tolerância da lib.

function sanitizeOfxText(texto) {
  return texto
    .replace(/^﻿/, '') // BOM
    .replace(/\r\n?/g, '\n') // CRLF/CR -> LF
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // caracteres de controle, preserva \n e \t
    // garante que toda tag SGML comece em uma linha própria, mesmo se
    // o arquivo veio com tudo colado numa linha só
    .replace(/></g, '>\n<')
    // usa lookahead (não captura o "<" seguinte) para não "comer" o
    // delimitador que a próxima tag colada precisa pra também ser
    // splitada nesta mesma passada (ex: "<CODE>0<SEVERITY>INFO<...")
    .replace(/(<[A-Z0-9.]+>[^<\n]*)(?=<)/g, '$1\n')
    // MEMO/NAME em branco de verdade (comum em extrato real) derruba a
    // conversão SGML->JSON da lib inteira, silenciosamente, sem warning
    // — mesmo preenchendo com um espaço (a lib trata como vazio também).
    // A tag toda é removida (o adapter já tem fallback pra descrição
    // ausente); restrito a essas tags de valor, nunca contêineres, pra
    // não mexer em tags estruturais como <STATUS>/<BANKACCTFROM>, que
    // também ficam "sozinhas na linha" mas por terem filhos aninhados.
    .replace(/^<(?:MEMO|NAME)>[ \t]*\n/gm, '')
    .trim();
}

module.exports = { sanitizeOfxText };
