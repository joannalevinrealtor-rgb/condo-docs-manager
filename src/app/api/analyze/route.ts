import { NextResponse } from "next/server";
import type { AnalysisResult } from "@/lib/types";

const API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: Request) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "Claude API key not configured" },
      { status: 500 }
    );
  }

  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    const prompt = `You are analyzing a Florida condominium Rules & Regulations document for a real estate buyer. Extract and summarize the following restrictions. Return your response as a JSON object with these fields (each a string or null if not found):

{
  "rentalRestrictions": "Summary of rental restrictions (minimum lease terms, caps on number of rentals, waiting periods, etc.) or null",
  "petRestrictions": "Summary of pet restrictions (size, breed, number limits, etc.) or null",
  "firstRightOfRefusal": "Summary of first right of refusal / association approval rights, or null",
  "incomeCreditRestrictions": "Summary of any income or credit restrictions on buyers, or null",
  "rulesSummary": "2-3 sentence summary of the most important rules"
}

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
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
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

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        rentalRestrictions: null,
        petRestrictions: null,
        firstRightOfRefusal: null,
        incomeCreditRestrictions: null,
        rulesSummary: "Unable to parse analysis",
      };
    }

    const result: AnalysisResult = {
      rentalRestrictions: parsed.rentalRestrictions || null,
      petRestrictions: parsed.petRestrictions || null,
      firstRightOfRefusal: parsed.firstRightOfRefusal || null,
      income: parsed.incomeCreditRestrictions || null,
      rulesSummary: parsed.rulesSummary || "No summary available",
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
