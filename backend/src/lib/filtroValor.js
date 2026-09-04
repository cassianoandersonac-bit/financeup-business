// src/lib/filtroValor.js
// "valor" na busca de Transações: sem separador decimal vira faixa (a
// largura da faixa depende de quantos zeros à direita o número digitado
// tem — "2000" [3 zeros] busca 2000-2999, "2500" [2 zeros] busca
// 2500-2599, "25" [0 zeros] fica praticamente exato, com centavos
// livres); com separador decimal (`.` ou `,`) vira busca exata.
//
// `valor` é armazenado com sinal (negativo = despesa). Essa busca é
// por módulo — quem quer distinguir direção usa o filtro de `tipo`
// separado — por isso o resultado sempre cobre a faixa espelhada
// positiva e negativa.

function construirFiltroPrismaValor(textoOriginal) {
  const texto = String(textoOriginal || '').trim();
  if (!texto) return null;

  const temDecimal = /[.,]/.test(texto);

  if (temDecimal) {
    const exato = Number(texto.replace(',', '.'));
    if (Number.isNaN(exato)) return null;
    if (exato === 0) return { valor: 0 };
    return { OR: [{ valor: exato }, { valor: -exato }] };
  }

  const inteiro = Number(texto);
  if (Number.isNaN(inteiro) || !Number.isInteger(inteiro)) return null;

  const digitos = String(Math.abs(inteiro));
  let zerosDireita = 0;
  for (let i = digitos.length - 1; i > 0 && digitos[i] === '0'; i--) zerosDireita++;
  const largura = digitos === '0' ? 1 : 10 ** zerosDireita;

  const min = Math.abs(inteiro);
  const max = min + largura; // exclusivo

  return {
    OR: [
      { valor: { gte: min, lt: max } },
      { valor: { gt: -max, lte: -min } },
    ],
  };
}

module.exports = { construirFiltroPrismaValor };
