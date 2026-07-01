import { auditRepository } from "@/lib/db/repositories/audit";
import { chatRepository } from "@/lib/db/repositories/chat";
import { sessionRepository } from "@/lib/db/repositories/sessions";
import { uploadRepository } from "@/lib/db/repositories/uploads";

/** Hydrate all in-memory stores from disk. Called once per server process. */
export function hydrateStores(state: {
  sessions: Map<string, import("@/lib/types").Session>;
  uploadedPayslips: Map<string, import("@/lib/types").UploadedPayslip>;
  chatHistory: Map<string, import("@/lib/types").ChatMessage[]>;
  auditLogs: import("@/lib/types").AuditLogEntry[];
}): void {
  const sessions = sessionRepository.loadAll();
  sessions.forEach((v, k) => state.sessions.set(k, v));

  const uploads = uploadRepository.loadAll();
  uploads.forEach((v, k) => state.uploadedPayslips.set(k, v));

  const chat = chatRepository.loadAll();
  chat.forEach((v, k) => state.chatHistory.set(k, v));

  state.auditLogs.push(...auditRepository.loadAll());
}

export {
  auditRepository,
  chatRepository,
  sessionRepository,
  uploadRepository,
};

export { getFileDb, FileDb, resetFileDb } from "@/lib/db/file-db";
export { getDataRoot, DB_PATHS } from "@/lib/db/paths";
