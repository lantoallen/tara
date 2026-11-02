import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export type DbHandle = {
  db: Db;
  close: () => Promise<void>;
  kind: "postgres" | "pglite";
  // PGlite only: the whole database as a gzipped tarball.
  dump?: () => Promise<Blob>;
};

const migrationsFolder = path.join(process.cwd(), "drizzle");

// Neon's connection strings include `channel_binding=require`. postgres.js
// doesn't know that option and passes it to the server as a setting, which
// the server rejects, so it's dropped. sslmode stays and still turns on TLS.
export function cleanConnectionString(url: string) {
  const parsed = new URL(url);
  parsed.searchParams.delete("channel_binding");
  return parsed.toString();
}

// Real Postgres (Neon in production). `prepare: false` keeps it working
// behind Neon's pooled connection string, which doesn't support prepared statements.
export async function openPostgres(url: string, { migrate = false } = {}): Promise<DbHandle> {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const client = postgres(cleanConnectionString(url), { prepare: false, max: 5, onnotice: () => {} });
  const db = drizzle(client, { schema });
  if (migrate) {
    const { migrate: run } = await import("drizzle-orm/postgres-js/migrator");
    await run(db, { migrationsFolder });
  }
  return { db, close: () => client.end(), kind: "postgres" };
}

// Postgres compiled to WebAssembly. Used for local development and tests so
// nobody has to install a database. Leave out `dataDir` for an in-memory one.
// Starting from a `snapshot` skips initdb, which is most of the boot time.
export async function openPglite(dataDir?: string, { snapshot }: { snapshot?: Blob } = {}): Promise<DbHandle> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (dataDir) await mkdir(path.dirname(dataDir), { recursive: true });
  const client = new PGlite({ dataDir, loadDataDir: snapshot });
  const db = drizzle(client, { schema });
  // Still runs with a snapshot, where it only confirms nothing is missing.
  await migrate(db, { migrationsFolder });
  return {
    db: db as unknown as Db,
    close: () => client.close(),
    kind: "pglite",
    dump: () => client.dumpDataDir("gzip"),
  };
}

// The browser tests point PGLITE_DIR at a folder of their own, so they never
// touch the database `npm run dev` uses.
export const localDataDir = process.env.PGLITE_DIR
  ? path.resolve(process.env.PGLITE_DIR)
  : path.join(process.cwd(), ".data", "pglite");

// Deployed without DATABASE_URL, the app keeps an in-memory database per
// server instance and loads the sample data when it starts. Fine for a demo,
// but anything visitors add is gone when the instance restarts.
export const isDemoMemoryMode = () => !process.env.DATABASE_URL && !!process.env.VERCEL;

// A migrated, empty database saved by the build (`npm run db:setup`), so a
// cold server in demo mode boots from it instead of running initdb.
const demoSnapshotPath = path.join(process.cwd(), ".demo-db", "snapshot.tar.gz");

export async function saveDemoSnapshot() {
  const handle = await openPglite();
  const dump = await handle.dump!();
  await mkdir(path.dirname(demoSnapshotPath), { recursive: true });
  await writeFile(demoSnapshotPath, Buffer.from(await dump.arrayBuffer()));
  await handle.close();
  return { path: demoSnapshotPath, bytes: dump.size };
}

async function readDemoSnapshot() {
  try {
    return new Blob([await readFile(demoSnapshotPath)]);
  } catch {
    return undefined;
  }
}

export async function openFromEnv({ migrate = false } = {}) {
  const url = process.env.DATABASE_URL;
  if (url) return openPostgres(url, { migrate });
  // Serverless file systems are read-only, so there's no folder to keep it in.
  if (isDemoMemoryMode()) return openPglite(undefined, { snapshot: await readDemoSnapshot() });
  return openPglite(localDataDir);
}
