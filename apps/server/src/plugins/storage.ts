import path from "node:path";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { LocalDiskStorageAdapter, type StorageAdapter } from "../modules/storage/storage-adapter";

declare module "fastify" {
  interface FastifyInstance {
    storage: StorageAdapter;
  }
}

export default fp(async (app: FastifyInstance) => {
  // RESUME_STORAGE_DIR is relative to the server package, not the repo root.
  const root = path.resolve(import.meta.dirname, "../..", app.config.RESUME_STORAGE_DIR);
  app.decorate("storage", new LocalDiskStorageAdapter(root));
});
