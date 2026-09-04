# Prompt para Claude Code — FinanceUp Business

> Cole este arquivo inteiro como primeira mensagem no Claude Code (ou salve
> como `CLAUDE.md` na raiz do projeto antes de começar). Antes de começar a
> escrever código, o Claude Code deve confirmar com você as decisões
> marcadas com ⚠️ abaixo.

## Contexto

Vou construir um produto financeiro multiempresa chamado **FinanceUp
Business**. É a versão B2B do FinanceUp (app de finanças pessoais que já
tenho rodando — backend em Node/Express/Prisma/PostgreSQL, hospedado na
Vercel). Este é um projeto novo, mas pode reaproveitar padrões e decisões
técnicas do FinanceUp original.

O produto permite que uma organização cadastre múltiplas empresas, importe
extratos bancários manualmente (arquivo OFX/QFX), classifique as
transações e veja relatórios financeiros por empresa.

**Fora de escopo nesta fase — não implementar ainda:**
- Conexão bancária automática (Open Finance). O import é 100% manual via
  upload de arquivo.
- Cobrança/assinatura automatizada (Stripe ou similar). Pode existir um
  campo de plano na organização, mas sem checkout de verdade por enquanto.
- Qualquer IA/chat embutido no produto.

## ⚠️ Decisões que preciso confirmar antes de começar

1. **Stack**: usar Node.js + Express + Prisma + PostgreSQL (mesma stack do
   FinanceUp pessoal) ou outra? [assumindo a mesma por padrão]
2. **Repositório**: projeto novo do zero, ou parte do backend do FinanceUp
   atual (`financas-backend-eight`) só que com schema/rotas separadas?
3. **Frontend**: vai ter frontend nesta fase, ou só a API por enquanto
   (testando via Postman/Insomnia)?
4. **Nome final do produto**: "FinanceUp Business" é provisório — confirmar
   antes de espalhar o nome em variáveis de ambiente, pacotes etc.

## Schema de dados (ponto de partida)

Use o schema Prisma abaixo como base. Ele já reflete decisões discutidas:
multiempresa via `Organizacao` → `Empresa[]`, plano de contas hierárquico,
deduplicação de transação por `fitidOfx` com fallback por `hashDedup`, e
saldo inicial/atual separados na conta bancária.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum PapelUsuario {
  ADMIN
  EDITOR
  VISUALIZADOR
}

enum TipoConexaoConta {
  MANUAL
  AUTOMATICA // reservado para futura integração Open Finance
}

enum TipoContaBancaria {
  CORRENTE
  POUPANCA
  CARTAO_CREDITO
  INVESTIMENTO
}

enum TipoTransacao {
  RECEITA
  DESPESA
  TRANSFERENCIA
}

enum StatusDuplicata {
  UNICA
  PROVAVEL_DUPLICATA
  CONFIRMADA_DUPLICATA
  IGNORADA
}

enum StatusPlano {
  TRIAL
  ATIVO
  INATIVO
  CANCELADO
}

model Organizacao {
  id            String       @id @default(cuid())
  nome          String
  planoAtual    String?
  statusPlano   StatusPlano  @default(TRIAL)
  trialFimEm    DateTime?
  criadoEm      DateTime     @default(now())
  atualizadoEm  DateTime     @updatedAt

  usuarios      UsuarioOrganizacao[]
  empresas      Empresa[]

  @@map("organizacoes")
}

model Usuario {
  id           String   @id @default(cuid())
  nome         String
  email        String   @unique
  senhaHash    String
  ativo        Boolean  @default(true)
  criadoEm     DateTime @default(now())
  atualizadoEm DateTime @updatedAt

  organizacoes UsuarioOrganizacao[]

  @@map("usuarios")
}

model UsuarioOrganizacao {
  id             String       @id @default(cuid())
  usuarioId      String
  organizacaoId  String
  papel          PapelUsuario @default(EDITOR)
  criadoEm       DateTime     @default(now())

  usuario        Usuario      @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  organizacao    Organizacao  @relation(fields: [organizacaoId], references: [id], onDelete: Cascade)

  @@unique([usuarioId, organizacaoId])
  @@map("usuarios_organizacoes")
}

