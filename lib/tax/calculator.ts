import {
  HEALTH_EDUCATION_CESS_RATE,
  type TaxSlab,
} from "@/lib/tax/constants";
import type { TaxSlabLine } from "@/lib/types";

export function computeSlabTax(
  taxableIncome: number,
  slabs: TaxSlab[]
): { taxBeforeCess: number; slabBreakdown: TaxSlabLine[] } {
  if (taxableIncome <= 0) {
    return { taxBeforeCess: 0, slabBreakdown: [] };
  }

  let taxBeforeCess = 0;
  const slabBreakdown: TaxSlabLine[] = [];

  for (const slab of slabs) {
    const slabEnd = slab.to ?? Infinity;
    const taxableInSlab = Math.max(
      0,
      Math.min(taxableIncome, slabEnd) - slab.from
    );
    if (taxableInSlab <= 0) continue;

    const taxInSlab = taxableInSlab * slab.rate;
    taxBeforeCess += taxInSlab;
    slabBreakdown.push({
      from: slab.from,
      to: slab.to,
      rate: slab.rate,
      taxableAmount: Math.round(taxableInSlab),
      taxAmount: Math.round(taxInSlab),
    });
  }

  return { taxBeforeCess, slabBreakdown };
}

export function estimateAnnualTax(
  taxableIncome: number,
  slabs: TaxSlab[]
): number {
  const { taxBeforeCess } = computeSlabTax(taxableIncome, slabs);
  const cess = taxBeforeCess * HEALTH_EDUCATION_CESS_RATE;
  return Math.round(taxBeforeCess + cess);
}

export function estimateHraExemption(params: {
  annualBasic: number;
  annualHraReceived: number;
  annualRentPaid: number;
  isMetro?: boolean;
}): number {
  const { annualBasic, annualHraReceived, annualRentPaid, isMetro = true } =
    params;

  if (annualRentPaid <= 0 || annualHraReceived <= 0) return 0;

  const tenPercentBasic = annualBasic * 0.1;
  const actualRentMinusBasic = Math.max(0, annualRentPaid - tenPercentBasic);
  const cityLimit = annualBasic * (isMetro ? 0.5 : 0.4);

  return Math.round(
    Math.min(actualRentMinusBasic, cityLimit, annualHraReceived)
  );
}

export function formatSlabLabel(from: number, to: number | null): string {
  const fmt = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`;
  if (to === null) return `Above ${fmt(from)}`;
  return `${fmt(from)} – ${fmt(to)}`;
}
