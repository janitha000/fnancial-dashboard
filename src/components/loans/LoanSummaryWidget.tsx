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
    <div className="rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#1c2026] p-5 shadow-none">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-[8px] bg-[#242932]">
            <Landmark className="h-4 w-4 text-[#38bdf8]" />
          </div>
          <h2 className="text-base font-semibold text-[#f1f5f9]">
            Outstanding Loans
          </h2>
        </div>
        <Link
          href="/loans"
          className="text-xs text-[#94a3b8] hover:text-[#38bdf8] transition font-medium"
        >
          View all →
        </Link>
      </div>

      {/* Total remaining */}
      <div className="mb-4 rounded-[8px] bg-[#14171c] border border-[rgba(255,255,255,0.04)] p-4">
        <p className="text-xs text-[#94a3b8] uppercase tracking-wide mb-1 font-medium">
          Total Remaining Capital
        </p>
        <p className="text-2xl font-bold text-[#eab308] font-mono [font-feature-settings:'tnum']">{fmt(totalRemaining)}</p>
        <p className="text-xs text-[#64748b] mt-1 font-mono">
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
              className="flex items-center justify-between rounded-[8px] bg-[#14171c] border border-[rgba(255,255,255,0.04)] px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <Car className="h-3.5 w-3.5 text-[#38bdf8] shrink-0" />
                <span className="text-sm text-[#f1f5f9] truncate max-w-[160px]">
                  {l.name}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#38bdf8] font-mono [font-feature-settings:'tnum']">
                  {fmt(m.remainingCapital)}
                </p>
                <p className="text-[10px] text-[#94a3b8] font-mono">
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
              className="flex items-center justify-between rounded-[8px] bg-[#14171c] border border-[rgba(255,255,255,0.04)] px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="h-3.5 w-3.5 text-[#eab308] shrink-0" />
                <span className="text-sm text-[#f1f5f9] truncate max-w-[160px]">
                  {l.name}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#eab308] font-mono [font-feature-settings:'tnum']">
                  {fmt(m.outstanding)}
                </p>
                <p className="text-[10px] text-[#94a3b8] font-mono">
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
