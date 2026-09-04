-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('ADMIN', 'EDITOR', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "TipoConexaoConta" AS ENUM ('MANUAL', 'AUTOMATICA');

-- CreateEnum
CREATE TYPE "TipoContaBancaria" AS ENUM ('CORRENTE', 'POUPANCA', 'CARTAO_CREDITO', 'INVESTIMENTO');

-- CreateEnum
CREATE TYPE "TipoTransacao" AS ENUM ('RECEITA', 'DESPESA', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "StatusDuplicata" AS ENUM ('UNICA', 'PROVAVEL_DUPLICATA', 'CONFIRMADA_DUPLICATA', 'IGNORADA');

-- CreateEnum
CREATE TYPE "StatusPlano" AS ENUM ('TRIAL', 'ATIVO', 'INATIVO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusImportacao" AS ENUM ('PROCESSANDO', 'CONCLUIDO', 'FALHOU_PARCIAL');

-- CreateTable
CREATE TABLE "organizacoes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "planoAtual" TEXT,
    "statusPlano" "StatusPlano" NOT NULL DEFAULT 'TRIAL',
    "trialFimEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_organizacoes" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "papel" "PapelUsuario" NOT NULL DEFAULT 'EDITOR',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_organizacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "cidade" TEXT,
    "estado" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filiais" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "filiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_bancarias" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "filialId" TEXT,
    "nomeConta" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "agencia" TEXT,
    "numeroConta" TEXT,
    "tipo" "TipoContaBancaria" NOT NULL DEFAULT 'CORRENTE',
    "tipoConexao" "TipoConexaoConta" NOT NULL DEFAULT 'MANUAL',
    "saldoInicial" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "saldoAtual" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plano_contas" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "contaPaiId" TEXT,
    "tipo" "TipoTransacao" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "plano_contas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importacoes_extrato" (
    "id" TEXT NOT NULL,
    "contaBancariaId" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "status" "StatusImportacao" NOT NULL DEFAULT 'PROCESSANDO',
    "conteudoBruto" TEXT,
    "totalLidas" INTEGER NOT NULL DEFAULT 0,
    "totalImportadas" INTEGER NOT NULL DEFAULT 0,
    "totalDuplicadas" INTEGER NOT NULL DEFAULT 0,
    "importadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "importacoes_extrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacoes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "filialId" TEXT,
    "contaBancariaId" TEXT NOT NULL,
    "importacaoId" TEXT,
    "planoContaId" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "tipo" "TipoTransacao" NOT NULL,
    "fitidOfx" TEXT,
    "hashDedup" TEXT,
    "statusDuplicata" "StatusDuplicata" NOT NULL DEFAULT 'UNICA',
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_organizacoes_usuarioId_organizacaoId_key" ON "usuarios_organizacoes"("usuarioId", "organizacaoId");

-- CreateIndex
CREATE INDEX "empresas_organizacaoId_idx" ON "empresas"("organizacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_organizacaoId_cnpj_key" ON "empresas"("organizacaoId", "cnpj");

-- CreateIndex
CREATE INDEX "filiais_empresaId_idx" ON "filiais"("empresaId");

-- CreateIndex
CREATE INDEX "contas_bancarias_empresaId_idx" ON "contas_bancarias"("empresaId");

-- CreateIndex
CREATE INDEX "plano_contas_empresaId_idx" ON "plano_contas"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "plano_contas_empresaId_codigo_key" ON "plano_contas"("empresaId", "codigo");

-- CreateIndex
CREATE INDEX "importacoes_extrato_contaBancariaId_idx" ON "importacoes_extrato"("contaBancariaId");

-- CreateIndex
CREATE INDEX "transacoes_empresaId_data_idx" ON "transacoes"("empresaId", "data");

-- CreateIndex
CREATE INDEX "transacoes_contaBancariaId_hashDedup_idx" ON "transacoes"("contaBancariaId", "hashDedup");

-- CreateIndex
CREATE UNIQUE INDEX "transacoes_contaBancariaId_fitidOfx_key" ON "transacoes"("contaBancariaId", "fitidOfx");

-- AddForeignKey
ALTER TABLE "usuarios_organizacoes" ADD CONSTRAINT "usuarios_organizacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_organizacoes" ADD CONSTRAINT "usuarios_organizacoes_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "organizacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "organizacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filiais" ADD CONSTRAINT "filiais_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_bancarias" ADD CONSTRAINT "contas_bancarias_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_bancarias" ADD CONSTRAINT "contas_bancarias_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_contas" ADD CONSTRAINT "plano_contas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_contas" ADD CONSTRAINT "plano_contas_contaPaiId_fkey" FOREIGN KEY ("contaPaiId") REFERENCES "plano_contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacoes_extrato" ADD CONSTRAINT "importacoes_extrato_contaBancariaId_fkey" FOREIGN KEY ("contaBancariaId") REFERENCES "contas_bancarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_contaBancariaId_fkey" FOREIGN KEY ("contaBancariaId") REFERENCES "contas_bancarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_importacaoId_fkey" FOREIGN KEY ("importacaoId") REFERENCES "importacoes_extrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_planoContaId_fkey" FOREIGN KEY ("planoContaId") REFERENCES "plano_contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
