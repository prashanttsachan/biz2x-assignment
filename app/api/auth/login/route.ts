import { authenticateUser, createSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";
import { getClientIp } from "@/lib/api/helpers";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
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
