import { logAuditEvent } from "@/lib/audit/logger";
import { chatSessionStore } from "@/lib/data/store";
import {
  forbiddenResponse,
  getAuthUser,
  getClientIp,
  unauthorizedResponse,
} from "@/lib/api/helpers";
import { NextRequest } from "next/server";

type RouteParams = { params: Promise<{ sessionId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { sessionId } = await params;
  const session = chatSessionStore.get(sessionId);

  if (!session || session.userId !== user.id) {
    return forbiddenResponse("Chat session not found or access denied.");
  }

  logAuditEvent({
    user,
    action: "chat_session_view",
    resourceType: "chat_session",
    resourceId: sessionId,
    ipAddress: getClientIp(request),
  });

  return Response.json({ session });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { sessionId } = await params;
  const session = chatSessionStore.get(sessionId);

  if (!session || session.userId !== user.id) {
    return forbiddenResponse("Chat session not found or access denied.");
  }

  chatSessionStore.delete(sessionId);

  logAuditEvent({
    user,
    action: "chat_session_delete",
    resourceType: "chat_session",
    resourceId: sessionId,
    ipAddress: getClientIp(request),
  });

  return Response.json({ success: true });
}
