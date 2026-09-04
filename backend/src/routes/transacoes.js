// src/routes/transacoes.js
const express = require('express');
const { PrismaClient, Prisma } = require('@prisma/client');
const requireAuth = require('../middleware/auth');
const requireTenant = require('../middleware/tenant');
const { construirFiltroPrismaValor } = require('../lib/filtroValor');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

const CAMPOS_ORDENACAO = ['data', 'valor', 'descricao', 'criadoEm'];
const TIPOS_VALIDOS = ['RECEITA', 'DESPESA', 'TRANSFERENCIA'];
const STATUS_DUPLICATA_VALIDOS = ['UNICA', 'PROVAVEL_DUPLICATA', 'CONFIRMADA_DUPLICATA', 'IGNORADA'];
const TAMANHO_PAGINA_PADRAO = 50;
const TAMANHO_PAGINA_MAXIMO = 200;

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

// ── GET / — listagem com filtros, ordenação e paginação ──────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      descricao,
      valor,
      tipo,
      contaBancariaId,
      planoContaId,
      dataInicial,
      dataFinal,
      statusDuplicata,
      ordenarPor = 'data',
      direcao = 'desc',
      pagina = '1',
      tamanhoPagina = String(TAMANHO_PAGINA_PADRAO),
    } = req.query;

    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ erro: `tipo deve ser um de: ${TIPOS_VALIDOS.join(', ')}` });
    }
    if (statusDuplicata && !STATUS_DUPLICATA_VALIDOS.includes(statusDuplicata)) {
      return res.status(400).json({ erro: `statusDuplicata deve ser um de: ${STATUS_DUPLICATA_VALIDOS.join(', ')}` });
    }
    if (!CAMPOS_ORDENACAO.includes(ordenarPor)) {
      return res.status(400).json({ erro: `ordenarPor deve ser um de: ${CAMPOS_ORDENACAO.join(', ')}` });
    }
    if (!['asc', 'desc'].includes(direcao)) {
      return res.status(400).json({ erro: 'direcao deve ser "asc" ou "desc"' });
    }

    const where = { empresaId: req.empresa.id };

    if (descricao) where.descricao = { contains: descricao, mode: 'insensitive' };
    if (tipo) where.tipo = tipo;
    if (contaBancariaId) where.contaBancariaId = contaBancariaId;
    if (planoContaId) where.planoContaId = planoContaId;

    // sem filtro explícito de status, esconde as "arquivadas"
    // (CONFIRMADA_DUPLICATA/IGNORADA) da listagem padrão
    where.statusDuplicata = statusDuplicata || { notIn: ['CONFIRMADA_DUPLICATA', 'IGNORADA'] };

    if (valor) {
      const filtroValor = construirFiltroPrismaValor(valor);
      if (filtroValor) Object.assign(where, filtroValor);
    }

    if (dataInicial || dataFinal) {
      where.data = {};
      if (dataInicial) where.data.gte = new Date(`${dataInicial}T00:00:00.000Z`);
      if (dataFinal) {
        const fim = new Date(`${dataFinal}T00:00:00.000Z`);
        fim.setUTCDate(fim.getUTCDate() + 1);
        where.data.lt = fim;
      }
    }

    const tamanho = Math.min(Math.max(parseInt(tamanhoPagina, 10) || TAMANHO_PAGINA_PADRAO, 1), TAMANHO_PAGINA_MAXIMO);
    const paginaAtual = Math.max(parseInt(pagina, 10) || 1, 1);

    const [itens, total] = await Promise.all([
      prisma.transacao.findMany({
        where,
        orderBy: { [ordenarPor]: direcao },
        skip: (paginaAtual - 1) * tamanho,
        take: tamanho,
        include: { contaBancaria: { select: { nomeConta: true, banco: true } } },
      }),
      prisma.transacao.count({ where }),
    ]);

    res.json({ itens, total, pagina: paginaAtual, tamanhoPagina: tamanho });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── PATCH /:id — edita conciliado e/ou classificação (planoContaId) ──────────
router.patch('/:id', async (req, res) => {
  try {
    const existente = await prisma.transacao.findFirst({
      where: { id: req.params.id, empresaId: req.empresa.id },
    });
    if (!existente) return res.status(404).json({ erro: 'Transação não encontrada' });

    const { conciliado, planoContaId } = req.body;
    const data = {};

    if (conciliado !== undefined) {
      if (typeof conciliado !== 'boolean') return res.status(400).json({ erro: 'conciliado deve ser boolean' });
      data.conciliado = conciliado;
    }

    if (planoContaId !== undefined) {
      if (planoContaId) {
        const planoConta = await prisma.planoConta.findFirst({ where: { id: planoContaId, empresaId: req.empresa.id } });
        if (!planoConta) return res.status(400).json({ erro: 'Classificação (planoContaId) não pertence a esta empresa' });
      }
      data.planoContaId = planoContaId || null;
    }

    const transacao = await prisma.transacao.update({ where: { id: existente.id }, data });
    res.json(transacao);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── PATCH /:id/resolver-duplicata — só a partir de PROVAVEL_DUPLICATA ────────
router.patch('/:id/resolver-duplicata', async (req, res) => {
  try {
    const { resultado } = req.body;
    if (!['CONFIRMAR', 'MARCAR_UNICA'].includes(resultado)) {
      return res.status(400).json({ erro: 'resultado deve ser "CONFIRMAR" ou "MARCAR_UNICA"' });
    }

    const existente = await prisma.transacao.findFirst({
      where: { id: req.params.id, empresaId: req.empresa.id },
    });
    if (!existente) return res.status(404).json({ erro: 'Transação não encontrada' });
    if (existente.statusDuplicata !== 'PROVAVEL_DUPLICATA') {
      return res.status(400).json({ erro: 'Só é possível resolver transações com status PROVAVEL_DUPLICATA' });
    }

    if (resultado === 'CONFIRMAR') {
      // já não entrava no saldo como PROVAVEL_DUPLICATA — só arquiva
      const transacao = await prisma.transacao.update({
        where: { id: existente.id },
        data: { statusDuplicata: 'CONFIRMADA_DUPLICATA' },
      });
      return res.json(transacao);
    }

    // MARCAR_UNICA: agora entra no saldo, que nunca a contou até aqui
    const [transacao] = await prisma.$transaction([
      prisma.transacao.update({ where: { id: existente.id }, data: { statusDuplicata: 'UNICA' } }),
      prisma.contaBancaria.update({
        where: { id: existente.contaBancariaId },
        data: { saldoAtual: { increment: new Prisma.Decimal(existente.valor) } },
      }),
    ]);
    res.json(transacao);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

module.exports = router;
