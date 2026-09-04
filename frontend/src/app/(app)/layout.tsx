"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { token, carregando, usuario, organizacoes, organizacaoAtual, setOrganizacaoAtual, logout } = useAuth();

  useEffect(() => {
    if (!carregando && !token) router.replace("/login");
  }, [carregando, token, router]);

  if (carregando || !token) {
    return <div className="flex flex-1 items-center justify-center text-zinc-500">Carregando…</div>;
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-zinc-900">FinanceUp Business</span>
          {organizacoes.length > 1 ? (
            <select
              value={organizacaoAtual?.id}
              onChange={(e) => {
                const org = organizacoes.find((o) => o.id === e.target.value);
                if (org) setOrganizacaoAtual(org);
              }}
              className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
            >
              {organizacoes.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.nome}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm text-zinc-500">{organizacaoAtual?.nome}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <span>{usuario?.nome}</span>
          <button onClick={logout} className="rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-100">
            Sair
          </button>
        </div>
      </header>
      <main className="flex flex-1 flex-col bg-zinc-50 px-6 py-8">{children}</main>
    </div>
  );
}
