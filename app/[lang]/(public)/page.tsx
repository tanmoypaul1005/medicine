import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Camera, GitCompareArrows, ShieldCheck, Wallet } from "lucide-react";
import { SearchBar } from "@/components/medicine/SearchBar";
import { Disclaimer } from "@/components/medicine/Disclaimer";
import { hasLocale, href } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";

// Static placeholder until popularity data is imported (no prices shown here on purpose)
const POPULAR = [
  { slug: "napa-500-mg-tablet", brand: "Napa", strength: "500 mg", generic: "Paracetamol" },
  { slug: "seclo-20-mg-capsule", brand: "Seclo", strength: "20 mg", generic: "Omeprazole" },
  { slug: "fexo-120-mg-tablet", brand: "Fexo", strength: "120 mg", generic: "Fexofenadine" },
  { slug: "monas-10-mg-tablet", brand: "Monas", strength: "10 mg", generic: "Montelukast" },
  { slug: "sergel-20-mg-capsule", brand: "Sergel", strength: "20 mg", generic: "Esomeprazole" },
  { slug: "alatrol-10-mg-tablet", brand: "Alatrol", strength: "10 mg", generic: "Cetirizine" },
];

const EXAMPLES = ["napa 500", "paracetamol", "নাপা", "seclo"];

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);
  const h = t.home;

  const features: { icon: typeof Wallet; title: string; body: string; path?: string }[] = [
    { icon: Wallet, ...h.features.alternatives },
    { icon: GitCompareArrows, ...h.features.interactions, path: "/interactions" },
    { icon: ShieldCheck, ...h.features.warnings },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-112 max-w-4xl rounded-full bg-brand/15 blur-3xl"
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pt-16 pb-12 text-center sm:pt-24">
          <span className="mb-5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted">
            {h.badge}
          </span>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            {h.titleA}
            <span className="text-brand">{h.titleHighlight}</span>
            {h.titleB}
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">{h.subtitle}</p>

          <SearchBar lang={lang} t={t.search} autoFocus className="mt-8" />

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-muted">
            <span>{h.examples}</span>
            {EXAMPLES.map((s) => (
              <Link
                key={s}
                href={href(lang, `/search?q=${encodeURIComponent(s)}`)}
                className="rounded-full border border-border bg-card px-3 py-1 hover:border-brand hover:text-foreground transition"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Prescription scan CTA */}
      <section className="mx-auto max-w-6xl px-4">
        <Link
          href={href(lang, "/scan")}
          className="group flex flex-col items-start gap-4 rounded-2xl bg-brand p-6 text-white dark:text-slate-900 sm:flex-row sm:items-center sm:justify-between sm:p-8"
        >
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/15">
              <Camera className="size-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold sm:text-xl">{h.scanTitle}</h2>
              <p className="text-sm opacity-85">{h.scanBody}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold">
            {h.scanCta} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
          </span>
        </Link>
      </section>

      {/* Popular medicines */}
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <h2 className="mb-4 text-xl font-semibold">{h.popular}</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {POPULAR.map((m) => (
            <li key={m.slug}>
              <Link
                href={href(lang, `/medicine/${m.slug}`)}
                className="block h-full rounded-xl border border-border bg-card p-4 hover:border-brand hover:shadow-md transition"
              >
                <p className="font-semibold">{m.brand}</p>
                <p className="text-sm text-muted">{m.strength}</p>
                <p className="mt-2 truncate text-xs text-muted">{m.generic}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, body, path }) => {
            const inner = (
              <>
                <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </>
            );
            const cls = "block h-full rounded-2xl border border-border bg-card p-6";
            return path ? (
              <Link key={title} href={href(lang, path)} className={`${cls} hover:border-brand transition`}>
                {inner}
              </Link>
            ) : (
              <div key={title} className={cls}>
                {inner}
              </div>
            );
          })}
        </div>

        <Disclaimer text={t.disclaimer} className="mt-10" />
      </section>
    </>
  );
}
