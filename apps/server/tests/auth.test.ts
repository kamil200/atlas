import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/modules/auth/password";

const SECRET = "test-secret-that-is-long-enough-to-be-real";

describe("password hashing", () => {
  it("verifies the password it hashed", async () => {
    const hash = await hashPassword("Password123!");
    expect(hash).not.toBe("Password123!");
    await expect(verifyPassword(hash, "Password123!")).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("Password123!");
    await expect(verifyPassword(hash, "password123!")).resolves.toBe(false);
    await expect(verifyPassword(hash, "")).resolves.toBe(false);
  });

  it("salts, so the same password hashes differently every time", async () => {
    const [a, b] = await Promise.all([hashPassword("same"), hashPassword("same")]);
    expect(a).not.toBe(b);
    await expect(verifyPassword(a, "same")).resolves.toBe(true);
    await expect(verifyPassword(b, "same")).resolves.toBe(true);
  });

  it("treats a corrupted hash as a failed login rather than an error", async () => {
    await expect(verifyPassword("not-a-hash", "anything")).resolves.toBe(false);
  });
});

/* A bare Fastify instance — the JWT behaviour has nothing to do with routes. */
async function buildJwtApp(expiresIn = "7d") {
  const app = Fastify();
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: SECRET, sign: { expiresIn } });
  return app;
}

describe("session tokens", () => {
  it("round-trips the claims we put in", async () => {
    const app = await buildJwtApp();
    const token = app.jwt.sign({ sub: "usr_demo", role: "USER" });
    const decoded = app.jwt.verify<{ sub: string; role: string }>(token);

    expect(decoded.sub).toBe("usr_demo");
    expect(decoded.role).toBe("USER");
    await app.close();
  });

  it("rejects a token that has expired", async () => {
    const app = await buildJwtApp("1ms");
    const token = app.jwt.sign({ sub: "usr_demo", role: "USER" });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(() => app.jwt.verify(token)).toThrow();
    await app.close();
  });

  it("rejects a token whose payload was edited", async () => {
    const app = await buildJwtApp();
    const token = app.jwt.sign({ sub: "usr_demo", role: "USER" });

    // Swap the payload for an admin one, keeping the original signature.
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "usr_demo", role: "ADMIN" }))
      .toString("base64url");

    expect(() => app.jwt.verify(`${header}.${forgedPayload}.${signature}`)).toThrow();
    await app.close();
  });

  it("rejects a token signed with a different secret", async () => {
    const mine = await buildJwtApp();
    const theirs = Fastify();
    await theirs.register(fastifyJwt, { secret: "a-completely-different-secret-value" });

    const token = theirs.jwt.sign({ sub: "usr_attacker", role: "ADMIN" });
    expect(() => mine.jwt.verify(token)).toThrow();

    await mine.close();
    await theirs.close();
  });
});
