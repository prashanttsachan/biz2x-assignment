import { getFileDb } from "@/lib/db/file-db";
import { DB_PATHS } from "@/lib/db/paths";
import type { Session } from "@/lib/types";

export const sessionRepository = {
  loadAll(): Map<string, Session> {
    const db = getFileDb();
    db.ensureDir(DB_PATHS.sessions());
    const map = new Map<string, Session>();

    for (const file of db.listFiles(DB_PATHS.sessions())) {
      if (!file.endsWith(".json")) continue;
      const session = db.readJson<Session>(
        DB_PATHS.session(file.replace(".json", ""))
      );
      if (session) {
        map.set(session.token, session);
      }
    }
    return map;
  },

  save(session: Session): void {
    getFileDb().writeJson(DB_PATHS.session(session.token), session);
  },

  delete(token: string): void {
    getFileDb().delete(DB_PATHS.session(token));
  },
};
