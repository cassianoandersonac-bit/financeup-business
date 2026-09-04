// src/services/ofx/detectEncoding.js
// Não confia no header CHARSET/ENCODING do OFX — bancos brasileiros
// costumam declarar um encoding e mandar outro. Tenta UTF-8 estrito
// primeiro; se a sequência de bytes for inválida em UTF-8, decodifica
// como ISO-8859-1 (latin1), que aceita qualquer byte.

function decodeBuffer(buffer) {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return decoder.decode(buffer);
  } catch {
    return buffer.toString('latin1');
  }
}

module.exports = { decodeBuffer };
