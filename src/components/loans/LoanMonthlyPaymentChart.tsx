"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useLoan, buildAmortizationSchedule } from "@/context/LoanContext";

const fmtLKR = (n: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(n);

function generateMonthlyPayments(
  vehicleLoans: ReturnType<typeof useLoan>["vehicleLoans"],
  overdraftLoans: ReturnType<typeof useLoan>["overdraftLoans"]
) {
  const allStartMs = [
    ...vehicleLoans.map((l) => new Date(l.dateOfLoan).getTime()),
    ...overdraftLoans.map((l) => new Date(l.startDate).getTime()),
  ];
  if (allStartMs.length === 0) return [];

  const earliest = new Date(Math.min(...allStartMs));
  const start = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);

  // Pre-build amortization schedules for vehicle loans (keyed by loan id)
  const scheduleMap = new Map(
    vehicleLoans.map((l) => [l.id, buildAmortizationSchedule(l)])
  );

  const points: {
    month: string;
    "Principal Paid": number;
    "Interest Paid": number;
  }[] = [];

  let cur = new Date(start);
  while (cur <= end) {
    const monthStart = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);

    let principalThisMonth = 0;
    let interestThisMonth = 0;

    // ── Vehicle loans ──────────────────────────────────────────────
    for (const loan of vehicleLoans) {
      const loanStart = new Date(loan.dateOfLoan);
      const loanStartMonth = new Date(
        loanStart.getFullYear(),
        loanStart.getMonth(),
        1
      );

      // Skip if month is before this loan started
      if (monthStart < loanStartMonth) continue;

      // Which installment number is this?
      const monthIndex =
        (cur.getFullYear() - loanStartMonth.getFullYear()) * 12 +
        (cur.getMonth() - loanStartMonth.getMonth());

      // Skip if past the loan duration
      if (monthIndex >= loan.duration) continue;

      // Skip the settlement month and any month after — loan is closed
      if (loan.settled) {
        const settleDate = new Date(loan.settled.settleDate);
        const settleMonth = new Date(
          settleDate.getFullYear(),
          settleDate.getMonth(),
          1
        );
        if (monthStart >= settleMonth) continue;
      }

      const schedule = scheduleMap.get(loan.id);
      const row = schedule?.[monthIndex];
      if (row) {
        principalThisMonth += row.principal;
        interestThisMonth += row.interest;
      }
    }

    // ── Overdraft loans ────────────────────────────────────────────
    for (const loan of overdraftLoans) {
      // Monthly settled = settlements in this exact calendar month
      const settled = loan.settlements
        .filter((s) => {
          const d = new Date(s.date);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((s, d) => s + d.amount, 0);

      // Monthly interest = interest accruals recorded in this month
      const interest = (loan.interestAccruals ?? [])
        .filter((a) => {
          const d = new Date(a.date);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((s, a) => s + a.amount, 0);

      principalThisMonth += settled;
      interestThisMonth += interest;
    }

    if (principalThisMonth > 0 || interestThisMonth > 0) {
      const label = cur.toLocaleDateString("en-LK", {
        year: "2-digit",
        month: "short",
      });
      points.push({
        month: label,
        "Principal Paid": Math.round(principalThisMonth),
        "Interest Paid": Math.round(interestThisMonth),
      });
    }

    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  return points;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[#242932] p-3 shadow-xl text-xs space-y-1.5 font-mono [font-feature-settings:'tnum'] text-[#f1f5f9]">
      <p className="text-[#94a3b8] font-medium mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: p.fill }}
          />
          <span className="text-[#94a3b8]">{p.dataKey}:</span>
          <span className="font-semibold text-[#f1f5f9]">
            {fmtLKR(p.value)}
          </span>
        </div>
      ))}
      <div className="border-t border-[rgba(255,255,255,0.07)] pt-1.5 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0 bg-white/30" />
        <span className="text-[#94a3b8]">Total:</span>
        <span className="font-bold text-[#f1f5f9]">{fmtLKR(total)}</span>
      </div>
    </div>
  );
};

export function LoanMonthlyPaymentChart() {
  const { vehicleLoans, overdraftLoans, isLoaded } = useLoan();

  const data = useMemo(
    () => generateMonthlyPayments(vehicleLoans, overdraftLoans),
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
          Monthly Payments Breakdown
        </h2>
        <p className="text-xs text-[#94a3b8] mt-0.5">
          Per-month cash outflow split between principal repayment and interest
          charges
        </p>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
            barCategoryGap="30%"
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255, 255, 255, 0.04)" }} />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "12px", fontFamily: "'IBM Plex Mono', monospace", color: "#94a3b8" }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="Principal Paid"
              stackId="payment"
              fill="#38bdf8"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="Interest Paid"
              stackId="payment"
              fill="#eab308"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
