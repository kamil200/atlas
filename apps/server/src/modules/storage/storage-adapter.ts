import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";

/*
  Files go through this interface so the route never knows where bytes land.
  Swapping local disk for S3 later means writing one more adapter, not touching
  the resume routes.
*/
export type StorageAdapter = {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** S3 would implement this; local disk streams through the API instead. */
  getSignedUrl?(key: string, ttlSeconds: number): Promise<string>;
};

export class LocalDiskStorageAdapter implements StorageAdapter {
  constructor(private readonly rootDir: string) {}

  /*
    Keys are built by us, never by the client, but resolving and re-checking
    the prefix means a stray "../" in a key can't escape the upload directory.
  */
  private resolve(key: string): string {
    const full = path.resolve(this.rootDir, key);
    const root = path.resolve(this.rootDir);
    if (full !== root && !full.startsWith(`${root}${path.sep}`)) {
      throw new Error(`Storage key escapes the root directory: ${key}`);
    }
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  async get(key: string): Promise<Readable> {
    return createReadStream(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }
}
