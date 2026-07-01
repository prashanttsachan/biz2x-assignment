import {
  buildChatSystemPrompt,
  COMPONENT_EXPLANATIONS,
} from "@/lib/ai/prompts";
import { queryLlm } from "@/lib/ai/llm-client";
import {
  buildPayrollContext,
  explainNetPay,
  formatCurrency,
  getLatestPayslip,
  getStructuredPayroll,
} from "@/lib/payroll/queries";
import type { AnswerSource, ChatMessage } from "@/lib/types";

function extractSourcesFromAnswer(
  answer: string,
  contextSources: AnswerSource[]
): AnswerSource[] {
  const cited: AnswerSource[] = [];
  for (const source of contextSources) {
    const ref = source.reference.toLowerCase();
    if (answer.toLowerCase().includes(ref.split(" ")[0].toLowerCase())) {
      cited.push(source);
    }
  }
  if (cited.length === 0 && contextSources.length > 0) {
    return contextSources.slice(0, 3);
  }
  return cited;
}

function buildPayrollSummary(employeeId: string): string {
  const payroll = getStructuredPayroll(employeeId);
  return payroll
    .map(
      (p) =>
        `${p.month} ${p.year}: Gross=${formatCurrency(p.earnings.grossPay)}, HRA=${formatCurrency(p.earnings.hra)}, PF=${formatCurrency(p.deductions.providentFund)}, TDS=${formatCurrency(p.deductions.incomeTaxTds)}, Net=${formatCurrency(p.netPay)}, YTD Net=${formatCurrency(p.ytd.netPay)}`
    )
    .join("\n");
}

