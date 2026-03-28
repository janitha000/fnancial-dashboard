"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWealth, WealthRecord, WealthMonth, sortWealthMonths } from "@/context/WealthContext";
import { PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Upload, Trash2, TrendingUp, TrendingDown, PieChart as PieIcon, Table as TableIcon, ChevronLeft, ChevronRight, LineChart as LineChartIcon, Sparkles } from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#ef4444', '#14b8a6', '#6366f1'];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEARS = ["2024", "2025", "2026", "2027", "2024/2025", "2025/2026", "2026/2027"];

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

const generateSriLankanAIInsight = (records: WealthRecord[], total: number, variance: number, timeframe: string) => {
  if (total === 0) return "Provide your pipeline with robust data to generate macroeconomic insights.";
  
  let fixedIncome = 0; let equity = 0; let cash = 0;
  
  records.forEach(r => {
    const lower = r.category.toLowerCase();
    if (lower.includes('fd') || lower.includes('treasury') || lower.includes('bill') || lower.includes('bond') || lower.includes('fixed')) fixedIncome += r.amount;
    else if (lower.includes('stock') || lower.includes('equity') || lower.includes('index') || lower.includes('fund') || lower.includes('unit')) equity += r.amount;
    else if (lower.includes('cash') || lower.includes('bank') || lower.includes('savings')) cash += r.amount;
  });

  const fiPercent = (fixedIncome / total) * 100;
  const eqPercent = (equity / total) * 100;
  
  let insight = "";
  
  if (variance > 0) {
    insight += `Your wealth experienced strong growth of +${variance.toLocaleString()} LKR this ${timeframe}. `;
  } else if (variance < 0) {
    insight += `Your portfolio contracted by ${Math.abs(variance).toLocaleString()} LKR this ${timeframe}. `;
  }

  if (fiPercent > 40) {
    insight += `You are heavily weighted defensively (${fiPercent.toFixed(0)}% Fixed Income). Given current CBSL monetary easing and T-Bill yields compressing towards single digits, consider locking in long-term FD rates immediately or shifting capital efficiently into the Colombo Stock Exchange (CSE) to chase higher equity yields. `;
  } else if (eqPercent > 40) {
    insight += `Your portfolio is exposed heavily to equities (${eqPercent.toFixed(0)}%). Keep a watchful eye on CSE ASPI movements and ensure your unit trusts (CAL/NDB) are hedging against potential local currency (LKR) parity fluctuations. `;
  } else {
    insight += `You have a highly diversified hybrid portfolio. It is well-positioned to ride out local inflation rates in Colombo while steadily accumulating compounded interest through multiple resilient channels. `;
  }
  
  return insight;
};

