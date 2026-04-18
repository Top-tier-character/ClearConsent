'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, ArrowRight, AlertTriangle, Scale, Loader2 } from 'lucide-react';
import { RiskMeter } from '@/components/RiskMeter';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function SimulatePage() {
  const router = useRouter();
  const { setCurrentSimulation, addHistory, language } = useAppStore();
  
  const [inputs, setInputs] = useState({
    amount: 500000,
    rate: 10.5,
    tenure: 60,
    income: 50000,
  });

  const [incomeDrop, setIncomeDrop] = useState(0); 
  const [flash, setFlash] = useState(false);
  const [isProceedLoading, setIsProceedLoading] = useState(false);
  const [proceedError, setProceedError] = useState<string | null>(null);
  const prevData = useRef<any>(null);

  const handleInputChange = (field: string, value: string) => {
    setInputs(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const handleWhatIfDrop = (val: number) => {
    setIncomeDrop(val);
    setFlash(true);
    setTimeout(() => setFlash(false), 800);
  };

  // Calculations
  const calcData = useMemo(() => {
    const P = inputs.amount;
    const R = (inputs.rate / 12) / 100;
    const N = inputs.tenure;

    let emi = 0;
    if (R === 0) {
      emi = N > 0 ? P / N : 0;
    } else {
      emi = N > 0 ? (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1) : 0;
    }

    const totalRepayment = emi * N;
    const totalInterest = totalRepayment - P;

    const actualIncome = inputs.income * (1 - (incomeDrop / 100));
    const emiToIncomeRatio = actualIncome > 0 ? (emi / actualIncome) * 100 : 100;

    let riskScore = 0;
    if (emiToIncomeRatio <= 30) riskScore = (emiToIncomeRatio / 30) * 40; 
    else if (emiToIncomeRatio <= 50) riskScore = 40 + ((emiToIncomeRatio - 30) / 20) * 35;
    else riskScore = 75 + ((emiToIncomeRatio - 50) / 50) * 25; 
    riskScore = Math.min(Math.max(riskScore, 0), 100);

    let ratioColor = "bg-success hover:bg-success text-white";
    if (emiToIncomeRatio >= 30 && emiToIncomeRatio < 50) ratioColor = "bg-warning hover:bg-warning text-white";
    if (emiToIncomeRatio >= 50) ratioColor = "bg-danger hover:bg-danger text-white";

    const penaltyExposure = emiToIncomeRatio > 40 ? "High Risk of Penalties" : "Low Exposure";

    return { emi, totalRepayment, totalInterest, emiToIncomeRatio, actualIncome, riskScore, ratioColor, penaltyExposure };
  }, [inputs, incomeDrop]);

  // 12-month projection
  const projectionTable = useMemo(() => {
    const rows = [];
    let cumulativePaid = 0;
    for (let i = 1; i <= Math.min(12, inputs.tenure || 12); i++) {
      cumulativePaid += calcData.emi;
      const savingsRemaining = calcData.actualIncome - calcData.emi;
      const isRisky = savingsRemaining < (calcData.actualIncome * 0.2);
      rows.push({ month: i, savingsRemaining, cumulativePaid, isRisky });
    }
    return rows;
  }, [calcData, inputs.tenure]);

  const handleProceed = async () => {
    setProceedError(null);
    setIsProceedLoading(true);
    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_amount: inputs.amount,
          interest_rate: inputs.rate,
          tenure_months: inputs.tenure,
          monthly_income: inputs.income,
          language,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || `Server error ${response.status}`);
      }

      const serverData = await response.json();

      // Merge server-authoritative numbers with local inputs for the store
      const simulationRecord = {
        ...inputs,
        ...serverData,
        id: serverData.consent_id || `SIM-${Date.now()}`,
      };

      setCurrentSimulation(simulationRecord);
      addHistory({
        id: simulationRecord.id,
        type: 'simulation',
        date: new Date().toISOString(),
        riskScore: Math.round(serverData.risk_score ?? calcData.riskScore),
        details: simulationRecord,
      });

      router.push('/confirm');
    } catch (err) {
      setProceedError(err instanceof Error ? err.message : 'Failed to process simulation.');
    } finally {
      setIsProceedLoading(false);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <h1 className="text-[32px] font-bold text-primary dark:text-primary-foreground mb-8">
        Let's see what this means for your money
      </h1>

      {calcData.emiToIncomeRatio > 50 && (
        <div className="w-full bg-warning px-6 py-4 rounded-xl shadow-sm mb-8 flex items-center">
          <AlertTriangle className="text-white h-8 w-8 mr-4" />
          <p className="text-[20px] font-bold text-white">
            Warning: Your EMI exceeds 50% of your income. This places you under extreme financial stress.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Inputs */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-surface dark:bg-card border-border shadow-sm border-[1px] rounded-xl p-6">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[18px] font-bold text-primary dark:text-primary-foreground">Loan Amount (₹)</Label>
                  <Tooltip>
                    <TooltipTrigger><HelpCircle className="h-5 w-5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent><p className="text-[16px]">The total principal amount you borrow.</p></TooltipContent>
                  </Tooltip>
                </div>
                <Input type="number" value={inputs.amount} onChange={(e) => handleInputChange('amount', e.target.value)} className="h-[52px] text-[20px] font-semibold" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[18px] font-bold text-primary dark:text-primary-foreground">Interest Rate (%)</Label>
                  <Tooltip>
                    <TooltipTrigger><HelpCircle className="h-5 w-5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent><p className="text-[16px]">Yearly cost you extra to borrow this money.</p></TooltipContent>
                  </Tooltip>
                </div>
                <Input type="number" step="0.1" value={inputs.rate} onChange={(e) => handleInputChange('rate', e.target.value)} className="h-[52px] text-[20px] font-semibold" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[18px] font-bold text-primary dark:text-primary-foreground">Tenure (Months)</Label>
                </div>
                <Input type="number" value={inputs.tenure} onChange={(e) => handleInputChange('tenure', e.target.value)} className="h-[52px] text-[20px] font-semibold" />
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-[18px] font-bold text-primary dark:text-primary-foreground">Monthly Income (₹)</Label>
                </div>
                <Input type="number" value={inputs.income} onChange={(e) => handleInputChange('income', e.target.value)} className="h-[52px] text-[20px] font-semibold" />
                <Slider 
                  value={[inputs.income]} 
                  onValueChange={(val) => setInputs(prev => ({...prev, income: (val as number[])[0]}))} 
                  max={200000} step={1000} className="mt-4" 
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-7 flex flex-col gap-6 min-w-0">
          {/* 2x2 Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="bg-surface dark:bg-card border-border shadow-sm border-[1px] rounded-xl flex flex-col justify-center p-6 min-h-[140px]">
              <p className="text-[16px] text-muted-foreground font-semibold mb-1 uppercase">Monthly EMI</p>
              <div className={cn("text-[28px] lg:text-[36px] font-bold text-primary dark:text-primary-foreground transition-colors duration-300", flash && "text-danger")}>
                {formatCurrency(calcData.emi)}
              </div>
            </Card>

            <Card className="bg-surface dark:bg-card border-border shadow-sm border-[1px] rounded-xl flex flex-col justify-center p-6 min-h-[140px]">
              <p className="text-[16px] text-muted-foreground font-semibold mb-1 uppercase">Total Payable</p>
              <div className={cn("text-[28px] lg:text-[36px] font-bold text-danger transition-colors duration-300", flash && "opacity-50")}>
                {formatCurrency(calcData.totalRepayment)}
              </div>
              <p className="text-[14px] text-muted-foreground mt-1 font-medium">Extra Interest Cost: {formatCurrency(calcData.totalInterest)}</p>
            </Card>

            <Card className="bg-surface dark:bg-card border-border shadow-sm border-[1px] rounded-xl flex items-center p-6 min-h-[120px]">
              <div className="flex-1">
                <p className="text-[16px] text-muted-foreground font-semibold mb-2 uppercase">EMI as % of Income</p>
                <Badge className={cn("px-4 py-2 text-[18px] font-bold transition-all", calcData.ratioColor, flash && "scale-110")}>
                  {calcData.emiToIncomeRatio.toFixed(1)}%
                </Badge>
              </div>
            </Card>

            <Card className="bg-surface dark:bg-card border-border shadow-sm border-[1px] rounded-xl flex flex-col justify-center p-6 min-h-[120px]">
              <p className="text-[16px] text-muted-foreground font-semibold mb-1 uppercase">Penalty Exposure</p>
              <div className={cn("text-[20px] font-bold text-warning transition-colors duration-300", flash && "text-danger")}>
                {calcData.penaltyExposure}
              </div>
            </Card>
          </div>

          <Card className="bg-surface dark:bg-card border-border shadow-sm border-[1px] rounded-xl p-6 relative overflow-hidden">
            <RiskMeter score={calcData.riskScore} />
          </Card>

          <Card className="bg-surface dark:bg-card border-border shadow-sm border-[1px] rounded-xl p-6 bg-amber-50/10">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 w-full">
                <Label className="text-[18px] font-bold mb-4 block flex items-center">
                  <Scale className="mr-2 text-primary" /> What if my income drops by {incomeDrop}%?
                </Label>
                <Slider 
                  value={[incomeDrop]} 
                  onValueChange={(val) => handleWhatIfDrop((val as number[])[0])} 
                  max={50} step={10} 
                />
              </div>
            </div>
          </Card>

          <div className="w-full mt-4">
            <p className="text-[20px] font-bold mb-4 text-primary dark:text-primary-foreground">12-Month Timeline</p>
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
              {projectionTable.map((m) => (
                <div key={m.month} className={cn("shrink-0 w-[240px] p-4 rounded-xl border-[2px] snap-center", m.isRisky ? "border-danger bg-danger/5" : "border-border bg-surface dark:bg-card")}>
                  <p className="text-[18px] font-bold mb-2">Month {m.month}</p>
                  <p className="text-[16px] text-muted-foreground">Savings: {formatCurrency(m.savingsRemaining)}</p>
                  <p className="text-[14px] text-muted-foreground mt-1">Paid: {formatCurrency(m.cumulativePaid)}</p>
                </div>
              ))}
            </div>
          </div>

          {proceedError && (
            <div className="w-full bg-danger/10 border-l-4 border-danger p-4 rounded-r text-danger font-semibold text-[16px] flex items-center justify-between">
              <span>{proceedError}</span>
              <Button variant="link" onClick={() => setProceedError(null)} className="text-danger p-0 shrink-0 ml-4">Dismiss</Button>
            </div>
          )}

          <Button 
            onClick={handleProceed}
            disabled={isProceedLoading}
            className="w-full h-[52px] text-[20px] font-bold bg-primary hover:bg-primary/90 text-white mt-4 disabled:opacity-60"
          >
            {isProceedLoading ? (
              <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Processing...</>
            ) : (
              <>Go to Confirmation <ArrowRight className="ml-2 h-6 w-6" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
