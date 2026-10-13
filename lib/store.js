// Key-value storage. Uses Upstash Redis (Vercel's Redis integration) when its
// env vars are present, otherwise a JSON file under .data/ for local dev.
import { Redis } from "@upstash/redis";
import fs from "node:fs";
import path from "node:path";

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

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
