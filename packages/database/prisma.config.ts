import path from "node:path";
import { defineConfig } from "prisma/config";
import "./src/load-env";

export default defineConfig({
  schema: path.join(import.meta.dirname, "prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
