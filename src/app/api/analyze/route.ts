import { NextResponse } from "next/server";

// The real Claude-powered analysis is wired up in a later step (it needs an
// API key). For now this returns a friendly message so the button works
// without crashing.
export async function POST() {
  return NextResponse.json(
    {
      error:
        "One-click AI analysis isn't connected yet. It gets turned on in the AI-analysis setup step (needs a Claude API key).",
    },
    { status: 503 }
  );
}
