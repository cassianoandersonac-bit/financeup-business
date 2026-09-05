import { cn } from "@/lib/utils";

type ValorMonetarioProps = {
  valor: number | string;
  /** Força a cor semântica independente do sinal — usa quando o rótulo já diz o sentido (ex: "Receitas", "Despesas"). */
  cor?: "auto" | "positivo" | "negativo";
  className?: string;
};

/**
 * Exibe um valor em BRL com tabular-nums e cor semântica (verde/vermelho),
 * padronizado para reuso em toda tela que mostra dinheiro.
 */
export function ValorMonetario({ valor, cor = "auto", className }: ValorMonetarioProps) {
  const numero = typeof valor === "string" ? Number(valor) : valor;
  const formatado = numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const corClasse =
    cor === "positivo"
      ? "text-positive"
      : cor === "negativo"
        ? "text-negative"
        : numero < 0
          ? "text-negative"
          : numero > 0
            ? "text-positive"
            : "text-foreground";

  return <span className={cn("tabular-nums", corClasse, className)}>{formatado}</span>;
}
