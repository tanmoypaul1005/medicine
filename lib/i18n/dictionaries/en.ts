import type { Dictionary } from "./bn";

const en: Dictionary = {
  meta: {
    title: "MedicineMate — Medicine Prices & Cheaper Alternatives",
    description: "Prices, cheaper same-generic alternatives and warnings for any medicine in Bangladesh, in one place.",
  },
  nav: { medicines: "All medicines", interactions: "Interaction checker", scan: "Prescription scan", login: "Login" },
  langToggle: { label: "বাংলা", aria: "বাংলায় দেখুন" },
  search: {
    placeholder: "Type a medicine — Napa, Paracetamol, নাপা…",
    aria: "Search medicine",
    submit: "Search",
    seeAll: "See all results for",
    noMatch: "No match — try a slightly different spelling.",
  },
  searchPage: {
    title: "Search medicines",
    resultsFor: "Results for “{q}”",
    total: "{n} medicines found",
    prompt: "Search by brand, generic or Bangla name. e.g. napa 500, paracetamol, নাপা",
    empty: "No medicine found for “{q}”.",
    emptyHint: "Check the spelling, try just the brand name, or browse the full list.",
    browseAll: "Browse all medicines",
    pageOf: "Page {p} of {n}",
    prev: "Previous",
    next: "Next",
    perUnit: "per unit",
    noPrice: "Price unknown",
    herbal: "Herbal",
  },
  home: {
    badge: "20,000+ medicines in Bangladesh",
    titleA: "Know medicine prices, find ",
    titleHighlight: "cheaper alternatives",
    titleB: "",
    subtitle: "Brand, generic, Bangla name or a typo — however you type it, you'll find the right medicine.",
    examples: "Try:",
    scanTitle: "Scan a prescription",
    scanBody: "Snap a photo — see every medicine, its cheaper alternatives and your total saving at once.",
    scanCta: "Get started",
    popular: "Popular medicines",
    features: {
      alternatives: {
        title: "Cheaper alternatives",
        body: "Other brands with the same generic, strength and form, sorted by price, with your saving.",
      },
      interactions: {
        title: "Drug interactions",
        body: "Check whether two or more medicines are safe together, with risk level.",
      },
      warnings: {
        title: "Warnings",
        body: "Pregnancy category, contraindications and common side effects in one place.",
      },
    },
  },
  medicines: {
    title: "All medicines",
    subtitle: "Every medicine available in Bangladesh — brand, generic, manufacturer and price.",
    searchPlaceholder: "Brand or generic name…",
    filter: "Apply",
    reset: "Reset",
    types: { all: "All types", allopathic: "Allopathic", herbal: "Herbal" },
    sorts: { brand: "Name (A–Z)", "price-asc": "Price: low to high", "price-desc": "Price: high to low" },
    cols: { brand: "Brand", strength: "Strength", form: "Form", generic: "Generic", manufacturer: "Manufacturer", price: "Unit price" },
    total: "{n} medicines",
    pageOf: "Page {p} of {n}",
    prev: "Previous",
    next: "Next",
    empty: "No medicines found.",
    noPrice: "—",
    herbal: "Herbal",
  },
  disclaimer: "This is information only. Do not start, stop or switch medicines without a doctor's advice.",
  footer: "For information only, not medical advice.",
};

export default en;
