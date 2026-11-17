# Painel do BPO Financeiro (shell autenticado e telas de operação)

Escopo: todas as rotas em `src/app/(painel)` e o login. Modo: Operate.
Público: operador de BPO da BC Consultores no desktop, alternando empresas clientes.
Tarefa: lançar títulos, dar baixa (individual e em lote), estornar, transferir, conferir vencidos e saldos.
Restrições: nome "BC Consultores · BPO Financeiro"; controles padrão da web; números com algarismos tabulares.

## Direction contract

THESIS: Cada tela fecha como uma página do livro Diário: saldo corrente à direita, tinta vermelha para o que está vencido ou sai, total fechado por traço duplo. Recusa o painel SaaS de cartões brancos flutuando sobre cinza.

OWN-WORLD: Barra lateral verde-encadernação (#1E3B32) com filete vermelho marcando a página aberta; fundo verde-acinzentado claro (#F2F4EF); tinta quase preta (#1A2126); vermelho de tinta (#B3261E) para vencido e saídas; azul-carimbo (#3B3F8F) para liquidado; âmbar (#8A5A00) para em aberto. Public Sans; rótulos em caixa-alta espaçada; no máximo três tamanhos de texto por tela; hierarquia por peso, caixa e filete. Tabelas brancas com filete de 1px sob o cabeçalho e traço duplo de 4px sob o total. Selos de situação com contorno, como carimbo. Cor de ação (verde-encadernação) só em botões e links.

STORY: O operador vê a empresa ativa, sabe o que venceu e o que vence em 7 dias, filtra, abre o título, baixa ou estorna, e confere o total fechado.

FIRST VIEWPORT: Rail verde de 248px com menu agrupado (Lançamentos, Cadastros, Administração); topo branco com seletor de empresa e usuário; título da tela com sobrelinha em caixa-alta; faixa de resumo com filete superior de 2px dividida em quatro colunas (vencido em vermelho); filtros como botões segmentados; tabela densa de títulos com rodapé de total em traço duplo. Ação primária "Novo lançamento" no canto superior direito.

FORM: Livro Diário contábil, item 3 da lista ordenada. seed:cf316175010b10a1. Signature move: fechamento contábil — todo total de tabela e de resumo encerra com traço duplo, e valores vencidos ou negativos saem em tinta vermelha. Raises: hierarquia por peso/caixa/filete (rw-timetable-slide-rack); cor de ação só no que é clicável (digital-design-canon-warm-consumer-app-surface); mesma grade de colunas em todas as listas (editorial-sequence-montage-botanical-folio-season).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
