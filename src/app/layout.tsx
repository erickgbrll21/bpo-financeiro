import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "BC Consultores · BPO Financeiro", template: "%s · BPO Financeiro" },
  description: "Gestão financeira multiempresa da BC Consultores.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${publicSans.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