model Empresa {
  id             String   @id @default(cuid())
  organizacaoId  String
  nome           String
  nomeFantasia   String?
  cnpj           String
  cidade         String?
  estado         String?
  ativa          Boolean  @default(true)
  criadoEm       DateTime @default(now())
  atualizadoEm   DateTime @updatedAt

  organizacao    Organizacao @relation(fields: [organizacaoId], references: [id], onDelete: Cascade)
  filiais        Filial[]
  contasBancarias ContaBancaria[]
  planoContas    PlanoConta[]
  transacoes     Transacao[]

  @@unique([organizacaoId, cnpj])
  @@index([organizacaoId])
  @@map("empresas")
}

model Filial {
  id           String   @id @default(cuid())
  empresaId    String
  nome         String
  cnpj         String?
  cidade       String?
  estado       String?
  ativa        Boolean  @default(true)
  criadoEm     DateTime @default(now())

  empresa      Empresa  @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  contasBancarias ContaBancaria[]
  transacoes   Transacao[]

  @@index([empresaId])
  @@map("filiais")
}

model ContaBancaria {
  id             String            @id @default(cuid())
  empresaId      String
  filialId       String?
  nomeConta      String
  banco          String
  agencia        String?
  numeroConta    String?
  tipo           TipoContaBancaria @default(CORRENTE)
  tipoConexao    TipoConexaoConta  @default(MANUAL)
  saldoInicial   Decimal           @default(0) @db.Decimal(14, 2)
  saldoAtual     Decimal           @default(0) @db.Decimal(14, 2)
  ativa          Boolean           @default(true)
  criadoEm       DateTime          @default(now())
  atualizadoEm   DateTime          @updatedAt

  empresa        Empresa           @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  filial         Filial?           @relation(fields: [filialId], references: [id])
  transacoes     Transacao[]
  importacoes    ImportacaoExtrato[]

  @@index([empresaId])
  @@map("contas_bancarias")
}

model PlanoConta {
  id           String       @id @default(cuid())
  empresaId    String
  codigo       String
  descricao    String
  contaPaiId   String?
  tipo         TipoTransacao
  ativo        Boolean      @default(true)

  empresa      Empresa      @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  contaPai     PlanoConta?  @relation("PlanoContaHierarquia", fields: [contaPaiId], references: [id])
  subcontas    PlanoConta[] @relation("PlanoContaHierarquia")
  transacoes   Transacao[]

  @@unique([empresaId, codigo])
  @@index([empresaId])
  @@map("plano_contas")
}

model ImportacaoExtrato {
  id              String   @id @default(cuid())
  contaBancariaId String
  nomeArquivo     String
  totalLidas      Int      @default(0)
  totalImportadas Int      @default(0)
  totalDuplicadas Int      @default(0)
  importadoEm     DateTime @default(now())

  contaBancaria   ContaBancaria @relation(fields: [contaBancariaId], references: [id], onDelete: Cascade)
  transacoes      Transacao[]

  @@index([contaBancariaId])
  @@map("importacoes_extrato")
}

