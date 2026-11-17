import { alternarAtivo } from "./actions";

export function Campo({ rotulo, className, ...props }: { rotulo: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`campo ${className ?? ""}`}>
      <span>
        {rotulo}
        {props.required ? " *" : ""}
      </span>
      <input {...props} className="entrada" />
    </label>
  );
}

export function FormLateral({
  titulo,
  action,
  botao,
  children,
}: {
  titulo: string;
  action: (formData: FormData) => Promise<void>;
  botao: string;
  children: React.ReactNode;
}) {
  return (
    <form action={action} className="folha grid content-start gap-4 p-5">
      <h2 className="text-base font-bold">{titulo}</h2>
      {children}
      <button type="submit" className="botao">
        {botao}
      </button>
    </form>
  );
}

export function AlternarAtivo({ tabela, id, ativo }: { tabela: string; id: string; ativo: boolean }) {
  return (
    <form action={alternarAtivo}>
      <input type="hidden" name="tabela" value={tabela} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="ativar" value={ativo ? "0" : "1"} />
      <button type="submit" className={ativo ? "link text-tinta-2" : "link"}>
        {ativo ? "Inativar" : "Reativar"}
      </button>
    </form>
  );
}

export function Inativo() {
  return <span className="selo ml-2 text-tinta-2">Inativo</span>;
}
