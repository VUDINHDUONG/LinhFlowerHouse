import { randomBytes } from "node:crypto";
import { readFileSync, appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const varsPath = path.join(root, ".dev.vars");
let vars = "";
try { vars = readFileSync(varsPath, "utf8"); } catch (e) { if (e.code !== "ENOENT") throw e; }
let token = vars.match(/^ADMIN_LOCAL_TOKEN=([A-Za-z0-9_-]+)\s*$/m)?.[1];
if (!token) {
  if (/^ADMIN_LOCAL_TOKEN=/m.test(vars)) throw new Error("ADMIN_LOCAL_TOKEN must contain only letters, digits, underscores and hyphens.");
  token = randomBytes(18).toString("base64url");
  appendFileSync(varsPath, `\nADMIN_LOCAL_TOKEN=${token}\n`);
}
const ips = Object.values(networkInterfaces()).flat().filter(i => i && i.family === "IPv4" && !i.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(i.address)).map(i => i.address);
const access = ["LINH FLOWER HOUSE - LOCAL ADMIN", "", "Computer: http://127.0.0.1:5173/admin", ...ips.map(ip => `Phone (same Wi-Fi): http://${ip}:5173/admin`), "", `Access code: ${token}`, "", "Keep the computer and local server running. This code works only in development.", "Uploads and database are stored in .wrangler/state; keep that folder to preserve data."].join("\n");
mkdirSync(path.join(root, ".sites-runtime"), { recursive: true });
writeFileSync(path.join(root, ".sites-runtime", "mobile-access.txt"), access);
console.log("Local access configured. See .sites-runtime/mobile-access.txt for URLs and access code.");
