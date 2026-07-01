import { authenticateUser, createSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";
import { getClientIp } from "@/lib/api/helpers";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { NextRequest } from "next/server";

const LOGIN_RATE_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`login:${ip}`, LOGIN_RATE_LIMIT, LOGIN_WINDOW_MS);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!body.email || !body.password) {
    return Response.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const user = authenticateUser(body.email, body.password);
  if (!user) {
    return Response.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const session = createSession(user);
  logAuditEvent({
    user,
    action: "login",
    resourceType: "session",
    details: `User ${user.email} logged in`,
    ipAddress: getClientIp(request),
  });

  return Response.json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      employeeId: user.employeeId,
      role: user.role,
      department: user.department,
    },
  });
}
