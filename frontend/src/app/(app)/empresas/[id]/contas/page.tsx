"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

type Filial = { id: string; nome: string };

type Importacao = {
  id: string;
  nomeArquivo: string;
  status: "PROCESSANDO" | "CONCLUIDO" | "FALHOU_PARCIAL";
  totalLidas: number;
  totalImportadas: number;
  totalDuplicadas: number;
  importadoEm: string;
};

const STATUS_LABEL: Record<Importacao["status"], string> = {
  PROCESSANDO: "Processando",
  CONCLUIDO: "Concluído",
  FALHOU_PARCIAL: "Falhou (parcial)",
};

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
const NENHUMA_FILIAL = "__nenhuma__";

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

  const [contaExpandidaId, setContaExpandidaId] = useState<string | null>(null);
  const [historicoPorConta, setHistoricoPorConta] = useState<Record<string, Importacao[]>>({});
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [enviandoImport, setEnviandoImport] = useState(false);
  const [erroImport, setErroImport] = useState<string | null>(null);

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

  async function carregarHistorico(contaId: string) {
    if (!orgId) return;
    const dados = await api.get<Importacao[]>(
      `/organizacoes/${orgId}/empresas/${empresaId}/contas-bancarias/${contaId}/importacoes`,
      token
    );
    setHistoricoPorConta((prev) => ({ ...prev, [contaId]: dados }));
  }

  async function onAlternarImportacao(contaId: string) {
    if (contaExpandidaId === contaId) {
      setContaExpandidaId(null);
      return;
    }
    setContaExpandidaId(contaId);
    setArquivoSelecionado(null);
    setErroImport(null);
    if (!historicoPorConta[contaId]) await carregarHistorico(contaId);
  }

  async function onEnviarArquivo(contaId: string) {
    if (!orgId || !arquivoSelecionado) return;
    setEnviandoImport(true);
    setErroImport(null);
    try {
      const formData = new FormData();
      formData.append("arquivo", arquivoSelecionado);
      await api.postForm(
        `/organizacoes/${orgId}/empresas/${empresaId}/contas-bancarias/${contaId}/importacoes`,
        formData,
        token
      );
      setArquivoSelecionado(null);
      await Promise.all([carregarHistorico(contaId), carregar()]);
    } catch (err) {
      setErroImport(err instanceof ApiError ? err.message : "Erro ao importar extrato");
    } finally {
      setEnviandoImport(false);
    }
  }

  function nomeFilial(filialId: string | null) {
    if (!filialId) return "—";
    return filiais.find((f) => f.id === filialId)?.nome || "—";
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link href="/empresas" className="text-sm text-muted-foreground underline">
          ← Empresas
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Contas bancárias</h1>
        <Button onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? "Cancelar" : "Nova conta"}
        </Button>
      </div>

      {mostrarForm && (
        <Card className="px-4">
          <form onSubmit={onCriar} className="space-y-3">
            {erroForm && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erroForm}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nome da conta *</label>
                <Input required value={nomeConta} onChange={(e) => setNomeConta(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Banco *</label>
                <Input required value={banco} onChange={(e) => setBanco(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Agência</label>
                <Input value={agencia} onChange={(e) => setAgencia(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Número da conta</label>
                <Input value={numeroConta} onChange={(e) => setNumeroConta(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo</label>
                <Select value={tipo} onValueChange={(v) => v && setTipo(v as (typeof TIPOS)[number])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Filial (opcional)</label>
                <Select
                  items={{ [NENHUMA_FILIAL]: "Nenhuma (matriz)", ...Object.fromEntries(filiais.map((f) => [f.id, f.nome])) }}
                  value={filialId || NENHUMA_FILIAL}
                  onValueChange={(v) => setFilialId(!v || v === NENHUMA_FILIAL ? "" : v)}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUMA_FILIAL}>Nenhuma (matriz)</SelectItem>
                    {filiais.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Saldo inicial</label>
                <Input value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar conta"}
            </Button>
          </form>
        </Card>
      )}

      {erro && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}
      {carregando && <p className="text-sm text-muted-foreground">Carregando…</p>}

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conta</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Filial</TableHead>
              <TableHead className="text-right">Saldo atual</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contas.map((conta) => (
              <Fragment key={conta.id}>
                <TableRow>
                  <TableCell>
                    {conta.nomeConta}
                    {!conta.ativa && <Badge variant="secondary" className="ml-2">inativa</Badge>}
                  </TableCell>
                  <TableCell>{conta.banco}</TableCell>
                  <TableCell>{conta.tipo}</TableCell>
                  <TableCell>{nomeFilial(conta.filialId)}</TableCell>
                  <TableCell className="text-right"><ValorMonetario valor={conta.saldoAtual} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="xs" onClick={() => onAlternarImportacao(conta.id)}>
                        {contaExpandidaId === conta.id ? "Fechar" : "Importar extrato"}
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => alternarStatus(conta)}>
                        {conta.ativa ? "Inativar" : "Ativar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {contaExpandidaId === conta.id && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={6} className="whitespace-normal py-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="file"
                            accept=".ofx,.qfx"
                            onChange={(e) => setArquivoSelecionado(e.target.files?.[0] || null)}
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => onEnviarArquivo(conta.id)}
                            disabled={!arquivoSelecionado || enviandoImport}
                          >
                            {enviandoImport ? "Importando…" : "Enviar arquivo"}
                          </Button>
                        </div>

                        {erroImport && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erroImport}</p>}

                        <div>
                          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Histórico de importações</p>
                          {(historicoPorConta[conta.id] || []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhuma importação ainda.</p>
                          ) : (
                            <Table>
                              <TableBody>
                                {(historicoPorConta[conta.id] || []).map((imp) => (
                                  <TableRow key={imp.id}>
                                    <TableCell>{imp.nomeArquivo}</TableCell>
                                    <TableCell>{new Date(imp.importadoEm).toLocaleString("pt-BR")}</TableCell>
                                    <TableCell>
                                      {imp.totalImportadas} importadas / {imp.totalDuplicadas} duplicadas ({imp.totalLidas} lidas)
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={
                                          imp.status === "FALHOU_PARCIAL"
                                            ? "destructive"
                                            : imp.status === "CONCLUIDO"
                                              ? "default"
                                              : "secondary"
                                        }
                                      >
                                        {STATUS_LABEL[imp.status]}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
            {!carregando && contas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Nenhuma conta bancária cadastrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
