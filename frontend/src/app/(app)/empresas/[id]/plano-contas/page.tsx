"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { construirArvore, achatarComProfundidade, type NoArvore } from "@/lib/arvore";
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

type PlanoConta = {
  id: string;
  codigo: string;
  descricao: string;
  tipo: "RECEITA" | "DESPESA" | "TRANSFERENCIA";
  contaPaiId: string | null;
  ativo: boolean;
};

const NENHUMA_CONTA_PAI = "__nenhuma__";
const ITENS_TIPO = { RECEITA: "Receita", DESPESA: "Despesa", TRANSFERENCIA: "Transferência" };

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
      <TableRow>
        <TableCell style={{ paddingLeft: `${16 + profundidade * 20}px` }}>{no.codigo}</TableCell>
        <TableCell>
          {no.descricao}
          {!no.ativo && <Badge variant="secondary" className="ml-2">inativa</Badge>}
        </TableCell>
        <TableCell>{no.tipo}</TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="xs" onClick={() => onToggle(no)}>
            {no.ativo ? "Inativar" : "Ativar"}
          </Button>
        </TableCell>
      </TableRow>
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
        <Link href="/empresas" className="text-sm text-muted-foreground underline">
          ← Empresas
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Plano de Contas</h1>
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
                <label className="text-sm font-medium">Código *</label>
                <Input required value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="3.1" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Descrição *</label>
                <Input required value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo</label>
                <Select items={ITENS_TIPO} value={tipo} onValueChange={(v) => v && setTipo(v as PlanoConta["tipo"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEITA">Receita</SelectItem>
                    <SelectItem value="DESPESA">Despesa</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Conta pai (opcional)</label>
                <Select
                  items={{ [NENHUMA_CONTA_PAI]: "Nenhuma (conta principal)", ...Object.fromEntries(opcoesContaPai.map((o) => [o.id, o.rotulo])) }}
                  value={contaPaiId || NENHUMA_CONTA_PAI}
                  onValueChange={(v) => setContaPaiId(!v || v === NENHUMA_CONTA_PAI ? "" : v)}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUMA_CONTA_PAI}>Nenhuma (conta principal)</SelectItem>
                    {opcoesContaPai.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.rotulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {arvore.map((no) => (
              <LinhaArvore key={no.id} no={no} profundidade={0} onToggle={alternarStatus} />
            ))}
            {!carregando && arvore.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Nenhuma conta cadastrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
