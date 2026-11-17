# DESIGN.md · Livro Diário

Sistema visual do BPO Financeiro da BC Consultores. Direção escolhida em 17/11/2026 entre três esboços (`.impeccable/mocks/decision/assigned.html`). O contrato completo está em `.impeccable/surfaces/src-app-painel-layout-tsx.md`.

## Tese

Cada tela fecha como uma página do livro Diário: saldo à direita, tinta vermelha para o que venceu ou sai, total fechado por traço duplo. Nada de painel SaaS com cartões flutuando.

## Cores (`src/app/globals.css`)

| Token | Valor | Uso |
| --- | --- | --- |
| `--capa` | `#1E3B32` | Barra lateral e botão primário (verde de encadernação) |
| `--papel` | `#F2F4EF` | Fundo da aplicação; item ativo do menu |
| `--folha` | `#FFFFFF` | Superfície de tabelas e formulários |
| `--tinta` | `#1A2126` | Texto e filetes fortes |
| `--tinta-2` | `#4F5A53` | Texto secundário e rótulos |
| `--vermelho` | `#B3261E` | Vencido, saídas, saldo negativo, ações destrutivas |
| `--ambar` | `#8A5A00` | Vence em 7 dias, a vencer |
| `--carimbo` | `#3B3F8F` | Liquidado, mensagens de sucesso, foco |

A cor de ação aparece só no que é clicável.

## Tipografia

Public Sans (via `next/font`), números tabulares em toda a aplicação. Três degraus por tela: título 26px bold, texto 14px, rótulo 11px em caixa-alta com 0,08em de espaçamento. A hierarquia vem de peso, caixa e filete, não de tamanho.

## Componentes

- `.folha`: superfície branca, filete de 1px, raio de 6px, sem sombra.
- `.tabela`: cabeçalho em rótulo com filete forte embaixo; `tfoot` com filete em cima e **traço duplo de 4px** embaixo (o fechamento contábil).
- `Resumo` (`src/components/ui.tsx`): faixa com filete superior de 2px, colunas separadas por filete e traço duplo no fim.
- `.selo-*`: situação em contorno, como carimbo. Liquidado leva leve rotação.
- `.segmentos`: filtros; o ativo é preenchido em tinta.
- `.botao`, `.botao-claro`, `.botao-perigo`, `.entrada`, `.campo`, `.link`.

## Movimento

Um só momento: o traço duplo dos totais aparece (cor de borda) em 520ms com ease-out exponencial, desligado com `prefers-reduced-motion`.

## Regras

- Sem sobrelinha acima do título, sem borda lateral colorida grossa, sem gradiente em texto, sem glifos no lugar de ícones (usar `lucide-react`, traço 1.75).
- Valores monetários em coluna à direita, sem "R$" na célula (a moeda vai no cabeçalho).
- Seleção de texto, foco, cursor e barras de rolagem usam a paleta.
