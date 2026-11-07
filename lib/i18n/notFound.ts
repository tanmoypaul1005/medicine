import { redirect } from "next/navigation";
import { href, type Locale } from "./config";

/**
 * Use instead of notFound() inside pages. The root layout is app/[lang]/layout.tsx (dynamic segment),
 * so a segment-level notFound() can't render a 404 document (SSR returns an error doc and the client
 * reloads). "/<lang>/404" matches no route → app/global-not-found.tsx with a real 404 status.
 */
export function localizedNotFound(lang: Locale): never {
  redirect(href(lang, "/404"));
}
