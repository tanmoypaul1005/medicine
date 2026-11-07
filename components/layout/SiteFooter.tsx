export function SiteFooter({ text }: { text: string }) {
  return (
    <footer className="mt-auto border-t border-border/70">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted">© MedicineMate · {text}</div>
    </footer>
  );
}
