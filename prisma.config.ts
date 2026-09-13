import { definePrismaConfig } from "@prisma/cli-engine";
import { defineConfig as postgres } from "@prisma/orm-postgres/config";

/**
 * Prisma authors the schema Monovella will actually build on.
 *
 * `PRODUCT_ARCH_V0.md` plans FastAPI on Postgres, so the contract targets
 * Postgres. Nothing here connects to a database: the contract and the migration
 * are both planned offline, and the connection string below is a placeholder so
 * the CLI has one to look at.
 *
 * The running prototype uses the same schema and the same engine. `scripts/
 * seed-db.ts` applies `prisma/postgres.sql` to PGlite, which is Postgres
 * compiled to WebAssembly, and the SPA opens the resulting data directory in the
 * tab. Prisma Client is not involved: it needs a query engine and Node APIs that
 * a browser does not have, and the prototype has no server to run it on.
 */
export default definePrismaConfig({
  orm: postgres({
    contract: "./prisma/contract.prisma",
    migrations: { dir: "prisma/migrations" },
    db: { connection: "postgresql://monovella:monovella@localhost:5432/monovella" },
  }),
});
