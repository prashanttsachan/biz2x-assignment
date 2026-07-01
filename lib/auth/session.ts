import { MOCK_PASSWORDS, MOCK_USERS } from "@/lib/data/mock-payroll";
import { sessionStore } from "@/lib/data/store";
import type { Session, User } from "@/lib/types";
import { randomUUID } from "crypto";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export function authenticateUser(
  email: string,
  password: string
): User | null {
  const normalizedEmail = email.toLowerCase().trim();
  const expectedPassword = MOCK_PASSWORDS[normalizedEmail];
  if (!expectedPassword || expectedPassword !== password) {
    return null;
  }
  return MOCK_USERS.find((u) => u.email === normalizedEmail) ?? null;
}

export function createSession(user: User): Session {
  const now = new Date();
  const session: Session = {
    token: randomUUID(),
    userId: user.id,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
  };
  sessionStore.set(session.token, session);
  return session;
}

export function getUserById(userId: string): User | undefined {
  return MOCK_USERS.find((u) => u.id === userId);
}

export function resolveSession(token: string | null): {
  session: Session;
  user: User;
} | null {
  if (!token) return null;
  const session = sessionStore.get(token);
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) {
    sessionStore.delete(token);
    return null;
  }
  const user = getUserById(session.userId);
  if (!user) return null;
  return { session, user };
}

export function destroySession(token: string) {
  sessionStore.delete(token);
}

export function extractBearerToken(
  authHeader: string | null
): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim();
}
