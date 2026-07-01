import { describe, expect, it, beforeEach } from "vitest";
import {
  authenticateUser,
  createSession,
  destroySession,
  resolveSession,
} from "@/lib/auth/session";
import { MOCK_USERS } from "@/lib/data/mock-payroll";

describe("authentication", () => {
  it("authenticates valid employee credentials", () => {
    const user = authenticateUser("john.doe@company.com", "employee123");
    expect(user).toBeDefined();
    expect(user!.employeeId).toBe("EMP001");
  });

  it("rejects invalid password", () => {
    expect(authenticateUser("john.doe@company.com", "wrong")).toBeNull();
  });

  it("rejects unknown email", () => {
    expect(authenticateUser("unknown@company.com", "employee123")).toBeNull();
  });

  it("is case-insensitive for email", () => {
    const user = authenticateUser("John.Doe@Company.com", "employee123");
    expect(user?.id).toBe(MOCK_USERS[0].id);
  });
});

describe("session management", () => {
  beforeEach(() => {
    const g = globalThis as typeof globalThis & { __finwellStore?: unknown };
    delete g.__finwellStore;
  });

  it("creates and resolves a valid session", async () => {
    const user = MOCK_USERS[0];
    const session = createSession(user);
    const resolved = resolveSession(session.token);
    expect(resolved?.user.id).toBe(user.id);
    expect(resolved?.session.token).toBe(session.token);
  });

  it("returns null for invalid token", () => {
    expect(resolveSession("invalid-token")).toBeNull();
  });

  it("returns null for null token", () => {
    expect(resolveSession(null)).toBeNull();
  });

  it("invalidates session after destroy", () => {
    const user = MOCK_USERS[0];
    const session = createSession(user);
    destroySession(session.token);
    expect(resolveSession(session.token)).toBeNull();
  });

  it("rejects expired session", async () => {
    const { sessionStore } = await import("@/lib/data/store");
    const user = MOCK_USERS[0];
    const session = createSession(user);
    sessionStore.set(session.token, {
      ...session,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    expect(resolveSession(session.token)).toBeNull();
  });
});
