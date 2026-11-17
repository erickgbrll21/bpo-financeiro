import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  baixaPermitida,
  podeCancelar,
  podeExcluir,
  saldoEmAberto,
  situacaoDoLancamento,
} from "./lancamento.ts";

describe("lançamento", () => {
  it("baixa parcial deixa saldo e o título continua previsto", () => {
    const baixas = [{ valor: "400.00", estornada: false }];
    assert.equal(saldoEmAberto("1000.00", baixas).toFixed(2), "600.00");
    assert.equal(situacaoDoLancamento("1000.00", baixas, false), "previsto");
  });

  it("quita quando as baixas cobrem o valor original", () => {
    const baixas = [
      { valor: "400.00", estornada: false },
      { valor: "600.00", estornada: false },
    ];
    assert.equal(situacaoDoLancamento("1000.00", baixas, false), "realizado");
    assert.equal(baixaPermitida("1000.00", baixas, "0.01", false), false);
  });

  it("estorno devolve o saldo sem apagar a baixa", () => {
    const baixas = [
      { valor: "1000.00", estornada: true },
      { valor: "250.00", estornada: false },
    ];
    assert.equal(saldoEmAberto("1000.00", baixas).toFixed(2), "750.00");
    assert.equal(situacaoDoLancamento("1000.00", baixas, false), "previsto");
    assert.equal(podeExcluir(baixas), false);
  });

  it("não baixa nem cancela título cancelado, e cancela só sem baixa ativa", () => {
    const ativa = [{ valor: "10.00", estornada: false }];
    assert.equal(baixaPermitida("100.00", ativa, "10.00", true), false);
    assert.equal(podeCancelar(ativa, false), false);
    assert.equal(podeCancelar([{ valor: "10.00", estornada: true }], false), true);
    assert.equal(situacaoDoLancamento("100.00", [], true), "cancelado");
  });

  it("arredonda dinheiro em duas casas", () => {
    assert.equal(saldoEmAberto("10.005", []).toFixed(2), "10.01");
  });
});
