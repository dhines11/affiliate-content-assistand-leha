import { NextRequest, NextResponse } from "next/server";

// Prevents Vercel 10-second serverless timeout
export const maxDuration = 30;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Active Gemini model queue
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

// High-Value, Authentic Malay Fallback Engine (No overclaiming, smart tone)
function generateFallbackContent(itemDetails: string, platform: string, audience: string) {
  return {
    hooks: [
      "Kadang-kadang jimat masa tu jauh lagi berharga daripada jimat beberapa ringgit...",
      "Kalau korang tengah fikir nak kemas rumah tanpa buang tenaga lepas balik kerja, baca ni kejap.",
      "Solusi praktikal untuk sesiapa yang nak rumah sentiasa bersih tanpa pening kepala.",
      "Bukan pasal beli barang mahal, tapi pasal beli barang yang betul-betul mudahkan hidup.",
      "Ramai tak perasan berapa banyak masa hilang setiap minggu cuma sebab urusan kemas rumah."
    ],
    main_post: [
      `Realitinya, lepas balik kerja yang penat, benda terakhir kita nak buat mesti menyapu dengan mengemut lantai. ${itemDetails} ni direka khas untuk selesaikan masalah tu secara automatik.\n\nBukan sekadar gadget biasa, tapi pelaburan kecil untuk jimatkan masa & tenaga korang setiap hari. Sesuai sangat untuk ${audience} yang hargai kebersihan tanpa pening kepala.\n\nKorang boleh check info lanjut dan harga terkini kat link bawah ni 👇`,

      `Bila kira balik, nilai masa yang kita jimat setiap minggu guna ${itemDetails} ni memang sangat berbaloi. Relevan sangat untuk ${audience} yang jadual harian sentiasa padat.\n\nFunction utama dia memang fokus pada kemudahan—tak payah cuci tangan, sedutan efisien, dan urusan rumah terus settle dalam diam.\n\nTengok tawaran terkini dan voucher khas kat sini 👇`,

      `Ulasan jujur dari sudut praktikal untuk ${itemDetails}:\n\n1. Penjimatan Masa: Automatikkan kerja rumah harian korang.\n2. Prestasi: Kebersihan konsisten tanpa perlu kawalan manual berterusan.\n3. Nilai Pelaburan: Berbaloi untuk jangka masa panjang khasnya buat ${audience}.\n\nBoleh tengok spesifikasi penuh dan harga promo kat link bio/bawah ni!`,

      `Kalau korang tengah cari jalan smart untuk kekalkan kebersihan rumah tanpa kompromi masa lapang, ${itemDetails} ni antara pilihan paling praktikal dalam pasaran sekarang.\n\nKualiti solid, fungsi tepat pada sasaran, dan sesuai untuk gaya hidup ${audience}.\n\nKlik link bawah ni untuk tengok tawaran rasmi sekarang.`
    ],
    ctas: [
      "Semak maklumat lanjut dan voucher promosi di sini 👇",
      "Tekan link untuk tengok harga terkini dan promosi rasmi.",
      "Klik link di bawah untuk semak ketersediaan stok rasmi."
    ],
    comment_ideas: [
      "Berapa lama jaminan (warranty) rasmi untuk model ni?",
      "Sesuai tak kalau guna kat ruang yang ada karpet tebal?",
      "Berapa hari biasa mengambil masa untuk penghantaran?",
      "Kapasiti bateri dia tahan berapa lama untuk sekali cas?",
      "Ada beza ketara tak dengan model generasi sebelum ni?"
    ],
    follow_up_posts: [
      "Update ringkas: Maklum balas dari pembeli sebelum ni memang banyak tekankan bab jimat masa.",
      "Untuk yang bertanyakan pasal promosi, korang masih boleh semak voucher terkini di link rasmi."
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

    const prompt = `You are a top-tier Malaysian content strategist and smart consumer product reviewer on Threads, TikTok, and LinkedIn.
Your specialty is writing HIGH-VALUE, SOPHISTICATED, and HIGHLY PERSUASIVE content in natural Bahasa Melayu (Santai tetapi Berilmu / Smart Consumer Style).

CRITICAL TONE & QUALITY GUIDELINES:
1. NO CHEAP HYPE OR OVERCLAIMING: Strictly AVOID clickbait, loud drama, caps-lock spam, or exaggerated claims (e.g. "terbaik di dunia", "gila power", "gerenti 100%", "paling ajaib").
2. HIGH-VALUE INSIGHT: Focus on realistic benefits—time saved, convenience, smart lifestyle upgrade, practical ROI, and solving genuine daily frustrations.
3. LANGUAGE: Natural, fluent, intelligent Bahasa Melayu as spoken by modern Malaysian professionals and smart consumers. Smooth, natural phrasing that makes readers think "Wow, this makes total sense."
4. STRUCTURE: Produce EXACTLY 4 distinct Main Post variations:
   - Option 1: The Smart Investment Angle (Focus on time/energy saved)
   - Option 2: The Practical Problem-Solver (Relatable daily friction -> seamless fix)
   - Option 3: Structured Value Breakdown (Bullet points with clear logic)
   - Option 4: Concise Authentic Recommendation (Sophisticated, honest recommendation)

PRODUCT DETAILS: ${itemDetails}
${url ? `LINK: ${url}` : ""}
TARGET AUDIENCE: ${audienceStr}
PLATFORM: ${platformStr}
GOAL: ${goal || "Get clicks"}
CONTENT STYLE: ${style || "Casual"}

Return ONLY a valid JSON object matching this schema:
{
  "hooks": [
    "High-value hook 1 (Smart consumer mindset)",
    "High-value hook 2 (Relatable daily frustration)",
    "High-value hook 3 (Time & energy ROI angle)",
    "High-value hook 4 (Intelligent question/observation)",
    "High-value hook 5 (Practical lifestyle perspective)"
  ],
  "main_post": [
    "Main Post 1 (The Smart Investment Angle)",
    "Main Post 2 (The Practical Problem-Solver)",
    "Main Post 3 (Structured Value Breakdown)",
    "Main Post 4 (Concise Authentic Recommendation)"
  ],
  "ctas": [
    "Sophisticated CTA 1",
    "Sophisticated CTA 2",
    "Sophisticated CTA 3"
  ],
  "comment_ideas": ["Insightful Question 1", "Insightful Question 2", "Insightful Question 3", "Insightful Question 4", "Insightful Question 5"],
  "follow_up_posts": ["Follow up post 1", "Follow up post 2"]
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

  // Guaranteed HTTP 200 with high-value Malay copy
  const fallbackData = generateFallbackContent(itemDetails, platformStr, audienceStr);
  return NextResponse.json(fallbackData, { status: 200 });
}
