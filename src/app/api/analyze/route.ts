import { NextResponse } from "next/server";
import type { AnalysisResult, AnalysisTopic } from "@/lib/types";

const API_KEY = process.env.ANTHROPIC_API_KEY;

const NOT_FOUND: AnalysisTopic = {
  status: "not_found",
  summary: "Not found in the provided document.",
  key_details: [],
  concern: false,
  concern_note: "",
};

export async function POST(req: Request) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "Claude API key not configured" },
      { status: 500 }
    );
  }

  try {
    const { text, docNames } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const prompt = `You are analyzing a Florida condominium disclosure document for a real estate buyer. Extract the following four topics and return a JSON object with exactly this structure:

{
  "rental": {
    "status": "restricted" | "allowed" | "unclear" | "not_found",
    "summary": "one sentence summary",
    "key_details": ["detail 1", "detail 2"],
    "concern": true | false,
    "concern_note": "why it is a concern, or empty string"
  },
  "pet": {
    "status": "restricted" | "allowed" | "unclear" | "not_found",
    "summary": "one sentence summary",
    "key_details": ["detail 1"],
    "concern": true | false,
    "concern_note": ""
  },
  "fror": {
    "status": "restricted" | "allowed" | "unclear" | "not_found",
    "summary": "one sentence summary about first right of refusal or association approval rights",
    "key_details": [],
    "concern": true | false,
    "concern_note": ""
  },
  "income": {
    "status": "restricted" | "allowed" | "unclear" | "not_found",
    "summary": "one sentence summary about income or credit requirements for buyers",
    "key_details": [],
    "concern": true | false,
    "concern_note": ""
  }
}

Use "not_found" if the topic is not mentioned. Use "restricted" if there are clear restrictions. Use "allowed" if explicitly permitted with no restrictions. Use "unclear" if mentioned but ambiguous.

Document text:
${text}

Return ONLY the JSON object, no other text.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Claude API error:", error);
      return NextResponse.json(
        { error: "Failed to analyze document" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.content[0]?.text || "{}";

    let parsed: Record<string, AnalysisTopic> = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      // leave parsed empty — fallback to NOT_FOUND below
    }

    const result: AnalysisResult = {
      rental: parsed.rental || NOT_FOUND,
      pet: parsed.pet || NOT_FOUND,
      fror: parsed.fror || NOT_FOUND,
      income: parsed.income || NOT_FOUND,
      generatedAt: new Date().toISOString(),
      docNames: docNames || [],
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
