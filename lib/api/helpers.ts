import {
  extractBearerToken,
  resolveSession,
} from "@/lib/auth/session";
import type { User } from "@/lib/types";
import { NextRequest } from "next/server";

export function getAuthUser(request: NextRequest): User | null {
  const token = extractBearerToken(request.headers.get("authorization"));
  const session = resolveSession(token);
  return session?.user ?? null;
}

export function unauthorizedResponse() {
  return Response.json(
    { error: "Unauthorized. Please log in." },
    { status: 401 }
  );
}

export function forbiddenResponse(message?: string) {
  return Response.json(
    { error: message ?? "Forbidden. You cannot access this resource." },
    { status: 403 }
  );
}

export function badRequestResponse(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "127.0.0.1"
  );
}
