import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Tried in order. If one fails (404 / 429 / 503 / timeout / bad JSON), the next one is used.
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
const TOTAL_BUDGET_MS = 55_000;
const PER_CALL_TIMEOUT_MS = 35_000;

type Output = {
  hooks: string[];
  main_post: string[];
  ctas: string[];
  comment_ideas: string[];
  follow_up_posts: string[];
};

/* ------------------------- VARIETY POOLS ------------------------- */
const HOOK_FORMULAS = [
  "a blunt confession about a wrong assumption you had before using it",
  "a mini-story anchored to a specific time or place (pukul 2 pagi, dalam Grab, masa balik kampung, kat pejabat)",
  "a bold, slightly controversial opinion some people will disagree with",
  "a direct question about a real, specific pain point",
  "a 'POV:' line describing a very relatable situation",
  "a number or price hook (how much, how long, how many times)",
  "a call-out to one very specific type of person ('kalau kau jenis yang...')",
  "a before/after contrast in a single line",
  "a reaction to something people always say about this kind of product",
  "a tiny complaint that turns into praise",
  "a comparison with the more expensive or more popular alternative",
  "a 'takde orang warning aku pasal ni' style line",
];

const POST_ANGLES = [
  "personal story: first impression versus what changed after real use",
  "myth-busting: what people wrongly assume, then the reality",
  "quick 3-point list where every point has a real detail",
  "'benda yang orang tak cakap' reveal",
  "who this is NOT for (honest filter), then who it IS for",
  "a day-in-the-life scene showing the product in use",
  "value in plain talk (per day or per use), without inventing prices",
  "comparison: this versus the usual alternative people buy",
  "problem, what I tried before, what finally worked",
  "reply-style post answering a question people keep asking",
  "a small rant about the problem, with the product as the calm solution",
];

const CTA_STYLES = [
  "a soft, low-pressure nudge ('tengok dulu, tak rugi')",
  "a curiosity line that makes people want to see the details",
  "a question that leads into the link",
  "a 'semak sendiri dulu sebelum decide' honest-check style line",
  "a friendly 'aku letak link kat bawah' casual drop",
  "a line aimed at people who are still undecided",
  "a short, direct, no-fluff line",
];

const FOLLOWUP_ANGLES = [
  "an update after using it for a while",
  "answering the most common question people ask about it",
  "handling the 'mahal ke?' objection honestly",
  "an honest limitation and who should skip it",
  "a small practical tip for using it better",
  "a reaction to a comment or DM you 'got'",
  "a gentle reminder for people who saved the first post but haven't decided",
  "a short comparison with what people usually buy instead",
];

const TONE_SAMPLES = [
  "Jujur cakap, aku ingat benda ni gimik je. Dua minggu lepas tu baru sedar aku yang silap.",
  "POV: pukul 11 malam baru sampai rumah, dapur masih macam tsunami lalu.",
  "RM79 untuk ni? Aku pun fikir sama masa mula-mula. Then tengok apa dia buat.",
  "Ramai ingat murah tu maksudnya cepat rosak. Yang ni? Tiga bulan, masih steady.",
  "Satu je aku tak suka: kabel dia pendek. Selain tu, takde complaint.",
  "Mak aku yang tak reti teknologi pun boleh guna. Itu dah cukup jadi bukti.",
  "Weh serius, kenapa tak ada orang cerita pasal benda ni awal-awal?",
  "Aku bukan jenis yang mudah terpengaruh dengan iklan. Tapi yang ni lain.",
  "Kawan aku gelak masa aku beli. Sekarang dia yang tanya link.",
  "Tak semua orang perlukan benda ni. Tapi kalau kau salah satu yang perlu, memang lega.",
];

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function plan(label: string, items: string[]): string {
  return items.map((f, i) => `  ${label} ${i + 1}: ${f}`).join("\n");
}

/* --------------------- LINK PREVIEW FETCHING --------------------- */
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

