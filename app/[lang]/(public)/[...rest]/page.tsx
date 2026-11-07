import { notFound } from "next/navigation";

// Any unknown /bn/... or /en/... path → the styled not-found page (with header/footer), HTTP 404.
// Without this, unmatched URLs under the dynamic root layout had no 404 UI and the client kept reloading.
export default function CatchAll() {
  notFound();
}
