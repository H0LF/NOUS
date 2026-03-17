import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const barcode = searchParams.get("barcode");

    if (!barcode) {
      return NextResponse.json({ error: "Missing barcode" }, { status: 400 });
    }

    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await res.json();

    if (data.status === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = data.product;
    const nutriments = product.nutriments;
    
    // Normalize data
    const normalized = {
        name: product.product_name || "Unknown Product",
        caloriesPer100g: nutriments["energy-kcal_100g"] || 0,
        proteinPer100g: nutriments["proteins_100g"] || 0,
        carbsPer100g: nutriments["carbohydrates_100g"] || 0,
        fatPer100g: nutriments["fat_100g"] || 0,
        fiberPer100g: nutriments["fiber_100g"] || 0,
        source: "barcode"
    };

    return NextResponse.json(normalized);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