/* ----------------------------- PROMPTS ----------------------------- */
function buildSystemInstruction(): string {
  const hookPlan = plan("Hook", pickRandom(HOOK_FORMULAS, 5));
  const postPlan = plan("Main post", pickRandom(POST_ANGLES, 4));
  const ctaPlan = plan("CTA", pickRandom(CTA_STYLES, 4));
  const followPlan = plan("Follow-up", pickRandom(FOLLOWUP_ANGLES, 4));
  const tone = pickRandom(TONE_SAMPLES, 3)
    .map((s) => `- "${s}"`)
    .join("\n");

  return `You are a Malaysian affiliate creator with 100k+ followers on Threads and TikTok. You are NOT a copywriter. You write like a real person typing on their phone, telling a friend about something they actually use.

STEP 1 - ANALYSIS (fill the "analysis" field FIRST, before writing anything else)
- category: what kind of product this is, in plain words.
- who_actually_buys: the specific kind of person and situation that buys it.
- pain_points: 4 to 6 real, specific annoyances or situations this product deals with in Malaysian daily life.
- specific_details: 4 to 6 concrete details taken from the product info (features, sizes, materials, numbers, uses). If the product info is thin, use realistic, commonly known traits of this product category, but never invent exact specs, prices, numbers, or claims.
- honest_nitpick: one small, believable limitation.
- buyer_questions: 6 questions a real buyer of THIS EXACT type of product would ask in the comments (function, how to use it, size, power, battery, materials, compatibility, delivery, price, warranty, and so on). Every question must make sense for this exact product. Never ask about things that cannot apply to it (for example, never ask about wearing, applying, or eating something that is a machine or a tool).

STEP 2 - WRITE
Every hook, main post, and follow-up must be built from DIFFERENT items in pain_points / specific_details. No two items in the same section may lean on the same detail.

LANGUAGE
- Casual Bahasa Melayu mixed with English (rojak / Manglish), exactly how Malaysians type on Threads.
- Default pronouns: "aku" and "korang". Only switch to "saya/anda" if STYLE is Professional/Formal.
- Natural words you can use (never force them all): "jujur cakap", "confirm", "gila", "serius", "settle", "legit", "memang", "sumpah", "weh", "kot", "lah", "je", "pun", "dah", "takde", "nak", "tapi", "the thing is", "real talk", "worth it".
- Short sentences. Line breaks between ideas. Fragments are fine.

STRUCTURE FOR THIS REQUEST (follow it exactly, in this order)
- Hooks, one formula each:
${hookPlan}
- Main posts, one angle each:
${postPlan}
- CTAs, one style each:
${ctaPlan}
- Follow-up posts, one angle each:
${followPlan}

CONTENT RULES
1. Inside every section, no two items may start with the same word or share the same sentence pattern, opening, rhythm, or closing line.
2. Do not open any hook or post with the product name.
3. Every main post includes ONE small honest nitpick or limitation, then still lands the recommendation. Vary the nitpick between posts.
4. Main posts and follow-up posts: 200 to 450 characters, hard maximum 480 (Threads limit is 500). Do NOT put the URL inside any text; the CTAs handle the link.
5. Max 1 emoji per item, only if it adds something. No hashtag spam.
6. Never sound like an ad or a brochure. No "produk ini", "ciri-ciri utama", "dengan ini".
7. Do not invent fake reviews, fake statistics, medical claims, guaranteed results, fake discounts, or fake scarcity ("stok tinggal sikit" unless the product info says so).
8. Avoid these tired AI phrases and close variants: "jimat masa", "jimat tenaga", "pelaburan kecil", "gaya hidup", "kualiti solid", "sesuai untuk", "tanpa pening kepala", "berbaloi", "praktikal", "automatikkan", "solusi", "game changer".
9. Comments must have real logic. Before finalizing, silently check every comment question: could a real person ask this about THIS exact product? If not, replace it with one from buyer_questions.

TONE REFERENCE (rhythm and attitude only, about other products. NEVER copy, reuse, or closely paraphrase these lines):
${tone}

OUTPUT FIELDS
- hooks: 5 scroll-stopping opening lines, max 140 characters each.
- main_post: 4 full posts, ready to publish.
- ctas: 4 short casual lines (max 120 characters each) that push people to click the link, one per style above. Refer to the link naturally ("link kat bawah", "link kat komen"). Never "klik link untuk info lanjut".
- comment_ideas: 4 ready-to-paste comment threads, each in exactly this format: "Q: <a buyer question taken from buyer_questions, typed the way a real Malaysian would type it>\\nA: <the creator's short, honest 1 to 2 sentence answer>". Answers may only use facts from the product info or safe general knowledge. If the exact fact is not known, answer honestly and point to the product page for the spec. Never invent numbers or specs.
- follow_up_posts: 4 follow-up posts for later, one per angle above.`;
}

