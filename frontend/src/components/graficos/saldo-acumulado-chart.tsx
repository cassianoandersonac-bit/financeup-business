"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

type Balde = { periodo: string; saldoAcumulado: number };

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatarPeriodoLabel(periodo: string) {
  const [ano, mes, dia] = periodo.split("-");
  if (!dia) return `${NOMES_MES[Number(mes) - 1]}/${ano.slice(2)}`;
  return `${dia}/${mes}`;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function TooltipSaldo({ active, payload }: { active?: boolean; payload?: { payload: Balde }[] }) {
  if (!active || !payload?.length) return null;
  const balde = payload[0].payload;
  return (
    <div className="rounded-md bg-foreground px-2 py-1 text-xs text-background shadow">
      {formatarPeriodoLabel(balde.periodo)}: {formatarMoeda(balde.saldoAcumulado)}
    </div>
  );
}

// Linha/área de saldo acumulado — série única, sem legenda (regra da skill de
// dataviz: "none for one"). Cor: slot categórico 1 da paleta validada.
export function SaldoAcumuladoChart({ dados }: { dados: Balde[] }) {
  if (dados.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem movimentação no período.</p>;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="saldoAcumuladoGradiente" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="periodo"
            tickFormatter={formatarPeriodoLabel}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            minTickGap={24}
          />
          <Tooltip content={<TooltipSaldo />} cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }} />
          <Area
            type="monotone"
            dataKey="saldoAcumulado"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#saldoAcumuladoGradiente)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* fallback textual (tabela) pro mesmo dado, sempre visível */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {dados.map((d) => (
          <span key={d.periodo}>
            {formatarPeriodoLabel(d.periodo)}: {formatarMoeda(d.saldoAcumulado)}
          </span>
        ))}
      </div>
    </div>
  );
}
