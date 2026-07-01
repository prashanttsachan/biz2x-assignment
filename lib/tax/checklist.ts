import { getTaxDeclaration } from "@/lib/payroll/queries";
import type { ChecklistItem } from "@/lib/types";

function getProofStatus(
  submitted: boolean,
  dueDate: string
): "submitted" | "pending" | "overdue" {
  if (submitted) return "submitted";
  const due = new Date(dueDate);
  return due < new Date() ? "overdue" : "pending";
}

export function generateInvestmentChecklist(
  employeeId: string
): ChecklistItem[] {
  const declaration = getTaxDeclaration(employeeId);
  if (!declaration) {
    return [
      {
        id: "no-declaration",
        category: "General",
        title: "Submit tax declaration",
        description:
          "No tax declaration found. Please submit your investment declarations to Payroll.",
        status: "pending",
        dueDate: new Date().toISOString().split("T")[0],
      },
    ];
  }

  const items: ChecklistItem[] = [];

  if (declaration.section80C.declared > 0) {
    items.push({
      id: "80c-proof",
      category: "Section 80C",
      title: "Investment proof for Section 80C",
      description: `Submit proof for declared investments of ₹${declaration.section80C.declared.toLocaleString("en-IN")} (PPF, ELSS, LIC, etc.)`,
      status: getProofStatus(
        declaration.section80C.proofSubmitted,
        declaration.section80C.proofDueDate
      ),
      dueDate: declaration.section80C.proofDueDate,
      amount: declaration.section80C.declared,
    });
  } else if (declaration.section80C.declared < declaration.section80C.limit) {
    items.push({
      id: "80c-remaining",
      category: "Section 80C",
      title: "Utilize remaining 80C limit",
      description: `You have ₹${(declaration.section80C.limit - declaration.section80C.declared).toLocaleString("en-IN")} remaining under Section 80C limit.`,
      status: "pending",
      dueDate: declaration.section80C.proofDueDate,
      amount: declaration.section80C.limit - declaration.section80C.declared,
    });
  }

  if (declaration.section80D.declared > 0) {
    items.push({
      id: "80d-proof",
      category: "Section 80D",
      title: "Health insurance premium proof",
      description: `Submit proof for declared health insurance of ₹${declaration.section80D.declared.toLocaleString("en-IN")}`,
      status: getProofStatus(
        declaration.section80D.proofSubmitted,
        declaration.section80D.proofDueDate
      ),
      dueDate: declaration.section80D.proofDueDate,
      amount: declaration.section80D.declared,
    });
  }

  if (declaration.hra.declared) {
    items.push({
      id: "hra-proof",
      category: "HRA",
      title: "Rent receipt / HRA declaration proof",
      description: `Submit rent receipts for monthly rent of ₹${declaration.hra.rentPaidMonthly.toLocaleString("en-IN")}`,
      status: getProofStatus(
        declaration.hra.proofSubmitted,
        declaration.hra.proofDueDate
      ),
      dueDate: declaration.hra.proofDueDate,
      amount: declaration.hra.rentPaidMonthly * 12,
    });
  }

  if (declaration.lta.declared) {
    items.push({
      id: "lta-proof",
      category: "LTA",
      title: "LTA travel proof",
      description: `Submit travel tickets/bills for declared LTA of ₹${declaration.lta.amount.toLocaleString("en-IN")}`,
      status: getProofStatus(
        declaration.lta.proofSubmitted,
        declaration.lta.proofDueDate
      ),
      dueDate: declaration.lta.proofDueDate,
      amount: declaration.lta.amount,
    });
  }

  if (declaration.homeLoanInterest.declared > 0) {
    items.push({
      id: "home-loan-proof",
      category: "Home Loan",
      title: "Home loan interest certificate",
      description: `Submit interest certificate for declared home loan interest of ₹${declaration.homeLoanInterest.declared.toLocaleString("en-IN")}`,
      status: getProofStatus(
        declaration.homeLoanInterest.proofSubmitted,
        declaration.homeLoanInterest.proofDueDate
      ),
      dueDate: declaration.homeLoanInterest.proofDueDate,
      amount: declaration.homeLoanInterest.declared,
    });
  }

  items.push({
    id: "form-16",
    category: "Payroll Documents",
    title: "Form 16 (when available)",
    description:
      "Download Form 16 from the payroll portal once issued by Finance.",
    status: "pending",
    dueDate: "2025-06-30",
  });

  return items;
}
