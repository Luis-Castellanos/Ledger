import type { Metadata } from "next";
import { AppAuthProvider } from "@/components/providers/app-auth-provider";
import { DEFAULT_THEME, themeInitScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vault",
  description: "Private personal finance ledger.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full">
        <AppAuthProvider>{children}</AppAuthProvider>
      </body>
    </html>
  );
}
