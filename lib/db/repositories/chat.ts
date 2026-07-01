import { getFileDb } from "@/lib/db/file-db";
import { DB_PATHS } from "@/lib/db/paths";
import type { ChatMessage } from "@/lib/types";

export const chatRepository = {
  loadAll(): Map<string, ChatMessage[]> {
    const db = getFileDb();
    db.ensureDir(DB_PATHS.chat());
    const map = new Map<string, ChatMessage[]>();

    for (const file of db.listFiles(DB_PATHS.chat())) {
      if (!file.endsWith(".json")) continue;
      const userId = file.replace(".json", "");
      const history = db.readJson<ChatMessage[]>(DB_PATHS.chatHistory(userId));
      if (history) {
        map.set(userId, history);
      }
    }
    return map;
  },

  save(userId: string, history: ChatMessage[]): void {
    getFileDb().writeJson(DB_PATHS.chatHistory(userId), history);
  },

  delete(userId: string): void {
    getFileDb().delete(DB_PATHS.chatHistory(userId));
  },
};
