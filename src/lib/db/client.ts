// =============================================================================
// VIZION — Demo mode Prisma stub
// Returns a Proxy that silently returns empty results for any DB call.
// In demo mode, no code path should actually use this — but it prevents
// build failures from stray imports.
// =============================================================================

const noop = () => Promise.resolve(null);
const noopArray = () => Promise.resolve([]);
const noopCount = () => Promise.resolve(0);

const modelHandler: ProxyHandler<object> = {
  get(_target, prop: string) {
    if (prop === "findMany") return noopArray;
    if (prop === "findFirst" || prop === "findUnique") return noop;
    if (prop === "findFirstOrThrow" || prop === "findUniqueOrThrow") return noop;
    if (prop === "count") return noopCount;
    if (prop === "aggregate") return () => Promise.resolve({ _sum: {}, _count: 0 });
    if (prop === "groupBy") return noopArray;
    if (prop === "create" || prop === "update" || prop === "upsert" || prop === "delete") return noop;
    if (prop === "createMany" || prop === "updateMany" || prop === "deleteMany") return () => Promise.resolve({ count: 0 });
    return noop;
  },
};

const prismaHandler: ProxyHandler<object> = {
  get(_target, prop: string) {
    if (prop === "$transaction") return (callback: (tx: object) => unknown) => Promise.resolve(callback(new Proxy({}, prismaHandler)));
    if (prop === "$connect" || prop === "$disconnect") return () => Promise.resolve();
    if (prop === "$queryRaw" || prop === "$executeRaw") return noopArray;
    return new Proxy({}, modelHandler);
  },
};

export const prisma = new Proxy({}, prismaHandler) as never;

// The original client.ts also exported `prismaWithDeleted` and re-exported Prisma types.
// Stub both to prevent import errors from stray references.
export const prismaWithDeleted = prisma;

// Re-export stub — consumers importing `Prisma` type from here get an empty object.
// Type-only imports will be erased by the compiler so this is safe.
export type { Prisma } from "@prisma/client";

export type PrismaSoftClient = typeof prisma;

export default prisma;
