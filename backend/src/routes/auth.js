// src/routes/auth.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_EXPIRES = '30d';

// ── POST /auth/register ─────────────────────────────────────────────────────
// Cria a Organizacao, o Usuario (papel ADMIN) e o vínculo entre os dois.
router.post('/register', async (req, res) => {
  try {
    const { nomeOrganizacao, nome, email, senha } = req.body;

    if (!nomeOrganizacao || !nome || !email || !senha)
      return res.status(400).json({ erro: 'nomeOrganizacao, nome, email e senha são obrigatórios' });

    if (senha.length < 6)
      return res.status(400).json({ erro: 'Senha deve ter pelo menos 6 caracteres' });

    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe)
      return res.status(409).json({ erro: 'E-mail já cadastrado' });

    const senhaHash = await bcrypt.hash(senha, 10);

    const { usuario, organizacao } = await prisma.$transaction(async (tx) => {
      const organizacao = await tx.organizacao.create({ data: { nome: nomeOrganizacao } });
      const usuario = await tx.usuario.create({ data: { nome, email, senhaHash } });
      await tx.usuarioOrganizacao.create({
        data: { usuarioId: usuario.id, organizacaoId: organizacao.id, papel: 'ADMIN' }
      });
      return { usuario, organizacao };
    });

    const token = jwt.sign({ userId: usuario.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.status(201).json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      organizacoes: [{ id: organizacao.id, nome: organizacao.nome, papel: 'ADMIN' }]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ── POST /auth/login ─────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha)
      return res.status(400).json({ erro: 'email e senha são obrigatórios' });

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { organizacoes: { include: { organizacao: true } } }
    });

    if (!usuario || !usuario.ativo)
      return res.status(401).json({ erro: 'E-mail ou senha incorretos' });

    const ok = await bcrypt.compare(senha, usuario.senhaHash);
    if (!ok)
      return res.status(401).json({ erro: 'E-mail ou senha incorretos' });

    const token = jwt.sign({ userId: usuario.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      organizacoes: usuario.organizacoes.map((vinculo) => ({
        id: vinculo.organizacao.id,
        nome: vinculo.organizacao.nome,
        papel: vinculo.papel
      }))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

module.exports = router;
