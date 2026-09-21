import { NextRequest, NextResponse } from "next/server";

// Prevents Vercel 10-second serverless timeout
export const maxDuration = 30;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Valid, active Gemini endpoints
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-1.5-flash"];

async function callGemini(prompt: string, modelIndex = 0, attempt = 1): Promise<Response> {
  const MODEL = MODELS[modelIndex];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 3000,
        },
      }),
    }
  );

  // Auto-switch models if rate limited or busy
  if (response.status === 503 || response.status === 429 || response.status === 500) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000));
      return callGemini(prompt, modelIndex, attempt + 1);
    }
    if (modelIndex < MODELS.length - 1) {
      return callGemini(prompt, modelIndex + 1, 1);
    }
  }

  return response;
}

// Local Safety Net: Returns instant structured copy if Google AI is offline
function generateFallbackContent(itemDetails: string, platform: string, audience: string) {
  const isMalay = /malay|melayu/i.test(itemDetails);

  if (isMalay) {
    return {
      hooks: [
        "Jujur cakap, barang ni memang berbaloi kalau korang tengah cari penyelesaian senang.",
        "Siapa yang selalu ada masalah macam ni, wajib tengok item ni.",
        "Ramai yang tanya mana nak dapat barang berkualiti harga berpatutan...",
        "Guna ni beberapa hari, memang rasa beza sangat!",
        "Jangan beli dulu sebelum korang baca ni."
      ],
      main_post: `Kalau korang tengah cari pilihan yang praktikal untuk ${itemDetails}, barang ni memang antara yang terbaik. Cengkam cemerlang, kualiti padu, dan sesuai sangat untuk golongan ${audience}.\n\nTak payah pening kepala pusing cari tempat lain. Tengok link untuk tengok maklumat lanjut dan tawaran terkini!`,
      ctas: [
        "Tekan link dekat bio / bawah ni untuk check stock!",
        "Klik link sekarang sebelum harga promosi habis.",
        "Tengok promo terkini dekat sini:"
      ],
      comment_ideas: [
        "Penghantaran cepat tak?",
        "Tahan lama tak kalau guna harian?",
        "Ada waranti tak barang ni?",
        "Sesuai tak untuk guna harian?",
        "Warna apa lagi yang ada stock?"
      ],
      follow_up_posts: [
        "Semalam ramai tanyakan pasal item ni, stok memang makin susut!",
        "Update ringkas: Masih ramai bagi review positif lepas guna."
      ]
    };
  }

  return {
    hooks: [
      "Honestly, this is one of the best upgrades you can get right now.",
      "If you've been looking for something reliable, don't sleep on this.",
      "Here is why everyone has been talking about this item recently...",
      "Quick review after using this: totally worth it.",
      "Stop scrolling if you need a quick solution for your setup."
    ],
    main_post: `If you're looking for a reliable option for ${itemDetails}, this is definitely a solid pick. Great quality, easy to use, and tailored well for ${audience}.\n\nCheck out the link below for full details and current promos!`,
    ctas: [
      "Tap the link to check current availability!",
      "Grab yours via the link before stock runs out.",
      "Click here to check the latest deals:"
    ],
    comment_ideas: [
      "How fast is the delivery?",
      "Does it hold up well over time?",
      "Is this suitable for everyday use?",
      "Are there other options/colors available?",
      "How is the build quality?"
    ],
    follow_up_posts: [
      "Quick follow up: A lot of people were asking about this item yesterday!",
      "Update: Still getting great feedback on this setup."
    ]
  };
}

export async function POST(req: NextRequest) {
  let itemDetails = "Product";
  let platformStr = "Threads";
  let audienceStr = "General";

  try {
    const body = await req.json();
    const { productName, description, url, audience, platform, goal, style } = body;

    itemDetails = description || productName || "Featured Product";
    platformStr = platform || "Threads";
    audienceStr = audience || "40-50";

    const prompt = `You are a top-performing affiliate marketer and social media copywriter. Write in a natural, human, scroll-native voice.

PRODUCT DETAILS: ${itemDetails}
${url ? `LINK: ${url}` : ""}
TARGET AUDIENCE: ${audienceStr}
PLATFORM: ${platformStr}
GOAL: ${goal || "Get clicks"}
CONTENT STYLE: ${style || "Casual"}

Return ONLY valid JSON with this exact schema:
{
  "hooks": ["...", "...", "...", "...", "..."],
  "main_post": "...",
  "ctas": ["...", "...", "..."],
  "comment_ideas": ["...", "...", "...", "...", "..."],
  "follow_up_posts": ["...", "..."]
}`;

    if (GEMINI_API_KEY) {
      const response = await callGemini(prompt);

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const cleaned = rawText.replace(/```json|```/g, "").trim();

        try {
          const parsed = JSON.parse(cleaned);
          return NextResponse.json(parsed);
        } catch {
          console.warn("JSON parse issue, invoking fallback content engine.");
        }
      }
    }
  } catch (err) {
    console.error("Backend error intercepted:", err);
  }

  // Always returns HTTP 200 with complete content
  const fallbackData = generateFallbackContent(itemDetails, platformStr, audienceStr);
  return NextResponse.json(fallbackData, { status: 200 });
}
