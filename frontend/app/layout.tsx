import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DokAssist — Protocolcoach voor de huisartspraktijk",
  description: "AI-ondersteunde protocolcoach voor medewerkers in de huisartspraktijk",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
