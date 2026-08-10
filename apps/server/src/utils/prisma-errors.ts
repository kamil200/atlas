import { Prisma } from "@chowk/database";

/*
  A check-then-write is never atomic. Two requests can both read "that email is
  free" and both try to insert it; the unique index rejects the second one with
  P2002. Callers turn that into the same 409 the check would have produced,
  instead of letting it surface as a 500.
*/
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
