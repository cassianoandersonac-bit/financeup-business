"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Empresa = {
  id: string;
  nome: string;
  nomeFantasia: string | null;
  cnpj: string;
  cidade: string | null;
  estado: string | null;
  ativa: boolean;
};

type Filial = {
  id: string;
  nome: string;
  cnpj: string | null;
  cidade: string | null;
  estado: string | null;
  ativa: boolean;
};

function formatCnpj(cnpj: string) {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export default function EmpresasPage() {
  const { token, organizacaoAtual } = useAuth();
  const orgId = organizacaoAtual?.id;

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [nome, setNome] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const [expandida, setExpandida] = useState<string | null>(null);
  const [filiaisPorEmpresa, setFiliaisPorEmpresa] = useState<Record<string, Filial[]>>({});
  const [novaFilialNome, setNovaFilialNome] = useState("");

  async function carregarEmpresas() {
    if (!orgId) return;
    setCarregando(true);
    setErro(null);
    try {
      const dados = await api.get<Empresa[]>(`/organizacoes/${orgId}/empresas`, token);
      setEmpresas(dados);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao carregar empresas");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca dados da API (sistema externo) ao montar/trocar de organização
    carregarEmpresas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function onCriarEmpresa(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setErroForm(null);
    setSalvando(true);
    try {
      await api.post(`/organizacoes/${orgId}/empresas`, {
        nome,
        nomeFantasia: nomeFantasia || undefined,
        cnpj,
        cidade: cidade || undefined,
        estado: estado || undefined,
      }, token);
      setNome("");
      setNomeFantasia("");
      setCnpj("");
      setCidade("");
      setEstado("");
      setMostrarForm(false);
      await carregarEmpresas();
    } catch (err) {
      setErroForm(err instanceof ApiError ? err.message : "Erro ao criar empresa");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatus(empresa: Empresa) {
    if (!orgId) return;
    await api.patch(`/organizacoes/${orgId}/empresas/${empresa.id}/status`, { ativa: !empresa.ativa }, token);
    await carregarEmpresas();
  }

  async function carregarFiliais(empresaId: string) {
    if (!orgId) return;
    const dados = await api.get<Filial[]>(`/organizacoes/${orgId}/empresas/${empresaId}/filiais`, token);
    setFiliaisPorEmpresa((prev) => ({ ...prev, [empresaId]: dados }));
  }

  async function onExpandir(empresaId: string) {
    if (expandida === empresaId) {
      setExpandida(null);
      return;
    }
    setExpandida(empresaId);
    if (!filiaisPorEmpresa[empresaId]) await carregarFiliais(empresaId);
  }

  async function onCriarFilial(e: React.FormEvent, empresaId: string) {
    e.preventDefault();
    if (!orgId || !novaFilialNome.trim()) return;
    await api.post(`/organizacoes/${orgId}/empresas/${empresaId}/filiais`, { nome: novaFilialNome }, token);
    setNovaFilialNome("");
    await carregarFiliais(empresaId);
  }

  async function alternarStatusFilial(empresaId: string, filial: Filial) {
    if (!orgId) return;
    await api.patch(
      `/organizacoes/${orgId}/empresas/${empresaId}/filiais/${filial.id}/status`,
      { ativa: !filial.ativa },
      token
    );
    await carregarFiliais(empresaId);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Empresas</h1>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          {mostrarForm ? "Cancelar" : "Nova empresa"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={onCriarEmpresa} className="space-y-3 rounded-lg bg-white p-4 ring-1 ring-zinc-200">
          {erroForm && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erroForm}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Nome *</label>
              <input required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Nome fantasia</label>
              <input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">CNPJ *</label>
              <input required value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Cidade</label>
              <input value={cidade} onChange={(e) => setCidade(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Estado</label>
              <input value={estado} onChange={(e) => setEstado(e.target.value)} maxLength={2} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={salvando} className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
            {salvando ? "Salvando…" : "Salvar empresa"}
          </button>
        </form>
      )}

      {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {carregando && <p className="text-sm text-zinc-500">Carregando…</p>}

      <div className="space-y-3">
        {!carregando && empresas.length === 0 && (
          <p className="text-sm text-zinc-500">Nenhuma empresa cadastrada ainda.</p>
        )}

        {empresas.map((empresa) => (
          <div key={empresa.id} className="rounded-lg bg-white p-4 ring-1 ring-zinc-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-900">
                  {empresa.nome}
                  {!empresa.ativa && <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">inativa</span>}
                </p>
                <p className="text-sm text-zinc-500">
                  {formatCnpj(empresa.cnpj)}
                  {empresa.cidade ? ` · ${empresa.cidade}${empresa.estado ? `/${empresa.estado}` : ""}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/empresas/${empresa.id}/dashboard`} className="text-sm font-medium text-zinc-700 underline">
                  Dashboard
                </Link>
                <Link href={`/empresas/${empresa.id}/transacoes`} className="text-sm font-medium text-zinc-700 underline">
                  Transações
                </Link>
                <Link href={`/empresas/${empresa.id}/plano-contas`} className="text-sm font-medium text-zinc-700 underline">
                  Plano de Contas
                </Link>
                <Link href={`/empresas/${empresa.id}/contas`} className="text-sm font-medium text-zinc-700 underline">
                  Contas bancárias
                </Link>
                <button onClick={() => onExpandir(empresa.id)} className="rounded-md border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-100">
                  {expandida === empresa.id ? "Ocultar filiais" : "Filiais"}
                </button>
                <button onClick={() => alternarStatus(empresa)} className="rounded-md border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-100">
                  {empresa.ativa ? "Inativar" : "Ativar"}
                </button>
              </div>
            </div>

            {expandida === empresa.id && (
              <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
                {(filiaisPorEmpresa[empresa.id] || []).map((filial) => (
                  <div key={filial.id} className="flex items-center justify-between text-sm">
                    <span>
                      {filial.nome}
                      {!filial.ativa && <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">inativa</span>}
                    </span>
                    <button onClick={() => alternarStatusFilial(empresa.id, filial)} className="text-xs text-zinc-500 underline">
                      {filial.ativa ? "Inativar" : "Ativar"}
                    </button>
                  </div>
                ))}
                {(filiaisPorEmpresa[empresa.id] || []).length === 0 && (
                  <p className="text-sm text-zinc-400">Nenhuma filial cadastrada.</p>
                )}
                <form onSubmit={(e) => onCriarFilial(e, empresa.id)} className="flex gap-2 pt-2">
                  <input
                    value={novaFilialNome}
                    onChange={(e) => setNovaFilialNome(e.target.value)}
                    placeholder="Nome da filial"
                    className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                  />
                  <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100">
                    Adicionar
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
