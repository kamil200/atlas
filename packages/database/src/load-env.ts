import { existsSync } from "node:fs";
import path from "node:path";

/*
  The monorepo keeps one .env at the repo root. Prisma and the seed scripts run
  with packages/database as their working directory, so none of them find it on
  their own. CI sets DATABASE_URL in the environment instead, so a missing file
  is not an error.

  Importing this module runs it — do it before anything reads process.env.
*/
const rootEnv = path.join(import.meta.dirname, "../../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
