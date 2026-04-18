'use client';

import { useState, useMemo, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, ArrowRight, AlertTriangle, Scale, Loader2, RefreshCw } from 'lucide-react';
import { RiskMeter } from '@/components/RiskMeter';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface FieldErrors {
  amount?: string;
  rate?: string;
  tenure?: string;
  income?: string;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

export default function SimulatePage() {
  const router = useRouter();
  const { setCurrentSimulation, addHistory, language } = useAppStore();

  // ── Inputs (blank on load — user must fill in) ────────────────────────────
  const [inputs, setInputs] = useState({ amount: '', rate: '', tenure: '', income: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [incomeDrop, setIncomeDrop] = useState(0);

  // ── Server result + Groq narrative ───────────────────────────────────────
  const [serverResult, setServerResult] = useState<any | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [isProceedLoading, setIsProceedLoading] = useState(false);
  const [proceedError, setProceedError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // ── Validate inputs ────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: FieldErrors = {};
    const amount = parseFloat(inputs.amount);
    const rate = parseFloat(inputs.rate);
    const tenure = parseFloat(inputs.tenure);
    const income = parseFloat(inputs.income);
    if (!inputs.amount || isNaN(amount) || amount <= 0) errs.amount = 'Please enter a valid loan amount greater than zero.';
    if (!inputs.rate || isNaN(rate) || rate <= 0) errs.rate = 'Please enter a valid interest rate greater than zero.';
    if (!inputs.tenure || isNaN(tenure) || tenure <= 0) errs.tenure = 'Please enter a valid tenure in months greater than zero.';
    if (!inputs.income || isNaN(income) || income <= 0) errs.income = 'Please enter a valid monthly income greater than zero.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Local calculations (live for what-if slider) ──────────────────────────
  const numericInputs = useMemo(() => ({
    amount: parseFloat(inputs.amount) || 0,
    rate: parseFloat(inputs.rate) || 0,
    tenure: parseFloat(inputs.tenure) || 0,
    income: parseFloat(inputs.income) || 0,
  }), [inputs]);

  const localCalc = useMemo(() => {
    const { amount, rate, tenure, income } = numericInputs;
    if (!amount || !rate || !tenure || !income) return null;

    const R = (rate / 12) / 100;
    const N = tenure;
    const P = amount;
    const emi = R === 0 ? P / N : (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
    const totalRepayment = emi * N;
    const totalInterest = totalRepayment - P;
    const adjustedIncome = income * (1 - incomeDrop / 100);
    const emiRatio = adjustedIncome > 0 ? (emi / adjustedIncome) * 100 : 100;

    let riskScore = 0;
    if (emiRatio <= 30) riskScore = (emiRatio / 30) * 40;
    else if (emiRatio <= 50) riskScore = 40 + ((emiRatio - 30) / 20) * 35;
    else riskScore = 75 + Math.min((emiRatio - 50) / 50, 1) * 25;
    riskScore = Math.min(Math.max(riskScore, 0), 100);

    const ratioColor =
      emiRatio >= 50 ? 'bg-danger text-white' :
      emiRatio >= 30 ? 'bg-warning text-white' : 'bg-success text-white';

    return { emi, totalRepayment, totalInterest, emiRatio, adjustedIncome, riskScore, ratioColor };
  }, [numericInputs, incomeDrop]);

  // ── 12-month projection (cumulative savings grow month by month) ──────────
  const projectionTable = useMemo(() => {
    if (!localCalc) return [];
    const { emi, adjustedIncome } = localCalc;
    const livingCost = adjustedIncome * 0.4;
    const monthlySurplus = adjustedIncome - emi - livingCost;
    const rows = [];
    let cumulativeSavings = 0;
    let cumulativePaid = 0;
    for (let i = 1; i <= Math.min(12, numericInputs.tenure || 12); i++) {
      cumulativeSavings += monthlySurplus;
      cumulativePaid += emi;
      rows.push({
        month: i,
        savingsRemaining: cumulativeSavings,
        cumulativePaid,
        isRisky: cumulativeSavings < 0,
      });
    }
    return rows;
  }, [localCalc, numericInputs.tenure]);

  // ── Calculate button → call /api/simulate ─────────────────────────────────
  const handleCalculate = async () => {
    if (!validate()) return;
    setCalcError(null);
    setIsCalculating(true);
    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_amount: numericInputs.amount,
          interest_rate: numericInputs.rate,
          tenure_months: numericInputs.tenure,
          monthly_income: numericInputs.income,
          language,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || `Server error ${response.status}`);
      }
      setServerResult(await response.json());
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : 'Failed to calculate. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  // ── Proceed to confirm ────────────────────────────────────────────────────
  const handleProceed = async () => {
    if (!serverResult) return;
    setProceedError(null);
    setIsProceedLoading(true);
    try {
      const rec = { ...numericInputs, ...serverResult, id: `SIM-${Date.now()}` };
      setCurrentSimulation(rec);
      addHistory({ id: rec.id, type: 'simulation', date: new Date().toISOString(), riskScore: Math.round(serverResult.risk_score ?? 0), details: rec });
      router.push('/confirm');
    } catch (err) {
      setProceedError(err instanceof Error ? err.message : 'Failed to proceed.');
    } finally {
      setIsProceedLoading(false);
    }
  };

  // ── Risk score to show (Groq-verified if available, else local) ───────────
  const displayRiskScore = serverResult?.risk_score ?? localCalc?.riskScore ?? 0;
  const displayEmiRatio = localCalc?.emiRatio ?? 0;
  const hasResults = !!serverResult;

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <h1 className="text-[32px] font-bold text-primary dark:text-primary-foreground mb-8">
        Simulate Your Loan or EMI
      </h1>

      {/* High-risk warning */}
      {localCalc && localCalc.emiRatio > 50 && (
        <div className="w-full bg-warning px-6 py-4 rounded-xl shadow-sm mb-8 flex items-center">
          <AlertTriangle className="text-white h-8 w-8 mr-4 shrink-0" />
          <p className="text-[18px] font-bold text-white">
            Warning: Your EMI would exceed 50% of your income — extreme financial stress.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8">
        {/* ── Inputs ── */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-surface dark:bg-card border-border shadow-sm border rounded-xl p-6">
            <div className="space-y-5">
              {/* Loan Amount */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[17px] font-bold text-primary dark:text-primary-foreground">Loan Amount (₹)</Label>
                  <Tooltip>
                    <TooltipTrigger><HelpCircle className="h-5 w-5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent><p>The total principal amount you borrow.</p></TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="number"
                  placeholder="e.g. 500000"
                  value={inputs.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  className={cn('h-[52px] text-[18px] font-semibold', fieldErrors.amount && 'border-danger')}
                />
                {fieldErrors.amount && <p className="text-danger text-[14px] font-medium">{fieldErrors.amount}</p>}
              </div>

              {/* Interest Rate */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[17px] font-bold text-primary dark:text-primary-foreground">Interest Rate (% per year)</Label>
                  <Tooltip>
                    <TooltipTrigger><HelpCircle className="h-5 w-5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent><p>Annual cost to borrow this money.</p></TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 10.5"
                  value={inputs.rate}
                  onChange={(e) => handleInputChange('rate', e.target.value)}
                  className={cn('h-[52px] text-[18px] font-semibold', fieldErrors.rate && 'border-danger')}
                />
                {fieldErrors.rate && <p className="text-danger text-[14px] font-medium">{fieldErrors.rate}</p>}
              </div>

              {/* Tenure */}
              <div className="space-y-1">
                <Label className="text-[17px] font-bold text-primary dark:text-primary-foreground">Tenure (Months)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 60"
                  value={inputs.tenure}
                  onChange={(e) => handleInputChange('tenure', e.target.value)}
                  className={cn('h-[52px] text-[18px] font-semibold', fieldErrors.tenure && 'border-danger')}
                />
                {fieldErrors.tenure && <p className="text-danger text-[14px] font-medium">{fieldErrors.tenure}</p>}
              </div>

              {/* Income */}
              <div className="space-y-1 pt-4 border-t border-border">
                <Label className="text-[17px] font-bold text-primary dark:text-primary-foreground">Monthly Income (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={inputs.income}
                  onChange={(e) => handleInputChange('income', e.target.value)}
                  className={cn('h-[52px] text-[18px] font-semibold', fieldErrors.income && 'border-danger')}
                />
                {fieldErrors.income && <p className="text-danger text-[14px] font-medium">{fieldErrors.income}</p>}
                {inputs.income && (
                  <Slider
                    value={[numericInputs.income]}
                    onValueChange={(val) => handleInputChange('income', String((val as number[])[0]))}
                    max={200000}
                    step={1000}
                    className="mt-4"
                  />
                )}
              </div>

              {/* Calculate button */}
              {calcError && (
                <div className="bg-danger/10 border-l-4 border-danger p-3 rounded-r text-danger font-semibold text-[14px] flex items-center justify-between">
                  <span>{calcError}</span>
                  <Button variant="link" onClick={() => setCalcError(null)} className="text-danger p-0 shrink-0 ml-2 h-auto">
                    Dismiss
                  </Button>
                </div>
              )}
              <Button
                onClick={handleCalculate}
                disabled={isCalculating}
                className="w-full h-[52px] text-[18px] font-bold bg-primary hover:bg-primary/90 text-white rounded-xl disabled:opacity-60"
              >
                {isCalculating
                  ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Calculating…</>
                  : <>Calculate <ArrowRight className="ml-2 h-5 w-5" /></>}
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Results ── */}
        <div className="lg:col-span-7 flex flex-col gap-5 min-w-0">
          {/* Loading skeleton */}
          {isCalculating ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-[110px] bg-border/40 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : localCalc ? (
            <>
              {/* 2×2 metric cards */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Card className="bg-surface dark:bg-card border rounded-xl flex flex-col justify-center p-6 min-h-[130px]">
                  <p className="text-[14px] text-muted-foreground font-semibold mb-1 uppercase tracking-wide">Monthly EMI</p>
                  <div className="text-[32px] font-bold text-primary dark:text-primary-foreground">
                    {formatCurrency(localCalc.emi)}
                  </div>
                </Card>

                <Card className="bg-surface dark:bg-card border rounded-xl flex flex-col justify-center p-6 min-h-[130px]">
                  <p className="text-[14px] text-muted-foreground font-semibold mb-1 uppercase tracking-wide">Total Payable</p>
                  <div className="text-[32px] font-bold text-danger">{formatCurrency(localCalc.totalRepayment)}</div>
                  <p className="text-[13px] text-muted-foreground mt-1">Extra interest: {formatCurrency(localCalc.totalInterest)}</p>
                </Card>

                <Card className="bg-surface dark:bg-card border rounded-xl flex items-center p-6 min-h-[110px]">
                  <div className="flex-1">
                    <p className="text-[14px] text-muted-foreground font-semibold mb-2 uppercase tracking-wide">EMI as % of Income</p>
                    <Badge className={cn('px-4 py-2 text-[17px] font-bold', localCalc.ratioColor)}>
                      {localCalc.emiRatio.toFixed(1)}%
                    </Badge>
                  </div>
                </Card>

                <Card className="bg-surface dark:bg-card border rounded-xl flex flex-col justify-center p-6 min-h-[110px]">
                  <p className="text-[14px] text-muted-foreground font-semibold mb-1 uppercase tracking-wide">Penalty Exposure</p>
                  <div className={cn('text-[18px] font-bold', localCalc.emiRatio > 40 ? 'text-danger' : 'text-success')}>
                    {localCalc.emiRatio > 40 ? 'High Risk of Penalties' : 'Low Exposure'}
                  </div>
                </Card>
              </div>

              {/* Animated Risk Meter */}
              <Card className="bg-surface dark:bg-card border rounded-xl p-6">
                <RiskMeter score={displayRiskScore} />
              </Card>

              {/* Groq narrative + tips (shown after Calculate) */}
              {hasResults && serverResult.risk_narrative && (
                <Card className="bg-surface dark:bg-card border rounded-xl p-6">
                  <p className="text-[16px] font-semibold text-foreground leading-relaxed mb-4">
                    {serverResult.risk_narrative}
                  </p>
                  {serverResult.advice_tips?.length > 0 && (
                    <ul className="space-y-2">
                      {serverResult.advice_tips.map((tip: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-[15px] text-muted-foreground font-medium">
                          <span className="text-primary mt-0.5">•</span> {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}

              {/* What-if income drop slider */}
              <Card className="bg-surface dark:bg-card border rounded-xl p-6 bg-amber-50/10">
                <Label className="text-[17px] font-bold mb-4 flex items-center gap-2">
                  <Scale className="text-primary" /> What if my income drops by {incomeDrop}%?
                </Label>
                <Slider
                  value={[incomeDrop]}
                  onValueChange={(val) => setIncomeDrop((val as number[])[0])}
                  max={40}
                  step={10}
                />
                {incomeDrop > 0 && (
                  <p className="mt-3 text-[15px] text-muted-foreground font-medium">
                    Adjusted EMI-to-income ratio:{' '}
                    <span className={cn('font-bold', localCalc.emiRatio >= 50 ? 'text-danger' : localCalc.emiRatio >= 30 ? 'text-warning' : 'text-success')}>
                      {localCalc.emiRatio.toFixed(1)}%
                    </span>
                  </p>
                )}
              </Card>

              {/* 12-month timeline */}
              <div>
                <p className="text-[18px] font-bold mb-4 text-primary dark:text-primary-foreground">12-Month Savings Timeline</p>
                <div className="flex overflow-x-auto gap-3 pb-4 snap-x">
                  {projectionTable.map((m) => (
                    <div
                      key={m.month}
                      className={cn(
                        'shrink-0 w-[210px] p-4 rounded-xl border-[2px] snap-center',
                        m.isRisky ? 'border-danger bg-danger/5' : 'border-border bg-surface dark:bg-card',
                      )}
                    >
                      <p className="text-[16px] font-bold mb-2">Month {m.month}</p>
                      <p className={cn('text-[15px] font-semibold', m.isRisky ? 'text-danger' : 'text-muted-foreground')}>
                        Savings: {formatCurrency(m.savingsRemaining)}
                      </p>
                      <p className="text-[13px] text-muted-foreground mt-1">Paid: {formatCurrency(m.cumulativePaid)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error + Proceed */}
              {proceedError && (
                <div className="bg-danger/10 border-l-4 border-danger p-3 rounded-r text-danger font-semibold text-[14px] flex items-center justify-between">
                  <span>{proceedError}</span>
                  <Button variant="link" onClick={() => setProceedError(null)} className="text-danger p-0 shrink-0 ml-2 h-auto">Dismiss</Button>
                </div>
              )}

              {hasResults ? (
                <Button
                  onClick={handleProceed}
                  disabled={isProceedLoading}
                  className="w-full h-[52px] text-[18px] font-bold bg-primary hover:bg-primary/90 text-white rounded-xl disabled:opacity-60"
                >
                  {isProceedLoading
                    ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing…</>
                    : <>Go to Confirmation <ArrowRight className="ml-2 h-5 w-5" /></>}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled
                  className="w-full h-[52px] text-[16px] text-muted-foreground border-dashed"
                >
                  Click Calculate above to proceed
                </Button>
              )}
            </>
          ) : (
            <div className="h-full min-h-[400px] border-[2px] border-dashed border-border rounded-xl bg-surface/50 dark:bg-card/50 flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-4">
              <Scale className="h-20 w-20 text-border" />
              <p className="max-w-[300px] text-[18px] font-semibold">
                Enter your loan details and click Calculate to see results.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
