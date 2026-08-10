import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LocalDiskStorageAdapter } from "../src/modules/storage/storage-adapter";

let root: string;
let storage: LocalDiskStorageAdapter;

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), "atlas-storage-"));
  storage = new LocalDiskStorageAdapter(root);
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

async function read(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

describe("local disk storage", () => {
  it("stores and reads a file back unchanged", async () => {
    const key = "resumes/usr_demo/abc-resume.pdf";
    await storage.put(key, Buffer.from("hello resume"));

    expect(await storage.exists(key)).toBe(true);
    expect(await read(await storage.get(key))).toBe("hello resume");
  });

  it("creates the nested directories it needs", async () => {
    const key = "resumes/usr_other/deep/nested/file.pdf";
    await storage.put(key, Buffer.from("nested"));
    expect(await storage.exists(key)).toBe(true);
  });

  it("deletes a file, and deleting twice is not an error", async () => {
    const key = "resumes/usr_demo/gone.pdf";
    await storage.put(key, Buffer.from("bye"));

    await storage.delete(key);
    expect(await storage.exists(key)).toBe(false);
    await expect(storage.delete(key)).resolves.toBeUndefined();
  });

  it("reports a missing file rather than throwing", async () => {
    expect(await storage.exists("resumes/nobody/missing.pdf")).toBe(false);
  });

  /*
    Keys are built by the server, never by the client. This is belt and braces
    in case that ever stops being true.
  */
  it("refuses a key that climbs out of the storage root", async () => {
    await expect(storage.put("../escaped.pdf", Buffer.from("nope"))).rejects.toThrow(
      /escapes the root/,
    );
    await expect(storage.delete("resumes/../../escaped.pdf")).rejects.toThrow(/escapes the root/);
  });
});
