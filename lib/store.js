// Key-value storage. Uses Upstash Redis (Vercel's Redis integration) when its
// env vars are present, otherwise a JSON file under .data/ for local dev.
import { Redis } from "@upstash/redis";
import fs from "node:fs";
import path from "node:path";

// Vercel lets you add a custom prefix to these names (e.g. STORAGE_KV_REST_API_URL),
// so match on the ending rather than the exact name.
function env(...endings) {
  for (const end of endings) {
    if (process.env[end]) return process.env[end];
    const key = Object.keys(process.env).find(k => k.endsWith("_" + end) && process.env[k]);
    if (key) return process.env[key];
  }
  return undefined;
}
const url = env("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL");
const token = env("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN");

let redis = null;
if (url && token) redis = new Redis({ url, token });

const FILE = path.join(process.cwd(), ".data", "dev.json");
function readFile() {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return {}; }
}
function writeFile(o) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(o, null, 1));
}

export const hasRedis = !!redis;

export async function get(key) {
  if (redis) return (await redis.get(key)) ?? null;
  return readFile()[key] ?? null;
}
export async function set(key, value) {
  if (redis) return redis.set(key, value);
  const o = readFile(); o[key] = value; writeFile(o);
}
export async function del(key) {
  if (redis) return redis.del(key);
  const o = readFile(); delete o[key]; writeFile(o);
}
export async function mget(keys) {
  if (!keys.length) return [];
  if (redis) return redis.mget(...keys);
  const o = readFile(); return keys.map(k => o[k] ?? null);
}
