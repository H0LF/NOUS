import { NextRequest, NextResponse } from "next/server";
import { callGeminiJSON } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, goal, weeklyEvents, geminiApiKey, pdfBase64, pdfName } = body;

    if (!userId || !geminiApiKey) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!goal && !pdfBase64) {
      return NextResponse.json({ error: "Provide a goal or a PDF" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    const eventsStr = weeklyEvents?.length
      ? JSON.stringify(weeklyEvents.map((e: any) => ({
          title: e.title,
          dayOfWeek: e.dayOfWeek,
          startTime: e.startTime,
          endTime: e.endTime,
        })))
      : "none";

    const pdfContext = pdfBase64
      ? `I have attached a PDF document${pdfName ? ` called "${pdfName}"` : ""}. Please read it carefully and use its content (topics, chapters, deadlines, exam dates, etc.) to build the plan.`
      : "";

    const goalContext = goal ? `My goal is: ${goal}.` : "";

    const prompt = `
      Today is ${today}.
      My fixed weekly schedule is: ${eventsStr}.
      ${pdfContext}
      ${goalContext}
      Create a day-by-day study and work plan from today until the deadline.
      Infer the deadline from the PDF or goal; if not specified, assume 2 weeks.
      Do not schedule tasks during my fixed events.
      Reply ONLY in raw JSON array with no markdown and no explanation:
      [{ "date": "YYYY-MM-DD", "task": "description", "duration": "Xh" }]
    `;

    const file = pdfBase64
      ? { mimeType: "application/pdf", data: pdfBase64 }
      : undefined;

    const result = await callGeminiJSON(prompt, geminiApiKey, file);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI Planner Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
