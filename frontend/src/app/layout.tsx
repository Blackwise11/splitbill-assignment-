import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "SplitBill — Exact to the last satang",
  description:
    "Shared expenses with deterministic satang allocation, zero-sum balances, and idempotent writes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
