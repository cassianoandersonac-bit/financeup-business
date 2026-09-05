// src/routes/relatorios.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const requireAuth = require('../middleware/auth');
const requireTenant = require('../middleware/tenant');
const { buscarDre } = require('../services/relatorios/dre');
const { buscarFluxoCaixa } = require('../services/relatorios/fluxoCaixa');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

const GRANULARIDADES_VALIDAS = ['dia', 'semana', 'mes'];

router.use(requireAuth, requireTenant);

async function carregarEmpresa(req, res, next) {
  const empresa = await prisma.empresa.findFirst({
    where: { id: req.params.empresaId, organizacaoId: req.organizacaoId },
  });
  if (!empresa) return res.status(404).json({ erro: 'Empresa não encontrada' });
  req.empresa = empresa;
  next();
}

router.use(carregarEmpresa);

function formatarDataISO(data) {
  return data.toISOString().slice(0, 10);
}

function inicioDoMes(data) {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1));
}

// ── GET /dre — período livre ──────────────────────────────────────────────
router.get('/dre', async (req, res) => {
  try {
    const { dataInicial, dataFinal } = req.query;
    const dre = await buscarDre({ empresaIds: [req.empresa.id], dataInicial, dataFinal }, prisma);
    res.json(dre);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── GET /fluxo-caixa — período livre + granularidade ──────────────────────
router.get('/fluxo-caixa', async (req, res) => {
  try {
    const { dataInicial, dataFinal, granularidade = 'dia' } = req.query;
    if (!GRANULARIDADES_VALIDAS.includes(granularidade)) {
      return res.status(400).json({ erro: `granularidade deve ser um de: ${GRANULARIDADES_VALIDAS.join(', ')}` });
    }
    const fluxo = await buscarFluxoCaixa(
      { empresaIds: [req.empresa.id], dataInicial, dataFinal, granularidade },
      prisma
    );
    res.json(fluxo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── GET /dashboard — os 6 widgets, sem período customizado ────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const empresaIds = [req.empresa.id];
    const hoje = new Date();
    const inicioMesAtual = inicioDoMes(hoje);
    const inicioMesAnterior = new Date(Date.UTC(inicioMesAtual.getUTCFullYear(), inicioMesAtual.getUTCMonth() - 1, 1));
    const inicioFluxo = new Date(Date.UTC(inicioMesAtual.getUTCFullYear(), inicioMesAtual.getUTCMonth() - 5, 1));

    const [contasAtivas, dreMesAtual, dreMesAnterior, fluxoCaixa, duplicatasPendentes, semClassificacao] =
      await Promise.all([
        prisma.contaBancaria.findMany({ where: { empresaId: { in: empresaIds }, ativa: true }, select: { saldoAtual: true } }),
        buscarDre({ empresaIds, dataInicial: formatarDataISO(inicioMesAtual) }, prisma),
        buscarDre({
          empresaIds,
          dataInicial: formatarDataISO(inicioMesAnterior),
          dataFinal: formatarDataISO(new Date(inicioMesAtual.getTime() - 1)),
        }, prisma),
        buscarFluxoCaixa({ empresaIds, dataInicial: formatarDataISO(inicioFluxo), granularidade: 'mes' }, prisma),
        prisma.transacao.count({ where: { empresaId: { in: empresaIds }, statusDuplicata: 'PROVAVEL_DUPLICATA' } }),
        prisma.transacao.count({
          where: { empresaId: { in: empresaIds }, statusDuplicata: 'UNICA', planoContaId: null },
        }),
      ]);

    const saldoConsolidado = contasAtivas.reduce((acc, c) => acc + Number(c.saldoAtual), 0);

    const topCategorias = dreMesAtual.contas
      .filter((c) => c.totalProprio !== 0)
      .sort((a, b) => Math.abs(b.totalProprio) - Math.abs(a.totalProprio))
      .slice(0, 5)
      .map((c) => ({ id: c.id, codigo: c.codigo, descricao: c.descricao, total: c.totalProprio }));

    res.json({
      saldoConsolidado,
      mesAtual: { receitas: dreMesAtual.totalReceitas, despesas: dreMesAtual.totalDespesas, resultado: dreMesAtual.resultado },
      mesAnterior: { receitas: dreMesAnterior.totalReceitas, despesas: dreMesAnterior.totalDespesas, resultado: dreMesAnterior.resultado },
      fluxoCaixa: fluxoCaixa.baldes,
      duplicatasPendentes,
      semClassificacao,
      topCategorias,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

module.exports = router;
