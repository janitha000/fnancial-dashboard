"use client";

import { useState } from "react";
import { useLoan, getVehicleLoanMetrics } from "@/context/LoanContext";
import { AddLoanForm } from "@/components/loans/AddLoanForm";
import { VehicleLoanCard } from "@/components/loans/VehicleLoanCard";
import { OverdraftLoanCard } from "@/components/loans/OverdraftLoanCard";
import { LoanDashboard } from "@/components/loans/LoanDashboard";
import { Car, CreditCard, Loader2, Eye, EyeOff } from "lucide-react";

export function LoansPageClient() {
  const { vehicleLoans, overdraftLoans, isLoaded } = useLoan();
  const [showSettled, setShowSettled] = useState(false);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filter vehicle loans based on toggle
  const settledVehicleLoans = vehicleLoans.filter((l) => getVehicleLoanMetrics(l).isSettled);
  const activeVehicleLoans = vehicleLoans.filter((l) => !getVehicleLoanMetrics(l).isSettled);
  const visibleVehicleLoans = showSettled ? vehicleLoans : activeVehicleLoans;

  const hasAnyLoan = vehicleLoans.length > 0 || overdraftLoans.length > 0;
  const hasSettledLoans = settledVehicleLoans.length > 0;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Loans
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track your vehicle loans and overdraft facilities
          </p>
        </div>

        {/* Show settled toggle — only visible when there are settled loans */}
        {hasSettledLoans && (
          <button
            id="toggle-settled-loans"
            onClick={() => setShowSettled((v) => !v)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all duration-200 shrink-0 mt-1 ${
              showSettled
                ? "bg-green-500/15 border-green-500/30 text-green-400 hover:bg-green-500/20"
                : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            }`}
          >
            {showSettled ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
            {showSettled ? "Hiding settled" : "Show settled"}
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                showSettled
                  ? "bg-green-500/20 text-green-400"
                  : "bg-white/10 text-muted-foreground"
              }`}
            >
              {settledVehicleLoans.length}
            </span>
          </button>
        )}
      </div>

      {/* Add form */}
      <AddLoanForm />

      {/* Dashboard summary — passes showSettled so it filters correctly */}
      {hasAnyLoan && <LoanDashboard showSettled={showSettled} />}

      {/* Vehicle Loans */}
      {visibleVehicleLoans.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg bg-blue-500/15">
              <Car className="h-4 w-4 text-blue-400" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Vehicle Loans</h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">
              {visibleVehicleLoans.length}
              {!showSettled && settledVehicleLoans.length > 0 && (
                <span className="text-muted-foreground font-normal">
                  {" "}/ {vehicleLoans.length}
                </span>
              )}
            </span>
          </div>
          <div className="grid gap-4">
            {visibleVehicleLoans.map((loan) => (
              <VehicleLoanCard key={loan.id} loan={loan} />
            ))}
          </div>

          {/* Faded "settled loans hidden" indicator */}
          {!showSettled && settledVehicleLoans.length > 0 && (
            <button
              onClick={() => setShowSettled(true)}
              className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-white/10 text-xs text-muted-foreground hover:text-foreground hover:border-white/20 transition flex items-center justify-center gap-2"
            >
              <EyeOff className="h-3.5 w-3.5" />
              {settledVehicleLoans.length} settled loan
              {settledVehicleLoans.length > 1 ? "s" : ""} hidden — click to show
            </button>
          )}
        </section>
      )}

      {/* Overdraft Loans */}
      {overdraftLoans.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg bg-orange-500/15">
              <CreditCard className="h-4 w-4 text-orange-400" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Overdraft Loans</h2>
            <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-xs font-medium">
              {overdraftLoans.length}
            </span>
          </div>
          <div className="grid gap-4">
            {overdraftLoans.map((loan) => (
              <OverdraftLoanCard key={loan.id} loan={loan} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!hasAnyLoan && (
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 mb-4">
            <CreditCard className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          </div>
          <p className="text-muted-foreground text-sm">No loans added yet.</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            Click &ldquo;Add Loan&rdquo; above to get started.
          </p>
        </div>
      )}
    </div>
  );
}
