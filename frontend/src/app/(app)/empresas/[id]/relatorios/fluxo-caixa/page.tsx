"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Balde = { periodo: string; entradas: number; saidas: number; saldoAcumulado: number };
type FluxoCaixa = { saldoInicioPeriodo: number; baldes: Balde[] };

const FILTROS_INICIAIS = { dataInicial: "", dataFinal: "", granularidade: "dia" };

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FluxoCaixaPage() {
  const params = useParams<{ id: string }>();
  const empresaId = params.id;
  const { token, organizacaoAtual } = useAuth();
  const orgId = organizacaoAtual?.id;

  const [filtrosForm, setFiltrosForm] = useState(FILTROS_INICIAIS);
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_INICIAIS);

  const [fluxo, setFluxo] = useState<FluxoCaixa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca dados da API ao montar/mudar filtros
    setCarregando(true);
    setErro(null);
    const query = new URLSearchParams();
    Object.entries(filtrosAplicados).forEach(([chave, valor]) => {
      if (valor) query.set(chave, valor);
    });
    api
      .get<FluxoCaixa>(`/organizacoes/${orgId}/empresas/${empresaId}/relatorios/fluxo-caixa?${query.toString()}`, token)
      .then(setFluxo)
      .catch((err) => setErro(err instanceof ApiError ? err.message : "Erro ao carregar fluxo de caixa"))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, empresaId, filtrosAplicados]);

  function onFiltrar(e: React.FormEvent) {
    e.preventDefault();
    setFiltrosAplicados(filtrosForm);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link href={`/empresas/${empresaId}/dashboard`} className="text-sm text-zinc-500 underline">
          ← Dashboard
        </Link>
      </div>

      <h1 className="text-lg font-semibold text-zinc-900">Fluxo de Caixa</h1>
      <p className="text-xs text-zinc-400">
        Saldo acumulado = saldo inicial das contas + soma das transações até cada período. É histórico, não uma
        previsão de futuro.
      </p>

      <form onSubmit={onFiltrar} className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 ring-1 ring-zinc-200">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-700">Data inicial</label>
          <input
            type="date"
            value={filtrosForm.dataInicial}
            onChange={(e) => setFiltrosForm((f) => ({ ...f, dataInicial: e.target.value }))}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-700">Data final</label>
          <input
            type="date"
            value={filtrosForm.dataFinal}
            onChange={(e) => setFiltrosForm((f) => ({ ...f, dataFinal: e.target.value }))}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-700">Granularidade</label>
          <select
            value={filtrosForm.granularidade}
            onChange={(e) => setFiltrosForm((f) => ({ ...f, granularidade: e.target.value }))}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="dia">Dia</option>
            <option value="semana">Semana</option>
            <option value="mes">Mês</option>
          </select>
        </div>
        <button type="submit" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
          Gerar
        </button>
      </form>

      {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {carregando && <p className="text-sm text-zinc-500">Carregando…</p>}

      {fluxo && (
        <>
          <p className="text-sm text-zinc-500">
            Saldo no início do período: <span className="font-medium text-zinc-900">{formatarMoeda(fluxo.saldoInicioPeriodo)}</span>
          </p>
          <div className="overflow-hidden rounded-lg bg-white ring-1 ring-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Período</th>
                  <th className="px-3 py-2 text-right">Entradas</th>
                  <th className="px-3 py-2 text-right">Saídas</th>
                  <th className="px-3 py-2 text-right">Saldo acumulado</th>
                </tr>
              </thead>
              <tbody>
                {fluxo.baldes.map((b) => (
                  <tr key={b.periodo} className="border-t border-zinc-100">
                    <td className="px-3 py-2">{b.periodo}</td>
                    <td className="px-3 py-2 text-right text-green-700">{formatarMoeda(b.entradas)}</td>
                    <td className="px-3 py-2 text-right text-red-700">{formatarMoeda(b.saidas)}</td>
                    <td className={`px-3 py-2 text-right font-medium ${b.saldoAcumulado < 0 ? "text-red-700" : "text-zinc-900"}`}>
                      {formatarMoeda(b.saldoAcumulado)}
                    </td>
                  </tr>
                ))}
                {fluxo.baldes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-zinc-400">Nenhuma movimentação no período.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
