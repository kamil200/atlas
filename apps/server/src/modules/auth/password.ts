import { hash, verify } from "@node-rs/argon2";

/*
  Argon2id at the library's default cost. The hash string carries its own
  parameters, so raising the cost later still verifies old passwords.
*/

export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    // A malformed hash should read as "wrong password", not as a 500.
    return false;
  }
}
