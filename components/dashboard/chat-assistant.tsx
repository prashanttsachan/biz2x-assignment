"use client";

import type { ChatMessage, ChatSession, ChatSessionSummary } from "@/lib/types";
import { ChatMarkdown } from "@/components/chat-markdown";
import { apiFetch } from "@/lib/client/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorBox, PrimaryButton } from "./shared";

const SUGGESTED_QUESTIONS = [
  "Why is my net salary lower this month?",
  "How much HRA did I receive?",
  "What deductions were applied?",
  "Show my year-to-date values",
];

export function ChatAssistant() {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isDraft, setIsDraft] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    const data = await apiFetch<{ sessions: ChatSessionSummary[] }>(
      "/api/chat/sessions"
    );
    setSessions(data.sessions);
    return data.sessions;
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    setLoadingMessages(true);
    setError("");
    setIsDraft(false);
    try {
      const data = await apiFetch<{ session: ChatSession }>(
        `/api/chat/sessions/${sessionId}`
      );
      setHistory(data.session.messages);
      setActiveSessionId(sessionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load session");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const list = await loadSessions();
        if (list.length > 0) {
          await loadSession(list[0].id);
        } else {
          setIsDraft(true);
          setActiveSessionId(null);
          setHistory([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load chats");
      } finally {
        setLoadingSessions(false);
      }
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  function startDraftChat() {
    setError("");
    setIsDraft(true);
    setActiveSessionId(null);
    setHistory([]);
  }

  async function switchSession(sessionId: string) {
    if (sessionId === activeSessionId && !isDraft) return;
    await loadSession(sessionId);
  }

  async function deleteSession(sessionId: string) {
    if (!confirm("Delete this chat session?")) return;

    await apiFetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
    const list = await loadSessions();

    if (sessionId === activeSessionId) {
      if (list.length > 0) {
        await loadSession(list[0].id);
      } else {
        startDraftChat();
      }
    }
  }

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
        session: ChatSession;
        usedLlm: boolean;
      }>("/api/chat/messages", {
        method: "POST",
        body: JSON.stringify({
          question: q.trim(),
          ...(activeSessionId ? { sessionId: activeSessionId } : {}),
        }),
      });

      setHistory((h) => [...h, data.message]);
      setActiveSessionId(data.session.id);
      setIsDraft(false);

      setSessions((prev) => {
        const summary: ChatSessionSummary = {
          id: data.session.id,
          title: data.session.title,
          createdAt: data.session.createdAt,
          updatedAt: data.session.updatedAt,
          messageCount: data.session.messages.length,
          preview: q.trim().slice(0, 80),
        };
        const rest = prev.filter((s) => s.id !== summary.id);
        return [summary, ...rest];
      });

      void loadSessions();
    } catch (err) {
      setHistory((h) => h.slice(0, -1));
      setError(err instanceof Error ? err.message : "Failed to get response");
    } finally {
      setLoading(false);
    }
  }

  function formatSessionDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  const headerTitle = isDraft
    ? "New conversation"
    : sessions.find((s) => s.id === activeSessionId)?.title;

  if (loadingSessions) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        Loading chat sessions...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {sidebarOpen && (
        <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 p-3">
            <button
              type="button"
              onClick={startDraftChat}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {isDraft && (
              <div className="mb-1 rounded-lg bg-indigo-100 px-3 py-2 text-sm font-medium text-indigo-900">
                New conversation
                <p className="mt-0.5 text-xs font-normal text-indigo-700">
                  Send a message to save
                </p>
              </div>
            )}
            {sessions.length === 0 && !isDraft && (
              <p className="px-2 py-4 text-xs text-slate-500">No sessions yet</p>
            )}
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group mb-1 flex items-start gap-1 rounded-lg transition ${
                  s.id === activeSessionId && !isDraft
                    ? "bg-indigo-100 text-indigo-900"
                    : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                <button
                  type="button"
                  onClick={() => void switchSession(s.id)}
                  className="min-w-0 flex-1 rounded-lg px-3 py-2 text-left"
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {formatSessionDate(s.updatedAt)}
                    </span>
                  </div>
                  {s.preview && (
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {s.preview}
                    </p>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteSession(s.id)}
                  aria-label={`Delete ${s.title}`}
                  className="mt-2 mr-2 hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-red-50 group-hover:inline"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </aside>
      )}

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              {sidebarOpen ? "Hide" : "Show"} sessions
            </button>
            <h2 className="text-sm font-semibold text-slate-900">
              AI Financial Assistant
            </h2>
          </div>
          {headerTitle && (
            <span className="truncate text-xs text-slate-500">{headerTitle}</span>
          )}
        </div>

        <div className="border-b border-slate-100 px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                disabled={loading}
                className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
          {loadingMessages && (
            <p className="text-sm text-slate-500">Loading messages...</p>
          )}
          {!loadingMessages && history.length === 0 && (
            <p className="text-sm text-slate-500">
              {isDraft
                ? "Type a question below — your chat will be saved after you send the first message."
                : "Start a conversation — ask about your salary, deductions, or tax declarations."}
            </p>
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

        {error && (
          <div className="border-t border-slate-100 px-4 py-2">
            <ErrorBox message={error} />
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="flex gap-2 border-t border-slate-200 p-4"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about your payslip..."
            disabled={loading}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2 disabled:bg-slate-100"
          />
          <PrimaryButton type="submit" disabled={loading || !question.trim()}>
            Send
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}
