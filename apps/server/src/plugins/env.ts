import fastifyEnv from "@fastify/env";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

/*
  Config is read once, validated, and then available as app.config.
  Missing required values crash the process at boot rather than at the first
  request that happens to need them.
*/

const schema = {
  type: "object",
  required: ["DATABASE_URL", "JWT_SECRET", "COOKIE_SECRET"],
  properties: {
    NODE_ENV: { type: "string", default: "development" },
    PORT: { type: "number", default: 3000 },
    FRONTEND_URL: { type: "string", default: "http://localhost:5173" },
    DATABASE_URL: { type: "string" },
    JWT_SECRET: { type: "string", minLength: 16 },
    COOKIE_SECRET: { type: "string", minLength: 16 },
    GOOGLE_CLIENT_ID: { type: "string", default: "" },
    GOOGLE_CLIENT_SECRET: { type: "string", default: "" },
    GOOGLE_REDIRECT_URI: {
      type: "string",
      default: "http://localhost:3000/api/auth/google/callback",
    },
    RESUME_STORAGE_DIR: { type: "string", default: "./uploads" },
  },
} as const;

export type AppConfig = {
  NODE_ENV: string;
  PORT: number;
  FRONTEND_URL: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  COOKIE_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  RESUME_STORAGE_DIR: string;
};

declare module "fastify" {
  interface FastifyInstance {
    config: AppConfig;
  }
}

/* The .env file is already loaded by src/load-env.ts; this only validates it. */
export default fp(async (app: FastifyInstance) => {
  await app.register(fastifyEnv, { schema, confKey: "config" });
});