function buildUserPrompt(p: {
  itemDetails: string;
  cleanTitle: string;
  url: string;
  audience: string;
  platform: string;
  goal: string;
  style: string;
  thin: boolean;
  avoid: string[];
}): string {
  const avoidBlock = p.avoid.length
    ? `\nALREADY GENERATED FOR THIS PRODUCT (the user wants something completely different this time; do NOT repeat or lightly reword these ideas, angles, details, or openings):\n${p.avoid
        .map((a) => `- ${a}`)
        .join("\n")}\n`
    : "";

  return `PRODUCT NAME: ${p.cleanTitle}
PRODUCT DETAILS (mine these for specifics): ${p.itemDetails}
${p.thin ? "NOTE: the product details are thin. Lean on realistic, relatable situations for this product category. Do not invent specs, numbers, or claims.\n" : ""}AUDIENCE: ${p.audience}
PLATFORM: ${p.platform}
GOAL: ${p.goal}
STYLE: ${p.style}
LINK (do not paste inside posts): ${p.url}
${avoidBlock}
Variation seed: ${Math.random().toString(36).slice(2, 8)} (use it to pick unexpected angles; never mention it).
Write the content now. Return JSON only.`;
}

/* --------------------------- JSON SCHEMA --------------------------- */
const strArray = { type: "ARRAY", items: { type: "STRING" } };

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    analysis: {
      type: "OBJECT",
      properties: {
        category: { type: "STRING" },
        who_actually_buys: { type: "STRING" },
        pain_points: strArray,
        specific_details: strArray,
        honest_nitpick: { type: "STRING" },
        buyer_questions: strArray,
      },
      required: [
        "category",
        "who_actually_buys",
        "pain_points",
        "specific_details",
        "honest_nitpick",
        "buyer_questions",
      ],
      propertyOrdering: [
        "category",
        "who_actually_buys",
        "pain_points",
        "specific_details",
        "honest_nitpick",
        "buyer_questions",
      ],
    },
    hooks: strArray,
    main_post: strArray,
    ctas: strArray,
    comment_ideas: strArray,
    follow_up_posts: strArray,
  },
  required: ["analysis", "hooks", "main_post", "ctas", "comment_ideas", "follow_up_posts"],
  propertyOrdering: ["analysis", "hooks", "main_post", "ctas", "comment_ideas", "follow_up_posts"],
};

/* ---------------------------- GEMINI CALL --------------------------- */
function isValidOutput(x: unknown): x is Output {
  const ok = (arr: unknown, min: number) =>
    Array.isArray(arr) &&
    arr.length >= min &&
    arr.every((s) => typeof s === "string" && s.trim().length > 0);
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    ok(o.hooks, 3) &&
    ok(o.main_post, 3) &&
    ok(o.ctas, 3) &&
    ok(o.comment_ideas, 3) &&
    ok(o.follow_up_posts, 3)
  );
}

