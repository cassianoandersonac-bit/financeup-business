"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Filial = { id: string; nome: string };

type ContaBancaria = {
  id: string;
  nomeConta: string;
  banco: string;
  agencia: string | null;
  numeroConta: string | null;
  tipo: string;
  filialId: string | null;
  saldoInicial: string;
  saldoAtual: string;
  ativa: boolean;
};

const TIPOS = ["CORRENTE", "POUPANCA", "CARTAO_CREDITO", "INVESTIMENTO"] as const;

export default function ContasBancariasPage() {
  const params = useParams<{ id: string }>();
  const empresaId = params.id;
  const { token, organizacaoAtual } = useAuth();
  const orgId = organizacaoAtual?.id;

  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [nomeConta, setNomeConta] = useState("");
  const [banco, setBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [numeroConta, setNumeroConta] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("CORRENTE");
  const [filialId, setFilialId] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("0");
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  async function carregar() {
    if (!orgId) return;
    setCarregando(true);
    setErro(null);
    try {
      const [dadosContas, dadosFiliais] = await Promise.all([
        api.get<ContaBancaria[]>(`/organizacoes/${orgId}/empresas/${empresaId}/contas-bancarias`, token),
        api.get<Filial[]>(`/organizacoes/${orgId}/empresas/${empresaId}/filiais`, token),
      ]);
      setContas(dadosContas);
      setFiliais(dadosFiliais);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao carregar contas bancárias");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca dados da API (sistema externo) ao montar/trocar de empresa
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, empresaId]);

  async function onCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setErroForm(null);
    setSalvando(true);
    try {
      await api.post(`/organizacoes/${orgId}/empresas/${empresaId}/contas-bancarias`, {
        nomeConta,
        banco,
        agencia: agencia || undefined,
        numeroConta: numeroConta || undefined,
        tipo,
        filialId: filialId || undefined,
        saldoInicial: Number(saldoInicial.replace(",", ".")) || 0,
      }, token);
      setNomeConta("");
      setBanco("");
      setAgencia("");
      setNumeroConta("");
      setTipo("CORRENTE");
      setFilialId("");
      setSaldoInicial("0");
      setMostrarForm(false);
      await carregar();
    } catch (err) {
      setErroForm(err instanceof ApiError ? err.message : "Erro ao criar conta bancária");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatus(conta: ContaBancaria) {
    if (!orgId) return;
    await api.patch(
      `/organizacoes/${orgId}/empresas/${empresaId}/contas-bancarias/${conta.id}/status`,
      { ativa: !conta.ativa },
      token
    );
    await carregar();
  }

  function nomeFilial(filialId: string | null) {
    if (!filialId) return "—";
    return filiais.find((f) => f.id === filialId)?.nome || "—";
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link href="/empresas" className="text-sm text-zinc-500 underline">
          ← Empresas
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Contas bancárias</h1>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          {mostrarForm ? "Cancelar" : "Nova conta"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={onCriar} className="space-y-3 rounded-lg bg-white p-4 ring-1 ring-zinc-200">
          {erroForm && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erroForm}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Nome da conta *</label>
              <input required value={nomeConta} onChange={(e) => setNomeConta(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Banco *</label>
              <input required value={banco} onChange={(e) => setBanco(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Agência</label>
              <input value={agencia} onChange={(e) => setAgencia(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Número da conta</label>
              <input value={numeroConta} onChange={(e) => setNumeroConta(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as (typeof TIPOS)[number])} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
                {TIPOS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Filial (opcional)</label>
              <select value={filialId} onChange={(e) => setFilialId(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
                <option value="">Nenhuma (matriz)</option>
                {filiais.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Saldo inicial</label>
              <input value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={salvando} className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
            {salvando ? "Salvando…" : "Salvar conta"}
          </button>
        </form>
      )}

      {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {carregando && <p className="text-sm text-zinc-500">Carregando…</p>}

      <div className="overflow-hidden rounded-lg bg-white ring-1 ring-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2">Conta</th>
              <th className="px-4 py-2">Banco</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Filial</th>
              <th className="px-4 py-2">Saldo atual</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {contas.map((conta) => (
              <tr key={conta.id} className="border-t border-zinc-100">
                <td className="px-4 py-2">
                  {conta.nomeConta}
                  {!conta.ativa && <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">inativa</span>}
                </td>
                <td className="px-4 py-2">{conta.banco}</td>
                <td className="px-4 py-2">{conta.tipo}</td>
                <td className="px-4 py-2">{nomeFilial(conta.filialId)}</td>
                <td className="px-4 py-2">
                  {Number(conta.saldoAtual).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => alternarStatus(conta)} className="text-xs text-zinc-500 underline">
                    {conta.ativa ? "Inativar" : "Ativar"}
                  </button>
                </td>
              </tr>
            ))}
            {!carregando && contas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">Nenhuma conta bancária cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
