import path from "path";

/** Root directory for all persisted application data. Override via DATA_DIR env var. */
export function getDataRoot(): string {
  return process.env.DATA_DIR ?? path.join(process.cwd(), "data");
}

export const DB_PATHS = {
  sessions: () => path.join(getDataRoot(), "sessions"),
  session: (token: string) => path.join(getDataRoot(), "sessions", `${token}.json`),
  uploads: () => path.join(getDataRoot(), "uploads"),
  employeeUploads: (employeeId: string) =>
    path.join(getDataRoot(), "uploads", employeeId),
  uploadDir: (employeeId: string, uploadId: string) =>
    path.join(getDataRoot(), "uploads", employeeId, uploadId),
  uploadMetadata: (employeeId: string, uploadId: string) =>
    path.join(getDataRoot(), "uploads", employeeId, uploadId, "metadata.json"),
  uploadOcrText: (employeeId: string, uploadId: string) =>
    path.join(getDataRoot(), "uploads", employeeId, uploadId, "ocr-text.txt"),
  uploadFile: (employeeId: string, uploadId: string, ext: string) =>
    path.join(getDataRoot(), "uploads", employeeId, uploadId, `payslip${ext}`),
  chat: () => path.join(getDataRoot(), "chat"),
  chatHistory: (userId: string) =>
    path.join(getDataRoot(), "chat", `${userId}.json`),
  audit: () => path.join(getDataRoot(), "audit"),
  auditLogs: () => path.join(getDataRoot(), "audit", "logs.json"),
} as const;

export function mimeToExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  return map[mimeType] ?? ".bin";
}
