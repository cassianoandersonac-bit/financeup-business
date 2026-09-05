"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { construirArvore, type NoArvore } from "@/lib/arvore";

type ContaDre = {
  id: string;
  codigo: string;
  descricao: string;
  tipo: "RECEITA" | "DESPESA" | "TRANSFERENCIA";
  contaPaiId: string | null;
  totalProprio: number;
  totalComFilhos: number;
};

type Dre = {
  contas: ContaDre[];
  naoClassificado: { tipo: string; total: number }[];
  totalReceitas: number;
  totalDespesas: number;
  totalTransferencias: number;
  resultado: number;
};

const TIPO_LABEL: Record<string, string> = { RECEITA: "Receita", DESPESA: "Despesa", TRANSFERENCIA: "Transferência" };

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function LinhaDre({ no, profundidade }: { no: NoArvore<ContaDre>; profundidade: number }) {
  if (no.totalComFilhos === 0 && no.filhos.every((f) => f.totalComFilhos === 0)) return null;
  return (
    <>
      <tr className="border-t border-zinc-100">
        <td className="px-3 py-2" style={{ paddingLeft: `${12 + profundidade * 20}px` }}>
          {no.codigo} · {no.descricao}
        </td>
        <td className={`px-3 py-2 text-right ${no.totalComFilhos < 0 ? "text-red-700" : "text-green-700"}`}>
          {formatarMoeda(no.totalComFilhos)}
        </td>
      </tr>
      {no.filhos.map((filho) => (
        <LinhaDre key={filho.id} no={filho} profundidade={profundidade + 1} />
      ))}
    </>
  );
}

export default function DrePage() {
  const params = useParams<{ id: string }>();
  const empresaId = params.id;
  const { token, organizacaoAtual } = useAuth();
  const orgId = organizacaoAtual?.id;

  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [periodoAplicado, setPeriodoAplicado] = useState({ dataInicial: "", dataFinal: "" });

  const [dre, setDre] = useState<Dre | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca dados da API ao montar/mudar período
    setCarregando(true);
    setErro(null);
    const query = new URLSearchParams();
    if (periodoAplicado.dataInicial) query.set("dataInicial", periodoAplicado.dataInicial);
    if (periodoAplicado.dataFinal) query.set("dataFinal", periodoAplicado.dataFinal);
    api
      .get<Dre>(`/organizacoes/${orgId}/empresas/${empresaId}/relatorios/dre?${query.toString()}`, token)
      .then(setDre)
      .catch((err) => setErro(err instanceof ApiError ? err.message : "Erro ao carregar DRE"))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, empresaId, periodoAplicado]);

  function onFiltrar(e: React.FormEvent) {
    e.preventDefault();
    setPeriodoAplicado({ dataInicial, dataFinal });
  }

  const arvore = dre ? construirArvore(dre.contas) : [];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link href={`/empresas/${empresaId}/dashboard`} className="text-sm text-zinc-500 underline">
          ← Dashboard
        </Link>
      </div>

      <h1 className="text-lg font-semibold text-zinc-900">Resultado por Empresa (DRE)</h1>

      <form onSubmit={onFiltrar} className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 ring-1 ring-zinc-200">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-700">Data inicial</label>
          <input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-700">Data final</label>
          <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
          Gerar
        </button>
        <p className="text-xs text-zinc-400">Sem data = todo o histórico</p>
      </form>

      {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {carregando && <p className="text-sm text-zinc-500">Carregando…</p>}

      {dre && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-white p-3 text-center ring-1 ring-zinc-200">
              <p className="text-xs uppercase text-zinc-500">Receitas</p>
              <p className="text-lg font-semibold text-green-700">{formatarMoeda(dre.totalReceitas)}</p>
            </div>
            <div className="rounded-lg bg-white p-3 text-center ring-1 ring-zinc-200">
              <p className="text-xs uppercase text-zinc-500">Despesas</p>
              <p className="text-lg font-semibold text-red-700">{formatarMoeda(dre.totalDespesas)}</p>
            </div>
            <div className="rounded-lg bg-white p-3 text-center ring-1 ring-zinc-200">
              <p className="text-xs uppercase text-zinc-500">Resultado</p>
              <p className={`text-lg font-semibold ${dre.resultado < 0 ? "text-red-700" : "text-green-700"}`}>{formatarMoeda(dre.resultado)}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white ring-1 ring-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Conta</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {arvore.map((no) => (
                  <LinhaDre key={no.id} no={no} profundidade={0} />
                ))}
                {dre.naoClassificado.map((n) => (
                  <tr key={n.tipo} className="border-t border-zinc-100 italic text-zinc-500">
                    <td className="px-3 py-2">{TIPO_LABEL[n.tipo] || n.tipo} não classificada(s)</td>
                    <td className={`px-3 py-2 text-right ${n.total < 0 ? "text-red-700" : "text-green-700"}`}>{formatarMoeda(n.total)}</td>
                  </tr>
                ))}
                {arvore.length === 0 && dre.naoClassificado.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-3 py-6 text-center text-zinc-400">Nenhuma movimentação no período.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {dre.totalTransferencias !== 0 && (
            <p className="text-xs text-zinc-400">
              Transferências no período: {formatarMoeda(dre.totalTransferencias)} (não entram no resultado).
            </p>
          )}
        </>
      )}
    </div>
  );
}
