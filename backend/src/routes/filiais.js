// src/routes/filiais.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const requireAuth   = require('../middleware/auth');
const requireTenant = require('../middleware/tenant');
const { isValidCnpj, limparCnpj } = require('../lib/cnpj');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(requireAuth, requireTenant);

async function carregarEmpresa(req, res, next) {
  const empresa = await prisma.empresa.findFirst({
    where: { id: req.params.empresaId, organizacaoId: req.organizacaoId }
  });
  if (!empresa) return res.status(404).json({ erro: 'Empresa não encontrada' });
  req.empresa = empresa;
  next();
}

router.use(carregarEmpresa);

// ── GET / — lista filiais da empresa ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const filiais = await prisma.filial.findMany({
      where: { empresaId: req.empresa.id },
      orderBy: { nome: 'asc' }
    });
    res.json(filiais);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── POST / — cria filial ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { nome, cnpj, cidade, estado } = req.body;
    if (!nome) return res.status(400).json({ erro: 'nome é obrigatório' });

    if (cnpj && !isValidCnpj(cnpj))
      return res.status(400).json({ erro: 'CNPJ inválido' });

    const filial = await prisma.filial.create({
      data: {
        empresaId: req.empresa.id,
        nome,
        cnpj: cnpj ? limparCnpj(cnpj) : null,
        cidade: cidade || null,
        estado: estado || null
      }
    });
    res.status(201).json(filial);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── PUT /:filialId — edita filial ────────────────────────────────────────────
router.put('/:filialId', async (req, res) => {
  try {
    const existente = await prisma.filial.findFirst({
      where: { id: req.params.filialId, empresaId: req.empresa.id }
    });
    if (!existente) return res.status(404).json({ erro: 'Filial não encontrada' });

    const { nome, cnpj, cidade, estado } = req.body;
    const data = {};

    if (nome !== undefined) data.nome = nome;
    if (cidade !== undefined) data.cidade = cidade || null;
    if (estado !== undefined) data.estado = estado || null;
    if (cnpj !== undefined) {
      if (cnpj && !isValidCnpj(cnpj))
        return res.status(400).json({ erro: 'CNPJ inválido' });
      data.cnpj = cnpj ? limparCnpj(cnpj) : null;
    }

    const filial = await prisma.filial.update({ where: { id: existente.id }, data });
    res.json(filial);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── PATCH /:filialId/status — ativa ou inativa a filial ─────────────────────
router.patch('/:filialId/status', async (req, res) => {
  try {
    const { ativa } = req.body;
    if (typeof ativa !== 'boolean')
      return res.status(400).json({ erro: 'Campo ativa (boolean) é obrigatório' });

    const existente = await prisma.filial.findFirst({
      where: { id: req.params.filialId, empresaId: req.empresa.id }
    });
    if (!existente) return res.status(404).json({ erro: 'Filial não encontrada' });

    const filial = await prisma.filial.update({ where: { id: existente.id }, data: { ativa } });
    res.json(filial);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

module.exports = router;
