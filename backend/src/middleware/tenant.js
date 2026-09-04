// src/middleware/tenant.js
// Garante que o usuário autenticado pertence à organização da URL antes de
// deixar qualquer rota de dados prosseguir. É o único ponto de isolamento
// multiempresa — nenhuma rota de dados deve pular esse middleware.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async function requireTenant(req, res, next) {
  const { organizacaoId } = req.params;

  try {
    const vinculo = await prisma.usuarioOrganizacao.findUnique({
      where: { usuarioId_organizacaoId: { usuarioId: req.userId, organizacaoId } }
    });

    if (!vinculo)
      return res.status(403).json({ erro: 'Sem acesso a esta organização' });

    req.organizacaoId = organizacaoId;
    req.papel = vinculo.papel;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
};
