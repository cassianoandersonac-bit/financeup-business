"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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

  const [confirmandoExclusaoId, setConfirmandoExclusaoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

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

  async function onExcluirEmpresa(empresaId: string) {
    if (!orgId) return;
    setErroExclusao(null);
    setExcluindo(true);
    try {
      await api.delete(`/organizacoes/${orgId}/empresas/${empresaId}`, token);
      setConfirmandoExclusaoId(null);
      await carregarEmpresas();
    } catch (err) {
      setErroExclusao(err instanceof ApiError ? err.message : "Erro ao excluir empresa");
    } finally {
      setExcluindo(false);
    }
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
        <h1 className="text-lg font-semibold">Empresas</h1>
        <Button onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? "Cancelar" : "Nova empresa"}
        </Button>
      </div>

      {mostrarForm && (
        <Card className="px-4">
          <form onSubmit={onCriarEmpresa} className="space-y-3">
            {erroForm && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erroForm}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nome *</label>
                <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Nome fantasia</label>
                <Input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">CNPJ *</label>
                <Input required value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Cidade</label>
                <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Estado</label>
                <Input value={estado} onChange={(e) => setEstado(e.target.value)} maxLength={2} />
              </div>
            </div>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar empresa"}
            </Button>
          </form>
        </Card>
      )}

      {erro && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}
      {carregando && <p className="text-sm text-muted-foreground">Carregando…</p>}

      <div className="space-y-3">
        {!carregando && empresas.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada ainda.</p>
        )}

        {empresas.map((empresa) => (
          <Card key={empresa.id} className="px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {empresa.nome}
                  {!empresa.ativa && <Badge variant="secondary" className="ml-2">inativa</Badge>}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatCnpj(empresa.cnpj)}
                  {empresa.cidade ? ` · ${empresa.cidade}${empresa.estado ? `/${empresa.estado}` : ""}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1">
                <Button variant="ghost" size="xs" nativeButton={false} render={<Link href={`/empresas/${empresa.id}/dashboard`} />}>
                  Dashboard
                </Button>
                <Button variant="ghost" size="xs" nativeButton={false} render={<Link href={`/empresas/${empresa.id}/transacoes`} />}>
                  Transações
                </Button>
                <Button variant="ghost" size="xs" nativeButton={false} render={<Link href={`/empresas/${empresa.id}/plano-contas`} />}>
                  Plano de Contas
                </Button>
                <Button variant="ghost" size="xs" nativeButton={false} render={<Link href={`/empresas/${empresa.id}/contas`} />}>
                  Contas bancárias
                </Button>
                <Button variant="outline" size="xs" onClick={() => onExpandir(empresa.id)}>
                  {expandida === empresa.id ? "Ocultar filiais" : "Filiais"}
                </Button>
                <Button variant="outline" size="xs" onClick={() => alternarStatus(empresa)}>
                  {empresa.ativa ? "Inativar" : "Ativar"}
                </Button>
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={() => {
                    setErroExclusao(null);
                    setConfirmandoExclusaoId(empresa.id);
                  }}
                >
                  Excluir
                </Button>
              </div>
            </div>

            {confirmandoExclusaoId === empresa.id && (
              <div className="mt-4 space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm text-destructive">
                  Isso apaga <strong>{empresa.nome}</strong> definitivamente, junto com filiais, contas
                  bancárias e plano de contas — não tem como desfazer. Só é permitido se a empresa não tiver
                  nenhuma transação importada.
                </p>
                {erroExclusao && <p className="text-sm text-destructive">{erroExclusao}</p>}
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={() => onExcluirEmpresa(empresa.id)} disabled={excluindo}>
                    {excluindo ? "Excluindo…" : "Sim, excluir definitivamente"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmandoExclusaoId(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {expandida === empresa.id && (
              <div className="mt-4 space-y-2 border-t pt-4">
                {(filiaisPorEmpresa[empresa.id] || []).map((filial) => (
                  <div key={filial.id} className="flex items-center justify-between text-sm">
                    <span>
                      {filial.nome}
                      {!filial.ativa && <Badge variant="secondary" className="ml-2">inativa</Badge>}
                    </span>
                    <Button variant="ghost" size="xs" onClick={() => alternarStatusFilial(empresa.id, filial)}>
                      {filial.ativa ? "Inativar" : "Ativar"}
                    </Button>
                  </div>
                ))}
                {(filiaisPorEmpresa[empresa.id] || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma filial cadastrada.</p>
                )}
                <form onSubmit={(e) => onCriarFilial(e, empresa.id)} className="flex gap-2 pt-2">
                  <Input
                    value={novaFilialNome}
                    onChange={(e) => setNovaFilialNome(e.target.value)}
                    placeholder="Nome da filial"
                  />
                  <Button type="submit" variant="outline">Adicionar</Button>
                </form>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
