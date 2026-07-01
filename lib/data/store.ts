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
  };
};

function getStore() {
  if (!globalStore.__finwellStore) {
    globalStore.__finwellStore = {
      sessions: new Map(),
      uploadedPayslips: new Map(),
      chatHistory: new Map(),
      auditLogs: [],
    };
  }
  return globalStore.__finwellStore;
}

export const sessionStore = {
  set(token: string, session: Session) {
    getStore().sessions.set(token, session);
  },
  get(token: string) {
    return getStore().sessions.get(token);
  },
  delete(token: string) {
    getStore().sessions.delete(token);
  },
};

export const payslipUploadStore = {
  save(payslip: UploadedPayslip) {
    getStore().uploadedPayslips.set(payslip.id, payslip);
  },
  get(id: string) {
    return getStore().uploadedPayslips.get(id);
  },
  listByEmployee(employeeId: string) {
    return Array.from(getStore().uploadedPayslips.values()).filter(
      (p) => p.employeeId === employeeId
    );
  },
  update(id: string, updates: Partial<UploadedPayslip>) {
    const existing = getStore().uploadedPayslips.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    getStore().uploadedPayslips.set(id, updated);
    return updated;
  },
};

export const chatStore = {
  append(userId: string, message: ChatMessage) {
    const store = getStore();
    const history = store.chatHistory.get(userId) ?? [];
    history.push(message);
    store.chatHistory.set(userId, history);
  },
  getHistory(userId: string) {
    return getStore().chatHistory.get(userId) ?? [];
  },
  clear(userId: string) {
    getStore().chatHistory.delete(userId);
  },
};

export const auditStore = {
  append(entry: AuditLogEntry) {
    getStore().auditLogs.push(entry);
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
