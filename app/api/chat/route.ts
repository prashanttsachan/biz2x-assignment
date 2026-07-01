import { generateChatResponse } from "@/lib/ai/chat-orchestrator";
import { logAuditEvent } from "@/lib/audit/logger";
import { chatStore } from "@/lib/data/store";
import {
  badRequestResponse,
  getAuthUser,
  getClientIp,
  unauthorizedResponse,
} from "@/lib/api/helpers";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const body = (await request.json()) as { question?: string };
  if (!body.question?.trim()) {
    return badRequestResponse("Question is required.");
  }

  const history = chatStore.getHistory(user.id);
  chatStore.append(user.id, {
    role: "user",
    content: body.question.trim(),
    timestamp: new Date().toISOString(),
  });

  const response = await generateChatResponse({
    employeeId: user.employeeId,
    employeeName: user.name,
    question: body.question.trim(),
    history,
  });

  const assistantMessage = {
    role: "assistant" as const,
    content: response.answer,
    sources: response.sources,
    timestamp: new Date().toISOString(),
  };
  chatStore.append(user.id, assistantMessage);

  logAuditEvent({
    user,
    action: "chat_query",
    resourceType: "chat",
    details: body.question.trim().slice(0, 100),
    ipAddress: getClientIp(request),
  });

  return Response.json({
    message: assistantMessage,
    usedLlm: response.usedLlm,
  });
}

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  return Response.json({ history: chatStore.getHistory(user.id) });
}

export async function DELETE(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  chatStore.clear(user.id);
  return Response.json({ success: true });
}
