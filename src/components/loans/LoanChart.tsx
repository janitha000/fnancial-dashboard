"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  useLoan,
  getVehicleLoanMetrics,
} from "@/context/LoanContext";

const fmtLKR = (n: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(n);

function generateMonthlyData(
  vehicleLoans: ReturnType<typeof useLoan>["vehicleLoans"],
  overdraftLoans: ReturnType<typeof useLoan>["overdraftLoans"]
) {
  // Find the overall earliest start month
  const allStartMs = [
    ...vehicleLoans.map((l) => new Date(l.dateOfLoan).getTime()),
    ...overdraftLoans.map((l) => new Date(l.startDate).getTime()),
  ];
  if (allStartMs.length === 0) return [];

  const earliest = new Date(Math.min(...allStartMs));
  const start = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);

  const points: {
    month: string;
    "Remaining Capital": number;
    "Interest Paid": number;
    "Amount Paid": number;
  }[] = [];

  let cur = new Date(start);
  while (cur <= end) {
    let remainingCapital = 0;
    let interestPaid = 0;
    let amountPaid = 0;

    // ── Vehicle loans ──────────────────────────────────────────────
    for (const loan of vehicleLoans) {
      const loanStart = new Date(loan.dateOfLoan);
      if (cur < new Date(loanStart.getFullYear(), loanStart.getMonth(), 1)) {
        // loan hadn't started yet — skip
        continue;
      }
      // Use asOf = last day of the current chart month to get state
      const asOf = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      const m = getVehicleLoanMetrics(loan, asOf);

      // After settlement date the loan is closed — remaining capital is 0
      const isPostSettlement =
        loan.settled && asOf > new Date(loan.settled.settleDate);
      remainingCapital += isPostSettlement ? 0 : m.remainingCapital;
      interestPaid += m.totalInterestPaid;
      amountPaid += m.alreadyPaid;
    }

    // ── Overdraft loans ────────────────────────────────────────────
    for (const loan of overdraftLoans) {
      const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);

      const totalDrawn = loan.drawdowns
        .filter((d) => new Date(d.date) <= monthEnd)
        .reduce((s, d) => s + d.amount, 0);

      const totalSettled = loan.settlements
        .filter((s) => new Date(s.date) <= monthEnd)
        .reduce((s, d) => s + d.amount, 0);

      const totalInterest = (loan.interestAccruals ?? [])
        .filter((a) => new Date(a.date) <= monthEnd)
        .reduce((s, a) => s + a.amount, 0);

      remainingCapital += Math.max(0, totalDrawn - totalSettled);
      interestPaid += totalInterest;
      amountPaid += totalSettled;
    }

    const label = cur.toLocaleDateString("en-LK", {
      year: "2-digit",
      month: "short",
    });

    points.push({
      month: label,
      "Remaining Capital": Math.round(remainingCapital),
      "Interest Paid": Math.round(interestPaid),
      "Amount Paid": Math.round(amountPaid),
    });

    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  return points;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[#242932] p-3 shadow-xl text-xs space-y-1.5 font-mono [font-feature-settings:'tnum'] text-[#f1f5f9]">
      <p className="text-[#94a3b8] font-medium mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-[#94a3b8]">{p.dataKey}:</span>
          <span className="font-semibold text-[#f1f5f9]">
            {fmtLKR(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export function LoanChart() {
  const { vehicleLoans, overdraftLoans, isLoaded } = useLoan();

  const data = useMemo(
    () => generateMonthlyData(vehicleLoans, overdraftLoans),
    [vehicleLoans, overdraftLoans]
  );

  if (!isLoaded || data.length === 0) return null;

  const tickFormatter = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return `${v}`;
  };

  return (
    <div className="rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#1c2026] p-6 shadow-none">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-[#f1f5f9]">
          Monthly Loan Overview
        </h2>
        <p className="text-xs text-[#94a3b8] mt-0.5">
          Month-by-month snapshot of remaining capital, amount paid, and
          interest across all loans
        </p>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(255, 255, 255, 0.05)"
            />
            <XAxis
              dataKey="month"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={tickFormatter}
              width={52}
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "12px", fontFamily: "'IBM Plex Mono', monospace", color: "#94a3b8" }}
              iconType="circle"
              iconSize={8}
            />
            <Line
              type="monotone"
              dataKey="Remaining Capital"
              stroke="#ef4444"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: "#ef4444" }}
            />
            <Line
              type="monotone"
              dataKey="Amount Paid"
              stroke="#38bdf8"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: "#38bdf8" }}
            />
            <Line
              type="monotone"
              dataKey="Interest Paid"
              stroke="#eab308"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: "#eab308" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
