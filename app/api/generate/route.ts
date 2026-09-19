import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-flash-latest";

async function callGemini(prompt: string, attempt = 1): Promise<Response> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 3000 },
      }),
    }
  );

  if (response.status === 503 && attempt < 3) {
    await new Promise((r) => setTimeout(r, attempt * 1500));
    return callGemini(prompt, attempt + 1);
  }

  return response;
}

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing GEMINI_API_KEY." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const {
    productName,
    description,
    url,
    audience,
    platform,
    goal,
    style,
  } = body;

  if (!productName || !description || !audience) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  const prompt = `You are a top-performing affiliate marketer and social media copywriter. Write in a natural, human, scroll-native voice — NOT generic AI marketing speak. No corporate tone, no excessive emojis, no hashtag spam, no "Are you tired of...?" clichés.

PRODUCT: ${productName}
DESCRIPTION: ${description}
${url ? `LINK: ${url}` : ""}
TARGET AUDIENCE: ${audience}
PLATFORM: ${platform}
GOAL: ${goal}
CONTENT STYLE: ${style}

Write content tailored to how people actually talk and post on ${platform}. Match the "${style}" style and optimize for the goal "${goal}".

Return ONLY valid JSON, no markdown fences, no preamble, matching exactly this shape:
{
  "hooks": ["...", "...", "...", "...", "..."],
  "main_post": "...",
  "ctas": ["...", "...", "..."],
  "comment_ideas": ["...", "...", "...", "...", "..."],
  "follow_up_posts": ["...", "..."]
}

- hooks: 5 distinct scroll-stopping opening lines
- main_post: 1 full ready-to-publish post appropriate for ${platform}'s length/format norms
- ctas: 3 different call-to-action lines
- comment_ideas: 5 short comment/reply ideas to seed engagement or answer objections
- follow_up_posts: 2 short follow-up posts for a day or two later`;

  try {
    const response = await callGemini(prompt);

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      const isOverloaded = errText.includes("UNAVAILABLE");
      return NextResponse.json(
        {
          error: isOverloaded
            ? "Gemini's free tier is overloaded right now. Please wait a moment and try again."
            : "AI generation failed. Try again.",
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = rawText.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse model output:", rawText);
      return NextResponse.json(
        { error: "AI returned an unexpected format. Try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}