import { chatSessionRepository } from "@/lib/db/repositories/chat-sessions";
import { sessionRepository } from "@/lib/db/repositories/sessions";
import { uploadRepository } from "@/lib/db/repositories/uploads";
import { auditRepository } from "@/lib/db/repositories/audit";

export function hydrateStores(state: {
  sessions: Map<string, import("@/lib/types").Session>;
  uploadedPayslips: Map<string, import("@/lib/types").UploadedPayslip>;
  chatSessions: Map<string, import("@/lib/types").ChatSession>;
  auditLogs: import("@/lib/types").AuditLogEntry[];
}): void {
  const sessions = sessionRepository.loadAll();
  sessions.forEach((v, k) => state.sessions.set(k, v));

  const uploads = uploadRepository.loadAll();
  uploads.forEach((v, k) => state.uploadedPayslips.set(k, v));

  const chatSessions = chatSessionRepository.loadAll();
  chatSessions.forEach((v, k) => state.chatSessions.set(k, v));

  state.auditLogs.push(...auditRepository.loadAll());
}

export {
  auditRepository,
  chatSessionRepository,
  sessionRepository,
  uploadRepository,
};

export { getFileDb, FileDb, resetFileDb } from "@/lib/db/file-db";
export { getDataRoot, DB_PATHS } from "@/lib/db/paths";
