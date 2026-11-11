import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { FinanceProvider } from "@/context/FinanceContext";
import { WealthProvider } from "@/context/WealthContext";
import { LoanProvider } from "@/context/LoanContext";
import { TaxProvider } from "@/context/TaxContext";
import { ExpenseProvider } from "@/context/ExpenseContext";
import { IncomeProvider } from "@/context/IncomeContext";
import { StocksProvider } from "@/context/StocksContext";
import { checkAuth } from "@/actions/auth";
import { LockScreen } from "@/components/auth/LockScreen";

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
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
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased dark`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#14171c] text-[#f1f5f9] antialiased selection:bg-[#38bdf8]/30">
        <div className="fixed inset-0 z-[-1] bg-[#14171c] pointer-events-none"></div>
        {isAuthenticated ? (
          <FinanceProvider>
            <WealthProvider>
              <LoanProvider>
                <TaxProvider>
                    <IncomeProvider>
                      <StocksProvider>
                        <ExpenseProvider>
                          <Navbar />
                          <main className="flex-1 p-4 md:p-6 md:p-8 max-w-7xl mx-auto w-full relative z-10">
                            {children}
                          </main>
                        </ExpenseProvider>
                      </StocksProvider>
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
