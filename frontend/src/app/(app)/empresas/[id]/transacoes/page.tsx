"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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

  function formatarValor(valor: string) {
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  const totalPaginas = resposta ? Math.max(1, Math.ceil(resposta.total / resposta.tamanhoPagina)) : 1;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <Link href="/empresas" className="text-sm text-zinc-500 underline">
          ← Empresas
        </Link>
      </div>

      <h1 className="text-lg font-semibold text-zinc-900">Transações</h1>

      <form onSubmit={onSubmitFiltros} className="space-y-3 rounded-lg bg-white p-4 ring-1 ring-zinc-200">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Descrição</label>
            <input
              value={filtrosForm.descricao}
              onChange={(e) => atualizarFiltro("descricao", e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Valor</label>
            <input
              value={filtrosForm.valor}
              onChange={(e) => atualizarFiltro("valor", e.target.value)}
              placeholder="2000 ou 2000.50"
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Tipo</label>
            <select
              value={filtrosForm.tipo}
              onChange={(e) => atualizarFiltro("tipo", e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="">Todos</option>
              <option value="RECEITA">Receita</option>
              <option value="DESPESA">Despesa</option>
              <option value="TRANSFERENCIA">Transferência</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Conta bancária</label>
            <select
              value={filtrosForm.contaBancariaId}
              onChange={(e) => atualizarFiltro("contaBancariaId", e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="">Todas</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.nomeConta}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Data inicial</label>
            <input
              type="date"
              value={filtrosForm.dataInicial}
              onChange={(e) => atualizarFiltro("dataInicial", e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Data final</label>
            <input
              type="date"
              value={filtrosForm.dataFinal}
              onChange={(e) => atualizarFiltro("dataFinal", e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Status de duplicata</label>
            <select
              value={filtrosForm.statusDuplicata}
              onChange={(e) => atualizarFiltro("statusDuplicata", e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="">Únicas e prováveis (padrão)</option>
              <option value="UNICA">Única</option>
              <option value="PROVAVEL_DUPLICATA">Provável duplicata</option>
              <option value="CONFIRMADA_DUPLICATA">Duplicata confirmada</option>
              <option value="IGNORADA">Ignorada</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Classificação</label>
            <select
              value={filtrosForm.planoContaId}
              onChange={(e) => atualizarFiltro("planoContaId", e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="">Todas</option>
              <option value="nenhum">Sem classificação</option>
              {planoContas.map((p) => (
                <option key={p.id} value={p.id}>{p.codigo} · {p.descricao}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Ordenar por</label>
            <div className="flex gap-1">
              <select
                value={filtrosForm.ordenarPor}
                onChange={(e) => atualizarFiltro("ordenarPor", e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="data">Data</option>
                <option value="valor">Valor</option>
                <option value="descricao">Descrição</option>
                <option value="criadoEm">Importação</option>
              </select>
              <select
                value={filtrosForm.direcao}
                onChange={(e) => atualizarFiltro("direcao", e.target.value)}
                className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="desc">↓</option>
                <option value="asc">↑</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
            Filtrar
          </button>
          <button type="button" onClick={onLimparFiltros} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100">
            Limpar
          </button>
        </div>
      </form>

      {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {carregando && <p className="text-sm text-zinc-500">Carregando…</p>}

      <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Descrição</th>
              <th className="px-3 py-2">Conta</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Classificação</th>
              <th className="px-3 py-2">Duplicata</th>
              <th className="px-3 py-2">Conciliado</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(resposta?.itens || []).map((t) => (
              <tr key={t.id} className="border-t border-zinc-100">
                <td className="whitespace-nowrap px-3 py-2">{new Date(t.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
                <td className="px-3 py-2">{t.descricao}</td>
                <td className="whitespace-nowrap px-3 py-2">{t.contaBancaria.nomeConta}</td>
                <td className="px-3 py-2">{t.tipo}</td>
                <td className={`whitespace-nowrap px-3 py-2 ${Number(t.valor) < 0 ? "text-red-700" : "text-green-700"}`}>
                  {formatarValor(t.valor)}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <select
                    value={t.planoContaId || ""}
                    onChange={(e) => onClassificar(t, e.target.value)}
                    className="rounded-md border border-zinc-200 px-1.5 py-1 text-xs"
                  >
                    <option value="">Sem classificação</option>
                    {planoContas.map((p) => (
                      <option key={p.id} value={p.id}>{p.codigo} · {p.descricao}</option>
                    ))}
                  </select>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {t.statusDuplicata !== "UNICA" && (
                    <span
                      className={
                        t.statusDuplicata === "PROVAVEL_DUPLICATA"
                          ? "rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                          : "rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500"
                      }
                    >
                      {STATUS_DUPLICATA_LABEL[t.statusDuplicata]}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <input type="checkbox" checked={t.conciliado} onChange={() => onConciliar(t)} />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {t.statusDuplicata === "PROVAVEL_DUPLICATA" && (
                    <span className="space-x-2">
                      <button onClick={() => onResolverDuplicata(t, "CONFIRMAR")} className="text-xs text-zinc-500 underline">
                        Confirmar duplicata
                      </button>
                      <button onClick={() => onResolverDuplicata(t, "MARCAR_UNICA")} className="text-xs text-zinc-700 underline">
                        Marcar como única
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!carregando && (resposta?.itens || []).length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-zinc-400">Nenhuma transação encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {resposta && resposta.total > 0 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            {resposta.total} transaç{resposta.total === 1 ? "ão" : "ões"} · página {resposta.pagina} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
