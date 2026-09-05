"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FluxoCaixaChart } from "./FluxoCaixaChart";

type DashboardResposta = {
  saldoConsolidado: number;
  mesAtual: { receitas: number; despesas: number; resultado: number };
  mesAnterior: { receitas: number; despesas: number; resultado: number };
  fluxoCaixa: { periodo: string; entradas: number; saidas: number; saldoAcumulado: number }[];
  duplicatasPendentes: number;
  semClassificacao: number;
  topCategorias: { id: string; codigo: string; descricao: string; total: number }[];
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function DashboardPage() {
  const params = useParams<{ id: string }>();
  const empresaId = params.id;
  const router = useRouter();
  const { token, organizacaoAtual } = useAuth();
  const orgId = organizacaoAtual?.id;

  const [dados, setDados] = useState<DashboardResposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca dados da API ao montar
    setCarregando(true);
    setErro(null);
    api
      .get<DashboardResposta>(`/organizacoes/${orgId}/empresas/${empresaId}/relatorios/dashboard`, token)
      .then(setDados)
      .catch((err) => setErro(err instanceof ApiError ? err.message : "Erro ao carregar dashboard"))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, empresaId]);

  if (carregando) return <p className="text-sm text-zinc-500">Carregando…</p>;
  if (erro) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>;
  if (!dados) return null;

  const variacaoResultado = dados.mesAnterior.resultado !== 0
    ? ((dados.mesAtual.resultado - dados.mesAnterior.resultado) / Math.abs(dados.mesAnterior.resultado)) * 100
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/empresas" className="text-sm text-zinc-500 underline">
            ← Empresas
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-zinc-900">Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/empresas/${empresaId}/relatorios/dre`} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100">
            DRE
          </Link>
          <Link href={`/empresas/${empresaId}/relatorios/fluxo-caixa`} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100">
            Fluxo de Caixa
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-4 ring-1 ring-zinc-200">
          <p className="text-xs font-medium uppercase text-zinc-500">Saldo consolidado</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{formatarMoeda(dados.saldoConsolidado)}</p>
        </div>

        <div className="rounded-lg bg-white p-4 ring-1 ring-zinc-200">
          <p className="text-xs font-medium uppercase text-zinc-500">Resultado — mês atual</p>
          <p className={`mt-1 text-2xl font-semibold ${dados.mesAtual.resultado < 0 ? "text-red-700" : "text-green-700"}`}>
            {formatarMoeda(dados.mesAtual.resultado)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Mês anterior: {formatarMoeda(dados.mesAnterior.resultado)}
            {variacaoResultado !== null && ` (${variacaoResultado >= 0 ? "+" : ""}${variacaoResultado.toFixed(0)}%)`}
          </p>
        </div>

        <div className="rounded-lg bg-white p-4 ring-1 ring-zinc-200">
          <p className="text-xs font-medium uppercase text-zinc-500">Receitas × Despesas (mês atual)</p>
          <p className="mt-1 text-sm text-green-700">Receitas: {formatarMoeda(dados.mesAtual.receitas)}</p>
          <p className="text-sm text-red-700">Despesas: {formatarMoeda(dados.mesAtual.despesas)}</p>
        </div>

        <button
          onClick={() => router.push(`/empresas/${empresaId}/transacoes?statusDuplicata=PROVAVEL_DUPLICATA`)}
          className="rounded-lg bg-white p-4 text-left ring-1 ring-zinc-200 hover:ring-zinc-400"
        >
          <p className="text-xs font-medium uppercase text-zinc-500">Duplicatas pendentes</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{dados.duplicatasPendentes}</p>
          <p className="mt-1 text-xs text-zinc-500 underline">Ver transações →</p>
        </button>

        <button
          onClick={() => router.push(`/empresas/${empresaId}/transacoes?planoContaId=nenhum`)}
          className="rounded-lg bg-white p-4 text-left ring-1 ring-zinc-200 hover:ring-zinc-400"
        >
          <p className="text-xs font-medium uppercase text-zinc-500">Sem classificação</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-700">{dados.semClassificacao}</p>
          <p className="mt-1 text-xs text-zinc-500 underline">Ver transações →</p>
        </button>

        <div className="rounded-lg bg-white p-4 ring-1 ring-zinc-200">
          <p className="text-xs font-medium uppercase text-zinc-500">Top categorias (mês atual)</p>
          {dados.topCategorias.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-400">Sem movimentação classificada.</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-sm">
              {dados.topCategorias.map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span className="truncate text-zinc-700">{c.codigo} · {c.descricao}</span>
                  <span className={c.total < 0 ? "text-red-700" : "text-green-700"}>{formatarMoeda(c.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 ring-1 ring-zinc-200">
        <p className="mb-2 text-xs font-medium uppercase text-zinc-500">Saldo acumulado — últimos meses</p>
        <FluxoCaixaChart dados={dados.fluxoCaixa} />
      </div>
    </div>
  );
}
