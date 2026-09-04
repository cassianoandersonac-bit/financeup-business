"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Organizacao = { id: string; nome: string; papel: string };
export type Usuario = { id: string; nome: string; email: string };
export type SessaoLogin = { token: string; usuario: Usuario; organizacoes: Organizacao[] };

type AuthState = {
  token: string | null;
  usuario: Usuario | null;
  organizacoes: Organizacao[];
  organizacaoAtual: Organizacao | null;
  setOrganizacaoAtual: (org: Organizacao) => void;
  login: (sessao: SessaoLogin) => void;
  logout: () => void;
  carregando: boolean;
};

const AuthContext = createContext<AuthState | null>(null);
const STORAGE_KEY = "financeup-business-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [organizacoes, setOrganizacoes] = useState<Organizacao[]>([]);
  const [organizacaoAtual, setOrganizacaoAtualState] = useState<Organizacao | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: SessaoLogin = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratação síncrona a partir do localStorage (sistema externo)
        setToken(parsed.token);
        setUsuario(parsed.usuario);
        setOrganizacoes(parsed.organizacoes || []);
        setOrganizacaoAtualState(parsed.organizacoes?.[0] || null);
      }
    } catch {
      // localStorage indisponível ou dado corrompido — segue deslogado
    }
    setCarregando(false);
  }, []);

  function login(sessao: SessaoLogin) {
    setToken(sessao.token);
    setUsuario(sessao.usuario);
    setOrganizacoes(sessao.organizacoes);
    setOrganizacaoAtualState(sessao.organizacoes[0] || null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessao));
  }

  function logout() {
    setToken(null);
    setUsuario(null);
    setOrganizacoes([]);
    setOrganizacaoAtualState(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        usuario,
        organizacoes,
        organizacaoAtual,
        setOrganizacaoAtual: setOrganizacaoAtualState,
        login,
        logout,
        carregando,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
