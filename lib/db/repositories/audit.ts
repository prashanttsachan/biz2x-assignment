import { getFileDb } from "@/lib/db/file-db";
import { DB_PATHS } from "@/lib/db/paths";
import type { AuditLogEntry } from "@/lib/types";

export const auditRepository = {
  loadAll(): AuditLogEntry[] {
    const db = getFileDb();
    db.ensureDir(DB_PATHS.audit());
    return db.readJson<AuditLogEntry[]>(DB_PATHS.auditLogs()) ?? [];
  },

  saveAll(logs: AuditLogEntry[]): void {
    getFileDb().writeJson(DB_PATHS.auditLogs(), logs);
  },

  append(entry: AuditLogEntry, existing: AuditLogEntry[]): AuditLogEntry[] {
    const updated = [...existing, entry];
    this.saveAll(updated);
    return updated;
  },
};