export default function WealthPage() {
  const { wealthMonths, addMonthData, deleteMonthData, isLoaded } = useWealth();

  const [showUploader, setShowUploader] = useState(false);
  const [uploadYear, setUploadYear] = useState<string>("2025/2026");
  const [uploadMonth, setUploadMonth] = useState<string>("Apr");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string>("");

  const [activeTab, setActiveTab] = useState<string>("month");
  
  const sortedMonths = [...wealthMonths].sort(sortWealthMonths);
  const latestMonthRecord = sortedMonths.length > 0 ? sortedMonths[sortedMonths.length - 1] : null;

  const [viewMonthId, setViewMonthId] = useState<string>(latestMonthRecord?.id || "");
  const [viewYear, setViewYear] = useState<string>(latestMonthRecord?.year || "2025/2026");

  React.useEffect(() => {
    if (latestMonthRecord && !viewMonthId) {
      setViewMonthId(latestMonthRecord.id);
      setViewYear(latestMonthRecord.year);
    }
  }, [latestMonthRecord, viewMonthId]);

  const parseCsvText = (text: string) => {
    try {
      const lines = text.split('\n').filter(line => line.trim() !== "");
      const records: WealthRecord[] = [];
      lines.forEach(line => {
        const cols = line.split('|').map(c => c.trim());
        if (cols.length >= 3) {
          const category = cols[0];
          const subCategory = cols[1];
          const amountStr = cols[2].replace(/,/g, '');
          const amount = parseFloat(amountStr);
          if (category && !isNaN(amount)) records.push({ category, subCategory, amount });
        }
      });
      if (records.length === 0) {
        setUploadError("No valid records found. Ensure CSV is pipe (|) delimited.");
        return;
      }
      addMonthData(uploadYear, uploadMonth, records);
      setUploadError(null);
      setViewMonthId(`${uploadYear}-${uploadMonth}`);
      setViewYear(uploadYear);
      setCsvText("");
      setShowUploader(false);
    } catch (err) {
      setUploadError("Failed to parse the data.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCsvText(text);
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const handleTextUpload = () => {
    if (!csvText.trim()) {
      setUploadError("Please paste your CSV data first.");
      return;
    }
    parseCsvText(csvText);
  };

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

  // --- MONTH VIEW LOGIC ---
  const activeMonthRecord = wealthMonths.find(m => m.id === viewMonthId);
  const activeMonthTotal = getMonthTotal(activeMonthRecord);
  const activeMonthIndex = sortedMonths.findIndex(m => m.id === viewMonthId);
  const prevMonthRecord = activeMonthIndex > 0 ? sortedMonths[activeMonthIndex - 1] : undefined;
  const monthVariance = activeMonthIndex > 0 ? activeMonthTotal - getMonthTotal(prevMonthRecord) : 0;

  const monthPieData = useMemo(() => {
    if (!activeMonthRecord) return [];
    const effective = getEffectiveRecords(activeMonthRecord.records);
    const grouped: Record<string, number> = {};
    effective.forEach(r => { grouped[r.category] = (grouped[r.category] || 0) + r.amount; });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [activeMonthRecord]);

  const monthTableData = useMemo(() => {
    if (!activeMonthRecord) return [];
    const currentEffective = getEffectiveRecords(activeMonthRecord.records);
    const prevEffective = prevMonthRecord ? getEffectiveRecords(prevMonthRecord.records) : [];

    const currentGrouped: Record<string, number> = {};
    currentEffective.forEach(r => { currentGrouped[r.category] = (currentGrouped[r.category] || 0) + r.amount; });
    const prevGrouped: Record<string, number> = {};
    prevEffective.forEach(r => { prevGrouped[r.category] = (prevGrouped[r.category] || 0) + r.amount; });

    const allCategories = Array.from(new Set([...Object.keys(currentGrouped), ...Object.keys(prevGrouped)]));
    return allCategories.map(cat => {
      const currentVal = currentGrouped[cat] || 0;
      const prevVal = prevGrouped[cat] || 0;
      const variance = currentVal - prevVal;
      return {
        category: cat, current: currentVal, previous: prevVal, variance,
        percentChange: prevVal > 0 ? (variance / prevVal) * 100 : 0
      };
    }).sort((a,b) => b.current - a.current);
  }, [activeMonthRecord, prevMonthRecord]);


  // --- FY VIEW LOGIC ---
  const fyMonths = sortedMonths.filter(m => m.year === viewYear);
  const latestFyMonth = fyMonths.length > 0 ? fyMonths[fyMonths.length - 1] : undefined;
  const fyTotal = getMonthTotal(latestFyMonth);

  let prevFyTotal = 0;
  let prevFyLatest: WealthMonth | undefined;
  let prevYearParts = viewYear.split('/');
  
  if (prevYearParts.length === 2) {
    const prevYStr = `${parseInt(prevYearParts[0]) - 1}/${parseInt(prevYearParts[1]) - 1}`;
    const prevMs = sortedMonths.filter(m => m.year === prevYStr);
    prevFyLatest = prevMs.length > 0 ? prevMs[prevMs.length - 1] : undefined;
    prevFyTotal = getMonthTotal(prevFyLatest);
  } else {
    const prevMs = sortedMonths.filter(m => m.year === (parseInt(viewYear) - 1).toString());
    prevFyLatest = prevMs.length > 0 ? prevMs[prevMs.length - 1] : undefined;
    prevFyTotal = getMonthTotal(prevFyLatest);
  }
  
  const fyVariance = (prevFyTotal > 0 && fyTotal > 0) ? fyTotal - prevFyTotal : 0;

  const fyTrendData = useMemo(() => fyMonths.map(m => ({ month: m.month, "Total Assets": getMonthTotal(m) })), [fyMonths]);
  
  const fyGainLossData = useMemo(() => fyMonths.map(m => {
    const glIdx = sortedMonths.findIndex(sm => sm.id === m.id);
    const pTotal = glIdx > 0 ? getMonthTotal(sortedMonths[glIdx - 1]) : getMonthTotal(m);
    return { month: m.month, "Gain/Loss": getMonthTotal(m) - pTotal };
  }), [fyMonths, sortedMonths]);

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

  const getCategoryTrend = (category: string) => fyMonths.map(m => {
    const sum = getEffectiveRecords(m.records).filter(r => r.category === category).reduce((acc, r) => acc + r.amount, 0);
    return { month: m.month, [category]: sum };
  });

  const fyEndingTableData = useMemo(() => {
    if (!latestFyMonth) return [];
    const currentGrouped: Record<string, number> = {};
    getEffectiveRecords(latestFyMonth.records).forEach(r => currentGrouped[r.category] = (currentGrouped[r.category] || 0) + r.amount);
    
    const prevGrouped: Record<string, number> = {};
    if (prevFyLatest) getEffectiveRecords(prevFyLatest.records).forEach(r => prevGrouped[r.category] = (prevGrouped[r.category] || 0) + r.amount);

    const allCategories = Array.from(new Set([...Object.keys(currentGrouped), ...Object.keys(prevGrouped)]));
    const total = getMonthTotal(latestFyMonth);
    
    return allCategories.map(cat => {
      const c = currentGrouped[cat] || 0;
      const p = prevGrouped[cat] || 0;
      return { category: cat, amount: c, previous: p, variance: c - p, percentChange: p > 0 ? ((c - p) / p) * 100 : 0, percentage: total > 0 ? (c / total) * 100 : 0 };
    }).sort((a,b) => b.amount - a.amount);
  }, [latestFyMonth, prevFyLatest]);

  if (!isLoaded) return <div className="flex h-[60vh] flex-col items-center justify-center space-y-4"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">Wealth Portfolio</h1>
          <p className="text-muted-foreground mt-1 text-lg">Manage and analyze your multi-category wealth growth over time.</p>
        </div>
        <Button onClick={() => setShowUploader(!showUploader)} size="lg" className="bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20">
          <Upload className="w-5 h-5 mr-2" /> {showUploader ? "Hide Uploader" : "Upload Data"}
        </Button>
      </div>

      {showUploader && (
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl relative animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold">Data Management</CardTitle>
            <CardDescription>Upload a pipe-delimited (|) CSV file or paste from your clipboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6 bg-background/20 p-4 rounded-xl border border-white/5">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground ml-1">Year</label>
                <Select value={uploadYear} onValueChange={(val) => { if(val) setUploadYear(val); }}>
                  <SelectTrigger className="w-[140px] bg-background/50 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground ml-1">Month</label>
                <Select value={uploadMonth} onValueChange={(val) => { if(val) setUploadMonth(val); }}>
                  <SelectTrigger className="w-[120px] bg-background/50 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="text" className="w-full">
              <TabsList className="mb-4 bg-background/50 border-white/10 max-w-sm">
                <TabsTrigger value="text" className="data-[state=active]:bg-primary w-1/2">Paste Text</TabsTrigger>
                <TabsTrigger value="file" className="data-[state=active]:bg-primary w-1/2">Upload CSV</TabsTrigger>
              </TabsList>
              <TabsContent value="file">
                <Input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="w-full bg-background/50 border-white/10 h-12 pt-3" />
              </TabsContent>
              <TabsContent value="text" className="space-y-4">
                <textarea 
                  value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="NDB | | 26,587,380..."
                  className="w-full rounded-md border border-white/10 bg-background/50 px-3 py-2 font-mono min-h-[120px]"
                />
                <Button onClick={handleTextUpload} className="bg-primary text-primary-foreground font-bold px-6">Parse Payload</Button>
              </TabsContent>
            </Tabs>
            {uploadError && <p className="text-destructive mt-4 font-medium text-sm bg-destructive/10 p-3 rounded-md">{uploadError}</p>}
          </CardContent>
        </Card>
      )}

      {wealthMonths.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/20 bg-white/5 rounded-2xl">
          <PieIcon className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-bold">No Wealth Data Uploaded</h3>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-background/50 border-white/10 p-1 rounded-xl glass-panel">
            <TabsTrigger value="month" className="rounded-lg data-[state=active]:bg-primary">Month View</TabsTrigger>
            <TabsTrigger value="year" className="rounded-lg data-[state=active]:bg-primary">Financial Year View</TabsTrigger>
          </TabsList>

          <TabsContent value="month" className="mt-6 space-y-6">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { const idx = sortedMonths.findIndex(m => m.id === viewMonthId); if (idx > 0) setViewMonthId(sortedMonths[idx - 1].id); }} disabled={sortedMonths.findIndex(m => m.id === viewMonthId) <= 0} size="icon" className="h-12 w-12 bg-background/40 hover:bg-white/10 border-white/10"><ChevronLeft/></Button>
              <Select value={viewMonthId} onValueChange={(val) => { if(val) setViewMonthId(val); }}>
                <SelectTrigger className="w-[180px] text-lg font-bold bg-background/40 border-white/10 h-12 rounded-xl justify-center"><SelectValue /></SelectTrigger>
                <SelectContent>{sortedMonths.map(m => <SelectItem key={m.id} value={m.id}>{m.month} {m.year}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="outline" onClick={() => { const idx = sortedMonths.findIndex(m => m.id === viewMonthId); if (idx >= 0 && idx < sortedMonths.length - 1) setViewMonthId(sortedMonths[idx + 1].id); }} disabled={sortedMonths.findIndex(m => m.id === viewMonthId) >= sortedMonths.length - 1 || sortedMonths.findIndex(m => m.id === viewMonthId) === -1} size="icon" className="h-12 w-12 bg-background/40 hover:bg-white/10 border-white/10 mr-2"><ChevronRight/></Button>
              <Button variant="destructive" size="icon" className="h-12 w-12 bg-destructive/80" onClick={() => deleteMonthData(viewMonthId)}><Trash2/></Button>
            </div>

            {activeMonthRecord ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-gradient-to-br from-blue-900/40 to-background border-blue-500/20 shadow-xl">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-200">Total Month Wealth</CardTitle></CardHeader>
                  <CardContent><div className="text-4xl font-black text-white">{activeMonthTotal.toLocaleString()} <span className="text-lg text-blue-300 font-medium">LKR</span></div></CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Variance (vs Prev Month)</CardTitle></CardHeader>
                  <CardContent className="flex items-center gap-2">
                    {activeMonthIndex > 0 ? (
                      <><div className={`text-3xl font-bold ${monthVariance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{monthVariance > 0 ? '+' : ''}{monthVariance.toLocaleString()} <span className="text-base text-muted-foreground mr-2 font-medium">LKR</span></div>{monthVariance >= 0 ? <TrendingUp className="w-8 h-8 text-emerald-400" /> : <TrendingDown className="w-8 h-8 text-red-400" />}</>
                    ) : (<div className="text-xl font-medium text-muted-foreground mt-2">No Prev Month data</div>)}
                  </CardContent>
                </Card>

                {/* AI INSIGHTS CARD (MONTHLY) */}
                <Card className="bg-gradient-to-br from-indigo-900/40 to-background border-indigo-500/20 shadow-xl shadow-indigo-900/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-indigo-300"><Sparkles className="w-4 h-4" /> AI Context (Sri Lanka)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-indigo-100 leading-relaxed font-medium">
                      {generateSriLankanAIInsight(activeMonthRecord.records, activeMonthTotal, monthVariance, "month")}
                    </p>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-3 bg-white/5 border-white/10">
                  <CardHeader><CardTitle className="text-base text-center">Wealth Breakdown</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[450px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={monthPieData} cx="50%" cy="50%" innerRadius={100} outerRadius={180} paddingAngle={2} dataKey="value" labelLine={false} label={renderCustomizedLabel}>
                            {monthPieData.map((e, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(val: any) => val.toLocaleString() + ' LKR'} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="lg:col-span-3 bg-white/5 border-white/10">
                  <CardHeader><CardTitle className="flex items-center gap-2"><TableIcon className="w-5 h-5" /> Detailed Asset Variance</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-white/10 text-muted-foreground">
                          <th className="pb-3 px-2 font-medium">Asset</th><th className="pb-3 px-2 font-medium text-right">Current Amount</th><th className="pb-3 px-2 font-medium text-right">Previous Amount</th><th className="pb-3 px-2 font-medium text-right">Variance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthTableData.map(row => (
                          <tr key={row.category} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-4 px-2 font-medium">{row.category}</td>
                            <td className="py-4 px-2 text-right">{row.current.toLocaleString()} LKR</td>
                            <td className="py-4 px-2 text-right text-muted-foreground">{row.previous > 0 ? row.previous.toLocaleString() + ' LKR' : '-'}</td>
                            <td className={`py-4 px-2 text-right font-medium ${row.variance === 0 ? 'text-muted-foreground' : row.variance > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                               {row.variance > 0 ? '+' : ''}{row.variance.toLocaleString()} LKR 
                               {row.previous > 0 && <span className="text-xs ml-2 opacity-80">({row.variance > 0 ? '+' : ''}{row.percentChange.toFixed(1)}%)</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

              </div>
            ) : (<p className="p-8 text-center text-muted-foreground">Month data not available.</p>)}
          </TabsContent>

          <TabsContent value="year" className="mt-6 space-y-6">
            <div className="flex items-center">
              <Select value={viewYear} onValueChange={(val) => { if(val) setViewYear(val); }}>
                <SelectTrigger className="w-[200px] text-lg font-bold bg-background/40 border-white/10 h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{Array.from(new Set(sortedMonths.map(m => m.year))).map(y => <SelectItem key={y} value={y}>{y} FY</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {fyMonths.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                <Card className="bg-gradient-to-bl from-emerald-900/40 to-background border-emerald-500/20 shadow-xl">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-200">Ending Wealth</CardTitle></CardHeader>
                  <CardContent><div className="text-4xl font-black text-white">{fyTotal.toLocaleString()} <span className="text-lg text-emerald-300 font-medium">LKR</span></div></CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">FY Variance (vs Prev FY ending)</CardTitle></CardHeader>
                  <CardContent className="flex items-center gap-2">
                    {prevFyTotal > 0 ? (
                      <><div className={`text-3xl font-bold ${fyVariance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fyVariance > 0 ? '+' : ''}{fyVariance.toLocaleString()} <span className="text-base text-muted-foreground mr-2 font-medium">LKR</span></div>{fyVariance >= 0 ? <TrendingUp className="w-8 h-8 text-emerald-400" /> : <TrendingDown className="w-8 h-8 text-red-400" />}</>
                    ) : (<div className="text-xl font-medium text-muted-foreground mt-2">No Prev FY data</div>)}
                  </CardContent>
                </Card>

                {/* AI INSIGHTS CARD (FY) */}
                <Card className="lg:col-span-2 bg-gradient-to-br from-indigo-900/40 to-background border-indigo-500/20 shadow-xl shadow-indigo-900/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-bold text-indigo-300"><Sparkles className="w-5 h-5 text-indigo-400" /> FY Engine (AI Analysis)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-indigo-100 leading-relaxed font-medium">
                      {generateSriLankanAIInsight(latestFyMonth?.records || [], fyTotal, fyVariance, "financial year")}
                    </p>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 bg-white/5 border-white/10">
                  <CardHeader><CardTitle className="flex items-center gap-2"><LineChartIcon className="w-5 h-5 text-blue-400" /> Total Assets Trend</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={fyTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000000).toFixed(1)}M`} domain={['auto', 'auto']} />
                          <Tooltip formatter={(val: any) => val.toLocaleString() + ' LKR'} contentStyle={{backgroundColor: 'rgba(15,23,42,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(8px)'}} />
                          <Line type="monotone" dataKey="Total Assets" stroke="#3b82f6" strokeWidth={4} activeDot={{ r: 8 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 bg-white/5 border-white/10">
                  <CardHeader><CardTitle className="flex items-center gap-2"><LineChartIcon className="w-5 h-5 text-indigo-400" /> Net Worth Over Time (Capital Stack)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={fyStackedAreaData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000000).toFixed(1)}M`} domain={['auto', 'auto']} />
                          <Tooltip formatter={(val: any) => val.toLocaleString() + ' LKR'} contentStyle={{backgroundColor: 'rgba(15,23,42,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(8px)'}} />
                          {fyCategories.map((cat, idx) => (
                            <Area key={cat} type="monotone" dataKey={cat} stackId="1" stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.6} activeDot={{ r: 6 }} />
                          ))}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 bg-white/5 border-white/10">
                  <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> Monthly Absolute Gain/Loss</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={fyGainLossData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000000).toFixed(1)}M`} domain={['auto', 'auto']} />
                          <Tooltip formatter={(val: any) => val.toLocaleString() + ' LKR'} />
                          <Line type="monotone" dataKey="Gain/Loss" stroke="rgba(255,255,255,0.2)" strokeWidth={2} dot={renderGainLossDot} activeDot={{ r: 8, fill: '#fff', strokeWidth: 0 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="lg:col-span-2 mt-4 mb-2">
                  <h3 className="text-xl font-bold px-2">Asset Category Deep-Dive</h3>
                </div>
                
                <div className="lg:col-span-2 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {fyCategories.map((cat, idx) => (
                      <Card key={cat} className="bg-white/5 border-white/10">
                        <CardHeader className="pb-0" ><CardTitle className="text-sm text-muted-foreground">{cat} Trend</CardTitle></CardHeader>
                        <CardContent className="pt-4">
                          <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={getCategoryTrend(cat)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="month" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000000).toFixed(1)}M`} width={40} domain={['auto', 'auto']} />
                                <Tooltip formatter={(val: any) => val.toLocaleString() + ' LKR'} />
                                <Line type="monotone" dataKey={cat} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                  ))}
                </div>

                <Card className="lg:col-span-2 bg-white/5 border-white/10 mt-6">
                  <CardHeader><CardTitle className="flex items-center gap-2"><TableIcon className="w-5 h-5 text-emerald-400" /> Year-End Asset Distribution & Variance</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-white/10 text-muted-foreground">
                          <th className="pb-3 px-2 font-medium">Asset</th><th className="pb-3 px-2 font-medium text-right">Final Amount</th><th className="pb-3 px-2 font-medium text-right">Last Year</th><th className="pb-3 px-2 font-medium text-right">YoY Variance</th><th className="pb-3 px-2 font-medium text-right">Portfolio %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fyEndingTableData.map((row, idx) => (
                          <tr key={row.category} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-4 px-2 font-medium flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></span> {row.category}
                            </td>
                            <td className="py-4 px-2 text-right">{row.amount.toLocaleString()} LKR</td>
                            <td className="py-4 px-2 text-right text-muted-foreground">{row.previous > 0 ? row.previous.toLocaleString() + ' LKR' : '-'}</td>
                            <td className={`py-4 px-2 text-right font-medium ${row.variance === 0 ? 'text-muted-foreground' : row.variance > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                               {row.variance > 0 ? '+' : ''}{row.variance.toLocaleString()} LKR 
                               {row.previous > 0 && <span className="text-xs ml-2 opacity-80">({row.variance > 0 ? '+' : ''}{row.percentChange.toFixed(1)}%)</span>}
                            </td>
                            <td className="py-4 px-2 text-right font-medium text-primary bg-primary/5 rounded-r-lg">{row.percentage.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

              </div>
            ) : (<p className="p-8 text-center text-muted-foreground">No data available for this financial year.</p>)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
