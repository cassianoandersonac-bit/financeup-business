"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FluxoCaixaChart } from "./FluxoCaixaChart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ValorMonetario } from "@/components/valor-monetario";

type DashboardResposta = {
  saldoConsolidado: number;
  mesAtual: { receitas: number; despesas: number; resultado: number };
  mesAnterior: { receitas: number; despesas: number; resultado: number };
  fluxoCaixa: { periodo: string; entradas: number; saidas: number; saldoAcumulado: number }[];
  duplicatasPendentes: number;
  semClassificacao: number;
  topCategorias: { id: string; codigo: string; descricao: string; total: number }[];
};

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

  if (carregando) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (erro) return <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>;
  if (!dados) return null;

  const variacaoResultado = dados.mesAnterior.resultado !== 0
    ? ((dados.mesAtual.resultado - dados.mesAnterior.resultado) / Math.abs(dados.mesAnterior.resultado)) * 100
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/empresas" className="text-sm text-muted-foreground underline">
            ← Empresas
          </Link>
          <h1 className="mt-1 text-lg font-semibold">Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/empresas/${empresaId}/relatorios/dre`} />}>
            DRE
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/empresas/${empresaId}/relatorios/fluxo-caixa`} />}>
            Fluxo de Caixa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="px-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Saldo consolidado</p>
          <p className="mt-1 text-2xl font-semibold"><ValorMonetario valor={dados.saldoConsolidado} /></p>
        </Card>

        <Card className="px-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Resultado — mês atual</p>
          <p className="mt-1 text-2xl font-semibold"><ValorMonetario valor={dados.mesAtual.resultado} /></p>
          <p className="mt-1 text-xs text-muted-foreground">
            Mês anterior: <ValorMonetario valor={dados.mesAnterior.resultado} className="text-xs" />
            {variacaoResultado !== null && ` (${variacaoResultado >= 0 ? "+" : ""}${variacaoResultado.toFixed(0)}%)`}
          </p>
        </Card>

        <Card className="px-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Receitas × Despesas (mês atual)</p>
          <p className="mt-1 text-sm">Receitas: <ValorMonetario valor={dados.mesAtual.receitas} cor="positivo" className="text-sm" /></p>
          <p className="text-sm">Despesas: <ValorMonetario valor={dados.mesAtual.despesas} cor="negativo" className="text-sm" /></p>
        </Card>

        <button
          onClick={() => router.push(`/empresas/${empresaId}/transacoes?statusDuplicata=PROVAVEL_DUPLICATA`)}
          className="text-left"
        >
          <Card className="px-4 hover:ring-2 hover:ring-ring/50">
            <p className="text-xs font-medium uppercase text-muted-foreground">Duplicatas pendentes</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-500">{dados.duplicatasPendentes}</p>
            <p className="mt-1 text-xs text-muted-foreground underline">Ver transações →</p>
          </Card>
        </button>

        <button
          onClick={() => router.push(`/empresas/${empresaId}/transacoes?planoContaId=nenhum`)}
          className="text-left"
        >
          <Card className="px-4 hover:ring-2 hover:ring-ring/50">
            <p className="text-xs font-medium uppercase text-muted-foreground">Sem classificação</p>
            <p className="mt-1 text-2xl font-semibold">{dados.semClassificacao}</p>
            <p className="mt-1 text-xs text-muted-foreground underline">Ver transações →</p>
          </Card>
        </button>

        <Card className="px-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Top categorias (mês atual)</p>
          {dados.topCategorias.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Sem movimentação classificada.</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-sm">
              {dados.topCategorias.map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span className="truncate">{c.codigo} · {c.descricao}</span>
                  <ValorMonetario valor={c.total} className="text-sm" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="px-4">
        <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Saldo acumulado — últimos meses</p>
        <FluxoCaixaChart dados={dados.fluxoCaixa} />
      </Card>
    </div>
  );
}
