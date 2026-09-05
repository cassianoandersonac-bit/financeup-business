"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AppSidebar, useEmpresas, empresaIdDaRota } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, carregando, usuario, organizacoes, organizacaoAtual, setOrganizacaoAtual, logout } = useAuth();
  const empresas = useEmpresas();
  const empresaIdAtual = empresaIdDaRota(pathname) ?? empresas[0]?.id ?? null;

  useEffect(() => {
    if (!carregando && !token) router.replace("/login");
  }, [carregando, token, router]);

  if (carregando || !token) {
    return <div className="flex flex-1 items-center justify-center text-muted-foreground">Carregando…</div>;
  }

  function trocarEmpresa(novoId: string | null) {
    if (!novoId) return;
    const restante = empresaIdAtual && pathname.startsWith(`/empresas/${empresaIdAtual}/`)
      ? pathname.slice(`/empresas/${empresaIdAtual}/`.length)
      : "dashboard";
    router.push(`/empresas/${novoId}/${restante}`);
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />

          {empresas.length > 0 && (
            <Select value={empresaIdAtual ?? undefined} onValueChange={trocarEmpresa}>
              <SelectTrigger className="w-56" size="sm">
                <SelectValue placeholder="Selecione a empresa">
                  {(id: string | null) => empresas.find((e) => e.id === id)?.nome ?? "Selecione a empresa"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {empresas.map((empresa) => (
                  <SelectItem key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {organizacoes.length > 1 && (
            <Select
              value={organizacaoAtual?.id}
              onValueChange={(id) => {
                const org = organizacoes.find((o) => o.id === id);
                if (org) setOrganizacaoAtual(org);
              }}
            >
              <SelectTrigger className="w-48" size="sm">
                <SelectValue placeholder="Organização">
                  {(id: string | null) => organizacoes.find((o) => o.id === id)?.nome ?? "Organização"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {organizacoes.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{usuario?.nome}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              Sair
            </Button>
          </div>
        </header>
        <main className="flex flex-1 flex-col bg-muted/30 px-6 py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
