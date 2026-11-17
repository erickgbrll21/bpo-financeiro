"use client";

import { useEffect, useRef, useState } from "react";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Soma os títulos marcados no formulário em que está e controla o "marcar todos". */
export function SomaMarcados({ verbo }: { verbo: string }) {
  const ancora = useRef<HTMLSpanElement>(null);
  const [soma, setSoma] = useState({ quantidade: 0, total: 0 });

  useEffect(() => {
    const form = ancora.current?.closest("form");
    if (!form) return;
    const recalcular = () => {
      const marcados = [...form.querySelectorAll<HTMLInputElement>('input[name="ids"]:checked')];
      setSoma({ quantidade: marcados.length, total: marcados.reduce((acc, item) => acc + Number(item.dataset.saldo), 0) });
    };
    const aoMudar = (evento: Event) => {
      const alvo = evento.target as HTMLInputElement;
      if (alvo.dataset.todos !== undefined) {
        form.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((item) => (item.checked = alvo.checked));
      }
      recalcular();
    };
    form.addEventListener("change", aoMudar);
    recalcular();
    return () => form.removeEventListener("change", aoMudar);
  }, []);

  return (
    <span ref={ancora} className="flex flex-wrap items-center gap-3">
      <span className="text-tinta-2" aria-live="polite">
        {soma.quantidade === 0 ? (
          "Nenhum título marcado"
        ) : (
          <>
            <strong className="text-tinta">{soma.quantidade}</strong> {soma.quantidade === 1 ? "marcado" : "marcados"} ·{" "}
            <strong className="text-tinta tabular-nums">{moeda.format(soma.total)}</strong>
          </>
        )}
      </span>
      <button type="submit" className="botao" disabled={soma.quantidade === 0}>
        {verbo} {soma.quantidade > 0 ? soma.quantidade : ""} {soma.quantidade === 1 ? "título" : "títulos"}
      </button>
    </span>
  );
}
