import Link from "next/link";
import { ArrowRight, Camera, GitCompareArrows, ShieldCheck, Wallet } from "lucide-react";
import { SearchBar } from "@/components/medicine/SearchBar";
import { Disclaimer } from "@/components/medicine/Disclaimer";

// Static placeholder until popularity data is imported (no prices shown here on purpose)
const POPULAR = [
  { slug: "napa-500-mg-tablet", brand: "Napa", strength: "500 mg", generic: "Paracetamol" },
  { slug: "seclo-20-mg-capsule", brand: "Seclo", strength: "20 mg", generic: "Omeprazole" },
  { slug: "fexo-120-mg-tablet", brand: "Fexo", strength: "120 mg", generic: "Fexofenadine" },
  { slug: "monas-10-mg-tablet", brand: "Monas", strength: "10 mg", generic: "Montelukast" },
  { slug: "sergel-20-mg-capsule", brand: "Sergel", strength: "20 mg", generic: "Esomeprazole" },
  { slug: "alatrol-10-mg-tablet", brand: "Alatrol", strength: "10 mg", generic: "Cetirizine" },
];

const FEATURES = [
  {
    icon: Wallet,
    title: "সস্তা বিকল্প",
    body: "একই generic, strength ও form-এর অন্য brand দাম অনুযায়ী — কত টাকা বাঁচবে তা সহ।",
  },
  {
    icon: GitCompareArrows,
    title: "Drug interaction",
    body: "দুই বা তার বেশি ওষুধ একসাথে খাওয়া নিরাপদ কিনা, ঝুঁকির মাত্রা সহ।",
    href: "/interactions",
  },
  {
    icon: ShieldCheck,
    title: "সতর্কতা",
    body: "Pregnancy category, contraindication আর সাধারণ side effect এক জায়গায়।",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-[28rem] max-w-4xl rounded-full bg-brand/15 blur-3xl"
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pt-16 pb-12 text-center sm:pt-24">
          <span className="mb-5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted">
            বাংলাদেশের ২০,০০০+ ওষুধের তথ্য
          </span>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            ওষুধের দাম জানুন, <span className="text-brand">সস্তা বিকল্প</span> খুঁজুন
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">
            Brand, generic, বাংলা নাম বা ভুল বানান — যেভাবেই লিখুন, সঠিক ওষুধ খুঁজে পাবেন।
          </p>

          <SearchBar autoFocus className="mt-8" />

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-muted">
            <span>উদাহরণ:</span>
            {["napa 500", "paracetamol", "নাপা", "seclo"].map((s) => (
              <Link
                key={s}
                href={`/search?q=${encodeURIComponent(s)}`}
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
          href="/scan"
          className="group flex flex-col items-start gap-4 rounded-2xl bg-brand p-6 text-white dark:text-slate-900 sm:flex-row sm:items-center sm:justify-between sm:p-8"
        >
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/15">
              <Camera className="size-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold sm:text-xl">Prescription scan করুন</h2>
              <p className="text-sm opacity-85">
                ছবি তুলুন — সব ওষুধ, তাদের সস্তা বিকল্প আর মোট সাশ্রয় একসাথে দেখুন।
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold">
            শুরু করুন <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
          </span>
        </Link>
      </section>

      {/* Popular medicines */}
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <h2 className="mb-4 text-xl font-semibold">জনপ্রিয় ওষুধ</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {POPULAR.map((m) => (
            <li key={m.slug}>
              <Link
                href={`/medicine/${m.slug}`}
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
          {FEATURES.map(({ icon: Icon, title, body, href }) => {
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
            return href ? (
              <Link key={title} href={href} className={`${cls} hover:border-brand transition`}>
                {inner}
              </Link>
            ) : (
              <div key={title} className={cls}>
                {inner}
              </div>
            );
          })}
        </div>

        <Disclaimer className="mt-10" />
      </section>
    </>
  );
}
