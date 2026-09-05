// src/lib/periodo.js
// Filtro de intervalo de data (YYYY-MM-DD) compartilhado entre rotas e
// relatórios — fim é inclusivo o dia todo (soma 1 dia e usa `lt`).
function construirFiltroData(dataInicial, dataFinal) {
  const filtro = {};
  if (dataInicial) filtro.gte = new Date(`${dataInicial}T00:00:00.000Z`);
  if (dataFinal) {
    const fim = new Date(`${dataFinal}T00:00:00.000Z`);
    fim.setUTCDate(fim.getUTCDate() + 1);
    filtro.lt = fim;
  }
  return filtro;
}

module.exports = { construirFiltroData };
