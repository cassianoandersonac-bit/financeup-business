"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ValorMonetario } from "@/components/valor-monetario";

type ContaResumo = { id: string; nomeConta: string; banco: string };
type PlanoContaResumo = { id: string; codigo: string; descricao: string };

type Transacao = {
  id: string;
  data: string;
  descricao: string;
  valor: string;
  tipo: "RECEITA" | "DESPESA" | "TRANSFERENCIA";
  statusDuplicata: "UNICA" | "PROVAVEL_DUPLICATA" | "CONFIRMADA_DUPLICATA" | "IGNORADA";
  conciliado: boolean;
  contaBancariaId: string;
  contaBancaria: { nomeConta: string; banco: string };
  planoContaId: string | null;
  planoConta: { id: string; codigo: string; descricao: string } | null;
};

type RespostaListagem = { itens: Transacao[]; total: number; pagina: number; tamanhoPagina: number };

const FILTROS_INICIAIS = {
  descricao: "",
  valor: "",
  tipo: "",
  contaBancariaId: "",
  dataInicial: "",
  dataFinal: "",
  statusDuplicata: "",
  planoContaId: "",
  ordenarPor: "data",
  direcao: "desc",
};

const STATUS_DUPLICATA_LABEL: Record<Transacao["statusDuplicata"], string> = {
  UNICA: "Única",
  PROVAVEL_DUPLICATA: "Provável duplicata",
  CONFIRMADA_DUPLICATA: "Duplicata confirmada",
  IGNORADA: "Ignorada",
};

const SEM_CLASSIFICACAO = "__sem_classificacao__";
const TODAS = "__todas__";

const ITENS_TIPO = {
  [TODAS]: "Todos",
  RECEITA: "Receita",
  DESPESA: "Despesa",
  TRANSFERENCIA: "Transferência",
};

const ITENS_STATUS_DUPLICATA = {
  [TODAS]: "Únicas e prováveis (padrão)",
  UNICA: "Única",
  PROVAVEL_DUPLICATA: "Provável duplicata",
  CONFIRMADA_DUPLICATA: "Duplicata confirmada",
  IGNORADA: "Ignorada",
};

const ITENS_ORDENAR_POR = {
  data: "Data",
  valor: "Valor",
  descricao: "Descrição",
  criadoEm: "Importação",
};

const ITENS_DIRECAO = { desc: "↓", asc: "↑" };

function construirQuery(f: typeof FILTROS_INICIAIS, pagina: number) {
  const params = new URLSearchParams();
  Object.entries(f).forEach(([chave, valor]) => {
    if (valor) params.set(chave, valor);
  });
  params.set("pagina", String(pagina));
  return params.toString();
}

export default function TransacoesPage() {
  return (
    <Suspense>
      <TransacoesPageInterna />
    </Suspense>
  );
}

function filtrosIniciaisComQuery(searchParams: URLSearchParams) {
  const filtros = { ...FILTROS_INICIAIS };
  (Object.keys(filtros) as (keyof typeof FILTROS_INICIAIS)[]).forEach((chave) => {
    const valor = searchParams.get(chave);
    if (valor) filtros[chave] = valor;
  });
  return filtros;
}

