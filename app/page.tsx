import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center px-5 py-16 text-center">
      <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
        Turn Any Product Into{" "}
        <span className="bg-gradient-to-r from-brand-light to-brand bg-clip-text text-transparent">
          Content That Sells
        </span>
      </h1>

      <p className="mt-6 max-w-lg text-base text-white/60 sm:text-lg">
        Enter your product details and get ready-to-use affiliate content in
        seconds.
      </p>

      <Link
        href="/generate"
        className="mt-8 rounded-full bg-brand px-10 py-4 font-semibold text-white shadow-[0_0_30px_rgba(124,58,237,0.5)] transition hover:bg-brand-light"
      >
        Create My Content
      </Link>

      <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <FeatureCard title="5 Hooks" description="Scroll-stopping openers" />
        <FeatureCard title="Full Post" description="Ready to publish" />
        <FeatureCard title="CTAs + Replies" description="Drive clicks & comments" />
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-white/50">{description}</p>
    </div>
  );
}
