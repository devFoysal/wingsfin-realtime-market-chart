import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { closeDb, pool } from "../infrastructure/postgres/pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(__dirname, "../../migrations/001_init.sql");

const sql = await readFile(migrationPath, "utf8");
await pool.query(sql);
await closeDb();
console.log("Migrations applied");
