import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aprobaciones de Facturas",
  description: "Dashboard interno de aprobación de facturas electrónicas",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.cdnfonts.com/css/segoe-ui-4"
        />
      </head>
      <body className="min-h-[100dvh] bg-neutral-50 text-neutral-900">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
