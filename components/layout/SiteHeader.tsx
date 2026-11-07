import Link from "next/link";
import { Pill } from "lucide-react";

const NAV = [
  { href: "/interactions", label: "Interaction checker" },
  { href: "/scan", label: "Prescription scan" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-white dark:text-slate-900">
            <Pill className="size-4" aria-hidden />
          </span>
          MedicineMate
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted sm:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-foreground transition">
              {n.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/account"
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-card transition"
        >
          Login
        </Link>
      </div>
    </header>
  );
}