function TransacoesPageInterna() {
  const params = useParams<{ id: string }>();
  const empresaId = params.id;
  const searchParams = useSearchParams();
  const { token, organizacaoAtual } = useAuth();
  const orgId = organizacaoAtual?.id;

  const [contas, setContas] = useState<ContaResumo[]>([]);
  const [planoContas, setPlanoContas] = useState<PlanoContaResumo[]>([]);
  const [filtrosForm, setFiltrosForm] = useState(() => filtrosIniciaisComQuery(searchParams));
  const [filtrosAplicados, setFiltrosAplicados] = useState(() => filtrosIniciaisComQuery(searchParams));
  const [pagina, setPagina] = useState(1);

  const [resposta, setResposta] = useState<RespostaListagem | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    if (!orgId) return;
    setCarregando(true);
    setErro(null);
    try {
      const query = construirQuery(filtrosAplicados, pagina);
      const dados = await api.get<RespostaListagem>(
        `/organizacoes/${orgId}/empresas/${empresaId}/transacoes?${query}`,
        token
      );
      setResposta(dados);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao carregar transações");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca dados da API ao montar/mudar filtros ou página
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, empresaId, filtrosAplicados, pagina]);

  useEffect(() => {
    if (!orgId) return;
    api
      .get<ContaResumo[]>(`/organizacoes/${orgId}/empresas/${empresaId}/contas-bancarias`, token)
      .then(setContas)
      .catch(() => {});
    api
      .get<PlanoContaResumo[]>(`/organizacoes/${orgId}/empresas/${empresaId}/plano-contas`, token)
      .then(setPlanoContas)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, empresaId]);

  async function onClassificar(transacao: Transacao, planoContaId: string) {
    if (!orgId) return;
    await api.patch(
      `/organizacoes/${orgId}/empresas/${empresaId}/transacoes/${transacao.id}`,
      { planoContaId: planoContaId || null },
      token
    );
    await carregar();
  }

  function onSubmitFiltros(e: React.FormEvent) {
    e.preventDefault();
    setFiltrosAplicados(filtrosForm);
    setPagina(1);
  }

  function onLimparFiltros() {
    setFiltrosForm(FILTROS_INICIAIS);
    setFiltrosAplicados(FILTROS_INICIAIS);
    setPagina(1);
  }

  function atualizarFiltro<K extends keyof typeof FILTROS_INICIAIS>(campo: K, valor: string) {
    setFiltrosForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function onConciliar(transacao: Transacao) {
    if (!orgId) return;
    await api.patch(
      `/organizacoes/${orgId}/empresas/${empresaId}/transacoes/${transacao.id}`,
      { conciliado: !transacao.conciliado },
      token
    );
    await carregar();
  }

  async function onResolverDuplicata(transacao: Transacao, resultado: "CONFIRMAR" | "MARCAR_UNICA") {
    if (!orgId) return;
    await api.patch(
      `/organizacoes/${orgId}/empresas/${empresaId}/transacoes/${transacao.id}/resolver-duplicata`,
      { resultado },
      token
    );
    await carregar();
  }

  const totalPaginas = resposta ? Math.max(1, Math.ceil(resposta.total / resposta.tamanhoPagina)) : 1;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <Link href="/empresas" className="text-sm text-muted-foreground underline">
          ← Empresas
        </Link>
      </div>

      <h1 className="text-lg font-semibold">Transações</h1>

      <Card className="px-4">
        <form onSubmit={onSubmitFiltros} className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Descrição</label>
              <Input value={filtrosForm.descricao} onChange={(e) => atualizarFiltro("descricao", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Valor</label>
              <Input
                value={filtrosForm.valor}
                onChange={(e) => atualizarFiltro("valor", e.target.value)}
                placeholder="2000 ou 2000.50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <Select
                items={ITENS_TIPO}
                value={filtrosForm.tipo || TODAS}
                onValueChange={(v) => atualizarFiltro("tipo", !v || v === TODAS ? "" : v)}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ITENS_TIPO).map(([valor, rotulo]) => (
                    <SelectItem key={valor} value={valor}>{rotulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Conta bancária</label>
              <Select
                items={{ [TODAS]: "Todas", ...Object.fromEntries(contas.map((c) => [c.id, c.nomeConta])) }}
                value={filtrosForm.contaBancariaId || TODAS}
                onValueChange={(v) => atualizarFiltro("contaBancariaId", !v || v === TODAS ? "" : v)}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas</SelectItem>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nomeConta}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Data inicial</label>
              <Input type="date" value={filtrosForm.dataInicial} onChange={(e) => atualizarFiltro("dataInicial", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Data final</label>
              <Input type="date" value={filtrosForm.dataFinal} onChange={(e) => atualizarFiltro("dataFinal", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status de duplicata</label>
              <Select
                items={ITENS_STATUS_DUPLICATA}
                value={filtrosForm.statusDuplicata || TODAS}
                onValueChange={(v) => atualizarFiltro("statusDuplicata", !v || v === TODAS ? "" : v)}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ITENS_STATUS_DUPLICATA).map(([valor, rotulo]) => (
                    <SelectItem key={valor} value={valor}>{rotulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Classificação</label>
              <Select
                items={{
                  [TODAS]: "Todas",
                  [SEM_CLASSIFICACAO]: "Sem classificação",
                  ...Object.fromEntries(planoContas.map((p) => [p.id, `${p.codigo} · ${p.descricao}`])),
                }}
                value={filtrosForm.planoContaId || TODAS}
                onValueChange={(v) => atualizarFiltro("planoContaId", !v || v === TODAS ? "" : v === SEM_CLASSIFICACAO ? "nenhum" : v)}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas</SelectItem>
                  <SelectItem value={SEM_CLASSIFICACAO}>Sem classificação</SelectItem>
                  {planoContas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.codigo} · {p.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ordenar por</label>
              <div className="flex gap-1">
                <Select items={ITENS_ORDENAR_POR} value={filtrosForm.ordenarPor} onValueChange={(v) => v && atualizarFiltro("ordenarPor", v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ITENS_ORDENAR_POR).map(([valor, rotulo]) => (
                      <SelectItem key={valor} value={valor}>{rotulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select items={ITENS_DIRECAO} value={filtrosForm.direcao} onValueChange={(v) => v && atualizarFiltro("direcao", v)}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ITENS_DIRECAO).map(([valor, rotulo]) => (
                      <SelectItem key={valor} value={valor}>{rotulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Filtrar</Button>
            <Button type="button" variant="outline" onClick={onLimparFiltros}>Limpar</Button>
          </div>
        </form>
      </Card>

      {erro && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}
      {carregando && <p className="text-sm text-muted-foreground">Carregando…</p>}

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Classificação</TableHead>
              <TableHead>Duplicata</TableHead>
              <TableHead>Conciliado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(resposta?.itens || []).map((t) => (
              <TableRow key={t.id}>
                <TableCell>{new Date(t.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</TableCell>
                <TableCell className="whitespace-normal">{t.descricao}</TableCell>
                <TableCell>{t.contaBancaria.nomeConta}</TableCell>
                <TableCell>{t.tipo}</TableCell>
                <TableCell className="text-right"><ValorMonetario valor={t.valor} /></TableCell>
                <TableCell>
                  <Select
                    items={{
                      [SEM_CLASSIFICACAO]: "Sem classificação",
                      ...Object.fromEntries(planoContas.map((p) => [p.id, `${p.codigo} · ${p.descricao}`])),
                    }}
                    value={t.planoContaId || SEM_CLASSIFICACAO}
                    onValueChange={(v) => onClassificar(t, !v || v === SEM_CLASSIFICACAO ? "" : v)}
                  >
                    <SelectTrigger size="sm" className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SEM_CLASSIFICACAO}>Sem classificação</SelectItem>
                      {planoContas.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.codigo} · {p.descricao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {t.statusDuplicata !== "UNICA" && (
                    <Badge variant={t.statusDuplicata === "PROVAVEL_DUPLICATA" ? "outline" : "secondary"}>
                      {STATUS_DUPLICATA_LABEL[t.statusDuplicata]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <input
                    type="checkbox"
                    checked={t.conciliado}
                    onChange={() => onConciliar(t)}
                    className="accent-primary"
                  />
                </TableCell>
                <TableCell className="text-right">
                  {t.statusDuplicata === "PROVAVEL_DUPLICATA" && (
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="xs" onClick={() => onResolverDuplicata(t, "CONFIRMAR")}>
                        Confirmar duplicata
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => onResolverDuplicata(t, "MARCAR_UNICA")}>
                        Marcar como única
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!carregando && (resposta?.itens || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">Nenhuma transação encontrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {resposta && resposta.total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {resposta.total} transaç{resposta.total === 1 ? "ão" : "ões"} · página {resposta.pagina} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
