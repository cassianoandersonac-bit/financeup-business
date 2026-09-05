"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { construirArvore, type NoArvore } from "@/lib/arvore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ValorMonetario } from "@/components/valor-monetario";
import { DreBarChart, type ItemDre } from "@/components/graficos/dre-bar-chart";

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

function LinhaDre({ no, profundidade }: { no: NoArvore<ContaDre>; profundidade: number }) {
  if (no.totalComFilhos === 0 && no.filhos.every((f) => f.totalComFilhos === 0)) return null;
  return (
    <>
      <TableRow>
        <TableCell style={{ paddingLeft: `${16 + profundidade * 20}px` }}>{no.codigo} · {no.descricao}</TableCell>
        <TableCell className="text-right"><ValorMonetario valor={no.totalComFilhos} /></TableCell>
      </TableRow>
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

  const itensGrafico: ItemDre[] = dre
    ? [
        ...arvore
          .filter((no) => no.totalComFilhos !== 0)
          .map((no) => ({ id: no.id, rotulo: `${no.codigo} · ${no.descricao}`, total: no.totalComFilhos })),
        ...dre.naoClassificado
          .filter((n) => n.total !== 0)
          .map((n) => ({ id: n.tipo, rotulo: `${TIPO_LABEL[n.tipo] || n.tipo} não classificada(s)`, total: n.total })),
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link href={`/empresas/${empresaId}/dashboard`} className="text-sm text-muted-foreground underline">
          ← Dashboard
        </Link>
      </div>

      <h1 className="text-lg font-semibold">Resultado por Empresa (DRE)</h1>

      <Card className="px-4">
        <form onSubmit={onFiltrar} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Data inicial</label>
            <Input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} className="w-auto" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Data final</label>
            <Input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} className="w-auto" />
          </div>
          <Button type="submit">Gerar</Button>
          <p className="text-xs text-muted-foreground">Sem data = todo o histórico</p>
        </form>
      </Card>

      {erro && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}
      {carregando && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {dre && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card className="items-center px-3 text-center">
              <p className="text-xs uppercase text-muted-foreground">Receitas</p>
              <p className="text-lg font-semibold"><ValorMonetario valor={dre.totalReceitas} cor="positivo" className="text-lg" /></p>
            </Card>
            <Card className="items-center px-3 text-center">
              <p className="text-xs uppercase text-muted-foreground">Despesas</p>
              <p className="text-lg font-semibold"><ValorMonetario valor={dre.totalDespesas} cor="negativo" className="text-lg" /></p>
            </Card>
            <Card className="items-center px-3 text-center">
              <p className="text-xs uppercase text-muted-foreground">Resultado</p>
              <p className="text-lg font-semibold"><ValorMonetario valor={dre.resultado} className="text-lg" /></p>
            </Card>
          </div>

          <Card className="px-4">
            <DreBarChart itens={itensGrafico} />
          </Card>

          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arvore.map((no) => (
                  <LinhaDre key={no.id} no={no} profundidade={0} />
                ))}
                {dre.naoClassificado.map((n) => (
                  <TableRow key={n.tipo} className="italic text-muted-foreground">
                    <TableCell>{TIPO_LABEL[n.tipo] || n.tipo} não classificada(s)</TableCell>
                    <TableCell className="text-right"><ValorMonetario valor={n.total} /></TableCell>
                  </TableRow>
                ))}
                {arvore.length === 0 && dre.naoClassificado.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">Nenhuma movimentação no período.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          {dre.totalTransferencias !== 0 && (
            <p className="text-xs text-muted-foreground">
              Transferências no período: <ValorMonetario valor={dre.totalTransferencias} cor="auto" className="text-xs" /> (não entram no resultado).
            </p>
          )}
        </>
      )}
    </div>
  );
}
