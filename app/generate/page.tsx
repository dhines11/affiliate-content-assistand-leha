"use client";

import { useState } from "react";
import Link from "next/link";

type Output = {
  hooks: string[];
  main_post: string;
  ctas: string[];
  comment_ideas: string[];
  follow_up_posts: string[];
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
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong generating content.");
      }
      const data: Output = await res.json();
      setOutput(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
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
            placeholder="What is it, what problem does it solve, key features/benefits..."
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

      {output && <OutputView output={output} />}
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

function OutputView({ output }: { output: Output }) {
  return (
    <div className="mt-10 space-y-6">
      <Section title="5 Hooks">
        <ul className="space-y-2">
          {output.hooks.map((h, i) => (
            <Card key={i}>{h}</Card>
          ))}
        </ul>
      </Section>

      <Section title="Main Post">
        <Card>
          <p className="whitespace-pre-wrap">{output.main_post}</p>
        </Card>
      </Section>

      <Section title="CTA Options">
        <ul className="space-y-2">
          {output.ctas.map((c, i) => (
            <Card key={i}>{c}</Card>
          ))}
        </ul>
      </Section>

      <Section title="Comment / Reply Ideas">
        <ul className="space-y-2">
          {output.comment_ideas.map((c, i) => (
            <Card key={i}>{c}</Card>
          ))}
        </ul>
      </Section>

      <Section title="Follow-up Posts">
        <ul className="space-y-2">
          {output.follow_up_posts.map((f, i) => (
            <Card key={i}>
              <p className="whitespace-pre-wrap">{f}</p>
            </Card>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <li className="list-none rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed">
      {children}
    </li>
  );
}
