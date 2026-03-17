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
      ? JSON.stringify(weeklyEvents.map((e: { title: string; dayOfWeek: number; startTime: string; endTime: string }) => ({
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
      Today is ${today} (${new Date(today).toLocaleDateString("en-US", { weekday: "long" })}).
      My fixed weekly schedule is: ${eventsStr}.
      ${pdfContext}
      ${goalContext}

      Create a day-by-day plan of tasks or activities based on the goal above.
      The goal may be in any language — understand it and plan accordingly.
      It may be a study goal, fitness goal, project deadline, habit, or any other personal objective.
      Infer the relevant date range from the goal or PDF content.
      If it is a one-time activity (e.g. go to the gym next Tuesday), create only that one entry.
      If no deadline or frequency is specified, assume a 1-week plan.
      Do not schedule tasks during my fixed events.
      Reply ONLY with a raw JSON array — no markdown, no explanation, no extra text:
      [{ "date": "YYYY-MM-DD", "task": "short description of the task", "duration": "Xh" }]
    `;

    const file = pdfBase64
      ? { mimeType: "application/pdf", data: pdfBase64 }
      : undefined;

    const result = await callGeminiJSON(prompt, geminiApiKey, file);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("AI Planner Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
