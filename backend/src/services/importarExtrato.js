// src/services/importarExtrato.js
// Função pura: recebe texto OFX decodificado + contaBancariaId, devolve
// o resumo do import. Não conhece HTTP — o endpoint (src/routes/
// importacoes.js) só chama isto e traduz o resultado/erro pra resposta.
const { PrismaClient, Prisma } = require('@prisma/client');
const { parseOfx } = require('./ofx/ofxAdapter');
const { calcularHashDedup } = require('../lib/hashDedup');

const prismaPadrao = new PrismaClient();

const LIMITE_TRANSACOES_POR_ARQUIVO = 5000;
const TAMANHO_CHUNK = 300;

class ArquivoOfxGrandeDemaisError extends Error {
  constructor(total) {
    super(`Arquivo tem ${total} transações, acima do limite de ${LIMITE_TRANSACOES_POR_ARQUIVO}`);
    this.name = 'ArquivoOfxGrandeDemaisError';
  }
}

function dividirEmChunks(lista, tamanho) {
  const chunks = [];
  for (let i = 0; i < lista.length; i += tamanho) chunks.push(lista.slice(i, i + tamanho));
  return chunks;
}

// Classifica cada transação candidata contra o que já existe no banco
// (fitidOfx/hashDedup daquela conta) e contra o que já apareceu antes,
// dentro do próprio arquivo — evita duplicar duas linhas idênticas do
// mesmo arquivo entre si, além de proteger contra reimportação.
function classificarCandidatas(candidatas, fitidsExistentes, hashesExistentes) {
  const fitidsVistos = new Set(fitidsExistentes);
  const hashesVistos = new Set(hashesExistentes);

  return candidatas.map((c) => {
    if (c.fitidOfx && fitidsVistos.has(c.fitidOfx)) {
      return { ...c, statusDuplicata: 'CONFIRMADA_DUPLICATA', inserir: false };
    }
    if (hashesVistos.has(c.hashDedup)) {
      if (c.fitidOfx) fitidsVistos.add(c.fitidOfx);
      return { ...c, statusDuplicata: 'PROVAVEL_DUPLICATA', inserir: true };
    }
    if (c.fitidOfx) fitidsVistos.add(c.fitidOfx);
    hashesVistos.add(c.hashDedup);
    return { ...c, statusDuplicata: 'UNICA', inserir: true };
  });
}

async function importarExtrato(
  { contaBancariaId, empresaId, filialId, nomeArquivo, textoDecodificado },
  prisma = prismaPadrao
) {
  const { transacoes: candidatasBrutas, avisos } = parseOfx(textoDecodificado);

  if (candidatasBrutas.length > LIMITE_TRANSACOES_POR_ARQUIVO) {
    throw new ArquivoOfxGrandeDemaisError(candidatasBrutas.length);
  }

  const candidatas = candidatasBrutas.map((c) => ({
    ...c,
    hashDedup: calcularHashDedup({
      contaBancariaId,
      data: c.data,
      valorTexto: c.valorTexto,
      descricao: c.descricao,
    }),
  }));

  const fitidsDoArquivo = candidatas.map((c) => c.fitidOfx).filter(Boolean);
  const hashesDoArquivo = candidatas.map((c) => c.hashDedup);

  const [existentesPorFitid, existentesPorHash] = await Promise.all([
    fitidsDoArquivo.length
      ? prisma.transacao.findMany({
          where: { contaBancariaId, fitidOfx: { in: fitidsDoArquivo } },
          select: { fitidOfx: true },
        })
      : [],
    prisma.transacao.findMany({
      where: { contaBancariaId, hashDedup: { in: hashesDoArquivo } },
      select: { hashDedup: true },
    }),
  ]);

  const classificadas = classificarCandidatas(
    candidatas,
    existentesPorFitid.map((t) => t.fitidOfx),
    existentesPorHash.map((t) => t.hashDedup)
  );

  const paraInserir = classificadas.filter((c) => c.inserir);
  const totalDuplicadas = classificadas.length - paraInserir.length;

  const importacao = await prisma.importacaoExtrato.create({
    data: {
      contaBancariaId,
      nomeArquivo,
      conteudoBruto: textoDecodificado,
      status: 'PROCESSANDO',
      totalLidas: candidatasBrutas.length,
    },
  });

  const chunks = dividirEmChunks(paraInserir, TAMANHO_CHUNK);
  let totalImportadas = 0;

  try {
    for (const chunk of chunks) {
      const deltaSaldo = chunk
        .filter((c) => c.statusDuplicata === 'UNICA')
        .reduce((acc, c) => acc.add(new Prisma.Decimal(c.valorTexto)), new Prisma.Decimal(0));

      await prisma.$transaction([
        prisma.transacao.createMany({
          data: chunk.map((c) => ({
            empresaId,
            filialId: filialId || null,
            contaBancariaId,
            importacaoId: importacao.id,
            data: c.data,
            descricao: c.descricao,
            valor: new Prisma.Decimal(c.valorTexto),
            tipo: c.tipo,
            fitidOfx: c.fitidOfx,
            hashDedup: c.hashDedup,
            statusDuplicata: c.statusDuplicata,
          })),
          skipDuplicates: true,
        }),
        prisma.contaBancaria.update({
          where: { id: contaBancariaId },
          data: { saldoAtual: { increment: deltaSaldo } },
        }),
      ]);

      totalImportadas += chunk.length;
    }

    const resultado = await prisma.importacaoExtrato.update({
      where: { id: importacao.id },
      data: { status: 'CONCLUIDO', totalImportadas, totalDuplicadas },
    });

    return { ...resultado, avisos };
  } catch (err) {
    await prisma.importacaoExtrato.update({
      where: { id: importacao.id },
      data: { status: 'FALHOU_PARCIAL', totalImportadas, totalDuplicadas },
    });
    throw err;
  }
}

module.exports = { importarExtrato, ArquivoOfxGrandeDemaisError, LIMITE_TRANSACOES_POR_ARQUIVO };
