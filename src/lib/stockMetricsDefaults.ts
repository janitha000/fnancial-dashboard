import type { StockMonthlyMetric } from "@/actions/stocks";

export const DEFAULT_MONTHLY_METRICS: StockMonthlyMetric[] = [
  { id: "default-before", period: "Before", invested: null, totalValue: null, realizedGain: null, realizedGainPct: null, payOut: 109508, dividend: 19062 },
  { id: "default-2025-10", period: "2025/10", invested: 2900000, totalValue: 2871864, realizedGain: null, realizedGainPct: null, payOut: -309, dividend: null },
  { id: "default-2025-11", period: "2025/11", invested: 4050000, totalValue: 4073147, realizedGain: null, realizedGainPct: null, payOut: null, dividend: 9250 },
  { id: "default-2025-12", period: "2025/12", invested: 6200000, totalValue: 6021600, realizedGain: null, realizedGainPct: null, payOut: null, dividend: null },
  { id: "default-2026-01", period: "2026/01", invested: 7400000, totalValue: 7499733, realizedGain: null, realizedGainPct: null, payOut: 50888, dividend: 5025 },
  { id: "default-2026-02", period: "2026/02", invested: 7600000, totalValue: 7791405, realizedGain: null, realizedGainPct: null, payOut: 6748, dividend: 21112 },
  { id: "default-2026-03", period: "2026/03", invested: 8300000, totalValue: 7716616, realizedGain: null, realizedGainPct: null, payOut: null, dividend: 140279 },
  { id: "default-2026-04", period: "2026/04", invested: 8400000, totalValue: 8319711, realizedGain: null, realizedGainPct: null, payOut: null, dividend: 18410 },
  { id: "default-2026-05", period: "2026/05", invested: 8700000, totalValue: 8572507, realizedGain: null, realizedGainPct: null, payOut: 37641, dividend: 30755 },
  { id: "default-2026-06", period: "2026/06", invested: 9150000, totalValue: 8952158, realizedGain: null, realizedGainPct: null, payOut: null, dividend: 28252 },
  { id: "default-2026-07", period: "2026/07", invested: 9450000, totalValue: 8945413, realizedGain: null, realizedGainPct: null, payOut: null, dividend: 2198 },
  { id: "default-2026-08", period: "2026/08", invested: 9450000, totalValue: 8962520, realizedGain: null, realizedGainPct: null, payOut: -492466, dividend: 29725 },
  { id: "default-2026-09", period: "2026/09", invested: 10250000, totalValue: 9753373, realizedGain: null, realizedGainPct: null, payOut: null, dividend: 41930 },
  { id: "default-2026-10", period: "2026/10", invested: 11600000, totalValue: 10968924, realizedGain: 58008, realizedGainPct: 0.65, payOut: null, dividend: 0 },
];
