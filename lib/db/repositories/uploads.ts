import { getFileDb } from "@/lib/db/file-db";
import { DB_PATHS, mimeToExtension } from "@/lib/db/paths";
import type { UploadedPayslip } from "@/lib/types";
import path from "path";

export interface SaveUploadParams {
  upload: UploadedPayslip;
  fileBuffer?: Buffer;
}

export const uploadRepository = {
  loadAll(): Map<string, UploadedPayslip> {
    const db = getFileDb();
    const map = new Map<string, UploadedPayslip>();
    const uploadsRoot = DB_PATHS.uploads();

    if (!db.exists(uploadsRoot)) return map;

    for (const employeeId of db.listSubdirs(uploadsRoot)) {
      const employeeDir = DB_PATHS.employeeUploads(employeeId);
      for (const uploadId of db.listSubdirs(employeeDir)) {
        const metadata = db.readJson<UploadedPayslip>(
          DB_PATHS.uploadMetadata(employeeId, uploadId)
        );
        if (metadata) {
          map.set(metadata.id, metadata);
        }
      }
    }
    return map;
  },

  save({ upload, fileBuffer }: SaveUploadParams): void {
    const db = getFileDb();
    const { employeeId, id: uploadId } = upload;

    db.writeJson(DB_PATHS.uploadMetadata(employeeId, uploadId), upload);

    if (upload.rawOcrText) {
      db.writeText(
        DB_PATHS.uploadOcrText(employeeId, uploadId),
        upload.rawOcrText
      );
    }

    if (fileBuffer && fileBuffer.length > 0) {
      const ext = mimeToExtension(upload.mimeType);
      db.writeBinary(
        DB_PATHS.uploadFile(employeeId, uploadId, ext),
        fileBuffer
      );
    }
  },

  getFilePath(upload: UploadedPayslip): string | null {
    const db = getFileDb();
    const ext = mimeToExtension(upload.mimeType);
    const filePath = DB_PATHS.uploadFile(upload.employeeId, upload.id, ext);
    return db.exists(filePath) ? filePath : null;
  },

  findStoredFilePath(employeeId: string, uploadId: string): string | null {
    const db = getFileDb();
    const uploadDir = DB_PATHS.uploadDir(employeeId, uploadId);
    if (!db.exists(uploadDir)) return null;

    const payslipFile = db
      .listFiles(uploadDir)
      .find((f) => f.startsWith("payslip."));
    return payslipFile ? path.join(uploadDir, payslipFile) : null;
  },

  readFileBuffer(upload: UploadedPayslip): Buffer | null {
    const db = getFileDb();
    const filePath =
      this.findStoredFilePath(upload.employeeId, upload.id) ??
      this.getFilePath(upload);
    return filePath ? db.readBinary(filePath) : null;
  },
};
