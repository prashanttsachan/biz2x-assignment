import { auditStore } from "@/lib/data/store";
import type { AuditAction, AuditLogEntry, User } from "@/lib/types";
import { randomUUID } from "crypto";

export function logAuditEvent(params: {
  user: User;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
}): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    userId: params.user.id,
    userEmail: params.user.email,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    details: params.details,
    ipAddress: params.ipAddress,
  };
  auditStore.append(entry);
  return entry;
}
