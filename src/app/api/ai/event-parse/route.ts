import { NextRequest, NextResponse } from "next/server";
import { callGeminiJSON } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { description, geminiApiKey } = await req.json();

    if (!description || !geminiApiKey) {
      return NextResponse.json(
        { error: "Missing description or API key" },
        { status: 400 },
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const prompt = `Parse the following calendar event description and extract structured data. Today's date is ${today}.

Return ONLY a JSON object with these fields:
- title: string (short event title, required)
- date: string (YYYY-MM-DD format, use today if not specified or if recurring)
- startTime: string (HH:MM 24h format, required)
- endTime: string (HH:MM 24h format, required, at least 30 min after start)
- isClass: boolean (true if it's a university class/lecture/lab/seminar)
- classType: string ("Lecture" | "Lab" | "Seminar" | null, only if isClass is true)
- room: string (room/location if mentioned, else null)
- isWeekly: boolean (true if it sounds like a recurring weekly event)
- color: string (a hex color appropriate to the event type — use #7c6bff for classes, #30c48d for sports/fitness, #f87171 for deadlines, #60a5fa for meetings, #e879f9 for social events)

Event description: "${description}"`;

    const data = await callGeminiJSON(prompt, geminiApiKey);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
