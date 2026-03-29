"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, CreditCard, Receipt, TrendingUp, Upload, Landmark } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Data", href: "/data", icon: Upload },
    { name: "Income", href: "/income", icon: Wallet },
    { name: "Expenses", href: "/expenses", icon: CreditCard },
    { name: "Loans", href: "/loans", icon: Landmark },
    { name: "Taxes", href: "/taxes", icon: Receipt },
    { name: "Wealth", href: "/wealth", icon: TrendingUp },
  ];

  return (
    <div className="w-full sticky top-0 z-50 border-b border-white/10 bg-background/60 backdrop-blur-2xl">
      <nav className="w-full mx-auto max-w-7xl">
        <div className="flex h-16 items-center px-4 md:px-8">
          <Link href="/" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400 text-xl md:text-2xl mr-10 tracking-tighter">
          Vault
        </Link>
        <div className="flex items-center space-x-6 lg:space-x-8">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-base font-medium transition-colors hover:text-primary flex items-center gap-2.5 ${
                  pathname === link.href ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5 hidden sm:block" />
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
