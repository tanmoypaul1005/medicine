"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

type Props = { items: { href: string; label: string }[]; openLabel: string; closeLabel: string };

/** Mobile/tablet nav (below lg): hamburger → dropdown panel under the sticky header. */
export function MobileMenu({ items, openLabel, closeLabel }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? closeLabel : openLabel}
        className="grid size-10 place-items-center rounded-lg border border-border bg-card text-muted hover:text-foreground"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>

      {open && (
        <>
          <button type="button" aria-hidden tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-x-0 top-16 z-20 h-dvh bg-black/30" />
          <nav id="mobile-menu" className="absolute inset-x-0 top-16 z-30 border-b border-border bg-background shadow-lg">
            <ul className="mx-auto max-w-6xl px-4 py-2">
              {items.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-3 font-medium text-muted hover:bg-brand-soft/60 hover:text-foreground"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
