"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  ArrowLeftRight,
  ListTree,
  Landmark,
  FileBarChart,
  TrendingUp,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Empresa = { id: string; nome: string };

/** Extrai o :id de /empresas/:id/... da URL atual, se houver. */
function empresaIdDaRota(pathname: string): string | null {
  const match = pathname.match(/^\/empresas\/([^/]+)(?:\/|$)/);
  return match ? match[1] : null;
}

export function useEmpresas() {
  const { token, organizacaoAtual } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const orgId = organizacaoAtual?.id;

  useEffect(() => {
    if (!orgId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset ao trocar/perder organização (sistema externo)
      setEmpresas([]);
      return;
    }
    let cancelado = false;
    api
      .get<Empresa[]>(`/organizacoes/${orgId}/empresas`, token)
      .then((dados) => {
        if (!cancelado) setEmpresas(dados);
      })
      .catch((err) => {
        if (!cancelado && !(err instanceof ApiError)) throw err;
      });
    return () => {
      cancelado = true;
    };
  }, [orgId, token]);

  return empresas;
}

const itensGerais = [{ href: "/empresas", label: "Empresas", icon: Building2 }];

function itensEmpresa(empresaId: string) {
  return [
    { href: `/empresas/${empresaId}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `/empresas/${empresaId}/transacoes`, label: "Transações", icon: ArrowLeftRight },
    { href: `/empresas/${empresaId}/plano-contas`, label: "Plano de Contas", icon: ListTree },
    { href: `/empresas/${empresaId}/contas`, label: "Contas Bancárias", icon: Landmark },
    { href: `/empresas/${empresaId}/relatorios/dre`, label: "Resultado (DRE)", icon: FileBarChart },
    { href: `/empresas/${empresaId}/relatorios/fluxo-caixa`, label: "Fluxo de Caixa", icon: TrendingUp },
  ];
}

export function AppSidebar() {
  const pathname = usePathname();
  const empresas = useEmpresas();
  const empresaIdAtual = empresaIdDaRota(pathname) ?? empresas[0]?.id ?? null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-3">
        <span className="truncate px-1 text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
          FinanceUp Business
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {itensGerais.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            {empresas.find((e) => e.id === empresaIdAtual)?.nome ?? "Empresa"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {empresaIdAtual ? (
                itensEmpresa(empresaIdAtual).map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : (
                <SidebarMenuItem>
                  <span className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                    Selecione uma empresa
                  </span>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export { empresaIdDaRota };
export type { Empresa };