model Transacao {
  id                String          @id @default(cuid())
  empresaId         String
  filialId          String?
  contaBancariaId   String
  importacaoId      String?
  planoContaId      String?

  data              DateTime
  descricao         String
  valor             Decimal         @db.Decimal(14, 2)
  tipo              TipoTransacao

  fitidOfx          String?
  hashDedup         String?

  statusDuplicata   StatusDuplicata @default(UNICA)
  conciliado        Boolean         @default(false)

  criadoEm          DateTime        @default(now())
  atualizadoEm      DateTime        @updatedAt

  empresa           Empresa           @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  filial            Filial?           @relation(fields: [filialId], references: [id])
  contaBancaria     ContaBancaria     @relation(fields: [contaBancariaId], references: [id], onDelete: Cascade)
  importacao        ImportacaoExtrato? @relation(fields: [importacaoId], references: [id])
  planoConta        PlanoConta?       @relation(fields: [planoContaId], references: [id])

  @@unique([contaBancariaId, fitidOfx])
  @@index([empresaId, data])
  @@index([contaBancariaId, hashDedup])
  @@map("transacoes")
}
```

Pontos que o Claude Code deve manter ao implementar:
- `valor` e campos monetários sempre `Decimal`, nunca `Float`.
- `fitidOfx` é único por `contaBancariaId` (não globalmente) — dois bancos
  diferentes podem gerar o mesmo FITID por coincidência.
- CNPJ deve ser validado por dígito verificador no cadastro de Empresa e
  Filial, não só mascarado visualmente.

## Fluxos principais (nesta ordem de prioridade)

### 1. Empresas e Filiais (CRUD básico)
- Criar/editar/inativar empresa (nome, nome fantasia, CNPJ validado,
  cidade/estado).
- Empresa pode ter filiais vinculadas.
- Escopo por organização: usuário só vê empresas da própria organização.

### 2. Contas Bancárias (CRUD)
- Vinculada a uma empresa (e opcionalmente a uma filial).
- Campos: banco, agência, número, tipo (corrente/poupança/cartão),
  saldo inicial.
- `tipoConexao` sempre `MANUAL` nesta fase — não expor opção de conexão
  automática na interface ainda, mesmo que o campo exista no schema.

### 3. Importação de extrato (o núcleo do produto)
- Upload de arquivo `.ofx`/`.qfx` (limite ~10MB).
- Parser: usar uma lib madura de OFX (ex: `node-ofx-parser` ou
  equivalente) em vez de escrever parser do zero.
- Tratar variações reais de banco: encoding (UTF-8 vs ISO-8859-1),
  SGML malformado, formatos de data diferentes. Escrever testes com
  arquivos de exemplo de pelo menos 2-3 bancos diferentes antes de
  considerar essa etapa pronta.
- **Deduplicação**: ao importar, para cada transação lida:
  1. Se existe `fitidOfx` e já há uma transação com o mesmo
     `fitidOfx` + `contaBancariaId` → marcar como `CONFIRMADA_DUPLICATA`,
     não inserir de novo.
  2. Se não há `fitidOfx` confiável, calcular `hashDedup` (ex:
     hash de contaBancariaId + data + valor + descrição normalizada) e
     comparar contra transações existentes → se bater, marcar
     `PROVAVEL_DUPLICATA` (não descartar automaticamente — deixar o
     usuário decidir na tela de Transações).
- Cada upload gera um registro em `ImportacaoExtrato` com os totais
  (lidas / importadas / duplicadas).
- Atualizar `saldoAtual` da conta bancária após a importação.

### 4. Transações (tela de listagem)
- Filtros: empresa, descrição, valor (busca por faixa se não tiver
  decimal, exata se tiver — ex: "2000" busca 2000-2999, "2000.50" busca
  exato), tipo, classificação, conta bancária, data inicial/final,
  status de duplicata, ordenação.
- Ação de marcar/desmarcar conciliado.
- Ação de resolver duplicata (confirmar como duplicata real → arquivar,
  ou marcar como única de propósito).
- Vínculo opcional com `PlanoConta` (categorização).

### 5. Plano de Contas
- CRUD hierárquico (conta pai/filha) por empresa.
- Tipo (receita/despesa/transferência) por conta.

### 6. Relatórios (última etapa)
- **Resultado por Empresa**: agregação de transações por
  `planoContaId`/tipo, por período — é um DRE simplificado.
- **Fluxo de Caixa**: entradas/saídas por período, saldo projetado.
- **Dashboard**: resumo visual dos dois anteriores.

Nenhum desses três precisa de tabela própria — são queries agregadas
sobre `Transacao`. Só considerar cache/materialização se performance virar
problema real, não antes.

## Ordem de implementação sugerida

1. Setup do projeto (stack confirmada acima) + schema Prisma + migrations.
2. Auth básica (login, organização, usuário-organização).
3. CRUD de Empresa/Filial.
4. CRUD de Conta Bancária.
5. Parser de OFX + endpoint de importação + lógica de dedup.
6. Endpoint de Transações com filtros.
7. Plano de Contas.
8. Relatórios agregados.

Não pular para relatórios antes de import + transações estarem sólidos —
sem dado real importado, relatório é só maquete.

## Testes que não podem faltar

- Reimportar o mesmo arquivo OFX duas vezes → segunda vez não deve
  duplicar nenhuma transação.
- Importar extrato com transações que já existem parcialmente
  (período sobreposto) → só as novas devem entrar.
- CNPJ com dígito verificador inválido → deve ser rejeitado no cadastro.
