import { existsSync } from "node:fs";
import path from "node:path";

/*
  The monorepo keeps one .env at the repo root. This has to run before Fastify
  is constructed, because the logger picks its transport from NODE_ENV at that
  moment. Deployments set real environment variables and ship no .env file, so
  a missing file is fine — @fastify/env still validates whatever is there.

  Importing this module runs it.
*/
const rootEnv = path.join(import.meta.dirname, "../../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
