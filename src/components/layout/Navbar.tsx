"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, CreditCard, Receipt, TrendingUp, Landmark, BarChart2 } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Income", href: "/income", icon: Wallet },
    { name: "Expenses", href: "/expenses", icon: CreditCard },
    { name: "Loans", href: "/loans", icon: Landmark },
    { name: "Taxes", href: "/taxes", icon: Receipt },
    { name: "Stocks", href: "/stocks", icon: BarChart2 },
    { name: "Wealth", href: "/wealth", icon: TrendingUp },
  ];

  return (
    <div className="w-full sticky top-0 z-50 border-b border-[rgba(255,255,255,0.07)] bg-[#14171c]/90 backdrop-blur-md">
      <nav className="w-full mx-auto max-w-7xl">
        <div className="flex h-16 items-center px-4 md:px-8">
          <Link href="/" className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#38bdf8] to-slate-200 text-xl md:text-2xl mr-10 tracking-tight font-sans">
            Vault
          </Link>
          <div className="flex items-center space-x-6 lg:space-x-8">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-[#38bdf8] flex items-center gap-2 ${
                    isActive ? "text-[#38bdf8]" : "text-[#94a3b8]"
                  }`}
                >
                  <Icon className="h-4 w-4 hidden sm:block" />
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
