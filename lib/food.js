// Food lookups, normalized to one shape:
// { id, source: "off"|"usda", name, brand, per100: {k,p,c,f}|null, unit100: "g"|"ml",
//   serving: { label, qty (g or ml), k,p,c,f } | null }

const UA = "CutLog/1.0 (personal fitness tracker)";
const r1 = v => (v == null || isNaN(+v) ? null : Math.round(+v * 10) / 10);

function macros(o) {
  if (!o) return null;
  const m = { k: r1(o.k), p: r1(o.p) ?? 0, c: r1(o.c) ?? 0, f: r1(o.f) ?? 0 };
  return m.k == null ? null : m;
}

// ---------- Open Food Facts (barcodes, worldwide packaged foods) ----------
export function normalizeOff(code, product) {
  if (!product) return null;
  const n = product.nutriments || {};
  const kcal = (suffix) => n[`energy-kcal${suffix}`] ?? (n[`energy${suffix}`] != null ? n[`energy${suffix}`] / 4.184 : null);
  const per100 = macros({ k: kcal("_100g"), p: n.proteins_100g, c: n.carbohydrates_100g, f: n.fat_100g });
  const qty = parseFloat(product.serving_quantity);
  let serving = null;
  const sv = macros({ k: kcal("_serving"), p: n.proteins_serving, c: n.carbohydrates_serving, f: n.fat_serving });
  if (sv) serving = { label: product.serving_size || "1 serving", qty: qty > 0 ? qty : null, ...sv };
  else if (per100 && qty > 0) serving = { label: product.serving_size || `${qty} g`, qty, ...scale(per100, qty / 100) };
  if (!per100 && !serving) return null;
  const unit = /ml|fl/i.test(product.serving_size || "") || product.serving_quantity_unit === "ml" ? "ml" : "g";
  return {
    id: `off:${code}`, source: "off", code,
    name: product.product_name || product.generic_name || "Unnamed product",
    brand: (product.brands || "").split(",")[0].trim() || null,
    per100, unit100: unit, serving,
  };
}

export async function offBarcode(code) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=code,product_name,generic_name,brands,serving_size,serving_quantity,serving_quantity_unit,nutriments`, {
    headers: { "User-Agent": UA }, next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const j = await res.json();
  return j.status === 1 ? normalizeOff(code, j.product) : null;
}

// ---------- USDA FoodData Central (US branded + generic foods) ----------
const NUTR = { k: [1008, 2047, 2048], p: [1003], c: [1005], f: [1004] };
function nutrient(list, ids) {
  for (const id of ids) {
    const hit = list.find(x => x.nutrientId === id || x.nutrient?.id === id);
    if (hit) return hit.value ?? hit.amount;
  }
  return null;
}
export function normalizeUsda(food) {
  const list = food.foodNutrients || [];
  const per100 = macros({ k: nutrient(list, NUTR.k), p: nutrient(list, NUTR.p), c: nutrient(list, NUTR.c), f: nutrient(list, NUTR.f) });
  if (!per100) return null;
  let serving = null;
  const unit = (food.servingSizeUnit || "").toLowerCase();
  if (food.servingSize > 0 && (unit === "g" || unit === "grm" || unit === "ml" || unit === "mlt")) {
    const qty = +food.servingSize;
    const label = food.householdServingFullText ? `${food.householdServingFullText} (${qty} ${unit.startsWith("m") ? "ml" : "g"})` : `${qty} ${unit.startsWith("m") ? "ml" : "g"}`;
    serving = { label, qty, ...scale(per100, qty / 100) };
  }
  const branded = food.dataType === "Branded";
  return {
    id: `usda:${food.fdcId}`, source: "usda", code: food.gtinUpc || null,
    name: titleCase(food.description || "Food"),
    brand: branded ? (food.brandName || food.brandOwner || null) : null,
    kind: food.dataType, per100, unit100: unit.startsWith("m") ? "ml" : "g", serving,
  };
}

function usdaKey() { return process.env.USDA_API_KEY || "DEMO_KEY"; }

export async function usdaSearch(query, { branded = true, size = 20 } = {}) {
  const types = branded ? ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"] : ["Foundation", "SR Legacy", "Survey (FNDDS)"];
  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaKey()}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, pageSize: size, dataType: types }),
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(res.status === 429 ? "The USDA food database is busy. Try again in a minute." : "Food search failed.");
  const j = await res.json();
  return (j.foods || []).map(normalizeUsda).filter(Boolean);
}

export async function usdaBarcode(code) {
  const norm = s => String(s || "").replace(/^0+/, "");
  const foods = await usdaSearch(code, { size: 10 }).catch(() => []);
  return foods.find(f => f.code && norm(f.code) === norm(code)) || null;
}

export function scale(m, factor) {
  return { k: Math.round(m.k * factor), p: r1(m.p * factor), c: r1(m.c * factor), f: r1(m.f * factor) };
}
function titleCase(s) {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());
}
