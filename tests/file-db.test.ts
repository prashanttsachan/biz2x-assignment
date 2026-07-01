import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("file-db persistence", () => {
  let tempDir: string;
  let originalDataDir: string | undefined;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "finwell-db-"));
    originalDataDir = process.env.DATA_DIR;
    process.env.DATA_DIR = tempDir;

    const g = globalThis as typeof globalThis & { __finwellStore?: unknown };
    delete g.__finwellStore;

    const { resetFileDb } = await import("@/lib/db/file-db");
    resetFileDb();
  });

  afterEach(() => {
    process.env.DATA_DIR = originalDataDir;
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("writes and reads JSON via FileDb", async () => {
    const { getFileDb } = await import("@/lib/db/file-db");
    const db = getFileDb();
    const filePath = path.join(tempDir, "test", "sample.json");
    db.writeJson(filePath, { hello: "world" });
    expect(db.readJson<{ hello: string }>(filePath)).toEqual({ hello: "world" });
  });

  it("persists and reloads sessions", async () => {
    const { sessionRepository } = await import("@/lib/db/repositories/sessions");
    const session = {
      token: "abc-123",
      userId: "user-001",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    sessionRepository.save(session);
    const loaded = sessionRepository.loadAll();
    expect(loaded.get("abc-123")).toEqual(session);
  });

  it("persists upload metadata and binary file", async () => {
    const { uploadRepository } = await import("@/lib/db/repositories/uploads");
    const { DB_PATHS } = await import("@/lib/db/paths");

    const upload = {
      id: "upload-1",
      employeeId: "EMP001",
      fileName: "payslip.pdf",
      mimeType: "application/pdf",
      uploadedAt: new Date().toISOString(),
      extractedFields: null,
      status: "completed" as const,
      rawOcrText: "sample ocr",
    };
    const buffer = Buffer.from("fake-pdf-content");

    uploadRepository.save({ upload, fileBuffer: buffer });

    const loaded = uploadRepository.loadAll();
    expect(loaded.get("upload-1")).toMatchObject({
      id: "upload-1",
      employeeId: "EMP001",
    });

    const filePath = uploadRepository.findStoredFilePath("EMP001", "upload-1");
    expect(filePath).toBeTruthy();
    expect(fs.readFileSync(filePath!, "utf-8")).toBe("fake-pdf-content");

    const ocrPath = DB_PATHS.uploadOcrText("EMP001", "upload-1");
    expect(fs.readFileSync(ocrPath, "utf-8")).toBe("sample ocr");
  });

  it("reloads in-memory store after simulated server restart", async () => {
    const { payslipUploadStore, reloadStoresFromDisk } = await import(
      "@/lib/data/store"
    );

    const upload = {
      id: "upload-reload",
      employeeId: "EMP002",
      fileName: "test.pdf",
      mimeType: "application/pdf",
      uploadedAt: new Date().toISOString(),
      extractedFields: null,
      status: "completed" as const,
    };

    payslipUploadStore.save(upload, Buffer.from("pdf-data"));
    reloadStoresFromDisk();

    const reloaded = payslipUploadStore.get("upload-reload");
    expect(reloaded?.employeeId).toBe("EMP002");
    expect(payslipUploadStore.readFileBuffer(reloaded!)).toEqual(
      Buffer.from("pdf-data")
    );
  });
});
