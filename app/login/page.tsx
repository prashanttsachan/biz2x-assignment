"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const DEMO_ACCOUNTS = [
  { email: "john.doe@company.com", password: "employee123", label: "John Doe (Employee)" },
  { email: "jane.smith@company.com", password: "employee123", label: "Jane Smith (Employee)" },
  { email: "payroll.admin@company.com", password: "admin123", label: "Payroll Admin" },
];

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("john.doe@company.com");
  const [password, setPassword] = useState("employee123");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <p className="text-slate-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-indigo-300">
            FinWell AI
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight">
            Personalized Financial Wellness & Tax Assistant
          </h1>
          <p className="mt-4 max-w-md text-indigo-100">
            Understand your salary, deductions, reimbursements, and tax-saving
            opportunities with document-grounded AI explanations.
          </p>
        </div>
        <ul className="space-y-2 text-sm text-indigo-200">
          <li>• Payslip upload & OCR intelligence</li>
          <li>• Grounded AI Q&A on payroll data</li>
          <li>• Tax-saving simulations & proof checklist</li>
          <li>• User-level privacy & access control</li>
        </ul>
      </div>

      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2">
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
          <p className="mt-2 text-sm text-slate-600">
            Use a demo account below or enter credentials manually.
          </p>

          <div className="mt-4 space-y-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword(acc.password);
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                {acc.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
                required
              />
            </label>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
