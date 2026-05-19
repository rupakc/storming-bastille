import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthGate } from "@/components/auth/AuthGate";
import { Navigation } from "@/components/shared/Navigation";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Storming Bastille — Historical Event Explorer",
  description:
    "Explore the causal chains behind history's pivotal moments. Interactive causal graphs, timelines, and AI-powered narrative analysis.",
  keywords: [
    "history",
    "causal reasoning",
    "historical events",
    "timeline",
    "causal graph",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable}`}
    >
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <AuthProvider>
            <AuthGate>
              <QueryProvider>
                {/* Navigation is only shown for authenticated users (AuthGate
                    renders LoginPage / redirect for unauthenticated users, so
                    Navigation always has a valid user in context here). */}
                <Navigation />
                <main>{children}</main>
              </QueryProvider>
            </AuthGate>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
