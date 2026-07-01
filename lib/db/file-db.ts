import fs from "fs";
import path from "path";
import { getDataRoot } from "./paths";

/**
 * Lightweight file-system database wrapper.
 * Provides JSON and binary read/write with directory management.
 * Used as the persistence layer; runtime reads use in-memory caches
 * that are hydrated from these files on server start.
 */
export class FileDb {
  constructor(private readonly root: string = getDataRoot()) {}

  getRoot(): string {
    return this.root;
  }

  resolve(...segments: string[]): string {
    return path.join(this.root, ...segments);
  }

  ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  readJson<T>(filePath: string): T | null {
    if (!fs.existsSync(filePath)) return null;
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  writeJson(filePath: string, data: unknown): void {
    this.ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  readText(filePath: string): string | null {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf-8");
  }

  writeText(filePath: string, content: string): void {
    this.ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, "utf-8");
  }

  readBinary(filePath: string): Buffer | null {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  }

  writeBinary(filePath: string, buffer: Buffer): void {
    this.ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, buffer);
  }

  delete(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  deleteDir(dirPath: string): void {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  }

  listSubdirs(dirPath: string): string[] {
    if (!fs.existsSync(dirPath)) return [];
    return fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  }

  listFiles(dirPath: string): string[] {
    if (!fs.existsSync(dirPath)) return [];
    return fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name);
  }

  /** Walk a directory tree and return absolute paths of files matching a predicate. */
  walkFiles(
    dirPath: string,
    match: (name: string, fullPath: string) => boolean
  ): string[] {
    if (!fs.existsSync(dirPath)) return [];
    const results: string[] = [];

    const walk = (current: string) => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (match(entry.name, full)) {
          results.push(full);
        }
      }
    };

    walk(dirPath);
    return results;
  }
}

let dbInstance: FileDb | null = null;

export function getFileDb(): FileDb {
  if (!dbInstance) {
    dbInstance = new FileDb();
    dbInstance.ensureDir(dbInstance.getRoot());
  }
  return dbInstance;
}

/** Reset singleton — for tests when DATA_DIR changes between runs. */
export function resetFileDb(): void {
  dbInstance = null;
}
