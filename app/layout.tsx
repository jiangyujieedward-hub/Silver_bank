import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Silver Bank",
  description: "Give time. Receive help. A community where every person’s time has equal value.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