async function generateWithGemini(userPrompt: string): Promise<Output | null> {
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const systemInstruction = buildSystemInstruction();

  for (const model of MODELS) {
    const remaining = deadline - Date.now();
    if (remaining < 5000) break;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(PER_CALL_TIMEOUT_MS, remaining));

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY as string,
          },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA,
              maxOutputTokens: 8000,
              temperature: 1.1,
              topP: 0.95,
              ...(model.startsWith("gemini-2.5")
                ? { thinkingConfig: { thinkingBudget: 0 } }
                : {}),
            },
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`[gemini:${model}] HTTP ${res.status}`, errText.slice(0, 500));
        continue;
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const raw: string = ((candidate?.content?.parts ?? []) as { text?: string }[])
        .map((p) => p.text ?? "")
        .join("");

      if (candidate?.finishReason && candidate.finishReason !== "STOP") {
        console.warn(`[gemini:${model}] finishReason=${candidate.finishReason}`);
      }

      const cleaned = raw.replace(/```json|```/g, "").trim();
      try {
        const parsed = JSON.parse(cleaned);
        if (isValidOutput(parsed)) {
          return {
            hooks: parsed.hooks.slice(0, 5),
            main_post: parsed.main_post.slice(0, 4),
            ctas: parsed.ctas.slice(0, 4),
            comment_ideas: parsed.comment_ideas.slice(0, 4),
            follow_up_posts: parsed.follow_up_posts.slice(0, 4),
          };
        }
        console.error(`[gemini:${model}] JSON parsed but shape invalid`, cleaned.slice(0, 300));
      } catch {
        console.error(`[gemini:${model}] JSON parse failed. Raw:`, raw.slice(0, 500));
      }
    } catch (err) {
      console.error(`[gemini:${model}] request failed`, err);
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

/* ----------------------------- FALLBACK ----------------------------- */
function generateFallback(title: string): Output {
  return {
    hooks: [
      `Jujur cakap, aku ingat ${title} ni gimik je. Rupanya aku yang silap.`,
      `POV: kau dah penat scroll review palsu, tengah cari yang betul-betul cerita pengalaman.`,
      `Ramai DM tanya pasal ${title}. Ni jawapan aku, tak tapis.`,
      `Kenapa orang masih beli ${title} walaupun ada alternatif lagi murah?`,
      `3 benda aku suka, 1 benda aku tak berapa puas hati. Fair kan?`,
    ],
    main_post: [
      `Mula-mula aku skeptikal jugak dengan ${title}. Tapi lepas guna betul-betul, baru faham kenapa ramai cakap pasal dia.\n\nBukan sempurna, ada satu dua benda kecil aku nitpick. Tapi overall memang settle apa yang aku nak.\n\nLink ada kat bawah kalau nak tengok sendiri.`,
      `Ramai ingat ${title} ni sama je macam yang lain. Sebenarnya tak.\n\nBeza dia ada kat butiran kecil yang kau baru perasan bila dah guna. Aku pun tak jangka.\n\nTengok spec penuh kat link bawah, baru decide.`,
      `3 benda pasal ${title} yang aku rasa orang patut tahu sebelum beli:\n\n1. Baca spec betul-betul, jangan main ikut gambar\n2. Check review pembeli yang dah guna lama\n3. Bandingkan harga sebelum tekan checkout\n\nAku letak link bawah, semak sendiri.`,
      `Benda yang jarang orang cakap pasal ${title}: kau takkan sedar dia berguna sampailah kau tiba-tiba tak ada.\n\nBukan hype, aku pun kadang lupa nak cerita.\n\nKalau berminat, link kat bawah.`,
    ],
    ctas: [
      "Link ada kat bawah. Tengok harga terkini sebelum decide.",
      "Nak tengok spec penuh dan voucher? Tekan link bawah ni.",
      "Tak yakin lagi? Check review pembeli kat link, baru decide.",
      "Aku dah letak link kat bawah. Tengok sendiri dulu, tak rugi.",
    ],
    comment_ideas: [
      "Q: Ada warranty rasmi tak?\nA: Info warranty ada kat halaman produk, check kat link dulu sebelum checkout.",
      "Q: Penghantaran biasanya berapa hari?\nA: Bergantung lokasi, tapi anggaran tarikh sampai ada kat link.",
      "Q: Stok masih ada tak?\nA: Stok kadang berubah, semak kat link untuk status terkini.",
      "Q: Boleh COD tak?\nA: Pilihan bayaran tertera kat halaman produk, check kat link.",
    ],
    follow_up_posts: [
      `Update ringkas pasal ${title}: ramai yang tanya pasal harga dan voucher. Aku dah letak link terkini kat bawah.`,
      `Korang tanya, aku jawab: soalan paling banyak masuk pasal ${title}. Baca thread ni sebelum decide.`,
      `Kalau kau masih ragu pasal ${title}, tak apa. Baca review pembeli dulu, bandingkan spec, baru tekan beli.`,
      `Satu tips kecil sebelum beli ${title}: check dulu warranty dan polisi pemulangan kat halaman produk.`,
    ],
  };
}

/* ------------------------------- ROUTE ------------------------------ */
export async function POST(req: NextRequest) {
  let cleanTitle = "Product";

  try {
    const body = await req.json();
    const { productName, description, url, audience, platform, goal, style } = body;

    let linkInfo = "";
    if (url) {
      linkInfo = await fetchLinkPreview(url);
    }

    const userDescription = String(description || "");
    const combinedDetails = [userDescription, linkInfo].filter(Boolean).join(". ");
    const itemDetails = combinedDetails || String(productName || "Featured Product");

    cleanTitle = (productName || itemDetails.split(" ").slice(0, 3).join(" ")).trim();
    const thin = itemDetails.trim().length < 40;

    const avoid: string[] = Array.isArray(body.avoid)
      ? body.avoid
          .filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
          .slice(0, 30)
          .map((s: string) => s.slice(0, 140))
      : [];

    if (GEMINI_API_KEY) {
      const userPrompt = buildUserPrompt({
        itemDetails,
        cleanTitle,
        url: url || "N/A",
        audience: audience || "General",
        platform: platform || "Threads",
        goal: goal || "Get clicks",
        style: style || "Casual",
        thin,
        avoid,
      });

      const result = await generateWithGemini(userPrompt);
      if (result) {
        return NextResponse.json({ ...result, _source: "ai", _thin_input: thin });
      }
    } else {
      console.error("GEMINI_API_KEY is not set");
    }

    return NextResponse.json({ ...generateFallback(cleanTitle), _source: "fallback" });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ ...generateFallback(cleanTitle), _source: "fallback" });
  }
}
