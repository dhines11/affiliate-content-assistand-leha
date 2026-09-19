import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Affiliate Content Assistant",
  description: "Turn any product into content that sells.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
