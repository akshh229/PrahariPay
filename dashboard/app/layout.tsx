import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrahariPay — Merchant Dashboard",
  description: "AI-Powered Offline-First Guardian Payment Protocol",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[var(--color-bg-app)] text-[var(--color-text-primary)] overflow-hidden">
        {children}
      </body>
    </html>
  );
}
