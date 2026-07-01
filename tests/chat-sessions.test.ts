import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("chat session store", () => {
  let tempDir: string;
  let originalDataDir: string | undefined;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "finwell-chat-"));
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

  it("creates session scoped to user", async () => {
    const { chatSessionStore } = await import("@/lib/data/store");
    const session = chatSessionStore.create("user-001");
    expect(session.userId).toBe("user-001");
    expect(session.messages).toEqual([]);
  });

  it("only lists sessions with messages", async () => {
    const { chatSessionStore } = await import("@/lib/data/store");
    const empty = chatSessionStore.create("user-001");
    const withMsg = chatSessionStore.create("user-001");

    chatSessionStore.appendMessage(withMsg.id, {
      role: "user",
      content: "Hello",
      timestamp: new Date().toISOString(),
    });

    const listed = chatSessionStore.listByUser("user-001");
    expect(listed.length).toBe(1);
    expect(listed[0].id).toBe(withMsg.id);
    expect(listed.find((s) => s.id === empty.id)).toBeUndefined();
  });

  it("derives title from first user message", async () => {
    const { chatSessionStore } = await import("@/lib/data/store");
    const session = chatSessionStore.create("user-001");

    chatSessionStore.appendMessage(session.id, {
      role: "user",
      content: "What is my HRA exemption?",
      timestamp: new Date().toISOString(),
    });

    const updated = chatSessionStore.get(session.id);
    expect(updated?.title).toBe("What is my HRA exemption?");
  });

  it("prevents cross-user session access by userId filter", async () => {
    const { chatSessionStore } = await import("@/lib/data/store");
    const session = chatSessionStore.create("user-001");

    chatSessionStore.appendMessage(session.id, {
      role: "user",
      content: "Private question",
      timestamp: new Date().toISOString(),
    });

    const otherUserSessions = chatSessionStore.listByUser("user-002");
    expect(otherUserSessions.length).toBe(0);
    expect(chatSessionStore.get(session.id)?.userId).toBe("user-001");
  });

  it("persists chat sessions to disk and reloads", async () => {
    const { chatSessionStore, reloadStoresFromDisk } = await import(
      "@/lib/data/store"
    );

    const session = chatSessionStore.create("user-002");
    chatSessionStore.appendMessage(session.id, {
      role: "user",
      content: "Test persistence",
      timestamp: new Date().toISOString(),
    });

    reloadStoresFromDisk();

    const reloaded = chatSessionStore.get(session.id);
    expect(reloaded?.messages.length).toBe(1);
    expect(reloaded?.messages[0].content).toBe("Test persistence");
  });

  it("deletes session from store and disk", async () => {
    const { chatSessionStore } = await import("@/lib/data/store");
    const session = chatSessionStore.create("user-001");
    chatSessionStore.appendMessage(session.id, {
      role: "user",
      content: "To delete",
      timestamp: new Date().toISOString(),
    });

    expect(chatSessionStore.delete(session.id)).toBe(true);
    expect(chatSessionStore.get(session.id)).toBeUndefined();
  });
});
