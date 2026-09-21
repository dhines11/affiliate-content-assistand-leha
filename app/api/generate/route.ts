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

// Local Safety Net: Returns instant 4 Malay main posts if Google AI is offline
function generateFallbackContent(itemDetails: string, platform: string, audience: string) {
  return {
    hooks: [
      "Jujur cakap, barang ni memang berbaloi kalau korang tengah cari penyelesaian senang.",
      "Siapa yang selalu ada masalah macam ni, wajib tengok item ni.",
      "Ramai yang tanya mana nak dapat barang berkualiti harga berpatutan...",
      "Guna ni beberapa hari, memang rasa beza sangat!",
      "Jangan beli dulu sebelum korang baca ni."
    ],
    main_post: [
      `Kalau korang tengah cari pilihan yang praktikal untuk ${itemDetails}, barang ni memang antara yang terbaik. Kualiti padu, senang guna, dan sesuai sangat untuk ${audience}.\n\nTak payah pening kepala pusing cari tempat lain. Tengok link untuk maklumat lanjut dan tawaran terkini!`,
      `Jujur reviu pasal ${itemDetails} ni: Sangat memudahkan urusan harian! Sesuai sangat untuk ${audience} yang nak jimat masa. Rekomen sangat untuk cuba sendiri.`,
      `Siapa kat sini yang tengah cari ${itemDetails}? Barang ni memang viral sebab fungsi dia memang mantap dan berbaloi dengan harga. Korang wajib check out sekarang!`,
      `Pengalaman guna ${itemDetails} ni memang terbaik. Binaan kukuh, prestasi tiada tandingan, khas untuk ${audience}. Tekan link bawah ni untuk dapatkan promosi khas.`
    ],
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

export async function POST(req: NextRequest) {
  let itemDetails = "Product";
  let platformStr = "Threads";
  let audienceStr = "General";

  try {
    const body = await req.json();
    const { productName, description, url, audience, platform, goal, style } = body;

    itemDetails = description || productName || "Featured Product";
    platformStr = platform || "Threads";
    audienceStr = audience || "General";

    const prompt = `You are a top-performing affiliate marketer and social media copywriter in Malaysia. Write in a natural, human, scroll-native voice.

STRICT LANGUAGE REQUIREMENT:
Regardless of what language the input product details are in, you MUST write ALL outputs strictly in fluent, natural Bahasa Melayu (Malay) as spoken on Malaysian social media (Bahasa Melayu Santai / Casual). Do NOT output English under any circumstances.

PRODUCT DETAILS: ${itemDetails}
${url ? `LINK: ${url}` : ""}
TARGET AUDIENCE: ${audienceStr}
PLATFORM: ${platformStr}
GOAL: ${goal || "Get clicks"}
CONTENT STYLE: ${style || "Casual"}

Return ONLY valid JSON with this exact schema containing EXACTLY 4 main post variations:
{
  "hooks": ["...", "...", "...", "...", "..."],
  "main_post": [
    "Main Post Option 1 (Malay)",
    "Main Post Option 2 (Malay)",
    "Main Post Option 3 (Malay)",
    "Main Post Option 4 (Malay)"
  ],
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

  // Always returns HTTP 200 with complete content in Malay
  const fallbackData = generateFallbackContent(itemDetails, platformStr, audienceStr);
  return NextResponse.json(fallbackData, { status: 200 });
}
