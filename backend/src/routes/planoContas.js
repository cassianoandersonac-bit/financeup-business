// src/routes/planoContas.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const requireAuth = require('../middleware/auth');
const requireTenant = require('../middleware/tenant');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

const TIPOS_VALIDOS = ['RECEITA', 'DESPESA', 'TRANSFERENCIA'];

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

// Sobe a cadeia de contaPaiId a partir de `partidaId`; true se `alvoId`
// aparecer no caminho (ou seja, vincular partidaId como pai de alvoId
// criaria um ciclo).
async function criariaCiclo(partidaId, alvoId) {
  let atualId = partidaId;
  while (atualId) {
    if (atualId === alvoId) return true;
    const atual = await prisma.planoConta.findUnique({ where: { id: atualId }, select: { contaPaiId: true } });
    atualId = atual?.contaPaiId || null;
  }
  return false;
}

// ── GET / — lista plana, ordenada por código ────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const contas = await prisma.planoConta.findMany({
      where: { empresaId: req.empresa.id },
      orderBy: { codigo: 'asc' },
    });
    res.json(contas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── POST / — cria conta do plano ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { codigo, descricao, tipo, contaPaiId } = req.body;

    if (!codigo || !descricao || !tipo) {
      return res.status(400).json({ erro: 'codigo, descricao e tipo são obrigatórios' });
    }
    if (!TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ erro: `tipo deve ser um de: ${TIPOS_VALIDOS.join(', ')}` });
    }

    if (contaPaiId) {
      const pai = await prisma.planoConta.findFirst({ where: { id: contaPaiId, empresaId: req.empresa.id } });
      if (!pai) return res.status(400).json({ erro: 'Conta pai não pertence a esta empresa' });
    }

    const duplicado = await prisma.planoConta.findUnique({
      where: { empresaId_codigo: { empresaId: req.empresa.id, codigo } },
    });
    if (duplicado) return res.status(409).json({ erro: 'Já existe uma conta com este código nesta empresa' });

    const conta = await prisma.planoConta.create({
      data: { empresaId: req.empresa.id, codigo, descricao, tipo, contaPaiId: contaPaiId || null },
    });
    res.status(201).json(conta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── PUT /:id — edita conta do plano ──────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const existente = await prisma.planoConta.findFirst({
      where: { id: req.params.id, empresaId: req.empresa.id },
    });
    if (!existente) return res.status(404).json({ erro: 'Conta não encontrada' });

    const { codigo, descricao, tipo, contaPaiId } = req.body;
    const data = {};

    if (descricao !== undefined) data.descricao = descricao;

    if (tipo !== undefined) {
      if (!TIPOS_VALIDOS.includes(tipo)) return res.status(400).json({ erro: `tipo deve ser um de: ${TIPOS_VALIDOS.join(', ')}` });
      data.tipo = tipo;
    }

    if (codigo !== undefined && codigo !== existente.codigo) {
      const duplicado = await prisma.planoConta.findUnique({
        where: { empresaId_codigo: { empresaId: req.empresa.id, codigo } },
      });
      if (duplicado) return res.status(409).json({ erro: 'Já existe uma conta com este código nesta empresa' });
      data.codigo = codigo;
    }

    if (contaPaiId !== undefined) {
      const novoPaiId = contaPaiId || null;
      if (novoPaiId) {
        if (novoPaiId === existente.id) {
          return res.status(400).json({ erro: 'Uma conta não pode ser pai dela mesma' });
        }
        const pai = await prisma.planoConta.findFirst({ where: { id: novoPaiId, empresaId: req.empresa.id } });
        if (!pai) return res.status(400).json({ erro: 'Conta pai não pertence a esta empresa' });
        if (await criariaCiclo(novoPaiId, existente.id)) {
          return res.status(400).json({ erro: 'Essa alteração criaria um ciclo na hierarquia' });
        }
      }
      data.contaPaiId = novoPaiId;
    }

    const conta = await prisma.planoConta.update({ where: { id: existente.id }, data });
    res.json(conta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── PATCH /:id/status — ativa ou inativa a conta ─────────────────────────────
router.patch('/:id/status', async (req, res) => {
  try {
    const { ativo } = req.body;
    if (typeof ativo !== 'boolean') return res.status(400).json({ erro: 'Campo ativo (boolean) é obrigatório' });

    const existente = await prisma.planoConta.findFirst({
      where: { id: req.params.id, empresaId: req.empresa.id },
    });
    if (!existente) return res.status(404).json({ erro: 'Conta não encontrada' });

    const conta = await prisma.planoConta.update({ where: { id: existente.id }, data: { ativo } });
    res.json(conta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

module.exports = router;
