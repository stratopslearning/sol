import type { Metadata } from "next";
// Fonts via next/font: files are downloaded at build and self-hosted from our
// origin at runtime (no fonts.googleapis.com requests from browsers).
import {
  Fraunces,
  Instrument_Sans,
  Instrument_Serif,
  Inter,
  JetBrains_Mono,
  Manrope,
} from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { authLocalization } from "@/components/auth/auth-localization";
import { TimeZoneProvider } from "@/components/timezone/TimeZoneProvider";
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

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
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
    "The AI teaching layer for the LMS you already use. The operating system for teaching. Build courses from your materials, tutor from your course only, assess with integrity, and see what to reteach.",
  openGraph: {
    title: "SOL",
    description:
      "The AI teaching layer for the LMS you already use. The operating system for teaching.",
    siteName: "SOL",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SOL",
    description:
      "The AI teaching layer for the LMS you already use. The operating system for teaching.",
  },
};

export default function RootLayout({
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
        className={`${fraunces.variable} ${instrumentSans.variable} ${instrumentSerif.variable} ${GeistSans.variable} ${inter.variable} ${manrope.variable} ${jetbrainsMono.variable}`}
      >
        <body className="font-sans antialiased min-h-screen bg-paper text-ink">
          <TimeZoneProvider>
            <ThemeProvider>
              <a href="#main" className="skip-to-main">
                Skip to main content
              </a>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </ThemeProvider>
          </TimeZoneProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
