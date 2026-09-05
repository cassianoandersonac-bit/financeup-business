"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { construirArvore, achatarComProfundidade, type NoArvore } from "@/lib/arvore";

type PlanoConta = {
  id: string;
  codigo: string;
  descricao: string;
  tipo: "RECEITA" | "DESPESA" | "TRANSFERENCIA";
  contaPaiId: string | null;
  ativo: boolean;
};

function LinhaArvore({
  no,
  profundidade,
  onToggle,
}: {
  no: NoArvore<PlanoConta>;
  profundidade: number;
  onToggle: (c: PlanoConta) => void;
}) {
  return (
    <>
      <tr className="border-t border-zinc-100">
        <td className="px-3 py-2" style={{ paddingLeft: `${12 + profundidade * 20}px` }}>
          {no.codigo}
        </td>
        <td className="px-3 py-2">
          {no.descricao}
          {!no.ativo && <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">inativa</span>}
        </td>
        <td className="px-3 py-2">{no.tipo}</td>
        <td className="px-3 py-2 text-right">
          <button onClick={() => onToggle(no)} className="text-xs text-zinc-500 underline">
            {no.ativo ? "Inativar" : "Ativar"}
          </button>
        </td>
      </tr>
      {no.filhos.map((filho) => (
        <LinhaArvore key={filho.id} no={filho} profundidade={profundidade + 1} onToggle={onToggle} />
      ))}
    </>
  );
}

export default function PlanoContasPage() {
  const params = useParams<{ id: string }>();
  const empresaId = params.id;
  const { token, organizacaoAtual } = useAuth();
  const orgId = organizacaoAtual?.id;

  const [contas, setContas] = useState<PlanoConta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<PlanoConta["tipo"]>("DESPESA");
  const [contaPaiId, setContaPaiId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  async function carregar() {
    if (!orgId) return;
    setCarregando(true);
    setErro(null);
    try {
      const dados = await api.get<PlanoConta[]>(`/organizacoes/${orgId}/empresas/${empresaId}/plano-contas`, token);
      setContas(dados);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao carregar plano de contas");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca dados da API ao montar
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, empresaId]);

  async function onCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setErroForm(null);
    setSalvando(true);
    try {
      await api.post(`/organizacoes/${orgId}/empresas/${empresaId}/plano-contas`, {
        codigo,
        descricao,
        tipo,
        contaPaiId: contaPaiId || undefined,
      }, token);
      setCodigo("");
      setDescricao("");
      setTipo("DESPESA");
      setContaPaiId("");
      setMostrarForm(false);
      await carregar();
    } catch (err) {
      setErroForm(err instanceof ApiError ? err.message : "Erro ao criar conta");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatus(conta: PlanoConta) {
    if (!orgId) return;
    await api.patch(
      `/organizacoes/${orgId}/empresas/${empresaId}/plano-contas/${conta.id}/status`,
      { ativo: !conta.ativo },
      token
    );
    await carregar();
  }

  const arvore = construirArvore(contas);
  const opcoesContaPai = achatarComProfundidade(arvore);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link href="/empresas" className="text-sm text-zinc-500 underline">
          ← Empresas
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Plano de Contas</h1>
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
              <label className="text-sm font-medium text-zinc-700">Código *</label>
              <input required value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="3.1" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Descrição *</label>
              <input required value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as PlanoConta["tipo"])} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
                <option value="RECEITA">Receita</option>
                <option value="DESPESA">Despesa</option>
                <option value="TRANSFERENCIA">Transferência</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Conta pai (opcional)</label>
              <select value={contaPaiId} onChange={(e) => setContaPaiId(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
                <option value="">Nenhuma (conta principal)</option>
                {opcoesContaPai.map((o) => (
                  <option key={o.id} value={o.id}>{o.rotulo}</option>
                ))}
              </select>
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
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Descrição</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {arvore.map((no) => (
              <LinhaArvore key={no.id} no={no} profundidade={0} onToggle={alternarStatus} />
            ))}
            {!carregando && arvore.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-zinc-400">Nenhuma conta cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
