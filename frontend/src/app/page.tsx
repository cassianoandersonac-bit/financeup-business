"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const { token, carregando } = useAuth();

  useEffect(() => {
    if (carregando) return;
    router.replace(token ? "/empresas" : "/login");
  }, [carregando, token, router]);

  return (
    <div className="flex flex-1 items-center justify-center text-zinc-500">
      Carregando…
    </div>
  );
}
