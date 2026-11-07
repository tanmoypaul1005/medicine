import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function Disclaimer({ text, className }: { text: string; className?: string }) {
  return (
    <p
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
        className
      )}
    >
      <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{text}</span>
    </p>
  );
}
