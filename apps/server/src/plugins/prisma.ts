import { PrismaClient } from "@atlas/database";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

/* One client for the whole process, closed when Fastify closes. */
export default fp(async (app: FastifyInstance) => {
  const prisma = new PrismaClient({
    datasources: { db: { url: app.config.DATABASE_URL } },
  });

  await prisma.$connect();
  app.decorate("prisma", prisma);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
