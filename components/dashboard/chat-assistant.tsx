"use client";

import type { ChatMessage } from "@/lib/types";
import { ChatMarkdown } from "@/components/chat-markdown";
import { apiFetch } from "@/lib/client/api";
import { useEffect, useRef, useState } from "react";
import { ErrorBox, PanelShell, PrimaryButton } from "./shared";

const SUGGESTED_QUESTIONS = [
  "Why is my net salary lower this month?",
  "How much HRA did I receive?",
  "What deductions were applied?",
  "Show my year-to-date values",
];

export function ChatAssistant() {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<{ history: ChatMessage[] }>("/api/chat")
      .then((data) => setHistory(data.history))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function ask(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    setQuestion("");

    const userMsg: ChatMessage = {
      role: "user",
      content: q.trim(),
      timestamp: new Date().toISOString(),
    };
    setHistory((h) => [...h, userMsg]);

    try {
      const data = await apiFetch<{
        message: ChatMessage;
        usedLlm: boolean;
      }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ question: q.trim() }),
      });
      setHistory((h) => [...h, data.message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get response");
    } finally {
      setLoading(false);
    }
  }

  async function clearChat() {
    await apiFetch("/api/chat", { method: "DELETE" });
    setHistory([]);
  }

  return (
    <PanelShell title="AI Financial Assistant">
      <p className="mb-4 text-sm text-slate-600">
        Ask questions about your salary, deductions, and tax declarations.
        Answers are grounded in your payroll data only.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => ask(q)}
            className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="mb-4 h-96 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
        {history.length === 0 && (
          <p className="text-sm text-slate-500">No messages yet. Ask a question above.</p>
        )}
        {history.map((msg, i) => (
          <div
            key={`${msg.timestamp}-${i}`}
            className={`mb-3 ${msg.role === "user" ? "text-right" : "text-left"}`}
          >
            <div
              className={`inline-block max-w-[85%] rounded-xl px-4 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-slate-200 text-slate-800"
              }`}
            >
              <ChatMarkdown content={msg.content} role={msg.role} />
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-1 text-xs text-slate-500">
                Sources: {msg.sources.map((s) => s.reference).join(", ")}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="text-sm text-slate-500">Thinking...</div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about your payslip..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
        />
        <PrimaryButton type="submit" disabled={loading || !question.trim()}>
          Send
        </PrimaryButton>
        <button
          type="button"
          onClick={clearChat}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Clear
        </button>
      </form>
    </PanelShell>
  );
}
