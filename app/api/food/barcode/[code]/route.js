import { NextResponse } from "next/server";
import { offBarcode, usdaBarcode } from "@/lib/food";

export async function GET(req, { params }) {
  const { code } = await params;
  if (!/^\d{6,14}$/.test(code)) return NextResponse.json({ error: "That doesn't look like a barcode." }, { status: 400 });
  // Open Food Facts first; USDA's branded list as a fallback for US products.
  const off = await offBarcode(code).catch(() => null);
  const food = off || await usdaBarcode(code).catch(() => null);
  if (!food) return NextResponse.json({ error: "Not found in Open Food Facts or USDA. Enter it from the label." }, { status: 404 });
  return NextResponse.json({ food });
}
