import {
  ArrowLeftRight,
  BookOpen,
  Building2,
  HandCoins,
  Landmark,
  LayoutDashboard,
  ListTree,
  LogOut,
  ReceiptText,
  Truck,
  UserRound,
  UsersRound,
  Wallet,
} from "lucide-react";
import { sair } from "@/features/acesso/actions";
import { nomeEmpresa, type Sessao } from "@/lib/sessao";
import { EmpresaSelect } from "./EmpresaSelect";
import { NavLink } from "./NavLink";

const icone = { className: "size-4 shrink-0", strokeWidth: 1.75, "aria-hidden": true } as const;

function grupos(sessao: Sessao) {
  return [
    {
      titulo: "Lançamentos",
      itens: [
        { href: "/", label: "Painel do dia", icon: <LayoutDashboard {...icone} /> },
        { href: "/financeiro/contas-pagar", label: "Contas a pagar", icon: <ReceiptText {...icone} /> },
        { href: "/financeiro/contas-receber", label: "Contas a receber", icon: <HandCoins {...icone} /> },
        { href: "/financeiro/tesouraria", label: "Tesouraria", icon: <Wallet {...icone} /> },
        { href: "/financeiro/transferencias", label: "Transferências", icon: <ArrowLeftRight {...icone} /> },
      ],
    },
    {
      titulo: "Cadastros",
      itens: [
        { href: "/cadastros/fornecedores", label: "Fornecedores", icon: <Truck {...icone} /> },
        { href: "/cadastros/clientes", label: "Clientes", icon: <UserRound {...icone} /> },
        { href: "/cadastros/classificacoes", label: "Classificações", icon: <ListTree {...icone} /> },
        { href: "/cadastros/contas", label: "Contas e formas", icon: <Landmark {...icone} /> },
      ],
    },
    {
      titulo: "Administração",
      itens: [
        { href: "/cadastros/empresas", label: "Empresas", icon: <Building2 {...icone} /> },
        ...(sessao.papel === "administrador"
          ? [{ href: "/cadastros/usuarios", label: "Usuários", icon: <UsersRound {...icone} /> }]
          : []),
      ],
    },
  ];
}

export function Shell({ sessao, children }: { sessao: Sessao; children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="bg-capa text-capa-tinta lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <BookOpen className="size-6 text-capa-tinta" strokeWidth={1.5} aria-hidden />
          <div className="leading-tight">
            <p className="text-[0.9375rem] font-bold text-white">BC Consultores</p>
            <p className="text-xs text-capa-tinta-2">BPO Financeiro</p>
          </div>
        </div>
        <nav aria-label="Menu principal" className="flex gap-6 overflow-x-auto px-3 py-4 lg:grid lg:gap-5 lg:overflow-visible">
          {grupos(sessao).map((grupo) => (
            <div key={grupo.titulo} className="grid shrink-0 content-start gap-0.5">
              <p className="px-3 pb-1 text-[0.6875rem] font-semibold tracking-[0.08em] text-capa-tinta-2 uppercase">
                {grupo.titulo}
              </p>
              {grupo.itens.map((item) => (
                <NavLink key={item.href} href={item.href} icon={item.icon}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-filete bg-folha px-6 py-2.5">
          <EmpresaSelect
            atual={sessao.empresa?.id ?? ""}
            empresas={sessao.empresas.map((item) => ({ id: item.empresa.id, nome: nomeEmpresa(item.empresa) }))}
          />
          <div className="flex items-center gap-4 text-tinta-2">
            <span className="hidden sm:inline">{sessao.email}</span>
            <span className="selo text-tinta-2">{sessao.papel ?? "sem acesso"}</span>
            <form action={sair}>
              <button type="submit" className="botao-claro" title="Sair do sistema">
                <LogOut {...icone} />
                Sair
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-6 pt-7 pb-16">{children}</main>
      </div>
    </div>
  );
}
