import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 10;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash"
];

async function callGemini(prompt: string, modelIndex = 0): Promise<Response> {
  const model = MODELS[modelIndex] || "gemini-1.5-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 2500,
          temperature: 1.1,
        },
      }),
    }
  );

  if (!response.ok && modelIndex < MODELS.length - 1) {
    return callGemini(prompt, modelIndex + 1);
  }

  return response;
}

function generateFallback(cleanTitle: string, audience: string) {
  return {
    hooks: [
      "Kadang-kadang jimat masa tu jauh lagi berharga daripada jimat beberapa ringgit...",
      "Kalau korang tengah fikir nak kemas rumah tanpa buang tenaga lepas balik kerja, baca ni kejap.",
      "Solusi praktikal untuk sesiapa yang nak rumah sentiasa bersih tanpa pening kepala.",
      "Bukan pasal beli barang mahal, tapi pasal beli barang yang betul-betul mudahkan hidup.",
      "Ramai tak perasan berapa banyak masa hilang setiap minggu cuma sebab urusan kemas rumah."
    ],
    main_post: [
      `Realitinya, lepas balik kerja yang penat, benda terakhir kita nak buat mesti menyapu dengan mengemut lantai. ${cleanTitle} ni direka khas untuk selesaikan masalah tu secara automatik.\n\nBukan sekadar gadget biasa, tapi pelaburan kecil untuk jimatkan masa & tenaga korang setiap hari. Sesuai sangat untuk ${audience} yang hargai kebersihan tanpa pening kepala.\n\nKorang boleh check info lanjut dan harga terkini kat link bawah ni 👇`,
      `Bila kira balik, nilai masa yang kita jimat setiap minggu guna ${cleanTitle} ni memang sangat berbaloi. Relevan sangat untuk ${audience} yang jadual harian sentiasa padat.\n\nFunction utama dia memang fokus pada kemudahan—tak payah cuci tangan, sedutan efisien, dan urusan rumah terus settle dalam diam.\n\nTengok tawaran terkini dan voucher khas kat sini 👇`,
      `Ulasan jujur dari sudut praktikal untuk ${cleanTitle}:\n\n1. Penjimatan Masa: Automatikkan kerja rumah harian korang.\n2. Prestasi: Kebersihan konsisten tanpa perlu kawalan manual berterusan.\n3. Nilai Pelaburan: Berbaloi untuk jangka masa panjang khasnya buat ${audience}.\n\nBoleh tengok spesifikasi penuh dan harga promo kat link bio/bawah ni!`,
      `Kalau korang tengah cari jalan smart untuk kekalkan kebersihan rumah tanpa kompromi masa lapang, ${cleanTitle} ni antara pilihan paling praktikal dalam pasaran sekarang.\n\nKualiti solid, fungsi tepat pada sasaran, dan sesuai untuk gaya hidup ${audience}.\n\nKlik link bawah ni untuk tengok tawaran rasmi sekarang.`
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
  let cleanTitle = "Product";
  let audienceStr = "General";

  try {
    const body = await req.json();
    const { productName, description, url, audience, platform, goal, style } = body;

    const itemDetails = description || productName || "Featured Product";
    const platformStr = platform || "Threads";
    audienceStr = audience || "General";
    cleanTitle = (productName || itemDetails.split(" ").slice(0, 3).join(" ")).trim();

    const prompt = `You are a Malaysian affiliate marketer with 100k+ followers on Threads and TikTok. You are NOT a corporate copywriter — you write like a real person who actually uses the product and is texting a friend about it.

PRODUCT DETAILS (use SPECIFIC details from here — don't write generically): ${itemDetails}
PRODUCT NAME: ${cleanTitle}
LINK: ${url || "N/A"}
AUDIENCE: ${audienceStr}
PLATFORM: ${platformStr}
GOAL: ${goal || "Get clicks"}
STYLE: ${style || "Casual"}

VOICE RULES — THIS IS CRITICAL:
- Write in casual Bahasa Melayu the way people actually type on Threads/TikTok: mix in words like "korang", "confirm", "real talk", "gila", "trust me", "worth it doh", "kalau ikutkan", "jujur cakap", "the thing is". A few natural English words mixed in (Manglish/rojak style) is expected and good.
- Pull at least ONE concrete, specific detail from the PRODUCT DETAILS into every hook and every main post — a feature, a use case, a number, a specific pain point. Do not write anything that could apply to literally any product in this category.
- BANNED PHRASES — never use these or close variants: "jimat masa", "jimat tenaga", "pelaburan kecil", "gaya hidup", "kualiti solid", "sesuai untuk", "korang boleh check", "tanpa pening kepala", "berbaloi", "praktikal", "automatikkan". These are dead, overused AI phrases.
- Vary the OPENING STRUCTURE of each hook — do not start two hooks the same way (e.g. don't start every hook with "Kalau korang..."). Mix: a blunt confession, a specific mini-story, a controversial/bold opinion, a direct question, a "POV:" style line, a number/stat.
- Each of the 4 main_post variations must take a genuinely DIFFERENT angle (e.g. one is a personal story, one is a myth-busting take, one is a quick listicle, one is a "here's what nobody tells you" reveal) — not the same message reworded 4 times.
- No emoji spam. Max 1 emoji per post, only if it adds something.
- Sound like someone who has an actual opinion, including a small imperfection or nitpick about the product (builds trust) — not pure hype.

Return ONLY valid JSON matching this schema, no markdown fences:
{
  "hooks": ["Hook 1", "Hook 2", "Hook 3", "Hook 4", "Hook 5"],
  "main_post": [
    "Main Post Option 1",
    "Main Post Option 2",
    "Main Post Option 3",
    "Main Post Option 4"
  ],
  "ctas": ["CTA 1", "CTA 2", "CTA 3"],
  "comment_ideas": ["Comment 1", "Comment 2", "Comment 3", "Comment 4", "Comment 5"],
  "follow_up_posts": ["Follow up 1", "Follow up 2"]
}`;

    if (GEMINI_API_KEY) {
      const response = await callGemini(prompt);
      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleaned = rawText.replace(/```json|```/g, "").trim();
        try {
          const parsed = JSON.parse(cleaned);
          return NextResponse.json(parsed);
        } catch {
          console.error("JSON parse failed. Raw text:", rawText);
          return NextResponse.json(generateFallback(cleanTitle, audienceStr));
        }
      }
    }

    return NextResponse.json(generateFallback(cleanTitle, audienceStr));
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(generateFallback(cleanTitle, audienceStr));
  }
}
