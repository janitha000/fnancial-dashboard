"use client";

import { useState } from "react";
import { Car, CreditCard } from "lucide-react";
import {
  VehicleLoan,
  OverdraftLoan,
  CreditCardLoan,
  getVehicleLoanMetrics,
  getOverdraftLoanMetrics,
  useLoan,
} from "@/context/LoanContext";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(n);

// Financial year: Apr–Mar. Given a date, returns "YYYY/YYYY" string e.g. "2024/2025"
function getFY(date: Date): string {
  const m = date.getMonth(); // 0=Jan
  const y = date.getFullYear();
  return m >= 3 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

function getAllFYs(vehicleLoans: VehicleLoan[], overdraftLoans: OverdraftLoan[], creditCardLoans: CreditCardLoan[]): string[] {
  const fys = new Set<string>();
  vehicleLoans.forEach((l) => fys.add(getFY(new Date(l.dateOfLoan))));
  overdraftLoans.forEach((l) => fys.add(getFY(new Date(l.startDate))));
  creditCardLoans.forEach((l) => fys.add(getFY(new Date(l.dateOfLoan))));
  // Add current FY always
  fys.add(getFY(new Date()));
  return Array.from(fys).sort().reverse();
}

function inFY(dateStr: string, fy: string): boolean {
  const d = new Date(dateStr);
  return getFY(d) === fy;
}

type DashSummary = {
  totalLoanAmount: number;
  alreadyPaid: number;
  interestPaid: number;
  settledAmount: number;
  paymentPercent: number;
};

function computeSummary(
  vehicleLoans: VehicleLoan[],
  overdraftLoans: OverdraftLoan[],
  creditCardLoans: CreditCardLoan[],
  filterFn: (dateStr: string) => boolean,
  showSettled: boolean
): DashSummary {
  let totalLoanAmount = 0;
  let alreadyPaid = 0;
  let interestPaid = 0;
  let settledAmount = 0;

  vehicleLoans
    .filter((l) => filterFn(l.dateOfLoan))
    .filter((l) => showSettled || !getVehicleLoanMetrics(l).isSettled)
    .forEach((l) => {
      const m = getVehicleLoanMetrics(l);
      totalLoanAmount += l.amount;
      alreadyPaid += m.alreadyPaid;
      interestPaid += m.totalInterestPaid;
      if (l.settled) settledAmount += l.settled.settleAmount;
    });

  overdraftLoans
    .filter((l) => filterFn(l.startDate))
    .forEach((l) => {
      const m = getOverdraftLoanMetrics(l);
      totalLoanAmount += m.outstanding;      // only what's currently owed
      interestPaid += m.totalInterestAccrued; // only interest
      // alreadyPaid and settledAmount are not included for OD
    });

  const totalPayable = vehicleLoans
    .filter((l) => filterFn(l.dateOfLoan))
    .filter((l) => showSettled || !getVehicleLoanMetrics(l).isSettled)
    .reduce((s, l) => s + l.monthlyPayment * l.duration, 0);

  const ccPayable = creditCardLoans
    .filter((l) => filterFn(l.dateOfLoan))
    .filter((l) => showSettled || !getVehicleLoanMetrics(l as any).isSettled)
    .reduce((s, l) => s + l.monthlyPayment * l.duration, 0);

  const fullPayable = totalPayable + ccPayable;
  // OD not included in payable — progress bar is vehicle/CC loans only

  const paymentPercent = fullPayable > 0 ? Math.min(100, (alreadyPaid / fullPayable) * 100) : 0;

  return { totalLoanAmount, alreadyPaid, interestPaid, settledAmount, paymentPercent };
}

type MetricCardProps = { label: string; value: string; sub?: string; accent?: string };
function MetricCard({ label, value, sub, accent = "text-foreground" }: MetricCardProps) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export function LoanDashboard({ showSettled }: { showSettled: boolean }) {
  const { vehicleLoans, overdraftLoans, creditCardLoans } = useLoan();
  const [tab, setTab] = useState<"yearly" | "lifetime">("lifetime");

  const allFYs = getAllFYs(vehicleLoans, overdraftLoans, creditCardLoans);
  const [selectedFY, setSelectedFY] = useState(allFYs[0] ?? getFY(new Date()));

  const lifetimeSummary = computeSummary(vehicleLoans, overdraftLoans, creditCardLoans, () => true, showSettled);
  const yearlySummary = computeSummary(vehicleLoans, overdraftLoans, creditCardLoans, (d) => inFY(d, selectedFY), showSettled);

  const summary = tab === "yearly" ? yearlySummary : lifetimeSummary;

  const settledNote = !showSettled ? (
    <span className="text-xs text-muted-foreground/60 font-normal"> (excl. settled)</span>
  ) : null;

  // Ongoing loans for remaining capital breakdown (not filtered by FY/tab — always current state)
  const ongoingVehicle = vehicleLoans.filter((l) => !getVehicleLoanMetrics(l).isSettled);
  const ongoingCC = creditCardLoans.filter((l) => !getVehicleLoanMetrics(l as any).isSettled);
  const activeOD = overdraftLoans.filter((l) => getOverdraftLoanMetrics(l).outstanding > 0);
  const totalRemaining =
    ongoingVehicle.reduce((s, l) => s + getVehicleLoanMetrics(l).remainingCapital, 0) +
    ongoingCC.reduce((s, l) => s + getVehicleLoanMetrics(l as any).remainingCapital, 0) +
    activeOD.reduce((s, l) => s + getOverdraftLoanMetrics(l).outstanding, 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-foreground">
          Loan Dashboard{settledNote}
        </h2>
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 gap-1">
            <button
              id="dash-tab-yearly"
              onClick={() => setTab("yearly")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "yearly" ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              Yearly
            </button>
            <button
              id="dash-tab-lifetime"
              onClick={() => setTab("lifetime")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "lifetime" ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              Lifetime
            </button>
          </div>

          {/* FY selector (only for yearly tab) */}
          {tab === "yearly" && allFYs.length > 1 && (
            <select
              id="dash-fy-select"
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/60 transition"
            >
              {allFYs.map((fy) => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-5">
        <MetricCard
          label="Full Loan Amount"
          value={fmt(summary.totalLoanAmount)}
          accent="text-foreground"
        />
        <MetricCard
          label="Already Paid"
          value={fmt(summary.alreadyPaid)}
          sub={`${summary.paymentPercent.toFixed(1)}% of total`}
          accent="text-blue-400"
        />
        <MetricCard
          label="Interest Paid"
          value={fmt(summary.interestPaid)}
          accent="text-yellow-400"
        />
        <MetricCard
          label="Settled Amount"
          value={fmt(summary.settledAmount)}
          accent="text-green-400"
        />
        <MetricCard
          label="Remaining Outstanding"
          value={fmt(totalRemaining)}
          accent="text-orange-400" // matched to the orange text in breakdown
        />
      </div>

      {/* Overall progress bar */}
      {summary.totalLoanAmount > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Overall repayment progress ({tab === "yearly" ? selectedFY : "all time"})</span>
            <span>{summary.paymentPercent.toFixed(1)}%</span>
          </div>
          <div className="h-3 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-700"
              style={{ width: `${summary.paymentPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Remaining capital breakdown — ongoing loans only */}
      {(ongoingVehicle.length > 0 || activeOD.length > 0 || ongoingCC.length > 0) && (
        <div className="border-t border-white/10 pt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Remaining Capital (ongoing loans)
            </p>
            <p className="text-sm font-bold text-orange-400">{fmt(totalRemaining)}</p>
          </div>
          <div className="space-y-2">
            {ongoingVehicle.map((l) => {
              const m = getVehicleLoanMetrics(l);
              return (
                <div key={l.id} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
                  <Car className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span className="text-sm text-foreground flex-1 truncate">{l.name}</span>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-blue-400">{fmt(m.remainingCapital)}</p>
                    <p className="text-[10px] text-muted-foreground">{m.percentPaid.toFixed(0)}% paid · {l.duration - m.monthsElapsed}mo left</p>
                  </div>
                </div>
              );
            })}
            {ongoingCC.map((l) => {
              const m = getVehicleLoanMetrics(l as any);
              return (
                <div key={l.id} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
                  <CreditCard className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span className="text-sm text-foreground flex-1 truncate">{l.name}</span>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-purple-400">{fmt(m.remainingCapital)}</p>
                    <p className="text-[10px] text-muted-foreground">{m.percentPaid.toFixed(0)}% paid · {l.duration - m.monthsElapsed}mo left</p>
                  </div>
                </div>
              );
            })}
            {activeOD.map((l) => {
              const m = getOverdraftLoanMetrics(l);
              return (
                <div key={l.id} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
                  <CreditCard className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                  <span className="text-sm text-foreground flex-1 truncate">{l.name}</span>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-orange-400">{fmt(m.outstanding)}</p>
                    <p className="text-[10px] text-muted-foreground">{m.percentUsed.toFixed(0)}% utilized</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {summary.totalLoanAmount === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No loans found for {tab === "yearly" ? `FY ${selectedFY}` : "this period"}.
        </p>
      )}
    </div>
  );
}

