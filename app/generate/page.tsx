import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 15;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash"
];

const HOOK_STYLES = [
  "a blunt personal confession",
  "a 2-line mini backstory",
  "a bold/controversial opinion",
  "a direct question to the reader",
  "a specific number or stat",
  "a relatable everyday complaint",
  "a myth you used to believe",
  "a quick comparison to a worse alternative",
  "a sarcastic one-liner",
  "a 'nobody tells you this' reveal",
];

const POST_ANGLES = [
  "a personal story of using it",
  "myth-busting a common misconception",
  "a quick listicle format",
  "a 'here's what nobody tells you' reveal",
  "a before/after comparison",
  "responding to a common objection/doubt",
  "a day-in-the-life scenario where it fits in",
  "a rough cost/value breakdown",
];

const CTA_STYLES = [
  "urgency/scarcity framing (limited stock, promo ending)",
  "a low-pressure soft nudge (no rush, just take a look)",
  "a curiosity-driven tease (you'll want to see this)",
  "a social-proof nudge (mention others already checking it out)",
  "a direct, confident command (just go grab it)",
  "a question that leads into clicking the link",
];

const COMMENT_STYLES = [
  "a price/promo question",
  "a compatibility or fit-for-use-case question",
  "a skeptical challenge/doubt",
  "a comparison to another product/brand",
  "a logistics question (delivery, warranty, stock)",
  "a genuine curiosity follow-up",
];

const FOLLOWUP_STYLES = [
  "a quick update sharing new feedback/testimonial",
  "an urgency reminder about the promo/stock",
  "directly answering a common question that came up",
  "a restock or new-batch announcement",
  "a short personal check-in on how it's going",
];

const TONE_FLAVORS = [
  "slightly sarcastic and dry",
  "warm and reassuring like a trusted friend",
  "hyped but still down-to-earth",
  "matter-of-fact, like a no-nonsense expert",
  "a bit cheeky and playful",
  "calm and confident, understated",
];

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function fetchLinkPreview(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return "";

    const html = await res.text();

    const getMeta = (prop: string) => {
      const regex = new RegExp(
        `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
        "i"
      );
      const match = html.match(regex);
      return match ? match[1] : "";
    };

    const ogTitle = getMeta("og:title");
    const ogDesc = getMeta("og:description");
    const metaDesc = getMeta("description");
    const titleTagMatch = html.match(/<title>([^<]*)<\/title>/i);
    const titleTag = titleTagMatch ? titleTagMatch[1] : "";

    const parts = [ogTitle || titleTag, ogDesc || metaDesc].filter(Boolean);
    return parts.join(". ").slice(0, 500);
  } catch (err) {
    console.error("Link fetch failed:", err);
    return "";
  }
}

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
          temperature: 1.2,
          topP: 0.97,
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

    const platformStr = platform || "Threads";
    audienceStr = audience || "General";

    let linkInfo = "";
    if (url) {
      linkInfo = await fetchLinkPreview(url);
    }

    const userDescription = description || "";
    const combinedDetails = [userDescription, linkInfo].filter(Boolean).join(". ");
    const itemDetails = combinedDetails || productName || "Featured Product";

    cleanTitle = (productName || itemDetails.split(" ").slice(0, 3).join(" ")).trim();

    const hasRealDetail = combinedDetails.length > 15;

    // Randomize instructions every single call so repeat generations differ too
    const chosenHookStyles = pickRandom(HOOK_STYLES, 5);
    const chosenAngles = pickRandom(POST_ANGLES, 4);
    const chosenCtaStyles = pickRandom(CTA_STYLES, 3);
    const chosenCommentStyles = pickRandom(COMMENT_STYLES, 5);
    const chosenFollowupStyles = pickRandom(FOLLOWUP_STYLES, 2);
    const chosenTone = pickRandom(TONE_FLAVORS, 1)[0];
    const varietyToken = Math.random().toString(36).slice(2, 10);

    const prompt = `You are a Malaysian affiliate marketer with 100k+ followers on Threads and TikTok. You are NOT a corporate copywriter — you write like a real person who actually uses the product and is texting a friend about it.

PRODUCT NAME: ${cleanTitle}
KNOWN PRODUCT INFO: ${itemDetails}
${hasRealDetail ? "" : "NOTE: Very little real detail is available about this product beyond its name/category. Do NOT invent fake specs, numbers, or claims. Lean on a common, realistic pain point or use case for this TYPE of product instead, and stay grounded rather than generic hype."}
LINK: ${url || "N/A"}
AUDIENCE: ${audienceStr}
PLATFORM: ${platformStr}
GOAL: ${goal || "Get clicks"}
STYLE: ${style || "Casual"}
OVERALL TONE FOR THIS GENERATION: ${chosenTone}

VARIETY TOKEN (ignore the value itself — it just means: write completely fresh wording everywhere below, do not reuse phrasing, structure, or specific sentences from any previous generation, even for the same product): ${varietyToken}

HOOKS — write hook 1 through 5 using EXACTLY these styles, in this order:
1. ${chosenHookStyles[0]}
2. ${chosenHookStyles[1]}
3. ${chosenHookStyles[2]}
4. ${chosenHookStyles[3]}
5. ${chosenHookStyles[4]}

MAIN POSTS — write the 4 main_post variations using EXACTLY these angles, in this order:
1. ${chosenAngles[0]}
2. ${chosenAngles[1]}
3. ${chosenAngles[2]}
4. ${chosenAngles[3]}

CTAS — write the 3 ctas using EXACTLY these styles, in this order:
1. ${chosenCtaStyles[0]}
2. ${chosenCtaStyles[1]}
3. ${chosenCtaStyles[2]}

COMMENT IDEAS — write the 5 comment_ideas using EXACTLY these styles, in this order:
1. ${chosenCommentStyles[0]}
2. ${chosenCommentStyles[1]}
3. ${chosenCommentStyles[2]}
4. ${chosenCommentStyles[3]}
5. ${chosenCommentStyles[4]}

FOLLOW-UP POSTS — write the 2 follow_up_posts using EXACTLY these styles, in this order:
1. ${chosenFollowupStyles[0]}
2. ${chosenFollowupStyles[1]}

VOICE RULES — THIS IS CRITICAL:
- Write in casual Bahasa Melayu the way people actually type on Threads/TikTok: mix in words like "korang", "confirm", "real talk", "gila", "trust me", "worth it doh", "kalau ikutkan", "jujur cakap", "the thing is". A few natural English words mixed in (Manglish/rojak style) is expected and good.
- Ground every hook, post, CTA, comment, and follow-up in something from KNOWN PRODUCT INFO — a real feature, category-typical use case, or specific pain point. Never write something that could apply to literally any product with zero changes.
- BANNED — never use these or close variants: "jimat masa", "jimat tenaga", "pelaburan kecil", "gaya hidup", "kualiti solid", "sesuai untuk", "korang boleh check", "tanpa pening kepala", "berbaloi", "praktikal", "automatikkan", "Semak maklumat lanjut dan voucher promosi di sini", "Jujur cakap, aku ingat [product] ni gimik je", "POV: kau dah penat scroll review palsu".
- No emoji spam. Max 1 emoji per post, only if it adds something.
- Include one small honest nitpick or imperfection somewhere (builds trust) — not pure hype.

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
