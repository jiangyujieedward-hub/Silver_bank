import "./silver-care.css";
import "./partners.css";
import type { Metadata } from "next";
import "./globals.css";
import "./silver-landing.css";

export const metadata: Metadata = {
  title: "Silver⁺ | Wellbeing. Community. Together.",
  description: "Silver⁺ connects Silver Bank community time-sharing with Silver Care wellbeing support. Contribute, connect and live independently.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/images/brand/silver-plus.jpeg",
    shortcut: "/images/brand/silver-plus.jpeg",
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
