import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { FinanceProvider } from "@/context/FinanceContext";
import { WealthProvider } from "@/context/WealthContext";
import { LoanProvider } from "@/context/LoanContext";
import { TaxProvider } from "@/context/TaxContext";
import { ExpenseProvider } from "@/context/ExpenseContext";
import { IncomeProvider } from "@/context/IncomeContext";
import { checkAuth } from "@/actions/auth";
import { LockScreen } from "@/components/auth/LockScreen";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Financial Dashboard",
  description: "Personal finance and wealth tracking dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isAuthenticated = await checkAuth();
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased selection:bg-primary/30">
        {/* Glow effect isolated in background string */}
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
        {isAuthenticated ? (
          <FinanceProvider>
            <WealthProvider>
              <LoanProvider>
                <TaxProvider>
                  <IncomeProvider>
                    <ExpenseProvider>
                      <Navbar />
                      <main className="flex-1 p-4 md:p-6 md:p-8 max-w-7xl mx-auto w-full relative z-10 [&_.bg-card]:backdrop-blur-xl [&_.bg-card]:shadow-2xl [&_.bg-card]:shadow-black/20 [&_.bg-card]:border-white/10">
                        {children}
                      </main>
                    </ExpenseProvider>
                  </IncomeProvider>
                </TaxProvider>
              </LoanProvider>
            </WealthProvider>
          </FinanceProvider>
        ) : (
          <LockScreen />
        )}
      </body>
    </html>
  );
}
