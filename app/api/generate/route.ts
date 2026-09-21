import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Tried in order. If one fails (404 / 429 / 503 / timeout / bad JSON), the next one is used.
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];

const TOTAL_BUDGET_MS = 25_000;
const PER_CALL_TIMEOUT_MS = 14_000;

type Output = {
  hooks: string[];
  main_post: string[];
  ctas: string[];
  comment_ideas: string[];
  follow_up_posts: string[];
};

/* ----------------------------- PROMPTS ----------------------------- */

const SYSTEM_INSTRUCTION = `You are a Malaysian affiliate creator with 100k+ followers on Threads and TikTok. You are NOT a copywriter. You write like a real person typing on their phone, telling a friend about something they actually use.

LANGUAGE
- Casual Bahasa Melayu mixed with English (rojak / Manglish), exactly how Malaysians type on Threads.
- Default pronouns: "aku" and "korang". Only switch to "saya/anda" if STYLE is Professional/Formal.
- Natural words you can use (don't force all of them): "jujur cakap", "confirm", "gila", "serius", "lawak gila", "tak payah", "settle", "legit", "memang", "sumpah", "weh", "kot", "lah", "je", "pun", "dah", "takde", "nak", "tapi", "the thing is", "real talk", "worth it".
- Short sentences. Line breaks between ideas. Sentence fragments are fine.

CONTENT RULES
1. Every hook and every main post must contain at least ONE concrete detail from the product info (a feature, a number, a size, a use case, a specific annoying problem it fixes). If a line could describe any product in the category, rewrite it.
2. Every hook uses a DIFFERENT opening structure. Use one each of: (a) blunt confession, (b) mini-story with a specific moment or time, (c) bold or slightly controversial opinion, (d) direct question about a real pain point, (e) a "POV:" line or a number/price hook.
3. Every main post takes a DIFFERENT angle: (1) personal story, (2) myth-busting ("ramai ingat... sebenarnya..."), (3) quick 3-point list with real details, (4) "benda yang orang tak cakap" reveal. Not the same message reworded.
4. Every main post includes ONE small honest nitpick or limitation (builds trust). Keep it minor, then still land the recommendation.
5. Main posts are 200 to 450 characters. Hard maximum 480 characters (Threads limit is 500). Do NOT put the URL inside the post text; the CTA handles the link.
6. Max 1 emoji per post, and only if it adds something. No hashtag spam.
7. Never sound like an advertisement or brochure. No "produk ini", "ciri-ciri utama", "dengan ini".
8. Do not invent fake statistics, fake reviews, medical claims, or guaranteed results. Do not invent specs that aren't in the product info. If details are thin, lean on the relatable situation instead.
9. Avoid these tired AI phrases and close variants: "jimat masa", "jimat tenaga", "pelaburan kecil", "gaya hidup", "kualiti solid", "sesuai untuk", "tanpa pening kepala", "berbaloi", "praktikal", "automatikkan", "solusi", "game changer".

VOICE REFERENCE (tone and rhythm only, about other products. NEVER copy or adapt these lines):
- "Jujur cakap, aku ingat benda ni gimik je. Dua minggu lepas tu baru sedar aku yang silap."
- "POV: pukul 11 malam baru sampai rumah, dapur masih macam tsunami lalu."
- "RM79 untuk ni? Aku pun fikir sama masa mula-mula. Then tengok apa dia buat."
- "Ramai ingat murah tu maksudnya cepat rosak. Yang ni? Tiga bulan, masih steady."
- "Satu je aku tak suka: kabel dia pendek. Selain tu, takde complaint."

OUTPUT FIELDS
- hooks: 5 scroll-stopping opening lines, max 140 characters each.
- main_post: 4 full posts, ready to publish.
- ctas: 3 short lines that push people to click the link, casual and specific, not "klik link untuk info lanjut".
- comment_ideas: 5 ready-to-paste comments/replies the creator can drop under the post to spark discussion (a real buyer question plus a short honest answer, or a light hot take).
- follow_up_posts: 2 short follow-up posts for later (e.g. an update, a FAQ answer, or a "korang tanya, aku jawab" post).`;

