"use client";

import { useState } from "react";

type Balde = { periodo: string; entradas: number; saidas: number; saldoAcumulado: number };

const LARGURA = 600;
const ALTURA = 220;
const MARGEM = { topo: 16, base: 28 };
const COR_SERIE = "#2a78d6"; // paleta dataviz — slot categórico 1 (blue), série única

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function formatarPeriodoLabel(periodo: string) {
  const [ano, mes] = periodo.split("-");
  const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${nomes[Number(mes) - 1]}/${ano.slice(2)}`;
}

// Linha/área de saldo acumulado — série única, sem legenda (regra da
// skill de dataviz: "none for one"). Hover por coluna (poucos pontos —
// baldes mensais — não precisa de rastreio contínuo do mouse).
export function FluxoCaixaChart({ dados }: { dados: Balde[] }) {
  const [indiceHover, setIndiceHover] = useState<number | null>(null);

  if (dados.length === 0) {
    return <p className="text-sm text-zinc-400">Sem movimentação no período.</p>;
  }

  const areaUtil = { largura: LARGURA, altura: ALTURA - MARGEM.topo - MARGEM.base };
  const valores = dados.map((d) => d.saldoAcumulado);
  const minValor = Math.min(0, ...valores);
  const maxValor = Math.max(0, ...valores);
  const amplitude = maxValor - minValor || 1;
  const passo = dados.length > 1 ? areaUtil.largura / (dados.length - 1) : 0;

  const x = (i: number) => (dados.length === 1 ? areaUtil.largura / 2 : i * passo);
  const y = (valor: number) => MARGEM.topo + areaUtil.altura - ((valor - minValor) / amplitude) * areaUtil.altura;
  const yZero = y(0);

  const pontos = dados.map((d, i) => ({ x: x(i), y: y(d.saldoAcumulado), dado: d }));
  const linhaPath = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linhaPath} L${pontos[pontos.length - 1].x},${yZero} L${pontos[0].x},${yZero} Z`;

  const hover = indiceHover !== null ? pontos[indiceHover] : null;
  const larguraColuna = dados.length > 1 ? passo : areaUtil.largura;

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="w-full" role="img" aria-label="Saldo acumulado por mês">
          {minValor < 0 && maxValor > 0 && (
            <line x1={0} x2={LARGURA} y1={yZero} y2={yZero} stroke="#e1e0d9" strokeWidth={1} />
          )}

          <path d={areaPath} fill={COR_SERIE} fillOpacity={0.12} stroke="none" />
          <path d={linhaPath} fill="none" stroke={COR_SERIE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {hover && (
            <line x1={hover.x} x2={hover.x} y1={MARGEM.topo} y2={ALTURA - MARGEM.base} stroke="#c3c2b7" strokeWidth={1} strokeDasharray="3,3" />
          )}

          {pontos.map((p, i) => (
            <g key={p.dado.periodo}>
              <circle cx={p.x} cy={p.y} r={i === pontos.length - 1 || i === indiceHover ? 4 : 3} fill={COR_SERIE} />
              <text x={p.x} y={ALTURA - 8} textAnchor="middle" fontSize="10" fill="#898781">
                {formatarPeriodoLabel(p.dado.periodo)}
              </text>
              <rect
                x={p.x - larguraColuna / 2}
                y={0}
                width={larguraColuna}
                height={ALTURA}
                fill="transparent"
                onMouseEnter={() => setIndiceHover(i)}
                onMouseLeave={() => setIndiceHover(null)}
              />
            </g>
          ))}
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white shadow"
            style={{ left: `${(hover.x / LARGURA) * 100}%`, top: `${(hover.y / ALTURA) * 100}%` }}
          >
            {formatarPeriodoLabel(hover.dado.periodo)}: {formatarMoeda(hover.dado.saldoAcumulado)}
          </div>
        )}
      </div>

      {/* fallback textual (tabela) pro mesmo dado, sempre visível */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
        {dados.map((d) => (
          <span key={d.periodo}>
            {formatarPeriodoLabel(d.periodo)}: {formatarMoeda(d.saldoAcumulado)}
          </span>
        ))}
      </div>
    </div>
  );
}
