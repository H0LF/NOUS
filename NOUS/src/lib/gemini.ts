interface InlineFilePart {
  mimeType: string;
  data: string; // base64
}

export async function callGemini(prompt: string, apiKey: string, file?: InlineFilePart): Promise<string> {
  if (!apiKey) throw new Error("Gemini API Key is required");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const parts: any[] = [];
  if (file) {
    parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
  }
  parts.push({ text: prompt });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Error calling Gemini API");
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export async function callGeminiJSON<T>(prompt: string, apiKey: string, file?: InlineFilePart): Promise<T> {
  const text = await callGemini(prompt, apiKey, file);
  const cleanedText = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleanedText) as T;
  } catch (e) {
    console.error("Failed to parse JSON from Gemini response", text);
    throw new Error("Invalid JSON response from Gemini");
  }
}
