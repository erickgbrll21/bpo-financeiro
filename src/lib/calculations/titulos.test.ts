import assert from "node:assert/strict";
import test from "node:test";
import { diasEmAtraso, fimDoMes, somarDias, statusDoTitulo } from "./titulos.ts";

const hoje = "2026-11-17";

test("vencida quando o vencimento passou e há saldo", () => {
  assert.equal(statusDoTitulo({ vencimento: "2026-11-16", saldo: 10, cancelado: false }, hoje), "vencida");
});

test("vence em até 7 dias inclui hoje e o sétimo dia", () => {
  assert.equal(statusDoTitulo({ vencimento: hoje, saldo: 10, cancelado: false }, hoje), "vence_7");
  assert.equal(statusDoTitulo({ vencimento: "2026-11-24", saldo: 10, cancelado: false }, hoje), "vence_7");
  assert.equal(statusDoTitulo({ vencimento: "2026-11-25", saldo: 10, cancelado: false }, hoje), "a_vencer");
});

test("saldo zero é liquidada mesmo vencida; cancelada vence tudo", () => {
  assert.equal(statusDoTitulo({ vencimento: "2026-01-01", saldo: 0, cancelado: false }, hoje), "liquidada");
  assert.equal(statusDoTitulo({ vencimento: "2026-01-01", saldo: 50, cancelado: true }, hoje), "cancelada");
});

test("dias em atraso nunca é negativo", () => {
  assert.equal(diasEmAtraso("2026-11-04", hoje), 13);
  assert.equal(diasEmAtraso("2026-12-01", hoje), 0);
});

test("datas atravessam mês e ano bissexto", () => {
  assert.equal(somarDias("2026-12-28", 7), "2027-01-04");
  assert.equal(fimDoMes("2028-02-10"), "2028-02-29");
});
