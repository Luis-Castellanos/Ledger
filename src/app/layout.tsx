import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, Spline_Sans_Mono } from "next/font/google";
import { AppAuthProvider } from "@/components/providers/app-auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const splineSansMono = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-spline-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ledger",
    template: "%s · Ledger",
  },
  description: "Private personal finance ledger.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${fraunces.variable} ${instrumentSans.variable} ${splineSansMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeProvider>
          <AppAuthProvider>
            <QueryProvider>
              {children}
              <Toaster position="bottom-right" />
            </QueryProvider>
          </AppAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
