import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID?.trim();
if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(databaseId ?? "")) {
  throw new Error("CLOUDFLARE_D1_DATABASE_ID phải là UUID của D1 production.");
}

const workerName = process.env.CLOUDFLARE_WORKER_NAME?.trim() || "linh-flower-house";
const databaseName = process.env.CLOUDFLARE_D1_DATABASE_NAME?.trim() || "linh-flower-house-db";
const source = resolve("dist/server/wrangler.json");
const output = resolve("dist/server/wrangler.production.json");
const config = JSON.parse(await readFile(source, "utf8"));

config.name = workerName;
config.d1_databases = [{
  binding: "DB",
  database_name: databaseName,
  database_id: databaseId,
  migrations_dir: "../../drizzle",
}];
delete config.r2_buckets;

await writeFile(output, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Production config written: ${output}`);
