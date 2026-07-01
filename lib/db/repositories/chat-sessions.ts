import { getFileDb } from "@/lib/db/file-db";
import { DB_PATHS } from "@/lib/db/paths";
import type { ChatMessage, ChatSession } from "@/lib/types";
import { randomUUID } from "crypto";

function migrateLegacyHistory(userId: string): ChatSession | null {
  const db = getFileDb();
  const legacyPath = DB_PATHS.chatHistory(userId);
  const legacy = db.readJson<ChatMessage[]>(legacyPath);
  if (!legacy || legacy.length === 0) return null;

  const now = new Date().toISOString();
  const firstUser = legacy.find((m) => m.role === "user");
  const session: ChatSession = {
    id: randomUUID(),
    userId,
    title: firstUser
      ? firstUser.content.slice(0, 48) + (firstUser.content.length > 48 ? "…" : "")
      : "Previous conversation",
    createdAt: legacy[0]?.timestamp ?? now,
    updatedAt: legacy[legacy.length - 1]?.timestamp ?? now,
    messages: legacy,
  };

  db.writeJson(DB_PATHS.chatSession(userId, session.id), session);
  db.delete(legacyPath);
  return session;
}

export const chatSessionRepository = {
  loadAll(): Map<string, ChatSession> {
    const db = getFileDb();
    db.ensureDir(DB_PATHS.chat());
    const map = new Map<string, ChatSession>();

    for (const userId of db.listSubdirs(DB_PATHS.chat())) {
      const userDir = DB_PATHS.chatSessions(userId);
      const files = db.listFiles(userDir).filter((f) => f.endsWith(".json"));

      if (files.length === 0) {
        const migrated = migrateLegacyHistory(userId);
        if (migrated) map.set(migrated.id, migrated);
        continue;
      }

      for (const file of files) {
        const sessionId = file.replace(".json", "");
        const session = db.readJson<ChatSession>(
          DB_PATHS.chatSession(userId, sessionId)
        );
        if (!session) continue;
        if (session.messages.length === 0) {
          db.delete(DB_PATHS.chatSession(userId, sessionId));
          continue;
        }
        map.set(session.id, session);
      }
    }

    for (const file of db.listFiles(DB_PATHS.chat())) {
      if (!file.endsWith(".json")) continue;
      const userId = file.replace(".json", "");
      if (db.exists(DB_PATHS.chatSessions(userId))) continue;
      const migrated = migrateLegacyHistory(userId);
      if (migrated) map.set(migrated.id, migrated);
    }

    return map;
  },

  save(session: ChatSession): void {
    getFileDb().writeJson(
      DB_PATHS.chatSession(session.userId, session.id),
      session
    );
  },

  delete(userId: string, sessionId: string): void {
    getFileDb().delete(DB_PATHS.chatSession(userId, sessionId));
  },
};
