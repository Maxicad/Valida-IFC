import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Valida IFC",
  description: "Auditoria BIM/openBIM de arquivos IFC.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
