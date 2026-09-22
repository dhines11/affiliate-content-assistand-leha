"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Output = {
  hooks: string[];
  main_post: string[] | string;
  ctas: string[];
  comment_ideas: string[];
  follow_up_posts: string[];
  _source?: "ai" | "fallback";
  _thin_input?: boolean;
};

const PLATFORMS = ["Threads", "Facebook", "TikTok", "Instagram"];
const GOALS = ["Get clicks", "Generate leads", "Make sales", "Build engagement"];
const STYLES = ["Casual", "Storytelling", "Educational", "Curiosity", "Problem → Solution"];

export default function GeneratePage() {
  const [form, setForm] = useState({
    productName: "",
    description: "",
    url: "",
    audience: "",
    platform: PLATFORMS[0],
    goal: GOALS[0],
    style: STYLES[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<Output | null>(null);
  const [runId, setRunId] = useState(0);
  const usedRef = useRef<{ product: string; items: string[] }>({
    product: "",
    items: [],
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.productName || !form.description || !form.audience) {
      setError("Product name, description, and target audience are required.");
      return;
    }
    setError(null);
    setLoading(true);
    setOutput(null);

    const productKey = form.productName.trim().toLowerCase();
    if (usedRef.current.product !== productKey) {
      usedRef.current = { product: productKey, items: [] };
    }
    const avoid = usedRef.current.items.slice(-30);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, avoid }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong generating content.");
      }
      const data: Output = await res.json();
      if (data._source !== "fallback") {
        const posts = Array.isArray(data.main_post) ? data.main_post : [data.main_post];
        const used = [...data.hooks, ...posts, ...data.follow_up_posts].map((s) =>
          s.slice(0, 120)
        );
        usedRef.current.items = [...usedRef.current.items, ...used].slice(-40);
      }
      setOutput(data);
      setRunId((n) => n + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10">
      <Link href="/" className="text-sm text-white/50 hover:text-white/80">
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
        Build your affiliate content
      </h1>
      <p className="mt-1 text-sm text-white/50">
        Fill in the details below. The more specific, the better the output.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Field label="Product name *">
          <input
            className={inputClass}
            value={form.productName}
            onChange={(e) => update("productName", e.target.value)}
            placeholder="e.g. Glow Vitamin C Serum"
          />
        </Field>

        <Field label="Product description *">
          <textarea
            className={inputClass + " min-h-[100px]"}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="What is it, what problem does it solve, key features/benefits, price..."
          />
        </Field>

        <Field label="Product / affiliate link (optional)">
          <input
            className={inputClass}
            value={form.url}
            onChange={(e) => update("url", e.target.value)}
            placeholder="https://..."
          />
        </Field>

        <Field label="Target audience *">
          <input
            className={inputClass}
            value={form.audience}
            onChange={(e) => update("audience", e.target.value)}
            placeholder="e.g. women 20-35 into skincare"
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="Platform">
            <Select
              value={form.platform}
              onChange={(v) => update("platform", v)}
              options={PLATFORMS}
            />
          </Field>
          <Field label="Goal">
            <Select
              value={form.goal}
              onChange={(v) => update("goal", v)}
              options={GOALS}
            />
          </Field>
          <Field label="Content style">
            <Select
              value={form.style}
              onChange={(v) => update("style", v)}
              options={STYLES}
            />
          </Field>
        </div>

        {error && (
          <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-brand py-4 font-semibold text-white transition hover:bg-brand-light disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate Content"}
        </button>
      </form>

      {output && (
        <OutputView key={runId} output={output} platform={form.platform} />
      )}
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-brand-light";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-white/70">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      className={inputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o} value={o} className="bg-[#0b0b12]">
          {o}
        </option>
      ))}
    </select>
  );
}

function OutputView({ output, platform }: { output: Output; platform: string }) {
  const posts = Array.isArray(output.main_post)
    ? output.main_post
    : [output.main_post];
  const postLimit = platform === "Threads" ? 500 : null;

  return (
    <div className="mt-10 space-y-8">
      {output._source === "fallback" && (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          The AI was busy, so this is generic backup content. Tap Generate
          Content again for fresh, product-specific results.
        </p>
      )}
      {output._source !== "fallback" && output._thin_input && (
        <p className="rounded-xl bg-white/5 px-4 py-3 text-sm text-white/60">
          Tip: add more product details (features, price, problems it solves)
          for sharper results.
        </p>
      )}

      <Section title={`${output.hooks.length} Hooks`} label="Hook" items={output.hooks} />
      <Section
        title={`Main Post (${posts.length} options)`}
        label="Option"
        items={posts}
        limit={postLimit}
        rows={7}
      />
      <Section
        title={`CTA Options (${output.ctas.length})`}
        label="CTA"
        items={output.ctas}
      />
      <Section
        title={`Comment / Reply Ideas (${output.comment_ideas.length})`}
        label="Comment"
        items={output.comment_ideas}
        rows={4}
      />
      <Section
        title={`Follow-up Posts (${output.follow_up_posts.length})`}
        label="Follow-up"
        items={output.follow_up_posts}
        limit={postLimit}
        rows={5}
      />
      <p className="text-xs text-white/40">
        Every box is editable. Change the text, then tap Copy.
      </p>
    </div>
  );
}

function Section({
  title,
  label,
  items,
  limit = null,
  rows = 3,
}: {
  title: string;
  label: string;
  items: string[];
  limit?: number | null;
  rows?: number;
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
        {title}
      </h2>
      <div className="space-y-3">
        {items.map((text, i) => (
          <EditableBox
            key={i}
            label={`${label} ${i + 1}`}
            initial={text}
            limit={limit}
            rows={rows}
          />
        ))}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked by the browser; nothing else to do
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70 transition hover:border-white/30 hover:text-white"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

function EditableBox({
  label,
  initial,
  limit,
  rows,
}: {
  label: string;
  initial: string;
  limit: number | null;
  rows: number;
}) {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  const over = limit !== null && text.length > limit;

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [text]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-light">
          {label}
        </span>
        <span className={`text-xs ${over ? "text-red-300" : "text-white/40"}`}>
          {text.length}
          {limit ? ` / ${limit}` : ""}
        </span>
      </div>
      <textarea
        ref={ref}
        rows={rows}
        className={inputClass + " resize-none overflow-hidden leading-relaxed"}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-3 flex justify-end">
        <CopyButton text={text} />
      </div>
    </div>
  );
}
