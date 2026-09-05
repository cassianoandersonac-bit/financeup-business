"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type Balde = { periodo: string; entradas: number; saidas: number; saldoAcumulado: number };
type FluxoCaixa = { saldoInicioPeriodo: number; baldes: Balde[] };

const FILTROS_INICIAIS = { dataInicial: "", dataFinal: "", granularidade: "dia" };
const ITENS_GRANULARIDADE = { dia: "Dia", semana: "Semana", mes: "Mês" };

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
        <Link href={`/empresas/${empresaId}/dashboard`} className="text-sm text-muted-foreground underline">
          ← Dashboard
        </Link>
      </div>

      <h1 className="text-lg font-semibold">Fluxo de Caixa</h1>
      <p className="text-xs text-muted-foreground">
        Saldo acumulado = saldo inicial das contas + soma das transações até cada período. É histórico, não uma
        previsão de futuro.
      </p>

      <Card className="px-4">
        <form onSubmit={onFiltrar} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Data inicial</label>
            <Input
              type="date"
              value={filtrosForm.dataInicial}
              onChange={(e) => setFiltrosForm((f) => ({ ...f, dataInicial: e.target.value }))}
              className="w-auto"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Data final</label>
            <Input
              type="date"
              value={filtrosForm.dataFinal}
              onChange={(e) => setFiltrosForm((f) => ({ ...f, dataFinal: e.target.value }))}
              className="w-auto"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Granularidade</label>
            <Select
              items={ITENS_GRANULARIDADE}
              value={filtrosForm.granularidade}
              onValueChange={(v) => v && setFiltrosForm((f) => ({ ...f, granularidade: v }))}
            >
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dia">Dia</SelectItem>
                <SelectItem value="semana">Semana</SelectItem>
                <SelectItem value="mes">Mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit">Gerar</Button>
        </form>
      </Card>

      {erro && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}
      {carregando && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {fluxo && (
        <>
          <p className="text-sm text-muted-foreground">
            Saldo no início do período: <ValorMonetario valor={fluxo.saldoInicioPeriodo} className="font-medium text-foreground" />
          </p>
          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Saídas</TableHead>
                  <TableHead className="text-right">Saldo acumulado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fluxo.baldes.map((b) => (
                  <TableRow key={b.periodo}>
                    <TableCell>{b.periodo}</TableCell>
                    <TableCell className="text-right"><ValorMonetario valor={b.entradas} cor="positivo" /></TableCell>
                    <TableCell className="text-right"><ValorMonetario valor={b.saidas} cor="negativo" /></TableCell>
                    <TableCell className="text-right font-medium"><ValorMonetario valor={b.saldoAcumulado} /></TableCell>
                  </TableRow>
                ))}
                {fluxo.baldes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Nenhuma movimentação no período.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
