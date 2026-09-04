// src/lib/cnpj.js
// Validação de CNPJ pelo algoritmo padrão da Receita (dígitos verificadores),
// não só formato/máscara.

function limpar(cnpj) {
  return String(cnpj || '').replace(/\D/g, '');
}

function calcularDigito(base) {
  const pesos = base.length === 12
    ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const soma = base
    .split('')
    .reduce((acc, digito, i) => acc + Number(digito) * pesos[i], 0);

  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function isValidCnpj(cnpj) {
  const digits = limpar(cnpj);

  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false; // todos os dígitos iguais

  const base = digits.slice(0, 12);
  const dv1 = calcularDigito(base);
  const dv2 = calcularDigito(base + dv1);

  return digits === base + String(dv1) + String(dv2);
}

module.exports = { isValidCnpj, limparCnpj: limpar };
