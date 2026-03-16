import { NextRequest, NextResponse } from "next/server";
import { callGeminiJSON } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { description, geminiApiKey } = await req.json();

    if (!description || !geminiApiKey) {
      return NextResponse.json(
        { error: "Missing description or API key" },
        { status: 400 }
      );
    }

    const prompt = `Analyze the following food description and provide nutritional information. Return ONLY a JSON object with these fields: name (string), calories (number), protein_g (number), carbs_g (number), fat_g (number), fiber_g (number). Estimate the serving size based on the description. If quantity is not specified, assume a standard serving. Content: "${description}"`;

    const data = await callGeminiJSON(prompt, geminiApiKey);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
