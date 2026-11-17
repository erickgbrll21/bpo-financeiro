"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={
        ativo
          ? "flex items-center gap-2.5 rounded-[4px] bg-papel px-3 py-1.5 font-semibold whitespace-nowrap text-capa"
          : "flex items-center gap-2.5 rounded-[4px] px-3 py-1.5 whitespace-nowrap text-capa-tinta transition-colors hover:bg-white/8 hover:text-white"
      }
    >
      {icon}
      {children}
    </Link>
  );
}
