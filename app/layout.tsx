import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import { COIN_NAME, EXPLORER_TITLE } from "@/lib/config";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: EXPLORER_TITLE, template: `%s · ${EXPLORER_TITLE}` },
  description: `Block explorer for ${COIN_NAME}: blocks, transactions and addresses.`,
};

export const viewport: Viewport = { themeColor: "#0b0e14" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>
        <Nav />
        <main className="mx-auto w-full max-w-7xl px-3 pb-12 pt-4 sm:px-6">{children}</main>
        <footer className="border-t border-line py-4 text-center text-xs text-faint">
          {EXPLORER_TITLE} · {COIN_NAME} · data from Blockbook
        </footer>
      </body>
    </html>
  );
}
