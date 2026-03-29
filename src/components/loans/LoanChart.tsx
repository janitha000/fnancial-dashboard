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
    <div className="rounded-xl border border-white/10 bg-background/95 backdrop-blur-xl p-3 shadow-xl text-xs space-y-1.5">
      <p className="text-muted-foreground font-medium mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-muted-foreground">{p.dataKey}:</span>
          <span className="font-semibold text-foreground">
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
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-foreground">
          Monthly Loan Overview
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
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
              stroke="rgba(255,255,255,0.05)"
            />
            <XAxis
              dataKey="month"
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={tickFormatter}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
              iconType="circle"
              iconSize={8}
            />
            <Line
              type="monotone"
              dataKey="Remaining Capital"
              stroke="#f97316"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="Amount Paid"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="Interest Paid"
              stroke="#eab308"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
