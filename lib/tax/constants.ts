export const STANDARD_DEDUCTION = 50000;
export const SECTION_80C_LIMIT = 150000;
export const SECTION_80D_LIMIT = 25000;
export const SECTION_80CCD1B_LIMIT = 50000;
export const HOME_LOAN_INTEREST_LIMIT = 200000;

export interface TaxSlab {
  from: number;
  to: number | null;
  rate: number;
}

export const OLD_REGIME_SLABS: TaxSlab[] = [
  { from: 0, to: 250000, rate: 0 },
  { from: 250000, to: 500000, rate: 0.05 },
  { from: 500000, to: 1000000, rate: 0.2 },
  { from: 1000000, to: null, rate: 0.3 },
];

export const NEW_REGIME_SLABS: TaxSlab[] = [
  { from: 0, to: 300000, rate: 0 },
  { from: 300000, to: 700000, rate: 0.05 },
  { from: 700000, to: 1000000, rate: 0.1 },
  { from: 1000000, to: 1200000, rate: 0.15 },
  { from: 1200000, to: 1500000, rate: 0.2 },
  { from: 1500000, to: null, rate: 0.3 },
];

export const HEALTH_EDUCATION_CESS_RATE = 0.04;
