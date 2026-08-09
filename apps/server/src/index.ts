import { buildApp } from "./app";

const app = await buildApp();

try {
  await app.listen({ port: app.config.PORT, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