function buildUserPrompt(p: {
  itemDetails: string;
  cleanTitle: string;
  url: string;
  audience: string;
  platform: string;
  goal: string;
  style: string;
}) {
  return `PRODUCT NAME: ${p.cleanTitle}
PRODUCT DETAILS (mine these for specifics): ${p.itemDetails}
AUDIENCE: ${p.audience}
PLATFORM: ${p.platform}
GOAL: ${p.goal}
STYLE: ${p.style}
LINK (do not paste inside posts): ${p.url}

Write the content now. Return JSON only.`;
}

/* --------------------------- JSON SCHEMA --------------------------- */

const strArray = { type: "ARRAY", items: { type: "STRING" } };

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    hooks: strArray,
    main_post: strArray,
    ctas: strArray,
    comment_ideas: strArray,
    follow_up_posts: strArray,
  },
  required: ["hooks", "main_post", "ctas", "comment_ideas", "follow_up_posts"],
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
    ok(o.ctas, 2) &&
    ok(o.comment_ideas, 3) &&
    ok(o.follow_up_posts, 1)
  );
}

async function generateWithGemini(userPrompt: string): Promise<Output | null> {
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  for (const model of MODELS) {
    const remaining = deadline - Date.now();
    if (remaining < 4000) break;

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.min(PER_CALL_TIMEOUT_MS, remaining)
    );

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
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA,
              maxOutputTokens: 4096,
              temperature: 1.0,
              topP: 0.95,
              // 2.5 models "think" by default and thinking tokens eat the output budget,
              // which truncates the JSON. Turn it off for these models.
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
        continue; // try next model
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
            ctas: parsed.ctas.slice(0, 3),
            comment_ideas: parsed.comment_ideas.slice(0, 5),
            follow_up_posts: parsed.follow_up_posts.slice(0, 2),
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
// Only used when every Gemini attempt fails. Product-agnostic on purpose.

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
      "Link ada kat bawah. Tengok harga terkini sebelum stok habis.",
      "Nak tengok spec penuh dan voucher? Tekan link bawah ni.",
      "Tak yakin lagi? Check review pembeli kat link, baru decide.",
    ],
    comment_ideas: [
      "Ada warranty rasmi tak untuk yang ni?",
      "Kalau nak guna hari-hari, tahan berapa lama agaknya?",
      "Penghantaran biasa ambil masa berapa hari?",
      "Ada beza ketara tak dengan model sebelum ni?",
      "Korang dah pernah guna? Share pengalaman kat bawah.",
    ],
    follow_up_posts: [
      `Update ringkas pasal ${title}: ramai yang tanya pasal harga dan voucher. Aku dah letak link terkini kat bawah.`,
      `Korang tanya, aku jawab: soalan paling banyak masuk pasal ${title}. Baca thread ni sebelum decide.`,
    ],
  };
}

/* ------------------------------- ROUTE ------------------------------ */

export async function POST(req: NextRequest) {
  let cleanTitle = "Product";

  try {
    const body = await req.json();
    const { productName, description, url, audience, platform, goal, style } = body;

    const itemDetails = description || productName || "Featured Product";
    cleanTitle = (productName || String(itemDetails).split(" ").slice(0, 3).join(" ")).trim();

    if (GEMINI_API_KEY) {
      const userPrompt = buildUserPrompt({
        itemDetails,
        cleanTitle,
        url: url || "N/A",
        audience: audience || "General",
        platform: platform || "Threads",
        goal: goal || "Get clicks",
        style: style || "Casual",
      });

      const result = await generateWithGemini(userPrompt);
      if (result) {
        return NextResponse.json({ ...result, _source: "ai" });
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
