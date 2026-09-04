// src/index.js
const express = require('express');
const cors    = require('cors');

const authRoutes           = require('./routes/auth');
const empresasRoutes       = require('./routes/empresas');
const filiaisRoutes        = require('./routes/filiais');
const contasBancariasRoutes = require('./routes/contasBancarias');
const importacoesRoutes    = require('./routes/importacoes');
const transacoesRoutes     = require('./routes/transacoes');

const app = express();

// ── Middlewares ────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));

// ── Rotas da API ─────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/organizacoes/:organizacaoId/empresas', empresasRoutes);
app.use('/organizacoes/:organizacaoId/empresas/:empresaId/filiais', filiaisRoutes);
app.use('/organizacoes/:organizacaoId/empresas/:empresaId/contas-bancarias', contasBancariasRoutes);
app.use(
  '/organizacoes/:organizacaoId/empresas/:empresaId/contas-bancarias/:contaId/importacoes',
  importacoesRoutes
);
app.use('/organizacoes/:organizacaoId/empresas/:empresaId/transacoes', transacoesRoutes);
app.get('/health', (_, res) => res.json({ ok: true }));

// ── Inicia ───────────────────────────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => console.log(`🚀  FinanceUp Business API rodando na porta ${PORT}`));
}

module.exports = app;
