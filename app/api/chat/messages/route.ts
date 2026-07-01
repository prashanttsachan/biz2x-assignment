import { generateChatResponse } from "@/lib/ai/chat-orchestrator";
import { logAuditEvent } from "@/lib/audit/logger";
import { chatSessionStore } from "@/lib/data/store";
import {
  badRequestResponse,
  forbiddenResponse,
  getAuthUser,
  getClientIp,
  unauthorizedResponse,
} from "@/lib/api/helpers";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const body = (await request.json()) as {
    question?: string;
    sessionId?: string;
  };

  if (!body.question?.trim()) {
    return badRequestResponse("Question is required.");
  }

  const question = body.question.trim();
  let sessionId = body.sessionId;

  if (sessionId) {
    const existing = chatSessionStore.get(sessionId);
    if (!existing || existing.userId !== user.id) {
      return forbiddenResponse("Chat session not found or access denied.");
    }
  } else {
    const created = chatSessionStore.create(user.id);
    sessionId = created.id;
    logAuditEvent({
      user,
      action: "chat_session_create",
      resourceType: "chat_session",
      resourceId: sessionId,
      details: "Created on first message",
      ipAddress: getClientIp(request),
    });
  }

  const history = chatSessionStore.getHistory(sessionId);

  chatSessionStore.appendMessage(sessionId, {
    role: "user",
    content: question,
    timestamp: new Date().toISOString(),
  });

  const response = await generateChatResponse({
    employeeId: user.employeeId,
    employeeName: user.name,
    question,
    history,
  });

  const assistantMessage = {
    role: "assistant" as const,
    content: response.answer,
    sources: response.sources,
    timestamp: new Date().toISOString(),
  };
  chatSessionStore.appendMessage(sessionId, assistantMessage);

  logAuditEvent({
    user,
    action: "chat_query",
    resourceType: "chat_session",
    resourceId: sessionId,
    details: question.slice(0, 100),
    ipAddress: getClientIp(request),
  });

  const updated = chatSessionStore.get(sessionId);

  return Response.json({
    message: assistantMessage,
    usedLlm: response.usedLlm,
    session: updated,
  });
}
