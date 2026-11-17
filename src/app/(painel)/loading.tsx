export default function PainelLoading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Carregando">
      <div className="h-10 max-w-sm animate-pulse rounded-lg bg-filete/70" />
      <div className="h-24 animate-pulse rounded-xl bg-filete/40" />
      <div className="h-72 animate-pulse rounded-xl bg-filete/40" />
    </div>
  );
}
