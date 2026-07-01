import { logAuditEvent } from "@/lib/audit/logger";
import { chatSessionStore } from "@/lib/data/store";
import {
  getAuthUser,
  getClientIp,
  unauthorizedResponse,
} from "@/lib/api/helpers";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const sessions = chatSessionStore.listByUser(user.id);

  logAuditEvent({
    user,
    action: "chat_session_view",
    resourceType: "chat_sessions",
    details: `Listed ${sessions.length} sessions`,
    ipAddress: getClientIp(request),
  });

  return Response.json({ sessions });
}

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
  };

  const session = chatSessionStore.create(
    user.id,
    body.title?.trim() || "New conversation"
  );

  logAuditEvent({
    user,
    action: "chat_session_create",
    resourceType: "chat_session",
    resourceId: session.id,
    ipAddress: getClientIp(request),
  });

  return Response.json({ session });
}
