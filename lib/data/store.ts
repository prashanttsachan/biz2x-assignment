import {
  auditRepository,
  chatRepository,
  hydrateStores,
  sessionRepository,
  uploadRepository,
} from "@/lib/db";
import type {
  AuditLogEntry,
  ChatMessage,
  Session,
  UploadedPayslip,
} from "@/lib/types";

const globalStore = globalThis as typeof globalThis & {
  __finwellStore?: {
    sessions: Map<string, Session>;
    uploadedPayslips: Map<string, UploadedPayslip>;
    chatHistory: Map<string, ChatMessage[]>;
    auditLogs: AuditLogEntry[];
    hydrated: boolean;
  };
};

function getStore() {
  if (!globalStore.__finwellStore) {
    globalStore.__finwellStore = {
      sessions: new Map(),
      uploadedPayslips: new Map(),
      chatHistory: new Map(),
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

export const chatStore = {
  append(userId: string, message: ChatMessage) {
    const store = getStore();
    const history = store.chatHistory.get(userId) ?? [];
    history.push(message);
    store.chatHistory.set(userId, history);
    chatRepository.save(userId, history);
  },
  getHistory(userId: string) {
    return getStore().chatHistory.get(userId) ?? [];
  },
  clear(userId: string) {
    getStore().chatHistory.delete(userId);
    chatRepository.delete(userId);
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

/** Exposed for tests — reset in-memory state and re-hydrate from disk. */
export function reloadStoresFromDisk(): void {
  if (globalStore.__finwellStore) {
    globalStore.__finwellStore.sessions.clear();
    globalStore.__finwellStore.uploadedPayslips.clear();
    globalStore.__finwellStore.chatHistory.clear();
    globalStore.__finwellStore.auditLogs = [];
    globalStore.__finwellStore.hydrated = false;
  }
  getStore();
}
