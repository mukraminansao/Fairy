import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env.local")) loadEnvFile(".env.local");
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run this rehearsal with npm run release:rehearse.");

let source;
try { source = new URL(process.env.DATABASE_URL ?? ""); } catch { /* report below */ }
if (!source || !["postgres:", "postgresql:"].includes(source.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(source.hostname) ||
    !/^\/fairy_dev(?:_[a-z0-9]+)?$/.test(source.pathname)) {
  throw new Error("Use the loopback FAIRY development DATABASE_URL for this rehearsal.");
}

const owner = decodeURIComponent(source.username);
if (!/^[a-z][a-z0-9_]{0,31}$/.test(owner)) throw new Error("The local database role is not supported by this rehearsal.");
const container = "fairy-dev-postgres";
const port = source.port || "5432";
const inspect = spawnSync("docker", ["inspect", "--format", "{{json .NetworkSettings.Ports}}", container], { encoding: "utf8" });
if (inspect.status !== 0) throw new Error("Start the local fairy-dev-postgres Docker container before rehearsing.");
const mappings = JSON.parse(inspect.stdout)["5432/tcp"] ?? [];
if (mappings.length !== 1 || mappings[0].HostIp !== "127.0.0.1" || mappings[0].HostPort !== port) {
  throw new Error("The local FAIRY database port does not match the isolated Docker container.");
}

const database = "fairy_test_release" + randomBytes(5).toString("hex");
const isolated = new URL(source.href);
isolated.pathname = "/" + database;
const env = {
  ...process.env, DATABASE_URL: isolated.href,
  FAIRY_RELEASE_DATABASE_URL: isolated.href, FAIRY_NEXT_DIST_DIR: ".next-release",
  AUTH_URL: "http://127.0.0.1:3116", AUTH_SECRET: randomBytes(32).toString("base64url"),
  AUTH_OIDC_ISSUER: "", AUTH_OIDC_CLIENT_ID: "", AUTH_OIDC_CLIENT_SECRET: "",
  FAIRY_DEV_EMAIL: "customer@fairy.test", FAIRY_DEV_AUTH_PASSWORD: randomBytes(24).toString("base64url"),
  FAIRY_CAMERA_PREVIEW: "true", FAIRY_CAMERA_DEV_ORIGIN: "",
};

function run(label, executable, args) {
  console.log("\n" + label);
  const result = spawnSync(executable, args, { env, stdio: "inherit" });
  if (result.status !== 0) throw new Error(label + " failed.");
}
const counts = () => {
  const select = 'SELECT count(*) FROM "Product"; SELECT count(*) FROM "Scene"; SELECT count(*) FROM "Hotspot"; SELECT count(*) FROM "Order"; SELECT count(*) FROM "Payment";';
  const result = spawnSync("docker", ["exec", container, "psql", "-U", owner, "-d", database, "-qAt", "-v", "ON_ERROR_STOP=1", "-c", select], { encoding: "utf8" });
  if (result.status !== 0) throw new Error("Could not check the disposable database.");
  const values = result.stdout.trim().split(/\s+/).map(Number);
  if (values.length !== 5 || values.some((n) => !Number.isSafeInteger(n) || n < 0)) throw new Error("Database count check was incomplete.");
  return values;
};

let created = false;
try {
  run("Create a disposable rehearsal database", "docker", ["exec", container, "createdb", "-U", owner, database]);
  created = true;
  run("Apply migrations", process.execPath, [npmCli, "run", "db:migrate"]);
  run("Load demo fixtures", process.execPath, [npmCli, "run", "db:seed"]);
  const before = counts();
  run("Check repeatable fixture loading", process.execPath, [npmCli, "run", "db:seed"]);
  if (counts().join(",") !== before.join(",")) throw new Error("The second seed changed the catalog or scene counts.");
  console.log("Verified fixtures: " + before[0] + " products, " + before[1] + " scenes, " + before[2] + " hotspots.");
  run("Build the production app", process.execPath, [npmCli, "run", "build"]);
  run("Exercise the production app in Chrome", process.execPath, [npmCli, "exec", "--", "playwright", "test", "-c", "playwright.release.config.ts"]);
  const after = counts();
  if (after[3] !== 0 || after[4] !== 0) throw new Error("A demo checkout wrote an order or payment record.");
  console.log("Rehearsal passed. Demo checkout created no orders or payments.");
} finally {
  if (created) {
    // The only database that can be removed is the one this process created.
    run("Remove the disposable rehearsal database", "docker", ["exec", container, "dropdb", "-U", owner, database]);
  }
}

