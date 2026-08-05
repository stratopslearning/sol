import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { authLocalization } from "@/components/auth/auth-localization";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  ),
  title: {
    default: "SOL",
    template: "%s · SOL",
  },
  description:
    "Quizzes, feedback, and discussion for faculty and students — with clear scoring on subjective work you can review together.",
  openGraph: {
    title: "SOL",
    description:
      "Coursework for everyone at the table. Clear quizzes, visible feedback, shared progress.",
    siteName: "SOL",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SOL",
    description:
      "Coursework for everyone at the table. Clear quizzes, visible feedback, shared progress.",
  },
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
      localization={authLocalization}
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
