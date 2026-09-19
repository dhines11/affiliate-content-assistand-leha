import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-brand/30 blur-[120px]" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-24 text-center">
        <span className="mb-6 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium tracking-wide text-white/70">
          FOR AFFILIATE MARKETERS &amp; DIGITAL SELLERS
        </span>

        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Turn Any Product Into{" "}
          <span className="bg-gradient-to-r from-brand-light to-purple-300 bg-clip-text text-transparent">
            Content That Sells
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-lg text-white/60">
          Enter your product details and get ready-to-use affiliate content
          in seconds.
        </p>

        <Link
          href="/generate"
          className="mt-10 inline-flex items-center justify-center rounded-full bg-brand px-8 py-4 text-base font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-light active:scale-95"
        >
          Create My Content
        </Link>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ["5 Hooks", "Scroll-stopping openers"],
            ["Full Post", "Ready to publish"],
            ["CTAs + Replies", "Drive clicks & comments"],
          ].map(([title, desc]) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left"
            >
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
