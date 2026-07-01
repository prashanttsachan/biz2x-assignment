"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const assistantComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
  h1: ({ children }) => (
    <h3 className="mb-2 mt-1 text-base font-semibold text-slate-900">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-2 mt-1 text-base font-semibold text-slate-900">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="mb-1 mt-1 text-sm font-semibold text-slate-900">
      {children}
    </h4>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block font-mono text-xs text-slate-800">{children}</code>
      );
    }
    return (
      <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-800">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs">
      {children}
    </pre>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-indigo-600 underline hover:text-indigo-800"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-4 border-indigo-200 pl-3 italic text-slate-600">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-slate-200" />,
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-100 text-left">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-slate-200 px-2 py-1 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-slate-200 px-2 py-1">{children}</td>
  ),
};

export function ChatMarkdown({
  content,
  role,
}: {
  content: string;
  role: "user" | "assistant";
}) {
  if (role === "user") {
    return <p className="whitespace-pre-wrap leading-relaxed">{content}</p>;
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={assistantComponents}>
      {content}
    </ReactMarkdown>
  );
}
