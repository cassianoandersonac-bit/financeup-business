"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ItemDre = { id: string; rotulo: string; total: number };

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function TooltipDre({ active, payload }: { active?: boolean; payload?: { payload: ItemDre }[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md bg-foreground px-2 py-1 text-xs text-background shadow">
      {item.rotulo}: {formatarMoeda(item.total)}
    </div>
  );
}

// Barras horizontais por categoria — cor segue polaridade (positivo/negativo),
// não identidade categórica, então não é uma paleta categórica: reaproveita os
// tokens de status --positive/--negative já usados em toda a tela de DRE.
export function DreBarChart({ itens }: { itens: ItemDre[] }) {
  if (itens.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem movimentação no período.</p>;
  }

  const altura = Math.max(120, itens.length * 32);

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={itens} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="rotulo"
          width={160}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <ReferenceLine x={0} stroke="var(--border)" />
        <Tooltip content={<TooltipDre />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="total" radius={4}>
          {itens.map((item) => (
            <Cell key={item.id} fill={item.total < 0 ? "var(--negative)" : "var(--positive)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export type { ItemDre };
