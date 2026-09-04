// src/routes/importacoes.js
const express = require('express');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const requireAuth = require('../middleware/auth');
const requireTenant = require('../middleware/tenant');
const { decodeBuffer } = require('../services/ofx/detectEncoding');
const { importarExtrato, ArquivoOfxGrandeDemaisError } = require('../services/importarExtrato');
const { OfxInvalidoError } = require('../services/ofx/ofxAdapter');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

const TAMANHO_MAXIMO_ARQUIVO = 10 * 1024 * 1024; // 10MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: TAMANHO_MAXIMO_ARQUIVO } });

router.use(requireAuth, requireTenant);

async function carregarConta(req, res, next) {
  const conta = await prisma.contaBancaria.findFirst({
    where: {
      id: req.params.contaId,
      empresa: { id: req.params.empresaId, organizacaoId: req.organizacaoId },
    },
  });
  if (!conta) return res.status(404).json({ erro: 'Conta bancária não encontrada' });
  req.conta = conta;
  next();
}

router.use(carregarConta);

// ── GET / — histórico de importações da conta ───────────────────────────────
router.get('/', async (req, res) => {
  try {
    const importacoes = await prisma.importacaoExtrato.findMany({
      where: { contaBancariaId: req.conta.id },
      orderBy: { importadoEm: 'desc' },
      select: {
        id: true,
        nomeArquivo: true,
        status: true,
        totalLidas: true,
        totalImportadas: true,
        totalDuplicadas: true,
        importadoEm: true,
      },
    });
    res.json(importacoes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── POST / — importa um arquivo OFX/QFX ──────────────────────────────────────
router.post('/', (req, res) => {
  upload.single('arquivo')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ erro: 'Arquivo maior que o limite de 10MB' });
      }
      return res.status(400).json({ erro: 'Falha no upload do arquivo' });
    }
    if (err) {
      console.error(err);
      return res.status(500).json({ erro: 'Erro interno no servidor' });
    }

    if (!req.file) return res.status(400).json({ erro: 'Envie o arquivo no campo "arquivo"' });

    try {
      const textoDecodificado = decodeBuffer(req.file.buffer);
      const resultado = await importarExtrato({
        contaBancariaId: req.conta.id,
        empresaId: req.conta.empresaId,
        filialId: req.conta.filialId,
        nomeArquivo: req.file.originalname,
        textoDecodificado,
      });
      res.status(201).json(resultado);
    } catch (importErr) {
      if (importErr instanceof ArquivoOfxGrandeDemaisError) {
        return res.status(400).json({ erro: importErr.message });
      }
      if (importErr instanceof OfxInvalidoError) {
        return res.status(400).json({ erro: importErr.message });
      }
      console.error(importErr);
      res.status(500).json({ erro: 'Erro ao processar o arquivo de extrato' });
    }
  });
});

module.exports = router;
