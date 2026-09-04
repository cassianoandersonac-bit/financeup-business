// src/routes/empresas.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const requireAuth   = require('../middleware/auth');
const requireTenant = require('../middleware/tenant');
const { isValidCnpj, limparCnpj } = require('../lib/cnpj');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(requireAuth, requireTenant);

// ── GET / — lista empresas da organização ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const empresas = await prisma.empresa.findMany({
      where: { organizacaoId: req.organizacaoId },
      orderBy: { nome: 'asc' }
    });
    res.json(empresas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── GET /:empresaId — detalhe de uma empresa ────────────────────────────────
router.get('/:empresaId', async (req, res) => {
  try {
    const empresa = await prisma.empresa.findFirst({
      where: { id: req.params.empresaId, organizacaoId: req.organizacaoId },
      include: { filiais: true, contasBancarias: true }
    });
    if (!empresa) return res.status(404).json({ erro: 'Empresa não encontrada' });
    res.json(empresa);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── POST / — cria empresa ────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { nome, nomeFantasia, cnpj, cidade, estado } = req.body;

    if (!nome || !cnpj)
      return res.status(400).json({ erro: 'nome e cnpj são obrigatórios' });

    if (!isValidCnpj(cnpj))
      return res.status(400).json({ erro: 'CNPJ inválido' });

    const cnpjLimpo = limparCnpj(cnpj);

    const duplicado = await prisma.empresa.findUnique({
      where: { organizacaoId_cnpj: { organizacaoId: req.organizacaoId, cnpj: cnpjLimpo } }
    });
    if (duplicado)
      return res.status(409).json({ erro: 'Já existe uma empresa com este CNPJ nesta organização' });

    const empresa = await prisma.empresa.create({
      data: {
        organizacaoId: req.organizacaoId,
        nome,
        nomeFantasia: nomeFantasia || null,
        cnpj: cnpjLimpo,
        cidade: cidade || null,
        estado: estado || null
      }
    });
    res.status(201).json(empresa);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── PUT /:empresaId — edita dados básicos ────────────────────────────────────
router.put('/:empresaId', async (req, res) => {
  try {
    const existente = await prisma.empresa.findFirst({
      where: { id: req.params.empresaId, organizacaoId: req.organizacaoId }
    });
    if (!existente) return res.status(404).json({ erro: 'Empresa não encontrada' });

    const { nome, nomeFantasia, cnpj, cidade, estado } = req.body;
    const data = {};

    if (nome !== undefined) data.nome = nome;
    if (nomeFantasia !== undefined) data.nomeFantasia = nomeFantasia || null;
    if (cidade !== undefined) data.cidade = cidade || null;
    if (estado !== undefined) data.estado = estado || null;

    if (cnpj !== undefined) {
      if (!isValidCnpj(cnpj))
        return res.status(400).json({ erro: 'CNPJ inválido' });

      const cnpjLimpo = limparCnpj(cnpj);
      const duplicado = await prisma.empresa.findFirst({
        where: { organizacaoId: req.organizacaoId, cnpj: cnpjLimpo, NOT: { id: existente.id } }
      });
      if (duplicado)
        return res.status(409).json({ erro: 'Já existe uma empresa com este CNPJ nesta organização' });

      data.cnpj = cnpjLimpo;
    }

    const empresa = await prisma.empresa.update({ where: { id: existente.id }, data });
    res.json(empresa);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── PATCH /:empresaId/status — ativa ou inativa a empresa ───────────────────
router.patch('/:empresaId/status', async (req, res) => {
  try {
    const { ativa } = req.body;
    if (typeof ativa !== 'boolean')
      return res.status(400).json({ erro: 'Campo ativa (boolean) é obrigatório' });

    const existente = await prisma.empresa.findFirst({
      where: { id: req.params.empresaId, organizacaoId: req.organizacaoId }
    });
    if (!existente) return res.status(404).json({ erro: 'Empresa não encontrada' });

    const empresa = await prisma.empresa.update({ where: { id: existente.id }, data: { ativa } });
    res.json(empresa);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

module.exports = router;