function answerFromStructuredData(
  question: string,
  employeeId: string,
  employeeName: string
): { answer: string; sources: AnswerSource[] } {
  const q = question.toLowerCase();
  const latest = getLatestPayslip(employeeId);
  const payroll = getStructuredPayroll(employeeId);
  const sources: AnswerSource[] = [];

  if (!latest) {
    return {
      answer:
        "I don't have any payroll records for your account. Please contact Payroll/HR.",
      sources: [],
    };
  }

  if (q.includes("net salary") || q.includes("net pay") || q.includes("lower")) {
    const prev = payroll.length >= 2 ? payroll[payroll.length - 2] : null;
    const steps = explainNetPay(latest);
    let answer = `Your net pay for **${latest.month} ${latest.year}** is **${formatCurrency(latest.netPay)}**.\n\n**Breakdown:**\n`;
    for (const step of steps) {
      answer += `- ${step.label}: ${formatCurrency(step.result)} (${step.formula})\n`;
    }
    if (prev && latest.netPay < prev.netPay) {
      const diff = prev.netPay - latest.netPay;
      answer += `\nYour net pay is **${formatCurrency(diff)} lower** than ${prev.month} ${prev.year} (${formatCurrency(prev.netPay)}). `;
      if (latest.deductions.incomeTaxTds > prev.deductions.incomeTaxTds) {
        answer += `TDS increased from ${formatCurrency(prev.deductions.incomeTaxTds)} to ${formatCurrency(latest.deductions.incomeTaxTds)}. `;
      }
      if (latest.reimbursements.total < prev.reimbursements.total) {
        answer += `Reimbursements decreased from ${formatCurrency(prev.reimbursements.total)} to ${formatCurrency(latest.reimbursements.total)}.`;
      }
    }
    sources.push({
      type: "payslip",
      reference: `${latest.month} ${latest.year} payslip`,
      field: "netPay",
      value: latest.netPay,
    });
    return { answer, sources };
  }

  if (q.includes("hra")) {
    const answer = `You received **${formatCurrency(latest.earnings.hra)}** as HRA in your ${latest.month} ${latest.year} payslip.\n\n${COMPONENT_EXPLANATIONS.hra}`;
    sources.push({
      type: "payslip",
      reference: `${latest.month} ${latest.year} payslip`,
      field: "hra",
      value: latest.earnings.hra,
    });
    return { answer, sources };
  }

  if (q.includes("deduction")) {
    const d = latest.deductions;
    const answer = `Deductions applied in **${latest.month} ${latest.year}**:\n- Provident Fund: ${formatCurrency(d.providentFund)}\n- Professional Tax: ${formatCurrency(d.professionalTax)}\n- Income Tax (TDS): ${formatCurrency(d.incomeTaxTds)}\n- Other: ${formatCurrency(d.otherDeductions)}\n- **Total Deductions: ${formatCurrency(d.totalDeductions)}**`;
    sources.push({
      type: "payslip",
      reference: `${latest.month} ${latest.year} payslip`,
      field: "totalDeductions",
      value: d.totalDeductions,
    });
    return { answer, sources };
  }

  if (q.includes("ytd") || q.includes("year to date")) {
    const ytd = latest.ytd;
    const answer = `Year-to-date values (as of ${latest.month} ${latest.year}):\n- Gross Pay YTD: ${formatCurrency(ytd.grossPay)}\n- Net Pay YTD: ${formatCurrency(ytd.netPay)}\n- PF YTD: ${formatCurrency(ytd.providentFund)}\n- TDS YTD: ${formatCurrency(ytd.incomeTaxTds)}\n- Professional Tax YTD: ${formatCurrency(ytd.professionalTax)}`;
    sources.push({
      type: "payroll",
      reference: `${latest.month} ${latest.year} YTD`,
      field: "ytd.netPay",
      value: ytd.netPay,
    });
    return { answer, sources };
  }

  if (q.includes("pf") || q.includes("provident")) {
    const answer = `Your Provident Fund deduction for ${latest.month} ${latest.year} is **${formatCurrency(latest.deductions.providentFund)}**.\n\n${COMPONENT_EXPLANATIONS.providentFund}`;
    sources.push({
      type: "payslip",
      reference: `${latest.month} ${latest.year} payslip`,
      field: "providentFund",
      value: latest.deductions.providentFund,
    });
    return { answer, sources };
  }

  const summary = buildPayrollSummary(employeeId);
  return {
    answer: `Hi ${employeeName}, here's a summary of your recent payroll:\n\n${summary}\n\nPlease ask a specific question about net pay, HRA, deductions, YTD values, or tax-saving options.`,
    sources: payroll.slice(-1).map((p) => ({
      type: "payroll" as const,
      reference: `${p.month} ${p.year} payslip`,
      field: "netPay",
      value: p.netPay,
    })),
  };
}

export async function generateChatResponse(params: {
  employeeId: string;
  employeeName: string;
  question: string;
  history?: ChatMessage[];
}): Promise<{ answer: string; sources: AnswerSource[]; usedLlm: boolean }> {
  const context = buildPayrollContext(params.employeeId);
  const systemPrompt = buildChatSystemPrompt({
    employeeName: params.employeeName,
    employeeId: params.employeeId,
    payrollJson: context.payrollJson,
    taxDeclarationJson: context.taxDeclarationJson,
    uploadedPayslipsJson: context.uploadedPayslipsJson,
  });

  const historyText =
    params.history
      ?.slice(-4)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n") ?? "";

  const fullPrompt = `${systemPrompt}\n\n${historyText ? `Previous conversation:\n${historyText}\n\n` : ""}Employee question: ${params.question}`;

  const llmResult = await queryLlm({
    prompt: fullPrompt,
    metadata: {
      operation: "chat",
      employeeId: params.employeeId,
    },
  });

  if (llmResult.text && !llmResult.fromFallback) {
    return {
      answer: llmResult.text,
      sources: extractSourcesFromAnswer(llmResult.text, context.sources),
      usedLlm: true,
    };
  }

  const fallback = answerFromStructuredData(
    params.question,
    params.employeeId,
    params.employeeName
  );
  return { ...fallback, usedLlm: false };
}
