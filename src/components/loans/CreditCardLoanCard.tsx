"use client";

import { useState, useMemo } from "react";
import {
  CreditCard,
  Trash2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  TableProperties,
} from "lucide-react";
import {
  CreditCardLoan,
  getVehicleLoanMetrics,
  buildAmortizationSchedule,
  useLoan,
} from "@/context/LoanContext";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

// Add ordinal suffix to month number (1 → "Jan 2024") using loan start date
function monthLabel(loan: CreditCardLoan, monthIndex: number): string {
  const start = new Date(loan.dateOfLoan);
  const d = new Date(start.getFullYear(), start.getMonth() + monthIndex, 1);
  return d.toLocaleDateString("en-LK", { month: "short", year: "numeric" });
}

export function CreditCardLoanCard({ loan }: { loan: CreditCardLoan }) {
  const { settleCreditCardLoan, deleteCreditCardLoan } = useLoan();
  const [showSettle, setShowSettle] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [settleDate, setSettleDate] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const metrics = getVehicleLoanMetrics(loan);
  const schedule = useMemo(
    () => (showSchedule ? buildAmortizationSchedule(loan) : []),
    [showSchedule, loan]
  );

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await settleCreditCardLoan(loan.id, {
      settleDate,
      settleAmount: parseFloat(settleAmount),
    });
    setLoading(false);
    setShowSettle(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteCreditCardLoan(loan.id);
  };

  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60 transition";
  const labelClass =
    "block text-xs text-muted-foreground mb-1 uppercase tracking-wide";

  const durationYears = Math.floor(loan.duration / 12);
  const durationMonths = loan.duration % 12;
  const durationStr =
    durationYears > 0
      ? `${durationYears}y ${durationMonths > 0 ? durationMonths + "m" : ""}`.trim()
      : `${loan.duration}m`;

  return (
    <div
      className={`rounded-[10px] border bg-[#1c2026] overflow-hidden transition-all duration-200 ${
        metrics.isSettled
          ? "border-[rgba(34,197,94,0.3)] opacity-90"
          : "border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.15)]"
      }`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-[8px] ${
                metrics.isSettled ? "bg-[rgba(34,197,94,0.12)]" : "bg-[#242932]"
              }`}
            >
              <CreditCard
                className={`h-5 w-5 ${
                  metrics.isSettled ? "text-[#22c55e]" : "text-[#38bdf8]"
                }`}
              />
            </div>
            <div>
              <h3 className="font-semibold text-[#f1f5f9] text-sm leading-tight">
                {loan.name}
              </h3>
              <p className="text-xs text-[#94a3b8] mt-0.5 font-mono">
                Since {fmtDate(loan.dateOfLoan)} · {durationStr} ·{" "}
                {loan.interestRate}% p.a.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {metrics.isSettled && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[rgba(34,197,94,0.12)] text-[#22c55e] border border-[rgba(34,197,94,0.2)] text-xs font-mono font-medium">
                <CheckCircle className="h-3 w-3" /> Settled
              </span>
            )}
            {confirmDelete ? (
              <div className="flex gap-1">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 rounded-md text-xs border border-[rgba(255,255,255,0.07)] text-[#94a3b8] hover:bg-[#242932] transition"
                >
                  No
                </button>
                <button
                  onClick={handleDelete}
                  className="px-2 py-1 rounded-md text-xs bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.2)] transition"
                >
                  Delete
                </button>
              </div>
            ) : (
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-md text-[#94a3b8] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.12)] transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Metrics grid — 5 cells */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          <div className="rounded-[8px] bg-[#14171c] border border-[rgba(255,255,255,0.04)] p-3">
            <p className="text-xs text-[#94a3b8] mb-1">Principal</p>
            <p className="text-sm font-semibold text-[#f1f5f9] font-mono [font-feature-settings:'tnum']">
              {fmt(loan.amount)}
            </p>
          </div>
          <div className="rounded-[8px] bg-[#14171c] border border-[rgba(255,255,255,0.04)] p-3">
            <p className="text-xs text-[#94a3b8] mb-1">Monthly</p>
            <p className="text-sm font-semibold text-[#f1f5f9] font-mono [font-feature-settings:'tnum']">
              {fmt(loan.monthlyPayment)}
            </p>
          </div>
          <div className="rounded-[8px] bg-[#14171c] border border-[rgba(255,255,255,0.04)] p-3">
            <p className="text-xs text-[#94a3b8] mb-1">Already Paid</p>
            <p className="text-sm font-semibold text-[#38bdf8] font-mono [font-feature-settings:'tnum']">
              {fmt(metrics.alreadyPaid)}
            </p>
          </div>
          <div className="rounded-[8px] bg-[#14171c] border border-[rgba(255,255,255,0.04)] p-3">
            <p className="text-xs text-[#94a3b8] mb-1">Interest Paid</p>
            <p className="text-sm font-semibold text-[#eab308] font-mono [font-feature-settings:'tnum']">
              {fmt(metrics.totalInterestPaid)}
            </p>
          </div>
          <div className="rounded-[8px] bg-[#14171c] border border-[rgba(255,255,255,0.04)] p-3">
            <p className="text-xs text-[#94a3b8] mb-1">Remaining</p>
            <p
              className={`text-sm font-semibold font-mono [font-feature-settings:'tnum'] ${
                metrics.isSettled ? "text-[#22c55e]" : "text-[#eab308]"
              }`}
            >
              {metrics.isSettled
                ? fmt(loan.settled!.settleAmount)
                : fmt(metrics.remainingCapital)}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-[#94a3b8] mb-1.5 font-mono">
            <span>Repayment progress</span>
            <span>{metrics.percentPaid.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-[rgba(255,255,255,0.07)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                metrics.isSettled ? "bg-[#22c55e]" : "bg-[#38bdf8]"
              }`}
              style={{ width: `${metrics.percentPaid}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#94a3b8] mt-1.5 font-mono">
            <span>
              Total interest:{" "}
              <span className="text-[#eab308]">
                {fmt(metrics.totalInterest)}
              </span>
            </span>
            <span>
              {metrics.monthsElapsed}/{loan.duration} months
            </span>
          </div>
        </div>

        {/* Amortization schedule toggle — only for ongoing loans */}
        {!metrics.isSettled && (
          <div className="mb-4">
            <button
              id={`amortization-toggle-${loan.id}`}
              onClick={() => setShowSchedule((v) => !v)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition group"
            >
              <TableProperties className="h-3.5 w-3.5 group-hover:text-primary transition" />
              {showSchedule ? "Hide" : "Show"} amortization schedule
              {showSchedule ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {showSchedule && (
              <div className="mt-3 rounded-xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#18182b] border-b border-white/10">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                          Month
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">
                          Payment
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium text-yellow-400/70 whitespace-nowrap">
                          Interest
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium text-blue-400/70 whitespace-nowrap">
                          Principal
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">
                          Remaining
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((row, idx) => {
                        const isPast = row.month <= metrics.monthsElapsed;
                        const isCurrent = row.month === metrics.monthsElapsed + 1;
                        return (
                          <tr
                            key={row.month}
                            className={`border-b border-white/5 transition-colors ${
                              isCurrent
                                ? "bg-primary/10 border-primary/20"
                                : isPast
                                ? "opacity-50"
                                : idx % 2 === 0
                                ? "bg-white/[0.02]"
                                : ""
                            }`}
                          >
                            <td className="px-3 py-2 text-left text-muted-foreground whitespace-nowrap">
                              <span className="font-mono">{String(row.month).padStart(2, "0")}</span>
                              <span className="ml-2 text-muted-foreground/60">
                                {monthLabel(loan, row.month - 1)}
                              </span>
                              {isCurrent && (
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-primary/20 text-primary font-medium">
                                  now
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-foreground whitespace-nowrap">
                              {fmt(row.payment)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-yellow-400/80 whitespace-nowrap">
                              {fmt(row.interest)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-blue-400/80 whitespace-nowrap">
                              {fmt(row.principal)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-orange-400/80 whitespace-nowrap">
                              {fmt(row.balance)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settle section */}
        {!metrics.isSettled && (
          <div>
            <button
              id={`settle-cc-${loan.id}`}
              onClick={() => setShowSettle(!showSettle)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition"
            >
              {showSettle ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              Settle this loan
            </button>
            {showSettle && (
              <form
                onSubmit={handleSettle}
                className="mt-3 grid grid-cols-2 gap-3"
              >
                <div>
                  <label className={labelClass}>Settle Date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Settle Amount (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    placeholder={fmt(metrics.remainingCapital)
                      .replace("LKR", "")
                      .trim()}
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSettle(false)}
                    className="flex-1 py-2 rounded-[8px] border border-[rgba(255,255,255,0.07)] bg-transparent hover:bg-[#242932] text-xs text-[#94a3b8] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 rounded-[8px] bg-[#22c55e] hover:bg-[#22c55e]/90 text-xs font-semibold text-[#0f172a] transition disabled:opacity-50"
                  >
                    {loading ? "Saving…" : "Confirm Settlement"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Settled info */}
        {metrics.isSettled && loan.settled && (
          <div className="flex items-center gap-2 text-xs font-mono text-[#22c55e] bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.2)] rounded-[8px] px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Settled on {fmtDate(loan.settled.settleDate)} for{" "}
            {fmt(loan.settled.settleAmount)}
          </div>
        )}
      </div>
    </div>
  );
}
