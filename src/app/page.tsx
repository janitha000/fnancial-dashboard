"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWealth, WealthRecord, WealthMonth, sortWealthMonths } from "@/context/WealthContext";
import { PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChevronLeft, ChevronRight, TrendingUp, PieChart as PieIcon, LineChart as LineChartIcon, Table as TableIcon } from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#ef4444', '#14b8a6', '#6366f1'];

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="13px" fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const renderGainLossDot = (props: any) => {
  const { cx, cy, payload } = props;
  const isGain = payload["Gain/Loss"] >= 0;
  return (
    <circle cx={cx} cy={cy} r={5} stroke="#1e293b" strokeWidth={2} fill={isGain ? '#10b981' : '#ef4444'} />
  );
};

export default function HomeDashboard() {
  const { wealthMonths, isLoaded } = useWealth();
  
  const sortedMonths = useMemo(() => [...wealthMonths].sort(sortWealthMonths), [wealthMonths]);
  const availableYears = useMemo(() => Array.from(new Set(sortedMonths.map(m => m.year))), [sortedMonths]);
  
  // Default states
  const latestOverallMonth = sortedMonths.length > 0 ? sortedMonths[sortedMonths.length - 1] : undefined;
  const initialYear = latestOverallMonth?.year || "2025/2026";
  
  const [viewYear, setViewYear] = useState<string>(initialYear);

  useEffect(() => {
    if (latestOverallMonth && !availableYears.includes(viewYear)) {
      setViewYear(latestOverallMonth.year);
    }
  }, [latestOverallMonth, availableYears, viewYear]);

  const viewYearIndex = availableYears.indexOf(viewYear);
  const canGoPrev = viewYearIndex > 0;
  const canGoNext = viewYearIndex !== -1 && viewYearIndex < availableYears.length - 1;

  // --- CORE LOGIC ---
  const getEffectiveRecords = (records: WealthRecord[]) => {
    const categoriesWithSub = new Set<string>();
    records.forEach(r => { if (r.subCategory !== "") categoriesWithSub.add(r.category); });
    return records.filter(r => {
      if (categoriesWithSub.has(r.category)) return r.subCategory !== ""; 
      return true;
    });
  };

  const getMonthTotal = (monthRecord: WealthMonth | undefined) => {
    if (!monthRecord) return 0;
    return getEffectiveRecords(monthRecord.records).reduce((sum, r) => sum + r.amount, 0);
  };

  // 1. Wealth Breakdown (Latest Month Overall)
  const monthPieData = useMemo(() => {
    if (!latestOverallMonth) return [];
    const effective = getEffectiveRecords(latestOverallMonth.records);
    const grouped: Record<string, number> = {};
    effective.forEach(r => { grouped[r.category] = (grouped[r.category] || 0) + r.amount; });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [latestOverallMonth]);


  // 2. Financial Year Logic
  const fyMonths = sortedMonths.filter(m => m.year === viewYear);
  const latestFyMonth = fyMonths.length > 0 ? fyMonths[fyMonths.length - 1] : undefined;

  let prevFyLatest: WealthMonth | undefined;
  let prevYearParts = viewYear.split('/');
  if (prevYearParts.length === 2) {
    const prevY1 = parseInt(prevYearParts[0]) - 1;
    const prevY2 = parseInt(prevYearParts[1]) - 1;
    const prevFyStr = `${prevY1}/${prevY2}`;
    const prevFyMonths = sortedMonths.filter(m => m.year === prevFyStr);
    prevFyLatest = prevFyMonths.length > 0 ? prevFyMonths[prevFyMonths.length - 1] : undefined;
  } else {
    const prevY = parseInt(viewYear) - 1;
    const prevFyMonths = sortedMonths.filter(m => m.year === prevY.toString());
    prevFyLatest = prevFyMonths.length > 0 ? prevFyMonths[prevFyMonths.length - 1] : undefined;
  }

  const fyTrendData = useMemo(() => {
    return fyMonths.map(m => ({ month: m.month, "Total Assets": getMonthTotal(m) }));
  }, [fyMonths]);

  const fyGainLossData = useMemo(() => {
    return fyMonths.map(m => {
      const currentTotal = getMonthTotal(m);
      const globalIdx = sortedMonths.findIndex(sm => sm.id === m.id);
      const prevTotal = globalIdx > 0 ? getMonthTotal(sortedMonths[globalIdx - 1]) : currentTotal;
      return { month: m.month, "Gain/Loss": currentTotal - prevTotal };
    });
  }, [fyMonths, sortedMonths]);

  const fyCategories = useMemo(() => {
    const cats = new Set<string>();
    fyMonths.forEach(m => getEffectiveRecords(m.records).forEach(r => cats.add(r.category)));
    return Array.from(cats);
  }, [fyMonths]);

  const fyStackedAreaData = useMemo(() => {
    return fyMonths.map(m => {
      const dataPoint: any = { month: m.month };
      const effective = getEffectiveRecords(m.records);
      const grouped: Record<string, number> = {};
      effective.forEach(r => { grouped[r.category] = (grouped[r.category] || 0) + r.amount; });
      fyCategories.forEach(cat => { dataPoint[cat] = grouped[cat] || 0; });
      return dataPoint;
    });
  }, [fyMonths, fyCategories]);

  const fyEndingTableData = useMemo(() => {
    if (!latestFyMonth) return [];
    const currentEffective = getEffectiveRecords(latestFyMonth.records);
    const currentGrouped: Record<string, number> = {};
    currentEffective.forEach(r => { currentGrouped[r.category] = (currentGrouped[r.category] || 0) + r.amount; });
    
    const prevEffective = prevFyLatest ? getEffectiveRecords(prevFyLatest.records) : [];
    const prevGrouped: Record<string, number> = {};
    prevEffective.forEach(r => { prevGrouped[r.category] = (prevGrouped[r.category] || 0) + r.amount; });

    const allCategories = Array.from(new Set([...Object.keys(currentGrouped), ...Object.keys(prevGrouped)]));
    const total = getMonthTotal(latestFyMonth);
    
    return allCategories.map(cat => {
      const currentAmount = currentGrouped[cat] || 0;
      const prevAmount = prevGrouped[cat] || 0;
      const variance = currentAmount - prevAmount;
      const percentChange = prevAmount > 0 ? (variance / prevAmount) * 100 : 0;
      
      return {
        category: cat, amount: currentAmount, previous: prevAmount, variance, percentChange,
        percentage: total > 0 ? (currentAmount / total) * 100 : 0
      };
    }).sort((a,b) => b.amount - a.amount);
  }, [latestFyMonth, prevFyLatest]);

  
  if (!isLoaded) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (wealthMonths.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-lg mx-auto">
        <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-8 relative">
          <PieIcon className="w-12 h-12 text-primary absolute animate-bounce" />
          <div className="w-full h-full rounded-full border border-primary/50 animate-ping absolute"></div>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40">Vault Empty</h1>
        <p className="text-xl text-muted-foreground mb-8">Head over to the Wealth tab to initialize your portfolio by uploading your first dataset row.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">Global Overview</h1>
        <p className="text-muted-foreground text-lg">A unified, top-down perspective indexing your cross-module financial growth metrics.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* LATEST MONTH BREAKDOWN PIE */}
        <Card className="lg:col-span-1 bg-white/5 border-white/10 flex flex-col items-center p-4">
          <CardHeader className="text-center pb-2">
            <CardTitle className="flex items-center gap-2 justify-center text-lg"><PieIcon className="w-5 h-5 text-primary" /> Wealth Breakdown</CardTitle>
            <CardDescription className="text-xs">Latest snapshot ({latestOverallMonth?.month} {latestOverallMonth?.year})</CardDescription>
          </CardHeader>
          <CardContent className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={monthPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={110} 
                  paddingAngle={2} dataKey="value" labelLine={false} label={renderCustomizedLabel}
                >
                  {monthPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(val: any) => val.toLocaleString() + ' LKR'} contentStyle={{backgroundColor: 'rgba(15,23,42,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(8px)'}} />
                <Legend verticalAlign="bottom" height={48} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* FINANCIAL YEAR CONTROLS & CHARTS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-md">
            <h2 className="text-lg font-bold tracking-tight text-white/90 pl-2">Financial Year {viewYear}</h2>
            <div className="flex items-center gap-1 bg-background/60 p-1 rounded-lg border border-white/5">
              <Button variant="ghost" onClick={() => { const p = availableYears[viewYearIndex - 1]; if(p) setViewYear(p); }} disabled={!canGoPrev} size="icon" className="h-8 w-8 hover:bg-white/10 rounded-md">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Select value={viewYear} onValueChange={(val) => { if(val) setViewYear(val); }}>
                <SelectTrigger className="w-[130px] font-bold bg-transparent border-none text-center h-8 shadow-none focus:ring-0 text-sm">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(y => <SelectItem key={y} value={y}>{y} FY</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" onClick={() => { const n = availableYears[viewYearIndex + 1]; if(n) setViewYear(n); }} disabled={!canGoNext} size="icon" className="h-8 w-8 hover:bg-white/10 rounded-md">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-white/5 border-white/10 shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><LineChartIcon className="w-4 h-4 text-blue-400" /> Total Assets Trend</CardTitle>
                <CardDescription className="text-xs">Progression through {viewYear}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={fyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000000).toFixed(1)}M`} width={45} domain={['auto', 'auto']} />
                      <Tooltip cursor={{stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2}} contentStyle={{backgroundColor: 'rgba(15,23,42,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px'}} formatter={(val: any) => val.toLocaleString() + ' LKR'} />
                      <Line type="monotone" dataKey="Total Assets" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="w-4 h-4 text-emerald-400" /> Monthly Gain/Loss</CardTitle>
                <CardDescription className="text-xs">Absolute ± variance tracked</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={fyGainLossData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000000).toFixed(1)}M`} width={45} domain={['auto', 'auto']} />
                      <Tooltip cursor={{stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2}} contentStyle={{backgroundColor: 'rgba(15,23,42,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px'}} formatter={(val: any) => val.toLocaleString() + ' LKR'} />
                      <Line type="monotone" dataKey="Gain/Loss" stroke="rgba(255,255,255,0.15)" strokeWidth={2} dot={renderGainLossDot} activeDot={{ r: 6, fill: '#fff', strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* FINAL DISTRIBUTION TABLE */}
      {fyMonths.length > 0 && (
        <Card className="bg-white/5 border-white/10 mt-6 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><TableIcon className="w-5 h-5 text-emerald-400" /> Year-End Asset Distribution ({latestFyMonth?.month} {viewYear})</CardTitle>
            <CardDescription>Composition metrics paired with historical YoY performance tracking.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground">
                  <th className="pb-3 px-2 font-medium">Asset Category</th>
                  <th className="pb-3 px-2 font-medium text-right">Final Amount</th>
                  <th className="pb-3 px-2 font-medium text-right">Last Year ({prevFyLatest?.month ? prevFyLatest.month + ' ' + prevFyLatest.year : 'N/A'})</th>
                  <th className="pb-3 px-2 font-medium text-right">YoY Variance</th>
                  <th className="pb-3 px-2 font-medium text-right">Portfolio %</th>
                </tr>
              </thead>
              <tbody>
                {fyEndingTableData.map((row, idx) => (
                  <tr key={row.category} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-2 font-medium flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></span>
                      {row.category}
                    </td>
                    <td className="py-4 px-2 text-right">{row.amount.toLocaleString()} LKR</td>
                    <td className="py-4 px-2 text-right text-muted-foreground">{row.previous > 0 ? row.previous.toLocaleString() + ' LKR' : '-'}</td>
                    <td className={`py-4 px-2 text-right font-medium ${row.variance === 0 ? 'text-muted-foreground' : row.variance > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {row.variance > 0 ? '+' : ''}{row.variance.toLocaleString()} LKR 
                        {row.previous > 0 && <span className="text-xs ml-2 opacity-80">({row.variance > 0 ? '+' : ''}{row.percentChange.toFixed(1)}%)</span>}
                    </td>
                    <td className="py-4 px-2 text-right font-medium text-primary bg-primary/5 rounded-r-lg">
                        {row.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
