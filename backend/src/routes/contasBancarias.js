// src/routes/contasBancarias.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const requireAuth   = require('../middleware/auth');
const requireTenant = require('../middleware/tenant');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

const TIPOS_VALIDOS = ['CORRENTE', 'POUPANCA', 'CARTAO_CREDITO', 'INVESTIMENTO'];

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

// ── GET / — lista contas bancárias da empresa ───────────────────────────────
router.get('/', async (req, res) => {
  try {
    const contas = await prisma.contaBancaria.findMany({
      where: { empresaId: req.empresa.id },
      orderBy: { nomeConta: 'asc' }
    });
    res.json(contas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── POST / — cria conta bancária ─────────────────────────────────────────────
// tipoConexao é sempre MANUAL nesta fase — não expor outra opção na interface,
// mesmo que o campo exista no schema (reservado para Open Finance futuro).
router.post('/', async (req, res) => {
  try {
    const { nomeConta, banco, agencia, numeroConta, tipo, filialId, saldoInicial } = req.body;

    if (!nomeConta || !banco)
      return res.status(400).json({ erro: 'nomeConta e banco são obrigatórios' });

    if (tipo && !TIPOS_VALIDOS.includes(tipo))
      return res.status(400).json({ erro: `tipo deve ser um de: ${TIPOS_VALIDOS.join(', ')}` });

    if (filialId) {
      const filial = await prisma.filial.findFirst({ where: { id: filialId, empresaId: req.empresa.id } });
      if (!filial) return res.status(400).json({ erro: 'Filial não pertence a esta empresa' });
    }

    const saldo = saldoInicial !== undefined ? Number(saldoInicial) : 0;
    if (Number.isNaN(saldo))
      return res.status(400).json({ erro: 'saldoInicial inválido' });

    const conta = await prisma.contaBancaria.create({
      data: {
        empresaId: req.empresa.id,
        filialId: filialId || null,
        nomeConta,
        banco,
        agencia: agencia || null,
        numeroConta: numeroConta || null,
        tipo: tipo || 'CORRENTE',
        tipoConexao: 'MANUAL',
        saldoInicial: saldo,
        saldoAtual: saldo
      }
    });
    res.status(201).json(conta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── PUT /:contaId — edita conta bancária ─────────────────────────────────────
router.put('/:contaId', async (req, res) => {
  try {
    const existente = await prisma.contaBancaria.findFirst({
      where: { id: req.params.contaId, empresaId: req.empresa.id }
    });
    if (!existente) return res.status(404).json({ erro: 'Conta bancária não encontrada' });

    const { nomeConta, banco, agencia, numeroConta, tipo, filialId } = req.body;
    const data = {};

    if (nomeConta !== undefined) data.nomeConta = nomeConta;
    if (banco !== undefined) data.banco = banco;
    if (agencia !== undefined) data.agencia = agencia || null;
    if (numeroConta !== undefined) data.numeroConta = numeroConta || null;

    if (tipo !== undefined) {
      if (!TIPOS_VALIDOS.includes(tipo))
        return res.status(400).json({ erro: `tipo deve ser um de: ${TIPOS_VALIDOS.join(', ')}` });
      data.tipo = tipo;
    }

    if (filialId !== undefined) {
      if (filialId) {
        const filial = await prisma.filial.findFirst({ where: { id: filialId, empresaId: req.empresa.id } });
        if (!filial) return res.status(400).json({ erro: 'Filial não pertence a esta empresa' });
      }
      data.filialId = filialId || null;
    }

    const conta = await prisma.contaBancaria.update({ where: { id: existente.id }, data });
    res.json(conta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── PATCH /:contaId/status — ativa ou inativa a conta ────────────────────────
router.patch('/:contaId/status', async (req, res) => {
  try {
    const { ativa } = req.body;
    if (typeof ativa !== 'boolean')
      return res.status(400).json({ erro: 'Campo ativa (boolean) é obrigatório' });

    const existente = await prisma.contaBancaria.findFirst({
      where: { id: req.params.contaId, empresaId: req.empresa.id }
    });
    if (!existente) return res.status(404).json({ erro: 'Conta bancária não encontrada' });

    const conta = await prisma.contaBancaria.update({ where: { id: existente.id }, data: { ativa } });
    res.json(conta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

module.exports = router;
