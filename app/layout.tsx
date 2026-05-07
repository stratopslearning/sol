import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { withBasePath } from "@/lib/basePath";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SOL — Adaptive Learning, Considered.",
    template: "%s · SOL",
  },
  description:
    "An academic-grade learning management system. Author quizzes, run sections, and grade with AI-assisted rigor.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl={withBasePath("/login")}
      signUpUrl={withBasePath("/signup")}
    >
      <html
        lang="en"
        suppressHydrationWarning
        className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}
      >
        <body className="font-sans antialiased min-h-screen bg-paper text-ink">
          <ThemeProvider>
            <a href="#main" className="skip-to-main">
              Skip to main content
            </a>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
