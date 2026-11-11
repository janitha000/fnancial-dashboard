"use client";

import { useState } from "react";
import {
  CreditCard,
  Trash2,
  Plus,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import {
  OverdraftLoan,
  getOverdraftLoanMetrics,
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

type ActiveForm = "draw" | "settle" | "interest" | null;

type TimelineItem =
  | { kind: "draw"; id: string; date: string; amount: number }
  | { kind: "settle"; id: string; date: string; amount: number }
  | { kind: "interest"; id: string; date: string; amount: number };

export function OverdraftLoanCard({ loan }: { loan: OverdraftLoan }) {
  const {
    addOverdraftDrawdown,
    deleteOverdraftDrawdown,
    addOverdraftSettlement,
    deleteOverdraftSettlement,
    addOverdraftInterest,
    deleteOverdraftInterest,
    deleteOverdraftLoan,
  } = useLoan();

  const [activeForm, setActiveForm] = useState<ActiveForm>(null);
  const [formDate, setFormDate] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDeleteLoan, setConfirmDeleteLoan] = useState(false);

  const metrics = getOverdraftLoanMetrics(loan);
  const accruals = loan.interestAccruals ?? [];
  const hasActivity =
    loan.drawdowns.length > 0 ||
    loan.settlements.length > 0 ||
    accruals.length > 0;

  const timeline: TimelineItem[] = [
    ...loan.drawdowns.map((d) => ({ kind: "draw" as const, ...d })),
    ...loan.settlements.map((s) => ({ kind: "settle" as const, ...s })),
    ...accruals.map((a) => ({ kind: "interest" as const, ...a })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeForm) return;
    setLoading(true);
    const payload = { date: formDate, amount: parseFloat(formAmount) };
    if (activeForm === "draw") await addOverdraftDrawdown(loan.id, payload);
    else if (activeForm === "settle") await addOverdraftSettlement(loan.id, payload);
    else await addOverdraftInterest(loan.id, payload);
    setLoading(false);
    setFormDate("");
    setFormAmount("");
    setActiveForm(null);
  };

  const handleDeleteItem = (item: TimelineItem) => {
    if (item.kind === "draw") deleteOverdraftDrawdown(loan.id, item.id);
    else if (item.kind === "settle") deleteOverdraftSettlement(loan.id, item.id);
    else deleteOverdraftInterest(loan.id, item.id);
  };

  const handleDeleteLoan = async () => {
    if (!confirmDeleteLoan) { setConfirmDeleteLoan(true); return; }
    await deleteOverdraftLoan(loan.id);
  };

  const inputClass =
    "w-full bg-[#14171c] border border-[rgba(255,255,255,0.07)] rounded-[8px] px-3 py-2 text-sm text-[#f1f5f9] placeholder:text-[#64748b] focus:outline-none focus:ring-1 focus:ring-[#38bdf8] font-mono transition";
  const labelClass = "block text-xs text-[#94a3b8] mb-1 uppercase tracking-wide font-medium";

  const isNearLimit = metrics.percentUsed >= 90;

  const formConfig = {
    draw: {
      label: "Withdraw / Draw",
      icon: <ArrowDownLeft className="h-4 w-4 text-[#ef4444]" />,
      color: "text-[#ef4444]",
      border: "border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)]",
      btn: "bg-[#ef4444] hover:bg-[#ef4444]/90 text-[#f1f5f9]",
      confirmLabel: "Confirm Draw",
    },
    settle: {
      label: "Settle Amount",
      icon: <ArrowUpRight className="h-4 w-4 text-[#22c55e]" />,
      color: "text-[#22c55e]",
      border: "border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.06)]",
      btn: "bg-[#22c55e] hover:bg-[#22c55e]/90 text-[#0f172a]",
      confirmLabel: "Confirm Settlement",
    },
    interest: {
      label: "Interest Accrued",
      icon: <TrendingUp className="h-4 w-4 text-[#eab308]" />,
      color: "text-[#eab308]",
      border: "border-[rgba(234,179,8,0.2)] bg-[rgba(234,179,8,0.06)]",
      btn: "bg-[#eab308] hover:bg-[#eab308]/90 text-[#0f172a]",
      confirmLabel: "Record Interest",
    },
  };

  const timelineStyle = {
    draw: {
      bg: "bg-[rgba(239,68,68,0.12)]",
      icon: <ArrowDownLeft className="h-3 w-3 text-[#ef4444]" />,
      label: "Draw",
      color: "text-[#ef4444]",
      sign: "−",
    },
    settle: {
      bg: "bg-[rgba(34,197,94,0.12)]",
      icon: <ArrowUpRight className="h-3 w-3 text-[#22c55e]" />,
      label: "Settlement",
      color: "text-[#22c55e]",
      sign: "+",
    },
    interest: {
      bg: "bg-[rgba(234,179,8,0.12)]",
      icon: <TrendingUp className="h-3 w-3 text-[#eab308]" />,
      label: "Interest",
      color: "text-[#eab308]",
      sign: "",
    },
  };

  return (
    <div
      className={`rounded-[10px] border bg-[#1c2026] overflow-hidden transition-all duration-200 ${
        isNearLimit
          ? "border-[rgba(239,68,68,0.3)]"
          : "border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.15)]"
      }`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[8px] bg-[#242932]">
              <CreditCard className="h-5 w-5 text-[#38bdf8]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#f1f5f9] text-sm leading-tight">
                {loan.name}
              </h3>
              <p className="text-xs text-[#94a3b8] mt-0.5 font-mono">
                Since {fmtDate(loan.startDate)} · OD Limit:{" "}
                <span className="text-[#38bdf8] font-medium">
                  {fmt(loan.overdraftLimit)}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isNearLimit && (
              <span className="px-2.5 py-1 rounded-[6px] bg-[rgba(239,68,68,0.12)] text-[#ef4444] border border-[rgba(239,68,68,0.2)] text-xs font-mono font-medium">
                Near Limit
              </span>
            )}
            {confirmDeleteLoan ? (
              <div className="flex gap-1">
                <button
                  onClick={() => setConfirmDeleteLoan(false)}
                  className="px-2 py-1 rounded-md text-xs border border-[rgba(255,255,255,0.07)] text-[#94a3b8] hover:bg-[#242932] transition"
                >
                  No
                </button>
                <button
                  onClick={handleDeleteLoan}
                  className="px-2 py-1 rounded-md text-xs bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.2)] transition"
                >
                  Delete
                </button>
              </div>
            ) : (
              <button
                onClick={handleDeleteLoan}
                className="p-1.5 rounded-md text-[#94a3b8] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.12)] transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div className="rounded-[8px] bg-[#14171c] border border-[rgba(255,255,255,0.04)] p-3">
            <p className="text-xs text-[#94a3b8] mb-1">OD Limit</p>
            <p className="text-sm font-semibold text-[#f1f5f9] font-mono [font-feature-settings:'tnum']">{fmt(loan.overdraftLimit)}</p>
          </div>
          <div className="rounded-[8px] bg-[#14171c] border border-[rgba(255,255,255,0.04)] p-3">
            <p className="text-xs text-[#94a3b8] mb-1">Total Drawn</p>
            <p className="text-sm font-semibold text-[#ef4444] font-mono [font-feature-settings:'tnum']">{fmt(metrics.totalTaken)}</p>
          </div>
          <div className="rounded-[8px] bg-[#14171c] border border-[rgba(255,255,255,0.04)] p-3">
            <p className="text-xs text-[#94a3b8] mb-1">Total Settled</p>
            <p className="text-sm font-semibold text-[#22c55e] font-mono [font-feature-settings:'tnum']">{fmt(metrics.totalSettled)}</p>
          </div>
          <div className="rounded-[8px] bg-[#14171c] border border-[rgba(255,255,255,0.04)] p-3">
            <p className="text-xs text-[#94a3b8] mb-1">Outstanding</p>
            <p className={`text-sm font-semibold font-mono [font-feature-settings:'tnum'] ${metrics.outstanding > 0 ? "text-[#eab308]" : "text-[#22c55e]"}`}>
              {fmt(metrics.outstanding)}
            </p>
          </div>
        </div>

        {/* Interest accrued + remaining OD */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-[8px] bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.15)] p-3">
            <p className="text-xs text-[#94a3b8] mb-1">Interest Accrued</p>
            <p className="text-sm font-semibold text-[#eab308] font-mono [font-feature-settings:'tnum']">{fmt(metrics.totalInterestAccrued)}</p>
          </div>
          <div
            className={`rounded-[8px] p-3 ${
              metrics.remainingODAvailable <= 0
                ? "bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)]"
                : "bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.15)]"
            }`}
          >
            <p className="text-xs text-[#94a3b8] mb-1">Remaining OD Available</p>
            <p className={`text-sm font-semibold font-mono [font-feature-settings:'tnum'] ${metrics.remainingODAvailable <= 0 ? "text-[#ef4444]" : "text-[#22c55e]"}`}>
              {fmt(metrics.remainingODAvailable)}
            </p>
          </div>
        </div>

        {/* OD utilization bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-[#94a3b8] mb-1.5 font-mono">
            <span>OD Utilization</span>
            <span className={metrics.percentUsed >= 90 ? "text-[#ef4444]" : metrics.percentUsed >= 70 ? "text-[#eab308]" : "text-[#94a3b8]"}>
              {metrics.percentUsed.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[rgba(255,255,255,0.07)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                metrics.percentUsed >= 90 ? "bg-[#ef4444]" : metrics.percentUsed >= 70 ? "bg-[#eab308]" : "bg-[#22c55e]"
              }`}
              style={{ width: `${metrics.percentUsed}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#94a3b8] mt-1.5 font-mono">
            <span>Outstanding: {fmt(metrics.outstanding)}</span>
            <span>Limit: {fmt(loan.overdraftLimit)}</span>
          </div>
        </div>

        {/* Action buttons */}
        {activeForm === null && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              id={`od-draw-${loan.id}`}
              onClick={() => setActiveForm("draw")}
              className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.2)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] text-xs font-medium transition"
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              Withdraw / Draw
            </button>
            <button
              id={`od-settle-${loan.id}`}
              onClick={() => setActiveForm("settle")}
              className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[rgba(34,197,94,0.1)] hover:bg-[rgba(34,197,94,0.2)] border border-[rgba(34,197,94,0.2)] text-[#22c55e] text-xs font-medium transition"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Settle
            </button>
            <button
              id={`od-interest-${loan.id}`}
              onClick={() => setActiveForm("interest")}
              className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[rgba(234,179,8,0.1)] hover:bg-[rgba(234,179,8,0.2)] border border-[rgba(234,179,8,0.2)] text-[#eab308] text-xs font-medium transition"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Add Interest
            </button>
          </div>
        )}

        {/* Inline form */}
        {activeForm !== null && (
          <form onSubmit={handleSubmit} className="mb-4">
            <div className={`rounded-xl border p-4 ${formConfig[activeForm].border}`}>
              <div className="flex items-center gap-2 mb-3">
                {formConfig[activeForm].icon}
                <span className={`text-sm font-semibold ${formConfig[activeForm].color}`}>
                  {formConfig[activeForm].label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Amount (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => { setActiveForm(null); setFormDate(""); setFormAmount(""); }}
                  className="flex-1 py-2 rounded-[8px] border border-[rgba(255,255,255,0.07)] bg-transparent hover:bg-[#242932] text-xs text-[#94a3b8] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 py-2 rounded-[8px] text-xs font-semibold transition disabled:opacity-50 ${formConfig[activeForm].btn}`}
                >
                  {loading ? "Saving…" : formConfig[activeForm].confirmLabel}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Timeline */}
        {hasActivity && (
          <div>
            <p className="text-xs text-[#94a3b8] uppercase tracking-wide mb-2 font-medium">
              Transaction History
            </p>
            <div className="space-y-1.5">
              {timeline.map((item) => {
                const style = timelineStyle[item.kind];
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-[8px] bg-[#14171c] border border-[rgba(255,255,255,0.04)] px-3 py-2 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1 rounded-[6px] ${style.bg}`}>{style.icon}</div>
                      <div>
                        <span className={`text-xs font-medium ${style.color}`}>
                          {style.label}
                        </span>
                        <span className="text-xs text-[#94a3b8] ml-2 font-mono">
                          {fmtDate(item.date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium font-mono [font-feature-settings:'tnum'] ${style.color}`}>
                        {style.sign}{fmt(item.amount)}
                      </span>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-1 rounded text-[#94a3b8] opacity-0 group-hover:opacity-100 hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.12)] transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!hasActivity && (
          <p className="text-xs text-muted-foreground/60 text-center py-2">
            No transactions yet. Use the buttons above to record draws, settlements, or interest.
          </p>
        )}
      </div>
    </div>
  );
}
