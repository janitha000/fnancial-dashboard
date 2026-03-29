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
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60 transition";
  const labelClass = "block text-xs text-muted-foreground mb-1 uppercase tracking-wide";

  const isNearLimit = metrics.percentUsed >= 90;

  const formConfig = {
    draw: {
      label: "Withdraw / Draw",
      icon: <ArrowDownLeft className="h-4 w-4 text-red-400" />,
      color: "text-red-400",
      border: "border-red-500/20 bg-red-500/5",
      btn: "bg-red-500/80 hover:bg-red-500",
      confirmLabel: "Confirm Draw",
    },
    settle: {
      label: "Settle Amount",
      icon: <ArrowUpRight className="h-4 w-4 text-green-400" />,
      color: "text-green-400",
      border: "border-green-500/20 bg-green-500/5",
      btn: "bg-green-500/80 hover:bg-green-500",
      confirmLabel: "Confirm Settlement",
    },
    interest: {
      label: "Interest Accrued",
      icon: <TrendingUp className="h-4 w-4 text-yellow-400" />,
      color: "text-yellow-400",
      border: "border-yellow-500/20 bg-yellow-500/5",
      btn: "bg-yellow-500/80 hover:bg-yellow-500",
      confirmLabel: "Record Interest",
    },
  };

  const timelineStyle = {
    draw: {
      bg: "bg-red-500/15",
      icon: <ArrowDownLeft className="h-3 w-3 text-red-400" />,
      label: "Draw",
      color: "text-red-400",
      sign: "−",
    },
    settle: {
      bg: "bg-green-500/15",
      icon: <ArrowUpRight className="h-3 w-3 text-green-400" />,
      label: "Settlement",
      color: "text-green-400",
      sign: "+",
    },
    interest: {
      bg: "bg-yellow-500/15",
      icon: <TrendingUp className="h-3 w-3 text-yellow-400" />,
      label: "Interest",
      color: "text-yellow-400",
      sign: "",
    },
  };

  return (
    <div
      className={`rounded-2xl border bg-white/5 backdrop-blur-xl overflow-hidden transition-all duration-200 ${
        isNearLimit
          ? "border-red-500/30"
          : "border-orange-500/20 hover:border-orange-500/30"
      }`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/15">
              <CreditCard className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm leading-tight">
                {loan.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Since {fmtDate(loan.startDate)} · OD Limit:{" "}
                <span className="text-orange-400 font-medium">
                  {fmt(loan.overdraftLimit)}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isNearLimit && (
              <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-medium">
                Near Limit
              </span>
            )}
            {confirmDeleteLoan ? (
              <div className="flex gap-1">
                <button
                  onClick={() => setConfirmDeleteLoan(false)}
                  className="px-2 py-1 rounded-lg text-xs border border-white/10 text-muted-foreground hover:bg-white/10 transition"
                >
                  No
                </button>
                <button
                  onClick={handleDeleteLoan}
                  className="px-2 py-1 rounded-lg text-xs bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition"
                >
                  Delete
                </button>
              </div>
            ) : (
              <button
                onClick={handleDeleteLoan}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-xs text-muted-foreground mb-1">OD Limit</p>
            <p className="text-sm font-semibold text-foreground">{fmt(loan.overdraftLimit)}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-xs text-muted-foreground mb-1">Total Drawn</p>
            <p className="text-sm font-semibold text-red-400">{fmt(metrics.totalTaken)}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-xs text-muted-foreground mb-1">Total Settled</p>
            <p className="text-sm font-semibold text-green-400">{fmt(metrics.totalSettled)}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
            <p className={`text-sm font-semibold ${metrics.outstanding > 0 ? "text-orange-400" : "text-green-400"}`}>
              {fmt(metrics.outstanding)}
            </p>
          </div>
        </div>

        {/* Interest accrued + remaining OD */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-yellow-500/8 border border-yellow-500/15 p-3">
            <p className="text-xs text-muted-foreground mb-1">Interest Accrued</p>
            <p className="text-sm font-semibold text-yellow-400">{fmt(metrics.totalInterestAccrued)}</p>
          </div>
          <div
            className={`rounded-xl p-3 ${
              metrics.remainingODAvailable <= 0
                ? "bg-red-500/10 border border-red-500/20"
                : "bg-green-500/10 border border-green-500/15"
            }`}
          >
            <p className="text-xs text-muted-foreground mb-1">Remaining OD Available</p>
            <p className={`text-sm font-semibold ${metrics.remainingODAvailable <= 0 ? "text-red-400" : "text-green-400"}`}>
              {fmt(metrics.remainingODAvailable)}
            </p>
          </div>
        </div>

        {/* OD utilization bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>OD Utilization</span>
            <span className={metrics.percentUsed >= 90 ? "text-red-400" : metrics.percentUsed >= 70 ? "text-orange-400" : "text-muted-foreground"}>
              {metrics.percentUsed.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                metrics.percentUsed >= 90 ? "bg-red-400" : metrics.percentUsed >= 70 ? "bg-orange-400" : "bg-green-400"
              }`}
              style={{ width: `${metrics.percentUsed}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
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
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium transition"
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              Withdraw / Draw
            </button>
            <button
              id={`od-settle-${loan.id}`}
              onClick={() => setActiveForm("settle")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-xs font-medium transition"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Settle
            </button>
            <button
              id={`od-interest-${loan.id}`}
              onClick={() => setActiveForm("interest")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-400 text-xs font-medium transition"
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
                  className="flex-1 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-muted-foreground transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold text-white transition disabled:opacity-50 ${formConfig[activeForm].btn}`}
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
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Transaction History
            </p>
            <div className="space-y-1.5">
              {timeline.map((item) => {
                const style = timelineStyle[item.kind];
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1 rounded-md ${style.bg}`}>{style.icon}</div>
                      <div>
                        <span className={`text-xs font-medium ${style.color}`}>
                          {style.label}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {fmtDate(item.date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${style.color}`}>
                        {style.sign}{fmt(item.amount)}
                      </span>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition"
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
