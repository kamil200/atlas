import { buildApp } from "./app";

const app = await buildApp();

try {
  await app.listen({ port: app.config.PORT, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

/*
  Migrations are applied deliberately, not at boot, so the one way this goes
  wrong is shipping a schema change and forgetting to run them. Without this the
  server starts happily, /api/health passes because it touches no tables, and
  every real request 500s — which reads as an outage rather than a missed step.

  Logged after listen so a slow database never delays serving, and a warning
  rather than a crash because on a free tier the database may simply be asleep.
*/
try {
  await app.prisma.$queryRaw`SELECT 1 FROM "Company" LIMIT 1`;
} catch (error) {
  app.log.warn(
    { err: error },
    'Could not read the Company table. On a new database run "pnpm db:migrate:deploy" and then "pnpm db:seed" against it.',
  );
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
