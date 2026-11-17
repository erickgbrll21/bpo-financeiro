"use client";

import { usePathname } from "next/navigation";
import { useRef } from "react";
import { escolherEmpresa } from "@/features/acesso/actions";

export function EmpresaSelect({ atual, empresas }: { atual: string; empresas: { id: string; nome: string }[] }) {
  const form = useRef<HTMLFormElement>(null);
  const pathname = usePathname();
  return (
    <form ref={form} action={escolherEmpresa} className="flex items-center gap-2">
      <input type="hidden" name="voltar" value={pathname.startsWith("/financeiro/lancamentos") ? "/" : pathname} />
      <label className="flex items-center gap-2">
        <span className="rotulo">Empresa</span>
        <select
          name="empresa_id"
          defaultValue={atual}
          onChange={() => form.current?.requestSubmit()}
          className="entrada min-w-64 font-semibold"
        >
          {empresas.length === 0 ? <option value="">Nenhuma empresa cadastrada</option> : null}
          {empresas.map((empresa) => (
            <option key={empresa.id} value={empresa.id}>
              {empresa.nome}
            </option>
          ))}
        </select>
      </label>
      <noscript>
        <button type="submit" className="botao-claro">
          Trocar
        </button>
      </noscript>
    </form>
  );
}
