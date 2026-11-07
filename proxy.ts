import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, hasLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

function preferredLocale(req: NextRequest): Locale {
  const cookie = req.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie && hasLocale(cookie)) return cookie;
  const accept = req.headers.get("accept-language") ?? "";
  return /^\s*en/i.test(accept) && !/bn/i.test(accept) ? "en" : defaultLocale;
}

// Redirect un-prefixed paths ("/", "/search") to "/bn/..." or "/en/..."
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (hasLocale(first)) return;

  const url = req.nextUrl.clone();
  url.pathname = `/${preferredLocale(req)}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API, Next internals and files with an extension
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
