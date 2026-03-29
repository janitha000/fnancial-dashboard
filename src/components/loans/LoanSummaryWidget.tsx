"use client";

import { Car, CreditCard, Landmark } from "lucide-react";
import Link from "next/link";
import {
  useLoan,
  getVehicleLoanMetrics,
  getOverdraftLoanMetrics,
} from "@/context/LoanContext";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(n);

export function LoanSummaryWidget() {
  const { vehicleLoans, overdraftLoans, isLoaded } = useLoan();

  if (!isLoaded) return null;

  const ongoingVehicle = vehicleLoans.filter(
    (l) => !getVehicleLoanMetrics(l).isSettled
  );
  const activeOD = overdraftLoans.filter(
    (l) => getOverdraftLoanMetrics(l).outstanding > 0
  );

  const totalRemaining =
    ongoingVehicle.reduce(
      (s, l) => s + getVehicleLoanMetrics(l).remainingCapital,
      0
    ) +
    activeOD.reduce(
      (s, l) => s + getOverdraftLoanMetrics(l).outstanding,
      0
    );

  const hasLoans = ongoingVehicle.length > 0 || activeOD.length > 0;

  if (!hasLoans) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/15">
            <Landmark className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Outstanding Loans
          </h2>
        </div>
        <Link
          href="/loans"
          className="text-xs text-muted-foreground hover:text-primary transition"
        >
          View all →
        </Link>
      </div>

      {/* Total remaining */}
      <div className="mb-4 rounded-xl bg-white/5 border border-white/10 p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          Total Remaining Capital
        </p>
        <p className="text-2xl font-bold text-orange-400">{fmt(totalRemaining)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Across {ongoingVehicle.length + activeOD.length} active loan
          {ongoingVehicle.length + activeOD.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Per-loan breakdown */}
      <div className="space-y-2">
        {ongoingVehicle.map((l) => {
          const m = getVehicleLoanMetrics(l);
          return (
            <div
              key={l.id}
              className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <Car className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span className="text-sm text-foreground truncate max-w-[160px]">
                  {l.name}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-blue-400">
                  {fmt(m.remainingCapital)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {m.percentPaid.toFixed(0)}% paid
                </p>
              </div>
            </div>
          );
        })}
        {activeOD.map((l) => {
          const m = getOverdraftLoanMetrics(l);
          return (
            <div
              key={l.id}
              className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span className="text-sm text-foreground truncate max-w-[160px]">
                  {l.name}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-orange-400">
                  {fmt(m.outstanding)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Outstanding
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
