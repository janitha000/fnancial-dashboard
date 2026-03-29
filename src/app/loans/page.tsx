import { LoansPageClient } from "./LoansPageClient";

export const metadata = {
  title: "Loans · Vault",
  description: "Track and manage your vehicle loans and overdraft facilities",
};

export default function LoansPage() {
  return <LoansPageClient />;
}
