/**
 * finance.ts — Pure financial calculation functions.
 *
 * All functions are exported as named exports so they are tree-shakeable
 * and independently unit-testable without any runtime side effects.
 *
 * These are the canonical implementations used by /api/simulate.
 */

export type RiskLevel = 'safe' | 'caution' | 'danger';

export interface ProjectionMonth {
  month: number;
  cumulative_paid: number;
  savings_remaining: number;
  is_risky: boolean;
}

export interface WhatIfScenario {
  drop_percent: number;
  new_income: number;
  new_ratio: number;
  new_risk_level: RiskLevel;
}

/**
 * Calculate monthly EMI using the standard reducing-balance formula.
 * EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 * where r = monthly_rate (annual_rate / 12 / 100) and n = tenure_months.
 */
export function calculateEMI(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number
): number {
  if (tenureMonths <= 0) return 0;
  const r = annualRatePercent / 12 / 100;
  if (r === 0) return principal / tenureMonths;
  const powered = Math.pow(1 + r, tenureMonths);
  return (principal * r * powered) / (powered - 1);
}

/** Total amount repaid over the loan tenure. */
export function totalRepayment(emi: number, tenureMonths: number): number {
  return emi * tenureMonths;
}

/** Total interest paid = total_repayment - principal. */
export function totalInterest(total: number, principal: number): number {
  return total - principal;
}

/** EMI-to-income ratio as a percentage (0–100+). */
export function emiToIncomeRatio(emi: number, monthlyIncome: number): number {
  if (monthlyIncome <= 0) return 100;
  return (emi / monthlyIncome) * 100;
}

/** Classify risk level from the EMI-to-income ratio. */
export function riskLevel(ratio: number): RiskLevel {
  if (ratio < 30) return 'safe';
  if (ratio <= 50) return 'caution';
  return 'danger';
}

/**
 * Composite risk score (0–100):
 *  - EMI ratio weight: 50%
 *  - Tenure normalization (max useful = 360 months): 25%
 *  - Interest rate normalization (max meaningful = 36% p.a.): 25%
 */
export function compositeRiskScore(
  ratio: number,
  tenureMonths: number,
  annualRatePercent: number
): number {
  const ratioComponent = Math.min(ratio / 100, 1) * 50;
  const tenureComponent = Math.min(tenureMonths / 360, 1) * 25;
  const rateComponent = Math.min(annualRatePercent / 36, 1) * 25;
  return Math.min(Math.max(ratioComponent + tenureComponent + rateComponent, 0), 100);
}

/**
 * Build a 12-month projection array.
 *
 * For each month 1–12:
 *  - cumulative_paid: EMI × month
 *  - savings_remaining: (income − EMI − living_cost) × month
 *    where living_cost is fixed at 40% of monthly income
 *  - is_risky: true when savings_remaining drops below one month's EMI
 */
export function buildProjection(
  emi: number,
  monthlyIncome: number,
  tenureMonths: number
): ProjectionMonth[] {
  const livingCost = monthlyIncome * 0.4;
  const monthlyNet = monthlyIncome - emi - livingCost;
  const months = Math.min(12, tenureMonths > 0 ? tenureMonths : 12);

  return Array.from({ length: months }, (_, i) => {
    const month = i + 1;
    const cumulative_paid = emi * month;
    const savings_remaining = monthlyNet * month;
    const is_risky = savings_remaining < emi;
    return { month, cumulative_paid, savings_remaining, is_risky };
  });
}

/**
 * What-If scenarios: calculate the effect of a 10%, 20%, and 30% income drop.
 */
export function buildWhatIfScenarios(emi: number, monthlyIncome: number): WhatIfScenario[] {
  return [10, 20, 30].map((drop_percent) => {
    const new_income = monthlyIncome * (1 - drop_percent / 100);
    const new_ratio = emiToIncomeRatio(emi, new_income);
    const new_risk_level = riskLevel(new_ratio);
    return { drop_percent, new_income, new_ratio, new_risk_level };
  });
}

/** Estimated monthly penalty exposure if a payment is missed (EMI × 10%). */
export function penaltyExposure(emi: number): number {
  return emi * 0.1;
}

/** Estimated living cost as 40% of monthly income. */
export function estimatedLivingCost(monthlyIncome: number): number {
  return monthlyIncome * 0.4;
}
