// 404 for the whole app. Rendered without app/[lang]/layout.tsx (see next.config.ts globalNotFound),
// so it brings its own <html>, CSS and fonts, and shows both languages (no locale is known here).
import type { Metadata } from "next";
import Link from "next/link";
import { Hind_Siliguri, Inter } from "next/font/google";
import { Pill, SearchX } from "lucide-react";
import bn from "@/lib/i18n/dictionaries/bn";
import en from "@/lib/i18n/dictionaries/en";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const hind = Hind_Siliguri({ variable: "--font-bangla", subsets: ["bengali", "latin"], weight: ["400", "600", "700"], display: "swap" });

export const metadata: Metadata = { title: `${bn.notFound.title} · ${en.notFound.title} | MedicineMate` };

export default function GlobalNotFound() {
  return (
    <html lang="bn" className={`${inter.variable} ${hind.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-border/70">
          <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
            {/* Different root layout → Link does a full navigation back into the localized app */}
            <Link href="/bn" className="flex items-center gap-2 text-lg font-bold">
              <span className="grid size-8 place-items-center rounded-lg bg-brand text-white dark:text-slate-900">
                <Pill className="size-4" aria-hidden />
              </span>
              MedicineMate
            </Link>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-4 py-16 text-center sm:py-24">
          <SearchX className="size-12 text-muted" aria-hidden />
          <p className="mt-4 text-sm font-semibold text-brand">404</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{bn.notFound.title}</h1>
          <p className="mt-2 text-muted">{bn.notFound.body}</p>
          <p className="mt-6 text-lg font-semibold">{en.notFound.title}</p>
          <p className="mt-1 text-sm text-muted">{en.notFound.body}</p>

          <form action="/bn/search" className="mt-8 flex w-full gap-2">
            <input
              type="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              name="q"
              placeholder={bn.search.placeholder}
              aria-label={bn.search.aria}
              className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-card px-4 outline-none focus:border-brand"
            />
            <button type="submit" className="h-12 rounded-xl bg-brand px-5 font-semibold text-white dark:text-slate-900">
              {bn.search.submit}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-medium">
            <Link href="/bn" className="text-brand hover:underline">{bn.notFound.home}</Link>
            <Link href="/bn/medicines" className="text-brand hover:underline">{bn.notFound.browse}</Link>
            <Link href="/en" className="text-brand hover:underline">{en.notFound.home}</Link>
          </div>
        </main>
      </body>
    </html>
  );
}
