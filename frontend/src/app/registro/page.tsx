"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth, type SessaoLogin } from "@/lib/auth";

export default function RegistroPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [nomeOrganizacao, setNomeOrganizacao] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const sessao = await api.post<SessaoLogin>("/auth/register", {
        nomeOrganizacao,
        nome,
        email,
        senha,
      });
      login(sessao);
      router.push("/empresas");
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao criar organização");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Criar organização</h1>
          <p className="text-sm text-zinc-500">FinanceUp Business</p>
        </div>

        {erro && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Nome da organização</label>
          <input
            required
            value={nomeOrganizacao}
            onChange={(e) => setNomeOrganizacao(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Seu nome</label>
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Senha</label>
          <input
            type="password"
            required
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {enviando ? "Criando…" : "Criar organização"}
        </button>

        <p className="text-center text-sm text-zinc-500">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
