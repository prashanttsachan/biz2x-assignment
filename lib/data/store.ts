import {
  auditRepository,
  chatSessionRepository,
  hydrateStores,
  sessionRepository,
  uploadRepository,
} from "@/lib/db";
import type {
  AuditLogEntry,
  ChatMessage,
  ChatSession,
  ChatSessionSummary,
  Session,
  UploadedPayslip,
} from "@/lib/types";
import { randomUUID } from "crypto";

const globalStore = globalThis as typeof globalThis & {
  __finwellStore?: {
    sessions: Map<string, Session>;
    uploadedPayslips: Map<string, UploadedPayslip>;
    chatSessions: Map<string, ChatSession>;
    auditLogs: AuditLogEntry[];
    hydrated: boolean;
  };
};

function getStore() {
  if (!globalStore.__finwellStore) {
    globalStore.__finwellStore = {
      sessions: new Map(),
      uploadedPayslips: new Map(),
      chatSessions: new Map(),
      auditLogs: [],
      hydrated: false,
    };
  }

  const store = globalStore.__finwellStore;
  if (!store.hydrated) {
    hydrateStores(store);
    pruneExpiredSessions(store.sessions);
    store.hydrated = true;
  }

  return store;
}

function pruneExpiredSessions(sessions: Map<string, Session>): void {
  const now = new Date();
  for (const [token, session] of sessions) {
    if (new Date(session.expiresAt) < now) {
      sessions.delete(token);
      sessionRepository.delete(token);
    }
  }
}

function toSummary(session: ChatSession): ChatSessionSummary {
  const last = session.messages[session.messages.length - 1];
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messageCount: session.messages.length,
    preview: last?.content.slice(0, 80),
  };
}

function deriveTitle(question: string): string {
  const trimmed = question.trim();
  if (trimmed.length <= 48) return trimmed;
  return trimmed.slice(0, 48) + "…";
}

export const sessionStore = {
  set(token: string, session: Session) {
    getStore().sessions.set(token, session);
    sessionRepository.save(session);
  },
  get(token: string) {
    return getStore().sessions.get(token);
  },
  delete(token: string) {
    getStore().sessions.delete(token);
    sessionRepository.delete(token);
  },
};

export const payslipUploadStore = {
  save(payslip: UploadedPayslip, fileBuffer?: Buffer) {
    getStore().uploadedPayslips.set(payslip.id, payslip);
    uploadRepository.save({ upload: payslip, fileBuffer });
  },
  get(id: string) {
    return getStore().uploadedPayslips.get(id);
  },
  listByEmployee(employeeId: string) {
    return Array.from(getStore().uploadedPayslips.values()).filter(
      (p) => p.employeeId === employeeId
    );
  },
  listAll() {
    return Array.from(getStore().uploadedPayslips.values());
  },
  update(id: string, updates: Partial<UploadedPayslip>, fileBuffer?: Buffer) {
    const existing = getStore().uploadedPayslips.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    getStore().uploadedPayslips.set(id, updated);
    uploadRepository.save({ upload: updated, fileBuffer });
    return updated;
  },
  getFilePath(upload: UploadedPayslip) {
    return uploadRepository.findStoredFilePath(upload.employeeId, upload.id);
  },
  readFileBuffer(upload: UploadedPayslip) {
    return uploadRepository.readFileBuffer(upload);
  },
};

export const chatSessionStore = {
  create(userId: string, title = "New conversation"): ChatSession {
    const now = new Date().toISOString();
    const session: ChatSession = {
      id: randomUUID(),
      userId,
      title,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    getStore().chatSessions.set(session.id, session);
    chatSessionRepository.save(session);
    return session;
  },

  get(sessionId: string): ChatSession | undefined {
    return getStore().chatSessions.get(sessionId);
  },

  listByUser(userId: string): ChatSessionSummary[] {
    return Array.from(getStore().chatSessions.values())
      .filter((s) => s.userId === userId && s.messages.length > 0)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .map(toSummary);
  },

  appendMessage(sessionId: string, message: ChatMessage): ChatSession | undefined {
    const session = getStore().chatSessions.get(sessionId);
    if (!session) return undefined;

    session.messages.push(message);
    session.updatedAt = new Date().toISOString();

    if (
      session.title === "New conversation" &&
      message.role === "user" &&
      message.content.trim()
    ) {
      session.title = deriveTitle(message.content);
    }

    chatSessionRepository.save(session);
    return session;
  },

  delete(sessionId: string): boolean {
    const session = getStore().chatSessions.get(sessionId);
    if (!session) return false;
    getStore().chatSessions.delete(sessionId);
    chatSessionRepository.delete(session.userId, sessionId);
    return true;
  },

  getHistory(sessionId: string): ChatMessage[] {
    return getStore().chatSessions.get(sessionId)?.messages ?? [];
  },
};

/** @deprecated Use chatSessionStore */
export const chatStore = {
  append(userId: string, message: ChatMessage) {
    const sessions = chatSessionStore.listByUser(userId);
    let session =
      sessions.length > 0
        ? chatSessionStore.get(sessions[0].id)
        : undefined;
    if (!session) session = chatSessionStore.create(userId);
    chatSessionStore.appendMessage(session.id, message);
  },
  getHistory(userId: string) {
    const sessions = chatSessionStore.listByUser(userId);
    if (sessions.length === 0) return [];
    return chatSessionStore.getHistory(sessions[0].id);
  },
  clear(userId: string) {
    for (const s of chatSessionStore.listByUser(userId)) {
      chatSessionStore.delete(s.id);
    }
  },
};

export const auditStore = {
  append(entry: AuditLogEntry) {
    const store = getStore();
    store.auditLogs = auditRepository.append(entry, store.auditLogs);
  },
  list(limit = 100) {
    return getStore().auditLogs.slice(-limit).reverse();
  },
  listByUser(userId: string, limit = 50) {
    return getStore()
      .auditLogs.filter((e) => e.userId === userId)
      .slice(-limit)
      .reverse();
  },
};

export function reloadStoresFromDisk(): void {
  if (globalStore.__finwellStore) {
    globalStore.__finwellStore.sessions.clear();
    globalStore.__finwellStore.uploadedPayslips.clear();
    globalStore.__finwellStore.chatSessions.clear();
    globalStore.__finwellStore.auditLogs = [];
    globalStore.__finwellStore.hydrated = false;
  }
  getStore();
}
