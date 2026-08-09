import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";

// The monorepo keeps one .env at the repo root. Prisma only looks next to the
// schema, so we load the root file ourselves. CI has no .env — it passes
// DATABASE_URL in the environment instead, so a missing file is fine.
const rootEnv = path.join(import.meta.dirname, "../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default defineConfig({
  schema: path.join(import.meta.dirname, "prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
